# Audio Recording and Transcription

**Version:** 1.0

Three distinct modes with separate UI surfaces — do not conflate them. Engine: **faster-whisper** in the Python sidecar (the runtime we're already running for Docling/markitdown), with **Silero VAD** for chunking. `base` model bundled by default; larger models offered via the setup wizard and downloadable from settings.

## Mode 1 — Dictation

- The user speaks their notes instead of typing.
- Output flows into the active note at the cursor.
- User controls start/stop with a hotkey.
- **Prioritizes accuracy over latency.** Recommended model: `base.en` or `small.en` (INT8) for English; `base` or `small` for multilingual.
- Pauses on silence (VAD-gated); resumes when speech detected.

## Mode 2 — Live captioning

- Real-time on-screen captions during a recording session; multiple speakers possible.
- Transparent overlay or dock UI; audio always running for the session.
- **Prioritizes latency over peak accuracy.** Small accuracy tradeoff acceptable. Partial-then-revising display pattern.
- **Recording + transcript both saved by default** (useful for search later); one-click delete purges both.
- Legal compliance for recording (consent, jurisdiction) is the user's responsibility.

## Mode 3 — Post-hoc transcription

- Re-transcribes the saved audio recording at higher accuracy.
- **Latency unbounded** — runs as a background job.
- **Always produces a saved transcript document.**
- Recommended model: `distil-large-v3` (English) or `large-v3-turbo` (multilingual), INT8, via `BatchedInferencePipeline` for throughput.

## UI separation

The three modes have **distinct UI surfaces**, not one "transcribe" button with a mode toggle. Dictation has a cursor; captioning has an overlay; post-hoc is a background job invoked from a recording's context menu.

## Why this design

- Mode-conflation in the UI causes mode-confusion errors: users start dictating when they meant to caption a lecture, or vice versa. Separate affordances eliminate that class of bug.
- ADHD users benefit from explicit, predictable invocation: one hotkey = one thing.
- Lecture-recording is a top accessibility win for the ADHD user (compensates for attention drift) and the deaf/HoH user (provides text fallback). It needs to be a first-class, low-friction surface.

## What v1.1 adds

- Word-level timestamps via `faster-whisper`'s `word_timestamps=True` (cheap path) and optionally WhisperX forced alignment (precise path) — enables timestamp-anchored notes (v2) and read-along on transcripts.

## What v2 adds

- Speaker diarization (lecturer vs. discussion). Likely sherpa-onnx Zipformer-based since pyannote weights are gated and can't be pre-bundled.
- Timestamp-anchored notes that click-jump to audio.

## Relevant references

- [Whisper / STT](../../references/whisper.md) — engine selection (faster-whisper), VAD choice (Silero), model recommendations per mode, word-timestamp readiness, license traps (Moonshine, Parakeet attribution, pyannote gating).
- [Handy](../../references/handy.md) — prior art for accessibility-focused dictation; the `transcribe-rs` / `whisper-rs` / `vad-rs` crates we may borrow patterns from.
- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — Genio / Glean / Otter / Dragon landscape this feature competes with.
- STT model management — companion concern (covered as a single line in [ROADMAP.md](../../ROADMAP.md)): `base` ships by default; setup wizard offers larger models; settings has a model manager.
