# Hook environments: making `.claude/hooks/*` and `.husky/*` fire correctly across worktrees and the main repo

- Status: accepted
- Date: 2026-05-28
- Deciders: Bradley Shrader
- Tags: ci, hooks, husky, claude-code, worktrees

## Context and Problem Statement

The project enforces formatting, linting, and CI-mirror gates in two layers:

- **Claude Code hooks** in `.claude/hooks/` (PreToolUse, PostToolUse, Stop, SessionStart) — guard Claude's tool calls so a session can't produce malformed code or skip the CI-mirror gates Claude is supposed to clear before stopping.
- **Husky git hooks** in `.husky/` (pre-commit, pre-push) — guard any commit/push regardless of who runs it, including Claude's `Bash(git commit)` / `Bash(git push)` calls and the maintainer's terminal.

Both layers have to behave correctly in two environments: the **main repo** at `E:/Bradley/Documents/VSCodeProjects/notebook-app/`, and any number of **linked git worktrees** under `.claude/worktrees/<name>/` that Claude Desktop creates for parallel sessions. Each worktree has its own working tree, its own branch, and its own per-worktree git dir under `.git/worktrees/<name>/`. Worktrees typically share the main repo's `node_modules/` via npm's parent-directory traversal, but they do _not_ have their own `node_modules/`.

The hooks need to satisfy two competing properties:

