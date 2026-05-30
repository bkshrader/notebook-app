#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: runs `prettier --write` on the file just edited, but only
# if Prettier is configured to handle it (supported parser + not ignored).
# Fails open with a stderr notice on any error so editing is never blocked.

if ! command -v jq >/dev/null 2>&1; then
  echo "prettier-format: jq not on PATH, skipping." >&2
  exit 0
fi

INPUT="$(cat)"
FILE="$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  exit 0
fi

# Scope check: only format files that live inside $CLAUDE_PROJECT_DIR.
# Without this the hook would happily reformat absolute-path writes outside
# the repo (e.g. ~/.claude/projects/.../memory/*.md), where Prettier falls
# back to its defaults because no project-local config is in scope.
if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
  echo "prettier-format: CLAUDE_PROJECT_DIR not set, skipping." >&2
  exit 0
fi

# Path-form normalization. On Windows + Git-Bash, the two inputs arrive
# in different forms: $FILE comes from Claude tool input as a Windows
# path (`E:\Bradley\...` or `E:/Bradley/...`), while $CLAUDE_PROJECT_DIR
# is typically set from a shell context to a POSIX path (`/e/Bradley/...`).
# `realpath` preserves whichever form it's given, so the two strings
# never share a prefix even though they point to the same directory.
# The fix is to coerce both to the same form before comparing.
#
# `cygpath -u` is the canonical way to convert Windows → POSIX in
# Git-Bash and Cygwin. On non-Windows systems cygpath isn't present;
# the paths there are already POSIX and need no conversion.
to_posix() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -u -- "$1" 2>/dev/null || echo "$1"
  else
    echo "$1"
  fi
}

# Resolve both sides to absolute paths so the prefix check is robust to
# symlinks, worktrees, and mixed forward/backslash separators on Windows.
# `realpath` is available in Git-Bash; fall back to the raw paths if not.
if command -v realpath >/dev/null 2>&1; then
  ABS_FILE="$(realpath -m -- "$(to_posix "$FILE")" 2>/dev/null || to_posix "$FILE")"
  ABS_PROJECT="$(realpath -m -- "$(to_posix "$CLAUDE_PROJECT_DIR")" 2>/dev/null || to_posix "$CLAUDE_PROJECT_DIR")"
else
  ABS_FILE="$(to_posix "$FILE")"
  ABS_PROJECT="$(to_posix "$CLAUDE_PROJECT_DIR")"
fi
case "$ABS_FILE" in
  "$ABS_PROJECT"/*) ;;
  *)
    # Out of scope — do nothing.
    exit 0
    ;;
esac

# Prefer the project-local prettier binary directly — under pnpm's strict
# layout it's symlinked into node_modules/.bin, and a direct spawn avoids
# the wrapper overhead of `pnpm exec`. Anchor the probe to $ABS_PROJECT
# (the file's own project root), NOT the hook's ambient CWD: this hook
# never cd's, and CWD can be a sibling worktree or an unrelated directory
# whose node_modules holds a different prettier. Fall back to `pnpm exec`
# (resolves via the workspace), then a global `prettier` on PATH.
PROJECT_PRETTIER="$ABS_PROJECT/node_modules/.bin/prettier"

# --- Wait out an in-flight background bootstrap install -----------------
# husky-bootstrap.sh (SessionStart/CwdChanged) provisions a fresh worktree's
# deps in a DETACHED background `pnpm install`, so the session is usable in
# ~0.5s instead of ~40s. The cost: for a brief window after a fresh-worktree
# session opens, the local prettier ($PROJECT_PRETTIER) doesn't exist yet.
# Without this wait, an edit inside that window would fall through to the
# `pnpm exec`/global fallbacks or "not found" and SILENTLY skip formatting on
# a worktree that is actually provisioning fine — the invisible-skip failure
# mode this project treats as the worst kind (see hook-environments.md).
#
# So: if the local prettier is missing, wait for this checkout's husky wrapper
# (.husky/_/pre-commit — the bootstrap's documented post-condition,
# materialized by the SAME `pnpm install` that installs node_modules) up to
# HUSKY_GATE_WAIT_SECS (default 120s; set 0 to disable). Break early if the
# bootstrap lock disappears (the install exited). This hook never cd's, so
# anchor git at $ABS_PROJECT (the edited file's own project root) — NOT the
# ambient CWD, which can be a sibling worktree. Unlike fallow-gate.sh (a
# commit safety gate that exits 2 on timeout), we only WAIT, then fall through
# to the existing resolution chain below.
BOOT_WAIT_SECS="${HUSKY_GATE_WAIT_SECS-120}"
if [ ! -x "$PROJECT_PRETTIER" ] && [ "$BOOT_WAIT_SECS" != 0 ]; then
  ROOT="$(git -C "$ABS_PROJECT" rev-parse --show-toplevel 2>/dev/null || true)"
  WRAPPER="${ROOT:+$ROOT/}.husky/_/pre-commit"
  if [ ! -f "$WRAPPER" ]; then
    if [ -n "$ROOT" ]; then
      BOOT_LOCK="$(git -C "$ROOT" rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo "$ROOT/.husky-bootstrap.lock")"
    else
      BOOT_LOCK="$(git -C "$ABS_PROJECT" rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo "$ABS_PROJECT/.husky-bootstrap.lock")"
    fi
    echo "prettier-format: prettier not yet installed; waiting up to ${BOOT_WAIT_SECS}s for the background bootstrap install to finish..." >&2
    waited=0
    while [ ! -f "$WRAPPER" ] && [ "$waited" -lt "$BOOT_WAIT_SECS" ]; do
      # Lock gone => the background install has EXITED. Stop waiting and fall
      # through rather than burning the rest of the timeout on a dead install.
      if [ ! -f "$BOOT_LOCK" ]; then
        break
      fi
      sleep 2
      waited=$((waited + 2))
    done
  fi
fi
# --- end bootstrap wait ------------------------------------------------

if [ -x "$PROJECT_PRETTIER" ]; then
  RUNNER=("$PROJECT_PRETTIER")
elif command -v pnpm >/dev/null 2>&1; then
  RUNNER=(pnpm exec prettier)
elif command -v prettier >/dev/null 2>&1; then
  RUNNER=(prettier)
else
  echo "prettier-format: prettier not found, skipping." >&2
  exit 0
fi

# --check exits 0 if file is already formatted, 1 if it needs formatting,
# and 2 if Prettier can't handle it (unsupported parser or ignored).
# We only --write on exit 1 — already-formatted files don't need a rewrite,
# and unsupported/ignored files must not be touched.
set +e
"${RUNNER[@]}" --check "$FILE" >/dev/null 2>&1
CHECK_STATUS=$?
set -e

if [ "$CHECK_STATUS" -eq 1 ]; then
  if ! "${RUNNER[@]}" --write --log-level warn "$FILE" >&2; then
    echo "prettier-format: prettier --write failed on $FILE, skipping." >&2
  fi
fi

exit 0
