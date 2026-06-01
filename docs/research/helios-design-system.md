# Helios Design System

- **Project home:** <https://helios.hashicorp.design/>
- **Source:** <https://github.com/hashicorp/design-system> (monorepo)
- **License:** MPL-2.0 (file-level copyleft)
- **AGPL-3.0 compatibility verdict:** Compatible for the parts we consume. MPL-2.0 is on the project allowlist ([docs/licenses/in-use.md](../licenses/in-use.md)) — it imposes file-level copyleft on modified MPL files, but allows linking into a larger work under a different license (including AGPL-3.0). We consume **only the design tokens** (CSS files generated from `@hashicorp/design-system-tokens`). We do not modify the upstream files, so MPL's copyleft obligation reduces to: ship the unmodified MPL files alongside our distribution and preserve the license notice. The Ember-only components package is never installed and so is out of scope.

---

## 1. What It Is

Helios is HashiCorp's internal design system, open-sourced under MPL-2.0. It powers HashiCorp Cloud Platform, the HashiCorp Developer site, and the Terraform/Vault/Consul/Nomad/Boundary/Waypoint web UIs.

The system ships as a small monorepo of independently versioned npm packages:

| Package                               | Purpose                                                                             | Framework binding                  |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| `@hashicorp/design-system-tokens`     | Design tokens compiled to CSS custom properties (and helper classes)                | **None — plain CSS**               |
| `@hashicorp/design-system-components` | ~50 UI components (Button, Modal, Form, Table, etc.) built as an Ember Octane addon | **Ember.js only**                  |
| `@hashicorp/flight-icons`             | ~700 SVG icons shipped as raw SVG, SVG sprite, and React components                 | Plain SVG (any framework) or React |

The split matters: tokens and icons are framework-agnostic and consumable from any web app. The components package is structurally Ember — its template syntax, glimmer-component class hierarchy, and `hbs` templates are not portable to React without rewriting them top to bottom.

**Governance:** Maintained by HashiCorp's internal Design Systems team (multiple named maintainers visible on npm; not a single-author project). The bus factor is low. Active development — 504 GitHub stars, the repo was pushed to today (2026-05-27).

**Versioning:** Tokens are currently at `5.0.0` with a `6.0.0-rc` in flight. The package follows SemVer. Major bumps have historically involved renaming or restructuring token keys (e.g. the `3.0.0` and `4.0.0` lines); plan for periodic small migration work when bumping.

---

## 2. Why We Consume It

The HashiCorp Cloud Platform UI is one of the most polished accessibility-conscious enterprise web products in production. Their tokens encode that work: contrast ratios, focus-ring geometry, palette steps, typography scale. Adopting them gives us a credible visual identity without spending months designing one, and lets us inherit their color-contrast and focus-ring decisions wholesale.

The cost is also low: tokens are plain CSS variables. A single `@import` exposes them; uninstalling is a one-line revert.

What we are explicitly **not** adopting:

- The Ember component library (`@hashicorp/design-system-components`). The renderer is React (see [react-and-storybook ADR](../features/accessibility/adrs/react-and-storybook.md)). We re-implement components ourselves against an unstyled component library (likely shadcn/ui or Ark UI — undecided as of 2026-05-27, see [DESIGN.md](../../DESIGN.md)).
- Helios's interaction patterns or composition conventions, except as visual reference. Our components must conform to our own accessibility testing requirements ([E2E a11y input coverage](../../memory) — every flow tested under mouse, keyboard, screen reader, touch, and voice).
- Brand-coded tokens (e.g. `--token-color-palette-purple-*` exists for HashiCorp Vault). We use the neutral and semantic tokens; product-brand palettes are a visual reference at most.

---

## 3. What's In the Tokens Package

Layout of `@hashicorp/design-system-tokens@5.0.0`:

```
dist/
├── products/css/
│   ├── tokens.css            # the full token set as CSS custom properties on :root
│   └── helpers/
│       ├── colors.css        # utility classes like .hds-foreground-primary
│       ├── elevation.css
│       ├── typography.css
│       └── focus-ring.css
├── cloud-email/...           # variant for transactional email styling
└── docs/products/...         # variant tuned for the developer docs site
```

The package has **zero runtime dependencies**. Carbon Design System primitives (`@carbon/grid`, `@carbon/colors`, etc.) appear as devDependencies because Helios is built _from_ Carbon at the source level via Style Dictionary — but none of that ships in `dist/`. Installing the package adds CSS files and nothing else.

### 3.1 Token Categories (from `tokens.css`)

All tokens are CSS custom properties scoped to `:root`, prefixed `--token-`. Categories:

| Category       | Prefix                         | Example                                                      |
| -------------- | ------------------------------ | ------------------------------------------------------------ |
| Border radius  | `--token-border-radius-*`      | `--token-border-radius-medium: 6px`                          |
| Color palette  | `--token-color-palette-*`      | `--token-color-palette-blue-300: #0c56e9`                    |
| Color semantic | `--token-color-*` (no palette) | `--token-color-border-critical: #fbd4d4`                     |
| Color focus    | `--token-color-focus-*`        | `--token-color-focus-action-internal: #0c56e9`               |
| Typography     | `--token-typography-*`         | font stacks, weights, sized display/body/code scales         |
| Elevation      | `--token-elevation-*`          | box-shadow values                                            |
| Surface        | `--token-surface-*`            | composite border + shadow recipes for interactive surfaces   |
| Component      | `--token-{component}-*`        | e.g. `--token-form-`, `--token-pagination-`, `--token-tabs-` |

