# Storybook Testing Features — Showcase Survey

A survey of how the **top 25 projects in the [Storybook Showcase](https://storybook.js.org/showcase/)** actually use Storybook's testing features, plus a best-practices distillation per feature. The goal is to ground our own testing strategy in what leading design systems _really do_ — not in what Storybook's marketing implies — given that we already run Storybook (see [`react-ui-framework`](../../MEMORY.md) and the `storybook-mcp` workflow in [`CLAUDE.md`](../../CLAUDE.md)) and sit under a hard WCAG 2.1 AA floor.

**Scope.** The "top 25" is the showcase's own default "Popular" ordering, surveyed on 2026-06-01. Each project was checked against its **live source repository** — `package.json`, `.storybook/` config, CI workflows, and story/test files — not the showcase blurb. Findings are evidence-based (file paths and dependencies cited per project below), not inferred from reputation.

**A note on what "compatibility" means here:** none of these are libraries we link into the shipped app — Storybook and its test tooling are **build/dev tools that operate on our code**. So AGPL-compatibility in the redistribution sense is not the question (per [`feedback_build_tool_license_scope`](../../MEMORY.md)); the question is purely _which testing patterns are worth adopting_. Storybook core and the test-runner are MIT; Chromatic is a paid SaaS with a free tier for open-source projects.

**Two caveats that surfaced during the survey:**

- **iTwinUI (Bentley Systems) has left Storybook entirely** — it migrated its component workshop to [Ladle](https://ladle.dev/) + Cypress. Its showcase entry is stale.
- **VSCode Webview UI Toolkit (Microsoft) removed Storybook** from the repo before the toolkit was deprecated (Jan 2025). Its findings reflect the last Storybook-era commit.

The showcase rewards a polished _gallery_, not a _tested_ component library — and that distinction is the single most important finding here.

---

## 1. The Storybook testing features (what we evaluated)

Per [Storybook's testing docs](https://storybook.js.org/docs/8/writing-tests), the testing surface breaks into seven features. Each project was scored against all seven:

1. **Component / Interaction tests** — `play()` functions that simulate user behavior after render, using `userEvent` + `expect` from `storybook/test` (formerly `@storybook/test` / `@storybook/testing-library`).
2. **Visual tests** — capture each story as an image and diff against a baseline (Chromatic, or self-hosted Playwright/Backstop/Testplane/Percy/Loki).
3. **Accessibility tests** — run axe-core against stories (`@storybook/addon-a11y`, or axe via the test-runner).
4. **Snapshot tests** — serialize a story's rendered output and diff against a committed snapshot (the deprecated Storyshots, or a test-runner `postVisit` hook).
5. **Test runner** — `@storybook/test-runner` (`test-storybook`), the Playwright-based CLI that turns every story into a test and executes `play`/hooks.
6. **Test coverage** — `@storybook/addon-coverage`, instrumenting which component code stories exercise.
7. **Stories imported into unit/e2e tests** — reusing stories as fixtures via `composeStories()` (in Jest/Vitest) or by navigating Playwright/Cypress to a story's `iframe.html?id=…` URL.

---

## 2. Per-project findings

Legend: ✅ used (Storybook-native, enforced) · ⚠️ partial / custom (installed-but-not-gated, a non-Storybook-native equivalent, or assertion-less) · ❌ not used.

| #   | Project                   | Org                |   SB ver   |      Interaction      |         Visual         |         A11y         |       Snapshot       |       Test-runner       |   Coverage   |        Stories-in-tests        |
| --- | ------------------------- | ------------------ | :--------: | :-------------------: | :--------------------: | :------------------: | :------------------: | :---------------------: | :----------: | :----------------------------: |
| 1   | Chakra UI                 | Chakra             |     10     |          ❌           |           ❌           |    ⚠️ addon only     |          ❌          |           ❌            |      ❌      |               ❌               |
| 2   | drei                      | pmndrs             |     10     |          ❌           |      ✅ Chromatic      |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 3   | VSCode Webview UI Toolkit | Microsoft          |   6.4\*    |          ❌           |           ❌           |    ⚠️ addon only     |          ❌          |           ❌            |      ❌      |               ❌               |
| 4   | Elastic Charts            | Elastic            |    6.3     |          ❌           |     ✅ Playwright      |   ⚠️ own (SR DOM)    |          ❌          |           ❌            |      ❌      |         ✅ iframe URL          |
| 5   | React-Dates               | Airbnb             |    5.3     |          ❌           |           ❌           |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 6   | fundamental-styles        | SAP                |     10     |          ❌           |      ✅ Chromatic      |    ✅ vitest-axe     |   ⚠️ own (Vitest)    |           ❌            |      ❌      |         ⚠️ raw import          |
| 7   | Grafana UI                | Grafana            |     10     |          ❌           |           ❌           |        ✅ axe        |          ❌          |           ✅            |      ❌      |               ❌               |
| 8   | Fluent UI Web Components  | Microsoft          |     9      |          ❌           |           ❌           |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 9   | Spectrum Web Components   | Adobe              |     10     |          ✅           |      ✅ Chromatic      | ✅ axe (test-runner) |          ❌          |           ✅            | ⚠️ Vitest v8 |        ✅ direct import        |
| 10  | Carbon Components React   | IBM / Carbon       |     10     |          ❌           |      ✅ Chromatic      |    ✅ AC checker     |          ❌          |           ❌            |      ❌      |         ✅ iframe URL          |
| 11  | Primer React              | GitHub             |     10     |          ✅           |     ✅ Playwright      |        ✅ axe        |          ❌          |           ❌            |      ❌      |         ✅ iframe URL          |
| 12  | Ring UI                   | JetBrains          |     10     |          ❌           |      ✅ Testplane      | ✅ axe (test-runner) |          ❌          |           ✅            |      ❌      |       ✅ composeStories        |
| 13  | Reaviz                    | Reaviz             |     10     |          ❌           |           ❌           |          ❌          |    ✅ test-runner    |           ✅            |      ❌      |               ❌               |
| 14  | GitLab UI                 | GitLab             |    7.6     |     ⚠️ infra only     | ✅ jest-image-snapshot | ✅ axe (test-runner) |          ❌          |           ✅            |      ❌      |       ✅ runner iterates       |
| 15  | Lucid UI                  | AppNexus           |    6.4     |          ❌           |      ✅ Chromatic      |          ❌          | ⚠️ own (Jest+enzyme) |           ❌            |      ❌      |       ⚠️ custom harness        |
| 16  | iTwinUI                   | Bentley            | **off SB** |          ❌           |   ✅ (Ladle+Cypress)   |    ⚠️ cypress-axe    |          ❌          |           ❌            |      ❌      |      ⚠️ Ladle story URLs       |
| 17  | Kaizen                    | Culture Amp        |    8.6     |          ✅           |      ✅ Chromatic      | ✅ axe (test-runner) |          ❌          |           ✅            |      ❌      |         ⚠️ 1 file only         |
| 18  | LaunchPad                 | LaunchDarkly       |     9      |          ✅           |      ✅ Chromatic      |  ✅ addon-a11y/axe   |          ❌          |           ❌            | ⚠️ Vitest v8 |               ❌               |
| 19  | MDX Embed                 | Paul Scanlon       |    6.5     |          ❌           |           ❌           |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 20  | Passbolt UI kit           | Passbolt           |    8.6     | ⚠️ 1 file, no asserts |           ❌           |          ❌          |          ❌          | ⚠️ installed, not wired |      ❌      |               ❌               |
| 21  | Reaflow                   | Reaviz             |    7.6     |          ❌           |           ❌           |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 22  | Polaris Viz               | Shopify            |    6.5     |          ❌           |      ✅ Chromatic      |    ⚠️ addon only     |          ❌          |           ❌            |      ❌      |               ❌               |
| 23  | SmartHR UI                | SmartHR / kufu     |     9      |     ⚠️ setup-only     |      ✅ Chromatic      |          ❌          |          ❌          |           ❌            |      ❌      |               ❌               |
| 24  | Talend UI                 | Talend             |     10     |          ❌           |      ✅ Chromatic      |    ✅ addon-a11y     |          ❌          |           ❌            |      ❌      |               ❌               |
| 25  | Mayflower                 | Mass. Digital Svcs |    6.0     |          ❌           | ✅ Backstop+Chromatic  |    ⚠️ addon only     |          ❌          |           ❌            |      ❌      | ⚠️ Backstop reads stories.json |

\* removed from the repo before the toolkit's deprecation; findings are from the last Storybook-era commit.

### Per-project evidence notes

- **Chakra UI** — Storybook 10 (`react-vite`) as a pure showcase; `@storybook/addon-a11y` panel only. All real testing is a standalone Vitest suite (`vitest-axe`, `@testing-library/react`). No Chromatic, runner, or `composeStories` (0 hits).
- **drei (pmndrs)** — Visual-regression-only: `chromatic` + `@chromatic-com/storybook` deps and a `chromatic.yml` workflow (auto-accepts on `master`). Nothing else. A separate `@playwright/test` E2E harness is unrelated to Storybook.
- **VSCode Webview UI Toolkit** — SB 6.4 `@storybook/html` as a catalog; `addon-a11y` registered but never gated. Storybook fully removed in PR #460 before deprecation.
- **Elastic Charts** — SB 6.3.7. Storybook is the _fixture source_ for an out-of-band Playwright suite: VRT via `toMatchSnapshot` (`buildkite update vrt` baseline flow), plus an a11y suite that asserts **screen-reader DOM summaries** (not axe). E2E navigates `?path=/story/<id>` URLs.
- **React-Dates (Airbnb)** — SB 5.3, legacy `storiesOf().add()`. Pure demo gallery; all testing is mocha/chai/enzyme. Notably did **not** adopt Storyshots despite the era.
- **fundamental-styles (SAP)** — SB 10 `html-vite`. Chromatic for VRT; a hand-rolled Vitest pipeline imports every story module to run `toMatchSnapshot()` ("storyshots") and `vitest-axe`. No native runner/coverage/`composeStories`.
- **Grafana UI** — The clean modern a11y pattern: `a11y: { test: 'error' }` in `preview.ts` + `@storybook/test-runner` run by `storybook-a11y.yml` across **light + dark themes**. No `play`, Chromatic, or `composeStories` on current `main` (the oft-cited `composeStories` usage is gone).
- **Fluent UI Web Components** — Storybook is presentation-only (`addon-docs`). All testing is a custom Playwright harness (`@microsoft/fast-test-harness`) on `*.spec.ts`, decoupled from stories. (The Fluent _React_ side leans on Storybook far more — but the showcase entry is Web Components.)
- **Spectrum Web Components (Adobe)** — The most complete stack. 2nd-gen: `play()` via `storybook/test` run by `@storybook/addon-vitest` (browser/Playwright), axe enforced by a `test-runner.ts` `postVisit` hook (`addon-a11y` present but non-blocking), Chromatic for VRT, coverage via `@vitest/coverage-v8`. Stories re-composed by direct CSF import (not `composeStories`).
- **Carbon Components React (IBM)** — SB 10 on Vite. Chromatic with `chromatic.modes` (multi-theme: g10/g100/breakpoints). Accessibility via IBM's `accessibility-checker` — both a Storybook addon and an `@avt` Playwright suite that loads each story's `iframe.html?id=…` via a `visitStory()` helper. No `play`/runner/`composeStories`.
- **Primer React (GitHub)** — `play()` in `*.features.stories.tsx` using `storybook/test`. VRT and a11y are **Playwright against a built static Storybook** (not Chromatic — zero Chromatic footprint): `@vrt` → `toHaveScreenshot`, `@aat` → axe-core `toHaveNoViolations`, both iterating `iframe.html` across all 9 themes. No test-runner/coverage/`composeStories`.
- **Ring UI (JetBrains)** — `@storybook/test-runner` + `@storybook/addon-a11y` audit every story in light + dark (CI-gated). `composeStories` (from `@storybook/react-webpack5`) enumerates stories to feed a **Testplane** (hermione successor) VRT suite. Behavioral tests live in separate `*.test.tsx`.
- **Reaviz** — The only _native_ snapshot user: `test-runner.ts` `postVisit` snapshots `#storybook-root` innerHTML → `toMatchSnapshot()`, tag-gated `tags: ['snapshot']`. No Chromatic/a11y/`play`/`composeStories`.
- **GitLab UI** — SB 7.6, no SaaS. A single `test-runner.ts` `postVisit` does **both** VRT (`jest-image-snapshot`, committed PNGs) **and** a11y (`axe-playwright` `injectAxe`/`checkA11y`), wired into `visual` + `update_screenshots` CI jobs. `play` infra installed but not the focus; no `composeStories`.
- **Lucid UI (AppNexus)** — SB 6.4. Chromatic for VRT + a custom Storyshots-equivalent in `src/util/generic-tests.tsx` that globs every `*.stories.tsx`, renders, and `toMatchSnapshot()` via Jest + `enzyme-to-json`. No official Storyshots, no `addon-a11y`.
- **iTwinUI (Bentley)** — **Off Storybook.** Ladle workshop + Cypress (`cypress-image-diff` VRT against Ladle story URLs, `cypress-axe` for a11y). Stories remain the VRT fixture source, but via Ladle, not Storybook. None of the seven Storybook-native features present.
- **Kaizen (Culture Amp)** — SB 8.6. `play()` in 46 stories (`@storybook/test`, 12 dedicated `*.spec.stories.tsx`), Chromatic (PR + main workflows), axe in `test-runner.ts` `postVisit` (`axe-playwright`/`jest-axe`). The widely-assumed "`composeStories` in Jest" pattern is **essentially absent** (1 render-only file). No snapshot/coverage addon.
- **LaunchPad (LaunchDarkly)** — Public repo `launchdarkly/launchpad-ui`. `play()` in 44 stories (`storybook/test`), Chromatic-hosted Storybook, `addon-a11y` + `axe-core`. No test-runner/Storyshots/`composeStories`; a parallel Vitest suite (v8 coverage, enforced thresholds) handles units.
- **MDX Embed** — SB 6.5 as an MDX docs site. Zero Storybook testing features. Testing is Jest + Cypress (E2E hits the running Storybook by URL).
- **Passbolt UI kit** — `passbolt/passbolt_styleguide`, SB 8.6 (deps installed at build time via a script). Showcase/docs only. `@storybook/test-runner` installed with a `test:storybook` script but **not wired to any CI**. One story file uses `play` with **no assertions**. No `composeStories` (contradicting its reputation).
- **Reaflow (Reaviz)** — SB 7.6. **None** of the seven features — unlike its sibling Reaviz, no test-runner/snapshots. `chromatic` is an orphaned devDep referenced by no script or workflow. Testing is 3 plain-Vitest helper tests.
- **Polaris Viz (Shopify)** — SB 6.5. Chromatic (`chromaui/action`, `onlyChanged: true`, global `chromatic: {delay}`). `addon-a11y` panel only (no CI gate). Units via Shopify's `loom`/`@shopify/react-testing`, not stories.
- **SmartHR UI (kufu)** — SB 9. Chromatic-centric VRT with dedicated `VRT*` stories whose `play()` (`storybook/test` `userEvent`) **drive visual state for snapshots — zero `expect()`**. Units via Vitest + Testing Library. No runner/`addon-a11y` (a11y addon only in the separate `charts` package)/`composeStories`.
- **Talend UI** — SB 10 monorepo. Chromatic (label-gated `visual-testing.yml` against the aggregated `storybook-one`) + `@storybook/addon-a11y` as a default addon everywhere. Units (and `jest-axe`) in Vitest. Cypress fully removed in favor of Chromatic. No `play`/runner/`composeStories`.
- **Mayflower (Mass. Digital Services)** — SB 6.0/6.1 (Node 14 era). **BackstopJS** VRT (puppeteer, Docker CI) driven off `sb extract` → `stories.json`, plus Chromatic in `packages/core`. `addon-a11y` panel only. No modern features (predates `play`).

---

## 3. Adoption rates by feature

Counting rules: **Full** = Storybook-native and enforced (✅ above). **Partial/Custom** = installed-but-not-gated, a non-native equivalent (jest-image-snapshot, vitest-axe, Backstop), or assertion-less (⚠️). **None** = absent (❌). N = 25.

| Feature                   | Full ✅  | Partial / Custom ⚠️ | None ❌  |
| ------------------------- | :------: | :-----------------: | :------: |
| **Visual tests**          | 13 — 52% |       1 — 4%        | 11 — 44% |
| **Accessibility tests**   | 8 — 32%  |       7 — 28%       | 10 — 40% |
| **Test runner**           | 6 — 24%  |       1 — 4%        | 18 — 72% |
| **Interaction (`play`)**  | 4 — 16%  |       3 — 12%       | 18 — 72% |
| **Stories-in-tests**      | 4 — 16%  |       6 — 24%       | 15 — 60% |
| **Snapshot tests**        |  1 — 4%  |       3 — 12%       | 21 — 84% |
| **Test coverage (addon)** |  0 — 0%  |       5 — 20%       | 20 — 80% |

**The gradient tracks effort.** Visual testing leads (52%) because Chromatic is nearly turnkey — one dep, one workflow. Accessibility has the widest _intent-vs-enforcement gap_: 60% of projects touch it, but 28% only install the panel and never fail CI on it. The integrated stack (`play` + test-runner + enforced a11y) stays a minority and clusters in the Storybook 8–10 adopters (Adobe, Primer, Kaizen, Ring UI, Grafana, GitLab). Snapshot and coverage are effectively abandoned as _native_ features — the ecosystem routed around both (visual diffing replaces render snapshots; Vitest replaces the coverage addon).

**"Showcase-grade" ≠ "tested with Storybook."** A large share use Storybook purely as a documentation gallery with all testing in a parallel Jest/Vitest suite that never touches stories (Chakra, React-Dates, Fluent WC, MDX Embed, Reaflow, Passbolt). Only ~6 projects use Storybook as a genuine test platform.

**A `play` function is not automatically a test.** Several projects (SmartHR, Passbolt) write `play` with `userEvent` but **no `expect`** — driving a component into a visual state for a snapshot. Same API, opposite intent. When scoring (and when writing our own), the presence of assertions is the line.

---

## 4. Best practices, per feature

Distilled from the strongest adopters above.

### 4.1 Interaction tests (`play`)

_Reference: Primer, Kaizen, Adobe, LaunchPad._

- **Import from the consolidated `storybook/test`** (SB 8+), not the deprecated `@storybook/jest` / `@storybook/testing-library`.
- **Always assert.** A `play` with `userEvent` but no `expect` is a state-setter, not a test (the SmartHR/Passbolt anti-pattern). If you only want a visual state, pair it with a snapshot tool and say so.
- **Separate test stories from doc stories** by convention so the runner can target them — Primer's `*.features.stories.tsx`, Kaizen's `*.spec.stories.tsx`.
- **Use `step()`** to group interactions for readable Interactions-panel / runner output.
- **Use `fn()` spies** for callbacks (`await expect(args.onClick).toHaveBeenCalled()`).
- **Scope queries with `within(canvasElement)`** so a story doesn't match the Storybook chrome.

### 4.2 Visual tests

_Reference: Chromatic (Carbon, Kaizen, Polaris Viz, drei, …); self-hosted (Primer/Elastic Playwright, Ring UI Testplane, Mayflower Backstop)._

- **Prefer Chromatic** — lowest friction and the clear majority choice. Wire it as a **PR check with a `main` baseline** (Kaizen: separate PR + main workflows).
- **Pin out non-determinism** — global `chromatic: { delay }`, `parameters.chromatic.disableSnapshot` on noisy stories (Polaris Viz).
- **Snapshot every theme/mode** via `chromatic.modes` (Carbon: light/dark/breakpoints) — the right move for a token-themed system.
- **Gate cost** — `onlyChanged: true`/TurboSnap (Polaris Viz), or label-gate the whole job (Talend).
- **If self-hosting**, the consensus is **Playwright `toHaveScreenshot()`** against a _built, served_ Storybook, sharded, with an explicit baseline-update CI path (Elastic's `buildkite update vrt`, GitLab's `update_screenshots`).
- **Visual diffing does not catch screen-reader regressions** — a green Chromatic run is not a11y coverage (§4.3).

### 4.3 Accessibility tests

\*Reference: Grafana, Primer, Adobe, Ring UI, GitLab, Kaizen, Carbon. **Most relevant to our WCAG 2.1 AA floor.\***

- **Installing `@storybook/addon-a11y` only gives a manual panel.** Chakra, Polaris Viz, Talend, Mayflower stop here — nothing fails CI. For an a11y-first project this is **not enough**.
- **To enforce, pick one wiring:**
  1. **Modern (SB 8+): `a11y: { test: 'error' }` in `preview.ts` + run the test-runner in CI.** The cleanest path — exactly Grafana's `storybook-a11y.yml` across light + dark. **Adopt this.**
  2. **Custom `test-runner.ts` hook with `axe-playwright`** asserting `toHaveNoViolations()` (Kaizen, GitLab) — more control (per-tag WCAG config, docs + story views), more code. Adobe scopes `AxeBuilder` to `#storybook-root` with `wcag2a/2aa/21a/21aa` tags — a good explicit tag set to copy.
- **Run a11y across every theme/mode**, not just the default (Grafana, Ring UI run both).
- **Keep a shared, reviewed rule config** (Kaizen's `globalA11yRules`) rather than ad-hoc per-story disables, so exceptions are auditable.
- **axe is necessary, not sufficient for AA.** Pair automated axe with the manual SR/keyboard/touch/voice testing the project already mandates (see [`e2e_a11y_input_coverage`](../../MEMORY.md)). Note the non-axe approaches some strong a11y projects also run: Elastic asserts SR DOM summaries; Carbon uses IBM `accessibility-checker`; Talend/SAP use `jest-axe`/`vitest-axe` in units.

### 4.4 Snapshot tests

_Reference: Reaviz (native); SAP/Lucid/GitLab (home-grown)._

- **Do not adopt `@storybook/addon-storyshots`** — deprecated and used by **zero** projects, including the legacy ones.
- **The modern equivalent is a test-runner `postVisit` hook** snapshotting `#storybook-root`, **tag-gated** (`tags: { include: ['snapshot'] }`, Reaviz) so only opted-in stories snapshot.
- **Prefer assertion-based `play` + visual over DOM snapshots** — snapshots are brittle and churn on every markup tweak. The cohort trends away from them.

### 4.5 Test runner

_Reference: Grafana, Ring UI, Adobe, Kaizen, GitLab, Reaviz._

- **It's the execution engine for §4.1/§4.3/§4.4** — adopt it when you have `play` and/or want enforced a11y. Every CI-enforced-a11y project runs it.
- **Build with `storybook build --test` and run against the static build** (Kaizen, GitLab); sequence with `wait-on`/`start-server-and-test`.
- **Shard** large story sets (`--shard 1/3 …`).
- **Use tags to scope runs** (`--skipTags`/`--includeTags`).
- **Put real logic in `.storybook/test-runner.ts`** `preVisit`/`postVisit` (axe injection, snapshots) — this one file is where most teams' testing lives.
- **Don't confuse `@storybook/test-runner` with `@web/test-runner`** (Modern Web's tool; Adobe's legacy 1st-gen) — different products.

### 4.6 Test coverage

_Reference: none use the addon._

- **Don't reach for `@storybook/addon-coverage` first** — zero adoption. The cohort gets coverage from standalone **Vitest/Jest** runs (Adobe/LaunchPad `@vitest/coverage-v8` with enforced thresholds).
- **For story-driven coverage**, the current idiom is **`@storybook/addon-vitest` + `@vitest/coverage-v8`** (Adobe 2nd-gen), which runs stories as Vitest browser tests — superseding the coverage addon.
- **Set enforced thresholds** (LaunchPad: lines 85 / fns 70 / branches 70), don't report numbers you never gate on.

### 4.7 Stories imported into tests

_Reference: Ring UI (`composeStories`), Adobe (direct import), Primer/Carbon/Elastic (iframe URL)._

- **Pick the technique by test type:**
  - **`composeStories` for component/unit tests** in Vitest/Jest (Ring UI) — one source of truth for fixtures.
  - **`iframe.html?id=<story-id>` for e2e/visual** (Primer, Carbon, Elastic) — the dominant real-world pattern, most robust for cross-browser/theme matrices. Carbon's `visitStory()` helper is the model.
- **Derive story IDs from the built `index.json`/`stories.json`** rather than hardcoding (Primer iterates `storybook-static/index.json`; Mayflower's Backstop reads `stories.json`) — auto-covers new stories.
- **`composeStories` is rarer than its reputation** — Grafana and Kaizen are _assumed_ to use it but effectively don't on current `main`. Verify before cargo-culting; the honest default for a design system is the iframe-URL approach.
- **Don't duplicate fixtures.** The anti-pattern (Chakra, LaunchPad, Passbolt, Talend) is a parallel `*.test.tsx` suite that re-mounts components, ignoring the stories entirely. If you've authored stories, composing them avoids drift.

---

## 5. Recommendation for notebook-app

Given our constraints — a11y-first (WCAG 2.1 AA floor), ADHD-stable UI, Helios-token theming with a `DESIGN.md` visual contract, and an existing Storybook + `storybook-mcp` workflow — the survey informs (but does not by itself set) our target stack. Where the survey's generic recommendation collides with a decision this project has already made, the project decision wins; those collisions are called out below.

- **Accessibility — already enforced, on `addon-vitest` (not the test-runner).** The survey's headline lesson ("enforce axe, don't just panel it") is **already implemented here**: `a11y: { test: 'error' }` in [`.storybook/preview.tsx`](../../.storybook/preview.tsx) is run on every PR by the `storybook` CI job (`pnpm test-storybook`), so any WCAG 2.1 AA violation in any story fails the build. The engine is **`@storybook/addon-vitest`** (stories as Vitest browser tests), **not** `@storybook/test-runner` — a deliberate choice (faster inner loop, native axe, Storybook's recommended default for Vite projects) recorded in [`storybook-a11y-test-runner.md`](../features/accessibility/adrs/storybook-a11y-test-runner.md). So the survey's "follow Grafana's `test-runner` pattern" advice is **noted but not adopted** — we get the same enforcement via a different, better-fit engine. Multi-theme axe (light / dark / high-contrast, once the theme system lands) is a CI **theme-matrix** concern on the current engine, not a reason to switch.
- **Interaction — assert keyboard reachability in `play`.** Our charter requires every flow tested under keyboard/SR ([`e2e_a11y_input_coverage`](../../MEMORY.md)); `play` functions with `userEvent.tab()` + `expect(...).toHaveFocus()` (LaunchPad's pattern) encode exactly that. axe + `play` together cover the automatable slice; manual SR/touch/voice still required.
- **Visual regression — deliberately deferred (do not adopt yet).** VRT is a **stabilization-era** tool: it detects _unintended_ change against a blessed baseline, so its value is near-zero (or negative) during active prototyping where almost every change is _intended_ and would just churn baselines. Its value arrives later — specifically when (a) the **theme system lands** (multi-theme appearance bugs that axe cannot see: axe checks computed contrast/semantics, not whether a component _looks_ right in dark/high-contrast) and (b) components **stop changing on purpose** (stable baselines). Two triggers govern revisiting it:
  - **Trigger A — baseline stability** (≈ theme system lands / components settle): revisit **whether to do VRT at all**. Default tool on first adoption = **local Playwright `toHaveScreenshot`** (no SaaS commitment; Playwright already runs in our CI).
  - **Trigger B — Chromatic earns the SaaS**, when **either** collaborators arrive (its hosted review/approval UI gains real payoff) **or** local Playwright VRT proves painful (cross-OS baseline-PNG churn, flaky diffs, multi-mode upkeep) — **and** Chromatic is **worth the cost** ("cost" spanning both money and maintenance; the free OSS tier is simply the zero-money case).
  - **Posture:** Chromatic is **not** charter-blocked — uploading project UI to a SaaS is a _soft, source-only_ preference; the hard local-first line covers user artifacts, not component snapshots. (Note the prior `@chromatic-com/storybook` removal in the [react-and-storybook ADR](../features/accessibility/adrs/react-and-storybook.md) was a default-pruning, not a considered rejection — hence "deferred," not "rejected.")
- **Skip** Storyshots (deprecated, zero adoption) and `@storybook/addon-coverage` (zero adoption). If we want story-driven coverage later, use `@storybook/addon-vitest` + `@vitest/coverage-v8`, not the coverage addon. CI already gates the seven checks in [`CLAUDE.md`](../../CLAUDE.md); the Storybook a11y/interaction gate is an additive eighth surface, not a replacement.

The a11y-engine decision above is recorded in [`storybook-a11y-test-runner.md`](../features/accessibility/adrs/storybook-a11y-test-runner.md). The visual-regression decision is intentionally left as a _deferred_ item with the triggers above rather than a premature ADR — there is no decision to record yet beyond "not now, here's what would change that."

---

_Survey conducted 2026-06-01 against the live repositories of the 25 then-top "Popular" Storybook Showcase projects. Storybook testing taxonomy per <https://storybook.js.org/docs/8/writing-tests>._
