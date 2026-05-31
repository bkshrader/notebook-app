# Glossary

Canonical definitions of terms used throughout this project's docs and code. When a term here is capitalized in prose (e.g. "the Library", "a Project"), it carries the specific meaning defined below — not its generic English sense. Keep this file current as the vocabulary evolves.

## Organization model

### Library

The user's **entire** collection — the single top-level container for everything they own in the app: all [Projects](#project) plus the shared [Reference Materials](#reference-material) store. There is one Library per user. On disk it is a single user-configured root folder (the "Library root"), e.g. `~/Notes/`. The Library is also the unit that [git integration](./features/git-integration/OVERVIEW.md) versions and that [remote sync](./features/remote-sync/OVERVIEW.md) (v3) syncs.

> **Not** a subset, a single subject, or one course. If you mean "a course" or "a paper", you mean a **Project**.

### Project

A **scoped subset within the Library** — a course, a research topic, a paper-in-progress. A Project groups related [Notes](#note) and ingested documents, and **cites** shared [Reference Materials](#reference-material). On disk a Project maps to a folder under the Library root: the Project "PHIL 201" is the folder `~/Notes/PHIL 201/`. Every Project-owned file belongs to exactly one Project; a cited Reference Material is **not** owned by the Project (it lives in the shared store and may be cited by other Projects too). (Nested Projects are TBD — likely yes for v1; flat-with-tags is the fallback.)

> Mnemonic: **Library : Project :: drive : folder.** The Library contains Projects; a Project contains files. NotebookLM's "Notebook" is the closest external analogue to our Project (not our Library).

### Reference Material

A **shared source document** — a textbook, white paper, article, dataset, etc. — that does **not** belong to any single Project and can be **cited by many Projects**. Reference Materials live once in a shared store at the Library level; a Project does not own or copy a Reference Material, it **cites it by link** (a pointer in frontmatter or a citation), making the relationship many-to-many.

Reference Materials are **annotatable**: users can highlight and annotate them.

> Two open questions are deliberately **deferred to implementation**: (1) where the shared Reference Materials store lives on disk, and (2) whether annotations are shared across all citing Projects or scoped per-Project. See [bibliography-management](./features/bibliography-management/OVERVIEW.md) and [library-and-projects](./features/library-and-projects/OVERVIEW.md).

> Don't confuse the product concept **Reference Material** (a shared, cited-by-link source document in the app) with the docs-internal senses of "reference": a `docs/research/` [Research doc](#research-doc), or a "Relevant Documentation" link section at the foot of a doc. When you mean the shared source-document concept, write **Reference Material**.

> A Reference Material is **not** a [Note](#note) (Notes are user-authored and Project-owned) and **not** a Project-private file. Its defining trait is being shared and cited across Projects.

### Note

A single user-authored document within a Project. In v1 a Note is a plain `.md` file; in v1.1 it may also be a `.tex` file. A bare `.md` with no frontmatter is a valid Note.

### File

Any app-supported artifact inside a Project — broader than "Note." Includes Notes plus ingested documents (PDF/DOCX/PPTX, v1.1), audio recordings and their transcripts, and their [companion-file](#companion-file) metadata. Projects are file-type-agnostic: each File opens in the renderer appropriate to its extension.

## Storage

### Filesystem-is-canon

The core storage principle: the plain files on disk are the **source of truth**. Any in-app index, cache, or git history is _derived_ and can be rebuilt or discarded without losing note content. See [plain-md-storage](./features/plain-md-storage/OVERVIEW.md).

### Local-first

Notes live on the user's own machine as plain files and the app works fully offline with no cloud account required. Sync is the user's choice. One of the project's non-negotiable constraints.

### Frontmatter (YAML frontmatter)

Optional metadata block at the top of a `.md` Note, delimited by `---`, holding fields like course, due date, tags, or citations. Optional by design — a Note without it is still valid.

### Companion file

A file stored next to a Note that holds sub-file metadata which doesn't belong in the Note body or frontmatter — e.g. `note.md` + `note.notes-meta.json`. Used for things like [timestamp anchors](./features/timestamp-anchored-notes/OVERVIEW.md). Companion files are committed and synced **alongside** their Note so a checkout stays internally consistent.

> Not to be confused with a [Sidecar](#sidecar-python-sidecar), which is a bundled subprocess, not a file.

### Inbox

The single capture surface (`Inbox.md`) that the [universal capture inbox](./features/universal-capture-inbox/OVERVIEW.md) appends to. Capture now, organize (triage into Projects) later. Distinct from a Project — it's the unsorted staging area.

## AI and audio

### BYO AI (bring your own)

The app's AI model: the user configures their own OpenAI-compatible endpoint (local or cloud) per [Profile](#profile). We do **not** bundle a local LLM runtime. A build-time feature flag can produce an entirely AI-free distribution. See [byo-ai](./features/byo-ai/OVERVIEW.md).

### Profile

A user-configurable settings bundle, notably the AI endpoint configuration. AI is configured "per Profile."

### Dictation

One of the three [STT](#stt-speech-to-text) modes: the user speaks to compose text into a Note in real time. Has its own UI surface. See [audio recording and transcription](./features/audio-recording-and-transcription/OVERVIEW.md).

### Live captioning

One of the three [STT](#stt-speech-to-text) modes: real-time transcription of ongoing speech (e.g. a lecture) as it happens. Has its own UI surface. See [audio recording and transcription](./features/audio-recording-and-transcription/OVERVIEW.md).

### Post-hoc transcription

One of the three [STT](#stt-speech-to-text) modes: transcribe an already-recorded audio file after the fact. Has its own UI surface. See [audio recording and transcription](./features/audio-recording-and-transcription/OVERVIEW.md).

### STT (speech-to-text)

Transcription of audio into text. Implemented with [faster-whisper](./research/whisper.md) gated by Silero VAD. Surfaced through three modes: [Dictation](#dictation), [Live captioning](#live-captioning), and [Post-hoc transcription](#post-hoc-transcription).

### TTS (text-to-speech)

Synthesis of audio from text — the app reading a document or Note aloud. Implemented with [Supertonic](./research/supertonic.md). See [text-to-speech](./features/text-to-speech/OVERVIEW.md). This is the standard term; do **not** use "read-aloud" for the same concept.

### Read-along

Synchronized word/sentence highlighting **during** [TTS](#tts-text-to-speech) playback (v1.1). Builds on TTS — TTS produces the audio; read-along adds the visual sync. See [read-along](./features/read-along/OVERVIEW.md).

## User interface

### Component Library

The developer-facing set of accessible React UI primitives under
`src/renderer/src/components/` — thin, Helios-token-styled `forwardRef` wrappers over
[Ark UI](#ark-ui) headless components, each documented and play-tested in Storybook
(styled with [Helios](./features/accessibility/adrs/design-system-helios.md) `--token-*`
custom properties). The building blocks every interactive surface is assembled from. See
[component-library](./features/component-library/OVERVIEW.md).

> ⚠️ **Not** the [Library](#library). The Library is the user's note collection (a product
> concept); the Component Library is the UI toolkit (a code concept). Always write
> "Component Library" in full — never shorten it to "Library" — so the two never collide.

### Ark UI

The MIT-licensed headless React primitives library (built on Zag.js finite-state machines)
that the [Component Library](#component-library) wraps. Ark owns focus management, keyboard
handling, and ARIA wiring; we own the styling and the app-shaped API. State is exposed via
`data-scope` / `data-part` / `data-state` attributes that our token CSS targets. Chosen in
the [unstyled-primitives-ark ADR](./features/accessibility/adrs/unstyled-primitives-ark.md).

## Tooling and process

### Sidecar (Python sidecar)

A bundled Python subprocess (e.g. faster-whisper, Supertonic) the app talks to over IPC, used to run native ML workloads outside the Electron/Node process. ⚠️ Distinct from a [Companion file](#companion-file), which is a data file next to a Note — not a process.

### ADR (Architecture Decision Record)

A [MADR](https://adr.github.io/madr/)-format record of a non-obvious or hard-to-reverse decision, stored under `docs/features/<slug>/adrs/`. Updated (status → `superseded`/`deprecated`), not deleted, when revisited.

### Research doc

A deep-dive document under `docs/research/` on a library, competitor, or adjacent technology — including an AGPL-compatibility verdict and accessibility analysis. Produced via the `/research` skill. Cite these in technical proposals.

### Fallow

A Rust-native codebase-intelligence tool (dead code, duplication, complexity, architecture) run via `npm run audit:fallow`. **Not** a license auditor.

### AGPL-compatible

A dependency whose license permits use when linked into our AGPL-3.0-or-later app — permissive (MIT/BSD/ISC/Apache-2.0/MPL-2.0/LGPL) or (A)GPL-3.0+ itself. The allow list is enforced in CI and rationalized in `docs/licenses/in-use.md`; rejections live in `docs/licenses/incompatible.md`.
