#!/usr/bin/env bash
set -euo pipefail

# SessionStart hook: bootstrap husky hooks so pre-commit/pre-push fire
# in BOTH the worktree this session is bound to AND the main repo,
# regardless of which one `git commit` runs against.
#
# Why both: `CLAUDE_PROJECT_DIR` is typically a worktree, but tool
# calls in the session may operate on the main repo via absolute paths
# (`git -C /main/repo commit ...` or even just editing files there).
# If the main repo's `.husky/_/` is missing, those commits silently
# skip all hooks because `core.hooksPath = .husky/_` resolves to a
# non-existent directory and git just no-ops on missing hook files.
# The PR #68 format-check regression landed exactly this way.
#
# Three failure modes this hook addresses:
#
# 1. Missing wrapper in worktree: `.husky/_/` doesn't exist in the new
#    worktree because `npm install` was never run there. Husky's
#    `.husky/_/` wrapper is load-bearing (puts `node_modules/.bin` on
#    PATH for lint-staged/prettier, honors HUSKY=0, sources
#    ~/.config/husky/init.sh, runs hooks under `sh -e`). Without it,
#    git silently no-ops on `core.hooksPath` and pre-commit/pre-push
#    don't fire. Fix: run `npm run prepare`, which materializes
#    `.husky/_/`.
#
# 2. Missing wrapper in main repo: same symptom as (1), but in the
#    main repo. The session-start-bootstrap historically only fixed
#    the worktree (the value of `CLAUDE_PROJECT_DIR`). Commits made
#    via `git -C <main repo>` from a worktree session hit a missing
#    `.husky/_/` and skipped all hooks. Fix: also bootstrap the main
#    repo on session start.
#
# 3. Worktree-scope hooksPath override: an upstream tool (likely the
#    worktree-creation flow) wrote an absolute `core.hooksPath` to
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

if ! command -v npm >/dev/null 2>&1; then
  echo "session-start-bootstrap: npm not on PATH; cannot bootstrap husky. Hooks won't fire until bootstrapped manually." >&2
  exit 0
fi

# Path-form normalization for the main-repo == worktree comparison
# below. On Windows + Git-Bash, `$PWD` is POSIX form (`/e/Bradley/...`)
# while `git rev-parse` returns the Windows form (`E:/Bradley/...`).
# These compare as unequal even when they point at the same directory,
# which would cause the script to run the bootstrap twice against the
# main repo (harmless because the existence check short-circuits, but
# wasteful and confusing in traces). `cygpath -u` is the canonical
# converter on Git-Bash and Cygwin; on non-Windows it isn't present
# and paths are already POSIX, so we no-op there.
to_posix() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u -- "$1" 2>/dev/null || echo "$1"
  else
    echo "$1"
  fi
}

# Resolve the main repo working tree from the worktree we're in. In a
# linked worktree, `git rev-parse --git-common-dir` returns the path
# to the main repo's `.git` directory (or `.git` itself when run from
# the main repo). The main repo's working tree is its parent.
#
# `--path-format=absolute` forces an absolute path so the dirname
# walk doesn't break on relative `.git` values. Fall back to no-op if
# git is missing or the call fails.
MAIN_REPO=""
if command -v git >/dev/null 2>&1; then
  git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
  if [ -n "$git_common_dir" ] && [ -d "$git_common_dir" ]; then
    # git-common-dir is the main repo's `.git` (typically). Its parent
    # is the main repo's working tree.
    MAIN_REPO="$(to_posix "$(dirname "$git_common_dir")")"
  fi
fi
PWD_POSIX="$(to_posix "$PWD")"

bootstrap_husky() {
  # Run husky's installer from $1 if and only if its `.husky/_/pre-commit`
  # is missing. Idempotent fast-path: if the wrapper is already there,
  # skip. Saves ~2.5s per session-start on already-bootstrapped repos.
  local target="$1"
  local label="$2"

  if [ ! -d "$target" ]; then
    echo "session-start-bootstrap: $label target '$target' does not exist; skipping." >&2
    return 0
  fi

  if [ -f "$target/.husky/_/pre-commit" ]; then
    return 0
  fi

  # Worktrees typically don't have their own node_modules — npm's
  # parent-directory traversal picks up the main repo's node_modules
  # instead. If neither location has husky installed, `npm run
  # prepare` will fail with a "command not found" type error and we
  # surface it as a notice (rather than pre-checking with a fragile
  # path probe).
  if ! (cd "$target" && npm run prepare >&2); then
    echo "session-start-bootstrap: 'npm run prepare' failed in $label ($target); hooks may not fire there. If the error above mentions 'husky: command not found', run 'npm ci' in that directory or the parent repo." >&2
    return 0
  fi
}

# 1. Bootstrap the worktree we're in (CLAUDE_PROJECT_DIR, already cd'd).
bootstrap_husky "$PWD" "worktree"

# 2. Also bootstrap the main repo if it's a different path AND missing
#    its wrapper. Commits via `git -C <main repo>` from this session
#    would otherwise skip hooks (PR #68 regression). The PWD vs
#    MAIN_REPO compare uses normalized POSIX forms so a Windows-form
#    `git rev-parse` result doesn't spuriously trip the guard.
if [ -n "$MAIN_REPO" ] && [ "$MAIN_REPO" != "$PWD_POSIX" ]; then
  bootstrap_husky "$MAIN_REPO" "main repo"
fi
