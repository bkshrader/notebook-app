## Adopt the Helios Design System (tokens only) as the visual foundation

- Status: accepted
- Date: 2026-05-27
- Deciders: Bradley Shrader
- Tags: accessibility, design-system, frontend, licensing

## Context and Problem Statement

`notebook-app` is accessibility-first ([see accessibility OVERVIEW](../OVERVIEW.md)) and pre-implementation on the UI surface. The renderer is React with Storybook ([see react-and-storybook ADR](./react-and-storybook.md)), but no design language has been chosen — colors, spacing, typography, focus-ring geometry, and elevation are all undefined.

Defining a complete design language in-house is a multi-month effort that this project does not have budget for, and getting accessible color contrast right empirically is harder than it looks. We want a credible visual identity that we can adopt wholesale, with the option to extend.

At the same time, we have already decided not to build a UI in any framework other than React, and we have specifically decided to compose unstyled-primitive libraries (likely shadcn/ui or Ark UI — see Follow-up) rather than adopt anyone else's styled component set. So whatever design system we pick must be useful **as tokens**, independent of its component implementation.

## Decision Drivers

- WCAG 2.1 AA is non-negotiable ([accessibility OVERVIEW](../OVERVIEW.md)). The color palette must ship paired foreground/background tokens that meet AA contrast; the focus-ring tokens must be visible against every surface.
- AGPL-3.0-or-later compatibility ([in-use.md](../../../licenses/in-use.md)). Anything shipped in the app must be on the allowlist.
- React + unstyled-primitives architecture ([react-and-storybook ADR](./react-and-storybook.md), DESIGN.md). The system must be consumable **without** its component implementation — we are writing our own components.
- Low adoption cost. Tokens should be a single import; uninstalling should be reversible in one commit.
- Maintained, with named maintainers and recent activity. Solo-author abandonment is a known risk.
- We do not want to invent a color palette or contrast scale from scratch.

## Considered Options

1. **Helios Design System (HashiCorp) — tokens only.** Consume `@hashicorp/design-system-tokens` as CSS variables. Ignore the Ember component package.
2. **Radix Colors + custom token layer.** Adopt Radix's accessible color scales, hand-author spacing/typography/elevation tokens.
3. **Material Design 3 tokens.** Adopt MD3's `@material/web` tokens.
4. **Tailwind's design tokens (via `tailwindcss`).** Use Tailwind's default scale as the source of design values.
5. **Roll our own.** Define every token in-house.

## Decision Outcome

Chosen option: **Option 1 — Helios Design System, tokens only.**

Helios's tokens encode the contrast and focus-ring work behind HashiCorp's Cloud Platform UI, which is one of the more polished accessibility-conscious enterprise web products in production ([helios-design-system reference](../../../research/helios-design-system.md)). Adopting them gives us AA-grade contrast pairings, a coherent neutral palette, semantic tokens (foreground/border/surface/critical/success/warning), focus-ring geometry, and a typography scale — for the cost of one `pnpm add` and one `@import`.

Critically, the tokens package is **structurally framework-agnostic**: it ships plain CSS files with zero runtime dependencies. The Ember component library that lives alongside it in the same monorepo is irrelevant to us — we do not install it, we do not import from it, and our component implementation remains entirely our own.

The license is MPL-2.0 (file-level copyleft), which is on the existing AGPL-3.0-compatible allowlist. Because we consume unmodified files, MPL's copyleft obligations reduce to preserving the LICENSE notice — the rest of our codebase is unaffected.

### Positive Consequences

- Immediate access to a credible, accessibility-tested visual identity without a months-long design effort.
- WCAG AA contrast comes for free if we use semantic tokens as paired (foreground X on surface Y).
- Tokens are CSS variables — accessible to component CSS, Storybook, and any future themed surface (print, transactional email) without a JS runtime cost.
- Reversible: tokens are a single import. Switching design systems later is a global find-and-replace, not a re-architecture.
- No coupling to the Ember component implementation — our component library decision (shadcn/ui vs. Ark UI vs. other) remains open and independent.

### Negative Consequences

