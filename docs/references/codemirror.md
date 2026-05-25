# CodeMirror 6

- **Project home:** <https://codemirror.net/>
- **GitHub org (archived mirror):** <https://github.com/codemirror>
- **Canonical issue tracker (active):** <https://code.haverbeke.berlin/codemirror/dev/issues>
- **Docs:** <https://codemirror.net/docs/>
- **License:** MIT[^mit-license]
- **AGPL-3.0 compatibility verdict:** Compatible. MIT is a permissive license with no copyleft obligations. You may include CodeMirror in an AGPL-3.0-licensed Electron app without any license conflict. Attribution is required (include the MIT copyright notice in your distributed binary). No CLA, no contributor covenant complication.

---

## 1. What It Is

CodeMirror 6 (hereafter CM6) is a **code editor component for the web**, designed to be embedded in browser-hosted applications. Version 6 is a complete ground-up rewrite of the 13-year-old CodeMirror project, published stable in June 2022.[^cm6-release] The rewrite replaced the monolithic v5 architecture with a strictly modular, functional-core / imperative-shell design built around an immutable state model and a bespoke incremental parser (Lezer).

**Author and governance:** Marijn Haverbeke (maintainer of Acorn, ProseMirror, and Eloquent JavaScript) wrote CM6 substantially solo, with contributions from the community. The project has no corporate parent. Funding is via open sponsorship — Replit became a notable $1,000/month sponsor after migrating from Monaco.[^replit-blog] Development now lives at Haverbeke's self-hosted Gitea instance (<https://code.haverbeke.berlin/codemirror/>) after the GitHub `codemirror/dev` repo was archived read-only on April 15, 2026 (the individual package repos, e.g. `codemirror/view`, remain on GitHub and continue to receive pushes).

**Bus factor:** Real, and worth naming honestly. Haverbeke runs this largely solo. Mitigation: CM6 reached a stable, well-specified API surface in 2022 and has not broken it since. The codebase is not fast-moving; it is mature and has shipped in Obsidian, Replit, Sourcegraph, and Chrome DevTools. A fork or community continuation would be tractable if needed.

**Notable shipping consumers (CM6, not Monaco):**[^notable-users]
- **Obsidian** — both "Source mode" and "Live Preview" mode run CM6 since the 1.0 release. Obsidian's Live Preview is the canonical reference for the inline-decoration live-preview UX pattern.
- **Replit** — migrated from Monaco in 2022; open-sourced 8 CM6 extensions including `@replit/codemirror-vim`.[^replit-blog]
- **Sourcegraph** — migrated from Monaco for their search bar and later all editors; cut JS download from 6 MB to 3.4 MB.[^sourcegraph-blog]
- **CodePen** — migrating from CM5 to CM6 (announced February 2026).[^codepen-blog]
- **Chrome DevTools** — uses CM6 for the DevTools Sources panel.

---

## 2. The Mental Model

Understanding CM6 requires internalizing four concepts. Everything else flows from them.

### 2.1 `EditorState` — the immutable document

`EditorState` is a **plain value** (think Redux store). It holds the document text (as an efficient rope-like `Text` object), the current selection, and all extension state. You never mutate it. You create new states from old ones via transactions.

```ts
import { EditorState } from "@codemirror/state"

const state = EditorState.create({
  doc: "# Hello\n\nSome markdown text.",
  extensions: [markdown(), ...]
})
```

### 2.2 `EditorView` — the imperative DOM bridge

`EditorView` owns a DOM element, renders the current `EditorState` into it, and translates user events (keystrokes, mouse clicks) into transactions that it dispatches back to update state. You interact with the editor through `view.state` (read) and `view.dispatch(transaction)` (write).

```ts
import { EditorView } from "@codemirror/view"

const view = new EditorView({
  state,
  parent: document.getElementById("editor")!
})
```

### 2.3 Transactions — the only way to change anything

A `Transaction` describes one or more changes: document edits, selection moves, state effects, annotations. You build them with `state.update(...)` and dispatch them. The view re-renders the diff. This is why undo/redo is correct by construction — every change is captured as a transaction that can be inverted.

### 2.4 Extensions — the composition model

CM6 has no plugin/hook system in the traditional sense. Instead, every feature is an **extension value** that can be composed into an array. Extensions are flat — they are collected from all sources (including nested arrays and conditional values) before configuration. Three primitives make up extensions:

- **`Facet`** — a typed slot that aggregates inputs from multiple extensions into a single output (e.g., `EditorView.decorations` collects all decoration sources into one set).
- **`StateField`**  — persistent, transactional state attached to `EditorState` (e.g., a field tracking which fold ranges are open).
- **`ViewPlugin`** — imperative code that lives on the `EditorView`, can read DOM measurements, and provides decorations or event handlers. Updates are called synchronously after each transaction.

### 2.5 The Lezer Parser

