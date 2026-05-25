## React as the renderer UI framework, Storybook as the component workshop

- Status: accepted
- Date: 2026-05-25
- Deciders: Bradley Shrader
- Tags: accessibility, framework, tooling, frontend

## Context and Problem Statement

`notebook-app` is accessibility-first ([see accessibility OVERVIEW](../OVERVIEW.md)). The renderer process needs (a) a UI framework, and (b) a workshop for building and testing individual components in isolation. The scaffold left `src/renderer/src/main.ts` as plain DOM as a placeholder — a real UI surface needs a real framework decision.

Two questions, decided together:

1. Which UI framework should the React-side renderer use?
2. What component-development workflow should accompany it?

Component-level a11y testing is the load-bearing concern. Per the [`e2e-a11y-input-coverage`](../../../) project memory and the project charter, every flow must be testable under every input method — that demands a tool that can render each component in isolation and run axe-core against it before any composed flow exists.

## Decision Drivers

- WCAG 2.1 AA is non-negotiable. Whatever we pick must support per-component axe-core scanning, not just full-page scanning.
- AGPL-3.0-or-later compatibility ([see in-use.md](../../../licenses/in-use.md)) — anything linked must be permissive or AGPL-compatible.
- Electron's bundled Chromium is already chosen for its accessible-tree exposure ([see typescript-desktop-frameworks reference](../../../references/typescript-desktop-frameworks.md)) — the framework must not regress that.
- React Aria Components is the leading candidate for accessible primitives ([see related-libraries](../../../references/related-libraries.md)) — the framework should make adopting it easy.
- The project is pre-implementation. Lock-in cost is at its lowest now, but the chosen framework will be sticky once components exist.
- The ESLint config already wires `jsx-a11y` strict on `**/*.{jsx,tsx}` — that decision implicitly assumed React or a JSX-using framework.

## Considered Options

**Framework:**

1. **React (+ react-dom).** MIT, massive a11y ecosystem (React Aria, axe-core integrations), Storybook's most mature renderer.
2. **Vue 3.** MIT, good a11y story but a smaller pool of accessible-primitives libraries.
3. **Svelte.** MIT, smallest runtime, but Storybook's Svelte renderer lags React's and React Aria has no equivalent.
4. **Web Components (Lit).** MIT, framework-free, but Storybook tooling and a11y testing patterns are noticeably less developed.
5. **Stay vanilla TS.** No framework. Defers the decision but blocks Storybook entirely.

**Workshop:**

A. **Storybook** with the `react-vite` framework, `@storybook/addon-a11y` (per-story axe), and `@storybook/addon-vitest` (run stories as Vitest browser tests).
B. **Plain Vitest + Testing Library** with no isolated component surface — components only exist inside the full app.
C. **Histoire.** Lighter-weight Vue-first alternative. Less mature a11y addon story.

## Decision Outcome

**Framework: React. Workshop: Storybook with addon-a11y + addon-vitest.**

