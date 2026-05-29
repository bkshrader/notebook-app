# BYO AI (Bring Your Own)

**Version:** 1.0

The user configures an OpenAI-compatible endpoint per profile — local (Ollama / LM Studio / llama.cpp `server`) or cloud (OpenRouter / OpenAI / Anthropic / others). We do not bundle a local LLM runtime. Same client code path for both; only endpoint URL, API key, and model name differ.

## Design intent

- **No bundled LLM.** Local LLMs require ~2–8 GB of model files and meaningful GPU expectations the v1 user probably doesn't meet. Honest framing: opt-in.
- **OpenAI-schema parity.** Ollama, LM Studio, llama.cpp, OpenRouter, OpenAI, Anthropic (via compat layer), and most cloud providers all speak OpenAI's `/v1/chat/completions` schema. One client interface fits all.
- **Per-profile config.** User can have a "Cloud (OpenRouter)" profile and a "Local (Ollama)" profile and switch. Each profile = endpoint + key + default model.
- **No surprise calls.** AI features are visibly tied to the active profile; a user with no profile configured sees the AI surfaces disabled (not making silent calls anywhere).

## What v1 ships

- Settings UI for adding/editing/removing AI profiles.
- "Active profile" switcher in the main UI.
- AI surface visibility tied to profile state: if no profile is configured, the relevant menu items show "Configure AI profile" instead of triggering anything.
- Setup wizard step that links to documentation for installing/configuring Ollama, LM Studio, or signing up for a cloud provider — does not gate on any of these.
- A documentation page (ships with the app) explaining how to set up each common backend.

## What's not in v1

- We don't bundle Ollama. We don't bundle any model weights. We don't detect-and-prompt for Ollama installation (that's a v1.1 option if BYO friction shows up in user feedback).
- We don't make AI features mandatory anywhere — they're all opt-in surfaces, and a build-time feature flag (see [ROADMAP.md](../../ROADMAP.md)) lets us produce an AI-free distribution.

## Why this architecture

- BYO is the only honest answer for v1: bundling local LLMs is expensive in disk space, model-license surface, and onboarding UX. Cloud-only would betray the local-first ethos. BYO threads both needles.
- OpenAI-schema parity means we don't pick winners. If the user prefers Anthropic's Claude over Ollama's Llama, the app doesn't care.
- It also makes the AI-free build flag (see [ROADMAP.md](../../ROADMAP.md)) genuinely trivial: the entire AI surface is a hidable feature flag with no orphaned bundled assets.

## Relevant Documentation

- [OpenRouter and competitors](../../research/openrouter.md) — cloud LLM gateway landscape, BYOK patterns, license posture of the various SDKs.
- [Related libraries](../../research/related-libraries.md) — Anthropic SDK, OpenAI SDK, Vercel AI SDK, llama.cpp bindings, transformers.js with license verdicts.
- Setup wizard — where the initial AI-profile configuration lands (covered as a single line in [ROADMAP.md](../../ROADMAP.md)).
- AI-free build flag — also covered as a single line in [ROADMAP.md](../../ROADMAP.md).
