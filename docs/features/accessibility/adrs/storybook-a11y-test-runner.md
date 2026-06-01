# Enforce per-story WCAG axe via `@storybook/addon-vitest`, not `@storybook/test-runner`

- Status: accepted
- Date: 2026-06-01
- Deciders: Bradley Shrader
- Tags: accessibility, testing, tooling, storybook, ci

## Context and Problem Statement

`notebook-app` is accessibility-first ([see accessibility OVERVIEW](../OVERVIEW.md)), with WCAG 2.1 AA as a non-negotiable floor. The [react-and-storybook ADR](./react-and-storybook.md) decided that every Storybook story becomes an axe-core test (`a11y.test: 'error'` in [`.storybook/preview.tsx`](../../../../.storybook/preview.tsx)), giving per-component WCAG coverage from the first component onward. That enforcement is **already live**: the `storybook` job in [`ci.yml`](../../../../.github/workflows/ci.yml) runs `pnpm test-storybook` on every PR to `main`, and any AA violation in any story fails the build.

The mechanism it runs on is **`@storybook/addon-vitest`** — the `test-storybook` script is `vitest --project=storybook --run`, which executes each story as a Vitest browser-mode test in Playwright-driven Chromium (see [`vitest.config.ts`](../../../../vitest.config.ts)). But the react-and-storybook ADR **never compared this to the alternative**, `@storybook/test-runner` — the standalone Jest+Playwright CLI that most of the strongest design systems in the [Storybook showcase survey](../../../research/storybook-testing.md) use for their a11y gates (Grafana, Kaizen, GitLab UI, Ring UI). `addon-vitest` was inherited from `storybook init`'s default scaffold, not chosen on the merits.

This ADR closes that gap: it records **why per-story a11y enforcement runs on `addon-vitest` rather than `@storybook/test-runner`**, weighs the test-runner honestly (it has real advantages this project may eventually need), and names the specific, evidence-backed triggers under which we would add the test-runner _alongside_ the Vitest addon.

A near-term forcing function makes this worth settling now: **multi-theme support is in active development in a separate worktree.** WCAG 2.1 AA contrast must hold under light, dark, and high-contrast modes ([OVERVIEW](../OVERVIEW.md)), so "run every story's axe check under every theme" is about to become a real requirement. The obvious question — _does multi-theme a11y force a switch to the test-runner?_ — needs a documented answer before the theme work lands.

## Decision Drivers

- WCAG 2.1 AA is non-negotiable; the a11y gate must be reliable and developer-runnable, not just CI-only.
- The enforcement decision (`a11y.test: 'error'`) is already made and wired — this ADR is about the **engine**, not whether to enforce.
- Multi-theme (light/dark/high-contrast) axe coverage is imminent; the chosen engine must support per-theme runs without a rebuild.
- Inner-loop speed matters: an a11y gate developers actually run before pushing catches more than a CI-only gate.
- Less load-bearing glue code is better on the accessibility gate specifically — it is the charter's most important automated check.
- The project is Vite-based (electron-vite renderer); builder compatibility is not a constraint either way.
- Reversibility: the two engines are not mutually exclusive, so a future addition is low-cost if triggered.

## Considered Options

1. **`@storybook/addon-vitest`** (current) — stories as Vitest browser-mode tests; native `a11y.test: 'error'`; no Storybook server; shares the Vite pipeline.
2. **`@storybook/test-runner`** — Jest+Playwright CLI against a built/served Storybook; axe via a `postVisit` hook or the addon-a11y integration; the showcase-majority tool.
3. **The hybrid** — run **both**: `addon-vitest` for the fast per-component a11y/interaction signal, and `test-runner` for a broader CI sweep (multi-view/docs scanning or image-snapshot VRT).

## Decision Outcome

Chosen option: **Option 1 — keep `@storybook/addon-vitest` as the per-story a11y enforcement engine** — with Option 3 (adding the test-runner _alongside_) recorded as the named escape hatch under specific triggers below.

The decisive factors for _this_ project are **feedback speed and zero axe glue**. `addon-vitest` runs through Vitest in-IDE with no `build-storybook` step, so the WCAG gate lives in the inner dev loop, not only in CI — and an a11y gate developers actually run locally catches violations the CI-only alternative would surface a round-trip later. Axe enforcement is **native**: `a11y.test: 'error'` already works in `preview.tsx` with no hand-maintained `.storybook/test-runner.ts` to get wrong on the project's most important automated check. It reuses Vite (already the build tool) and `@vitest/coverage-v8` (already a devDep). And it is **Storybook's officially recommended default** — the docs call the Vitest addon the "spiritual successor" to the test-runner and direct you to keep the test-runner only for capabilities the addon lacks (non-Vite builders, unsupported renderers, served-Storybook crawling, docs-page rendering, image-snapshot VRT).[^sb-migration]

