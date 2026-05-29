# Text Editor

**Version:** 1.0

The editor surface for authoring and editing notes. v1 targets a **CodeMirror 6**-based markdown editor with inline live-preview decorations (rendered inline elements, decorated block elements) over the underlying `.md` source. Not a split-pane source/preview view (cognitively expensive); not full WYSIWYG (defer to v2's "rich markdown editor" decision).

## Design intent

- **Live-preview decorations.** `**bold**` shows as **bold** while the cursor is elsewhere; revert to source when the cursor enters the range. Same for italic, links, inline code, headings, list bullets, task checkboxes.
- **One pane, not two.** No side-by-side rendered/source split — ADHD users find pane-thrashing cognitively expensive.
- **Source is always reachable.** The user can always see and edit the markdown source. The decorations are a UX layer, not a different document.
- **Keyboard-first.** Full editor functionality reachable from the keyboard. Default keymap honors platform conventions.
- **Screen-reader-friendly.** CodeMirror 6's contenteditable substrate exposes a real text surface to NVDA/JAWS/VoiceOver — meaningfully better than canvas-based editors like Monaco.

## What v1 ships

- CodeMirror 6 with `@codemirror/lang-markdown`.
- Decorations for headings, bold, italic, links, code spans, lists, task checkboxes, blockquotes.
- Standard keymap with platform conventions (Cmd/Ctrl-B for bold, etc.) implemented as markdown-source insertions.
- Autosave to the underlying `.md` file (no manual save needed).

## What v1.1 adds

- `.tex` file support via stex syntax highlighting.
- Math rendering decorations: `$...$` and `$$...$$` rendered inline via MathJax v4, reverting to source on cursor entry.
- Read-along TTS highlighting: a `ViewPlugin` decorates the currently-spoken word/sentence range.

## What v2.0 may add

- The roadmap's "Rich markdown editor" line item. **Open question** (informed by the CodeMirror 6 research report): is this satisfied by more sophisticated CodeMirror decorations, or does it require swapping to a ProseMirror-based editor (TipTap / Lexical / BlockNote)?

## Relevant Documentation

- [CodeMirror 6](../../research/codemirror.md) — primary library evaluation, accessibility verdict, comparison to TipTap/Lexical/BlockNote/Milkdown/Monaco.
- [Related libraries](../../research/related-libraries.md) — broader editor-library landscape and license considerations.
- [LaTeX libraries](../../research/latex-libraries.md) — stex syntax highlighting and the math-rendering decoration pattern.
