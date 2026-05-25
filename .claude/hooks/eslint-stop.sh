#!/usr/bin/env bash
set -euo pipefail

# Stop hook: runs `eslint .` before letting the agent stop.
# On lint errors, returns decision:"block" with the eslint output as the reason
# so Claude sees the file/line/rule and can fix it.
# Bails out silently if stop_hook_active=true (we already blocked once this turn —
# avoids infinite loops if Claude can't fix the errors).
# Fails open (exit 0) on any infrastructure error so a broken hook never traps the agent.

if ! command -v jq >/dev/null 2>&1; then
  echo "eslint-stop: jq not on PATH, skipping." >&2
  exit 0
fi

INPUT="$(cat)"
ACTIVE="$(jq -r '.stop_hook_active // false' <<<"$INPUT")"
CWD="$(jq -r '.cwd // empty' <<<"$INPUT")"

if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

if [ -z "$CWD" ] || [ ! -d "$CWD" ]; then
  exit 0
fi

cd "$CWD"

if ! command -v npx >/dev/null 2>&1; then
  echo "eslint-stop: npx not on PATH, skipping." >&2
  exit 0
fi

if ! npx --no-install eslint --version >/dev/null 2>&1; then
  echo "eslint-stop: eslint not installed in this project, skipping." >&2
  exit 0
fi

OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

set +e
npx --no-install eslint . >"$OUTPUT_FILE" 2>&1
ESLINT_STATUS=$?
set -e

# eslint exit codes: 0 = clean, 1 = lint problems found, 2 = config/runtime error.
# Only block on 1 — a config error is our fault, not Claude's, so fail open.
if [ "$ESLINT_STATUS" -ne 1 ]; then
  exit 0
fi

# Cap the blocked-reason payload. Past ~64KB it stops being actionable feedback
# and starts being context-window damage; on Windows it also blows past argv limits.
MAX_BYTES=65536
BYTES="$(wc -c <"$OUTPUT_FILE")"
TRUNCATED_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE" "$TRUNCATED_FILE"' EXIT
if [ "$BYTES" -gt "$MAX_BYTES" ]; then
  {
    head -c "$MAX_BYTES" "$OUTPUT_FILE"
    printf '\n\n[truncated: %s of %s bytes shown — fix the errors above, then re-run eslint locally to see the rest]\n' "$MAX_BYTES" "$BYTES"
  } >"$TRUNCATED_FILE"
else
  cp "$OUTPUT_FILE" "$TRUNCATED_FILE"
fi

jq -n --rawfile output "$TRUNCATED_FILE" '{
  decision: "block",
  reason: ("ESLint found errors. Fix them before stopping:\n\n" + $output)
}'
exit 0
