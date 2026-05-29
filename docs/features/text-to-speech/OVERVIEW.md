# Text-to-Speech

**Version:** 1.0

Text-to-speech (TTS) for documents and notes — the app reads content aloud. Engine: **Supertonic** (MIT code, OpenRAIL-M weights). v1 is TTS-only; v1.1 adds [read-along](../read-along/OVERVIEW.md) synchronized highlighting.

## Engine choice

- **Supertonic** — chosen over Piper because Supertonic exposes an OpenAI-compatible `/v1/audio/speech` endpoint, which means v1.1's cloud opt-in (OpenAI / ElevenLabs / similar) drops into the same client interface. API parity beats switching engines later.
- **Weights are first-run downloaded**, not bundled. The OpenRAIL-M model-weight license (with 13 use-based restrictions) is kept cleanly separate from our AGPL distribution by having the user accept it on first download.
- ~400 MB total payload (English + multilingual voices).
- Runs as a Python sidecar (same runtime as Docling/markitdown/whisper); CPU-acceptable.

## What v1 ships

- "Speak" action on any note or rendered markdown view.
- Play / pause / stop controls.
- Voice selection (Supertonic ships multiple voices across 31 languages).
- Speed adjustment (0.5x – 2x).
- Audio output device selection (defer to OS default with explicit override).

## What v1.1 adds

- **Read-along**: word/sentence highlighting synchronized to playback. Requires forced-alignment post-processing (same wav2vec2 approach WhisperX uses for STT) because neither Supertonic nor Piper emit word boundaries natively.
- **Cloud opt-in** TTS providers (OpenAI, ElevenLabs) via the same OpenAI-compatible client interface. These providers expose word timings natively, sidestepping the alignment step for cloud users.

## Why this matters

- TTS is a top accessibility accommodation for blind/low-vision users.
- It's also a major ADHD accommodation: listening to a long reading while doing other movement helps many ADHD users sustain attention better than reading visually.
- Combined with the [audio-recording-and-transcription](../audio-recording-and-transcription/OVERVIEW.md) feature, the app handles the full audio-content loop for accessibility.

## Relevant Documentation

- [Supertonic](../../research/supertonic.md) — engine evaluation, license analysis (split MIT code / OpenRAIL-M weights), sidecar architecture.
- [Related libraries](../../research/related-libraries.md) — Piper, Coqui (license-troubled), web Speech Synthesis, OpenAI/ElevenLabs SDKs.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — TTS landscape (Read&Write, NaturalReader, Immersive Reader, Voice Dream Reader) this competes with.