1. **Work regardless of environment.** Whether the session runs from the main repo or a worktree, and whether commits happen in the main repo (`git commit`) or in a worktree (also `git commit`), every gate must fire. Silent skip is the worst possible behavior — it makes a broken hook indistinguishable from a clean run until CI catches the slip.
2. **Stay isolated to the environment that invoked them.** A hook running from worktree A must not format or lint files in worktree B or the main repo. A hook running from the main repo must not reach into nested worktrees. Cross-environment touch causes false-positive failures (other sessions' in-flight work surfaces as your lint errors) and, worse, silent file rewrites in other branches.

Between 2026-05-25 and 2026-05-28, both properties failed in eight different ways. Each failure produced a real incident (a merged-broken PR, a silently-skipped gate, a hook that reformatted the wrong file, a pair of fixes that cancelled each other out). This ADR captures every shape we've seen so future "why didn't this fire?" debugging starts with a known checklist instead of from scratch.

## Decision Drivers

- **No silent skip.** When a hook can't run, it must emit a stderr notice loud enough that the next "why didn't this catch X?" investigation has a starting point. Failing open is acceptable; failing silent is not.
- **One-maintainer triage cost.** Each repeat incident costs hours. The cost ceiling for any fix is "robustness across the failure modes we've actually seen," not "robustness against hypothetical future ones."
- **Cross-platform behavior on Windows + Git-Bash.** The maintainer's primary environment is Git-Bash on Windows. Path-form drift between POSIX (`/e/Bradley/...`) and Windows (`E:/Bradley/...`) is the source of two of the incidents below. Any path comparison the hooks do must normalize.
- **Worktree-as-first-class environment.** Claude Desktop creates worktrees aggressively; a single user-facing session may have produced 6+ live worktrees over a week. The hooks must treat worktree sessions as the normal case, not the edge case.

## Considered Options

1. **Per-hook hardening: fix each bug as it surfaces, no global model.** This is what the project did from 2026-05-25 through PR #69 — over a dozen commits, each addressing a specific incident, no overarching contract for what a hook is allowed to assume about its environment.
2. **Lift everything into the harness: only Claude hooks, no husky.** Drop pre-commit/pre-push entirely and have Claude's PreToolUse on `Bash` block any commit that would fail the gates. This loses coverage for the maintainer's own terminal commits.
3. **Lift everything into CI: only required gates, no local hooks.** Drop both layers and let CI fail loudly. Loses fast-local-feedback for both Claude and the maintainer, and re-introduces "PR #68 merged with red CI" as the only signal.
4. **Codify the per-environment hook contract (chosen).** Keep both layers but write down the invariants every hook has to satisfy, and refactor the hooks so each one operates only on the environment the session is bound to (no cross-environment reach) and is robust to the failure modes we've now seen. Document the failure modes so the next debugging session starts with a checklist.

## Decision Outcome

Chosen option: **Option 4 — codify the per-environment hook contract**, with each Claude hook and each husky hook satisfying the five invariants listed below. The invariants are derived from the incidents in the chronology section (plus the code-review pass that followed PR #69); each invariant prevents at least one of them. The headline shift from the PR #66–#69 era: hooks no longer reach across environments (a worktree session bootstrapping the main repo, or resolving a parent's `node_modules`). Each environment self-guards, because git's per-worktree `core.hooksPath` resolution already makes that sufficient.

### Invariants every hook must satisfy

1. **Path-form normalization before any prefix or equality compare.** On Git-Bash + Windows, `$PWD` is POSIX form (`/e/Bradley/...`), `CLAUDE_PROJECT_DIR` from Claude's tool input is typically POSIX, but `git rev-parse --git-common-dir` and `tool_input.file_path` arrive in Windows form (`E:/Bradley/...`). String comparison of these unnormalized values is wrong _even when they refer to the same directory_. Use `cygpath -u` to coerce both sides to POSIX before comparing. On non-Windows systems `cygpath` isn't present and the function is a pass-through.

2. **Resolve tooling LOCALLY to the environment, and require a local install — do not walk `node_modules/` upward to a parent.** Upward resolution looks attractive (a worktree without its own `node_modules/` "just finds" the main repo's install) but it silently couples the hook to another environment AND, for ESLint specifically, drags in the parent's `eslint.config.mjs` whose `.claude/worktrees/` ignore is anchored at the main-repo root — which then matches the entire worktree's path, so `eslint .` reports "all files are ignored" (exit 2) and the hook fails open linting nothing. (We hit this directly: an earlier iteration used `node -e "require.resolve('eslint/package.json')"` to walk upward; it produced exactly this silent no-op.) Instead, check for the tool LOCALLY (`[ -f ./node_modules/eslint/bin/eslint.js ]`, `[ -d node_modules/husky ]`) and, when it's missing, make noise rather than reaching: a Stop hook returns `decision: "block"` telling the agent to `npm install`; a SessionStart hook (which cannot block) emits a loud stderr notice. A checkout that was never provisioned is a real problem to surface, not to paper over with a neighbor's install.

3. **Each environment self-guards; hooks must not reach across environments.** Git resolves `core.hooksPath = .husky/_` (a relative path in shared local-scope config) per working tree at hook-invocation time — a `git commit` in worktree X runs `X/.husky/_/pre-commit`; a commit in the main repo runs `<main>/.husky/_/pre-commit` (githooks(5): "Git changes its working directory to … the root of the working tree before invoking the hook"). So every environment automatically detects itself; there is no need for a worktree session to reach into the main repo to make main-repo commits safe. The only requirement is that each environment which receives a commit has its OWN `.husky/_/` materialized. A SessionStart hook bootstraps the environment it is bound to (`CLAUDE_PROJECT_DIR`) and nothing else; the main repo (or any sibling worktree) is guarded when a session is bound to IT. Corollary: don't operate on a different environment than the session is bound to (e.g. editing/committing main-repo files via absolute paths from a worktree session) — that bypasses the environment's own hooks; PR #68 landed exactly that way.

4. **Isolation is enforced by `.prettierignore` / `eslint.config.mjs` ignore patterns, not by in-hook path-prefix checks.** A worktree at `.claude/worktrees/<name>/` is a path-prefix subdirectory of the main repo's working tree, so a naive `case "$ABS_FILE" in "$ABS_PROJECT"/*) ;;` check from a main-repo session matches worktree files. The actual isolation comes from the ignore-pattern config (`.claude/worktrees/` in `.prettierignore` and `eslint.config.mjs`'s ignores list) so that a tool run from the MAIN checkout doesn't descend into sibling worktrees. Note the interaction with invariant 2: that ignore is anchored at the config's base path, so it must only ever be consulted when linting FROM the main checkout — which the local-install requirement guarantees (a worktree lints with its OWN config, where the pattern matches nothing).

5. **`.husky/_/` is fragile — treat its absence as expected, not exceptional.** Git treats a missing `core.hooksPath` target as "no hook" and silently no-ops. Husky writes `.husky/_/.gitignore` containing `*`, so every file inside `_/` is gitignored and any `git clean -fdx` wipes it (a confirmed deletion mechanism; see Follow-up). Husky's installer also does a literal `fs.existsSync('.git')` check with NO parent traversal, so running `prepare` from a CWD without a `.git` reference (a "ghost worktree" left after `git worktree remove`) silently no-ops while still exiting 0. The bootstrap must therefore: detect the ghost case (`[ ! -e .git ]`) and skip loudly; require a local husky install before running `prepare`; and verify the post-condition (`.husky/_/pre-commit` actually materialized) so husky's silent no-op doesn't pass as success. All idempotent, with a ~70ms fast-path exit when already bootstrapped.

### Concrete hook responsibilities

- **`husky-bootstrap.sh` (SessionStart + CwdChanged)** — bootstrap husky in EXACTLY the environment the triggering event points at. The target directory is read from the hook's stdin payload — `new_cwd` for CwdChanged, `cwd` for SessionStart — with `CLAUDE_PROJECT_DIR` as a fallback for manual invocation; one stdin-driven script serves both events. No cross-environment reach: it does not resolve or bootstrap the main repo from a worktree. Repairs any worktree-scope `core.hooksPath` override (`git config --worktree --unset core.hooksPath`); skips loudly on a ghost worktree (`[ ! -e .git ]`); requires a local husky install (`[ -d node_modules/husky ]`) and emits a notice to `npm install` if absent rather than leaning on a parent; runs the prepare script directly (`node scripts/prepare.mjs`, not `npm run prepare` — directness over an extra npm process); verifies `.husky/_/pre-commit` materialized. It is wired to CwdChanged as well as SessionStart so that moving into a different checkout mid-session (e.g. a `cd` into a sibling worktree) re-runs the same per-environment check. **WorktreeCreate is deliberately NOT wired** — that event replaces git's default worktree-creation behavior (the hook must perform the creation and print the new worktree's absolute path, or creation fails), so a bootstrap-only hook there would break `claude --worktree`; a new worktree is instead bootstrapped by the SessionStart that fires when a session opens in it.

- **`fallow-gate.sh` (PreToolUse Bash)** — gate Claude's `git commit` / `git push` invocations on `fallow audit` verdict. Resolves `fallow` via PATH and `npx --no-install`.

- **`prettier-format.sh` (PostToolUse Edit|Write|MultiEdit)** — format Claude's edits in place. Scope-check against `CLAUDE_PROJECT_DIR` with `cygpath -u` normalization; rely on `.prettierignore` for the worktree-subpath case the prefix check can't catch.

- **`eslint-stop.sh` (Stop)** — run `eslint .` before Claude ends a turn; block (`decision: "block"`) on lint errors (exit 1). Uses the LOCAL `./node_modules/eslint/bin/eslint.js` (no upward walk); if that's absent, blocks with a message telling the agent to `npm install` (the `stop_hook_active` guard prevents an infinite loop). Surfaces exit 2 (config error / no files matched / all ignored) loudly to stderr instead of treating it as a silent clean pass. Excludes `.claude/worktrees/` via the shared `eslint.config.mjs` ignores list (and a redundant inline `--ignore-pattern` for runs from the main checkout).

- **`.husky/pre-commit`** — runs `npx lint-staged`, which prettifies + eslint-fixes staged files. Fires in whichever working tree `git commit` was invoked from.

- **`.husky/pre-push`** — mirrors the seven CI gates (`lint`, `format:check`, `typecheck`, `license-check`, `npm audit --omit=dev --audit-level=high` blocking + full-tree advisory, `audit:fallow`, `build`, `test-storybook`).

## Chronology of failures

Over a dozen commits across nine chronology entries, in commit order. Entries 1–8 are failures (a merged-broken PR, silently-skipped gates, a reformatted-wrong-file, a self-defeating pair); entry 9 is the husky-CI-pattern adoption. Several entries introduced or re-exposed a different problem — incident 8 reverts parts of incident 7.

### Incident 1 — eslint hook crashed inside worktrees (2026-05-25, commit [`09594f7`](https://github.com/bkshrader/notebook-app/commit/09594f7))

The initial eslint-stop hook (`63c4cb5`) ran `eslint .` from `$CWD`. When invoked from a session whose `$CWD` was the main repo, `eslint .` descended into `.claude/worktrees/<name>/` and crashed on those sibling worktrees' files (different branches, sometimes broken intentionally as in-flight work). Fix: `--ignore-pattern '.claude/worktrees/'` inside the hook, plus the matching pattern added to `.gitignore`.

This was the first sign of the cross-environment problem: a tool run from environment A had reached into environment B's working tree.

### Incident 2 — pre-push hook silently bypassed CI mirror (2026-05-26, commits [`377b646`](https://github.com/bkshrader/notebook-app/commit/377b646), [`ad8f631`](https://github.com/bkshrader/notebook-app/commit/ad8f631))

Husky was wired up with `set -e` semantics intended to fail fast on the first gate. In practice the gate scripts emitted non-zero exit codes for non-fatal cases, causing the hook to abort _before_ reaching the genuinely-blocking gates. Reviewer caught it. Fix: replace `set -e` with explicit `|| exit 1` on each step so non-zero exits are intentional, not incidental. Also: `playwright install --with-deps chromium` added to the `prepare` script so `test-storybook` actually has the browser it needs in CI/Linux environments.

### Incident 3 — prettier hook silently skipped on Windows worktree edits (2026-05-27, commits [`db39872`](https://github.com/bkshrader/notebook-app/commit/db39872), [`8a61206`](https://github.com/bkshrader/notebook-app/commit/8a61206), [`ec065d5`](https://github.com/bkshrader/notebook-app/commit/ec065d5))

The PostToolUse prettier hook compared `tool_input.file_path` (Windows form: `E:/Bradley/...`) against `CLAUDE_PROJECT_DIR` (POSIX form: `/e/Bradley/...`) using `realpath` and a `case` prefix check. The two never matched, so every Edit/Write/MultiEdit fell through the scope check and prettier never ran. This is the root cause that allowed the unformatted `@vitejs/*` escape in the `dependabot-grouping` ADR to slip past Claude's hook into the PR.

The debug instrumentation in `db39872` confirmed the diagnosis (`ABS_FILE = E:/Bradley/...`, `ABS_PROJECT = /e/Bradley/...`, "scope check failed"). `8a61206` added `cygpath -u` normalization. `ec065d5` stripped the debug instrumentation back out once the fix was confirmed.

### Incident 4 — pre-push blocked every push on a devDep advisory (2026-05-27, commit [`db39872`](https://github.com/bkshrader/notebook-app/commit/db39872), and the repair in [`42204b3`](https://github.com/bkshrader/notebook-app/commit/42204b3))

`npm audit --audit-level=high` was failing on `@lhci/cli`'s transitive `tmp` advisory — a devDep-only finding with no prod-reachable path. Both CI and pre-push were blocking every PR. Fix: split into a blocking `--omit=dev` audit (prod-reachable high+) and an advisory full-tree audit that surfaces devDep findings via stderr without blocking.

The `42204b3` follow-up revealed a separate problem: `db39872`'s claim to have applied this split to `.husky/pre-push` was wrong. The file's mtime showed no change despite the Write tool reporting success. Likely a sandbox-layer issue specific to husky-managed paths. Re-applied via shell heredoc.

### Incident 5 — pre-push didn't fire in worktrees because `.husky/_/` was missing (2026-05-27, commit [`61b0343`](https://github.com/bkshrader/notebook-app/commit/61b0343))

Claude Desktop's worktree-creation flow doesn't run `npm install`, so the new worktree never has `.husky/_/` materialized. Git silently no-ops on missing hooksPath. The original SessionStart hook addressed this by running `npm run prepare` (husky's installer) inside the worktree on session entry, idempotent fast-path when already bootstrapped.

This was the first version of `session-start-bootstrap.sh`. It assumed all relevant commits would happen inside the worktree the session was bound to.

### Incident 6 — worktree-scope `core.hooksPath` override pointed at the wrong directory (2026-05-28, commit [`eedb55f`](https://github.com/bkshrader/notebook-app/commit/eedb55f))

Even with `.husky/_/` materialized, pre-push wasn't firing in some worktrees. The cause: `.git/worktrees/<name>/config.worktree` had an absolute Windows path for `core.hooksPath` pointing at the main repo's `.husky/_/`. Worktree-scope config wins over local-scope per git's precedence rules ([git-config(1)](https://git-scm.com/docs/git-config)), so git was looking for hooks in the wrong directory.

Not husky's bug — husky's installer calls plain `git config core.hooksPath .husky/_` (relative path, local scope). The absolute worktree-scope override was likely written by Claude Desktop's worktree-creation flow. The bootstrap can detect and repair it: `git config --worktree --get core.hooksPath` probes for the override; `git config --worktree --unset core.hooksPath` removes it, falling back to the shared local-scope relative value which git resolves per-worktree at hook invocation time ([githooks(5)](https://git-scm.com/docs/githooks): "Git changes its working directory to the root of the working tree before invoking the hook").

### Incident 7 — PR #68 merged with red CI because main repo's `.husky/_/` was missing (2026-05-28, commits [`fa5bfa4`](https://github.com/bkshrader/notebook-app/commit/fa5bfa4) → [`2d98b97`](https://github.com/bkshrader/notebook-app/commit/2d98b97), [`a66acfc`](https://github.com/bkshrader/notebook-app/commit/a66acfc), [`00719ea`](https://github.com/bkshrader/notebook-app/commit/00719ea), [`4821dbe`](https://github.com/bkshrader/notebook-app/commit/4821dbe))

A worktree-bound Claude session edited the `claude-dependency-review.md` ADR via absolute paths into the main repo, then committed via `git -C <main repo> commit`. The main repo's `.husky/_/` had been emptied at some point (no clear evidence of when; possibly the worktree-cleanup flow, possibly a `git clean`, possibly the fallow-audit cache mechanism). The commit silently skipped pre-commit; the push silently skipped pre-push. The unformatted ADR landed on `main`.

Four fixes, each independently necessary:

- **`fa5bfa4`/`2d98b97`** — extend `session-start-bootstrap.sh` to bootstrap the main repo too, not just the worktree, when the two differ and the main repo's wrapper is missing.
- **`a66acfc`** — normalize `$PWD` vs `MAIN_REPO` to POSIX form before the equality compare that decides whether the main-repo bootstrap is redundant. Without this, a main-repo session ran the bootstrap twice (idempotent but confusing in traces).
- **`00719ea`** — fix `eslint-stop.sh` to resolve ESLint via `require.resolve('eslint/package.json')` instead of the hardcoded `./node_modules/eslint/bin/eslint.js` path. The old path failed in every worktree, silently exiting 0 with "eslint not installed in this project" — meaning Claude could end a turn with lint errors and no Stop-time gate ever fired. **(Reverted in incident 8 — see below.)**
- **`4821dbe`** — add `.claude/worktrees/` to `.prettierignore` and the `eslint.config.mjs` ignores list. Without it, running `eslint .` / `prettier --check .` from the main repo walked into other sessions' nested worktrees and reported their files as failures. CI doesn't see this because CI checks out a fresh repo with no nested worktrees; local pre-push does.

### Incident 8 — the cross-environment fixes from incidents 7 were partly self-defeating; redesigned to per-environment (2026-05-28, code-review pass on PR #69)

A max-effort code-review pass over PR #69 found that two of incident 7's fixes cancelled each other out. The eslint upward-resolution (`00719ea`) made a worktree without its own `node_modules`/`eslint.config.mjs` resolve the MAIN repo's ESLint **and** the main repo's `eslint.config.mjs`. That config's brand-new `.claude/worktrees/` ignore (`4821dbe`) is anchored at the main-repo root, so it matched the worktree's own path — ESLint reported "all files are ignored", exited 2, and the Stop hook (which only blocks on exit 1) silently failed open. Verified live: from a config-less dir under `.claude/worktrees/`, `eslint .` exits 2 with "all of the files matching the glob pattern '.' are ignored." The fix for a worktree-without-local-install was the exact thing that broke it.

The review also reconfirmed (against an earlier worry) that the ghost-worktree guard does NOT misfire on live worktrees — live registered worktrees have a `.git` file; only true ghosts (dirs left after `git worktree remove`) lack one.

The redesign abandoned the cross-environment approach entirely (see invariants 2 and 3):

- **`eslint-stop.sh`** — revert to the LOCAL `./node_modules/eslint/bin/eslint.js`. When it's absent, `decision: "block"` tells the agent to `npm install` (the `stop_hook_active` guard caps it at one block per turn). Exit 2 is now surfaced loudly to stderr instead of treated as a silent clean pass.
- **`session-start-bootstrap.sh` → `husky-bootstrap.sh`** — drop the entire "bootstrap the main repo too" branch (`fa5bfa4`/`2d98b97`), the `MAIN_REPO` resolution, the `to_posix`/`PWD_POSIX` comparison (`a66acfc`). The hook now bootstraps only the environment the triggering event points at. It requires a local husky install (`[ -d node_modules/husky ]`) and emits a notice to `npm install` rather than leaning on a parent's husky. The realization that made this safe: git's per-worktree `core.hooksPath` resolution already routes each environment's commits to its own `.husky/_/`, so cross-environment bootstrapping was never necessary — the right fix for PR #68 is "don't commit into an environment from a session not bound to it," which is a discipline the hooks can't enforce but the per-environment model makes legible.
- **Multi-event wiring + stdin-driven target.** The bootstrap was renamed (`session-start-bootstrap.sh` → `husky-bootstrap.sh`) and is now wired to BOTH `SessionStart` and `CwdChanged`, so that moving into a different checkout mid-session re-runs the per-environment check, not just session entry. To serve both events from one script, the target directory is read from the hook's stdin payload (`new_cwd` for CwdChanged, `cwd` for SessionStart; `CLAUDE_PROJECT_DIR` env as a fallback) — SessionStart's payload was verified to include `cwd`, so the script no longer depends on the env var. `WorktreeCreate` was evaluated and rejected: it replaces git's default worktree-creation behavior (must print the created worktree's absolute path or creation fails), so a reactive bootstrap there would break `claude --worktree`.

So `fa5bfa4`/`2d98b97`/`a66acfc` (incident 7's bootstrap-the-main-repo work) and `00719ea` (incident 7's eslint upward-resolution) are all superseded. `4821dbe`'s ignore entries stay (they're correct for runs from the main checkout; invariant 4 explains the interaction).

### Incident 9 — `prepare` adopts husky's CI/Docker pattern via `scripts/prepare.mjs` (2026-05-28)

`prepare` was `"husky && npx playwright install --with-deps chromium"` — a bare `husky` call that throws if husky isn't installed (a deps-only / production install). Husky documents a guard for exactly this ([CI server and Docker](https://typicode.github.io/husky/how-to.html#ci-server-and-docker)): skip when `NODE_ENV === 'production'` or `CI === 'true'`, and dynamic-`import('husky')` only after the guard so the import is never reached when husky is absent.

Adopted the pattern but kept the file under `scripts/prepare.mjs` (not `.husky/install.mjs`) so all repo automation lives in one place. `prepare` is now `node scripts/prepare.mjs`. Structure: guard first, then husky, then the Playwright install — both husky and Playwright are thus local-dev-only and consistent. Notes:

- **No CI workflow actually runs `prepare`** — every workflow uses `npm ci --ignore-scripts`, and the two that need Playwright (`ci.yml`, `a11y-axe.yml`) install it via explicit `npx playwright install` steps. So the guard is defensive (a stray `npm install` on a `CI=true`/prod box), and Playwright-before-vs-after-guard has no CI impact; after-guard was chosen to keep both steps local-only.
- **husky's silent no-op is surfaced.** `husky()` returns an empty string on success and a non-empty diagnostic (e.g. `.git can't be found`) on a no-op; `prepare.mjs` logs the diagnostic as a warning rather than discarding it.
- **Playwright failure is non-fatal.** Wrapped in try/catch with a stderr notice — husky is the load-bearing part and already ran; an offline/`--with-deps`-needs-sudo failure must not break `prepare`.
- **`husky-bootstrap.sh` now calls `node scripts/prepare.mjs` directly** (not `npm run prepare`), checking the file exists first. The session env has neither `CI` nor `NODE_ENV` set (verified), so the guard never trips during a bootstrap; the post-condition check still catches any silent no-op.

## Pros and Cons of the Options

### Option 1 — Per-hook hardening with no global model

- **Bad**, because it produced the chronology above: over a dozen commits, eight incidents, multiple "fixed the symptom but missed the root invariant" iterations — including a pair (incident 7) that cancelled each other out and had to be reverted (incident 8). Each fix added complexity without ratcheting up confidence that the _next_ shape of the same bug is prevented.
- **Bad**, because the invariants are non-obvious without seeing several incidents. The Windows path-form issue (incident 3) and the missing-`_/`-in-main (incident 7) are structurally identical (a silent skip caused by a string-compare mismatch / a missing file) but were diagnosed weeks apart with no connection drawn.

### Option 2 — Lift everything into the Claude harness

- **Good**, because the PreToolUse(Bash) gate already has the full context to block bad `git commit` invocations.
- **Bad**, because it leaves the maintainer's terminal commits ungated. The maintainer has bypassed `--no-verify` before; the gate has to fire on every commit, not just Claude's.
- **Bad**, because it concentrates all gates in the agent layer — when Claude is broken (auth lapse, runtime error, harness change), the safety net is gone.

### Option 3 — Lift everything into CI

- **Good**, because CI is the canonical authority on whether something should land.
- **Bad**, because CI feedback is ~3 minutes vs. ~10 seconds for pre-commit. The cost of bouncing PRs through CI for every formatting nit is real.
- **Bad**, because Claude's tool-call rate is much higher than human commit rate. Without a Stop-time ESLint gate, Claude can spend a 32-turn session producing broken code that only surfaces at PR time.

### Option 4 — Codify the cross-environment contract (chosen)

- **Good**, because the invariants are written down. Future "why didn't this fire?" debugging starts with: "did it fail one of the five invariants?" instead of "what's broken this time?"
- **Good**, because each invariant maps to a real incident, so we don't pay for hypothetical robustness.
- **Good**, because the chronology section is a regression-test catalog: any future hook rewrite has to re-pass all the failure incidents (entries 1–8).
- **Bad**, because the contract is only as good as the next incident we haven't seen yet. The first violation of a 5th invariant won't be caught by these four.

## Positive Consequences

- The hooks now satisfy "fire regardless of environment" and "isolated to the environment" together, and after incident 8 they do so WITHOUT reaching across environments — each session bootstraps only its own environment, relying on git's per-worktree `core.hooksPath` resolution for the rest. Verified test matrix: SessionStart (main repo, provisioned worktree, ghost worktree, unprovisioned worktree), Stop (clean, real errors, no-local-install block, loop-guard), plus the pre-existing PreToolUse/PostToolUse/pre-commit/pre-push coverage — each tested from both the main repo and a worktree, with isolation checked in both directions.
- The path-form normalization pattern (`cygpath -u` with non-Windows pass-through) is used in `prettier-format.sh` for its scope-prefix check. (The bootstrap dropped its own `cygpath` use in incident 8 when the `MAIN_REPO`-vs-`PWD` comparison that needed it was removed.) Future hooks that need path comparisons should follow the `prettier-format.sh` pattern.
- `.claude/worktrees/` is ignored by both `eslint.config.mjs` and `.prettierignore`. Future tooling that walks the main repo's tree (any new lint/format/audit) inherits the exclusion without per-tool wiring.

## Negative Consequences

- Each environment self-guards, which means an environment that never starts a Claude session (and whose `.husky/_/` got emptied) stays unguarded until something re-runs `npm install` / `npm run prepare` there. The per-environment model trades the (false-comfort) cross-environment repair for honesty: the hook fixes what it's bound to and goes loud about what it can't. The maintainer's terminal commits in such an environment would still silently bypass hooks until a session re-bootstraps it — see the CI-side-check follow-up.
- The chronology is long and most of it isn't actively useful day-to-day. Readers approaching this ADR for the first time should focus on the five invariants in Decision Outcome; the chronology is for the "why does that invariant exist?" follow-up question.
- The bootstrap script grew through incidents 5–7 and then SHRANK in incident 8 once the main-repo branch, `MAIN_REPO` resolution, and path-form comparison were removed. It's now single-environment and simpler, but still carries the worktree-scope override repair, the ghost-worktree guard, the local-install check, and the post-condition verify — each a conditional branch and a future bug surface.

## Follow-up

- **Investigate what's deleting `.husky/_/` from the main repo.** Incident 7's root cause was the missing wrapper; the bootstrap fix repaired it but didn't identify what removed it in the first place. Experiments after PR #69 narrowed the candidate set substantially but did NOT identify the actual cleaner:
  - **Ruled out: `git clean` from a worktree.** Husky writes `.husky/_/.gitignore` containing `*`, so every file inside `_/` is gitignored — _any_ `git clean -fdx` would delete `_/`. But `git clean -fdx` from worktree A only affects worktree A's working tree, not the main repo's (verified by dry-run from a sibling worktree).
  - **Ruled out: `git worktree remove`.** Removing a sibling worktree leaves the main repo's `_/` intact (verified by stat'ing before and after).
  - **Ruled out: `git worktree add`.** Creating a new worktree doesn't touch the main repo's `_/` (verified by stat'ing before and after).
  - **Ruled out: fallow-audit cache worktrees.** The ~100 temp worktrees fallow leaves in `%TEMP%/fallow-audit-base-cache-*/` are minimal checkouts with no `node_modules/` and no `.husky/` — they never invoke husky and can't propagate a `_/` deletion.
  - **Ruled out: `npm install` from a worktree.** It materializes `.husky/_/` in the worktree (`cwd()`-bound via husky's `fs.existsSync('.git')` check) but does NOT touch the main repo's `_/`. Husky's installer is _additive_ — it only ever writes files, never removes them.
  - **Confirmed risk: husky CWD-bound install does NOT do parent-directory `.git` traversal.** A `prepare` invocation from a CWD with no `.git` reference (e.g. a "ghost worktree": filesystem dir that exists but is no longer in `git worktree list`) silently no-ops because `fs.existsSync('.git')` returns false. The script returns a non-empty error string but exits 0. The bootstrap now detects this case (`[ ! -e .git ]`) and skips loudly (incident 8) rather than running a useless `prepare`.

  Strongest remaining hypothesis (from the husky-docs research): a `git clean -fdx` against the main repo. Husky writes `.husky/_/.gitignore = *`, so the whole `_/` is gitignored and `-x` removes it. Other candidates not yet confirmed or ruled out: an IDE/editor "clean workspace" action, a previous Claude session executing `rm -rf` against `.husky/_/`, or external disk-cleanup tooling. Until one is confirmed, the per-environment bootstrap re-materializes `_/` on the next session in that environment but does not prevent the deletion.

- **Add a CI-side check for `.husky/_/` presence on every PR head.** If the main repo's wrapper is missing post-merge, we'd want to know before the next push. This could be a `pre-merge`-style check or a daily scheduled job. This is the main mitigation for the "environment that never starts a session stays unguarded" gap noted in Negative Consequences.
- **Evaluate whether the worktree-cleanup flow should _not_ leave half-empty worktree directories.** The `lucid-jennings` worktree this session was bound to was an empty filesystem directory with NO corresponding entry in `.git/worktrees/<name>/` — git did not consider it a worktree anymore, but `CLAUDE_PROJECT_DIR` still pointed at it. That's the "ghost worktree" failure mode. The bootstrap now skips it loudly; the cleaner fix is upstream (either fully remove the directory on cleanup or leave the worktree registered).
- **DONE (incident 8): detect ghost worktrees and skip loudly; resolve eslint/husky locally and block-or-notify when missing.** Ghost detection landed; the eslint Stop hook was verified with a real lint error from both a worktree and the main repo, and with the no-local-install block path and its `stop_hook_active` loop-guard.

## Links

- [CI threat model](ci-threat-model.md) — out of scope for this ADR; hook bugs are reliability issues, not security ones. But the threat model's "no malicious collaborators" assumption is what lets us trust husky's `--no-verify` bypass remaining available to the maintainer.
- [CI overview](../OVERVIEW.md)
- [CLAUDE.md, "Commands" section](../../../../CLAUDE.md) — the user-facing summary of pre-commit / pre-push behavior and bypass syntax.
- [githooks(5)](https://git-scm.com/docs/githooks) — relative-path resolution behavior that makes a single shared `core.hooksPath = .husky/_` work per-worktree.
- [git-config(1)](https://git-scm.com/docs/git-config) — `--worktree` scope precedence.
- [husky `index.js`](https://github.com/typicode/husky/blob/main/index.js) — confirms `.husky/_/` is load-bearing; `core.hooksPath = .husky/` doesn't work because the `_/` wrapper is what puts `node_modules/.bin` on PATH and honors `HUSKY=0`. Also: the literal `fs.existsSync('.git')` check (no parent traversal) and the `w(_('.gitignore'), '*')` write that makes every file inside `_/` gitignored.
- [husky issue #1554 — "Strange behaviour in git worktree setup"](https://github.com/typicode/husky/issues/1554), [#1555 (same)](https://github.com/typicode/husky/issues/1555), [#202](https://github.com/typicode/husky/issues/202), [#580](https://github.com/typicode/husky/issues/580), [#787](https://github.com/typicode/husky/issues/787) — open and historical worktree-related issues in the husky tracker. None of them explicitly track the "`.husky/_/` disappears" pattern, but the cluster of issues confirms husky's worktree story is not officially supported.
