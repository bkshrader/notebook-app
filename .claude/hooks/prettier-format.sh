#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: runs `prettier --write` on the file just edited, but only
# if Prettier is configured to handle it (supported parser + not ignored).
# Fails open with a stderr notice on any error so editing is never blocked.
#
# Debug tracing: set PRETTIER_FORMAT_DEBUG=1 in the environment to get a
# stderr breadcrumb at every early-exit point + the prettier exit codes.
# Useful when investigating "why didn't the hook reformat this file" cases,
# especially on worktrees where realpath resolution differs from the main
# checkout. Off by default to keep normal sessions quiet.

debug() {
  if [ "${PRETTIER_FORMAT_DEBUG:-0}" = "1" ]; then
    echo "prettier-format[debug]: $*" >&2
  fi
}

if ! command -v jq >/dev/null 2>&1; then
  echo "prettier-format: jq not on PATH, skipping." >&2
  exit 0
fi

INPUT="$(cat)"
FILE="$(jq -r '.tool_input.file_path // empty' <<<"$INPUT")"

debug "raw FILE=$FILE"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  debug "FILE empty or not a regular file, skipping"
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
  debug "realpath available; ABS_FILE=$ABS_FILE ABS_PROJECT=$ABS_PROJECT"
else
  ABS_FILE="$(to_posix "$FILE")"
  ABS_PROJECT="$(to_posix "$CLAUDE_PROJECT_DIR")"
  debug "realpath unavailable; ABS_FILE=$ABS_FILE ABS_PROJECT=$ABS_PROJECT"
fi
case "$ABS_FILE" in
  "$ABS_PROJECT"/*) debug "scope check passed" ;;
  *)
    # Out of scope — do nothing.
    debug "scope check failed (ABS_FILE not under ABS_PROJECT), skipping"
    exit 0
    ;;
esac

if command -v npx >/dev/null 2>&1; then
  RUNNER=(npx --no-install prettier)
  debug "using npx runner"
elif command -v prettier >/dev/null 2>&1; then
  RUNNER=(prettier)
  debug "using PATH prettier"
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

debug "prettier --check exit=$CHECK_STATUS (0=ok, 1=needs-format, 2=unsupported)"

if [ "$CHECK_STATUS" -eq 1 ]; then
  if ! "${RUNNER[@]}" --write --log-level warn "$FILE" >&2; then
    echo "prettier-format: prettier --write failed on $FILE, skipping." >&2
  else
    debug "prettier --write completed"
  fi
fi

exit 0
