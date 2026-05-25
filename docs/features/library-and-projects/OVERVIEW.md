# Library and Projects

**Version:** 1.0

Organization model for the user's notes and reference materials. The **Library** is the user's full collection across all subject areas. **Projects** are scoped subsets — a course, a research topic, a paper-in-progress — within the Library.

## Conceptual model

- **Library** = top-level container. Everything the user owns lives here.
- **Project** = a folder-like scope inside the Library. A project groups related notes, ingested documents, and references.
- Files exist in exactly one project. (Nested projects TBD — likely yes for v1, but flat-with-tags is the fallback if nesting introduces UX complexity.)

## File-type agnosticism

Projects hold any file the app supports, not just markdown:

- v1: `.md` notes, audio recordings + transcripts
- v1.1: `.tex` notes, ingested PDFs/DOCX/PPTX with their converted markdown
- v2+: anything else the ingestion pipeline accepts

The organization model and the editor/viewer pipeline are decoupled: a project shows a list of files, each file opens in the renderer appropriate to its extension.

## Why this matters

- Academics structure their work by course / paper / topic. The app's organization needs to match that mental model.
- ADHD users benefit from explicit, persistent structure — "where does this go?" should have an obvious answer.
- Project scope enables future features: per-project chat (v2), per-project search (v1.1), per-project export.

## Filesystem mapping

Projects map to folders on disk under a user-configured Library root. A project named "PHIL 201" is the folder `~/Notes/PHIL 201/`. This keeps the storage model legible outside the app (see [plain-md-storage](../plain-md-storage/OVERVIEW.md)).

## Relevant references

- [files.md](../../references/files-md.md) — the universal-capture-then-organize-later pattern this complements.
- [NotebookLM](../../references/notebooklm.md) — NotebookLM's "Notebook" abstraction (analogous to our Project) and its limits (no cross-notebook search, awkward sharing model) — design lessons.
