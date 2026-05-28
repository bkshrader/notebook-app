// `npm run prepare` entry point.
//
// Adapted from husky's documented "CI server and Docker" pattern
// (https://typicode.github.io/husky/how-to.html#ci-server-and-docker),
// kept under scripts/ rather than .husky/ so all repo automation lives
// in one place.
//
// Why the guard: when only production `dependencies` are installed
// (CI with `npm ci --ignore-scripts`, or a Docker prod build), the
// husky devDependency is absent and a bare `husky` call would throw.
// The guard exits cleanly before importing husky in those
// environments. Note: every CI workflow here already uses
// `npm ci --ignore-scripts`, so `prepare` never actually runs in CI —
// the guard is defensive (covers a stray `npm install` on a box that
// sets CI=true / NODE_ENV=production).
//
// Order: guard FIRST, then husky + playwright together. Both steps are
// thus local-dev only and stay consistent — neither runs in CI/prod.
// Playwright in CI comes from explicit `npx playwright install` steps
// in the workflows, not from here.

import { execSync } from 'node:child_process';

// Skip everything in CI and production installs.
if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0);
}

// Materialize husky's `.husky/_/` wrapper for THIS checkout. Dynamic
// import so the guard above can short-circuit before we touch husky
// (which may be absent in a deps-only install). `husky()` returns an
// empty string on success and a non-empty diagnostic string on a
// silent no-op (e.g. ".git can't be found" when run from a directory
// git doesn't treat as a worktree) — surface that rather than letting
// it pass quietly, since a silent no-op is the exact failure mode that
// leaves commits ungated.
//
// On a no-op we set a non-zero exit code (deferred via `process.exitCode`
// so the Playwright step below still runs) so callers see failure rather
// than a misleading exit 0. The bare `npm install` lifecycle has no
// post-condition check of its own — unlike husky-bootstrap.sh — so a
// silent exit 0 here would let a caller believe hooks were installed
// when they were not.
const husky = (await import('husky')).default;
const result = husky();
if (result) {
  console.warn(`prepare: husky did not install hooks: ${result}`);
  process.exitCode = 1;
} else {
  console.log('prepare: husky hooks installed.');
}

// Ensure the Playwright chromium browser (+ OS deps) is available for
// local Storybook/a11y test runs. Idempotent: a stat-and-skip pass
// once the browser is already cached. `--with-deps` is a no-op on
// Windows/macOS and installs system libs on Linux.
try {
  // `execSync` (shell) rather than `execFileSync` so `npx` resolves to
  // `npx.cmd` on Windows; execFileSync wouldn't find the `.cmd` shim.
  // The command is a hardcoded literal with NO interpolation or user
  // input, so there is no command-injection surface here — the shell
  // is used only for cross-platform executable resolution.
  execSync('npx playwright install --with-deps chromium', {
    stdio: 'inherit',
  });
} catch (err) {
  // Non-fatal: a failed/blocked Playwright install (offline, no sudo on
  // Linux, etc.) must not break `prepare` — husky is the load-bearing
  // part and already ran above. Surface a notice and continue.
  console.warn(
    `prepare: 'npx playwright install --with-deps chromium' failed (${err.code ?? err.message}); local Storybook/a11y tests may need it installed manually.`,
  );
}