CM6 does **not** use regular expressions for syntax highlighting. It uses [Lezer](https://lezer.codemirror.net/), an LR parser generator that produces **incremental syntax trees** — trees that update only the changed spans when the document changes, making re-highlighting after each keystroke O(change size) rather than O(document size).[^lezer-design]

The syntax tree is a real AST. You can walk it with `tree.cursor()` or `tree.resolve(pos)` to find the node at any position. This is load-bearing for the live-preview decoration pattern: your `ViewPlugin` walks the tree, finds `StrongEmphasis`, `Heading`, `Link` nodes, and applies decorations to those ranges.

### 2.6 Decorations — the rendering primitive

Three decoration types exist in `@codemirror/view`:

| Type | What it does | Live-preview use |
|------|-------------|-----------------|
| `Decoration.mark({class})` | Applies CSS classes to a text range — the text remains in the DOM | Render bold/italic/code/link styling on top of raw source |
| `Decoration.widget({widget, side})` | Injects a DOM element at a point without consuming document characters | Insert a rendered image, a checkbox icon, a rendered-math widget |
| `Decoration.replace({widget?})` | Hides a text range; optionally shows a widget instead | Hide `**` markers around selected text; hide block-math delimiters; fold headings' leading `#` into a styled prefix |

The cursor-enters-range interaction (show raw source when cursor is on a decorated range) is not built-in — it is a convention implemented by decoration plugins: when computing decorations, skip any range that overlaps the current selection.

---

## 3. How to Use It for Our Specific Use Cases

### 3.1 Minimal Markdown Editor with Live-Preview Decorations

**Imports for a minimal markdown editor:**

```ts
import { EditorView, ViewPlugin, Decoration, DecorationSet, ViewUpdate, keymap } from "@codemirror/view"
import { EditorState, RangeSetBuilder } from "@codemirror/state"
import { syntaxTree } from "@codemirror/language"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { languages } from "@codemirror/language-data"
import { defaultKeymap, historyKeymap, history } from "@codemirror/commands"
import { searchKeymap, search } from "@codemirror/search"
import { oneDark } from "@codemirror/theme-one-dark"
```

**Live-preview decoration plugin shape:**

```ts
// Marks bold syntax: hide ** markers, apply bold CSS when cursor not in range
function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const { from, to } = view.viewport
  const cursor = view.state.selection.main

  syntaxTree(view.state).iterate({
    from, to,
    enter(node) {
      // Bold: StrongEmphasis node wraps the content + markers
      if (node.name === "StrongEmphasis") {
        const cursorInside = cursor.from <= node.to && cursor.to >= node.from
        if (!cursorInside) {
          // Hide the opening **
          builder.add(node.from, node.from + 2,
            Decoration.replace({}))
          // Apply bold class to inner text
          builder.add(node.from + 2, node.to - 2,
            Decoration.mark({ class: "cm-md-strong" }))
          // Hide the closing **
          builder.add(node.to - 2, node.to,
            Decoration.replace({}))
        }
      }
      // Heading: replace # prefix with a styled widget
      if (node.name === "ATXHeading1") {
        builder.add(node.from, node.from + 2,
          Decoration.replace({ widget: new HeadingMarkerWidget(1) }))
      }
      // ... repeat for Emphasis, InlineCode, Link, ListItem, Task, etc.
    }
  })
  return builder.finish()
}

const livePreviewPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet
  constructor(view: EditorView) {
    this.decorations = buildDecorations(view)
  }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet)
      this.decorations = buildDecorations(update.view)
  }
}, { decorations: v => v.decorations })
```

The Lezer node names for `@lezer/markdown` include: `ATXHeading1`–`ATXHeading6`, `SetextHeading1/2`, `StrongEmphasis`, `Emphasis`, `InlineCode`, `FencedCode`, `Link`, `Image`, `URL`, `ListItem`, `Task`, `Blockquote`, `HorizontalRule`, `HTMLBlock`, `Table`.[^lang-markdown]

Community reference implementations:
- [`kenforthewin/atomic-editor`](https://github.com/kenforthewin/atomic-editor) — MIT-licensed Obsidian-style live preview; handles headings, bold, italic, links, images, tables, task checkboxes, and fenced code with syntax highlighting. Rebuilds decorations only for changed lines, achieving O(change size) update performance. Includes a "mouse-freeze guard" to prevent cursor drift during click events.[^atomic-editor]
- [`segphault/codemirror-rich-markdoc`](https://github.com/segphault/codemirror-rich-markdoc) — another reference for hiding syntax markers while keeping the source.
- [`@yuya296/cm6-live-preview-core`](https://www.npmjs.com/package/@yuya296/cm6-live-preview-core) — abstracts per-element render state (inline vs block) without affecting undo/redo.

### 3.2 LaTeX / `.tex` File Support

**Option A — `@codemirror/legacy-modes` stex (available now, stable):**

```ts
import { StreamLanguage } from "@codemirror/language"
import { stex } from "@codemirror/legacy-modes/mode/stex"

const texExtensions = [StreamLanguage.define(stex)]
```

This wraps the CodeMirror 5 stex mode in a CM6 compatibility shim. It provides full LaTeX syntax highlighting. It does **not** produce a Lezer AST, so you cannot hang CM6 AST-driven decorations off it — only highlighting is available. Performance is slightly worse than a native Lezer grammar due to the shim layer.

**Option B — `codemirror-lang-latex` (Lezer-based, community):**

[`TeXlyre/codemirror-lang-latex`](https://github.com/TeXlyre/codemirror-lang-latex) is a Lezer grammar based on Overleaf's LaTeX grammar. It provides a real AST, LaTeX-specific linting, hover tooltips, auto-closing environments, and autocompletion.[^lang-latex] License: MIT. Caveat: 20 stars, no published npm releases as of May 2026 — treat as pre-1.0 and vendor or pin to a commit.

**Recommendation for v1.1:** Start with `@codemirror/legacy-modes/mode/stex` (zero risk, ships today). Upgrade to `codemirror-lang-latex` when it publishes a stable release or if you need AST-driven features (hover, linting).

### 3.3 Read-Along TTS Highlighting (ViewPlugin per-frame update)

TTS playback provides a current word/sentence boundary in real time. The pattern is a `ViewPlugin` that holds external state (the current highlight range) and updates it from outside the normal transaction dispatch path using `view.dispatch`:

```ts
// External TTS controller calls this on each word boundary
function setTTSRange(view: EditorView, from: number, to: number) {
  view.dispatch({
    effects: setHighlightEffect.of({ from, to })
  })
}

// State effect + state field
const setHighlightEffect = StateEffect.define<{from: number, to: number}>()

const ttsHighlightField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes) // keep positions valid after edits
    for (const effect of tr.effects) {
      if (effect.is(setHighlightEffect)) {
        deco = Decoration.set([
          Decoration.mark({ class: "cm-tts-word" })
            .range(effect.value.from, effect.value.to)
        ])
      }
    }
    return deco
  },
  provide: f => EditorView.decorations.from(f)
})
```

Calling `view.dispatch({ effects: setHighlightEffect.of({from, to}) })` from a `requestAnimationFrame` loop is the correct pattern. CM6's transaction dispatch is synchronous and fast — it will not drop frames at normal TTS speeds (1–3 words/second). For the rare case of 60fps sub-word animation, dispatch is still well within budget.

### 3.4 Inline Math Rendering ($...$ and $$...$$)

The pattern uses `Decoration.replace` with a `WidgetType` that renders KaTeX:

```ts
class MathWidget extends WidgetType {
  constructor(readonly src: string, readonly display: boolean) { super() }

  toDOM(): HTMLElement {
    const el = document.createElement(this.display ? "div" : "span")
    el.className = this.display ? "cm-math-display" : "cm-math-inline"
    try {
      katex.render(this.src, el, { displayMode: this.display, throwOnError: false })
    } catch {
      el.textContent = this.src
      el.className += " cm-math-error"
    }
    return el
  }

  eq(other: MathWidget) { return other.src === this.src && other.display === this.display }
  ignoreEvent() { return false } // let clicks through to position cursor
}

// In the decoration builder: detect InlineMath / BlockMath nodes
// (requires a markdown extension that defines these node types,
// e.g. adding a custom Lezer extension to @lezer/markdown)
if (node.name === "InlineMath" && !cursorInside) {
  const src = state.sliceDoc(node.from + 1, node.to - 1) // strip $
  builder.add(node.from, node.to,
    Decoration.replace({ widget: new MathWidget(src, false) }))
}
```

`@lezer/markdown` supports custom block/inline node types via its extension API — you add a `InlineMath` inline parser that matches `$...$`. Community packages that cover this:
- [`TeXlyre/codemirror-latex-visual`](https://github.com/TeXlyre/codemirror-latex-visual) — implements Mathlive rendering for math blocks in CM6, supports inline `$...$` and display `$$...$$`, mode-switching between source and visual editing.
- The Cortex wiki integrates CM6 with KaTeX for `$` and `$$` delimiters.

When the cursor enters a math widget range, the replace decoration is excluded from the build, restoring raw source. This is the Obsidian Live Preview pattern — source-truth, view-only rendering.

---

## 4. Accessibility Verdict

### 4.1 Architecture: contenteditable, not canvas

CM6 renders into a **real `contenteditable` DOM element** (specifically, `role="textbox" aria-multiline="true"`). This is the critical architectural difference from Monaco Editor, which uses a hidden textarea + a canvas-like rendering layer and then overlays a visually-invisible textarea to capture input from screen readers only in an opt-in "screen reader mode."[^monaco-a11y]

The contenteditable approach means CM6's text is live in the DOM and accessible to assistive technologies by default, without any mode-switch. Screen readers can traverse, read, and interact with the content through standard DOM traversal.

**The ARIA label gap (fixed):** In April 2023, Rich Harris (Svelte) filed issue #1127 noting that CM6's input fields lacked accessible names — screen readers would announce "blank" instead of labeling the editor.[^aria-label-issue] The fix (adding `aria-label` support via an `EditorView.contentAttributes` facet) was merged. You should set this in your own editor config:

```ts
EditorView.contentAttributes.of({ "aria-label": "Note editor" })
```

### 4.2 Screen Reader Behavior by Platform (as of 2026)

**Desktop — NVDA + Firefox / Chrome (Windows):** Functions reasonably well. The contenteditable model allows NVDA to read the current line and navigate by character/word. The CM6 accessibility survey[^a11y-survey] and Mozilla bug #919711[^mozilla-bug] document that cursor navigation, line reading, and text selection all work substantially better in CM6 than in CM5. Known remaining issue: autocomplete popup candidates are not announced to the screen reader (issue #1055, filed Jan 2023, closed Aug 2023 — verify whether the fix fully resolved announcement for all screen readers).[^autocomplete-a11y]

**Desktop — JAWS (Windows):** No dedicated testing results found in public issue tracker or forum as of May 2026. JAWS behavior on contenteditable editors has historically been good, but no explicit "tested with JAWS, passes" confirmation exists in the CodeMirror record. **Gap: unverified.**

**macOS — VoiceOver + Safari:** Issue #1624 (autocompletion popup not announced with VoiceOver in Safari, filed Mar 2026, closed — likely fixed before archival).[^vo-safari] General navigation with VoiceOver has no open critical issues as of May 2026.

**Android — TalkBack:** Issue #1556 is the most significant open accessibility bug as of May 2026.[^android-a11y] TalkBack's navigate-by-line jumps to syntax-highlight regions rather than actual lines, and may read content from the start of the document instead of the cursor location. This issue was filed April 2025 and has no resolution as of the repo archival in April 2026. **This is a real gap for international students on Android.**

**iOS — VoiceOver:** Issue #1559 (highlightActiveLine breaks navigate-by-line, filed Nov 2025) was closed — likely fixed. Ongoing general iOS selection handle issues (#1538) affect all users, not specifically screen readers.

**Linux — Orca:** No public test results found. Orca behavior on contenteditable is generally comparable to NVDA on Firefox.

### 4.3 Keyboard Navigation

CM6 includes a complete, layered keymap system:

- `defaultKeymap` — standard editing commands (Ctrl/Cmd-Z undo, Ctrl-A select all, arrow navigation, Home/End, Ctrl-Home/End, etc.)
- `historyKeymap` — undo/redo
- `searchKeymap` — Ctrl/Cmd-F find, Ctrl-H replace
- `completionKeymap` — autocomplete navigation
- `lintKeymap` — jump to next/previous diagnostic

The keymap extension takes a priority-ordered list of bindings. Vim and Emacs keymaps (`@replit/codemirror-vim`, `@replit/codemirror-emacs`, both MIT-licensed)[^vim-emacs-license] can be layered on top without removing the default accessibility keymap — they intercept bindings they claim and fall through for the rest. **Tab key behavior** deserves special attention: CM6's default is to insert a tab character, which traps keyboard users inside the editor (WCAG 2.1.2 violation). Use `indentWithTab` only if you also expose `setTabFocusMode` (available as of 2025) via a keyboard shortcut (e.g., Escape or F6 toggles tab focus mode).[^tab-focus]

### 4.4 IME / RTL / Bidi Support

- **IME (CJK, Arabic, etc.):** CM6 has extensive, actively-maintained IME support. Issues #1688 (composition inside brackets on Chrome), #1687 (first-keystroke error with non-English IME), #1684 (Chinese IME deletes preceding text on Chrome), and #1650 (IME at syntax-highlight boundaries) were all filed and closed in 2025–2026, indicating active attention to IME regressions.[^ime-issues] The `EditContext` API (Chrome-first) is now used on supporting browsers to further improve IME handling.[^editcontext]
- **RTL / Arabic / Hebrew:** CM6 natively supports `direction: rtl` via CSS. The `bidiIsolates` extension (built-in) wraps syntax tree sections with `unicode-bidi: isolate` to prevent neutral punctuation from being misassociated with the wrong direction.[^rtl-example] This is particularly relevant for mixed-direction notes (e.g., English code inside Arabic prose).
- **Bidi cursor motion:** Visual cursor movement (arrow keys) respects bidirectional text direction; logical operations (Backspace/Delete) operate on the logical character sequence.

### 4.5 OS Scaling, Dark Mode, Reduced Motion

- **Font scaling:** CM6 inherits the browser's font size. Setting `font-size` on the editor's parent element is sufficient; the editor reflows correctly. There is no built-in OS font-scale listener (you would need to call `view.requestMeasure()` on resize).
- **Dark mode:** CM6 supports `&dark` and `&light` CSS selectors in theme definitions, which respond to `prefers-color-scheme`. The one-dark theme is the bundled reference. You can write a theme that automatically switches: `EditorView.theme({...}, { dark: window.matchMedia('(prefers-color-scheme: dark)').matches })`.[^dark-mode] For dynamic switching, recreate the theme extension in a transaction.
- **Reduced motion:** CM6 has no built-in `prefers-reduced-motion` handling. The editor itself has no animations; cursor blink is controlled by CSS (`caret-color` / `animation`). You should add `@media (prefers-reduced-motion: reduce) { .cm-cursor { animation: none } }` in your theme. The read-along TTS highlight animation must similarly be suppressed by your TTS controller layer.

### 4.6 Known Accessibility Gaps Summary

| Issue | Status (May 2026) | Severity for our app |
|-------|-------------------|---------------------|
| #1556 Android TalkBack navigate-by-line broken | **Open** | High (mobile users) |
| #1127 ARIA input fields lacked accessible names | Closed (fixed) | Mitigated by config |
| #1055 Autocomplete popup not announced | Closed | Medium (fixed, verify) |
| #1624 VoiceOver Safari autocomplete not announced | Closed | Low (fixed) |
| Tab key traps keyboard users | Configurable | Medium — must configure `setTabFocusMode` |
| JAWS testing data | No data found | Unknown risk |
| `prefers-reduced-motion` | No built-in support | Low — CSS-level fix |

### 4.7 axe-core / Automated Audit

No published axe-core audit results for CM6 were found in public sources as of May 2026. The ARIA label gap (since fixed) would previously have triggered a `label` violation. With correct `aria-label` configuration, the editor is expected to pass standard automated checks, but **this should be explicitly verified in the app's own CI accessibility testing pipeline** (e.g., `@axe-core/playwright` against the running Electron app).

---

## 5. Bundle Size and Performance

### 5.1 Bundle Size (verified from official docs)

From the official [bundling example](https://codemirror.net/examples/bundle/) with Rollup:[^bundle-example]

| Configuration | Minified | Minified + gzip |
|--------------|----------|----------------|
| Full `basicSetup` + JavaScript lang | ~1 MB | ~135 KB |
| `minimalSetup` (core only) | ~700 KB | ~75 KB |

For our app (markdown editor, no heavy autocomplete, no lint):

```
@codemirror/state         ~30 KB min
@codemirror/view          ~80 KB min
@codemirror/commands      ~25 KB min
@codemirror/language      ~20 KB min
@codemirror/lang-markdown ~15 KB min
@lezer/markdown           ~20 KB min
@lezer/highlight          ~10 KB min
history + search          ~20 KB min
──────────────────────────────────────
Estimated total:          ~220 KB min / ~60–70 KB gzip
```

Adding `@codemirror/legacy-modes/mode/stex` for LaTeX adds ~5–10 KB gzip. Adding a KaTeX math rendering widget adds KaTeX itself (~90 KB gzip) — that's the dominant cost for math support, not the CM6 decoration code.

**Comparison:**
- Monaco: 5–10 MB unpacked, ~1.26 MB gzip for Replit's full CM6+extensions bundle vs. ~5 MB gzip for Monaco.[^replit-blog]
- TipTap: ProseMirror core + TipTap starter kit ~300 KB minified, ~80 KB gzip (comparable to CM6 for a markdown-capable setup).

### 5.2 Performance

CM6's performance is designed around avoiding cliffs rather than impressive benchmarks:

- **Large documents:** The official demo loads several **million** lines.[^million-demo] The Lezer parser throttles work when the editor is idle, stopping entirely to conserve battery. Syntax highlighting may lag behind the viewport on very long documents (by design — it catches up progressively).
- **Atomic Editor** (CM6 live-preview) reports smooth performance on 500-page documents on iOS by processing only visible viewport content.[^atomic-editor]
- **Viewport-based rendering:** Only visible lines are rendered in the DOM. Off-screen content is represented by placeholder elements. This is why CM6 handles 10k+ line files without freezing — the DOM never grows beyond the visible window.
- **O(change size) updates:** Lezer incremental parsing means each keystroke triggers a tree update proportional to the changed region, not the document size.
- **Compared to TipTap/ProseMirror:** ProseMirror re-renders the whole document on each transaction (with diffing). For documents over a few thousand nodes, this can become noticeable. CM6's viewport rendering maintains consistent performance.

---

## 6. Comparison to Alternatives

### 6.1 TipTap

- **What it is:** A headless, framework-agnostic wrapper around ProseMirror. "Headless" means it provides no default UI — you build the toolbar, bubble menus, etc. Block-based editing via "nodes" and "marks."
- **License:** MIT. AGPL-compatible with attribution.
- **Accessibility story:** Improved substantially with v2.9 (October 2024), which added `role="textbox"` to the editor element, making it work with screen readers and keyboard navigation "smoothly."[^tiptap-a11y] However, Issue #1046 (keyboard accessibility: Alt+F10 toolbar focus, Escape to return to editor) was closed as "not planned" with a "stale" label — the maintainers explicitly declined to prioritize standard toolbar accessibility patterns.[^tiptap-a11y-issue] VoiceOver on macOS may concatenate words across block elements without proper spacing.[^tiptap-docs-a11y] The headless nature means **you are responsible for accessible toolbar implementation** — this is a significant burden for a WCAG AA target.
- **What we give up by not using it:** True block-based WYSIWYG operations (drag-and-drop block reordering, slash commands, collaborative editing via Y.js). These are v2+ features that CM6 doesn't natively provide.
- **v2 relevance:** If "Rich markdown editor" means drag-and-drop blocks, slash commands, and Notion-style block UI — TipTap is the correct choice for that. If it means "better-looking inline rendering" — CM6 already does that.

### 6.2 Lexical

- **What it is:** Meta/Facebook's ProseMirror alternative, used in Facebook.com's composer and WhatsApp Web. Strong TypeScript typing, node-state model, plugin architecture.
- **License:** MIT. AGPL-compatible.
- **Accessibility story:** Claims "excellent reliability, accessibility and performance" in the README.[^lexical-github] Uses contenteditable. ESLint a11y rules are in the codebase. However, a public discussion thread (#5398) asking for accessibility documentation received **zero maintainer responses**.[^lexical-a11y-discussion] No detailed accessibility documentation exists. Given Facebook's shipping it in their own products (which must comply with various regulations), it likely works at a basic level, but the documentation gap is a risk signal for a WCAG-priority project.
- **What we give up:** Lexical's state model is somewhat cleaner for complex collaborative scenarios. Strong typing. But its markdown story is weaker than CM6 (it is primarily a rich-text composer, not a markdown-source editor).

### 6.3 BlockNote

- **What it is:** A Notion-style block editor built on top of TipTap. Higher-level abstraction, includes block types, drag handles, slash commands out of the box.
- **License trap:** Core (`@blocknote/core`) is **MPL-2.0**. The `xl-*` packages (AI, multi-column, exporters) are **GPL-3.0** unless you hold a commercial license.[^blocknote-license] MPL-2.0 is **copyleft at the file level** — if you modify BlockNote source files, you must publish those changes under MPL-2.0, but you can combine BlockNote with AGPL-3.0 code without issue (MPL 2.0 §3.3 explicitly allows compatibility with GPL-3.0 and AGPL-3.0). The `xl-*` packages under GPL-3.0 are compatible with AGPL-3.0 (AGPL-3.0 is a stronger copyleft, and GPL-3.0 code can be used in AGPL-3.0 projects).
- **Practical warning:** The GPL-3.0 `xl-*` packages require that the entire application be released under GPL-3.0-compatible terms. Since we are already AGPL-3.0, this is satisfied — but it means we cannot use BlockNote XL packages in a future proprietary tier or freemium offering without commercial licensing.
- **Accessibility:** Inherits TipTap's accessibility story (see above) plus the headless UI burden.

### 6.4 ProseMirror (raw)

- **What it is:** The underlying editor framework that TipTap, Milkdown, and BlockNote are built on. MIT-licensed.
- **Accessibility:** Uses contenteditable natively. Generally considered good for screen readers (the Quip rich text editor built an accessible editor on ProseMirror and documented the process).[^quip-a11y] However, raw ProseMirror has no markdown-source mode — everything is stored as a rich document model, not markdown text. You would need to implement markdown serialization/deserialization yourself, which is the problem TipTap/Milkdown solve.
- **Verdict:** Not a candidate for our use case. Use TipTap or Milkdown instead.

### 6.5 Milkdown

- **What it is:** A plugin-driven WYSIWYG markdown editor built on ProseMirror + Remark. MIT-licensed. The document model is markdown-centric (compare: TipTap stores HTML/JSON, Milkdown stores parsed markdown nodes).
- **License:** MIT. AGPL-compatible.
- **Accessibility:** No dedicated accessibility documentation found. Inherits ProseMirror's contenteditable model. Less mature than TipTap (smaller community, fewer resources for accessibility testing).
- **Verdict:** Worth watching for v2's "rich markdown editor" pivot, but immature compared to CM6 or TipTap for our timeline.

### 6.6 Monaco (dismissal)

Monaco is the VS Code editor. It is **not a candidate** for this app for three reasons that compound each other:

1. **Bundle size:** 5–10 MB unpacked (1.26 MB+ gzip) vs. ~60 KB gzip for a CM6 markdown setup. In an Electron app that already ships a Chromium runtime, this adds significant cold-start overhead.
2. **Rendering architecture:** Monaco renders text via a precise-positioned CSS layer synchronized to cursor positions, not via standard DOM text flow. Screen readers interact with a hidden ARIA-role textarea that approximates document content — this is the "paging" strategy documented in their accessibility guide.[^monaco-a11y] It requires users to be in a special "screen reader optimized" mode and has documented issues with NVDA reading full lines on autocomplete.[^monaco-nvda-issue] This is architecturally inferior to CM6's live contenteditable DOM for accessibility.
3. **No markdown-native UX:** Monaco is a code editor; markdown is just another file type with syntax highlighting. There is no decoration system for hiding `**` markers. Building live preview on Monaco is fighting the library.

---

## 7. The Roadmap Fit

### v1: Minimal CM6 Markdown Editor with Live-Preview Decorations

**Verdict: CM6 is the correct choice.** It is the only option in the realistic alternative set that provides:
- Markdown-source as the file format (no serialization layer)
- Inline decoration live-preview without a separate rendered pane
- Good-enough accessibility story for v1 (contenteditable, ARIA labeling, keyboard nav)
- Small bundle, excellent performance on typical note file sizes (1–500 KB)

**Engineering estimate:**
- Basic editor (EditorState + EditorView + markdown language + history + search + keymap): 1–2 days for a developer new to CM6.
- Live-preview decoration plugin (headings, bold, italic, inline code, links, task checkboxes): 3–5 days. The hardest part is cursor-inside-range detection and handling all Lezer node names correctly. Reference: `atomic-editor` can be adapted.
- "Quote from PDF" blockquote insertion: 1 day (it is a standard `view.dispatch` transaction inserting formatted text).
- ARIA label + tab focus mode configuration: 2 hours.
- Total v1 editor investment: **1.5–2 weeks** including testing.

### v1.1: LaTeX, Math, and Read-Along

| Feature | Approach | Effort |
|---------|----------|--------|
| `.tex` file support (highlight only) | `StreamLanguage.define(stex)` | **1 hour** — register on `.tex` extension |
| `.tex` file support (AST-driven) | `codemirror-lang-latex` (pin to commit) | 1 day setup + ongoing maintenance risk |
| Inline math `$...$` | Custom `@lezer/markdown` inline parser + `Decoration.replace` + KaTeX widget | **3–5 days** — the KaTeX integration itself is straightforward; the Lezer extension for detecting math delimiters is the work |
| Read-along TTS highlighting | `StateEffect` + `StateField` pattern from §3.3 above | **1 day** — pattern is straightforward |

### v2: "Rich Markdown Editor" — Stay on CM6 or Swap?

**Opinionated answer: stay on CM6, polish the decorations — do not swap to TipTap or Lexical.**

The "rich markdown editor" line on the roadmap is almost certainly satisfied by **more polish on CM6 decorations**, not a library swap. Here is the reasoning:

1. **File format constraint:** Our notes are `.md` files on disk. A ProseMirror-based editor (TipTap/Lexical/BlockNote) stores a rich document model in memory and serializes to markdown on save. This serialization is lossy (comments, edge-case syntax, non-standard extensions) and a perennial source of bugs. CM6 is source-of-truth: the file is the editor state, no round-trip.

2. **The "rich" features our users need** — styled headings, rendered checkboxes, hidden bold markers, inline math, link previews, image embeds — are all achievable with CM6's decoration system. The `atomic-editor` community project already delivers most of these.

3. **Accessibility regression risk:** Swapping to TipTap/Lexical in v2 means rebuilding the accessibility layer from scratch (toolbar ARIA, keyboard patterns, screen reader testing). CM6's contenteditable architecture is already aligned with what we need.

4. **The only case for swapping:** If v2 requirements include **block reordering by drag-and-drop**, **slash-command block insertion UI** (true Notion UX), or **real-time collaborative editing** (Y.js), then TipTap/BlockNote is the correct choice — and it is a significant migration, not a polishing pass. Make this decision when those features are actually on the roadmap, not before.

---

## 8. Things to Know / Gotchas

### 8.1 contenteditable as a Double-Edged Sword

contenteditable is the right call for accessibility, but inherits decades of browser bugs:

- **Composed event bugs:** IME composition (`compositionstart`/`compositionend`) is handled by the browser before CM6 can intercept. This caused bugs #1688, #1684, #1650, #1654 (all 2025–2026, all fixed). Expect occasional regressions on new browser versions, particularly Chrome on Windows with East Asian input methods.
- **Complex selection across decorated ranges:** When `Decoration.replace` hides text, the browser's selection model and CM6's internal selection model can diverge. The `atomic-editor` "mouse-freeze guard" pattern exists to prevent cursor drift during click events on decorated content.
- **Undo with widgets:** `Decoration.widget` inserts DOM nodes that are not part of the document text. If the user undo-s into a range that previously had a widget, the decoration plugin must correctly rebuild — this is why the `update()` pattern checks both `docChanged` and `selectionSet`.
- **iOS selection handles:** Issue #1538 (selection handles not appearing on iOS since 6.35.1, 18 comments) was still under investigation at archival. iOS Safari's selection handle behavior on contenteditable is infamously inconsistent.

### 8.2 Package Split and Tree-Shaking

CM6 is distributed as ~15 separate `@codemirror/*` packages plus `@lezer/*` packages. This is intentional — it enables tree-shaking. The cost: you will have many entries in `package.json`. Use a bundler (Vite or Rollup) with tree-shaking enabled. **Do not** import from `codemirror/src/**` paths — use the published package exports.

### 8.3 Vim and Emacs Keymaps

`@replit/codemirror-vim` and `@replit/codemirror-emacs` are both MIT-licensed.[^vim-emacs-license] They layer on top of CM6's keymap extension cleanly. Vim mode does **not** break the default accessibility keymap for non-Vim users — it is additive. Note: Vim Insert mode and screen reader virtual cursor mode can conflict (this is a general issue with modal editors and screen readers, not CM6-specific).

### 8.4 `@codemirror/legacy-modes` — What It Is

`@codemirror/legacy-modes` wraps CodeMirror 5's tokenizer-based "mode" system in a CM6 `StreamLanguage` shim. It provides syntax highlighting for 100+ languages (including `stex` for LaTeX) but does **not** produce Lezer ASTs. You cannot use `syntaxTree(view.state).iterate(...)` on a `StreamLanguage`-backed editor — you only get highlighting, not a traversable tree. For AST-driven decorations (math detection, linting, hover tooltips), you need a native Lezer grammar.

### 8.5 Decoration Ordering and Conflicts

When multiple `ViewPlugin`s provide decorations to the `EditorView.decorations` facet, CM6 merges them in priority order. Conflicts (two decorations covering the same range) are resolved by: marks are layered (last wins for style conflicts); replace decorations are merged or one takes precedence. In practice: keep decoration plugins focused and non-overlapping. The live-preview plugin and the TTS highlight plugin should not compete for the same ranges.

### 8.6 Persistence — No Built-in Autosave

CM6 has no file system integration. The editor state is in memory. Saving to disk is your responsibility:

```ts
view.state.doc.toString() // returns the full document as a string
```

Call this in a debounced listener on `EditorView.updateListener.of(update => { if (update.docChanged) scheduleWrite(view.state.doc.toString()) })`. For `.md` files, write to disk via Electron's `fs.writeFile`. For resilience, implement an autosave with a dirty-document indicator.

### 8.7 Funding Model and Bus Factor

The bus factor is genuinely 1. Haverbeke has maintained CM5 and CM6 for 15+ years, so longevity evidence is strong, but a health event or change of interest would leave the project to community stewardship. Concrete mitigations:
- CM6 has a stable, well-documented API that has not had breaking changes since the 2022 stable release.
- The individual package repos remain on GitHub; the archived `codemirror/dev` only lost the issue tracker (moved to code.haverbeke.berlin).
- Replit, CodePen, and others have invested in the ecosystem and would have incentive to maintain a fork.
- Our app owns its own decoration and extension code — none of the live-preview logic lives inside CM6's packages.

---

## Footnotes

[^mit-license]: Verified from the MIT `LICENSE` file in `codemirror/view` (GitHub, retrieved May 2026): "Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others." All individual `@codemirror/*` packages carry the same MIT license.

[^cm6-release]: CodeMirror 6.0 stable release announcement: <https://discuss.codemirror.net/t/codemirror-6-0-has-been-released/4498>

[^replit-blog]: Replit, "Betting on CodeMirror": <https://replit.com/blog/codemirror> — "$51.17 MB unpacked (5.01 MB gzipped) for Monaco" vs. "8.23 MB unpacked (1.26 MB gzipped)" for CM6 with all extensions; Replit sponsors $1,000/month.

[^sourcegraph-blog]: Sourcegraph, "Migrating from Monaco Editor to CodeMirror": <https://sourcegraph.com/blog/migrating-monaco-codemirror> — JS download reduced from 6 MB to 3.4 MB.

[^codepen-blog]: CodePen blog, episode 418, February 2026: <https://blog.codepen.io/2026/02/21/418-codemirror-6/>

[^notable-users]: Notable users compiled from Replit blog, Sourcegraph blog, CodePen blog, Obsidian release notes, and the HN thread for CM6 stable: <https://news.ycombinator.com/item?id=31666186>

[^lezer-design]: Lezer documentation: <https://lezer.codemirror.net/docs/ref/>

[^lang-markdown]: `@codemirror/lang-markdown` GitHub: <https://github.com/codemirror/lang-markdown>; `@lezer/markdown` parser GitHub: <https://github.com/lezer-parser/markdown>

[^atomic-editor]: kenforthewin/atomic-editor: <https://github.com/kenforthewin/atomic-editor>. MIT license.

[^lang-latex]: TeXlyre/codemirror-lang-latex: <https://github.com/TeXlyre/codemirror-lang-latex>. MIT license.

[^monaco-a11y]: Monaco Editor Accessibility Guide: <https://github.com/microsoft/monaco-editor/wiki/Monaco-Editor-Accessibility-Guide>

[^aria-label-issue]: codemirror/dev issue #1127 "ARIA input fields do not have accessible names": <https://github.com/codemirror/dev/issues/1127>

[^a11y-survey]: Marijn's screen reader accessibility survey thread: <https://discuss.codemirror.net/t/code-editor-screen-reader-accessiblity-survey/1790>

[^mozilla-bug]: Mozilla Bugzilla 919711 "[a11y] Make CodeMirror more accessible": <https://bugzilla.mozilla.org/show_bug.cgi?id=919711>

[^autocomplete-a11y]: codemirror/dev issue #1055 "Accessibility: Screen Readers appear to be unaware of currently selected autocomplete candidate": <https://github.com/codemirror/dev/issues/1055>

[^vo-safari]: codemirror/dev issue #1624 "Autocompletion popup not announced with VoiceOver in Safari" (closed Mar 2026): <https://github.com/codemirror/dev/issues/1624>

[^android-a11y]: codemirror/dev issue #1556 "Android: Screen reader accessibility: Navigation by lines doesn't navigate by lines" (open as of May 2026): <https://github.com/codemirror/dev/issues/1556>

[^tab-focus]: `setTabFocusMode` added in 2025 per CodeMirror changelog: <https://codemirror.net/docs/changelog/>

[^ime-issues]: Issues #1688, #1687, #1684, #1650, #1654 in codemirror/dev (all 2025–2026): <https://github.com/codemirror/dev/issues>

[^editcontext]: "Experimental support for EditContext": <https://discuss.codemirror.net/t/experimental-support-for-editcontext/8144>; shipped in CM6 view as the default on Chrome, disabled by default in 6.28.1 after bug reports, re-enabled with fixes.

[^rtl-example]: CodeMirror RTL text example: <https://codemirror.net/examples/bidi/>

[^dark-mode]: discuss.codemirror.net thread: <https://discuss.codemirror.net/t/how-does-cm6-decide-whether-dark-mode-is-on-off/8397>

[^bundle-example]: CodeMirror bundling example (official): <https://codemirror.net/examples/bundle/>. "Standard setup: around 1 megabyte" / "minified ~400KB / 135KB gzipped"; "Minimal: 700KB / 250KB minified / 75KB gzipped."

[^million-demo]: CodeMirror Huge Doc Demo: <https://codemirror.net/examples/million/>

[^tiptap-a11y]: TipTap v2.9 accessibility improvements: <https://tiptap.dev/blog/release-notes/tiptap-v2-9-has-arrived>

[^tiptap-a11y-issue]: TipTap issue #1046 "A11y: Accessibility in general and minimal keyboard usability" (closed as not planned): <https://github.com/ueberdosis/tiptap/issues/1046>

[^tiptap-docs-a11y]: TipTap accessibility guide: <https://tiptap.dev/docs/guides/accessibility>

[^lexical-github]: Lexical GitHub: <https://github.com/facebook/lexical>

[^lexical-a11y-discussion]: Lexical discussion #5398 "How accessible is Lexical?": <https://github.com/facebook/lexical/discussions/5398>

[^blocknote-license]: BlockNote pricing/licensing: <https://www.blocknotejs.org/pricing>. Core: MPL-2.0. XL packages: GPL-3.0 or commercial.

[^quip-a11y]: Quip, "Making the Quip editor accessible": <https://quip.com/blog/quip-editor-a11y>

[^monaco-nvda-issue]: Monaco issue #2615 "NVDA reads the suggestion in the Monaco editor will read the whole line": <https://github.com/microsoft/monaco-editor/issues/2615>

[^vim-emacs-license]: `@replit/codemirror-vim` (MIT): <https://github.com/replit/codemirror-vim>; `@replit/codemirror-emacs` (MIT): <https://github.com/replit/codemirror-emacs>
