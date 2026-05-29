# Whiteboard / Infinite Canvas

**Version:** 2.0

A spatial canvas for free-form thinking — sketches, diagrams, sticky-note arrangements, mind-mapping precursor, lecture-doodle capture. Pen-and-touch friendly.

## Why this matters

- ADHD and Autistic users frequently benefit from **non-linear** organization that linear notes can't represent.
- For STEM users: quick equation sketches, circuit diagrams, proof trees.
- For lecture capture: doodle while listening, photograph and OCR a whiteboard from class.
- Sits naturally alongside [mind-maps](../mind-maps/OVERVIEW.md) — overlapping but distinct surfaces.

## Library decision (open)

- **Excalidraw** — MIT, mature, well-known, sketch-aesthetic that users love. Excellent first choice for our license posture.
- **tldraw** — better polish, larger feature set, but **NOT AGPL-compatible** (custom license requires paid production key). **Disqualified per the related-libraries report.**
- We default to Excalidraw unless an MIT/Apache-class alternative emerges by v2.0.

## Design intent

- **Saved per-project** as a file the user can find and back up alongside notes.
- **Linkable from notes.** A markdown note can embed/link to a whiteboard region.
- **Keyboard accessible** to the maximum extent canvas tools allow (this is the universal hard problem with whiteboards; we'll do our best and document gaps honestly).
- **TTS read-along** does not apply (the whiteboard is visual-spatial).

## What v2.0 ships

- Embedded Excalidraw whiteboard per project.
- Save/load to a `.excalidraw` (or similar) file in the project folder.
- Link/embed in notes.
- Pen + touch input where the OS supports it.

## What v2.0+ may add

- Image OCR of imported whiteboard photos.
- AI-assisted "tidy up" of hand-drawn diagrams (hidden in the AI-free build; see the AI-feature-flag note in [ROADMAP.md](../../ROADMAP.md)).

## Relevant Documentation

- [Related libraries](../../research/related-libraries.md) — Excalidraw vs. tldraw license analysis; the tldraw paid-key trap.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — non-linear thinking tools (Heptabase, Scapple, etc.) prior art.
