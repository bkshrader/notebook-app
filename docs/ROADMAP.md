# Project Roadmap

## Version 1.0

Minimum viable product

Features:

- [Accessibility focused](./features/accessibility/OVERVIEW.md)
  - First-class keyboard navigation
  - Screen reader support
  - WCAG 2.1 AA baseline, AAA aspirationally
- [Plain `.md` with YAML front matter, files-on-disk](./features/plain-md-storage/OVERVIEW.md)
- [Library and Projects](./features/library-and-projects/OVERVIEW.md) for organizing and managing references/notes
- [Text editor](./features/text-editor/OVERVIEW.md)
- [Markdown viewer](./features/markdown-viewer/OVERVIEW.md)
- [PDF viewer](./features/pdf-viewer/OVERVIEW.md)
- [Universal capture inbox](./features/universal-capture-inbox/OVERVIEW.md) (inspired by [files.md](./references/files-md.md))
- [Audio recording and transcription](./features/audio-recording-and-transcription/OVERVIEW.md) — three distinct modes with separate UI surfaces:
  - **Dictation**
  - **Live captioning**
  - **Post-hoc transcription**
- STT model management — `base` ships by default; larger models offered in the setup wizard and a settings model manager.
- Setup wizard — first-launch onboarding for everything that needs setup. Skippable; sensible defaults if skipped. Designed last.
- [Text-to-speech (read-aloud)](./features/text-to-speech/OVERVIEW.md) for documents and notes
- [AI is BYO (bring your own)](./features/byo-ai/OVERVIEW.md): user configures an OpenAI-compatible endpoint per profile (local or cloud)
- Build-time feature flag to produce an AI-free distribution.

## Version 1.1

Research features and UI polish

Features:

- [Document ingestion](./features/document-ingestion/OVERVIEW.md)
  - pdf, docx, pptx, audio, video, image
  - LLM-enhanced OCR for image-based documents
  - Store original document plus markdown conversion
- [Read-along](./features/read-along/OVERVIEW.md): synchronized word/sentence highlighting during TTS playback
- [Math rendering](./features/math-rendering/OVERVIEW.md) in markdown (inline + display math).
- [LaTeX as a first-class citizen](./features/latex-first-class/OVERVIEW.md) — notes can natively be `.tex` files, not only `.md`.
- [Pomodoro timer](./features/pomodoro-timer/OVERVIEW.md)
- [Bibliography management](./features/bibliography-management/OVERVIEW.md)
- [Document search](./features/document-search/OVERVIEW.md)

## Version 2.0

High-value high-effort features

Features:

- [Whiteboard / Infinite canvas](./features/whiteboard/OVERVIEW.md)
- [Rich markdown editor](./features/rich-markdown-editor/OVERVIEW.md)
- [Timestamp-anchored notes](./features/timestamp-anchored-notes/OVERVIEW.md) for audio/video sources
- [Agentic workflows](./features/agentic-workflows/OVERVIEW.md)
  - Chat with your sources
  - Summarization
  - Tone rewrite
  - Agentic summarization + TTS gives audio summaries for free
- [Claude plugin](./features/claude-plugin/OVERVIEW.md)
- [Mind maps](./features/mind-maps/OVERVIEW.md)

## Version 3.0

Nice-to-have high-effort features

Features:

- [Mobile app](./features/mobile-app/OVERVIEW.md)
- [Browser extension](./features/browser-extension/OVERVIEW.md)
- [Remote sync](./features/remote-sync/OVERVIEW.md)
- [Collaborative editing](./features/collaborative-editing/OVERVIEW.md)
- [Video overviews](./features/video-overviews/OVERVIEW.md) (with remotion.js or similar)
- [Time-blocking calendar](./features/time-blocking-calendar/OVERVIEW.md) (maybe out of scope)

---

## Out of Scope

-
