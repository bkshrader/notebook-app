# Bibliography Management

**Version:** 1.1

Citation and bibliography support for academic notes. v1.1 scope: basic CSL-based citation insertion + bibliography rendering. Full Zotero round-trip integration deferred to v1.5/v2.

## What "bibliography management" means here

- The user can attach a `references.bib` (BibTeX) or `references.json` (CSL-JSON) file to a project.
- Within notes, the user inserts citations via `[@key]` or a similar in-app picker.
- On render (markdown viewer / PDF export), citations resolve to formatted output and a bibliography section is appended.
- Citation style (APA, MLA, Chicago, IEEE, BibTeX, …) is per-project.

## Engineering shape

- **citeproc-js** does the rendering (AGPL/CPAL dual-licensed per the related-libraries report — fine for our AGPL app, but worth noting it's not the MIT most people assume).
- **CSL styles** are CC-BY-SA 3.0 (data, not code). Surface this to users who want to edit citation styles.
- Storage: bibliography file lives in the project folder alongside notes (filesystem-as-canon, same as everything else).

## Why this matters

- Academic note-taking without citation support is a non-starter for grad students and faculty.
- This is one of the must-have features identified in the NotebookLM-gap analysis (NotebookLM has no academic citation export — a real gap we'd fill).
- Zotero is universal among the target audience; even basic interop ("drag a Zotero item in") is a major win.

## What v1.1 ships

- BibTeX / CSL-JSON file attachment to a project.
- In-note citation insertion via `[@key]` syntax + picker UI.
- Render-time citation resolution + bibliography section in markdown viewer and PDF export.
- Per-project citation style selection.

## What v1.5+ adds

- **Full Zotero integration.** Read/write to a local Zotero SQLite DB or via the `zotero-better-bibtex` plugin's local HTTP server.
- **Drag-a-Zotero-item-in** for direct citation insertion without manual BibTeX editing.
- **PDF attachment ingestion from Zotero** — pulls the user's annotated PDFs into the project automatically.

## Why Zotero specifically

- Open-source, AGPL-3.0 (philosophically aligned).
- Dominant among academics in the target audience.
- Has accessibility infrastructure; not perfect but mature.
- Has a documented local API (`zotero-better-bibtex` exposes localhost endpoints) — no scraping needed.

## Relevant Documentation

- [Related libraries](../../research/related-libraries.md) — citeproc-js license analysis, CSL styles, citation.js alternatives.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — Zotero's accessibility posture and academic-tools landscape.
- [NotebookLM](../../research/notebooklm.md) — the citation gap in the dominant competitor we're filling.
