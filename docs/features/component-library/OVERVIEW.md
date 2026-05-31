# Component Library

**Version:** 1.0 (foundation)

The **Component Library** is our in-repo set of accessible React UI primitives — the
building blocks every interactive surface of the app is assembled from. Each primitive
is a thin, token-styled wrapper over an [Ark UI](https://ark-ui.com/) headless component,
documented and tested in Storybook.

> **Terminology:** "Component Library" here is the developer-facing UI toolkit (React
> components under `src/renderer/src/components/`). It is **not** the user-facing
> [Library](../../GLOSSARY.md#library) (the user's note collection). When the capitalized
> term **Library** appears in product prose it always means the note collection; the UI
> toolkit is always written "Component Library" in full.

## Why

The [unstyled-primitives-ark ADR](../accessibility/adrs/unstyled-primitives-ark.md) chose
Ark UI as our headless primitives layer and mandates three things that this feature
delivers:

1. **We own the React wrappers.** Ark is headless; we wrap each primitive in our own
   `forwardRef` component so the app imports a stable, app-shaped API — not Ark directly.
2. **We style via `[data-scope][data-part]` selectors with Helios `--token-*` variables.**
   No custom class names, no styling engine. See the
   [design-system-helios ADR](../accessibility/adrs/design-system-helios.md) and the
   repo-root [`DESIGN.md`](../../../DESIGN.md).
3. **We audit every adopted primitive.** Ark's Zag/APG baseline is a floor, not coverage
   ([accessibility OVERVIEW](../accessibility/OVERVIEW.md)). Every component ships a
   Storybook play test that drives its keyboard contract, and the
   [`a11y.test: 'error'`](../../../.storybook/preview.tsx) gate runs axe on every story —
   failing the suite on any WCAG 2.1 AA violation.

## The per-component contract

Each component lives in `src/renderer/src/components/<Pascal>/` with four files:

| File                   | Responsibility                                                            |
| ---------------------- | ------------------------------------------------------------------------- |
| `<Pascal>.tsx`         | `forwardRef` wrapper composing the Ark parts; requires an accessible name |
| `<Pascal>.css`         | Token-only styling on `[data-scope][data-part]` selectors                 |
| `<Pascal>.stories.tsx` | CSF3 stories: `Default` + ≥1 variant + a tier-appropriate `play` test     |
| `index.ts`             | Per-component barrel re-exporting the component and its props type        |

**CSS rules** (enforced by stylelint + the runtime gate):

- Every value resolves to a Helios `--token-*` custom property — no hex/rgb/named colors,
  no hardcoded font sizes or durations, never `--token-color-palette-*` (semantic tokens
  only).
- The focus ring is applied **only** on keyboard focus (`[data-focus-visible]`), paired
  with `outline: none` on the same selector.
- Every transition/animation is suppressed under reduced motion via **both** the
  `prefers-reduced-motion` media query **and** the `[data-reduced-motion='reduce']`
  attribute the Storybook toolbar sets (each animated selector gets its own reset —
  the stylelint a11y rule matches per-selector).
- Logical properties and units throughout (`inline-size`, `padding-block`, `vi`/`vb`).

**Play-test rules:**

- Drive the real keyboard path for the component's APG pattern (not a click); `await`
  every `expect`/`userEvent`.
- Ark v5 form controls render a visually-hidden **native** input, so query by its real
  role (switch/checkbox → `checkbox`, radio → `radio`, select → `combobox`) and read
  `data-state` off the presentational `[data-part]` element.
- Overlays (dialog, drawer, popover, menu, …) render in a Portal **outside** the story
  canvas — query the panel via `document.body`/`screen`, and wait out enter/exit
  animations with `findByRole`/`waitFor` rather than racing them.
- Never call axe manually; the preview's `a11y.test: 'error'` runs it automatically.

## Complexity tiers

The test contract scales with the widget's interaction surface:

- **Tier A — simple interactive** (switch, checkbox, radio-group, slider, tabs, accordion,
  number-input, …): keyboard-drives the primary interaction + asserts state and a
  computed-style backstop.
- **Tier A-display — presentational** (avatar, progress, qr-code, json-tree-view, …):
  asserts the ARIA contract (role / `aria-valuenow` / structure) only; no key-nav or
  pointer-drag simulation.
- **Tier B — overlays** (dialog, drawer, popover, hover-card, tooltip, menu,
  navigation-menu, floating-panel, tour): keyboard-open, focus-trap entry, `Esc` close,
  focus restore — queried via `document.body`.
- **Tier C — collection/data** (select, combobox, listbox, tree-view, tags-input): inline
  static item fixtures via the v5 `createListCollection` API; keyboard selection/expansion.
- **Tier D — i18n / canvas / motion** (date-picker, date-input, color-picker, file-upload,
  carousel, marquee): date-\* consume [`@internationalized/date`](../../licenses/in-use.md);
  carousel/marquee must stop autoplay under reduced motion (asserted).
- **Tier E — provider-shaped** (toast): `createToaster` + a `Toaster` host; asserts the
  toast lands in a live region and is keyboard-dismissible.

## Scope

In scope: every interactive Ark primitive plus `field`, `fieldset`, and `highlight`.

**Deliberately excluded:**

- **Utility/provider primitives** (no stories): `format`, `portal`, `presence`,
  `focus-trap`, `collection`, `environment`, `locale`, `frame`, `client-only` — these are
  composition helpers, not user-facing widgets.
- **`signature-pad`** — a freehand drawing canvas; its core interaction is pointer-drag,
  which we cannot meaningfully assert under the keyboard/a11y contract.
- **`time-picker`** — removed from Ark v5 (Zag could not resolve its interaction bugs), so
  it is not installed.

## Relevant Documentation

- [unstyled-primitives-ark ADR](../accessibility/adrs/unstyled-primitives-ark.md) — why Ark UI.
- [design-system-helios ADR](../accessibility/adrs/design-system-helios.md) — token-only styling.
- [accessibility OVERVIEW](../accessibility/OVERVIEW.md) — the WCAG 2.1 AA floor this enforces.
- [`DESIGN.md`](../../../DESIGN.md) — the visual contract.
- [Ark UI research](../../research/helios-design-system.md) — Helios token consumption.