React is the largest target for accessibility-focused libraries — React Aria Components ([adopted by Adobe Spectrum, Bluesky, etc.](https://react-spectrum.adobe.com/react-aria/)) is the strongest off-the-shelf source of WCAG-compliant primitives in the JS ecosystem, and is React-only. Picking React makes the [a11y charter](../OVERVIEW.md) easier to honor, not harder.

Storybook with `addon-a11y` (`a11y.test: 'error'` in `.storybook/preview.tsx`) gives us **per-component axe-core coverage from the first component onward**. This is the rendered-surface that `a11y-axe.yml` and `lighthouse.yml` were scaffolded to wait for — see the comments in those workflows pre-dating this ADR.

`addon-vitest` runs each story as a browser test, which means the same story files used for visual review also produce the test signal — no duplicate fixtures, no test/story drift. The Vitest tests run in real Playwright-driven Chromium, matching Electron's runtime.

### Positive Consequences

- React Aria Components is now available for adoption when accessible primitives are needed.
- Every story automatically becomes an axe-core test (a11y `test: 'error'`) — the WCAG 2.1 AA gate has a permanent CI surface from PR #1 of component work onward.
- The previously-inert `a11y-axe.yml` and `lighthouse.yml` workflows now have a `storybook-static` target to point at.
- ESLint `jsx-a11y` strict rules become load-bearing rather than aspirational.
- Storybook stories double as living documentation for the academic-user UX patterns this project cares about (focus order, reduced-motion, keyboard reachability).

### Negative Consequences

- React + react-dom adds ~50KB gzipped to the renderer bundle. Acceptable for an Electron app; non-trivial for a future browser-extension or mobile build (both are v3.0 roadmap items, not v1.0).
- Storybook itself adds significant dev-dependency surface (~178 packages on init). The audit job (`fallow`) will need to keep up.
- React 19's compiler-driven optimization model is new territory; we should watch for a11y-affecting behavior changes (e.g. concurrent rendering interactions with screen readers).
- Storybook 10's `addon-vitest` is recent and the `vitest@4` peer is bleeding-edge. Worth a recheck if test instability surfaces.

## Pros and Cons of the Options

### React (Option 1)

- **Good**, because React Aria Components is the strongest accessibility-primitives library in any JS ecosystem and is React-only.
- **Good**, because Storybook's React renderer is its most mature.
- **Good**, because the existing `jsx-a11y` ESLint config was already shaped for JSX.
- **Bad**, because of bundle size relative to Svelte/Vanilla.
- **Bad**, because of React 19's newer compiler/concurrent-rendering behaviors that will need a11y monitoring.

### Vue 3 (Option 2)

- **Good**, because of smaller runtime than React.
- **Bad**, because no equivalent to React Aria Components — we would either roll our own accessible primitives or accept a weaker a11y baseline.
- **Bad**, because the existing `jsx-a11y` config would be wasted (Vue templates are not JSX).

### Svelte (Option 3)

- **Good**, because smallest runtime.
- **Bad**, because no accessibility-primitives library at React Aria's level.
- **Bad**, because Storybook's Svelte renderer lags React's in addon compatibility.

### Web Components / Lit (Option 4)

- **Good**, because framework-independent — survives any future framework migration.
- **Bad**, because shadow-DOM interactions with screen readers and axe-core are still a source of false positives and false negatives. The a11y charter cannot afford that uncertainty.

### Stay vanilla (Option 5)

- **Good**, because no framework lock-in.
- **Bad**, because it indefinitely defers the moment when component-level a11y testing becomes possible. The charter cannot wait.

### Storybook (Workshop A)

- **Good**, because `addon-a11y` makes per-story axe-core trivial.
- **Good**, because `addon-vitest` collapses stories and tests into one source of truth.
- **Bad**, because of the ~178-package dev-dependency surface.

### Plain Vitest, no Storybook (Workshop B)

- **Good**, because of smaller dev-dependency surface.
- **Bad**, because no isolated visual review surface — designers and screen-reader users cannot try components in isolation.
- **Bad**, because the scaffolded a11y/Lighthouse workflows would have no rendered surface to scan until the full app boots.

### Histoire (Workshop C)

- **Good**, because it is lighter than Storybook.
- **Bad**, because of significantly less mature a11y addon ecosystem.
- **Bad**, because it is Vue-first; using it with React is an off-the-beaten-path configuration.

## Follow-up

- Delete `src/renderer/src/stories/Welcome.stories.tsx` once the first real component story lands — it exists only so `build-storybook` has something to render in CI.
- When `lighthouse.yml` is wired up, point it at `storybook-static` and assert `accessibility >= 100`.
- Re-evaluate the React 19 → React Aria Components stack against [`react-aria-components`](https://react-spectrum.adobe.com/react-aria/) version compatibility before adopting it.
- Storybook adds `@storybook/addon-mcp` and `@chromatic-com/storybook` by default on `init`. `@chromatic-com/storybook` was removed (no Chromatic SaaS plan). `@storybook/addon-mcp` was initially removed as out-of-scope but reinstated immediately after, per [Storybook's MCP setup docs](https://storybook.js.org/docs/ai/setup): it exposes the Storybook manifest, story-generation, and interaction-test surface to AI coding agents as an MCP server at `http://localhost:6006/mcp`. The server is registered for Claude Code at project scope in [`.mcp.json`](../../../../.mcp.json), and [`AGENTS.md`](../../../../AGENTS.md) directs agents to consult it before doing UI work. If `@chromatic-com/storybook` reappears after a future `storybook upgrade`, remove again and note here.

## Links

- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Sibling ADR: [eslint-version.md](./eslint-version.md) (the `jsx-a11y` peer-range constraint this decision now relies on)
- Related references: [related-libraries](../../../references/related-libraries.md), [typescript-desktop-frameworks](../../../references/typescript-desktop-frameworks.md)
- MADR template: <https://adr.github.io/madr/>
