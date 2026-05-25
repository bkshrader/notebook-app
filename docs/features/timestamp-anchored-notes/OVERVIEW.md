# Timestamp-Anchored Notes

**Version:** 2.0

Notes typed during an audio (or video) recording are anchored to their position in the timeline. Click a paragraph → jump to that moment in the audio. The Genio / Sonocent / Glean killer feature, reimplemented as accessible OSS.

## Why this matters

- Compensates for ADHD attention drift: zone out for two minutes, click your last note, hear what was said.
- Compensates for the fact that you can't write everything down during a fast lecture — the audio is the safety net.
- For non-native English speakers in English-language classrooms: re-listen on demand to fill in comprehension gaps.
- This is the #1 differentiator the original project vision identified.

## Engineering shape

- Requires **word-level timestamps** from the STT pipeline — already enabled in [audio-recording-and-transcription](../audio-recording-and-transcription/OVERVIEW.md) v1.1 via faster-whisper's `word_timestamps=True`.
- The editor (CodeMirror 6) attaches "recording offset" metadata to typed paragraphs/lines during an active recording session — captured at the moment the user starts typing each line.
- Persistence: the metadata lives in the note's YAML frontmatter or in a sidecar `.notes-meta.json` file (decision deferred).
- Playback UI: a small "play from here" affordance per timestamped paragraph; keyboard shortcut to play-from-cursor.

## Why this is v2.0 not v1.1

- Significant engineering: real-time offset capture during typing, persistence model, playback UI, drift handling (what if the user types a thought 30s after the relevant moment? — affordance to nudge the anchor backward).
- Depends on v1.1's word-level-timestamp infrastructure landing first.
- v1 ships the recording + transcription + playback foundation; v1.1 ships the timestamps; v2 ships the anchored notes UX on top.

## What v2.0 ships

- Typing-during-recording captures anchor offsets per paragraph/line.
- Persistence of anchors alongside the note file.
- Click-to-play / hotkey-to-play affordances in the editor.
- Manual anchor adjustment (drag a paragraph's anchor earlier/later).

## What v2.0+ may add

- Cross-session anchors: a note typed _after_ the lecture can still be anchored to a moment in the recording via a "match this to audio" action.
- AI-suggested anchors: an LLM compares note text to transcript text and proposes anchors.

## Relevant references

- [Audio recording and transcription](../audio-recording-and-transcription/OVERVIEW.md) — provides the word-level timestamps this depends on.
- [Whisper / STT](../../references/whisper.md) — `word_timestamps=True` accuracy and CPU cost analysis.
- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — Genio / Sonocent / Glean / Notability audio-anchored-notes prior art and the opportunity gap (these are all proprietary / web-only / inaccessible).
