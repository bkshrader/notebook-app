# Adopt Stylelint with token, a11y, and logical-property plugins

- Status: accepted
- Date: 2026-05-30
- Deciders: Bradley Shrader
- Tags: accessibility, tooling, linting, css, design-tokens

## Context and Problem Statement

`notebook-app` is accessibility-first ([see accessibility OVERVIEW](../OVERVIEW.md)) and has committed to **HashiCorp's Helios** design system, consumed **tokens-only** as CSS custom properties (decided 2026-05-27; the design-system ADR and `DESIGN.md` visual contract are pending the token package install). That contract requires component CSS to reference **semantic** tokens (`--token-color-foreground-*`, etc.) and **never** raw palette values or hardcoded colors — that semantic layer is what makes the WCAG 2.1 AA contrast guarantee hold.

Today that rule lives only in prose (`DESIGN.md`, the `helios-design-system` memory). The repo has effectively no first-party CSS yet, but component CSS is imminent. We already enforce JS/TS quality mechanically (ESLint + Prettier, with a CI job, a husky pre-push gate, and a Claude `Stop` hook). CSS has no equivalent layer.

How should we mechanically enforce CSS quality — most importantly the token discipline that underpins our contrast guarantee — and how should that enforcement be wired into the existing pipeline?

## Decision Drivers

- The accessibility-first charter makes Helios token discipline a contrast-correctness concern, not a style preference; it deserves machine enforcement, not reviewer vigilance.
- WCAG 2.1 AA is the floor: focus outlines must never be stripped without replacement; `prefers-reduced-motion` must be respected (also an ADHD-first constraint).
- Enforcement should arrive **before** CSS proliferates, so rules shape the code from line one rather than being retrofitted.
- New tooling should mirror the existing ESLint footprint (CI job + pre-push + Stop hook) so contributors and Claude encounter one consistent pattern.
- Every dependency must be AGPL-compatible. (Stylelint is build tooling that operates on our code and is never redistributed, so per the build-tool license-scope rule its license is not a redistribution concern — but the chosen packages are MIT regardless.)

## Considered Options

1. **Adopt Stylelint** with `stylelint-config-standard` plus plugins for token enforcement, a11y, and logical properties.
2. **Rely on Prettier + code review only.** Prettier already formats CSS; trust reviewers for the rest.
3. **Adopt Stylelint with the base config only**, no plugins.

## Decision Outcome

Chosen option: **Option 1 — adopt Stylelint with a curated plugin set.**

Package set (all MIT, all `devDependencies`):

- `stylelint` (17.x) + `stylelint-config-standard` — the engine and a strict, non-stylistic base. Prettier still owns formatting; the v16+ standard config deliberately dropped the stylistic rules that would conflict.
- **`stylelint-declaration-strict-value`** — the headline choice. Configured to require a `var(...)`/function for color-bearing properties (`/color$/`, `fill`, `stroke`, `box-shadow`, `background`), this is the mechanical enforcement of the Helios "semantic tokens, never raw color" rule. The property list is provisional and will be tuned against the real token surface once `DESIGN.md` and the token package land on `main`.
- **`@double-great/stylelint-a11y`** — the **maintained** a11y plugin (the bare `stylelint-a11y` by YozhikM is abandoned: last release 2020, supports only Stylelint ≤13). We enable `a11y/no-outline-none` and `a11y/media-prefers-reduced-motion`, both direct charter requirements.
- **`stylelint-plugin-logical-css`** — enforces logical properties/values/units (i18n/RTL-readiness). Enabled at `severity: warning` for the initial rollout so it informs without blocking before any real CSS exists; flip to error once the codebase is clean.
- **`stylelint-config-clean-order`** (+ its `stylelint-order` peer) — a shareable property-order config for predictable, low-cognitive-load CSS structure (ADHD-first).

