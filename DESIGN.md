---
version: alpha
name: notebook-app
description: Accessibility-first, local-first note-taking app for academics. Visual identity inherited from HashiCorp's Helios Design System (tokens only).
colors:
  primary: '#0c56e9'
  secondary: '#3b3d45'
  tertiary: '#7b00db'
  neutral: '#fafafa'
  surface: '#ffffff'
  on-surface: '#0c0c0e'
  success: '#00781e'
  warning: '#bb5a00'
  error: '#c00005'
  border: '#656a7633'
  focus-ring: '#0c56e9'
typography:
  display-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.27
  display-md:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.33
  display-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: -0.5px
  body-lg:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.38
  code:
    fontFamily: ui-monospace, Menlo, Consolas, monospace
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
rounded:
  none: 0px
  sm: 3px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
---

# DESIGN.md — notebook-app

This document is the visual-identity contract for `notebook-app`. It follows the [DESIGN.md spec](https://github.com/google-labs-code/design.md). The token frontmatter above is a curated, human-readable subset of the runtime values; the runtime source of truth is `@hashicorp/design-system-tokens` consumed as CSS custom properties (the full `--token-*` set). See [docs/research/helios-design-system.md](docs/research/helios-design-system.md) for the adoption rationale and [docs/features/accessibility/adrs/design-system-helios.md](docs/features/accessibility/adrs/design-system-helios.md) for the decision record.

## Overview

`notebook-app` is a note-taking application for academics with disabilities — primarily ADHD and Autism, with screen-reader users as a first-class audience. The visual personality is **calm, dense-but-readable, and predictable**. It is not playful. It is not minimalist-for-its-own-sake. It looks like a tool that a researcher will open every working day for years.

Three brand qualities shape every visual decision:

- **Stable.** Layout does not shift. Focus does not jump. Animations are short, motion-reduced where the OS asks, and never decorative.
- **Honest.** A button looks like a button. A link looks like a link. Color is informational, not ornamental. Iconography supplements text labels; it never replaces them.
- **Cognitively quiet.** Visual hierarchy carries meaning; surfaces are mostly neutral; the eye is drawn to content, not chrome.

The visual language is borrowed wholesale from HashiCorp's Helios Design System — a system built for enterprise infrastructure dashboards, where the same calm-density-clarity priorities apply. We consume its tokens unchanged; the component implementations are our own.

## Colors

The palette is rooted in HashiCorp's neutral scale and a small set of semantic accents. Color is used to **classify**, not to decorate: an action color, a critical color, a warning color, a success color, and a deliberately narrow brand accent.

- **Primary (`#0c56e9`):** HashiCorp blue, used for primary actions, the active state of interactive controls, and the keyboard focus ring. Reserved for the single most important action per screen.
- **Secondary (`#3b3d45`):** Strong neutral. Used for primary body text, headings, and the "strong" border variant.
- **Tertiary (`#7b00db`):** Used very sparingly for highlights and the read-along reading cursor. Reserved for genuinely novel UI affordances; never for routine actions.
- **Neutral (`#fafafa`):** Page background in light mode. Calm warm-cool-neutral; not pure white.
- **Surface (`#ffffff`):** Card and panel background; sits above the page neutral.
- **On-surface (`#0c0c0e`):** Highest-contrast text color. Used for primary content.
- **Success (`#00781e`):** Save-succeeded, sync-complete, test-pass states.
- **Warning (`#bb5a00`):** Recoverable degradation; "you can continue, but check this."
- **Error (`#c00005`):** Hard failure; user input rejected; data not saved.
- **Border (`#656a7633`):** Default border on cards, dividers, and form inputs. Low contrast by design — borders should not compete with content.
- **Focus-ring (`#0c56e9`):** Identical to primary, by intent. The focus ring is the most important interactive affordance in this app; it shares the action color to maximize learnability.

**Pairings.** The token frontmatter lists single colors; the runtime CSS provides the _semantic_ foreground/background pairings (e.g. `--token-color-foreground-action` on `--token-color-surface-primary`). Application code must reference the semantic tokens, not the raw palette — that's how WCAG AA contrast holds.

**What we don't use.** Helios ships product-brand palettes for HashiCorp Vault (purple), Consul (pink), Terraform (purple), etc. These are not for us. Use only the neutrals and the semantic colors above. The brand-coded palettes are visible in the underlying `--token-color-palette-*` namespace but should not appear in component CSS.

## Typography

The type system uses **the operating system's default sans-serif stack** for body and display, and a monospace stack for code. This is a deliberate choice: bundling a custom webfont would add network or disk weight for almost no perceptual gain in an Electron app where the OS font is already loaded, and would degrade rendering quality on Windows where ClearType is tuned for system fonts.

The scale is dense by web standards (`body-md` at 14px) because the primary use is **reading long-form notes for hours at a time**, and a dense scale fits more content in the viewport without scrolling. Users who need larger text use OS-level scaling, which works correctly because all values are `rem`-derived.

- **Display levels** (`display-sm` / `display-md` / `display-lg`) are for headings within a document or panel header. Use Markdown heading levels semantically; the visual size mapping happens in CSS.
- **Body levels** (`body-sm` / `body-md` / `body-lg`) are for content. `body-md` is the default. `body-lg` is for the editor's primary writing surface where readability beats density.
- **Code** is for inline code spans and code blocks. Monospace stack; same `body-md` size and line-height.

Font weights available: `400` regular, `500` medium, `600` semibold, `700` bold. Do not use more than two weights on a single screen.

## Layout

The app uses a **left sidebar + main content** shell at the top level: a navigation rail for projects/library/inbox/timers on the left, content in the center, an optional contextual panel on the right (for AI chat, properties, etc.).

Spacing follows an **8px base scale** with a 4px half-step for micro-adjustments. The scale (`xs`/`sm`/`md`/`lg`/`xl`/`xxl`) maps to `4`/`8`/`16`/`24`/`32`/`48` pixels. Component internal padding defaults to `md` (16px); card padding defaults to `lg` (24px).

There is no fixed grid system. Most surfaces are single-column with flex layouts; the editor is a max-width container (~720px reading width) centered in the main content area, with the option for wider for users who want it.

**Breakpoints.** This is an Electron desktop app first. The window is resizable but has a sensible minimum width (~960px). We do not design mobile layouts (the mobile app is a v3.0 roadmap item with its own design treatment).

## Elevation & Depth

The system uses **light, ambient elevation** rather than dramatic drop shadows. Five levels:

- **inset** — pressed buttons, depressed surfaces. Inner shadow.
- **low** — cards and panels at rest.
- **mid** — popovers, dropdowns.
- **high** — modals, sheets.
- **higher / overlay** — dialogs that overlay everything, including the OS window chrome.

Elevation conveys interactivity (a button rises slightly on hover) but is never the _only_ signal — color and border weight change in concert with elevation so that screen-reader users (who see no shadow) and high-contrast-mode users (where shadows may not render) still perceive the state change.

`prefers-reduced-motion: reduce` disables elevation _transitions_ (shadows still render at their resting values, but the change is instant). Reduced-motion users get the structure without the visual movement.

## Shapes

The shape language is **modest sharpness**:

- **3px** (`rounded.sm`) for inline elements, badges, and small form controls.
- **6px** (`rounded.md`) — the default — for buttons, inputs, and cards.
- **8px** (`rounded.lg`) for larger surfaces like modals and major panels.
- **9999px** (`rounded.full`) for pill-shaped tags, avatars, and toggle switches.

Do not mix rounded and sharp corners on the same surface. Do not use `rounded.lg` on small elements; it looks loose.

## Components

We **do not** ship anyone else's component implementation. Components are our own React components, built on top of an unstyled-primitives library and styled against Helios tokens. The primitives library decision (likely **shadcn/ui** or **Ark UI** — undecided as of 2026-05-27) is tracked in [docs/features/accessibility/adrs/design-system-helios.md#follow-up](docs/features/accessibility/adrs/design-system-helios.md).

Components must, without exception:

- Be **keyboard reachable** end-to-end. Every interactive affordance has a focus state that uses the focus-ring token.
- Be **screen-reader announceable** with correct roles, names, and states. Tested with VoiceOver, NVDA, and JAWS — see the [E2E a11y input-coverage memory](C:/Users/Bradley/.claude/projects/E--Bradley-Documents-VSCodeProjects-notebook-app/memory/e2e_a11y_input_coverage.md).
- **Respect `prefers-reduced-motion`** for any transition longer than 200ms or any motion that translates position.
- Use **semantic tokens** (`--token-color-foreground-*`, `--token-color-border-*`, etc.) not raw palette values.

Specific component conventions will be added below as the component library lands. The frontmatter `components:` block is intentionally empty at the moment; populate it as we make component-token decisions (e.g. `button-primary.backgroundColor: "{colors.primary}"`).

## Do's and Don'ts

- **Do** use the `primary` color for one action per screen — the most important one.
- **Do** maintain WCAG 2.1 AA contrast (4.5:1 for normal text, 3:1 for large text and UI components) by using paired semantic tokens, not arbitrary color combinations.
- **Do** treat the focus ring as load-bearing UX. Never set `outline: none` without a replacement focus indicator that meets contrast and visibility requirements.
- **Do** add app-specific tokens under a `--notebook-*` prefix when Helios doesn't cover the case (e.g. editor-specific colors, custom z-index layers).
- **Don't** reach into `--token-color-palette-*` directly. Use the semantic layer.
- **Don't** use HashiCorp's product-brand palettes (Vault purple, Consul pink, etc.). They have semantic meaning in their context that conflicts with ours.
- **Don't** introduce a new font family without a documented reason. The OS-native stack is the default and the bar is high.
- **Don't** rely on color alone to convey state (success/warning/error). Pair color with an icon and/or a text label.
- **Don't** mix `rounded.sm`, `md`, and `lg` on the same surface; pick one rounding scale per visual cluster.
- **Don't** use animations for decoration. Motion communicates state change; if there's no state change, hold still.
