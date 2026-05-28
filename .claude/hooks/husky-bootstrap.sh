#!/usr/bin/env bash
set -euo pipefail

# Husky bootstrap hook — ensures pre-commit/pre-push fire for commits
# made in THIS environment (the worktree or main repo the triggering
# event points at).
#
# Wired to TWO Claude Code hook events (see .claude/settings.json):
#
#   - SessionStart — a session begins/resumes/clears/compacts. stdin
#     payload carries `cwd`.
#   - CwdChanged   — the working directory moves mid-session (e.g. a
#     `cd` into a different checkout). stdin payload carries `new_cwd`
#     (and `old_cwd`).
#
# We deliberately do NOT wire WorktreeCreate: that event REPLACES git's
# default worktree-creation behavior (the hook must perform the
# creation and print the new worktree's absolute path, or creation
# fails). A bootstrap-only hook there would break `claude --worktree`.
# A newly-created worktree is instead bootstrapped by the SessionStart
# that fires when a session opens in it — and nothing commits in the
# gap between creation and first session.
#
# Target-directory resolution (stdin-driven so one script serves both
# events): read the hook payload from stdin and prefer `new_cwd`
# (CwdChanged), then `cwd` (SessionStart). Fall back to the
# `CLAUDE_PROJECT_DIR` env var (always exported to command hooks) for
# manual invocation or if stdin is unavailable.
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
# materialized. This hook ensures that for the environment the
# triggering event points at; other environments are guarded when an
# event fires pointing at THEM.
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
# 1. Missing wrapper: `.husky/_/` doesn't exist because `pnpm install`
#    was never run here. Husky's `.husky/_/` wrapper is load-bearing
#    (puts `node_modules/.bin` on PATH for lint-staged/prettier, honors
#    HUSKY=0, sources ~/.config/husky/init.sh, runs hooks under
#    `sh -e`). Without it, git silently no-ops on `core.hooksPath` and
#    pre-commit/pre-push don't fire. Fix: run `pnpm run prepare`, which
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
#      https://code.claude.com/docs/en/hooks.md (SessionStart, CwdChanged)
#
# Fails open with a stderr notice — bootstrap failures warn but never
# block the triggering event.

# Resolve the target directory. Drain stdin FIRST, unconditionally —
# before we know whether jq is available. Two reasons this must not live
# inside the `command -v jq` guard:
#
#   1. If stdin is read only when jq exists, a jq-less box never parses
#      `new_cwd`, so CwdChanged silently falls back to CLAUDE_PROJECT_DIR
#      (pinned at session start) and bootstraps the ORIGINAL root instead
#      of the checkout just cd'd into — the exact event this hook was
#      wired for becomes a no-op.
#   2. An unconsumed stdin payload is inherited by the `node
#      scripts/prepare.mjs` child (and its `execSync` grandchild), a
#      latent coupling we'd rather not leave dangling.
#
# The `|| true` keeps `set -e` from aborting when stdin is empty.
INPUT="$(cat 2>/dev/null || true)"

# Parse the payload if jq is present. On SessionStart/CwdChanged stdin is
# JSON; `jq` extracts the field (CwdChanged → new_cwd; SessionStart →
# cwd; first non-empty wins). If jq is missing or stdin isn't JSON,
# TARGET stays empty and we fall back to the env var below. The `|| true`
# keeps `set -e` from aborting when jq fails.
TARGET=""
if [ -n "$INPUT" ] && command -v jq >/dev/null 2>&1; then
  TARGET="$(jq -r '.new_cwd // .cwd // empty' <<<"$INPUT" 2>/dev/null || true)"
fi
# Fallback: CLAUDE_PROJECT_DIR is exported to all command hooks, and is
# the right target for manual invocation (no stdin payload).
if [ -z "$TARGET" ]; then
  TARGET="${CLAUDE_PROJECT_DIR:-}"
fi
if [ -z "$TARGET" ]; then
  echo "husky-bootstrap: no target directory (stdin had no new_cwd/cwd and CLAUDE_PROJECT_DIR is unset); skipping." >&2
  exit 0
fi

cd "$TARGET" || {
  echo "husky-bootstrap: cannot cd to target '$TARGET'; skipping." >&2
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
  echo "husky-bootstrap: removed worktree-scope core.hooksPath override; falling back to shared local-scope value." >&2
fi

# Idempotent fast-path: if this environment's wrapper is already
# materialized, there's nothing to do. Saves ~2.5s per fire on
# already-bootstrapped environments, which is the steady-state case.
if [ -f .husky/_/pre-commit ]; then
  exit 0
fi

# Ghost-worktree guard: husky's installer does a literal
# `fs.existsSync('.git')` check (no parent traversal) and silently
# returns a non-empty error string while still exiting 0 if the CWD has
# no `.git` reference. That happens when this directory is a filesystem
# remnant left behind after `git worktree remove` — git no longer
# considers it a worktree. Running `pnpm run prepare` here would no-op
# silently; skip with a loud notice instead.
if [ ! -e .git ]; then
  echo "husky-bootstrap: target ('$PWD') has no .git file/dir — likely a ghost worktree left behind after 'git worktree remove'. Skipping husky bootstrap; remove the empty directory or restore the worktree." >&2
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "husky-bootstrap: node not on PATH; cannot bootstrap husky. Hooks won't fire here until bootstrapped manually (run 'pnpm install')." >&2
  exit 0
fi

# Require a LOCAL husky install in this environment. We check for
# `./node_modules/husky` directly (a filesystem stat scoped to THIS
# checkout) rather than `require.resolve`, which would climb
# node_modules upward and find a parent worktree's install — exactly
# the cross-environment coupling this redesign removes, and which hides
# the real problem (this environment was never provisioned). If husky
# isn't installed here, tell the agent to install — these events can't
# block, so this is a loud notice.
if [ ! -d node_modules/husky ]; then
  echo "husky-bootstrap: husky is not installed in this checkout ('$PWD'). This is usually a fresh git worktree that was never provisioned. Run 'pnpm install' here to materialize node_modules and .husky/_/, otherwise pre-commit/pre-push will NOT fire for commits made in this environment." >&2
  exit 0
fi

# Materialize this environment's `.husky/_/` by running the repo's
# prepare script directly (`node scripts/prepare.mjs`) rather than
# `pnpm run prepare` — directness avoids an extra package-manager
# process and is explicit about what we're invoking. prepare.mjs runs
# husky and (when not in CI/prod) the Playwright install; both are
# idempotent. Output to stderr so it doesn't pollute the session's
# user-facing transcript.
if [ ! -f scripts/prepare.mjs ]; then
  echo "husky-bootstrap: scripts/prepare.mjs not found in '$PWD'; cannot bootstrap. Run 'pnpm install' here." >&2
  exit 0
fi
if ! node scripts/prepare.mjs >&2; then
  echo "husky-bootstrap: 'node scripts/prepare.mjs' failed in '$PWD'; hooks may not fire here. See the error above." >&2
  exit 0
fi

# Post-condition check: husky's CLI exits 0 even when it silently
# no-ops. Verify the wrapper actually materialized so a silent no-op
# doesn't slip past as "bootstrap succeeded."
if [ ! -f .husky/_/pre-commit ]; then
  echo "husky-bootstrap: 'pnpm run prepare' exited 0 but .husky/_/pre-commit is still missing in '$PWD'. Husky's installer probably silently no-op'd; hooks won't fire here until manually bootstrapped." >&2
  exit 0
fi
