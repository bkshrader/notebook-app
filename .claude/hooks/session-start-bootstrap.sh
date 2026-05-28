#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: bootstrap husky hooks if this worktree hasn't been
# bootstrapped yet, AND repair a worktree-scope `core.hooksPath` override
# that would route hook invocations to the wrong directory.
#
# Two failure modes this hook addresses, both observed on real worktrees
# created by Claude Desktop's `git worktree add` flow:
#
# 1. Missing wrapper: `.husky/_/` doesn't exist in the new worktree
#    because `npm install` was never run there. Husky's `.husky/_/`
#    wrapper is load-bearing (puts `node_modules/.bin` on PATH for
#    lint-staged/prettier, honors HUSKY=0, sources ~/.config/husky/
#    init.sh, runs hooks under `sh -e`). Without it, git silently
#    no-ops on `core.hooksPath` and pre-commit/pre-push don't fire.
#    Fix: run `npm run prepare`, which materializes `.husky/_/`.
#
# 2. Worktree-scope override: an upstream tool (likely the worktree-
#    creation flow) wrote an absolute `core.hooksPath` to
#    `.git/worktrees/<name>/config.worktree`. Worktree-scope wins
#    over local-scope per git's config precedence, and the absolute
#    path points at the MAIN repo's `.husky/_/` instead of this
#    worktree's. Result: hook lookups in this worktree resolve to a
#    sibling worktree's hook scripts (or nothing, if the main repo's
#    `.husky/_/` is empty). Fix: `git config --worktree --unset
#    core.hooksPath`, falling back to the shared local-scope relative
#    value (`.husky/_`) which git resolves per-worktree at hook
#    invocation time (githooks(5): "Git changes its working directory
#    to ... the root of the working tree before invoking the hook").
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

# Repair the worktree-scope hooksPath override. Run from within the
# worktree (after the cd above) so `git config --worktree` resolves to
# THIS worktree's config.worktree, not whichever one happened to be
# CWD when the hook was invoked. The `--get` probe is what
# distinguishes "no override exists, skip" from "override exists, drop
# it".
if command -v git >/dev/null 2>&1 \
   && git config --worktree --get core.hooksPath >/dev/null 2>&1; then
  git config --worktree --unset core.hooksPath 2>/dev/null || true
  echo "session-start-bootstrap: removed worktree-scope core.hooksPath override; falling back to shared local-scope value." >&2
fi

# Idempotent fast-path: if the wrapper is already materialized, skip the
# rest. Saves ~2.5s per session-start on already-bootstrapped worktrees,
# which is the steady-state case.
if [ -f .husky/_/pre-commit ]; then
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "session-start-bootstrap: npm not on PATH; cannot run 'npm run prepare'. Worktree hooks won't fire until bootstrapped manually." >&2
  exit 0
fi

# Run prepare. It's a few seconds (mostly the cached `playwright install`
# stat-and-skip pass). Output goes to stderr so it doesn't pollute the
# session's user-facing transcript.
#
# Worktrees typically don't have their own node_modules — npm's parent-
# directory traversal picks up the main repo's node_modules instead. If
# neither location has husky installed, `npm run prepare` will fail
# with a "command not found" type error and we surface it as a notice
# (rather than pre-checking with a fragile path probe).
if ! npm run prepare >&2; then
  echo "session-start-bootstrap: 'npm run prepare' failed; worktree hooks may not fire. If the error above mentions 'husky: command not found', run 'npm ci' in this worktree or the parent repo." >&2
  exit 0
fi
