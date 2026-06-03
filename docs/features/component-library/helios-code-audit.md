# Helios audit — Code Block & Code Editor

Verification of our `CodeBlock` and `CodeEditor` components against the **authoritative
Helios Design System documentation** (the source of truth). The live Helios docs were driven
in a browser (Playwright) and read across the Guidelines, Specifications, and Accessibility
tabs, plus the live `.hds-code-*` CSS; each documented variant, state, anatomy element, and
keyboard binding is listed below as **implemented-and-matching** or an **explicit deviation
with rationale**.

- Helios Code Block: <https://helios.hashicorp.design/components/code-block>
- Helios Code Editor: <https://helios.hashicorp.design/components/code-editor>
- Implementation substrate: **CodeMirror 6** (MIT) — the project's decided editor substrate
  (`docs/research/codemirror.md`), used for both components (locked decision). Helios's own
  Code Block renders on Prism.js and its Code Editor on CodeMirror; building Code Block on a
  read-only CM6 instance is our one substrate deviation (rationale below).

Audited on 2026-06-03 against Helios Code Block "Updated in v6.2.1" and the current Code
Editor docs.

---

## Code Block

| Helios documented item                                                                                                        | Status                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read-only display of formatted, syntax-highlighted code                                                                       | ✅ matching            | Read-only CM6 `EditorView` (`EditorState.readOnly` + `EditorView.editable.of(false)`); caret hidden via `caret-color: transparent`.                                                                                                                                                                                                                                                                                                              |
| **`isStandalone`** (portability; rounds corners)                                                                              | ✅ matching            | `isStandalone` prop (default `true`) → `data-standalone` → `border-radius: --token-border-radius-medium`.                                                                                                                                                                                                                                                                                                                                        |
| **Header** — title and/or description, both optional                                                                          | ✅ matching            | `title` / `description` props; `CodeBlockHeader` renders nothing when both absent.                                                                                                                                                                                                                                                                                                                                                               |
| **CopyButton**                                                                                                                | ✅ matching            | Reuses our `Clipboard` component (Ark) as the copy control; floats top-end over the scroll region.                                                                                                                                                                                                                                                                                                                                               |
| **Line numbers**                                                                                                              | ✅ matching            | `showLineNumbers` → CM6 `lineNumbers()` gutter.                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Line highlighting** — single, multiple, or a range                                                                          | ✅ matching            | `highlightLines` accepts line numbers and/or `[start, end]` ranges, normalized and applied as `Decoration.line` (`data-line-highlight`, tinted `--token-color-surface-highlight`).                                                                                                                                                                                                                                                               |
| **`maxHeight` + height toggle** — "Show more code" appears only when content overflows; toggles back; footer holds the button | ✅ matching            | `maxHeight` caps the scroll region; `useHeightToggle` measures overflow (ResizeObserver, re-measures once CM mounts) and renders the footer `<button>` only when clipped; activating expands, again collapses. Labels "Show more code" / "Show less code", `aria-expanded` + `aria-controls`.                                                                                                                                                    |
| **Language** (syntax highlighting)                                                                                            | ✅ matching            | `language` accepts a known key (`json`, `javascript`, `jsx`, `typescript`, `tsx`, `plaintext`) or a raw CM `Extension`.                                                                                                                                                                                                                                                                                                                          |
| Syntax colors use a **generic, language-agnostic** scheme (Helios: "cyan/red/purple")                                         | ✅ matching, by design | Helios publishes **no semantic syntax-color tokens** — only generic hues + `code-*` typography. We map Lezer highlight tags onto Helios **semantic foreground tokens** (`foreground-action` keywords, `foreground-success` strings, `foreground-highlight` numbers, `foreground-faint` comments, `foreground-critical` invalid, …). This keeps colors token-only (stylelint), theme-aware, and contrast-checked while staying language-agnostic. |
| Typography: code font                                                                                                         | ✅ matching            | `--token-typography-code-200-*`.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Not** a full code editor / terminal                                                                                         | ✅ matching            | Read-only; no editing affordances.                                                                                                                                                                                                                                                                                                                                                                                                               |

**Accessibility (Helios "Conformant"):** the documented criteria — 1.3.1, 1.3.2, 1.4.1
(color not the sole means), 1.4.3 (4.5:1), 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.1.1, **2.1.2 (no
keyboard trap)**, 2.4.3, **2.4.7 (focus visible)**, **4.1.2 (name/role/value)** — are all
addressed: required `ariaLabel` on `.cm-content` (4.1.2), tab-focus mode so Tab escapes
(2.1.2), native `:focus-visible` ring (2.4.7), and — beyond the Helios reference — the
height-capped scroll region is a focusable `role="group"` with an accessible name so keyboard
users can scroll clipped code (2.1.1 / axe `scrollable-region-focusable`). Syntax meaning never
relies on color alone (1.4.1). axe runs clean on every story.

### Code Block deviations (explicit)

1. **Substrate: read-only CM6 instead of Prism.js.** Helios's Ember Code Block uses Prism;
   we render a read-only CodeMirror 6 `EditorView`. Rationale: a single highlighting engine
   across the Component Library (Code Block + Code Editor share one), and CM6's contenteditable
   substrate is the accessibility-stronger choice (`docs/research/codemirror.md`). Visual output
   is audited against the Helios Prism reference; the anatomy, states, and a11y contract are
   unchanged.
2. **Syntax-color mapping to semantic tokens** (see table) — required because Helios exposes no
   semantic syntax-color tokens and our stylelint rules forbid raw literals / palette tokens.

