# Universal Capture Inbox

**Version:** 1.0

A single global hotkey opens a lightweight capture window that writes to `Inbox.md`. The user captures the thought _now_; organization happens later. Designed for ADHD executive-function support: never make the user decide "where does this go?" at the moment of capture.

## Design intent

- **One hotkey, everywhere.** OS-global shortcut (works even when the app isn't focused).
- **Minimal capture UI.** A textarea, a "save" command, an "expand" command (open in full editor). No "select project" picker, no tags, no required metadata.
- **Append-only by default.** Captures land in `Inbox.md` at the end. A separator (`---` or timestamp heading) divides sessions.
- **Organize later.** A separate UI surface (the Inbox view) lets the user triage — drag/promote items into projects, delete what's noise, leave the rest for later.

## Why this matters

- ADHD users famously lose thoughts that require even one decision before being recorded. The friction of "open app → pick project → start typing" is high enough that thoughts get dropped.
- Inspired by [files.md](../../research/files-md.md)'s `Chat.md` pattern: everything goes to one capture surface first, sorted later if at all.
- A successful inbox reduces _both_ lost thoughts and the anxiety of "I should organize this now."

## What v1 ships

- Global hotkey registration (configurable; sensible default per OS).
- Capture window: textarea + save + expand + close. Submits on Cmd/Ctrl-Enter; Escape closes without saving.
- Inbox view in the main app: shows the contents of `Inbox.md` with per-item promote/delete/edit actions.
- Captures include a timestamp so the user can correlate later.

## Open questions

- Does the capture window support voice (dictation)? Probably yes — dictation is v1 anyway, and the inbox is the natural place to put "I had a thought while walking."
- Does the inbox surface ingested-but-unsorted items from the document-ingestion pipeline (v1.1)? Probably yes; same triage paradigm.

## Relevant Documentation

- [files.md](../../research/files-md.md) — origin of the universal-capture-surface pattern; the `Chat.md` design.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — the ADHD-tool landscape (Goblin Tools, capture-first apps) this feature draws from.
