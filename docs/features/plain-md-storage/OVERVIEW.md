# Plain `.md` Storage with YAML Frontmatter

**Version:** 1.0

Notes are stored as plain Markdown files on the user's local filesystem, with optional YAML frontmatter for metadata (course, due date, citations, tags, etc.). No proprietary database, no lock-in, no cloud account required.

## Design principles

- **Filesystem is canon.** The `.md` files on disk are the source of truth. Any in-app index/cache is derived and can be rebuilt at any time.
- **One file per note.** Discoverable, greppable, syncable via any file-sync tool the user already has (iCloud, Dropbox, Drive, Syncthing, git).
- **Standard CommonMark.** No proprietary syntax extensions for v1. GFM-flavored extras (tables, task lists, fenced code) are fair game.
- **YAML frontmatter is optional.** A bare `.md` file with no frontmatter is a valid note.
- **Polyglot from day one.** The storage abstraction is "any file in our supported set," not "the markdown file." `.tex` joins natively in v1.1; ingested PDFs/DOCX/PPTX are stored alongside the converted markdown in v1.1.

## Why this matters

- **No lock-in.** A student who stops using the app keeps their notes in a universally-readable format.
- **Survives the app.** If the project disappears, the notes don't.
- **ADHD-friendly.** Plain files reduce the anxiety of "what if my notes are stuck in someone's database." External legibility lowers cognitive overhead.
- **Universal sync.** We don't need to build sync in v1 because the user can point their existing sync tool at the notes folder.

## Implications

- File watching (`chokidar` on Node, `watchdog` on Python) is required so external edits show up live.
- Conflict resolution on external edit must be graceful — if the user edits in our app and also in vim, neither edit should silently win.
- The library/projects organization is a layer over the filesystem, not a replacement for it. Folders on disk map to projects.

## Relevant Documentation

- [files.md](../../research/files-md.md) — the design philosophy this storage model draws from; plain-files-as-canon, anti-lock-in, ADRs as a documentation practice.
- [Related libraries](../../research/related-libraries.md) — `chokidar`, `gray-matter` (YAML frontmatter parsing), and similar tooling candidates.
