# Document Search

**Version:** 1.1

Full-text search across the Library — notes, ingested documents, transcripts. Local-first, fast, ranked. No cloud dependency.

## Design intent

- **Fast.** Sub-second results for queries on libraries up to ~10k notes / ~100k pages of ingested content.
- **Comprehensive.** Searches markdown notes, `.tex` notes, ingested-and-converted documents (PDF/DOCX/PPTX → markdown), and audio transcripts.
- **Keyboard-first.** Hotkey to invoke from anywhere; arrow-key navigation through results; Enter opens.
- **Scoped or global.** Search-the-current-project vs. search-the-library, toggled in the search UI.
- **Snippet previews.** Results show the matched line(s) with context, not just the file name.

## Engineering shape

- **Engine candidates:** SQLite FTS5 (in-process, no extra runtime, well-understood), MiniSearch (pure-JS, in-renderer), or Tantivy bindings. Decision deferred to v1.1 implementation.
- **Indexing strategy:** on file change (via the existing `chokidar` / `watchdog` file watcher), incrementally re-index the changed file.
- **Embeddings deferred.** v1.1 is keyword search only. Semantic search via sqlite-vec lands in v2.0 alongside [agentic workflows](../agentic-workflows/OVERVIEW.md) (same infrastructure).

## What v1.1 ships

- Global search hotkey + UI.
- FTS index covering all `.md` / `.tex` notes and all converted-document `.md` files.
- Transcripts from [audio recording](../audio-recording-and-transcription/OVERVIEW.md) included.
- Snippet previews with match highlighting.
- Project-scoped or library-wide toggle.
- Result ranking (BM25 from FTS5 or equivalent).

## What v2.0 adds

- Semantic search via sqlite-vec embeddings.
- Hybrid search (keyword + semantic re-ranking).
- "Chat with your sources" (agentic workflow) consumes the same embeddings infrastructure.

## Why this matters

- A note app that can't find anything has failed at its job. The growing-library problem (where do my notes about X go? where did I write about Y?) is the universal note-app pain.
- ADHD users especially benefit from search-instead-of-organize. The capture-fast-organize-never pattern requires good search to make the unsorted captures retrievable.
- NotebookLM's lack of cross-notebook search is one of its documented gaps; we ship the opposite by default.

## Relevant Documentation

- [Related libraries](../../research/related-libraries.md) — MiniSearch, Lunr, FlexSearch, Tantivy bindings, SQLite FTS5, Orama with license verdicts.
- [files.md](../../research/files-md.md) — the search-not-organize philosophy this draws from.
- [NotebookLM](../../research/notebooklm.md) — the cross-notebook search gap we close.
