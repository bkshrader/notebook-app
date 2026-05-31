## Adopt Ark UI as the unstyled-primitives layer for React components

- Status: accepted
- Date: 2026-05-30
- Deciders: Bradley Shrader
- Tags: accessibility, frontend, design-system, dependencies

## Context and Problem Statement

`notebook-app` is accessibility-first ([accessibility OVERVIEW](../OVERVIEW.md)). The renderer is React with Storybook ([react-and-storybook ADR](./react-and-storybook.md)), the design language is Helios tokens consumed as plain CSS custom properties ([design-system-helios ADR](./design-system-helios.md)), and the [DESIGN.md](../../../../DESIGN.md) contract explicitly leaves the unstyled-primitives library decision open. That decision unblocks the first interactive component.

Building accessible interaction primitives — focus management, keyboard handling, ARIA wiring, escape/click-outside behavior, focus-trap on dialogs, roving tabindex on menus — from scratch is a multi-month engineering effort that the [accessibility charter](../OVERVIEW.md) cannot afford to ship weak. We need a primitives library that lets us inherit that work, and whose styling story does not undo the Helios decision (tokens consumed as plain CSS custom properties, no framework coupling).

## Decision Drivers

- WCAG 2.1 AA is non-negotiable. Primitives must implement WAI-ARIA APG patterns correctly, with verifiable focus management and keyboard handlers.
- AGPL-3.0-or-later compatibility ([in-use.md](../../../licenses/in-use.md)).
- Helios tokens are consumed as plain CSS custom properties. The primitives library must not impose a styling engine (Tailwind, Panda, Emotion runtime) that re-architects how Helios values reach component CSS.
- React 19 + Vite + Electron renderer ([react-and-storybook ADR](./react-and-storybook.md), [typescript-desktop-frameworks](../../../research/typescript-desktop-frameworks.md)).
- Maintained, with a credible bus factor — primitives are load-bearing for every interactive element in the app.
- Stable upgrade story. A primitive's interaction logic should improve in place via a versioned dependency, not require manual code re-copy and merge.

## Considered Options

1. **Ark UI** (`@ark-ui/react`, MIT). Headless React components built on framework-agnostic Zag.js finite-state machines. No CSS opinion; state exposed via `data-scope` / `data-part` / `data-state` attributes.
2. **shadcn/ui + Radix UI Primitives.** Copy-paste registry of React wrappers around Radix Primitives (MIT). Tailwind-required styling layer.
3. **Radix UI Primitives directly** (`@radix-ui/react-*`, MIT). Skip the shadcn registry; wrap Radix in our own component layer.
4. **React Aria Components** (`react-aria-components`, Apache-2.0). Adobe's accessibility-primitives library, behind the React Aria hooks that Adobe Spectrum, Bluesky, and others ship with.
5. **Roll our own** primitives.

## Decision Outcome

Chosen option: **Option 1 — Ark UI**.

The decisive driver is accessibility posture, with framework fit a close second.

