# Agentic Workflows

**Version:** 2.0

LLM-powered features that operate over the user's notes and sources: chat-with-your-sources, summarization, tone rewrite. All gated under [BYO AI](../byo-ai/OVERVIEW.md) and hidden in the AI-free build (see the AI-feature-flag note in [ROADMAP.md](../../ROADMAP.md)).

## Sub-features

### Chat with your sources

- Notebook-scoped chat (à la NotebookLM) over the user's notes and ingested sources within a project.
- Inline citation chips that link to the exact source span — the single best NotebookLM UX pattern to emulate.
- Refuses gracefully when sources don't cover the question; configurable to fall back to general knowledge with an explicit "this is outside your sources" indicator.
- Built on the v1.1 [document search](../document-search/OVERVIEW.md) infrastructure extended with semantic embeddings (sqlite-vec).

### Summarization

- One-click summary of any note, ingested document, transcript, or selection.
- Configurable length (brief / standard / detailed).
- Output goes into a new note in the same project with a backlink to source.

### Tone rewrite

- Rewrite selected text in a different register (formal / casual / clarified / less-emotional / less-jargon).
- Inspired by Goblin Tools' Formalizer — a documented ADHD/Autism accommodation: rewriting an emotionally-charged email into a calm one is genuinely hard for some users without an external tool.
- Inline: shows a diff; user accepts or rejects.

### Audio summaries (free bonus)

- Summarization output → TTS → audio walkthrough. Falls out for free once both summarization and [text-to-speech](../text-to-speech/OVERVIEW.md) exist.

## Engineering shape

- Embeddings layer: **sqlite-vec** (per the related-libraries report — MIT, AGPL-clean, runs as a SQLite extension in the existing storage layer).
- LLM client: the same OpenAI-compatible interface from [byo-ai](../byo-ai/OVERVIEW.md). Streaming for long outputs.
- Prompt management: per-feature prompt templates the user can override in settings.
- Citation extraction: structured-output mode (JSON schema) for "what source range did you draw this from."

## Design principles

- **Source-grounded by default.** "Refuse when sources don't cover it" matches NotebookLM's strongest UX choice. User can opt out of this constraint per query.
- **Deterministic regeneration where possible.** Cache identical prompts; "regenerate" with explicit click. Predictability matters for Autistic users.
- **No surprise costs.** If the active profile is a paid cloud provider, the UI surfaces token-cost estimates before sending.
- **Transcript-aware.** Lecture transcripts from [audio-recording-and-transcription](../audio-recording-and-transcription/OVERVIEW.md) are first-class source material — chat, summarize, rewrite all work on them.

## What v2.0 ships

- Chat-with-your-sources within a project, with citation chips.
- Summarization with configurable length, output as new note.
- Tone rewrite inline with diff preview.
- Semantic search via sqlite-vec (extends v1.1 keyword search).

## Why these are v2.0

- The embeddings infrastructure is real engineering.
- The UX is high-surface; we want v1 + v1.1 user feedback before committing to specific agentic features.
- Chat-with-your-sources especially: NotebookLM has set high expectations; shipping a half-baked version is worse than waiting.

## Relevant references

- [NotebookLM](../../references/notebooklm.md) — what to emulate (citation chips, source-grounded defaults), what to reject (overwhelming Studio menu, cloud-only).
- [OpenRouter and competitors](../../references/openrouter.md) — LLM client architecture, structured-output support, streaming.
- [Related libraries](../../references/related-libraries.md) — sqlite-vec, embeddings options, LLM SDKs.
- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — Goblin Tools as the documented tone-rewrite prior art; ADHD/Autism accommodations.
- [BYO AI](../byo-ai/OVERVIEW.md) — the AI architecture this consumes. AI-free build behavior is documented in [ROADMAP.md](../../ROADMAP.md).
