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

Between 2026-05-25 and 2026-05-28, both properties failed in seven different ways. Each failure produced a real incident (a merged-broken PR, a silently-skipped gate, a hook that reformatted the wrong file). This ADR captures every shape we've seen so future "why didn't this fire?" debugging starts with a known checklist instead of from scratch.

## Decision Drivers

- **No silent skip.** When a hook can't run, it must emit a stderr notice loud enough that the next "why didn't this catch X?" investigation has a starting point. Failing open is acceptable; failing silent is not.
- **One-maintainer triage cost.** Each repeat incident costs hours. The cost ceiling for any fix is "robustness across the failure modes we've actually seen," not "robustness against hypothetical future ones."
- **Cross-platform behavior on Windows + Git-Bash.** The maintainer's primary environment is Git-Bash on Windows. Path-form drift between POSIX (`/e/Bradley/...`) and Windows (`E:/Bradley/...`) is the source of two of the seven incidents below. Any path comparison the hooks do must normalize.
- **Worktree-as-first-class environment.** Claude Desktop creates worktrees aggressively; a single user-facing session may have produced 6+ live worktrees over a week. The hooks must treat worktree sessions as the normal case, not the edge case.

## Considered Options

1. **Per-hook hardening: fix each bug as it surfaces, no global model.** This is what the project did from 2026-05-25 through PR #68 — twelve commits, each addressing a specific incident, no overarching contract for what a hook is allowed to assume about its environment.
2. **Lift everything into the harness: only Claude hooks, no husky.** Drop pre-commit/pre-push entirely and have Claude's PreToolUse on `Bash` block any commit that would fail the gates. This loses coverage for the maintainer's own terminal commits.
3. **Lift everything into CI: only required gates, no local hooks.** Drop both layers and let CI fail loudly. Loses fast-local-feedback for both Claude and the maintainer, and re-introduces "PR #68 merged with red CI" as the only signal.
4. **Codify the cross-environment contract (chosen).** Keep both layers but write down the invariants every hook has to satisfy, and refactor the hooks so they're robust to the failure modes we've now seen. Document the failure modes so the next debugging session starts with a checklist.

## Decision Outcome

Chosen option: **Option 4 — codify the cross-environment contract**, with each Claude hook and each husky hook satisfying the four invariants listed below. The invariants are derived from the seven incidents in the chronology section; each invariant prevents at least one of them.

### Invariants every hook must satisfy

1. **Path-form normalization before any prefix or equality compare.** On Git-Bash + Windows, `$PWD` is POSIX form (`/e/Bradley/...`), `CLAUDE_PROJECT_DIR` from Claude's tool input is typically POSIX, but `git rev-parse --git-common-dir` and `tool_input.file_path` arrive in Windows form (`E:/Bradley/...`). String comparison of these unnormalized values is wrong _even when they refer to the same directory_. Use `cygpath -u` to coerce both sides to POSIX before comparing. On non-Windows systems `cygpath` isn't present and the function is a pass-through.

2. **Resolve tooling via Node's module resolution, not hardcoded `./node_modules/` paths.** Worktrees don't have their own `node_modules/`; they rely on parent-traversal up to the main repo's install. A hook that does `[ -f ./node_modules/eslint/bin/eslint.js ]` silently exits 0 in every worktree session. Use `node -e "require.resolve('package/package.json')"` and join the bin's relative path — Node walks upward correctly, and `package.json` is always in the package's `exports` map (`bin/eslint.js` is not, which is why `require.resolve('eslint/bin/eslint.js')` raises `ERR_PACKAGE_PATH_NOT_EXPORTED`).

3. **Scope checks must be enforced by `.prettierignore` / `eslint.config.mjs` ignore patterns in addition to any path-prefix check inside the hook.** A worktree at `.claude/worktrees/<name>/` is a path-prefix subdirectory of the main repo's working tree. A naive `case "$ABS_FILE" in "$ABS_PROJECT"/*) ;;` check from a main-repo session matches worktree files (correctly, since the worktree IS under the main repo). The actual isolation comes from the ignore-pattern config: `.claude/worktrees/` in `.prettierignore` and `eslint.config.mjs`'s ignores list. Both layers are required.