- Helios is HashiCorp's brand language. Some tokens (e.g. `--token-color-palette-purple-*` mapped to Vault) carry product associations we do not need. Mitigation: prefer the semantic tokens (`--token-color-foreground-*`, etc.) over the raw palette; treat brand-coded palettes as a visual reference at most.
- Major-version bumps have historically renamed token keys (e.g. the 3.0 and 4.0 lines). We will need to migrate intentionally on each major. Pin to a single major (`^5.0.0`); do not auto-bump.
- We inherit no component-level a11y from Helios — that lives in the Ember templates we are not using. Every React component still has to clear its own a11y bar via the testing requirements in [E2E a11y input coverage](../../../../).
- Helios's dark-mode token coverage is incomplete in the products build. If we ship dark mode, we may need to extend in-house.
- MPL-2.0 adds a new license to the production-dependency surface. The allowlist already accepts MPL-2.0, but the [in-use.md](../../../licenses/in-use.md) snapshot must be regenerated on install.

## Pros and Cons of the Options

### Option 1 — Helios (tokens only)

- **Good**, because the tokens encode HashiCorp's accessibility work (contrast, focus-ring) and we inherit it for free.
- **Good**, because the package has zero runtime dependencies and ships plain CSS — no framework coupling.
- **Good**, because MPL-2.0 is already on the AGPL-compatible allowlist; license review is a formality.
- **Good**, because adoption and rollback are both single-commit operations.
- **Bad**, because some tokens carry HashiCorp product-brand semantics we have to ignore.
- **Bad**, because major-version bumps have historically required token-key migrations.

### Option 2 — Radix Colors + custom token layer

- **Good**, because Radix Colors is purpose-built for accessible contrast pairings, and Radix is widely respected in the React ecosystem.
- **Bad**, because spacing/typography/elevation/focus-ring tokens would all still need to be hand-authored. The labor-saving is partial.
- **Bad**, because we would be assembling a design system rather than adopting one — more places to get it wrong.

### Option 3 — Material Design 3 tokens

- **Good**, because MD3 has extensive accessibility documentation and Google has done the contrast work.
- **Bad**, because Material's visual language is strongly associated with Google/Android products. For an academic note-taking app, this is a brand mismatch.
- **Bad**, because MD3 token consumption is most natural through `@material/web`, which couples to Material Web Components — a framework boundary we'd rather not cross.

### Option 4 — Tailwind tokens

- **Good**, because Tailwind's defaults are well-known and well-tested.
- **Bad**, because Tailwind's design tokens are not WCAG-conformance-tested as pairings; they're a starting palette, not an accessibility-engineered system.
- **Bad**, because adopting Tailwind's tokens typically means adopting Tailwind, which is a much larger architectural commitment than the question being asked.

### Option 5 — Roll our own

- **Good**, because total control and no upstream coupling.
- **Bad**, because empirically getting AA-grade contrast across a full semantic-color system is a months-long task with iteration; we don't have that budget and would likely ship something weaker than Helios's existing work.
- **Bad**, because we'd be re-deriving solved problems (focus-ring contrast against every surface, neutral-palette steps that preserve contrast across light/dark) instead of building features.

## Follow-up

- Add `@hashicorp/design-system-tokens` (latest `5.x`) to `package.json` when the first React component lands. Pin to a single major.
- Regenerate [docs/licenses/in-use.md](../../../licenses/in-use.md) after install and confirm `MPL-2.0` appears in the dependency tree.
- ~~Choose between **shadcn/ui** and **Ark UI** (or another unstyled-primitives option) before the first interactive component ships, and write a sibling ADR.~~ **Resolved 2026-05-30: Ark UI** ([unstyled-primitives-ark ADR](./unstyled-primitives-ark.md)).
- Evaluate Helios's dark-mode token coverage when dark mode is scoped (post-v1.0). May require extending with notebook-specific dark tokens under a `--notebook-*` prefix.
- Watch `@hashicorp/design-system-tokens@6.0.0` (currently in RC). Re-read migration notes before bumping; do not auto-bump majors.
- Update [DESIGN.md](../../../../DESIGN.md) when the unstyled-primitives library is chosen and when first real component conventions land.

## Links

- Project charter: [accessibility OVERVIEW](../OVERVIEW.md)
- Reference: [helios-design-system](../../../research/helios-design-system.md)
- Design spec: [DESIGN.md](../../../../DESIGN.md)
- Sibling ADR: [react-and-storybook.md](./react-and-storybook.md)
- License policy: [docs/licenses/in-use.md](../../../licenses/in-use.md)
- MADR template: <https://adr.github.io/madr/>