Integration mirrors ESLint exactly: a `lint:css` / `lint:css:fix` script pair, a dedicated parallel `lint-css` CI job, a `pnpm lint:css` line in the husky pre-push, a `*.css` `lint-staged` entry (`stylelint --fix` then `prettier --write`), and a Claude `.claude/hooks/stylelint-stop.sh` Stop hook cloned from `eslint-stop.sh`.

Because Stylelint exits non-zero (code 2) when its glob matches **zero** files, and the repo had no first-party CSS, we committed a real stub stylesheet (`src/renderer/src/styles/app.css`, `body { font-size: 16px; }`) so the glob is always non-empty. This was chosen over `--allow-empty-input` so the gate exercises a real file from day one and the stub becomes the natural home for the first app CSS.

### `stylelint-high-performance-animation` — deferred

`stylelint-high-performance-animation` enforces compositor-only animation (`transform`/`opacity` over layout/paint-triggering properties), which aligns with the reduced-motion / ADHD-first stable-layout constraint. It was **considered and deferred**: with effectively no animation CSS in the codebase yet, the rule is a likely source of noise without a corresponding payoff. Revisit if animation-performance regressions become a consistent footgun — at that point the rule's signal-to-noise flips favorable. Recorded here so the option isn't re-litigated from scratch; adding it later is a one-line `plugins` + one-rule change.

### Positive Consequences

- The Helios contrast guarantee moves from prose to a CI gate; a hardcoded color now fails the build instead of slipping past review.
- Two WCAG-AA failure modes (stripped focus outlines, motion that ignores `prefers-reduced-motion`) are caught statically, before any rendered-DOM check.
- CSS gets the exact same enforcement footprint as JS/TS, so the pipeline stays uniform for contributors and Claude.
- Rules are in place before component CSS exists, so they shape it from the start.

### Negative Consequences

- One more linter to keep current (Stylelint majors, plugin peer ranges).
- The `declaration-strict-value` property list and the logical-css severities are provisional and will need a tuning pass once real CSS and the finalized token surface exist.
- A committed stub CSS file exists solely to keep the glob non-empty until real CSS arrives.

## Pros and Cons of the Options

### Option 1 — Stylelint + curated plugins

- **Good**, because it mechanically enforces token discipline, the linchpin of our contrast guarantee.
- **Good**, because it adds static a11y checks that complement `eslint-plugin-jsx-a11y` (which only sees JSX, not CSS).
- **Good**, because it mirrors the established ESLint pattern, minimizing cognitive overhead.
- **Bad**, because it adds maintenance surface and an upfront tuning burden.

### Option 2 — Prettier + review only

- **Good**, because it adds zero new tooling.
- **Bad**, because token discipline and a11y CSS rules then depend entirely on reviewer attention — exactly the kind of correctness-critical check the project elsewhere chooses to automate. A single missed hardcoded color silently degrades contrast.

### Option 3 — Stylelint base config only

- **Good**, because it catches malformed CSS, duplicate properties, and invalid values cheaply.
- **Bad**, because it does nothing for the project's actual differentiators — token enforcement and a11y — which are the whole reason to adopt Stylelint here.

## Follow-up

- When `DESIGN.md` and `@hashicorp/design-system-tokens` land on `main`, tune the `declaration-strict-value` property list against the real token surface, and evaluate adding `stylelint-value-no-unknown-custom-properties` (pointed at the token files) to catch typo'd token names.
- Once real component CSS is logical-property-clean, flip the `logical-css/*` rules from `warning` to `error`.
- Revisit `stylelint-high-performance-animation` if animation-performance regressions recur.
- Regenerate `docs/licenses/in-use.md` after the install so the dependency-tree license summary stays current.

## Links

- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Design system: Helios (tokens-only); the Helios ADR and `DESIGN.md` are pending the token-package install.
- Sibling tooling ADR: [ESLint version pin](./eslint-version.md)
- MADR template: <https://adr.github.io/madr/>
