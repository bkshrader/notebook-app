# Markdown Viewer

**Version:** 1.0

A read-only rendering surface for `.md` files. Distinct from the [text editor](../text-editor/OVERVIEW.md) — the viewer is what the user sees when consuming a note rather than editing it.

## Design intent

- **Clean rendering.** Headings, lists, links, code blocks, blockquotes, tables, images — all rendered as proper HTML with semantic markup.
- **Reader-mode aesthetics.** Comfortable line length, generous spacing, typography optimized for sustained reading.
- **Screen-reader-friendly.** Semantic HTML5 (`<article>`, `<section>`, proper heading hierarchy, `<figure>` for images) so screen readers can navigate by structure.
- **No edit affordances visible** in viewer mode — explicit toggle to editor.

## Why a separate viewer

- **Cognitive switch.** Editing and reading are different mental modes; conflating them creates clutter and accidental edits.
- **TTS read-along (v1.1) anchors here.** When the user invokes read-along, the viewer is the natural surface — the editor's source decorations would conflict with TTS highlighting.
- **Print/export targets.** PDF export, "share as HTML" — the viewer's render is the canonical output.

## What v1 ships

- Markdown → HTML rendering via `remark` / `rehype` / `unified` pipeline (or `markdown-it` — TBD; engineering decision).
- Sanitization (we still render user-supplied markdown that may have come from imported files in v1.1).
- Standard CommonMark + GFM extensions (tables, task lists, strikethrough, autolinks).
- Image rendering (local images from the project folder).
- Syntax highlighting in code blocks (`shiki` or `Prism` — engineering decision).

## What v1.1 adds

- Math rendering via MathJax v4 (see [math-rendering](../math-rendering/OVERVIEW.md)).
- TTS read-along anchored to the rendered text (see [read-along](../read-along/OVERVIEW.md)).
- `.tex` file rendering via the compile pipeline (see [latex-first-class](../latex-first-class/OVERVIEW.md)).

## Relevant references

- [Related libraries](../../references/related-libraries.md) — remark/rehype/unified, markdown-it, shiki, and other rendering-pipeline candidates with license verdicts.
- [LaTeX libraries](../../references/latex-libraries.md) — MathJax v4 integration for the v1.1 math rendering.
