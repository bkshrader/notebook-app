# Library and Projects

**Version:** 1.0

Organization model for the user's notes and source materials. The **Library** is the user's full collection across all subject areas. **Projects** are scoped subsets — a course, a research topic, a paper-in-progress — within the Library. **Reference Materials** are shared source documents (textbooks, white papers) that live outside any single Project and can be cited by many Projects.

> Terms here (**Library**, **Project**, **Reference Material**) carry their [glossary](../../GLOSSARY.md) meanings. Note in particular: **Library** is the whole top-level container, **not** the reference shelf — that's **Reference Materials**.

## Conceptual model

- **Library** = top-level container. Everything the user owns lives here: all Projects plus the shared Reference Materials store.
- **Project** = a folder-like scope inside the Library. A Project groups related notes and ingested documents, and **cites** shared Reference Materials.
- **Reference Material** = a shared source document in a Library-level store. Not owned by any Project; **cited by link** (many-to-many), so one textbook can back several Projects without duplication. Reference Materials are annotatable.
- Project-owned files exist in exactly one Project. A cited Reference Material is not a Project-owned file. (Nested projects TBD — likely yes for v1, but flat-with-tags is the fallback if nesting introduces UX complexity.)

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

## Reference Materials (shared source materials)

Reference Materials are source documents — textbooks, white papers, articles — that don't belong to one Project but support many. They model the real academic pattern where the same textbook backs several courses or papers.

- **Live once, cited many.** A Reference Material is stored a single time in a Library-level shared store; Projects **cite it by link** (a pointer in frontmatter or a citation), not by copying. The Project↔Reference-Material relationship is many-to-many.
- **Annotatable.** Users can highlight and annotate a Reference Material.
- **Not a Project file.** A cited Reference Material is not owned by the Project and is not counted among its one-file-one-Project artifacts.

### Deferred to implementation

Two design questions are intentionally left open and will be settled during implementation (capture each as an ADR when decided):

- **On-disk location of the shared store.** Where the Reference Materials store lives under the Library root (e.g. a reserved folder, dotfolder, or other layout). Constraint: it must stay legible as plain files (see [plain-md-storage](../plain-md-storage/OVERVIEW.md)) and must not collide with a Project folder.
- **Annotation scope.** Whether annotations are shared across every citing Project (one set of marks on the source) or scoped per-Project (same source, different notes per Project). Intersects with [bibliography-management](../bibliography-management/OVERVIEW.md) and [document-ingestion](../document-ingestion/OVERVIEW.md).

## Filesystem mapping

Projects map to folders on disk under a user-configured Library root. A project named "PHIL 201" is the folder `~/Notes/PHIL 201/`. The shared Reference Materials store also lives under the Library root; its exact layout is deferred to implementation (see above). This keeps the storage model legible outside the app (see [plain-md-storage](../plain-md-storage/OVERVIEW.md)).

## Relevant Documentation

- [files.md](../../research/files-md.md) — the universal-capture-then-organize-later pattern this complements.
- [NotebookLM](../../research/notebooklm.md) — NotebookLM's "Notebook" abstraction (analogous to our Project) and its limits (no cross-notebook search, awkward sharing model) — design lessons.
