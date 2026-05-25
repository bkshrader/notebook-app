# Files.md (zakirullin/files.md)

## Links & License

- **GitHub repository**: <https://github.com/zakirullin/files.md>[^repo]
- **Live web app (Beta)**: <https://app.files.md>[^app]
- **Marketing/landing site**: <https://files.md>[^site]
- **LLM-readable file structure spec**: <https://files.md/llms.txt>[^llms]
- **Author profile**: <https://github.com/zakirullin> — Artem Zakirullin, Limassol, Cyprus; bio "On sabbatical".[^author-profile]
- **Author's foundational essay (heavily cited in the project)**: <https://github.com/zakirullin/cognitive-load> — "Cognitive Load in Software Development" (12.2k stars, the codebase's stated style guide).[^cognitive-load]
- **Show HN launch thread**: <https://news.ycombinator.com/item?id=48179677> — "Show HN: Files.md – Open-source alternative to Obsidian", 719 points, 354 comments.[^hn-thread]
- **Telegram chatbot (alternate write interface)**: <https://t.me/FilesMDBot>[^bot-link]
- **Companion repo for self-hosted sync server**: same repo, `cmd/server/` + `server/sync/`.[^server-dir]

### License — MIT

The repository ships under the **MIT License**, Copyright (c) 2023 Artem Zakirullin.[^license-file] GitHub's license endpoint confirms `"spdx_id": "MIT"`.[^api-meta]

#### AGPL-compatibility verdict

- **Compatible.** MIT is the most permissive of the mainstream OSI-approved licenses and is universally one-way compatible with AGPL-3.0: you may freely incorporate MIT-licensed code into an AGPL-3.0-licensed application, provided the MIT copyright and permission notice are preserved in the bundled source. There are no use-field restrictions, no patent-grant gotchas worth flagging, and the file is the canonical 21-line MIT text.[^license-file]
- **Practical takeaway for this notebook app**: any fragment we wanted to borrow (e.g. the sync algorithm in `server/sync/`, the OPFS / File System Access driver pattern in `web/lib/fs.js`, the markdown-to-HTML converter the author wrote in place of an AST-based library) can be lifted directly into an AGPL Electron or Tauri app. The notice must travel with the file. Note that the project also ships a `vendor/` (Go) and `web/lib/` (JS) directory of third-party dependencies — those carry their own licenses (e.g. CodeMirror is MIT, KaTeX is MIT, Mermaid is MIT, `lib/LICENSES.txt` enumerates the rest), and we'd need to keep their notices too if we borrowed code from them.[^web-lib-list]
- **No CLA, no DCO.** The repo has no `CONTRIBUTING.md` carving out a CLA and no DCO sign-off requirement visible in commits — contributions to files.md flow into the MIT-licensed corpus without an additional grant.

---

## Concept and philosophy

Files.md is, in the author's own framing, a **"private, quiet space for thinking. A simple app for your `.md` files."**[^readme-tagline] It is a PWA wrapped around a local folder of plain Markdown files, with an optional Go binary that adds two specific affordances: (1) cross-device sync, and (2) a Telegram bot that lets you append to the same folder from your phone without opening the app. There is no proprietary database, no proprietary file format, no plugin marketplace, and — crucially — no "system" you have to learn before you can write the first note.

The elevator pitch is the four-line manifesto at the top of the README, which is worth quoting in full because every architectural decision downstream of it makes sense in its light[^readme-manifesto]:

> Own your data as plain local files.
> Own the software that opens those files.
> Grow your knowledge with files and your own brain.
> Grow the software around it with an LLM.
> **Plain files and self-owned software can last through the ages**.

This is a near-explicit subscription to Steph Ango ("kepano", CEO of Obsidian) and his "**file over app**" essay, which argues that "*if you want your writing to still be readable on a computer from the 2060s or 2160s, it's important that your notes can be read on a computer from the 1960s*" and that "*in the fullness of time, the files you create are more important than the tools you use to create them*."[^file-over-app] The intellectual lineage is so direct that files.md ships `web/lib/theme-flexoki.css` — kepano's own Flexoki color palette — as one of its themes.[^flexoki] In the HN thread, kepano himself appeared in the comments, broadly endorsing the project (his comments mostly focus on Obsidian's own sync alternatives).[^hn-kepano]

The **second** philosophical pillar — the one less common in this product category — is anti-PKM. The README spends as much space arguing against using a note-taking tool as it does explaining how to use one. The "Second Brain?" section opens by quoting Joan Westenberg's "I Deleted My Second Brain" essay at length[^westenberg]:

> Eventually, I realized I had created a new problem: deferral. The more my system grew, the more I deferred the work of thought to some future self who would sort, tag, distill, and extract the gold.
> That self never arrived.

And the author then doubles down in his own voice[^readme-2nd-brain]:

> *Second Brain is getting better*.
> **But the first brain is not improving**.

This is a deliberately heterodox stance for a notes app. The README's "Notes can prevent experience" and "Self-help through reading and taking notes?" sections go further: they tell you not to mistake reading-and-tagging for understanding, that "*reading without action is entertainment, a form of procrastination*," and that no quantity of notes can heal emotional wounds.[^readme-prevent-experience][^readme-self-help] **For a notes-app README this is unusual to the point of being almost confrontational.** It is the closest thing in the project to an explicit theory of mind for the user.

The author's third — and most influence-bearing — text is his "Cognitive Load in Software Development" essay, which the project's own contribution guide points to as its style bible[^cognitive-load-link]. Key principles from that essay that surface concretely in files.md include "*a little copying is better than a little dependency*," "deep modules with simple interfaces," "limit what a developer must hold in working memory to ~four facts," and a categorical rejection of premature abstraction.[^cognitive-load] You can see all three texts working in the same direction: the user-facing app is anti-cognitive-load, and the codebase is anti-cognitive-load — they're the same idea applied to two different audiences.

---

## Design principles

I've extracted these from the README's "Another note taking app?" section, the contribution/backend/frontend guidelines, the 40+ ADRs at the bottom of the README, and the HN thread. The deliberate non-doing matters as much as the doing, so I've split them.

### What files.md deliberately IS

