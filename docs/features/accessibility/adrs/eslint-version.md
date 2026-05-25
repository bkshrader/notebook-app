# Pin ESLint to v9 until `eslint-plugin-jsx-a11y` supports v10

- Status: accepted
- Date: 2026-05-25
- Deciders: Bradley Shrader
- Tags: accessibility, tooling, linting, dependencies

## Context and Problem Statement

`notebook-app` is accessibility-first ([see accessibility OVERVIEW](../OVERVIEW.md)). For the React UI surface this means `eslint-plugin-jsx-a11y` is a **required** static-analysis layer — it catches `alt` omissions, ARIA misuse, label-less inputs, and similar issues at PR time, well before any rendered-DOM check (axe-core, Lighthouse) can run.

The project was initially scaffolded with ESLint v10. However, as of 2026-05-25, the latest published `eslint-plugin-jsx-a11y` (6.10.2) declares its peer range as `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9` — it does not yet list ESLint v10 as supported. `npm ci` fails on the peer-dep mismatch.

How should we resolve the conflict between our ESLint version and a plugin we consider non-negotiable for accessibility?

## Decision Drivers

- The accessibility-first charter makes `eslint-plugin-jsx-a11y` non-negotiable for any `.tsx`/`.jsx` code.
- `npm ci` must succeed cleanly without `--legacy-peer-deps`, so CI signal stays trustworthy.
- We prefer to track upstream version ranges honestly rather than silently override them.
- ESLint v10 brings mostly performance improvements and config refinements; nothing we depend on today.
- The project is pre-implementation — there is no production cost to changing ESLint major versions now.

## Considered Options

1. **Downgrade ESLint to v9.** Match the plugin's declared peer range.
2. **Stay on ESLint v10 and install jsx-a11y with `--legacy-peer-deps`.** Accept the unsupported configuration; rely on the plugin "probably working" in practice.
3. **Stay on ESLint v10 and skip jsx-a11y for now.** Wait for upstream support before adding it.
4. **Fork or patch jsx-a11y to bump its peer range.** Self-maintain until upstream catches up.

## Decision Outcome

Chosen option: **Option 1 — downgrade ESLint to v9** (currently `^9.39.4`).

This is the conservative choice. It satisfies declared peer ranges, lets `npm ci` succeed cleanly, and preserves trust in our dependency signal — when something declares incompatibility, we believe it. The cost is giving up ESLint v10's incremental improvements, which we do not yet depend on.

We plan to bump back to ESLint v10 as soon as [jsx-eslint/eslint-plugin-jsx-a11y#1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075) closes or jsx-a11y otherwise ships a release declaring ESLint v10 peer support. This is tracked in the [`eslint-v10-block`](../../../../) project memory with a weekly recheck cadence.

### Positive Consequences

- `npm ci` works cleanly.
- We keep `eslint-plugin-jsx-a11y` — the accessibility charter's static-analysis layer is intact.
- Our dependency graph honestly reflects upstream-declared support, so future Dependabot or audit signals remain meaningful.

### Negative Consequences

- We forgo ESLint v10's improvements (mostly performance and config ergonomics) until the upstream plugin catches up.
- Carries a small ongoing maintenance burden: someone must remember to re-check the upstream issue and bump when it resolves.

## Pros and Cons of the Options

### Option 1 — Downgrade ESLint to v9

- **Good**, because it matches declared peer ranges, so `npm ci` succeeds without overrides.
- **Good**, because it keeps `eslint-plugin-jsx-a11y` available, satisfying the accessibility-first charter.
- **Good**, because reverting to v10 later is mechanical — a `package.json` bump and a lockfile refresh.
- **Bad**, because we miss out on ESLint v10 improvements (perf, config refinements) until upstream catches up.

### Option 2 — ESLint v10 + `--legacy-peer-deps`

- **Good**, because it keeps us on the latest ESLint and on jsx-a11y simultaneously.
- **Good**, because in practice the plugin almost certainly works — its rule code does not exercise v10-specific API removals as far as we can tell.
- **Bad**, because it requires `--legacy-peer-deps` in every install path (local, CI, Dependabot), which is easy to forget and corrodes the value of peer-range declarations elsewhere in the graph.
- **Bad**, because if a v10-specific API breakage _did_ slip through, we would discover it via mysterious runtime errors instead of a clean install failure.

### Option 3 — ESLint v10, no jsx-a11y

- **Good**, because it keeps the latest ESLint without any overrides.
- **Bad**, because it removes a non-negotiable accessibility layer to win a tooling version bump. This directly violates the project charter.

### Option 4 — Fork or patch jsx-a11y

- **Good**, because it lets us stay on v10 and on jsx-a11y without overrides.
- **Bad**, because it shifts the maintenance burden onto us. A pre-implementation solo project has no budget for self-maintained linter forks.
- **Bad**, because divergence from upstream tends to compound: once forked, re-merging upstream changes becomes painful.

## Follow-up

- Track [jsx-eslint/eslint-plugin-jsx-a11y#1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075) on a weekly cadence.
- When it closes (or the plugin ships any release with `eslint: ... || ^10` in its peer range), bump `eslint` and `@eslint/js` back to `^10` in [package.json](../../../../package.json), refresh the lockfile, delete the `eslint-v10-block` memory, and mark this ADR `superseded`.

## Links

- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Upstream issue: [jsx-eslint/eslint-plugin-jsx-a11y#1075](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/issues/1075)
- MADR template: <https://adr.github.io/madr/>