Crucially, **the imminent multi-theme work does not force a switch.** The strongest real-world multi-theme axe setup — Grafana's `@grafana/ui` — does _not_ depend on the test-runner's internals for theming: it iterates themes at the **CI-matrix level** (`STORYBOOK_THEME: [light, dark]` → `initialGlobals.theme` in `preview.ts` → re-run the suite per theme).[^grafana] That mechanism — a CI matrix feeding a Storybook global — works identically with `addon-vitest`: a `theme: [...]` job matrix injecting the theme via env→global re-runs `vitest --project=storybook` per theme. Per-theme a11y is a _CI-orchestration_ concern, not an _engine_ concern. This is recorded here so the in-flight theme worktree is not mis-scoped into "we need the test-runner now" — it does not. (Theme scaffolding is deliberately left to that worktree; this ADR does not add it.)

The test-runner's genuine, narrow advantage is what `addon-vitest` _cannot_ do: scan **`viewMode=docs` composed MDX docs pages** (Adobe Spectrum uses the test-runner for exactly this), and drive **image-snapshot visual regression** against a served Storybook (Acronis uses it for exactly this). Those are real "the addon can't do X" capabilities — but neither is needed today: there is no MDX docs surface, and visual-regression testing is itself deliberately deferred (it adds little value during active prototyping; revisited at baseline stability, with **local Playwright VRT as the default first tool** — see the deferred-VRT triggers in [storybook-testing.md §5](../../../research/storybook-testing.md#5-recommendation-for-notebook-app)). So these become **triggers**, not present needs — and note that if self-hosted (local Playwright) VRT is adopted at trigger A, that alone does _not_ require the test-runner; the test-runner becomes warranted only for the served-Storybook image-snapshot or docs-page variants the Vitest addon cannot drive.

### Triggers to add `@storybook/test-runner` alongside (the hybrid)

Adopt the hybrid — keep `addon-vitest` for the inner loop, add the test-runner for the sweep — only when one of these becomes true:

- **Composed docs-page a11y.** Published MDX docs pages become a user-facing surface that must pass axe as a _composed page_ (not just per-story). `addon-vitest` scans isolated stories; only the test-runner can visit `?viewMode=docs`.[^spectrum]
- **Self-hosted image-snapshot VRT.** We decide to run pixel-diff visual regression in-repo (rather than a SaaS), which the test-runner's `postVisit` + `jest-image-snapshot` supports and `addon-vitest` does not.[^acronis]
- **A builder/renderer change** that takes us off Vite (not foreseen — electron-vite is settled).

When triggered, the hybrid is a _proven_ architecture (Acronis and Adobe both ship both engines, each doing a distinct job) — but an **unofficial** one: Storybook positions the addon as a replacement, so adopting the hybrid is a deliberate "we need a capability the addon lacks" decision, recorded as such, not a default to drift into.

### Positive Consequences

- The a11y WCAG gate stays in the inner dev loop (in-IDE Vitest), not just CI — fastest possible feedback on the charter's most important check.
- Zero hand-maintained axe glue: `a11y.test: 'error'` is native, so there is no `test-runner.ts` to break.
- We stay on Storybook's officially supported default path, so ecosystem investment accrues to us.
- The imminent multi-theme work proceeds on the current engine via a CI theme-matrix — no engine migration blocks it.
- The decision is reversible and additive: the test-runner can join later for docs/VRT without removing anything.

### Negative Consequences

- `addon-vitest` tests stories as **source modules**, not as the built Storybook artifact — a build-only regression could pass the gate (the test-runner, which crawls a served build, would catch it). Mitigated: the `storybook` CI job runs `build-storybook` first, so a broken build still fails the job before tests run.
- It is the **newer** engine; the `vitest@4` / `@vitest/browser-playwright` peers are bleeding-edge (the react-and-storybook ADR already flagged this as a recheck risk). A regression here would block the a11y gate.
- Composed-docs-page and image-snapshot VRT a11y are **out of reach** until/unless we add the test-runner — we are accepting a coverage ceiling on those two surfaces in exchange for the simpler default.
- Multi-theme a11y still requires CI-matrix wiring (deferred to the theme worktree); it is "supported" but not yet "done."

## Pros and Cons of the Options

### Option 1 — `@storybook/addon-vitest` (chosen)

- **Good**, because axe enforcement is native (`a11y.test: 'error'`) with no custom runner config to maintain on the most important automated gate.
- **Good**, because it runs in-IDE via Vitest with no `build-storybook` step — the a11y gate is in the inner loop, not CI-only.
- **Good**, because it is Storybook's officially recommended default for Vite projects (the "spiritual successor" to the test-runner).[^sb-migration]
- **Good**, because it reuses Vite and `@vitest/coverage-v8`, both already present.
- **Good**, because multi-theme a11y is achievable via a CI theme-matrix feeding a Storybook global (the Grafana mechanism), so the imminent theme work is unblocked.[^grafana]
- **Bad**, because it tests source modules, not the built artifact (build-only regressions can slip; mitigated by build-then-test ordering in CI).
- **Bad**, because it cannot scan composed `viewMode=docs` pages or drive image-snapshot VRT.
- **Bad**, because the `vitest@4` peer is bleeding-edge.

