#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: bootstrap husky hooks if this worktree hasn't been
# bootstrapped yet. Solves the git-worktree-creation gap — Claude Desktop's
# `git worktree add` doesn't run `npm install`, so the husky wrapper at
# `.husky/_/` is missing and git silently no-ops on `core.hooksPath`. The
# net effect is that `pre-commit` and `pre-push` don't fire from worktrees
# until something materializes `.husky/_/`. We do that here.
#
# Husky's source confirms `.husky/_/` IS load-bearing — the wrapper
# provides `node_modules/.bin` on PATH (needed for lint-staged, prettier,
# etc. in the hooks), the HUSKY=0 killswitch, init-script sourcing, and
# `sh -e` execution semantics. Skipping the wrapper and pointing
# `core.hooksPath` at `.husky/` directly loses all of those.
# See: https://github.com/typicode/husky/blob/main/index.js
#
# Fails open with a stderr notice — a bootstrap failure should warn but
# never block a session from starting.

# Idempotent fast-path: if the wrapper is already materialized, skip the
# whole thing. Saves ~2.5s per session-start on already-bootstrapped
# worktrees, which is the steady-state case.
if [ -f "${CLAUDE_PROJECT_DIR:-.}/.husky/_/pre-commit" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || {
  echo "session-start-bootstrap: cannot cd to CLAUDE_PROJECT_DIR=${CLAUDE_PROJECT_DIR:-.}; skipping." >&2
  exit 0
}

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
