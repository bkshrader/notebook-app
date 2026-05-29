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

- Speaker diarization (lecturer vs. discussion) via sherpa-onnx, with 3D-Speaker CAM++ as the embedding model (Apache-2.0 weights, no gate — pyannote v3.1 diarization weights are gated and can't be pre-bundled).
- **Voice fingerprinting / cross-session speaker recognition.** Users pre-register expected speakers per session (`Prof. Singh`, `Witness`, `Me`); unlabeled speakers get anonymous pseudonyms (`speaker-7f3a`). Each labeled utterance contributes an embedding sample to that speaker's profile (passive enrollment — no explicit "record your voice" ceremony required). On future utterances and future sessions, sherpa-onnx's `SpeakerEmbeddingManager` matches incoming embeddings against the registry by cosine similarity above a tuned threshold, so `Prof. Singh` carries across every lecture in a course instead of resetting to `Speaker_1` each recording. Operator-driven labeling (a hotkey or voice command per speaker on the registry) is the primary control surface, matching the convention every professional system in this space converged on (Plover macros, Eclipse seating charts, Verbit pre-enrolled signatures). Automatic diarization is a _hint_, never ground truth — confidence-gated, with `[crosstalk]` rather than a guess when the model isn't sure. Speaker labels render as `>> NAME:` by default (broadcast-captioning convention, screen-reader-graceful) with `NAME:` colloquy as a setting. See [voice-fingerprinting.md](../../research/voice-fingerprinting.md) for the deep technical and licensing analysis and [court-reporting-speaker-id.md](../../research/court-reporting-speaker-id.md) for the UX-convention research that informs the labeling format.

> **Prerequisite — biometric data handling.** Voice embeddings are biometric data under GDPR Art. 9, Illinois BIPA, and California CPRA; they are also sensitive enough to drive voice-cloning synthesis (a 192-dim ECAPA-TDNN vector is sufficient to condition a multi-speaker TTS in the target's voice, and published model-inversion attacks recover ~60% of speaker identity from x-vector embeddings). **No voice fingerprinting or speaker-recognition functionality ships in any version without these three affordances in place:** (1) the embedding registry stays local-only — never synced through a project-operated service; (2) a one-click "delete all voice data" purge is available in settings, separate from the per-recording delete already in Mode 2; (3) a first-launch disclosure appears the first time voice ID is enabled, surfaced prominently — not buried — stating that voiceprints stay on the device and can be deleted at any time. If voice-ID functionality is ever pulled forward from v2 into an earlier version, these three obligations come with it. See the privacy posture section of [voice-fingerprinting.md](../../research/voice-fingerprinting.md) for the legal framing.

- Timestamp-anchored notes that click-jump to audio.

## Relevant Documentation

- [Whisper / STT](../../research/whisper.md) — engine selection (faster-whisper), VAD choice (Silero), model recommendations per mode, word-timestamp readiness, license traps (Moonshine, Parakeet attribution, pyannote gating).
- [Voice fingerprinting](../../research/voice-fingerprinting.md) — sherpa-onnx embedding API, model-license matrix (CAM++ / TitaNet / WeSpeaker / SpeechBrain / pyannote), cosine-similarity thresholds, GDPR/BIPA/CCPA posture, voice-cloning attack surface.
- [Court reporting & speaker ID](../../research/court-reporting-speaker-id.md) — operator-driven labeling conventions (Q&A, colloquy, broadcast `>> NAME:`), why production diarization vendors don't rely on pure acoustic diarization, the rough-draft / certified-transcript wedge live captions occupy.
- [Handy](../../research/handy.md) — prior art for accessibility-focused dictation; the `transcribe-rs` / `whisper-rs` / `vad-rs` crates we may borrow patterns from.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — Genio / Glean / Otter / Dragon landscape this feature competes with.
- STT model management — companion concern (covered as a single line in [ROADMAP.md](../../ROADMAP.md)): `base` ships by default; setup wizard offers larger models; settings has a model manager.