---

## Code Editor

| Helios documented item                                                                                                                                                          | Status                 | Notes                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Editable code with syntax highlighting, change history, keyboard navigation                                                                                                     | ✅ matching            | Editable CM6 `EditorView` + `history()` + `defaultKeymap`/`historyKeymap`/`searchKeymap`.                                                                                                  |
| **`isStandalone`** (portability; rounds corners)                                                                                                                                | ✅ matching            | `isStandalone` (default `true`) → `data-standalone` → `border-radius: --token-border-radius-medium`.                                                                                       |
| **Header — three toggleable sections:** text (title + description), secondary-actions container, custom primary-actions section                                                 | ✅ matching            | `CodeEditorHeader` → `header-text` (`title`/`description`) + `secondary-actions` + `custom-actions`. Header omitted entirely when nothing to show ("External elements → turn off header"). |
| **Accessible name mandatory** (title or external label)                                                                                                                         | ✅ matching            | `ariaLabel` is required and applied to `.cm-content` (4.1.2). The "Do/Don't" guidance is satisfied by construction.                                                                        |
| **Secondary actions** — Copy Button + full-screen toggle                                                                                                                        | ✅ matching            | `copyable` (Ark `Clipboard`) + `fullScreenable` (native `<button>`, `aria-pressed`).                                                                                                       |
| **Full screen** — toggles inline ↔ full screen                                                                                                                                  | ✅ matching            | `useFullScreen` sets `data-full-screen` → `position: fixed; inset: 0; z-index: 1000` (matches live Helios CSS); **Escape exits** and focus returns to the editor (2.4.3).                  |
| **Custom (primary) actions** in the header                                                                                                                                      | ✅ matching            | `customActions: ReactNode` slot.                                                                                                                                                           |
| **Active-line highlighting**                                                                                                                                                    | ✅ matching            | `highlightActiveLine()` + `highlightActiveLineGutter()`.                                                                                                                                   |
| **Bracket highlighting + auto-close** of brackets/quotes                                                                                                                        | ✅ matching            | `bracketMatching()` + `closeBrackets()` (+ `closeBracketsKeymap`).                                                                                                                         |
| **Language** (CodeMirror syntax highlighting)                                                                                                                                   | ✅ matching            | Same `language` API as Code Block.                                                                                                                                                         |
| Syntax colors generic / agnostic                                                                                                                                                | ✅ matching, by design | Same semantic-token mapping as Code Block.                                                                                                                                                 |
| **Linting (JSON, CodeMirror6)** — underline + gutter icon + per-line tooltip                                                                                                    | ✅ matching            | `lintLanguage: 'json'` → `json()` + `linter(jsonParseLinter())` + `lintGutter()`.                                                                                                          |
| Linting **min editor height 160px**; **alert dialog 80px**                                                                                                                      | ✅ matching            | `data-linting` → editor `min-block-size: 160px`; `.cm-panel-lint` `min-block-size: 80px`.                                                                                                  |
| **Open all alerts with `Ctrl-Shift-m` / `Cmd-Shift-m`**                                                                                                                         | ✅ matching            | Provided by CM6 `lintKeymap` (binds that exact chord to `openLintPanel`); no custom binding needed.                                                                                        |
| Editor font `0.8125rem` / `code-200` family; root flex-column, overflow hidden, 1px border; header gap 12px / padding 16px / surface-faint bg / bottom border; min-height 164px | ✅ matching            | Values taken from the live `.hds-code-editor` CSS and reproduced with tokens (+ the two literal px the Helios CSS itself uses).                                                            |

**Accessibility:** documented criteria (1.3.1, 1.3.2, 1.4.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11,
1.4.12, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 4.1.2) all addressed — required accessible name (4.1.2),
tab-focus mode so Tab escapes (2.1.2), focus-visible ring (2.4.7), Escape-restores-focus on
full-screen exit (2.4.3). The lint panel's selected-diagnostic row is re-tokenized to clear
4.5:1 (1.4.3) — CM6's default uses the system `Highlight`/`HighlightText` pair, which scores
~4.49:1 on Windows; overridden to a Helios token pairing. axe runs clean on every story,
including the open lint panel.

### Code Editor deviations (explicit)

1. **Lint surface: CM6's native lint panel as the "alert dialog."** Helios describes an alert
   dialog opened with Ctrl/Cmd-Shift-m; we use CodeMirror's own lint panel (the upstream
   behavior that ships with `lintKeymap` + `openLintPanel`), styled with Helios tokens and sized
   to the documented 80px. This is the faithful CM6 implementation of the same contract, not a
   bespoke dialog — preferred over rebuilding the linting UI.
2. **Dark mode.** Helios notes the Code Editor has "limited support for dark mode" (buttons
   only). Our token-only styling inherits the app's light/dark token values throughout, so this
   is a parity-plus, not a gap.

---

## Verification summary

Every Helios-documented variant, state, anatomy element, and keyboard binding for both
components is implemented and matching, with the deviations above explicitly recorded and
justified. Behavior is covered by deterministic story tests
(`CodeBlock.spec.stories.tsx`, `CodeEditor.spec.stories.tsx`) — read-only enforcement, accessible
name, line numbers, line highlighting, height toggle, syntax color, copy wiring, Tab-not-trapping
(both), typing/`onChange`, active line, auto-close brackets, JSON lint marker + lint panel, and
full-screen toggle + Escape — all green, with axe clean per story.