**Accessibility.** Radix Primitives — the substrate under both Options 2 and 3 — carries a publicly catalogued backlog that we cannot ignore. The Publicis Sapient Accessibility Center of Excellence audit (radix-ui/primitives [#2232](https://github.com/radix-ui/primitives/discussions/2232), spreadsheet published February 2025) identified 35 defects across Radix Primitives. The auditor confirmed in February 2025 the defects were still present; the maintainer response amounted to "PRs welcome." The latest comment on that discussion (November 2025) still asks for an outcome. Specific high-severity bugs are independently confirmed open:

- **Dialog focus-guard fails axe**: a focusable element receives `tabindex="0"` inside an `aria-hidden="true"` container, violating WCAG 2.1.1 ([#3593](https://github.com/radix-ui/primitives/issues/3593), last touched March 2026). Reproduces on the official Radix docs site.
- **Toast hardcodes `aria-live="off"`**: screen readers do not announce toasts, violating WCAG 4.1.3 Status Messages ([#3634](https://github.com/radix-ui/primitives/issues/3634), July–August 2025). Reproduces on the official Radix docs site.

Dialog and Toast are both primitives a notes app will use heavily. The shadcn copy-paste model partially insulates us — we own the wrapper source and could patch the focus-guard and `aria-live` defects in our tree — but the maintenance burden is real and recurring across every primitive with an upstream defect. Radix itself is effectively a one-engineer project at WorkOS since the Modulz co-founders left in late 2023 (~40 commits in the trailing 52 weeks as of late May 2026; 639 open issues, 166 open PRs).

Ark UI is built on [Zag.js](https://github.com/chakra-ui/zag) — a library of ~60 framework-agnostic finite-state machines that own focus management, keyboard handlers, and ARIA wiring. Each machine is Playwright-tested against the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/). This is a genuine architectural a11y asset: interaction semantics are defined once, in a framework-neutral place, and verified by automated tests rather than reimplemented per primitive. Ark UI is the substrate of Chakra UI v3, so investment is structurally guaranteed beyond a single maintainer.

APG conformance is not the same as real screen-reader correctness — [Adrian Roselli's critique](https://adrianroselli.com/2023/04/no-apgs-support-charts-are-not-can-i-use-for-aria.html) of APG support claims still applies, and we will still audit every adopted primitive against the project's NVDA / JAWS / VoiceOver / Orca matrix ([E2E a11y input-coverage memory](../../../../)). But starting from a Zag/APG baseline rather than from a documented 35-defect backlog is the lower-risk path for a WCAG 2.1 AA floor.

**Framework fit.** Ark UI imposes no CSS opinion. State is exposed via `data-scope`, `data-part`, and `data-state` attributes; Helios CSS variables drop straight into attribute selectors:

```css
[data-scope='dialog'][data-part='content'] {
  background: var(--token-color-surface-primary);
  border-radius: var(--token-border-radius-large);
}
```

There is no adapter layer, no Tailwind dependency, no token-renaming, and no styling engine to thread Helios values through. shadcn/ui by contrast requires Tailwind (the official docs explicitly require it; no maintainer-supported non-Tailwind mode exists), and components reference a fixed ~13-slot CSS variable surface (`--primary`, `--foreground`, `--background`, etc.) that you alias values into but cannot rename. For a project whose visual identity decision was explicitly "Helios tokens consumed as plain CSS custom properties," Ark UI is the natural shape; shadcn would commit the renderer to Tailwind v4 indefinitely and add an alias indirection layer on top of Helios.

**Upgrade model.** Ark UI is a conventional npm package — `pnpm up` for fixes, semver-managed breakages. shadcn's `shadcn add --overwrite` flow plus an experimental `diff` command is a real recurring tax compared to a versioned dependency.

### Positive Consequences

- Inherit Zag.js's WAI-ARIA-tested state machines for focus management, keyboard handling, and ARIA wiring across ~49 first-party components, including Combobox, Date Picker, Color Picker, Tree View, Carousel, Tags Input, and Pin Input that Radix lacks in core.
- Helios CSS variables consumed directly via `[data-scope][data-part]` selectors. No styling-engine intermediary; no Tailwind commitment.
- Standard semver upgrade path via pnpm. Bug fixes and a11y patches flow through `pnpm up`, not manual re-copy.
- Structurally backed by Chakra UI v3 (which is rewritten on top of Ark + Zag), so the maintenance footprint is not a single-engineer project.
- MIT-licensed at every layer (Ark UI, Zag.js). Cleanly AGPL-3.0-or-later compatible.

### Negative Consequences

- **Smaller community than Radix.** Ark UI has ~4.9k stars vs Radix's ~18k; Stack Overflow answers and copy-paste recipes are thinner. No shadcn-registry equivalent. We write more boilerplate per primitive (data-attribute selectors are explicit; no className convention is given).
- **No first-party Menubar, Navigation Menu, Toolbar, Context Menu, Aspect Ratio, Separator, Label, Form, or Alert Dialog.** Several are CSS one-liners on a `<hr>` or `<label>`. The application-shell primitives (Menubar, Navigation Menu, Context Menu) will need hand-rolling for an Electron app, likely as composition over Ark's `Menu` and `Popover`.
- **No headless table.** Pair Ark with TanStack Table (MIT) when a data-table is needed — this is the industry-standard split that shadcn also delegates to.
- **Real breaking changes in v5 minor versions.** Pin and read changelogs on every bump: DatePicker `formattedDate` was removed in v5.35; TimePicker was removed entirely from v5 because Zag couldn't resolve interaction bugs (a useful honesty signal but also evidence that FSM-backing is not a silver bullet).
- **APG conformance ≠ AT correctness.** We still own the NVDA / JAWS / VoiceOver / Orca audit per primitive.
- **`data-scope` / `data-part` selector style is unfamiliar** to contributors arriving from Radix/className conventions. Worth a CONTRIBUTING note once we start authoring components.
- **Bundle weight.** Ark UI is a conventional npm dep with ~63 `@zag-js/*` machines as transitive dependencies. Vite tree-shaking covers per-component imports (`import { Dialog } from '@ark-ui/react/dialog'`), but bundle audit will need a baseline measurement once the first stories ship.

## Pros and Cons of the Options

### Option 1 — Ark UI

- **Good**, because Zag.js's state-machine architecture makes ARIA, focus, and keyboard semantics testable and framework-neutral.
- **Good**, because there is no styling-engine assumption — Helios CSS variables drop straight into `[data-scope][data-part]` selectors.
- **Good**, because broader first-party component coverage than Radix (Combobox, DatePicker, TreeView, Carousel, etc.).
- **Good**, because semver-managed via `pnpm up`; no copy-paste maintenance.
- **Good**, because Chakra v3 is structurally backed on it, lowering bus-factor risk relative to Radix.
- **Bad**, because community size, recipe ecosystem, and "off-the-shelf" component count is smaller than shadcn+Radix.
- **Bad**, because the application-shell primitives (Menubar, Navigation Menu, Context Menu) need hand-rolling.
- **Bad**, because v5 minor versions have shipped real breakages.

### Option 2 — shadcn/ui + Radix

- **Good**, because the largest React-ecosystem recipe pool — copy-paste components, Stack Overflow coverage, blog posts, third-party templates.
- **Good**, because we own the wrapper source, so we can patch Radix a11y defects in our tree without waiting upstream.
- **Bad**, because Tailwind is required. Adopting shadcn means committing the renderer to Tailwind v4 indefinitely, with Helios tokens consumed as an alias layer underneath rather than as the public token API of our CSS. The Helios decision is best served by a primitives library that doesn't impose an intermediate styling engine.
- **Bad**, because the load-bearing dependency is Radix, which carries 35 documented a11y defects with no public remediation plan, plus open Dialog/Toast bugs at WCAG-violating severity. Even with our patch-in-tree option, we'd inherit a recurring a11y debt audit obligation.
- **Bad**, because upgrades require `shadcn add --overwrite` + manual reconciliation; `shadcn diff` is experimental.

### Option 3 — Radix Primitives directly

- **Good**, because no Tailwind dependency, no copy-paste maintenance — just an npm package.
- **Good**, because the largest React-primitives recipe pool around.
- **Bad**, because we still inherit the same Radix a11y backlog from Option 2 without shadcn's silver-lining (we'd no longer own the source to patch defects locally, short of forking).
- **Bad**, because Radix's stewardship trajectory (one-engineer-shaped project at WorkOS) compares unfavorably to Ark + Zag + Chakra v3's multi-maintainer footprint.

### Option 4 — React Aria Components

- **Good**, because Adobe Spectrum, Bluesky, and others ship on it — strong production track record with screen-reader users.
- **Good**, because the React Aria hooks layer underneath has independent value and is widely respected for AT correctness.
- **Good**, because Apache-2.0 is AGPL-compatible and on our allowlist.
- **Bad**, because component count is narrower than Ark UI's first-party set (no DatePicker / ColorPicker / Carousel / TreeView in the core RAC namespace — Adobe's separate `@react-spectrum/*` packages are tied to Spectrum styling).
- **Bad**, because the component API surface is more opinionated (slots, render props) — composition shapes are harder to wrap cleanly in our own component layer.
- **Bad**, because Adobe's roadmap is Spectrum-shaped; non-Spectrum consumers historically get less attention.
- **Acceptable**: this is the strongest runner-up. If Ark UI's stewardship deteriorates or Zag.js stagnates, RAC is the migration target to evaluate.

### Option 5 — Roll our own

- **Good**, because total control, no upstream coupling.
- **Bad**, because the cost is prohibitive. Focus management, focus-trap, roving tabindex, ARIA wiring, keyboard interaction patterns for combobox/select/menu/dialog are each weeks of work to do correctly — and we'd ship a worse a11y baseline than either Ark or RAC give us for free.

## Follow-up

- Install `@ark-ui/react` (latest `5.x`) as a runtime dependency in `package.json`. Pin to a major; do not auto-bump majors.
- Install the `@ark-ui/mcp` server in `.mcp.json` at project scope alongside `storybook-mcp`. Update [CLAUDE.md](../../../../CLAUDE.md) so agents call it during UI work — it's the source of truth for component anatomies and styling guidance.
- Regenerate [docs/licenses/in-use.md](../../../licenses/in-use.md) after install. Confirm `MIT` for `@ark-ui/react` and all `@zag-js/*` transitives, plus `Apache-2.0` for `@internationalized/date`.
- Decide token tooling (`stylelint-declaration-strict-value`, `storybook-design-token`) in a sibling ADR — that work is deferred to a follow-up turn.
- Audit the first three primitives we adopt (Dialog, Menu, Combobox) against NVDA, JAWS, VoiceOver, and Orca before declaring the primitives layer "in use." This is the [E2E a11y input-coverage](../../../../) contract — Zag/APG buys us a baseline, not coverage.
- Hand-roll Menubar, Navigation Menu, and Context Menu as composition over `Menu` + `Popover` when the app shell needs them. Document the patterns under [DESIGN.md](../../../../DESIGN.md) `Components`.
- Pair with TanStack Table (MIT) when a headless data table is needed.
- Re-evaluate React Aria Components as the migration target if Ark UI stewardship deteriorates or Zag.js stagnates.

## Links

- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Feature this enables: [Component Library](../../component-library/OVERVIEW.md) — the per-component wrapper + stories + a11y-test contract built on this decision.
- Sibling ADRs: [design-system-helios.md](./design-system-helios.md), [react-and-storybook.md](./react-and-storybook.md)
- Ark UI: <https://ark-ui.com/>, <https://github.com/chakra-ui/ark>
- Zag.js: <https://github.com/chakra-ui/zag>
- Radix Primitives a11y audit: <https://github.com/radix-ui/primitives/discussions/2232>
- Radix Dialog focus-guard bug: <https://github.com/radix-ui/primitives/issues/3593>
- Radix Toast aria-live bug: <https://github.com/radix-ui/primitives/issues/3634>
- WAI-ARIA APG: <https://www.w3.org/WAI/ARIA/apg/>
- Adrian Roselli on APG support claims: <https://adrianroselli.com/2023/04/no-apgs-support-charts-are-not-can-i-use-for-aria.html>
- MADR template: <https://adr.github.io/madr/>
