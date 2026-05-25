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

if command -v npx >/dev/null 2>&1; then
  RUNNER=(npx --no-install prettier)
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
