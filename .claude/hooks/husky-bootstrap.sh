#!/usr/bin/env bash
set -euo pipefail

# --- Detached background-install entry point ---------------------------
# This script re-execs ITSELF in the background to run the slow
# `pnpm install` without blocking the session (see the detach block near
# the end of the main path for why). When invoked as
# `husky-bootstrap.sh --bg-install <target-dir>`, we ARE that background
# child: cd into the target and run the provisioning, then exit. This is
# handled at the very top, before any of the SessionStart/CwdChanged stdin
# logic, because the child gets its target as an argument, not via stdin.
#
# Re-exec'ing the same file (rather than exporting a shell function) is
# what makes detachment portable: `setsid` is absent on git-bash/Windows
# and `export -f` does not survive every detach path, but `bash "$0"
# --bg-install <dir>` is a clean new process that needs neither.
if [ "${1:-}" = "--bg-install" ]; then
  BG_TARGET="${2:-}"
  if [ -z "$BG_TARGET" ] || ! cd "$BG_TARGET" 2>/dev/null; then
    echo "husky-bootstrap[bg]: cannot cd to target '$BG_TARGET'; aborting background install." >&2
    exit 0
  fi
  # Lock lives in the per-worktree git dir (resolved AFTER cd so it points
  # at THIS target's git dir). Remove it on exit no matter how we leave, so
  # the commit gate never waits on a dead install.
  BG_LOCK="$(git rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo .husky-bootstrap.lock)"
  trap 'rm -f "$BG_LOCK"' EXIT
  echo "husky-bootstrap[bg]: install started $(date) in '$PWD'"
  # `--frozen-lockfile` first: a bootstrap must never SILENTLY rewrite the
  # tracked pnpm-lock.yaml. A plain install would, when package.json and
  # the lockfile are momentarily out of sync (mid-rebase, hand-edited
  # package.json), overwrite the lockfile as a side effect. Frozen installs
  # strictly from the committed lockfile and FAIL on drift; on that
  # (legitimate) failure we fall back to a plain install with a loud notice.
  if ! pnpm install --frozen-lockfile; then
    echo "husky-bootstrap[bg]: 'pnpm install --frozen-lockfile' failed (package.json and pnpm-lock.yaml may be out of sync). Falling back to a plain 'pnpm install', which MAY UPDATE pnpm-lock.yaml — review 'git status' afterward."
    if ! pnpm install; then
      echo "husky-bootstrap[bg]: fallback 'pnpm install' also failed; hooks may not fire here. See the error above."
      exit 0
    fi
  fi
  # Post-condition: husky's CLI exits 0 even on a silent no-op, so verify
  # the wrapper actually materialized.
  if [ ! -f .husky/_/pre-commit ]; then
    echo "husky-bootstrap[bg]: 'pnpm install' exited 0 but .husky/_/pre-commit is still missing. Husky's installer probably silently no-op'd; hooks won't fire here until manually bootstrapped."
    exit 0
  fi
  echo "husky-bootstrap[bg]: install finished $(date); .husky/_/pre-commit materialized."
  exit 0
fi
# --- end background-install entry point --------------------------------

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
#    pre-commit/pre-push don't fire. Fix: run `pnpm install`, whose
#    `prepare` lifecycle materializes `.husky/_/`. This also covers the
#    fresh-worktree case where node_modules itself is absent — the same
#    command provisions deps and the wrapper in one shot.
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
#   2. An unconsumed stdin payload is inherited by the `pnpm install`
#      child (and the `prepare.mjs`/`execSync` descendants it spawns), a
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
# considers it a worktree. Running `pnpm install` here would no-op
# silently; skip with a loud notice instead.
if [ ! -e .git ]; then
  echo "husky-bootstrap: target ('$PWD') has no .git file/dir — likely a ghost worktree left behind after 'git worktree remove'. Skipping husky bootstrap; remove the empty directory or restore the worktree." >&2
  exit 0
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "husky-bootstrap: pnpm not on PATH; cannot provision this checkout. Hooks won't fire here until bootstrapped manually (run 'pnpm install'). If pnpm isn't installed, 'corepack enable' makes it available." >&2
  exit 0
fi

# Provision this environment via `pnpm install` IN THE BACKGROUND. On a
# fresh worktree a cold `pnpm install` is ~40s (Windows hard-link cost),
# and a SessionStart hook blocks the session's input prompt for its whole
# duration (Claude Code ignores `async` for SessionStart — it waits on the
# hook script's direct exit). Making the user wait 40s before they can
# type is the friction we're removing here: we DETACH the install so the
# script returns in ~0.5s, the session is usable immediately, and the
# commit gate (fallow-gate.sh) waits for the wrapper before any commit.
#
# `prepare` (invoked by `pnpm install`) runs scripts/prepare.mjs → husky,
# which materializes `.husky/_/`; that's the post-condition we care about.
#
# Lock + log live in the PER-WORKTREE git dir via `git rev-parse
# --git-path` (resolves to .git/worktrees/<name>/ for a linked worktree,
# .git/ for the main repo). Git never tracks its own dir, so these need no
# .gitignore entry and can't be committed, and they're naturally isolated
# per worktree — one worktree's install never races another's lock.
LOCK="$(git rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo .husky-bootstrap.lock)"
LOG="$(git rev-parse --git-path husky-bootstrap.log 2>/dev/null || echo .husky-bootstrap.log)"

# Stale-lock cleanup: a detached install whose session was killed before
# it finished (Claude Code does NOT reap hook-spawned background children
# on exit) leaves a lock with a dead PID. If the recorded PID is no longer
# alive, drop the lock so this session can start a fresh install. `kill
# -0` probes liveness without signaling.
if [ -f "$LOCK" ]; then
  OLD_PID="$(cat "$LOCK" 2>/dev/null || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "husky-bootstrap: a background install (pid $OLD_PID) is already running for '$PWD'; not starting another." >&2
    exit 0
  fi
  rm -f "$LOCK"
fi

# Detach by re-exec'ing THIS script in `--bg-install` mode. `bash "$0"
# --bg-install "$PWD" & disown` launches a fresh process running the
# provisioning entry point at the top of this file, backgrounds it, and
# disowns it from the job table so it survives this hook script returning.
# Verified on git-bash/Windows: the child reparents to init and runs to
# completion after the parent exits (no setsid needed, no `export -f`).
# The child writes its own output to "$LOG" and removes "$LOCK" via its
# EXIT trap, success or failure, so the commit gate never waits on a dead
# install. Record the child PID in the lock so the gate and the
# stale-lock check above can find it.
bash "$0" --bg-install "$PWD" >"$LOG" 2>&1 &
CHILD_PID=$!
disown 2>/dev/null || true
echo "$CHILD_PID" >"$LOCK"
echo "husky-bootstrap: provisioning '$PWD' in the background (pid $CHILD_PID, log: $LOG). The session is usable now; a commit/push will wait for git hooks to finish installing." >&2
exit 0
