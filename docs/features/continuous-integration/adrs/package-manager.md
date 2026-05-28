# Use pnpm as the package manager (not npm)

- Status: accepted
- Date: 2026-05-28
- Deciders: Bradley Shrader
- Tags: tooling, dependencies, ci, worktrees, supply-chain

## Context and Problem Statement

The project was scaffolded with **npm**: a `package-lock.json`, `npm ci` in every CI gate and Claude workflow, `npx` in the husky/Claude hooks, and `npm audit` as the advisory-security gate.

The maintainer's day-to-day workflow leans heavily on **git worktrees** — Claude Desktop's "open in worktree" flow creates a fresh worktree per task, and each one needs its own `node_modules`. Under npm, every worktree triggers a full, near-cold install: npm's content-addressable cache (`~/.npm/_cacache`) avoids re-downloading tarballs, but it still **copies** every package into each worktree's `node_modules`, so disk and install-time cost scale linearly with the number of worktrees. With a dep tree this size (Electron + Storybook + Vitest + the full eslint/playwright/vite stacks — ~1000 resolved packages), that is minutes and hundreds of MB per worktree.

Which package manager should the project standardize on, given that worktree-heavy development makes per-worktree install cost the dominant ergonomic pain?

## Decision Drivers

- **Worktree install cost.** The single biggest motivation. Re-installing the full tree per worktree is the friction the maintainer feels daily.
- **Disk footprint.** N worktrees × a full `node_modules` is wasteful when the packages are byte-identical across worktrees.
- **Supply-chain posture.** The project already runs `--ignore-scripts` everywhere and gates licenses strictly (see the [CI threat model](ci-threat-model.md)). A package manager whose defaults reinforce that posture is preferable to one that fights it.
- **AGPL compatibility.** Any tool we adopt must clear the project's license constraints. The package manager runs _on_ our code rather than being redistributed _in_ the app, so the relevant test is permission-to-run, not link-compatibility (see [build-tool license scope](../../../licenses/in-use.md)).
- **CI parity.** Whatever runs locally must run in CI without a second toolchain. The seven gates, the three Claude workflows, and both husky hooks all shell out to the package manager.
- **Reversibility.** The project is pre-implementation; switching now is cheap. Switching after an app ships is not.

## Considered Options

1. **Stay on npm.** Status quo.
2. **pnpm.** Content-addressable global store + hard-links/reflinks into each `node_modules`; strict (non-hoisted) layout by default.
3. **Yarn (Berry / PnP).** Plug'n'Play eliminates `node_modules` entirely via a `.pnp.cjs` resolver.
4. **Bun.** Bun's own installer + runtime.

## Decision Outcome

Chosen option: **Option 2 — pnpm** (pinned via `packageManager: "pnpm@11.1.1"` and enforced with `engine-strict`).

pnpm directly solves the worktree problem: packages are stored once in a global content-addressable store (`~/.pnpm-store` / `~/.local/share/pnpm/store`) and **hard-linked** into each worktree's `node_modules` instead of copied. A second, third, Nth worktree that resolves the same lockfile costs near-zero additional disk and installs in seconds because the store is already warm. This is the caching feature that motivated the switch.

pnpm's other defaults reinforce the project's existing posture rather than fighting it:

