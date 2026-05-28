#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: bootstrap husky hooks in THIS session's environment
# (the worktree or main repo `CLAUDE_PROJECT_DIR` points at) so that
# pre-commit/pre-push fire for commits made there.
#
# Design principle — no cross-environment reach. Git resolves
# `core.hooksPath = .husky/_` (a RELATIVE path in shared local-scope
# config) per working tree at hook-invocation time: a `git commit` in
# worktree X looks for `X/.husky/_/pre-commit`; a commit in the main
# repo looks for `<main>/.husky/_/pre-commit` (githooks(5): "Git
# changes its working directory to ... the root of the working tree
# before invoking the hook"). So EVERY environment auto-detects itself
# — there is no need to reach from a worktree into the main repo to
# make main-repo commits safe. The only requirement is that each
# environment which receives a commit has its OWN `.husky/_/`
# materialized. This hook ensures that for the environment the session
# is bound to; the main repo (or any other worktree) is guarded when a
# session is bound to IT.
#
# An earlier version (PR #69) bootstrapped both the worktree AND the
# main repo from a single session, to paper over a session committing
# into the main repo via absolute paths from a worktree. That was
# fixing a symptom of crossing environments rather than the cause. The
# cause is "commit into an environment whose `.husky/_/` was never
# materialized" — addressed per-environment, here.
#
# Two failure modes this hook addresses, both within this environment:
#
# 1. Missing wrapper: `.husky/_/` doesn't exist because `npm install`
#    was never run here. Husky's `.husky/_/` wrapper is load-bearing
#    (puts `node_modules/.bin` on PATH for lint-staged/prettier, honors
#    HUSKY=0, sources ~/.config/husky/init.sh, runs hooks under
#    `sh -e`). Without it, git silently no-ops on `core.hooksPath` and
#    pre-commit/pre-push don't fire. Fix: run `npm run prepare`, which
#    materializes `.husky/_/` — but ONLY if husky is installed locally
#    (see the local-install check below; we do not lean on a parent
#    repo's install).
#
# 2. Worktree-scope hooksPath override: an upstream tool (likely the
#    worktree-creation flow) wrote an absolute `core.hooksPath` to
#    `.git/worktrees/<name>/config.worktree`. Worktree-scope wins over
#    local-scope per git's config precedence, and the absolute path
#    points at the MAIN repo's `.husky/_/` instead of this worktree's.
#    Result: hook lookups in this worktree resolve to a sibling
#    worktree's hook scripts (or nothing). Fix: `git config --worktree
#    --unset core.hooksPath`, falling back to the shared local-scope
#    relative value (`.husky/_`).
#
# See: https://github.com/typicode/husky/blob/main/index.js
#      https://git-scm.com/docs/git-config (--worktree, scope precedence)
#      https://git-scm.com/docs/githooks (relative-path resolution)
#
# Fails open with a stderr notice — bootstrap failures warn but never
# block a session from starting.

cd "${CLAUDE_PROJECT_DIR:-.}" || {
  echo "session-start-bootstrap: cannot cd to CLAUDE_PROJECT_DIR=${CLAUDE_PROJECT_DIR:-.}; skipping." >&2
  exit 0
}

# Repair the worktree-scope hooksPath override. Run from within this
# environment (after the cd above) so `git config --worktree` resolves
# to THIS worktree's config.worktree, not whichever one happened to be
# CWD when the hook was invoked. The `--get` probe is what distinguishes
# "no override exists, skip" from "override exists, drop it".
if command -v git >/dev/null 2>&1 \
   && git config --worktree --get core.hooksPath >/dev/null 2>&1; then
  git config --worktree --unset core.hooksPath 2>/dev/null || true
  echo "session-start-bootstrap: removed worktree-scope core.hooksPath override; falling back to shared local-scope value." >&2
fi

# Idempotent fast-path: if this environment's wrapper is already
# materialized, there's nothing to do. Saves ~2.5s per session-start on
# already-bootstrapped environments, which is the steady-state case.
if [ -f .husky/_/pre-commit ]; then
  exit 0
fi

# Ghost-worktree guard: husky's installer does a literal
# `fs.existsSync('.git')` check (no parent traversal) and silently
# returns a non-empty error string while still exiting 0 if the CWD has
# no `.git` reference. That happens when this directory is a filesystem
# remnant left behind after `git worktree remove` — git no longer
# considers it a worktree. Running `npm run prepare` here would no-op
# silently; skip with a loud notice instead.
if [ ! -e .git ]; then
  echo "session-start-bootstrap: CLAUDE_PROJECT_DIR ('$PWD') has no .git file/dir — likely a ghost worktree left behind after 'git worktree remove'. Skipping husky bootstrap; remove the empty directory or restore the worktree." >&2
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "session-start-bootstrap: npm not on PATH; cannot bootstrap husky. Hooks won't fire here until bootstrapped manually (run 'npm install')." >&2
  exit 0
fi

# Require a LOCAL husky install in this environment. We check for
# `./node_modules/husky` directly (a filesystem stat scoped to THIS
# checkout) rather than `require.resolve`, which would climb
# node_modules upward and find a parent worktree's install — exactly
# the cross-environment coupling this redesign removes, and which hides
# the real problem (this environment was never provisioned). If husky
# isn't installed here, tell the agent to install and stop — a
# SessionStart hook can't block, so this is a loud notice rather than a
# decision:block.
if [ ! -d node_modules/husky ]; then
  echo "session-start-bootstrap: husky is not installed in this checkout ('$PWD'). This is usually a fresh git worktree that was never provisioned. Run 'npm install' here to materialize node_modules and .husky/_/, otherwise pre-commit/pre-push will NOT fire for commits made in this environment." >&2
  exit 0
fi

# Run prepare to materialize this environment's `.husky/_/`. Output to
# stderr so it doesn't pollute the session's user-facing transcript.
# (`prepare` also runs `npx playwright install` per package.json; that
# cost is accepted here per project decision.)
if ! npm run prepare >&2; then
  echo "session-start-bootstrap: 'npm run prepare' failed in '$PWD'; hooks may not fire here. See the error above." >&2
  exit 0
fi

# Post-condition check: husky's CLI exits 0 even when it silently
# no-ops. Verify the wrapper actually materialized so a silent no-op
# doesn't slip past as "bootstrap succeeded."
if [ ! -f .husky/_/pre-commit ]; then
  echo "session-start-bootstrap: 'npm run prepare' exited 0 but .husky/_/pre-commit is still missing in '$PWD'. Husky's installer probably silently no-op'd; hooks won't fire here until manually bootstrapped." >&2
  exit 0
fi
