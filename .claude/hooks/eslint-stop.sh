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

set +e
ESLINT_OUTPUT="$(npx --no-install eslint . 2>&1)"
ESLINT_STATUS=$?
set -e

# eslint exit codes: 0 = clean, 1 = lint problems found, 2 = config/runtime error.
# Only block on 1 — a config error is our fault, not Claude's, so fail open.
if [ "$ESLINT_STATUS" -ne 1 ]; then
  exit 0
fi

REASON="ESLint found errors. Fix them before stopping:

$ESLINT_OUTPUT"

jq -n --arg reason "$REASON" '{decision: "block", reason: $reason}'
exit 0
