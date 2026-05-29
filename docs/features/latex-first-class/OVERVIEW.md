# LaTeX as a First-Class Citizen

**Version:** 1.1

Notes can natively be `.tex` files, not only `.md`. Same Library/Projects model, same editor surface, same viewer pipeline. The user creates a note and picks `markdown` or `LaTeX` as the format — both are first-class.

## What "first-class" means

- The file extension determines the editor mode and the viewer pipeline.
- `.tex` files appear in the Project list alongside `.md` files with no second-class indicators.
- Editor mode for `.tex` includes syntax highlighting and basic environment autocomplete.
- Viewer mode for `.tex` produces a rendered PDF (compile-to-PDF pipeline).

## What this is NOT

- **Not a full LaTeX studio.** We are not competing with TeXstudio, TeXmaker, or Overleaf. Users writing a 200-page thesis should use those tools.
- **Not round-trip `.md` ↔ `.tex` conversion.** Files are what their extension says; we don't pretend to losslessly convert between them.
- **Not bibliography integration in v1.1** — that depends on [bibliography-management](../bibliography-management/OVERVIEW.md) landing alongside.

## Engineering shape

- **Editor:** CodeMirror 6 with `@codemirror/legacy-modes/mode/stex` (or a Lezer LaTeX grammar if a mature one exists in 2026).
- **Compiler:** sidecar. Two viable options per the LaTeX-libraries research doc:
  - **Tectonic** (MIT) — actual TeX engine, full LaTeX-package compatibility, ~150 MB sidecar.
  - **Typst** + **mitex** (both Apache-2.0) — transpiles LaTeX → Typst, then Typst compiles. Faster, smaller, but not exact LaTeX-package fidelity.
  - **Decision deferred** to v1.1 implementation. Tectonic is the more conservative choice; Typst is the modern bet.
- **Viewer:** rendered PDF appears in the [PDF viewer](../pdf-viewer/OVERVIEW.md). The compiled PDF and the source `.tex` live alongside each other; recompiling on save is automatic.

## Why this matters

- STEM grad students and academics write LaTeX. Forcing them into markdown-with-math-extensions is a non-starter for them.
- The roadmap explicitly slots v1.1 as the polish-for-academics release. LaTeX support is the centerpiece.
- The polyglot storage model is cheap to design now, expensive to retrofit — and it makes future format additions (Typst, Org-mode, Restructured Text) trivial.

## Relevant Documentation

- [LaTeX libraries](../../research/latex-libraries.md) — full ecosystem evaluation, Tectonic vs. Typst+mitex comparison, license analysis (Tectonic MIT, Typst Apache-2.0, the texlive.js GPL-version ambiguity to avoid).
- [Plain `.md` storage](../plain-md-storage/OVERVIEW.md) — the polyglot storage model `.tex` joins.
- [Text editor](../text-editor/OVERVIEW.md) — the editor surface that handles both file types.
- [PDF viewer](../pdf-viewer/OVERVIEW.md) — where compiled `.tex` output renders.
- [Math rendering](../math-rendering/OVERVIEW.md) — separate concern (math-in-markdown), shares no infrastructure with LaTeX-document compilation.