1. **Plain `.md` files as the canonical store.** No proprietary format, no database, no SQLite cache that becomes the source of truth. The README contribution guide makes this categorical: "*With portability in mind, everything is stored in plain `.md` files.*"[^backend-guidelines] This includes things you might naturally put in a DB — a journal is just `journal/YYYY.MM Month.md`, habits live as `habits/<Habit name>.md`, user preferences live in a single `config.json` next to the notes, and the chat log is literally `Chat.md`.
2. **Filesystem is the database.** There is no separate index — `filename` IS the ID; `dir` + `filename` resolves a file uniquely.[^glossary] The sync server keeps an `fslog` (append-only file on disk) to remember deletions, but even that is a text file you can read with `tail`.[^sync-flow]
3. **Single binary on the server side.** Replaced an earlier stack (the author quotes "*docker + php-fpm + php7 + laravel + nginx + redis + cron + worker + certbot*") with one ~15MB Go binary that contains the entire server.[^hn-rewrite]
4. **No build system on the client side.** The frontend guideline reads, literally: "*No build systems, **in 10 years we will open `/web/index.html` and it should just work**.*"[^frontend-guidelines] You can `git clone` and double-click the HTML file. All JS libraries are vendored under `web/lib/`.
5. **Vendored dependencies, end to end.** The contribution guide: "*Code should be self-sufficient, so `vendor` and `web/lib` folders are included in the repository.*"[^contributing] Backed by a 2024-09-09 ADR: "*We use vendoring for dependencies… we don't care about blocked/removed dependencies. Our repository is the self-sufficient source of truth.*"[^adr-vendoring]
6. **Local-first by default; sync is opt-in and stateless.** The default flow is: open the PWA → it stores in OPFS (browser Origin-Private File System) → optionally point it at a real local folder via File System Access API → optionally route that folder through iCloud/Dropbox/Google Drive for sync → only as a last resort run the Go server for HTTP sync. The author explicitly chose OPFS as the default (2025-07-11 ADR) because it's "*better browsers support, less hustle for users.*"[^adr-opfs]
7. **Chat as the universal capture surface.** Every input method funnels into one append-only file (`Chat.md`). Tasks, journal entries, notes, checklist items — they all start as a chat message and are *later* moved (by clicking a button) to their final file. The author kept simplifying toward this; a 2026-04-22 ADR explains the journey: "*It was mentally taxing to see two buttons/messages 'to inbox' and 'to chat'… that one click was the reason adding new tasks became frustrating.*"[^adr-chat]
8. **Predefined-but-conventional structure.** The folder layout is suggested, not enforced — `brain/`, `journal/`, `habits/`, `media/`, `archive/`, plus reserved filenames `Chat.md`, `Later.md`, `Read.md`, `Watch.md`, `Shop.md`. The spec is published as `files.md/llms.txt` and the README invites you to paste it into your `CLAUDE.md` or `AGENTS.md` so AI agents understand your vault.[^llms]
9. **One level of nesting, max.** This is a hard architectural constraint, not a styling choice: "*Any file can be uniquely identified by filename and dir. We only support one level of nesting.*"[^glossary] It's enforced both in the data model and the UI.
10. **Standard Markdown links, not wikilinks.** Wikilinks (`[[Note Name]]`) were removed in November 2024 because "*our knowledge base must be interoperable*" — `[Title](path.md)` is what GitHub, VS Code, every other editor, and every static-site generator already understand.[^adr-wikilinks][^adr-mdlinks-2026]
11. **Cross-platform-clean filenames.** A 2025-06-16 ADR forbids `: ? < > *` in filenames "*to make our knowledge base cross-platform*" — these characters are illegal on Windows / in some PWA contexts.[^adr-cross-platform]
12. **Tolerant Reader on input, strict on output.** A 2024-07-08 ADR adopts the Tolerant Reader pattern: skip gibberish on parse, but panic on partially-valid data ("if we encounter flags of valid data like `###` but data itself is invalid — we panic").[^adr-tolerant-reader]
13. **Hand-rolled markdown parsing.** A 2024-07-08 ADR: "*Gave up on AST parsing/rendering. We had lots of corner cases via AST and the code was way complex. Markdown isn't that hard to parse, we can do it via good old straightforward code. We have 3x times less code now.*"[^adr-no-ast] Same for the MD-to-HTML converter (written because Telegram's API rejects the standard HTML output).
14. **Distinct write-only mobile entry point.** Telegram bot is the deliberate mobile flow ("*distract-free write-only entrance to our knowledge base*"), not a mobile app.[^adr-telegram] The architecture document for the bot acknowledges Telegram is unpopular in EU/USA but argues the same pattern can be reproduced by shrinking the web app to a chat window on small viewports.[^adr-telegram-eu]
15. **LLM-extensibility as a stated user benefit.** The README's "Another note taking app?" list contains, with the same weight as "works offline": "*Extremely simple code. One person or an LLM can fit the whole project in head*" and "*The codebase is ready for your LLM to extend to your needs.*"[^readme-llm-friendly] The author frames the project's small surface area as a *user* feature, not just a developer convenience.

### What files.md deliberately ISN'T

1. **Not a plugin platform.** No plugin API, no extension marketplace. The HN author response: "*For the most part I was thinking more about what I can remove.*"[^hn-author-remove]
2. **Not Obsidian-compatible (despite the HN title).** Files are interchangeable (both use Markdown), but link syntax and folder conventions differ from Obsidian's defaults — wikilinks were removed, only Markdown links are written. A commenter sharply noted: "*I wouldn't show it as an alternative to Obsidian though.*"[^hn-alternative-critique]
3. **No structured-data UX.** No tags-as-first-class, no inline metadata queries, no Dataview-style live tables. Frontmatter is not used. If you want to slice your notes by attribute, you use grep.
4. **No graph view.** The README explicitly criticizes graph views via its Westenberg quote — "*there's an illusion of mastery in watching your notes web into constellations. But constellations are projections.*"[^westenberg] The omission is philosophical, not technical.
5. **No backlinks panel, by default.** The repo *does* ship a `cmd/backlink/` Go script that inserts backlinks as plain text into your files (with a `--dry-run` mode), but it runs as an offline batch tool, not a live UI feature.[^backlink-cmd] This is consistent with the principle that the file on disk is the truth — if you want backlinks, they should be in the text, visible in any editor.
6. **No E2E encryption (yet).** The author admits on HN: "*it is not possible to do proper E2E. Will see if people use the chatbot.*"[^hn-e2e] The "Local-first" sync mode doesn't *need* E2EE because nothing leaves the device; the cloud-folder option pushes that responsibility to iCloud / Dropbox / GDrive; only the optional Go sync server actually sees plaintext content. For our threat model this is workable.
7. **No telemetry / no accounts (by default).** The PWA is "no data is sent to server" unless you opt into one of the sync modes.[^readme-private]
8. **No native desktop app.** A 2024-10-06 ADR documents the journey through `fyne.io` ("a TREMENDOUS amount of effort" for scrolling/emoji/text-selection details), then `wails.io`, before settling on the PWA. The author writes: "*As much as I hate using the web stack for the desktop applications, it doesn't seem like we have a choice.*"[^adr-fyne] This is directly relevant to our Electron-vs-Tauri decision.
9. **No WASM.** Removed in September 2025 — Go-WASM was 8MB and the JS↔Go↔JS round-trip caused untraceable race conditions. The author cut the entire WASM path and reimplemented the same functionality in plain JS.[^adr-wasm]
10. **No tags, no frontmatter, no aliases.** A note's filename IS its title. The 2024-07-09 ADR: "*Note term is way too vague. Let's try to use 'file' term, without any high level abstraction (like note).*"[^adr-no-note] The retreat from abstraction is explicit.

### Tradeoffs the author has explicitly chosen

| Tradeoff | What the author chose | What they gave up | Source |
|---|---|---|---|
| Browser support | Chrome-first (File System Access API) for the "real folder" mode; OPFS fallback for Firefox/Safari | A first-class Firefox/Safari experience for editing your real file tree[^issue-34-quote] | ADR 2025-07-11, issue #34 |
| Database vs files | Files | Fast complex queries, schema migrations | Backend guidelines |
| Sync model | Stateless content sync + append-only fslog for deletes/renames | Real-time CRDTs, multi-user real-time collaboration | ADR 2025-06-04, sync-flow.md |
| Link syntax | Plain Markdown `[Title](path)` | Wikilink terseness, rename-safety | ADR 2024-11-11 |
| Editor | Hand-rolled MD parsing + CodeMirror for editing | A "real" CST/AST | ADR 2024-07-08 (with the wish "*one day, we replaced CodeMirror with our own tiny implementation*"[^frontend-guidelines]) |
| Mobile | Telegram bot or shrunk PWA | A real mobile app | ADRs 2025-06-12, 2026-04-22 |
| Code style | Less code, ideally negative-LOC PRs | Feature breadth, plugin extensibility | Contribution guidelines |
| Dependencies | Vendor everything, avoid adding deps | Smaller repo, easier upgrades | ADR 2024-09-09 |

---

## Architecture

### Stack at a glance

| Layer | Technology | Files of note |
|---|---|---|
| Frontend | Vanilla JavaScript PWA, no build step | `web/index.html` is the entrypoint[^index-html] |
| Editor | Forked CodeMirror 5 + HyperMD (rich markdown rendering) | `web/lib/codemirror.js`, `web/lib/hypermd.js`[^web-lib-list] |
| Math | KaTeX (lazy-loaded, ADR 2026-05-20)[^adr-katex] | `web/lib/latex/` |
| Diagrams | Mermaid (lazy-loaded, ADR 2026-05-22 — script is 3MB)[^adr-mermaid] | `web/lib/mermaid.min.js` |
| Local FS access | OPFS (default) → File System Access API (when user opens a real folder); `DirHandle` cached in IndexedDB[^adr-opfs] | `web/lib/fs.js` |
| Styling | Hand-rolled CSS with CSS variables; multiple themes including Flexoki | `web/app.css`, `web/lib/theme-*.css`[^flexoki] |
| Server | Go, single binary, ~15MB no-dependencies | `cmd/server/`, `server/sync/`[^hn-rewrite] |
| State (server) | Per-user in-memory + per-user folder of `.md` on disk + Redis abstracted behind a `db.go` interface in tests[^adr-db] | `server/db/`, `server/fs/` |
| Bot | Long-polling Telegram updates; per-user goroutine channels for serialization | `server/bot.go`, `docs/bot.md` |
| Tests | E2E tests (test both web app and server); strong opinion against mocks in favor of "real implementations or at least fakes" | `tests/`, `server/*_test.go`[^backend-guidelines] |
| Distribution | Docker Compose for self-host; systemd via `make deploy_systemd` for manual deploy | `Dockerfile`, `compose.yaml`, `docs/your-own-server.md`[^self-host] |

The repo as a whole is **~55% Go, ~28% JavaScript, ~14% CSS, ~2% HTML** (GitHub language breakdown).[^api-meta]

### Storage model — the filesystem IS the schema

The canonical store is a folder on disk. The author's glossary defines the data model in prose, not JSON Schema or SQL DDL[^glossary]:

> - `filename` — a filename with extension, like "note.md" (**USE THIS AS ID**)
> - `header` — an extension-stripped and capitalized filename, like "Note"
> - `body` — file's content
> - `dir` — a dir that is meant to store notes under some category
> - …
> - Any file can be uniquely identified by filename and dir. **We only support one level of nesting.**

Reserved files and dirs (the README publishes this as part of the user-visible spec, and as `llms.txt` for AI agents)[^files-structure][^llms]:

```
Chat.md            ← unsorted capture, universal entry
Later.md           ← postponed tasks (checklist)
Read.md, Watch.md, Shop.md  ← curated checklists
brain/*.md         ← notes by category
journal/YYYY.MM Month.md     ← monthly journals
habits/*.md        ← one file per habit
media/*            ← images
archive/*.md       ← archived items (Done.md inside)
config.json        ← user settings
```

Inside each journal file, daily headers are `#### 15 August, Friday` and entries are timestamped lines: `` `10:30` Morning walk ``.[^llms] Checklists are vanilla GFM `- [ ]` / `- [x]`. Notes are free-form Markdown. **There is no frontmatter** — the author's repeated explicit choice is that *the filename is the only metadata you need*, and anything that could go into frontmatter goes into the body where a human can read it.

The 2025-07-08 ADR adds a subtle but important detail: "*Root folder is now `/`, not ''. All files in webapp are identified by path, not by 'dir' + 'filename'*"[^adr-root] — internally the data model has migrated to path strings, but the **constraint of one level of nesting was kept**.

### Indexing / search

There is no search index — search is direct over files. The editor's "Open file search" modal (`Cmd+K`) operates on filenames; deeper content search relies on the operating system. This is consistent with the principle that the filesystem is the schema: if you want to search, use `grep` or `ripgrep` or the OS spotlight, all of which already work on plain text.

The sync server keeps two structures on disk that aren't notes:
1. An **append-only fslog** that records every server-side delete/rename as `<microsecond-timestamp> del <abs-path>`, so other clients learn about deletions they weren't online to receive directly.[^sync-flow]
2. **Per-user `config.json`** for preferences, which is re-read from disk on every access (not cached) to avoid race conditions with the worker goroutine — the 2024-08-20 ADR documents this explicitly as a defensive choice against stale writes during the bot's 2-second external-API delays.[^adr-config-reread]

### Sync — stateless content + log-based metadata

This is the most architecturally interesting part of the system, and the most relevant to us if we ever want multi-device sync without running a CRDT engine.

The model from `docs/sync-flow.md`[^sync-flow]:

1. **Content sync is stateless.** The server doesn't track which client has seen which version. The client sends `(path, content, mtime, lastClientModified, lastClientSynced)`; the server compares timestamps and replies with one of four statuses: `notModified` / `updatedOnServer` / `merged` / `ok`. No server-side per-client state required. (ADR 2025-06-04: "*For content-only sync (no renames/deletes) we don't store any state on server, we compare hashes & last ctimes.*"[^adr-stateless-sync])
2. **Deletes/renames need a log.** A pure timestamp-comparison protocol can't represent "this file used to exist and was deleted" — without a log, a deleting client deletes, then a second client which still has the file locally would re-upload it from its own disk and the file would resurrect. So the server maintains an `fslog` that records deletions, and `/syncFilenames` responses include "deletes you haven't seen yet" since the client's last cursor. (ADR 2025-06-04: "*Stateless sync is tricky to implement — we would have to send all files in every request. Since we're only renaming on server — we'll only track renames.*"[^adr-fslog])
3. **Two parallel sync channels.** A *batch* `POST /syncFilenames` for all non-open files, and a *per-file* `POST /syncFile` for the currently-open editor (so an active edit doesn't race with the batch sync).[^sync-flow]
4. **mtime, not ctime, for content sync.** Originally used ctime; switched to mtime in July 2025 because Dropbox mutates ctime on metadata operations. mtime is also restorable from `.git` / archives; ctime isn't.[^adr-mtime]
5. **Microsecond timestamps.** Not nanoseconds — JS loses int64 precision at that scale. Microseconds are enough because real file operations are spaced much further apart than the ~1ms Linux `CONFIG_HZ` resolution anyway.[^adr-microseconds]
6. **Sequential per-user updates.** All updates for a given user are routed through a per-user goroutine channel to serialize concurrent edits and prevent file-write races.[^adr-sequential] Granular locks remain inside `db`, `journal`, `userconfig` (ADR 2025-09-01) so that long-running ChatGPT calls in workers don't block the user's interactive edits.[^adr-granular-locks]

The HN-thread sync question elicited a clear answer from the author: client-side sync via something like remotestorage.js was raised as issue #19 (open), but the project has stuck with its own simple HTTP-based approach.[^issue-19]

### UI architecture

- The PWA is a **two-column layout**: left sidebar (file tree, single level of nesting), right editor (CodeMirror in HyperMD mode for live rich rendering of Markdown without leaving the source).
- A **chat dialog** can be toggled on top (`Cmd+Shift+Enter`) — this is the universal capture surface.
- **Hotkeys are first-class**: `Cmd+K` (search), `Cmd+N` (new), `Cmd+M` (move), `Cmd+D` (delete), `Cmd+[` / `Cmd+]` (prev/next file), `Cmd+~` (toggle sidebar), `[` (insert link).[^hotkeys]
- **Theme: light + dark + Flexoki + "brutal"** themes are shipped; the `meta theme-color` is set per `prefers-color-scheme`.[^index-html]
- **Reduced motion is NOT honored.** There's no `prefers-reduced-motion` media query in `web/app.css`; the app uses `transition: opacity 0.12s`, `transform 0.3s ease`, and a `sidebar-highlight` animation regardless of OS preference. (See "Lessons" section — this is something we should deliberately *not* copy.)[^css-audit]
- **Focus styles are removed on inputs.** `outline: none` on inputs without a `:focus-visible` replacement; the only keyboard-visible feedback is background color on `show-hint` items. This will fail WCAG 2.4.7 (Focus Visible).[^css-audit]
- **Some ARIA, not much.** I counted 9 `aria-label`s, 2 `role=` attributes (the sidebar resize is correctly `role="separator"` with `aria-orientation="vertical"`), 1 explicit `tabindex="0"`, 0 `alt` attributes, and 0 `aria-live` regions in the `index.html`.[^a11y-audit] The toolbar SVG icons are individually labeled (`aria-label="New File (⌘N)"`, etc.), which is good. There is no skip-to-content link. No semantic landmarks (`<header>`, `<main>`, `<nav>`).
- **Tooltips are custom (`data-tooltip` attribute + `:hover::after` pseudo-element)**, not native `title`. They aren't reachable by keyboard or screen reader; they're decoration. Issue #37 is filed by a user complaining about the tooltip reveal animation being too slow ("maddening — need the info immediately"), which was closed as resolved by tightening the timing — but the underlying *accessibility* of the tooltip pattern itself isn't addressed.[^issue-37]
- **PWA manifest is minimal**: standalone display, light/dark theme colors, just 192px and 512px icons (also marked maskable).[^manifest]

### Backend guidelines (relevant to anything we lift)

From the README's "Backend guidelines"[^backend-guidelines]:

> - We write **tests**
> - We don't use `get*` prefix for methods
> - No panics, errors are part of business logic
> - If we are ignoring an error - we leave a WHY comment
> - We wrap errors all the time, we should add method's context
> - No iterators for client code
> - We prefer real implementations or at least fakes over mocks and stubs
> - Imports should only be renamed to avoid a name collision with other imports
> - **With portability in mind, everything is stored in plain `.md` files**

The performance note at the bottom of the README is a tiny but characteristic gem: it shows you the relative cost of a mutex (25ns) vs an SSD random read (150,000ns) to justify "*don't be afraid of using files or mutexes unnecessarily for performance reasons.*"[^perf-note]

---

## Lessons for our project

This is the opinionated part. Our app is accessibility-first (ADHD/Autism, WCAG 2.1 AAA target) and college-student-/-academic-oriented. Files.md is a thoughtfully designed personal app for one developer-skewed audience, which means some of its choices are gold for us and some are actively wrong.

### Adopt (with high confidence)

1. **Plain `.md` files as canonical storage. Adopt fully.** This is the right answer for academics for the same reasons it's the right answer for Zakirullin — your notes outlive the app, every other tool already reads them, version control works, AI agents work, grep works. For students writing thesis chapters this is non-negotiable. If we want a database for indexing/search, build it as a *derived* cache, never as the source of truth.
2. **Filesystem-as-database. Adopt with one caveat.** Files.md's "one level of nesting" rule is too strict for academics who organize by course-→-week-→-assignment, but the underlying principle — that the user's folder structure IS the data model, not something imposed by the app — is correct. We can allow deeper nesting and still keep the principle.
3. **Conventional structure, optional adherence.** The `Chat.md` / `Later.md` / `journal/YYYY.MM Month.md` pattern is a beautifully understated piece of design — it makes the empty state useful without forcing a workflow. We should similarly ship a *recommended* structure (e.g. `Inbox.md`, `Courses/`, `Sources/`, `Drafts/`) that the user can ignore, but adopting which gets them immediate value. For ADHD users, a sensible default is *crucial* — decision paralysis at "where do I put this?" is a real failure mode.
4. **Capture-then-organize as the default flow.** The "everything starts in chat, you sort it later" pattern is *especially* well-suited to ADHD. The 2026-04-22 ADR ("*that one click was the reason adding new tasks became frustrating*"[^adr-chat]) is essentially a case study in friction-as-disability. We should steal this whole-cloth: a universal capture surface, with zero required metadata at write-time, where things go to live until the user (or an LLM helper) routes them.
5. **Hotkey-first UX with discoverability.** Files.md's hotkey table is excellent for power users but useless to someone who never reads the README. We should keep the underlying philosophy (every operation has a keystroke) but add a command palette (`Cmd+K`-style) that *shows the keystroke next to each action* the way GitHub and Linear do. This is both better for ADHD (reduces working-memory load — you don't have to memorize, just recognize) and better for keyboard-only / screen-reader users.
6. **Standard Markdown links, not wikilinks.** Adopt. The interoperability argument applies double for students who paste notes into Word, Google Docs, LaTeX, or LMS submission boxes.
7. **Vendor your dependencies / avoid build systems where you can.** Adopt the *spirit*. We won't literally hand-vendor every npm package — that fight is unwinnable in 2026 — but we should treat every dependency as a long-term liability the way Zakirullin does, and prefer stdlib / platform APIs whenever they exist. Tauri makes this easier than Electron does.
8. **Local-first with three tiers of sync.** Adopt the model directly: (1) local-only is default and free, (2) cloud-folder sync via the user's existing iCloud / Dropbox / Drive is free and zero-setup, (3) self-host as a power-user option. For academic-institution settings where IT has data-residency rules, this is the only morally defensible architecture.
9. **Stateless content sync + append-only log for tombstones.** If we build a sync server, this is the model. It's simpler than a CRDT, doesn't require any per-client state on the server, and is easy to debug because the log is a plain text file. Files.md has clearly survived real-world Dropbox metadata weirdness, mtime-vs-ctime issues, and JS int64 imprecision — those are exactly the bugs we'd hit too.
10. **Architecture Decision Records in the README.** The 40+ dated ADRs at the bottom of the README are the single most valuable artifact in the whole repo for an outsider trying to understand *why* the project looks the way it does. We should adopt this pattern from day one. (And we should write ADRs about accessibility decisions, since those are exactly the design choices that get forgotten and quietly broken.)
11. **Tolerant Reader on parse, hard fail on partial-valid.** Adopt. This is genuinely good advice for any markdown-handling code.
12. **Ship a `llms.txt` / structure manifest.** Adopt. Even if our app's users never look at it, an AI helper they paste their vault into will be much more useful with one. This is forward-looking and free to provide.

### Adopt with adaptation

1. **Hand-rolled markdown parsing vs an AST.** Files.md's argument is real ("3× less code, far less mentally taxing"[^adr-no-ast]) but a parsing library buys us syntax-tree precision that *will* matter for accessibility — e.g. announcing "heading level 2: Methods" to screen readers requires knowing the AST. **Recommendation**: use a real parser (`remark` / `unified` for JS, `pulldown-cmark` for Rust if we go Tauri), but follow the *philosophy* of keeping our own code thin around it.
2. **Single Go binary on the server.** If we ever build a sync server, this is the right model — but it should be a *Rust* binary for a Tauri-leaning project, both for ecosystem coherence and binary size.
3. **Vanilla JS frontend, no build system.** This is *aspirationally* lovely and *practically* impossible if we want any non-trivial accessibility tooling (component-level focus management, ARIA-live announcement queues, virtual scrolling that doesn't break screen readers — all of these benefit from a real framework). **Recommendation**: keep the *outcome* the author wants — open `index.html` in 10 years and it works — by choosing a framework that ships static HTML/JS (Astro, Eleventy, SvelteKit static export) rather than a runtime-React-heavy stack.
4. **OPFS as default storage.** Adopt for the web version if we ship one. For Electron/Tauri, the underlying OS filesystem is already accessible, so OPFS doesn't apply — but the *user choice* of "do I want OS files or app-managed files?" is worth surfacing the same way Zakirullin does.

### Reject (deliberately)

1. **Reject: the anti-PKM, anti-tooling sermon as user-facing copy.** The README's "Notes can prevent experience" and "Self-help through reading and taking notes" sections are intellectually interesting but *exactly wrong* for our audience. For an ADHD student, an externalized scaffold is a prosthesis for executive function, not a substitute for thinking. For an Autistic student, a predictable system for managing class materials is a sensory regulator. We should *adopt* the anti-feature-bloat principle internally, but *never* lecture our users that their need for structure is a moral failing. (Westenberg's essay is about *her own* experience as a writer; it shouldn't be projected onto students with disabilities.)
2. **Reject: aggressive minimalism in the UI affordances.** Files.md hides things — chevrons, badges, type indicators — in service of "calmness." For ADHD users, *under*-cued interfaces are worse than over-cued ones. We need persistent visual anchors (folder icons, file-type badges, modification dates, breadcrumbs, focus rings that you can see from across the room) even if they look "busy" to a minimalism aesthete. The right tension is "no decoration, but every functional element has a clear name and a visible focus state," not "remove anything that doesn't earn its place."
3. **Reject: removing input outlines.** Files.md does `outline: none` on inputs.[^css-audit] This fails WCAG 2.4.7 (Focus Visible) at A, never mind AAA. We need a strong, consistent `:focus-visible` ring everywhere, ideally implemented once via a CSS layer.
4. **Reject: SVG-only icons without text labels in primary nav.** Files.md's toolbar is a row of SVGs with `aria-label`s. The labels make the icons screen-reader-accessible — but for cognitive-accessibility (ADHD/Autism, also dyslexia) icons-without-text-labels are a known antipattern. Our toolbar should show text labels by default, with icons as redundant cues, and let the user collapse to icon-only if they want.
5. **Reject: tooltip-as-primary-information.** Files.md's `data-tooltip` pattern (hover-only, custom CSS) means the information is unreachable by keyboard, by screen reader, and by anyone on touch. Issue #37 even shows a sighted user finding the reveal animation unbearable. We should never use hover-only tooltips for non-redundant information.
6. **Reject: no `prefers-reduced-motion`.** Files.md transitions, animations, and the "sidebar-highlight" animation all fire regardless of OS preference.[^css-audit] We must honor `prefers-reduced-motion: reduce` everywhere — non-negotiable for vestibular disorders and a major issue for some Autistic users.
7. **Reject: hidden tokens / "calm" syntax obscuring.** A 2026-04-11 ADR introduces a behavior where the `(...)` part of a Markdown link is hidden when the cursor isn't on the line, "*visually I want to work with them as if they were minimal [links].*"[^adr-hide-tokens] For dyslexic users, a system where text *moves and reflows as your cursor moves* is genuinely disorienting. We should let the user opt into rendered/source switching, but never silently transform what's on screen based on cursor position.
8. **Reject: Chrome-best.** File System Access API support is a real constraint, but for an accessibility-first product we *cannot* be Chromium-first — Firefox is the only browser whose accessibility tools (e.g. high-contrast forced colors, accessibility tree introspection) are first-class on Linux, and many academic users are on institutional Firefox installs. Going Electron/Tauri sidesteps this entirely; this is one reason *not* to ship a web-PWA-first product.
9. **Reject: Telegram as the mobile story.** Telegram is the wrong shape of "trust the user" for institutional / minors / international-student contexts. If we want a write-only mobile capture surface, we should build a thin PWA or use the platform share sheet — not depend on a third-party messenger.
10. **Reject: hand-rolled "brutal" theme as the only design language.** Files.md ships Flexoki (which is excellent and we should consider it) and a "brutal" theme. For WCAG AAA contrast (7:1 for normal text), we need to *audit and certify* our themes, not just provide light/dark variants. Adopt the principle of palette tokens (CSS variables); reject the assumption that "the developer picked nice colors" is enough.
11. **Reject: filename-as-only-metadata.** Files.md has no frontmatter and no tags. For academic use (citations, paper metadata, course associations, due dates), this is too thin. We need *some* structured metadata, ideally as YAML frontmatter (which keeps the file as plain Markdown and round-trips through Obsidian / Pandoc / Quarto). The "filename is the title" principle is great as a default; "filename is the *only* metadata" is too austere.
12. **Reject: dependency on plain disk timestamps for sync.** mtime/ctime work for a single-user-many-devices model. For a project where students might collaborate on a shared course folder via cloud sync, we'll eventually need vector clocks or proper CRDTs. Files.md's model is a great *starting point* but we should not claim our sync handles collaboration if we copy it verbatim.

---

## Things to know

### Maturity

- **5 years of single-author development.** The README says "*I have been building this project for 5 years*."[^readme-5-years] The repo was created 2023-05-23 on GitHub, but ADRs cite work from 2023-06 onwards including reworks of major components — the GitHub history is itself ~2 years; the "5 years" includes pre-public work the author references in his cognitive-load essay and his other repos.[^api-meta]
- **2.6k stars, 78 forks, 5 open issues at the time of writing.**[^api-meta] Recent activity is intense — `pushed_at` shows commits on the same day as this review (2026-05-23), and the open-issue count is low because the author is closing them fast.
- **Most issues filed *after* the May 2026 Show HN launch.** A long-tail of `bitwombat`-filed UX issues (scrollbar interaction, tooltip animation timing, code-block rendering with trailing `$`) suggests the project is currently absorbing first-time-user feedback at scale. Most issues are getting closed within a few days. This indicates a project in the "post-launch absorb-feedback" phase, not a stable mature release.
- **Beta self-described.** The README labels `app.files.md` as "(Beta)" and warns to "*Occasionally hit force-refresh (`Cmd+Shift+R`) to get new updates.*"[^readme-tagline]

### Activity

- **Single primary maintainer (zakirullin) plus a small set of named collaborators** (alx-ef, kir-drozdov, danolshev, jolice appear in early issues; recent PRs come from one-off contributors). This is a benevolent-dictator project; do not assume governance for any fork.
- **The GitHub Participation chart shows a recent ~700-700% spike in commit volume after the HN launch.** From `repos/zakirullin/files.md/stats/participation`, weekly commit counts go from low double digits to 199 in the most recent week. The author is actively burning down the issue backlog from the Show HN.

### Audience

- **Primary**: developers and developer-adjacent power users who already understand "*just open `web/index.html`*" and who have a personal preference for plain text over apps. The README's confident assumption of technical literacy ("Install Go first"; "go run /abs/path/to/files.md/cmd/...") makes this clear.
- **Author-described**: "*My friends and I have been using this simple setup for five years.*"[^readme-think-deeply] The product is shaped by what worked for the author's circle, which is what makes the design distinctive and what makes the audience narrow.

### Controversy / critique

The HN thread (354 comments)[^hn-thread] surfaces three substantive critiques, none of them dealbreakers:

1. **"Alternative to Obsidian" is the wrong pitch.** Multiple commenters object that the project shares Markdown files with Obsidian but isn't feature-equivalent — and that calling it an alternative invites disappointment. The author acknowledged: "*I don't know a better pitch for it just yet.*"[^hn-alternative-critique] Our framing should not repeat this mistake — call it what it is.
2. **Chrome-only File System Access is the headline limitation.** Issue #34 ("Firefox support?") was filed on day one of the launch; the author's reply is that OPFS works in Firefox/Safari but real local-folder editing depends on File System Access API support, which Mozilla/Apple are still slow on.[^issue-34-quote] Commenter `kyych`: "*That's the thing keeping me back from migrating to files.md.*"[^issue-34-quote]
3. **The "alternative" sometimes-isn't.** The terminal-workflow advocate on HN (`backscratches`-ish) argues persuasively that helix + `markdown-oxide` + the OS's native file tools already provide everything files.md does, with more keyboard friendliness, for users comfortable in a terminal. This is true but not a problem files.md is trying to solve — it's a *different audience*.

No security incidents, no data-loss complaints, no licensing disputes surfaced in any search I ran. The project has not been featured negatively in any aggregator I can find.

### Notable cross-references the author is in dialogue with

- **kepano (Steph Ango) / "File over app"** — direct philosophical lineage, plus the literal Flexoki theme.[^file-over-app][^flexoki]
- **Joan Westenberg's "I Deleted My Second Brain"** — quoted at length in the README.[^westenberg]
- **Tiago Forte's "Building a Second Brain"** — implicitly rejected throughout the README.
- **Obsidian, Logseq, Bear, Notion, Tiddlywiki, Standard Notes** — all named in the HN thread as comparison points; the author doesn't position against any of them specifically.
- **Helix + markdown-oxide** — a substantive HN counterpoint from the terminal-tools camp.

### Inferences vs. facts

A note on epistemic confidence, since the project's documentation is partial:

- **Documented in the README or ADRs (high confidence)**: every design principle in the "What files.md deliberately IS / ISN'T" section, every architectural detail about sync, the storage model, the link-syntax history, the WASM removal, the Fyne attempt.
- **Inferred from code or thin documentation (lower confidence, labeled where I think it matters)**: the accessibility audit numbers (counted from `index.html` directly, confirmed by `app.css` inspection); the inferred design language around "calmness" (the author uses the word repeatedly but doesn't define it); the assertion that the README's anti-PKM tone is intended-confrontational (an interpretation of tone, not an author statement).
- **Genuinely unknown**: the author's monetization plan beyond GitHub Sponsors; whether the closed-source Qt6 native version mentioned on HN[^hn-thread] exists in any working form; how E2E encryption would be retrofitted if/when it's prioritized.

---

[^repo]: GitHub repository home, <https://github.com/zakirullin/files.md>, viewed via `gh repo view` and direct fetch.
[^app]: Web app URL given in README intro: "*Try it out: [app.files.md](https://app.files.md) (Beta).*"
[^site]: Marketing site URL: "*Main site: [files.md](https://files.md).*"
[^llms]: `https://files.md/llms.txt` — published "Files.md – Files Structure" manifest, written explicitly for paste-into-`CLAUDE.md`/`AGENTS.md` consumption per README "Files structure" section.
[^author-profile]: GitHub API `users/zakirullin`: `{"name":"Artem Zakirullin","bio":"On sabbatical ⛵","location":"Limassol, Cyprus","public_repos":20,"followers":511,"created_at":"2013-01-23"}`.
[^cognitive-load]: <https://github.com/zakirullin/cognitive-load> — 12,226 stars as listed in `users/zakirullin/repos` response; cited from README "How to contribute" section: "*Refer to [this guide](https://github.com/zakirullin/cognitive-load) for more comprehensive rules.*"
[^hn-thread]: <https://news.ycombinator.com/item?id=48179677> — "Show HN: Files.md – Open-source alternative to Obsidian", 719 points, 354 comments, posted ~May 2026. Fetched via WebFetch and Algolia HN API.
[^bot-link]: README "Save things in the chatbot" section: "*[Telegram Bot](https://t.me/FilesMDBot). Other messengers will follow.*"
[^server-dir]: README "Repository structure": "*`cmd/server` - entrypoint for server*"; "*`server/sync/` - sync API server code*"; "*`server/bot.go` - bot*."
[^license-file]: Repo file `LICENSE`: "*MIT License. Copyright (c) 2023 Artem Zakirullin. Permission is hereby granted, free of charge, to any person obtaining a copy of this software…*" — full standard MIT text.
[^api-meta]: GitHub API `repos/zakirullin/files.md`: `{"stargazers_count":2615,"forks_count":78,"open_issues_count":5,"license":{"key":"mit","spdx_id":"MIT"},"language":"Go","created_at":"2023-05-23","pushed_at":"2026-05-23"}`.
[^web-lib-list]: Repo dir listing `web/lib/` includes `LICENSES.txt`, `codemirror.css`, `codemirror.js`, `hypermd.css`, `hypermd.js`, `katex.min.css`, `katex.min.js`, `mermaid.min.js`, `normalize.css`, `theme-brutal.css`, `theme-brutal-dark.css`, `theme-dark.css`, `theme-flexoki.css`, `theme-light.css`, plus a set of `codemirror-*.js` syntax modes.
[^readme-tagline]: README first lines: "*# Files.md — Private, quiet space for thinking. A simple app for your `.md` files… Try it out: [app.files.md](https://app.files.md) (Beta).*"
[^readme-manifesto]: README quote block right under the screenshot, before the "5 years" paragraph.
[^file-over-app]: <https://stephango.com/file-over-app> — Steph Ango (kepano), Obsidian CEO. Quoted verbatim from WebFetch summary; the line "*If you want your writing to still be readable on a computer from the 2060s or 2160s, it's important that your notes can be read on a computer from the 1960s*" is the essay's signature.
[^flexoki]: Repo file `web/lib/theme-flexoki.css` opens with: `/* Flexoki theme https://github.com/kepano/flexoki */`. Confirmed by reading file contents.
[^hn-kepano]: HN-thread comment from `kepano`: "*True, and it's great that they don't block those (they absolutely could). But those are plugins and aren't as easy to use as the integrated sync.*" — confirmed via Algolia HN API search.
[^westenberg]: <https://www.joanwestenberg.com/i-deleted-my-second-brain-692aa40d59d5f06dd5131e43/> — quoted in the README's "Second Brain?" section.
[^readme-2nd-brain]: README "Second Brain?" section, immediately following the Westenberg quote: "*Second Brain is getting better. But the first brain is not improving. And that's an issue. In the AI age, your first brain is as valuable as ever.*"
[^readme-prevent-experience]: README "Notes can prevent experience" section: "*Reading and taking notes can easily fool us into believing that we understand a text… The worst thing is that we don't let new experiences emerge because we already have knowledge.*"
[^readme-self-help]: README "Self-help through reading and taking notes?" section: "*Harm caused at the emotional level must be healed at the emotional level. Not through intellectual work and taking notes. Reading without action is entertainment.*"
[^cognitive-load-link]: README "How to contribute" section refers contributors to <https://github.com/zakirullin/cognitive-load> as the project's comprehensive style rules.
[^backend-guidelines]: README "Backend guidelines" section, verbatim 8-bullet list.
[^glossary]: README "Glossary" section: "*`filename` - a filename with extension, like 'note.md' (**USE THIS AS ID**)… Any file can be uniquely identified by filename and dir. **We only support one level of nesting**.*"
[^sync-flow]: Repo file `docs/sync-flow.md`. Contains the full Mermaid flow diagrams, `/syncFile` vs `/syncFilenames` distinction, fslog protocol description with sequence diagram, and the "drift-seal line (files.js:1028)" footnote.
[^hn-rewrite]: HN-thread zakirullin reply (captured via Algolia API): "*Server setup before the rewrite: docker + php-fpm + php7 + larvel + nginx + redis + cron + worker + certbot. Server after the rewrite to Golang: server, a 15MB no-dependencies binary that has everything.*"
[^frontend-guidelines]: README "Frontend guidelines": "*No build systems, **in 10 years we will open `/web/index.html` and it should just work**.*" and "*It would be fantastic if, one day, we replaced `CodeMirror` with our own tiny implementation.*"
[^contributing]: README "How to contribute" section bullet: "*Code should be self-sufficient, so `vendor` and `web/lib` folders are included in the repository.*"
[^adr-vendoring]: README ADR dated `09.09.2024`: "*We use vendoring for dependencies. We want all our few dependencies to be in the repo, so we don't care about blocked/removed dependencies. Our repository is the self-sufficient source of truth.*"
[^adr-opfs]: README ADR dated `11.07.2025`: "*Decided to use OPFS as an initial driver for file system. Better browsers support, less hustle for users. The app starts with OPFS driver by default, if needed, user can replace the driver with Local FileSystem API by opening a local dir. DirHandle would be saved to IndexedDB in such scenario and reused every time.*"
[^adr-chat]: README ADR dated `22.04.2026`: "*It was mentally taxing to see two buttons/messages 'to inbox' and 'to chat'… that one click was the reason adding new tasks became frustrating. I let go of two different flow, and now everything goes to inbox, and every item is inbox is a markdown checklist item.*"
[^adr-wikilinks]: README ADR dated `11.11.2024`: "*Removed Wikilinks support. Only plain Markdown links, our knowledge base must be interoperable.*"
[^adr-mdlinks-2026]: README ADR dated `11.04.2026`: "*Brought back standard Markdown Links. I want the knowledge base to be cross-platform. It should work in GitHub.*"
[^adr-cross-platform]: README ADR dated `16.06.2025`: "*I believe it's time to make our knowledge base cross-platform, by forbidding characters like ':?<>*' in filenames. These characters aren't allowed in some environments (like Windows, PWA).*"
[^adr-tolerant-reader]: README ADR dated `08.07.2024`: "*Adherence to Tolerant Reader principles. If enconunter gibberish during parsing - we skip it, but if we encounter flags of valid data (let's say `###`) but data itself is invalid - we panic. TODO preserve gibberish during read-write cycle.*"
[^adr-no-ast]: README ADR dated `08.07.2024`: "*Gave up on AST parsing/rendering. We had lots of corner cases via AST and the code was way complex. Markdown isn't that hard to parse, we can do it via good old straigforward code. We have 3x times less code now, and it is far less mentally taxing to understand.*"
[^adr-telegram]: README ADR dated `12.06.2025`: "*We use Telegram bot as distract-free write-only entrance to our knowledge base. The only issue is, it is not as wildly popular in EU/USA.*"
[^adr-telegram-eu]: Same ADR (12.06.2025) continued: "*I've come to the idea that we can transform app.files.md to a chat once we decrease the window size! Would be default behaviour on mobiles.*"
[^readme-llm-friendly]: README "Another note taking app?" bullet list: "*Extremely simple code. **One person or an LLM can fit the whole project in head***" and "*The codebase is ready for your LLM to extend to your needs.*"
[^hn-author-remove]: HN-thread zakirullin reply: "*For the most part I was thinking more about what I can remove :D*" — captured via Algolia API.
[^hn-alternative-critique]: HN-thread top-level comment: "*I wouldn't show it as an alternative to Obsidian though. It shares MD files with it…*" The author's reply, paraphrased in WebFetch summary: "*I don't know a better pitch for it just yet.*"
[^backlink-cmd]: README "Useful scripts for your files" section: `cmd/backlink/backlink.go` — "*Adds links back to referencing files (`--dry-run` available).*" Note this is a one-shot CLI tool, not a live feature.
[^hn-e2e]: HN-thread zakirullin reply on encryption / Telegram trust: "*For the most part I use the project from my Telegram bot…it is not possible to do proper E2E. Will see if people use the chatbot…*"
[^readme-private]: README "Another note taking app?": "*Local-first, files don't leave your device*"; reinforced under "How to sync" table for the local-first column: "*`app.files.md` doesn't send any data.*"
[^adr-fyne]: README ADR dated `06.10.2024`: "*Removed fyne.io. At first, I wanted a lightweight alternative to Electron, and fyne.io seemed to be an ideal candidate. After a few days working with it 80% of bot functionality was implemented… The thing is, to implement the rest of the functionality, we would have to apply A TREMENDOUS amount of effort. I am talking tiny details such as scrolling, emojis rendering, text selecting behaviour, links support, etc… As much as I hate using the web stack for the desktop applications, it doesn't seem like we have a choice. Let's try wails.io.*"
[^adr-wasm]: README ADR dated `21.09.2025`: "*Removed WASM. I had a bug when a message was removed from Inbox.txt, and was not added to a file… JS -> Go (writeFile) -> Go awaiting a promise from JS -> JS Golang runtime somewhere in between -> JS (writeFile) -> Go (returning from promise) -> Sending results back to JS. And it has to be done in a separate goroutine, because both WASM and JS are running in the same thread… Also, inbox.wasm is ~8MB and I wanted the application to be really small.*"
[^adr-no-note]: README ADR dated `09.07.2024`: "*Note term is way too vague. Let's try to use 'file' term, without any high level abstraction (like note).*"
[^issue-34-quote]: GitHub issue #34 "Firefox support?", filed 2026-05-21 by `Jagusz`. Comment from `kyych`: "*That's the thing keeping me back from migrating to files.md.*" Author reply from `zakirullin`: "*It works in Firefox, Safari and other browsers via OPFS (browser local storage). About the local file system. I'd really be happy if Firefox and Safari were better at supporting File System Access API. As soon as they improve their support - you would be able to open local folders.*" Issue closed.
[^index-html]: Repo file `web/index.html`, fetched directly. Notable: `<meta name="theme-color" content="#F8F8F7" media="(prefers-color-scheme: light)">` and `... content="#262624" media="(prefers-color-scheme: dark)">`; vendored library `<script>` and `<link>` tags for CodeMirror, HyperMD, KaTeX, sidebar, etc.; a comment `<!-- mermaid.min.js is lazy-loaded on first \`\`\`mermaid encounter -->`.
[^adr-katex]: README ADR dated `20.05.2026`: "*Added LaTeX support, even though I wasn't happy about +20 font files. LaTeX is text-based and LLM-friendly. Text + Math will cover pretty much everything.*"
[^adr-mermaid]: README ADR dated `22.05.2026`: "*Added Mermaid support. It was decided to lazy-load the script, because mermaid.min.js size is 3MB. It's quite a load to load synchronously for such a small app.*"
[^self-host]: Repo file `docs/your-own-server.md`. Describes `docker compose up`, `make init_server`, `make deploy_systemd host=...`, and an `.env` file holding `BOT_API_TOKEN`, `STORAGE_DIR`, `CERT_DIR`, `TOKENS_DIR`, `LOG_FILE`, `API_URL`, `APP_URL`.
[^adr-db]: README ADR dated `13.06.2023`: "*Introduced `db.go`. We had to abstract away Redis anyway (otherwise it's hard to write tests).*"
[^files-structure]: README "Files structure" section publishes the conventional layout: `Chat.md`, `brain/Note.md`, `<category>/*.md`, `Project.md`, `Read.md`, `Watch.md`, `Shop.md`, `journal/2024.08 August.md`, `Later.md`, `habits/*.md`, `media/*`, `archive/*.md`, `config.json`.
[^adr-root]: README ADR dated `08.07.2025`: "*Root folder is now `/`, not ''. All files in webapp are identified by path, not by 'dir' + 'filename', restricting to 1 level of nesting.*"
[^adr-config-reread]: README ADR dated `20.08.2024`: "*We read every userconfig value from the config file on every access. We don't need load/save whole config before/after `bot.Answer()` method… we may have significant networking delays in `bot.Answer()` (let's say 2 seconds when making external requests), there are good changes that during those 2 seconds `worker.MoveDueTasks()` will modify `userconfig.Schedule`, causing data race.*"
[^adr-stateless-sync]: README ADR dated `04.06.2025` (second): "*For content-only sync (no renames/deletes) we don't store any state on server, we compare hashes & last ctimes.*"
[^adr-fslog]: README ADR dated `04.06.2025` (first): "*Introduced append-only log for syncing. Stateless sync is tricky to implement - we would have to send all files in every request. Since we're only renaming on server - we'll only track renames.*"
[^adr-mtime]: README ADR dated `08.07.2025`: "*Dropbox is changing some metadata for newly created files, thus ctime is changed… Migrated to mtime. Mtime is used for content-based sync, ctime is used for append-only sync log (renames/del). Also we can restore mtime from .git/archive, unlike ctime.*"
[^adr-microseconds]: README ADR dated `24.06.2025`: "*Switched to microseconds for tracking file changes during sync. Gap between consecutive files creation is more than enough… We didn't go for nanosec because js is having troubles with int64 precision.*"
[^adr-sequential]: README ADR dated `26.10.2024`: "*Updates are now processed sequentially on per-user basis. Because there were some race conditions on concurrent file writings. Also we faced out-of-order forwarded messages processing, and it was impossible to collapse them to one message.*"
[^adr-granular-locks]: README ADR dated `01.09.2025`: "*We use granular locks (in db, journal, userconfig) instead of one global per user lock so to avoid bottlenecks. Workers might use 3rd party API like ChatGPT, and we don't want to hold user's lock all that time.*"
[^issue-19]: GitHub issue #19 "Client side sync", filed by `jonocodes`: "*Have you considered using remotestorage.js for this? I dont entirely understand the sync story for files.md, but having the sync moved to this library may abstract away issues like sync resolution and the chrome requirement.*" Still open at time of review.
[^hotkeys]: README "Hotkeys" table — full reproduction in the architecture section above.
[^a11y-audit]: Direct count from `web/index.html` (fetched via raw content): `aria-label` = 9 occurrences, `role=` = 2, `alt=` = 0, `aria-describedby` = 0, `aria-live` = 0, `tabindex` = 1. Examples include `aria-label="New File (⌘N)"`, `aria-label="Resize sidebar with mouse"` paired with `role="separator"` and `aria-orientation="vertical"`. No `<main>` / `<header>` / `<nav>` landmarks. No skip-to-content link. Inference: this is genuine-good-intent partial coverage, not adversarial — the patterns are correct where present.
[^css-audit]: Direct analysis of `web/app.css` (fetched via raw content). Base `html { font-size: 64% }` with body `calc(1.5rem + 0.2vw)` ≈ 19px at typical viewport. CSS variables for colors (`--col-tx`, `--col-bg`, `--col-link`, etc.). `outline: none` on inputs without `:focus-visible` fallback. No `@media (prefers-reduced-motion: reduce)` blocks anywhere in the file. Transitions and animations (`sidebar-highlight`, opacity/transform transitions) fire unconditionally. Font stack: `-apple-system, BlinkMacSystemFont, 'Inter', sans-serif`. Max content width ~800px.
[^issue-37]: GitHub issue #37 "Opinion - tooltip reveal animation maddening - need the info immediately." Filed 2026-05-22 by `bitwombat`. Closed; resolved by tightening the tooltip animation timing.
[^manifest]: Repo file `web/manifest.json`: `{"name":"Files","short_name":"Files","start_url":"https://app.files.md","display":"standalone","background_color":"#F8F8F7","theme_color":"#F8F8F7"}`, with 192×192 and 512×512 icons (both also marked `purpose: maskable`).
[^perf-note]: README "Performance" section: "*The project is blazing fast :) If you're afraid of using files or mutexes unnecessarily for performance reasons, take a look at this: Mutex lock/unlock = 25 ns / Read 4K randomly from SSD = 150,000 ns / 1 ms = 1,000,000 ns.*"
[^readme-5-years]: README intro paragraph: "*I have been building this project for 5 years. Consider supporting on GitHub.*"
[^readme-think-deeply]: README "How to think deeply" section closing line: "*My friends and I have been using this simple setup for five years, and it works well.*"
[^adr-hide-tokens]: README ADR dated `11.04.2026`: "*Even though I want to store links as plain markdown links, visually I want to work with them as if they were minimal [links]. For that I decided to hide (...) part when cursor is on the line. The (...) part is only hidden for markdown-files link.*"
