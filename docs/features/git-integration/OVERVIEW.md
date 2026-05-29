# Git Integration

**Version:** 1.0

The app uses git automatically, in the background, to track the version history of a user's Library. Every note is a plain `.md` file (see [plain-md-storage](../plain-md-storage/OVERVIEW.md)), so the Library folder is already a perfect fit for git: line-oriented, diffable, mergeable. We commit changes on the user's behalf so they get full, time-travelable version history without ever needing to know git exists — and, as a side effect, the Library becomes a standard git repo that [remote sync](../remote-sync/OVERVIEW.md) can build on cheaply.

## Goals

- **Invisible version history.** The user writes notes; the app commits. No staging, no commit messages, no git literacy required.
- **Time travel.** View, diff, and restore any past version of a note (or the whole Library) from inside the app.
- **Foundation for sync.** A git repo is the natural substrate for [remote sync](../remote-sync/OVERVIEW.md) — `push`/`pull` to a remote the user controls (GitHub, GitLab, a self-hosted bare repo, or a folder on another disk) without us running infrastructure.
- **Zero lock-in.** The history lives in `.git/` inside the Library folder, in standard git format. If the user stops using the app, `git log` still works. This is the same anti-lock-in principle that drives plain-file storage.

## Design principles

- **The Library folder is the repo.** `git init` runs once when the Library is created (or when the feature is first enabled on an existing Library). The working tree _is_ the user's notes — no separate copy, no shadow store.
- **Filesystem stays canon.** Git is a _derived_ history layer over the canonical `.md` files. It is never the source of truth for current content — the files on disk are (consistent with [plain-md-storage](../plain-md-storage/OVERVIEW.md)). If `.git/` is deleted, the user loses history but loses no notes.
- **Automatic, debounced commits.** Commits are batched, not per-keystroke. A debounce window (e.g. commit N seconds after the last edit, plus a periodic flush) keeps history granular enough to be useful without producing thousands of noise commits. Tune the window to be ADHD-friendly: history should read as a coherent narrative, not a firehose.
- **Generated commit messages.** Auto-commits get descriptive default messages (e.g. `Edit "Lecture 3 notes"`, `Add 2 notes, edit 1`). The user never has to write one. A future enhancement could let power users annotate or name a checkpoint manually.
- **Respect external git.** If the user already manages the Library folder with their own git (their own remote, their own `.gitignore`, their own commit cadence), we must not fight them. Detect a pre-existing repo and either defer to it or operate in a clearly-scoped, opt-in way. Never force-push, never rewrite history the user authored.
- **Opt-out, sensible default.** On by default (it's strictly additive safety for the user's work), but disable-able in settings for users who want to manage git themselves or not at all.

## Why this matters

- **Safety net for the anxious writer.** "Did I lose that paragraph?" is answerable. Nothing is ever truly gone. This directly serves the ADHD-first charter — version history removes the fear that makes people hoard duplicate files.
- **Cheap, honest history.** We get robust, well-understood, battle-tested versioning for free instead of inventing a bespoke history format.
- **Sync for almost free later.** Building v1 storage as a git repo means [remote sync](../remote-sync/OVERVIEW.md) (v3) can lean on git's `push`/`pull`/merge machinery rather than a from-scratch sync protocol. Designing this in now costs little; retrofitting later is expensive.

## Open decisions

These need an ADR (and likely a `docs/research/` entry) before implementation — do not decide ad hoc:

- **Git implementation.** Three candidates, each with tradeoffs:
  - **Bundled system `git`** — most complete and fastest, but adds a runtime dependency we'd have to detect or ship per-platform, and shelling out from Electron has its own friction.
  - **[isomorphic-git](https://github.com/isomorphic-git/isomorphic-git)** — pure-JS, no native dependency, runs in Node and the browser; weaker on large repos and exotic operations. **License needs verifying** (reported MIT) against the AGPL allow list.
  - **libgit2 bindings (e.g. nodegit)** — native speed without the system-git dependency, at the cost of native build/distribution complexity.
  - Decision criteria: AGPL compatibility, no required system dependency if avoidable, accessibility-neutral (this is headless), and "good enough" performance on a multi-thousand-note Library. Write an ADR.
- **Binary and large files.** Ingested PDFs/DOCX (v1.1) and audio recordings are large and non-diffable. Decide whether they live in the same repo (and whether git-LFS or a `.gitignore` carve-out is warranted) or are tracked separately. This intersects with [document-ingestion](../document-ingestion/OVERVIEW.md) and [audio-recording-and-transcription](../audio-recording-and-transcription/OVERVIEW.md).
- **Sidecar metadata.** Sub-file metadata (e.g. timestamp anchors, future indices) stored as sidecar files should be committed alongside their note so a checkout is internally consistent. Confirm the commit unit includes sidecars. See the sidecar discussion in [remote-sync](../remote-sync/OVERVIEW.md).
- **History UI.** What the time-travel surface looks like — per-note timeline, diff view, restore flow — and how it stays fully keyboard- and screen-reader-navigable (diffs are notoriously bad for screen readers; the WCAG 2.1 AA floor applies).

## Accessibility implications

- The background commit machinery is invisible and headless — no a11y surface of its own.
- The **history / diff / restore UI is the a11y-sensitive part.** Diff views must be screen-reader-announceable (added/removed lines labelled, not conveyed by color alone — WCAG 1.4.1 Use of Color), keyboard-navigable between changes, and must not rely on hover. Restoring a version must be a clear, confirmable, keyboard-reachable action. Design this with the same rigor as the editor.

## Relevant Documentation

- [Related libraries](../../research/related-libraries.md) — candidate git libraries to be evaluated and added with license verdicts (isomorphic-git, nodegit/libgit2).
- [files.md](../../research/files-md.md) — the plain-files-as-canon philosophy; notes that version control "just works" on plain files is a stated benefit of this storage model.

## Related features

- [plain-md-storage](../plain-md-storage/OVERVIEW.md) — the storage model that makes git a natural fit; git is a history layer over those canonical files.
- [library-and-projects](../library-and-projects/OVERVIEW.md) — the Library folder is the git repo; project folders map to subdirectories.
- [remote-sync](../remote-sync/OVERVIEW.md) — the v3 feature this enables; a git Library makes `push`/`pull` sync cheap.
