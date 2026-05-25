# Browser Extension

**Version:** 3.0

A browser extension for capturing web content into the user's Library — selections, full articles, screenshots, references with metadata, YouTube transcripts.

## Why this matters

- Academics spend much of their reading time in browser tabs (journal sites, online textbooks, JSTOR, arXiv).
- The "save this for my paper" workflow currently requires manual copy-paste-format → high friction, high cognitive load.
- Web-clipper functionality is table stakes for any modern research-notes tool.
- For Zotero users (huge in academia), the Zotero connector is the gold standard pattern to study.

## Scope

- **Save selection → into Capture Inbox or specific project.**
- **Save full page → Reader-mode-extracted markdown, with citation metadata (URL, title, author, date) in YAML frontmatter.**
- **Screenshot → save as image into project, optionally with auto-OCR.**
- **Extract reference metadata** for academic sites (DOI lookup, BibTeX generation, integration with [bibliography-management](../bibliography-management/OVERVIEW.md)).
- **YouTube transcript capture** — pull the auto-generated or provided transcript, save as a note with the video URL.

## Browser targets

- Chrome / Edge (Chromium) — primary; broadest user base.
- Firefox — supported.
- Safari — supported if engineering effort is reasonable; Safari extension toolchain is more painful.

## Communication with the desktop app

- The extension is *not* the app — it's a capture mechanism that sends content to the desktop app's running instance (or queues for next launch).
- Local HTTP server or OS-level deep link or shared file location — decision deferred.
- If [remote sync](../remote-sync/OVERVIEW.md) is configured, the extension can target the sync layer directly without a local app instance.

## Accessibility consideration

- The extension's popup UI must meet our standard WCAG 2.1 AA bar.
- Keyboard shortcuts for invocation (browser-extension convention).

## Relevant references

- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — the academic web-clipper landscape (Zotero Connector, web-to-Notion, web-to-Obsidian, Readwise).
- [Universal capture inbox](../universal-capture-inbox/OVERVIEW.md) — the desktop endpoint for browser-captured content.
- [Bibliography management](../bibliography-management/OVERVIEW.md) — citation metadata extraction integrates here.
