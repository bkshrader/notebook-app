# Video Overviews

**Version:** 3.0 (likely scope-revised — see below)

NotebookLM-style generated overview of a project's content. The roadmap names "remotion.js or similar" but the Remotion research strongly recommends **not shipping actual video** in favor of an "audio walkthrough" — a scrolling document with synchronized narration.

## Why "video" is probably the wrong shape

Per the Remotion research:

- **Remotion itself is not AGPL-compatible.** Custom source-available license forbids relicensing derivatives, conflicts with AGPL §5/§7. Can't ship inside our AGPL app.
- **Revideo** (MIT, TypeScript, Canvas-based) is the AGPL-clean alternative, but it's a smaller community.
- **The 90% case is satisfied without video.** A scrolling document with synchronized audio narration delivers the comprehension value without:
  - Video tooling complexity.
  - Licensing minefields (codecs, fonts, etc.).
  - Accessibility headaches (generated video is hard to make screen-reader-friendly; captions alone are insufficient).
  - Bundle-size and rendering cost.
  - The "share on social media" use case that drove NotebookLM's video feature (irrelevant to us).
- **Audio walkthrough is WCAG-AAA-cooperative by construction** — it's just a document with audio, accessible by default.

## Recommended scope for v3.0

- **Ship "Audio Walkthrough"**: AI-generated overview of a Project's content, rendered as a structured Markdown document with TTS narration sequenced to match. Built on existing [agentic-workflows](../agentic-workflows/OVERVIEW.md) (summarization) and [text-to-speech](../text-to-speech/OVERVIEW.md) infrastructure.
- **Defer Cinematic Video to v4+** as a Revideo-backed _export_ option for users who want the social-shareable thing. Only if there's user demand.

## What "Audio Walkthrough" ships

- Generate-overview action on a Project.
- AI-summarizes sources into a structured walkthrough document.
- TTS narration of the document with [read-along](../read-along/OVERVIEW.md) highlighting.
- Optional export as `.mp3` + `.md` pair for offline consumption.

## Relevant Documentation

- [Remotion](../../research/remotion.md) — full analysis of license incompatibility, alternatives, and the "scroll + narration beats video" argument.
- [NotebookLM](../../research/notebooklm.md) — Cinematic Video and Audio Overview as the prior art we're rethinking.
- [Agentic workflows](../agentic-workflows/OVERVIEW.md) — summarization engine this builds on.
- [Text-to-speech](../text-to-speech/OVERVIEW.md) — narration engine this builds on.
- [Read-along](../read-along/OVERVIEW.md) — synchronized highlighting during walkthrough playback.