- **Strict, non-hoisted `node_modules`.** A package can only `import` what it actually declares. This surfaces phantom-dependency bugs (code relying on an undeclared transitive that npm's flat tree happened to hoist) at install/build time instead of in production. We keep this default on purpose (`.npmrc` documents it). It did require promoting one previously-transitive dependency, `yaml`, to a direct `devDependency` so `scripts/extract-dep-signals.mjs` can import it — see "Consequences."
- **No dependency lifecycle scripts by default.** pnpm does not run `preinstall`/`install`/`postinstall` scripts unless the package is on an explicit allow list (`onlyBuiltDependencies` in `pnpm-workspace.yaml`). This is a supply-chain hardening default npm lacks; it complements the `--ignore-scripts` we already pass everywhere. Only `esbuild` and `electron-winstaller` are allow-listed, with rationale inline in `pnpm-workspace.yaml`. CI installs still pass `--ignore-scripts`, so the allow list governs local installs only.

The migration is mechanical and total: `package-lock.json` → `pnpm-lock.yaml`; `npm ci` → `pnpm install --frozen-lockfile`; `npx <bin>` → `pnpm exec <bin>` (or a direct `node_modules/.bin/<bin>` spawn where the wrapper overhead matters, as in the prettier hook); `npm audit` → `pnpm audit`; CI uses `corepack enable` before `actions/setup-node` so `cache: pnpm` resolves the pinned pnpm. The `engines` field requires `node >=24` and `pnpm >=11`, and `engine-strict=true` makes a mismatched toolchain fail loudly at install rather than producing a subtly-different tree.

### Positive Consequences

- **Worktree installs are near-instant and near-free on disk** once the store is warm — the headline win.
- **Phantom dependencies become build failures**, not latent production bugs.
- **Lifecycle-script execution is opt-in**, narrowing the local supply-chain surface to two explicitly-justified packages.
- **`packageManager` + `engine-strict`** guarantee every contributor and every CI runner uses the same pnpm major, so the lockfile stays reproducible.
- **CI is faster** — `cache: pnpm` plus the store means warm-cache installs are quick, and `--frozen-lockfile` gives the same "lockfile is authoritative, never mutate it" guarantee `npm ci` did.

### Negative Consequences

- **The dependency-review extractor had to be rewritten.** `scripts/extract-dep-signals.mjs` parsed `package-lock.json` (JSON, with per-package `license` fields). `pnpm-lock.yaml` is YAML with a different shape and **records no per-package license string**. The rewrite parses the pnpm lockfile and its diff format, but **license signals are gone** — `licenseChanges` and the `*License` fields no longer exist in `signals.json`. License compatibility is now enforced solely by the `license-check` CI gate; the Claude dep-review prompt's license dimension is best-effort (resolving licenses from the installed base tree where present). See the update note in [claude-dependency-review.md](claude-dependency-review.md).
- **A new direct devDependency (`yaml`).** The strict layout means the extractor can no longer import a transitive `yaml`; it is now a declared `devDependency` (ISC-licensed, on the allow list).
- **Contributor onboarding gains a step.** Anyone cloning the repo must have pnpm available; `corepack enable` (bundled with Node ≥ 16.9) handles this, but it is one more thing than `npm` being implicitly present.
- **The strict layout can surface latent phantom-dependency breakage** in dependencies that misbehave under non-hoisted `node_modules`. None observed in this tree, but it is the class of issue to watch for on future installs.

## Pros and Cons of the Options

### Option 1 — Stay on npm

- **Good**, because it is zero-effort and npm ships with Node, so there is nothing to install or pin.
- **Good**, because the existing `extract-dep-signals.mjs` (which reads `package-lock.json` and its license fields) keeps working unchanged.
- **Bad**, because it leaves the worktree install cost — the actual pain point — completely unaddressed. Every worktree pays a full copy-install.
- **Bad**, because npm runs lifecycle scripts by default and hoists a flat tree, so neither supply-chain hardening nor phantom-dependency detection comes for free.

### Option 2 — pnpm

- **Good**, because the content-addressable store + hard-linking makes per-worktree installs near-free in time and disk — solving the motivating problem directly.
- **Good**, because strict layout and opt-in build scripts align with the project's existing security posture.
- **Good**, because `packageManager` + corepack + `engine-strict` give reproducible, version-pinned installs across local and CI.
- **Bad**, because it forced the `extract-dep-signals.mjs` rewrite and the loss of lockfile-derived license signals.
- **Bad**, because it adds a (corepack-managed) toolchain prerequisite.

### Option 3 — Yarn Berry (PnP)

- **Good**, because Plug'n'Play eliminates `node_modules` entirely, which would make worktrees even cheaper than pnpm's hard-links.
- **Bad**, because PnP requires a resolver shim (`.pnp.cjs`) that many tools in our stack (Electron packaging, some Storybook/Vitest plugins, `license-checker`) do not transparently support; the `nodeLinker: node-modules` escape hatch gives up most of the PnP benefit and lands us back near pnpm.
- **Bad**, because it is a larger conceptual departure from the npm baseline for a marginal gain over pnpm on our actual workload.

### Option 4 — Bun

- **Good**, because Bun's installer is extremely fast and it bundles a runtime/test-runner.
- **Bad**, because the project is committed to **Electron** with a Node runtime (see [typescript-desktop-frameworks](../../../references/typescript-desktop-frameworks.md)); adopting Bun as the package manager invites runtime-divergence questions we have no reason to take on.
- **Bad**, because Bun's lockfile and ecosystem maturity around Electron packaging and our specific tool stack are less proven than pnpm's, and the worktree win is comparable to pnpm's anyway.

## Follow-up

- After any future `pnpm install` that changes the tree, regenerate [`docs/licenses/in-use.md`](../../../licenses/in-use.md) and keep the `license-check` allow list in `.github/workflows/ci.yml` in sync.
- Keep `onlyBuiltDependencies` in `pnpm-workspace.yaml` minimal; add an entry only with an inline justification, and prefer leaving a package inert if its build script is not actually needed.
- If a contributor reports a phantom-dependency build failure, fix it by declaring the missing dependency directly — do **not** loosen the strict layout (`shamefully-hoist`/`node-linker=hoisted`) to paper over it.
- Revisit if pnpm's lockfile format changes in a way that breaks `extract-dep-signals.mjs`; the extractor pins to the `packages:`/`name@version` shape of lockfileVersion 9.

## Links

- CI feature: [continuous-integration OVERVIEW](../OVERVIEW.md)
- Affected dependency-review ADR: [claude-dependency-review.md](claude-dependency-review.md)
- CI threat model: [ci-threat-model.md](ci-threat-model.md)
- Build-tool license-scope rationale: [docs/licenses/in-use.md](../../../licenses/in-use.md)
- pnpm motivation (content-addressable store): <https://pnpm.io/motivation>
- pnpm `onlyBuiltDependencies`: <https://pnpm.io/settings#onlybuiltdependencies>
- Corepack: <https://nodejs.org/api/corepack.html>
- MADR template: <https://adr.github.io/madr/>