4. **`.husky/_/` must exist in every environment that might receive a commit or push.** Git treats a missing `core.hooksPath` target as "no hook" and silently no-ops. Husky's installer only writes `.husky/_/` to whichever working tree it's run from, _provided the CWD has a `.git` file or directory_ — its `fs.existsSync('.git')` check does NOT do parent traversal, so running `prepare` from a CWD without a `.git` reference silently no-ops (the script returns a non-empty error string but exits 0). Additionally, husky writes `.husky/_/.gitignore` containing `*`, which means every file inside `_/` is gitignored — any `git clean -fdx` wipes it. The SessionStart bootstrap (`.claude/hooks/session-start-bootstrap.sh`) must materialize `.husky/_/` in _both_ the worktree and the main repo on every session entry, and must use git's parent-traversal resolution (`git rev-parse --git-common-dir`) rather than husky's literal `.git`-existence check, so a ghost worktree (filesystem dir with no `.git` reference) doesn't cause the bootstrap to silently fail (idempotent, ~37ms when already bootstrapped).

### Concrete hook responsibilities

- **`session-start-bootstrap.sh` (SessionStart)** — bootstrap husky in the worktree (`$PWD` after `cd "$CLAUDE_PROJECT_DIR"`) AND in the main repo (resolved via `git rev-parse --path-format=absolute --git-common-dir`'s parent). Both paths normalized via `cygpath -u` before the equality check that decides whether the main-repo bootstrap is redundant. Also repair any worktree-scope `core.hooksPath` override (`git config --worktree --unset core.hooksPath`) that an upstream tool may have written.

- **`fallow-gate.sh` (PreToolUse Bash)** — gate Claude's `git commit` / `git push` invocations on `fallow audit` verdict. Resolves `fallow` via PATH and `npx --no-install`, so the worktree session finds the main repo's install via traversal.

- **`prettier-format.sh` (PostToolUse Edit|Write|MultiEdit)** — format Claude's edits in place. Scope-check against `CLAUDE_PROJECT_DIR` with `cygpath -u` normalization; rely on `.prettierignore` for the worktree-subpath case the prefix check can't catch.

- **`eslint-stop.sh` (Stop)** — run `eslint .` before Claude ends a turn; block (decision: "block") on errors. ESLint binary resolved via Node module resolution from `eslint/package.json`. Excludes `.claude/worktrees/` via both an inline `--ignore-pattern` and the shared `eslint.config.mjs` ignores list.

- **`.husky/pre-commit`** — runs `npx lint-staged`, which prettifies + eslint-fixes staged files. Fires in whichever working tree `git commit` was invoked from.

- **`.husky/pre-push`** — mirrors the seven CI gates (`lint`, `format:check`, `typecheck`, `license-check`, `npm audit --omit=dev --audit-level=high` blocking + full-tree advisory, `audit:fallow`, `build`, `test-storybook`).

## Chronology of failures

Twelve commits across seven incidents, in commit order. Each one fixed a real symptom; several introduced or re-exposed a different one.

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
- **`00719ea`** — fix `eslint-stop.sh` to resolve ESLint via `require.resolve('eslint/package.json')` instead of the hardcoded `./node_modules/eslint/bin/eslint.js` path. The old path failed in every worktree, silently exiting 0 with "eslint not installed in this project" — meaning Claude could end a turn with lint errors and no Stop-time gate ever fired.
- **`4821dbe`** — add `.claude/worktrees/` to `.prettierignore` and the `eslint.config.mjs` ignores list. Without it, running `eslint .` / `prettier --check .` from the main repo walked into other sessions' nested worktrees and reported their files as failures. CI doesn't see this because CI checks out a fresh repo with no nested worktrees; local pre-push does.

## Pros and Cons of the Options

### Option 1 — Per-hook hardening with no global model

- **Bad**, because it produced the chronology above: twelve commits, seven incidents, multiple "fixed the symptom but missed the root invariant" iterations. Each fix added complexity without ratcheting up confidence that the _next_ shape of the same bug is prevented.
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

- **Good**, because the invariants are written down. Future "why didn't this fire?" debugging starts with: "did it fail one of the four invariants?" instead of "what's broken this time?"
- **Good**, because each invariant maps to a real incident, so we don't pay for hypothetical robustness.
- **Good**, because the chronology section is a regression-test catalog: any future hook rewrite has to re-pass all seven incidents.
- **Bad**, because the contract is only as good as the next incident we haven't seen yet. The first violation of a 5th invariant won't be caught by these four.

## Positive Consequences

- The hooks now satisfy "fire regardless of environment" and "isolated to the environment" together. Verified test matrix (in PR #69's commit `00719ea`): SessionStart, PreToolUse(Bash), PostToolUse(Edit), Stop, husky pre-commit, husky pre-push — each one tested from both the main repo and a worktree, with isolation checked in both directions.
- The path-form normalization pattern (`cygpath -u` with non-Windows pass-through) is now used in both `session-start-bootstrap.sh` and `prettier-format.sh`. Future hooks that need path comparisons should follow the same pattern.
- `.claude/worktrees/` is ignored by both `eslint.config.mjs` and `.prettierignore`. Future tooling that walks the main repo's tree (any new lint/format/audit) inherits the exclusion without per-tool wiring.

## Negative Consequences

- The bootstrap is opportunistic: it only repairs the main repo if a worktree-bound session happens to start. If no Claude session is started for a stretch and `.husky/_/` is emptied (by whatever cleanup mechanism is responsible), the maintainer's terminal commits would silently bypass hooks. A safer design would be a `prepare` script that runs on `npm install` and re-materializes `_/` on every install — which it already does — but only if `npm install` is run; the failure mode in incident 7 was that `npm install` had been run, but something deleted `_/` afterward without re-running it.
- The chronology is long and most of it isn't actively useful day-to-day. Readers approaching this ADR for the first time should focus on the four invariants in Decision Outcome; the chronology is for the "why does that invariant exist?" follow-up question.
- The bootstrap script has grown from 50 lines (incident 5) to ~120 lines with comments. Some of that complexity is essential (the worktree-scope override repair, the main-repo bootstrap, the path-form normalization), but every conditional branch is a future bug surface.

## Follow-up

- **Investigate what's deleting `.husky/_/` from the main repo.** Incident 7's root cause was the missing wrapper; the bootstrap fix repaired it but didn't identify what removed it in the first place. Experiments after PR #69 narrowed the candidate set substantially but did NOT identify the actual cleaner:
  - **Ruled out: `git clean` from a worktree.** Husky writes `.husky/_/.gitignore` containing `*`, so every file inside `_/` is gitignored — _any_ `git clean -fdx` would delete `_/`. But `git clean -fdx` from worktree A only affects worktree A's working tree, not the main repo's (verified by dry-run from a sibling worktree).
  - **Ruled out: `git worktree remove`.** Removing a sibling worktree leaves the main repo's `_/` intact (verified by stat'ing before and after).
  - **Ruled out: `git worktree add`.** Creating a new worktree doesn't touch the main repo's `_/` (verified by stat'ing before and after).
  - **Ruled out: fallow-audit cache worktrees.** The ~100 temp worktrees fallow leaves in `%TEMP%/fallow-audit-base-cache-*/` are minimal checkouts with no `node_modules/` and no `.husky/` — they never invoke husky and can't propagate a `_/` deletion.
  - **Ruled out: `npm install` from a worktree.** It materializes `.husky/_/` in the worktree (`cwd()`-bound via husky's `fs.existsSync('.git')` check) but does NOT touch the main repo's `_/`. Husky's installer is _additive_ — it only ever writes files, never removes them.
  - **Confirmed risk: husky CWD-bound install does NOT do parent-directory `.git` traversal.** A `prepare` invocation from a CWD with no `.git` reference (e.g. a "ghost worktree": filesystem dir that exists but is no longer in `git worktree list`) silently no-ops because `fs.existsSync('.git')` returns false. The script returns a non-empty error string but exits 0. Our session-start bootstrap is exposed to this if `CLAUDE_PROJECT_DIR` points at a ghost worktree — but PR #69's "also bootstrap MAIN_REPO" branch (which DOES do parent traversal via `git rev-parse --git-common-dir`) compensates for it.

  Remaining candidates we couldn't confirm or rule out from inside this repo: an IDE/editor "clean workspace" action against the main repo, a manual `git clean -fdx` run by the user, a previous Claude session executing a `rm -rf` against `.husky/_/`, or external disk-cleanup tooling. Until one of these is confirmed, the bootstrap continues to treat the symptom; it does not prevent recurrence.

- **Add a CI-side check for `.husky/_/` presence on every PR head.** If the main repo's wrapper is missing post-merge, we'd want to know before the next push. This could be a `pre-merge`-style check or a daily scheduled job.
- **Evaluate whether the worktree-cleanup flow should _not_ leave half-empty worktree directories.** The `lucid-jennings` worktree this session was bound to was an empty filesystem directory with NO corresponding entry in `.git/worktrees/<name>/` — git did not consider it a worktree anymore, but `CLAUDE_PROJECT_DIR` still pointed at it. That's the "ghost worktree" failure mode described above. Either fully remove the directory on cleanup or leave the worktree registered.
- **Detect ghost worktrees in the bootstrap and re-target.** If `CLAUDE_PROJECT_DIR` lacks a `.git` reference (file or dir), fall back to bootstrapping the main repo alone rather than running `prepare` in a CWD where husky will silently no-op. The current bootstrap calls `npm run prepare` in the ghost worktree's CWD, which fails silently per the experiment above.
- **Test the eslint Stop hook with a real lint error from inside a worktree session** as part of any future hook refactor. Incident 7's fix (`00719ea`) was the first time this code path was actually exercised; before that, every worktree session had been silently skipping the gate for unknown duration.

## Links

- [CI threat model](ci-threat-model.md) — out of scope for this ADR; hook bugs are reliability issues, not security ones. But the threat model's "no malicious collaborators" assumption is what lets us trust husky's `--no-verify` bypass remaining available to the maintainer.
- [CI overview](../OVERVIEW.md)
- [CLAUDE.md, "Commands" section](../../../../CLAUDE.md) — the user-facing summary of pre-commit / pre-push behavior and bypass syntax.
- [githooks(5)](https://git-scm.com/docs/githooks) — relative-path resolution behavior that makes a single shared `core.hooksPath = .husky/_` work per-worktree.
- [git-config(1)](https://git-scm.com/docs/git-config) — `--worktree` scope precedence.
- [husky `index.js`](https://github.com/typicode/husky/blob/main/index.js) — confirms `.husky/_/` is load-bearing; `core.hooksPath = .husky/` doesn't work because the `_/` wrapper is what puts `node_modules/.bin` on PATH and honors `HUSKY=0`. Also: the literal `fs.existsSync('.git')` check (no parent traversal) and the `w(_('.gitignore'), '*')` write that makes every file inside `_/` gitignored.
- [husky issue #1554 — "Strange behaviour in git worktree setup"](https://github.com/typicode/husky/issues/1554), [#1555 (same)](https://github.com/typicode/husky/issues/1555), [#202](https://github.com/typicode/husky/issues/202), [#580](https://github.com/typicode/husky/issues/580), [#787](https://github.com/typicode/husky/issues/787) — open and historical worktree-related issues in the husky tracker. None of them explicitly track the "`.husky/_/` disappears" pattern, but the cluster of issues confirms husky's worktree story is not officially supported.