### Option 2 — `@storybook/test-runner`

- **Good**, because it tests the **actual built/served Storybook** — closest to the published artifact.
- **Good**, because it can scan composed `viewMode=docs` pages and drive image-snapshot VRT.
- **Good**, because it is what most showcase a11y leaders ship today (Grafana, Kaizen, GitLab UI, Ring UI) — battle-tested.
- **Bad**, because axe is **not** native — it needs a hand-maintained `postVisit` hook or the addon-a11y integration, i.e. more glue on the load-bearing gate.
- **Bad**, because it requires Storybook to be built or served first — slower, no in-IDE loop.
- **Bad**, because Storybook officially treats it as a fallback for capabilities the Vitest addon lacks, not the default — choosing it as the _primary_ engine swims against the docs.[^sb-migration]
- **Bad**, because it does **not** uniquely solve the imminent multi-theme need (Grafana achieves that at the CI-matrix level, which the Vitest addon also supports).

### Option 3 — The hybrid (both engines)

- **Good**, because it captures both strengths: fast in-IDE axe (addon-vitest) plus docs-page/VRT sweep (test-runner). A proven architecture — Acronis and Adobe both ship both.[^acronis][^spectrum]
- **Good**, because it is additive — keeping the current engine and adding the other touches nothing existing.
- **Bad**, because it is **unofficial** (Storybook positions the addon as a replacement), so it is a deliberate cost, not a blessed default.
- **Bad**, because it doubles the test-tooling surface (two engines, two CI jobs, two upgrade paths) for capabilities not needed today.
- **Verdict**: correct _later_, not _now_ — recorded above as the triggered escape hatch.

## Follow-up

- **Multi-theme a11y** (imminent, separate worktree): implement as a CI `theme` matrix on the `storybook` job, injecting the theme via env → Storybook global → re-run `pnpm test-storybook` per theme. No engine change. Coordinate so the theme global lives alongside the existing `reducedMotion` global in `preview.tsx`.
- **Activate the scaffolded outer layers** as the UI materializes (these are the _other_ a11y layers, not part of this engine decision): flip [`a11y-axe.yml`](../../../../.github/workflows/a11y-axe.yml) (full-app Playwright-electron axe) and [`lighthouse.yml`](../../../../.github/workflows/lighthouse.yml) (assert `accessibility >= 100`) from `workflow_dispatch` to `pull_request` once there are rendered routes/previews worth scanning. Follow each file's in-comment hardening checklist before broadening the trigger.
- **Recheck the `vitest@4` peer** if test instability surfaces; if the addon's browser-mode proves flaky enough to undermine the a11y gate, re-evaluate against the test-runner (this ADR would move to `superseded`, not be silently overridden).
- **On any trigger firing** (docs-page a11y or self-hosted VRT), add `@storybook/test-runner` alongside per the hybrid pattern; update this ADR's status notes rather than rewriting the decision.

## Links

- Supersedes the unstated runner assumption in: [react-and-storybook.md](./react-and-storybook.md)
- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Evidence base: [Storybook testing showcase survey](../../../research/storybook-testing.md)
- Current config: [`.storybook/preview.tsx`](../../../../.storybook/preview.tsx), [`vitest.config.ts`](../../../../vitest.config.ts), [`ci.yml`](../../../../.github/workflows/ci.yml) (`storybook` job)
- MADR template: <https://adr.github.io/madr/>

[^sb-migration]: Storybook docs frame the Vitest addon as the "spiritual successor" to the test-runner and direct users to keep the test-runner only for non-Vite builders (Webpack/RsPack), unsupported renderers, or capabilities the addon lacks: <https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/migration-guide>.

[^grafana]: `grafana/grafana` (`@grafana/ui`) runs multi-theme axe via a CI matrix: `.github/workflows/storybook-a11y.yml` sets `STORYBOOK_THEME: [light, dark]`, feeding `initialGlobals.theme` in `packages/grafana-ui/.storybook/preview.ts`, re-running `test-storybook` per theme (issue #109451, PR #110887). The theming is CI-matrix-level, not engine-specific — the same mechanism works with `addon-vitest`.

[^spectrum]: `adobe/spectrum-web-components` (`2nd-gen/packages/swc`) keeps **both** engines: `@storybook/addon-vitest` (`test: "vitest --run --project storybook"`) and `@storybook/test-runner` (`test:storybook`/`test:a11y`), with `.storybook/test-runner.ts` running `@axe-core/playwright` over both `story` and `viewMode=docs` views — the docs-page-a11y capability the Vitest addon lacks.

[^acronis]: `acronis/uikit` (`packages/legacy/ui`) ships both engines doing distinct CI jobs: the Vitest addon for component tests (`.github/workflows/release.yml`) and `@storybook/test-runner` for image-snapshot visual regression via a `postVisit` + `jest-image-snapshot` `.storybook/test-runner.ts` (`.github/workflows/visual-regression.yml`) — a verified real-world hybrid.