The semantic-color layer (e.g. `--token-color-border-critical`) is what application code should reference. The palette layer is the raw color space; touching it directly bypasses the semantic mapping and is a smell.

### 3.2 Helper Classes (optional)

`helpers/colors.css` etc. expose utility classes like `.hds-foreground-primary`. These exist for the Ember component library's internal use and as a convenience for HTML-only consumers. For a React app authoring its own components, **prefer referencing the `--token-*` variables directly** in component CSS — utility classes drag in a naming convention (`hds-*`) that has no meaning to our codebase and that we'd be free-riding on.

---

## 4. Accessibility Posture

From Helios's [accessibility statement](https://helios.hashicorp.design/about/accessibility-statement):

- **Target:** WCAG 2.2 Level AA (internal policy).
- **Testing:** manual passes with VoiceOver (Safari/macOS), JAWS (Chrome/Edge on Windows), NVDA (Firefox on Windows); automated checks via `ember-template-lint` and `ember-a11y-testing`.
- **Known gaps:** individual component pages document component-level WCAG gaps; the team acknowledges "some limitations of browser technology" can prevent full conformance.

**Relevance to us:** the _tokens_ layer's a11y contribution is contrast ratios and focus-ring geometry. The semantic color tokens (`--token-color-foreground-*`, `--token-color-border-*`) are the visible result of HashiCorp's contrast work — they pair foreground/background ratios that meet WCAG AA. Adopting them gives us AA contrast for free, provided we use the semantic tokens as paired (foreground X on surface Y), not in arbitrary combinations.

Helios's component-level a11y work does **not** transfer to us — that lives in the Ember templates we are not consuming. Every React component we build must clear its own a11y bar via the testing requirements in [E2E a11y input coverage](../../memory) and the static layer from `eslint-plugin-jsx-a11y`.

---

## 5. License Mechanics (MPL-2.0)

MPL-2.0 is file-level copyleft: modifications to MPL-licensed _source files_ must be released under MPL, but a larger work that _includes_ unmodified MPL files can be distributed under a different license (including AGPL-3.0). The MPL FAQ confirms compatibility with secondary licenses including GPL-family.

**What this means for us:**

1. We `pnpm add @hashicorp/design-system-tokens` and consume the unmodified CSS files. No copyleft obligation triggers because we have not modified any MPL file.
2. We must preserve the upstream LICENSE notice. `license-checker` already enforces this; the production-dependency license summary in [in-use.md](../licenses/in-use.md) will list `MPL-2.0` once the package is installed.
3. If we ever _fork_ a Helios token file and edit it in-tree (e.g. to override a value), the modified file remains under MPL-2.0. The rest of our codebase is unaffected.
4. The Ember components package is also MPL-2.0 but is moot — we do not install it.

**Verdict:** clean adoption. Add `MPL-2.0` to the allowlist in `.github/workflows/ci.yml` if it isn't already, regenerate the in-use snapshot after install, and continue.

---

## 6. Practical Consumption

### 6.1 Install and import

```bash
pnpm add @hashicorp/design-system-tokens
```

In the renderer's root stylesheet:

```css
@import '@hashicorp/design-system-tokens/dist/products/css/tokens.css';
```

This defines `--token-*` on `:root`. Component styles reference them:

```css
.notebook-button-primary {
  background: var(--token-color-foreground-action);
  color: var(--token-color-palette-neutral-0);
  border-radius: var(--token-border-radius-medium);
  /* ... */
}
```

### 6.2 Pinning strategy

Pin to a single major (`^5.0.0`). Token majors have historically shipped breaking renames. When a new major lands, run a grep for `--token-` references and migrate intentionally — do not auto-bump.

### 6.3 What to do when a token is missing

If a value we need isn't expressed as a Helios token (e.g. a custom z-index scale, a notebook-specific spacing rhythm), **add it as a notebook-app token in our own stylesheet**, not as a magic number in the component. Keep the boundary clean: Helios provides the shared design vocabulary; we extend it with app-specific tokens under a different prefix (e.g. `--notebook-*`).

---

## 7. Open Questions

- **Unstyled component library:** undecided between shadcn/ui (copy-paste, Radix-based, MIT) and Ark UI (npm package, framework-agnostic primitives, MIT). Both are AGPL-compatible. Both meet WAI-ARIA APG patterns. This decision is tracked separately and will land in an ADR before the first component ships. See [DESIGN.md](../../DESIGN.md).
- **Dark mode:** Helios tokens have light-mode values only at the `:root` scope in `tokens.css`. The team has shipped dark variants in some places (e.g. the developer-docs build under `dist/docs/`). If we need dark mode, we should evaluate whether Helios's dark tokens are sufficient or whether we extend our own.
- **Token version migration cost:** the `6.0.0-rc` line is in flight. Worth a follow-up read once it ships GA to confirm migration impact.

---

## 8. Footnotes / Sources

- Helios homepage: <https://helios.hashicorp.design/>
- Foundations / Tokens: <https://helios.hashicorp.design/foundations/tokens>
- Accessibility statement: <https://helios.hashicorp.design/about/accessibility-statement>
- Source repo: <https://github.com/hashicorp/design-system>
- Tokens package README: <https://github.com/hashicorp/design-system/blob/main/packages/tokens/README.md>
- MPL-2.0 FAQ: <https://www.mozilla.org/en-US/MPL/2.0/FAQ/>
