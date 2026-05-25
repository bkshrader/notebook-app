# Math Rendering

**Version:** 1.1

Inline (`$...$`) and display (`$$...$$`) math rendered in markdown and `.tex` notes. **Engine: MathJax v4** — the accessibility-strongest renderer in 2026 because its SRE (Speech Rule Engine) integration injects plain-text `aria-label`s that work regardless of whether the screen reader natively understands MathML.

## Why MathJax v4 over KaTeX

- **Accessibility.** MathJax v4 + SRE produces math-to-speech output that NVDA / JAWS / VoiceOver consume as plain text. KaTeX's hidden-MathML approach depends on screen-reader MathML support, which is uneven in 2026.
- **Speed isn't a blocker.** KaTeX is faster, but the accessibility delta outweighs the latency delta for our use case.
- **Caching mitigates rendering cost.** Rendered math output is fully deterministic given the source string — a content-hash → SVG cache eliminates re-render cost on subsequent views.

## What ships in v1.1

- MathJax v4 integration in the [markdown viewer](../markdown-viewer/OVERVIEW.md).
- MathJax v4 inline decorations in the [text editor](../text-editor/OVERVIEW.md) (CodeMirror 6 `Decoration.widget` pattern) — `$...$` and `$$...$$` ranges render in place; revert to source when the cursor enters the range.
- Content-hash → rendered-output cache (in-memory; optionally persisted).
- SRE-driven `aria-label` injection on every rendered math expression.

## Engineering details

- MathJax v4 + SRE bundles to ~1 MB minified — trivial in an Electron context.
- Rendering can be sync (small math) or async (large/complex expressions) — workers available.
- The cache key is the source string; the value is the rendered SVG/HTML + computed aria-label. Cache invalidation is "never" (output is deterministic) modulo MathJax version upgrades.

## What v1.1+ doesn't include

- **MathLive virtual keyboard** for math input — deferred to whenever STEM-grad becomes a focus (v1.5+). MathLive is input-only; rendering is unaffected.
- **Full LaTeX document compilation** — see [latex-first-class](../latex-first-class/OVERVIEW.md). Math-in-notes is a separate concern.

## Relevant references

- [LaTeX libraries](../../references/latex-libraries.md) — full library landscape, accessibility analysis of MathJax v4 SRE vs. KaTeX hidden-MathML vs. Temml, MathLive deferral rationale.
- [Markdown viewer](../markdown-viewer/OVERVIEW.md) — the primary consumer of rendered math.
- [Text editor](../text-editor/OVERVIEW.md) — inline editing of math via CodeMirror decorations.
- [Read-along](../read-along/OVERVIEW.md) — TTS highlighting must gracefully skip math regions or speak the aria-label.
