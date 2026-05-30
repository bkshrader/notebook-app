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

# `set -euo pipefail` is active. Guard the stdin read and both jq parses
# with `|| true` so malformed/non-JSON stdin makes jq exit non-zero
# WITHOUT aborting the script — an abort would surface as a Stop-hook
# infra error rather than the documented fail-open (exit 0). On a parse
# failure ACTIVE/CWD fall back to empty, which the checks below already
# treat as "skip cleanly."
INPUT="$(cat 2>/dev/null || true)"
ACTIVE="$(jq -r '.stop_hook_active // false' <<<"$INPUT" 2>/dev/null || true)"
CWD="$(jq -r '.cwd // empty' <<<"$INPUT" 2>/dev/null || true)"

if [ "$ACTIVE" = "true" ]; then
  exit 0
fi

if [ -z "$CWD" ] || [ ! -d "$CWD" ]; then
  exit 0
fi

cd "$CWD"

# --- Wait out an in-flight background bootstrap install -----------------
# husky-bootstrap.sh (SessionStart/CwdChanged) provisions a fresh worktree's
# deps in a DETACHED background `pnpm install`, so the session is usable in
# ~0.5s instead of ~40s. The cost: for a brief window after a fresh-worktree
# session opens, node_modules (and thus eslint) may not exist yet. Without
# this wait, a quick turn that ends inside that window would hit the
# "no local eslint install" block below and false-alarm on a worktree that
# is actually provisioning fine.
#
# So: if this checkout's husky wrapper (.husky/_/pre-commit — the bootstrap's
# documented post-condition, materialized by the SAME `pnpm install` that
# installs node_modules) is missing, poll for it up to HUSKY_GATE_WAIT_SECS
# (default 120s; set 0 to disable). Break early if the bootstrap lock
# disappears (the install exited) rather than burning the whole timeout.
# Unlike fallow-gate.sh — a commit safety gate that exits 2 on timeout — this
# is a quality nudge: we only WAIT, then fall through to the existing
# tool-existence check, which block-once's if eslint is genuinely absent.
#
# Anchor paths to the worktree root via git (matches fallow-gate.sh) so the
# wrapper/lock resolve to THIS worktree, not the ambient CWD or a sibling.
BOOT_WAIT_SECS="${HUSKY_GATE_WAIT_SECS-120}"
ESLINT_BIN_PROBE="./node_modules/eslint/bin/eslint.js"
if [ ! -f "$ESLINT_BIN_PROBE" ] && [ "$BOOT_WAIT_SECS" != 0 ]; then
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  WRAPPER="${ROOT:+$ROOT/}.husky/_/pre-commit"
  if [ ! -f "$WRAPPER" ]; then
    if [ -n "$ROOT" ]; then
      BOOT_LOCK="$(git -C "$ROOT" rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo "$ROOT/.husky-bootstrap.lock")"
    else
      BOOT_LOCK="$(git rev-parse --git-path husky-bootstrap.lock 2>/dev/null || echo .husky-bootstrap.lock)"
    fi
    echo "eslint-stop: eslint not yet installed; waiting up to ${BOOT_WAIT_SECS}s for the background bootstrap install to finish..." >&2
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

# Invoke ESLint via `node ./node_modules/eslint/bin/eslint.js` rather than
# `pnpm exec`. On Windows, a package-manager exec wrapper still pays ~5s of
# overhead per call; spawning node directly avoids that and the existence
# check is a cheap stat instead of a process spawn.
#
# The path is LOCAL to this checkout ($CWD) on purpose. We deliberately do NOT
# walk node_modules upward to a parent repo's install: a worktree without its
# own node_modules would otherwise resolve the main repo's eslint AND its
# `eslint.config.mjs`, whose `.claude/worktrees/` ignore is anchored at the
# main-repo root and therefore matches this entire worktree's path — eslint
# then reports "all files are ignored" (exit 2) and the hook silently fails
# open, linting nothing. Requiring a local install avoids that mis-anchor and
# keeps each environment self-contained.
if ! command -v node >/dev/null 2>&1; then
  echo "eslint-stop: node not on PATH, skipping." >&2
  exit 0
fi

ESLINT_BIN="./node_modules/eslint/bin/eslint.js"
if [ ! -f "$ESLINT_BIN" ]; then
  # No local eslint install — usually a fresh git worktree that was never
  # provisioned. Block (this is a Stop hook, so decision:block feeds the
  # message back to the agent) and tell it to install. The stop_hook_active
  # guard at the top of this file means we block at most once per turn: if
  # the agent can't install, the next stop attempt has stop_hook_active=true
  # and we bail out, so there's no infinite loop.
  jq -n --arg cwd "$CWD" '{
    decision: "block",
    reason: ("eslint-stop: no local eslint install found in this checkout (" + $cwd + "). This is usually a fresh git worktree that was never provisioned. Run `pnpm install` here (it also runs the prepare script and materializes node_modules + .husky/_/), then continue. If you genuinely intend to stop without linting, this is the only block — stopping again will proceed.")
  }'
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
# Hook-specific cache dir avoids colliding with a future `pnpm lint --cache`.
set +e
node "$ESLINT_BIN" \
  --cache --cache-location node_modules/.cache/eslint-stop/ \
  --ignore-pattern '.claude/worktrees/' \
  . >"$OUTPUT_FILE" 2>&1
ESLINT_STATUS=$?
set -e

# eslint exit codes: 0 = clean, 1 = lint problems found, 2 = config/runtime
# error OR "no files matched / all files ignored". Only block on 1 — a config
# error is our fault, not Claude's, so fail open. But surface exit 2 loudly:
# it also covers an empty/all-ignored lint scope, which would otherwise be
# indistinguishable from a clean pass ("no silent skip").
if [ "$ESLINT_STATUS" -eq 2 ]; then
  {
    echo "eslint-stop: eslint exited 2 (config/runtime error, or no files matched / all ignored) in $CWD; failing open. Output:"
    cat "$OUTPUT_FILE"
  } >&2
  exit 0
fi
if [ "$ESLINT_STATUS" -ne 1 ]; then
  exit 0
fi

# Cap the blocked-reason payload. Past ~64KB it stops being actionable feedback
# and starts being context-window damage; on Windows it also blows past argv limits.
#
# `set -e` is active here. Guard the tmp/measurement steps so a transient
# failure (full TMPDIR, unwritable /tmp) after eslint found real errors fails
# OPEN (exit 0) rather than aborting the script non-zero with no JSON — which
# a Stop hook surfaces as an infra error, not the actionable block this file
# promises ("Fails open on any infrastructure error").
MAX_BYTES=65536
BYTES="$(wc -c <"$OUTPUT_FILE" 2>/dev/null || echo 0)"
TRUNCATED_FILE="$(mktemp 2>/dev/null || true)"
if [ -z "$TRUNCATED_FILE" ]; then
  echo "eslint-stop: mktemp failed; cannot format the block reason, failing open." >&2
  exit 0
fi
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
