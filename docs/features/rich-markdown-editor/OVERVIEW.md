# Rich Markdown Editor

**Version:** 2.0

Polish and feature-extension of the v1 CodeMirror 6-based [text editor](../text-editor/OVERVIEW.md). **Decision (per the CodeMirror 6 research): stay on CodeMirror 6; do not swap to TipTap/Lexical/BlockNote.** "Rich" means more sophisticated decorations and editing affordances, not a different editor library.

## Why no library swap

- Swapping editor libraries late is a regression-prone, accessibility-destroying move.
- The file-format constraint — `.md` on disk, no round-trip serialization — favors source-first editors (CodeMirror) over WYSIWYG editors (TipTap/Lexical) that store an internal AST.
- CodeMirror's accessibility investment (real contenteditable, screen-reader-friendly) compounds; throwing it away starts from scratch.
- Per the CodeMirror research, "rich markdown editor" UX for ADHD/academic users is satisfied by deeper decorations on CM6, not by Notion-style block editors.

## What "rich" means in v2.0

- **Slash-command palette** for inserting headings, callouts, tables, code blocks with language pickers, math blocks, embedded whiteboards, etc.
- **Smart paste:** URL → autolinked title; image → save-to-project + insert; table data → markdown table.
- **Drag-to-reorder blocks** via lightweight visual handles.
- **Block-level commands:** move-up/down, convert (paragraph → heading → list item), duplicate.
- **Inline embed widgets** for `.png`/`.jpg`/`.svg`/`.excalidraw`/audio clips/transcripts.
- **Tighter math input:** the v1.1 math rendering becomes more keyboard-ergonomic.

## What's deliberately out

- **True WYSIWYG.** The `.md` source remains the document. We decorate; we don't hide the source.
- **Block editor with hidden internal AST.** That's TipTap/Lexical/BlockNote territory; we don't go there for the reasons above.

## Considerations from CodeMirror 6 research

- The community references (`atomic-editor`, `cm6-live-preview-core`) already cover most decoration patterns we'd build on.
- Engineering scope for v2.0 is "polish and extension" not "rewrite."

## Relevant references

- [CodeMirror 6](../../references/codemirror.md) — the comparison-to-alternatives section, the opinionated "stay on CM6" verdict for v2's rich editor, the live-preview decoration patterns to build on.
- [Text editor](../text-editor/OVERVIEW.md) — the v1 foundation this extends.
- [Related libraries](../../references/related-libraries.md) — TipTap / Lexical / BlockNote / Milkdown evaluations and license traps (BlockNote `xl-*` GPL-3.0 specifically).
