# Read-Along

**Version:** 1.1

Synchronized word/sentence highlighting during [text-to-speech](../text-to-speech/OVERVIEW.md) playback. The currently-spoken word lights up in the rendered document or note; sentence-level background tinting provides context. The killer accessibility differentiator and one of the project's original motivating features.

## Why this matters

- **ADHD focus retention:** the moving visual anchor keeps attention on the audio. Tested-pattern from Speechify, Immersive Reader, Voice Dream Reader.
- **Dyslexia accommodation:** synchronizing the audio and visual streams is a well-supported reading aid.
- **Low-vision users:** combined with high-contrast theming, lets users follow along with limited residual vision.
- **Comprehension:** even for non-disabled users, the combination of audio + visual increases comprehension and retention.

## Engineering shape

- TTS engines we ship ([Supertonic](../text-to-speech/OVERVIEW.md), Piper) do **not** emit word boundaries natively.
- Solution: **forced alignment** as a post-step. Same `wav2vec2` approach WhisperX uses for STT works in reverse here — feed the audio + the input text into the aligner, get word-timing metadata out.
- Cloud opt-in providers (OpenAI TTS, ElevenLabs) **do** emit word timings natively, sidestepping the alignment step.
- The highlighting is a CodeMirror 6 `ViewPlugin` decoration (in the editor) or a DOM range overlay (in the [markdown viewer](../markdown-viewer/OVERVIEW.md) and [PDF viewer](../pdf-viewer/OVERVIEW.md)), updating per `requestAnimationFrame` against the current playback time.

## What ships in v1.1

- Forced-alignment pipeline as a post-process for Supertonic/Piper output.
- Highlighting integration in the markdown viewer (primary surface).
- Native word-timing support for OpenAI/ElevenLabs cloud TTS.
- User preferences: highlight color, sentence vs. word granularity, motion (full pulse / minimal indicator / off).

## What ships in v2.0+

- Highlighting in the PDF viewer (requires anchoring text-layer ranges to TTS-aligned words).
- Highlighting in transcript playback (audio-recording mode 3 produced transcripts) — the timestamp data is already there.

## Open questions

- Word-level vs. sentence-level granularity by default — word-level is more useful but more visually busy. Probably sentence-level default, word-level opt-in.
- Auto-scroll behavior during playback (jump? smooth? off?) — needs UX prototyping.
- Handling of math/code/non-spoken content — TTS skips it; highlighting should jump cleanly.

## Relevant Documentation

- [Text-to-speech](../text-to-speech/OVERVIEW.md) — engine and audio pipeline this depends on.
- [Whisper / STT](../../research/whisper.md) — wav2vec2 forced-alignment approach (WhisperX uses it for STT; we use it in reverse for TTS).
- [CodeMirror 6](../../research/codemirror.md) — the `ViewPlugin` decoration pattern for editor-side highlighting.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — Speechify, Immersive Reader, Voice Dream Reader prior art.
