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

# Invoke ESLint via `node <resolved eslint>` rather than `npx`.
# On Windows, `npx --no-install` still pays ~5s of wrapper overhead per call;
# resolving the bin path with Node's own require resolution and spawning it
# directly avoids that.
#
# `require.resolve('eslint/bin/eslint.js')` walks `node_modules/` upward from
# the current CWD, which is what we need so this hook works from a git
# worktree that has no `./node_modules/` of its own (it'll find the parent
# repo's install). The hardcoded `./node_modules/...` path the previous
# version used would silently skip in that case.
if ! command -v node >/dev/null 2>&1; then
  echo "eslint-stop: node not on PATH, skipping." >&2
  exit 0
fi

# Resolve via `eslint/package.json` rather than `eslint/bin/eslint.js` —
# the latter isn't in eslint's package `exports` map (ERR_PACKAGE_PATH_NOT_EXPORTED).
# `package.json` is always exported; joining its dirname with the bin
# relative path gives the same result as the old hardcoded
# `./node_modules/eslint/bin/eslint.js`, but follows Node's resolution
# upward to a parent repo's install when the CWD lacks its own
# `node_modules/`.
ESLINT_BIN="$(node -e "try{const p=require('path');const pkg=require.resolve('eslint/package.json');process.stdout.write(p.join(p.dirname(pkg),'bin/eslint.js'))}catch(_){}" 2>/dev/null || true)"
if [ -z "$ESLINT_BIN" ] || [ ! -f "$ESLINT_BIN" ]; then
  echo "eslint-stop: eslint not installed in this project (resolved=$ESLINT_BIN), skipping." >&2
  exit 0
fi

OUTPUT_FILE="$(mktemp)"
trap 'rm -f "$OUTPUT_FILE"' EXIT

# Exclude nested worktrees: when this hook runs from the main checkout, `eslint .`
# would otherwise descend into .claude/worktrees/<name>/ and surface lint errors
# from other agents' in-flight work. Each worktree has its own copy of this hook
# that lints its own files (CWD=worktree), so skipping the nested dir here doesn't
# lose coverage. The pattern is harmless inside a worktree (no such dir there).
#
# --cache: the type-aware rules (recommendedTypeChecked) spin up the full TS program,
# which costs ~15s cold. Caching by file mtime + config hash drops repeat fires to ~2s.
# Hook-specific cache dir avoids colliding with a future `npm run lint -- --cache`.
set +e
node "$ESLINT_BIN" \
  --cache --cache-location node_modules/.cache/eslint-stop/ \
  --ignore-pattern '.claude/worktrees/' \
  . >"$OUTPUT_FILE" 2>&1
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
