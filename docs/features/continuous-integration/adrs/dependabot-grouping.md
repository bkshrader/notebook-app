# Dependabot grouping strategy: named pattern groups, no catch-all

- Status: accepted
- Date: 2026-05-28
- Deciders: Bradley Shrader
- Tags: ci, dependencies, dependabot

## Context and Problem Statement

Dependabot opens PRs for npm and github-actions ecosystem updates weekly ([CI overview](../OVERVIEW.md)). Without grouping, each outdated dependency gets its own PR; for a project with N>100 transitive devDeps this is a triage-cost problem. With grouping, related packages that need to upgrade together (peer-dep-coupled ecosystems like vite + vitest + @vitejs/\*) move as one PR, but the grouping rules themselves become non-obvious.

The original config (committed in `a32b919` as part of the initial CI scaffold) used two structural groups defined by `dependency-type`:

```yaml
dev-dependencies:
  dependency-type: development
  update-types: [minor, patch]
prod-dependencies:
  dependency-type: production
  update-types: [minor, patch]
```

…alongside six named pattern groups (`vite-ecosystem`, `storybook`, `eslint`, `playwright`, `electron`, `react`). The dependency-type split was never documented. By the 2026-05-26 weekly run it had produced two visible problems:

1. **The dependency-type groups were silently raiding the named pattern groups.** Dependabot ranks group membership by specificity ([`PatternSpecificityCalculator`](https://github.com/dependabot/dependabot-core/blob/main/updater/lib/dependabot/updater/pattern_specificity_calculator.rb) in dependabot-core: exact = 1000, no-wildcard = 500, wildcard ≈ 96, universal `*` = 1), and treats `dependency-type`-based groups as more specific than wildcard pattern groups. The updater log line `Skipping @eslint/js for group 'eslint' - belongs to more specific group 'dev-dependencies'` was the smoking gun: `@eslint/js` (a major bump 9→10) was getting pulled out of the `eslint` group into `dev-dependencies`, then failing `dev-dependencies`'s `update-types: [minor, patch]` filter, and ending up as an individual PR (#61) disconnected from the `eslint` group PR (#56) it should have belonged with.

2. **The dev/prod split had no current consumer.** `prod-dependencies` was a near-empty bucket (three CodeMirror packages) and nothing in CI, the workflow files, or the docs keyed off the dev-vs-prod distinction. The original intent was almost certainly to enable per-bucket auto-merge later — `dev-dependencies` auto-merge if all 7 CI gates pass; `prod-dependencies` require human review — but that was never built.

What's the right grouping shape for one-maintainer triage cost, given that auto-merge isn't actually being used?

## Decision Drivers

- **Triage cost.** Maintainer is one person; PR review is the bottleneck. Group PRs that are reviewable as a unit (an ecosystem upgrade) and individualize PRs that aren't (an isolated transitive bump).
- **Specificity correctness.** Grouping rules must not silently shuffle packages out of the ecosystem groups they semantically belong in. The `@eslint/js`-into-`dev-dependencies` bug was a real failure mode that produced a misleading PR set.
- **Honest signal in the PR queue.** When PR #56 says "Bump eslint group", it should actually contain every package in the eslint group. Quiet specificity-shuffling violates that.
- **Major-version blast radius.** A `[minor, patch]` filter on a catch-all catches the routine churn but lets major bumps go through individual PRs where they get individual review. Named ecosystem groups can safely take majors because peer-coupling makes the major a coordinated upgrade anyway.
- **No premature auto-merge infrastructure.** The dev/prod split was speculative infrastructure for a feature that wasn't built. Removing it costs nothing today and we can re-add a more correct split if we ever actually wire auto-merge.

## Considered Options

1. **Status quo — keep the `dev-dependencies` / `prod-dependencies` split, fix the specificity bug with `patterns: ['*']` + a duplicated `exclude-patterns` list.** Preserve the dev/prod buckets, but flip them to pattern-based so they stop outranking named groups.
2. **Collapse dev/prod into a single `other-dependencies: patterns: ['*']` catch-all (minor/patch).** One weekly rollup PR for everything not in a named group. Specificity handles routing automatically; no `exclude-patterns` needed.
3. **Drop the catch-all entirely.** Keep only the six named pattern groups. Anything ungrouped gets its own individual PR — the pre-grouping Dependabot default.

## Decision Outcome

Chosen option: **Option 3 — drop the catch-all entirely**, implemented in [`.github/dependabot.yml`](../../../../.github/dependabot.yml).

The six named ecosystem groups (`vite-ecosystem`, `storybook`, `eslint`, `playwright`, `electron`, `react`) keep their existing patterns and `[major, minor, patch]` coverage. Everything else — `lint-staged`, `prettier`, `husky`, `license-checker`, the three CodeMirror prod deps, etc. — gets one PR per package per week, with cooldown applied. The `eslint-plugin-storybook` exclude on the `eslint` group is preserved as load-bearing (it matches both the `storybook` exact pattern and the `eslint-plugin-*` wildcard; the explicit exclude disambiguates).

### Positive Consequences

- **Specificity bug fixed.** No more `dependency-type` group outranking named pattern groups. `@eslint/js` lands in `eslint`, `@playwright/test` lands in `playwright`, `@storybook/*` lands in `storybook`, `@vitest/*` lands in `vite-ecosystem` — all where they belong.
- **PR queue tells the truth.** A named-group PR contains exactly the packages the group name implies. No hidden specificity shuffling.
- **Each ungrouped-package PR is individually reviewable.** Small, focused diffs; the seven CI gates run against each in isolation; if `husky` breaks the world it doesn't tank a 12-package rollup.
- **Less config to maintain.** No catch-all means no duplicated `exclude-patterns` list to keep in sync as named-group patterns evolve. Adding a pattern to the `eslint` group is a one-line edit.

### Negative Consequences

- **PR queue noise.** Without a catch-all, weeks with multiple ungrouped bumps produce multiple PRs instead of one rollup. With the current dependency set this is roughly 5–10 ungrouped packages, so weeks with several outdated ones could mean a half-dozen PRs in addition to the named-group PRs. Manageable for one maintainer at current scale; could become annoying as the dep tree grows.
- **No auto-merge path under this shape.** Auto-merge realistically requires "a group of related changes that succeed or fail together as a unit" — a per-PR auto-merge on every individual ungrouped bump multiplies CI cost without reducing review burden much (you still scan every PR). If we ever decide auto-merge is worth wiring, we'll need to revisit grouping (likely by adding back a catch-all of some shape — possibly the dev/prod split, possibly a single bucket) so the auto-merge rule has something coherent to act on. **Re-evaluate this ADR before adding auto-merge.**
- **Catch-all rollback isn't free.** If PR-queue noise becomes a real problem, adding `other-dependencies: patterns: ['*']` back is a small config change — but it implicitly changes review semantics (rollup PRs hide individual-package signal). Worth weighing rather than reflexive.

## Pros and Cons of the Options

### Option 1 — Keep dev/prod split, fix specificity with `patterns: ['*']` + `exclude-patterns`

- **Good**, because it preserves the structural slot for a future auto-merge rule that distinguishes dev from prod risk.
- **Bad**, because the dev/prod split has no current consumer; speculative infrastructure that costs ongoing maintenance now for hypothetical future value.
- **Bad**, because `exclude-patterns` on each catch-all has to duplicate every named-group pattern, and the duplication has to stay in sync — a real drift hazard documented in two places.
- **Bad**, because per the [specificity research](https://github.com/dependabot/dependabot-core/blob/main/updater/lib/dependabot/updater/pattern_specificity_calculator.rb), the `exclude-patterns` is actually redundant once the catch-all is pattern-based — named groups (`@eslint/*` ≈ 96) already outrank `*` (1). So the duplicated excludes are belt-and-suspenders for a problem specificity already solves.

### Option 2 — Single `other-dependencies` catch-all

- **Good**, because one weekly rollup PR for miscellaneous bumps reduces queue noise vs. individual PRs.
- **Good**, because specificity handles routing automatically — no `exclude-patterns` needed.
- **Good**, because it leaves the door open for a future single-bucket auto-merge rule ("auto-merge the catch-all if all gates pass").
- **Bad**, because rollup PRs hide individual-package signal. If `husky@9` breaks something, the diagnostic friction is higher than if `husky@9` had its own PR.
- **Bad**, because one bad bump can poison the rollup, requiring `@dependabot recreate` after exclusions or manual surgery.

### Option 3 — No catch-all (chosen)

- **Good**, because it's the simplest config that produces an honest PR queue.
- **Good**, because each ungrouped-package PR is independently reviewable, individually CI-gated, and individually revertable.
- **Good**, because removing the speculative dev/prod infrastructure matches the project's "build it when you need it" posture — and the explicit re-evaluation note in the follow-up section means we won't accidentally hit auto-merge with the wrong grouping shape.
- **Bad**, because PR queue noise scales linearly with ungrouped-package count. Acceptable now (~5–10 ungrouped packages); revisit if the dep tree grows substantially.
- **Bad**, because auto-merge isn't a real option under this shape without first revisiting grouping. (See Negative Consequences above.)

## Implementation conventions worth being explicit about

- **The `eslint-plugin-storybook` exclude on the `eslint` group is load-bearing.** `eslint-plugin-storybook` matches both `storybook` (exact pattern, score 1000) and `eslint-plugin-*` (wildcard, ~104). Without the exclude, specificity routes it to `storybook` anyway (1000 > 104), but the exclude makes the intent explicit and survives any future refactor of the `eslint` patterns.
- **`@types/node` major-version ignore is preserved.** The runtime is pinned to Node 24 LTS; majors are tracked manually when the Node LTS line moves.
- **Both ecosystems (npm and github-actions) keep the 7-day cooldown.** Cooldown was added in [`d98ab6d`](https://github.com/bkshrader/notebook-app/commit/d98ab6d) and is orthogonal to grouping; this ADR doesn't touch it.
- **Inline comment at top of `groups:`** explains the specificity ranking, the no-catch-all design choice, and the `eslint-plugin-storybook` disambiguation — so the next person reading the config doesn't have to come find this ADR.

## Follow-up

- **Re-evaluate this ADR before enabling auto-merge.** Auto-merge needs a coherent "group of changes that succeed or fail together" to act on, which the no-catch-all shape doesn't provide for ungrouped packages. The right move at that point is probably to add a single catch-all (Option 2) or revisit the dev/prod split (Option 1) depending on the auto-merge policy. Don't bolt auto-merge onto the current shape and discover the gap later.
- **Watch ungrouped-PR volume.** If weekly ungrouped-package PR count routinely exceeds ~5, revisit Option 2 (single catch-all). The decision threshold is "queue noise is now eating more triage time than rollup-diagnostic friction would".
- **If a new ecosystem joins** (e.g. a Python sidecar acquires a `pip` package-ecosystem block for the whisper/supertonic sidecars), it gets its own `groups:` block following the same shape — named pattern groups for coupled packages, no catch-all unless we hit the volume threshold above.

## Links

- [CI threat model](ci-threat-model.md) — fork-PR threat model that constrains every Dependabot-touching workflow.
- [Claude dependency review](claude-dependency-review.md) — advisory LLM review that fires on Dependabot PRs (whatever shape the grouping takes).
- [Continuous integration OVERVIEW](../OVERVIEW.md)
- [dependabot-core: `pattern_specificity_calculator.rb`](https://github.com/dependabot/dependabot-core/blob/main/updater/lib/dependabot/updater/pattern_specificity_calculator.rb) — authoritative source for the specificity scoring used above.
- [GitHub Docs: dependabot.yml configuration options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- MADR template: <https://adr.github.io/madr/>
