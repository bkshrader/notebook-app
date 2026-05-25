# NotebookLM (Google) — Competitor / Reference Study

> **Status:** Closed-source SaaS competitor. Not a dependency. This document studies NotebookLM's features and design choices so we can decide which to emulate, improve on, or deliberately reject.
> **Audience for this doc:** Engineers and designers on the notebook-app project (accessibility-first, ADHD/Autism focus, WCAG 2.1 AAA target, Electron/Tauri).
> **Last updated:** 2026-05-23. NotebookLM evolves fast — re-verify any specific limit or price before relying on it.

---

## 1. Quick links & license / terms posture

### Official surfaces

| Resource                         | URL                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Product (consumer)               | https://notebooklm.google.com/                                                                                    |
| Marketing site                   | https://notebooklm.google/                                                                                        |
| Plans / pricing                  | https://notebooklm.google/plans                                                                                   |
| Workspace product page           | https://workspace.google.com/products/notebooklm/                                                                 |
| Help Center (root)               | https://support.google.com/notebooklm/                                                                            |
| Privacy & Terms of Use article   | https://support.google.com/notebooklm/answer/17004255                                                             |
| Source types & limits            | https://support.google.com/notebooklm/answer/16215270                                                             |
| Audio Overviews                  | https://support.google.com/notebooklm/answer/16212820                                                             |
| Mind Maps                        | https://support.google.com/notebooklm/answer/16212283                                                             |
| Public & Featured notebooks      | https://support.google.com/notebooklm/answer/16322204                                                             |
| Enterprise API (Pre-GA)          | https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks                          |
| Google Labs blog (announcements) | https://blog.google/technology/google-labs/                                                                       |
| Public notebooks launch post     | https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-public-notebooks/                |
| Video Overviews launch post      | https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-video-overviews-studio-upgrades/ |

### License & terms posture

NotebookLM is **closed-source SaaS owned by Google**. There is no source we can read, fork, vendor, or audit. It is governed by Google's general Terms of Service plus product-specific terms that vary by account type (consumer, Workspace, Workspace for Education, Google Cloud).[^privacy]

- **Model training on user data (consumer / personal Google account):** Sources, queries, and model responses are **not** used to train Google's foundation models _by default_. Training only occurs if the user explicitly submits feedback (thumbs up / down with attached content). Feedback content may then be human-reviewed by "specially trained teams," disconnected from the Google account, and retained up to 3 years.[^privacy]
- **Model training on user data (Workspace / Workspace for Education):** Stronger guarantees — uploads, queries, and responses are **not** human-reviewed and **not** used for training even when feedback is submitted.[^privacy]
- **Enterprise / Cloud:** NotebookLM Enterprise is positioned as a Google Cloud core service. As of early 2025 Google reclassified it as a core service alongside Gmail/Drive (interaction data exempt from human review and model training) and it has HIPAA coverage on Cloud projects configured appropriately.[^security]
- **Sharing privacy:** "Chat-only" sharing exists — collaborators can query a notebook without being able to view, edit, or download the source files. As of August 1, 2025 _public_ link-sharing is restricted to personal accounts; Workspace/Education are domain-locked.[^public_share]

### AGPL-compatibility

**N/A.** AGPL compatibility is a code-distribution concern; NotebookLM is a hosted service we do not link against. The only integration question that matters for us is **"is there an API we could call?"** Answer:

- **No public consumer API.** As of 2026-05, Google has not announced a public NotebookLM API, opened a developer waitlist, or documented programmatic access for the standard product.[^api]
- **NotebookLM Enterprise API exists (Pre-GA).** It runs on Google Cloud's Discovery Engine endpoint and supports notebook create / get / list-recently-viewed / batch-delete / share with IAM roles (owner/writer/reader). It is a _management_ API, not a content-and-chat API in the full sense; auth is OAuth 2.0 bearer tokens via `gcloud`, and it requires a paid Cloud project with the `Cloud NotebookLM User` role.[^enterprise_api]
- **Unofficial libraries** (e.g. `notebooklm-py`, `nblm-rs`) reverse-engineer the web client. Useful for one-off experiments; unsuitable for shipping a product, since Google can break them at any time.[^api]

**Implication for our project:** Treat NotebookLM as a black box. We cannot ship a feature that depends on it. We _can_ study UX patterns, copy good defaults, and offer import paths from common formats it supports.

---

## 2. What it is

Google's pitch: **"Your AI research and thinking partner, grounded in the information you trust."**[^workspace] It positions itself as a _grounded_ assistant: every answer is RAG'd against the user's uploaded sources and includes inline citations, with the model refusing to answer when the sources don't contain the information.[^limitations]

### Target audience

- Originally Google Labs experimental tool aimed at writers and researchers.
- Today positioned at: students (especially with the US student plan), academics, journalists, knowledge workers, and Workspace/Enterprise teams.[^digitalocean]
- Workspace for Education has special carve-outs (lower age gate, stronger data protections).[^learn_about]

### Where it sits in the market

| vs.                    | NotebookLM's distinguishing claim                                                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ChatGPT**            | Refuses to answer outside your sources; broader chatbot tries to answer anything. NotebookLM measurably lower hallucination rate (~13% vs. ~40% in some 2025 comparisons).[^limitations]        |
| **Perplexity**         | Perplexity is web-first; NotebookLM is your-corpus-first. Perplexity exposes model choice; NotebookLM does not.[^digitalocean]                                                                  |
| **Obsidian**           | Obsidian is local-first plain-Markdown, no AI by default, infinitely extensible via plugins. NotebookLM is cloud-only, opinionated UI, AI is the point.[^alternatives]                          |
| **Notion AI**          | Notion is a flexible all-in-one wiki/database where AI is a feature. NotebookLM is an AI-first single-purpose research surface; no databases, no kanban, no general note editor.[^alternatives] |
| **Elicit / Consensus** | Elicit/Consensus search and synthesize across published literature. NotebookLM works only on what _you_ upload (plus Deep Research, which crawls the live web).[^digitalocean]                  |

The "research assistant grounded in your sources" angle is the entire moat. Strip that and it's just another chat UI.

---

## 3. Feature inventory

### 3.1 Source ingestion

**Supported source types (as of 2026-05):**[^sources]

- **Documents:** Google Docs, Microsoft Word (`.docx`), PDF, plain text (`.txt`), Markdown (`.md`), CSV, EPUB.
- **Presentations:** Google Slides (up to 100 slides), PowerPoint (`.pptx`).
- **Spreadsheets:** Google Sheets (capped at ~100k tokens).
- **Media:** Audio (MP3, WAV, etc.) — auto-transcribed in 50+ languages on import; images (avif, bmp, gif, heic, heif, ico, jp2, jpeg, jpg, png, tif, tiff, webp) with OCR.
- **Web:** Public URLs (text only — images, embedded video, paywalled content excluded), pasted text.
- **Video:** Public YouTube URLs _with captions_ (auto or human). 72-hour delay before new uploads are usable. Only the transcript is ingested.
- **Other:** Gemini chats can be ingested as a source.

**Per-source size limit:** 500,000 words **or** 200MB per file.[^sources][^faq]

**Per-notebook source cap:** 50 (free), 100 (Plus), 300 (Pro), 500–600 (Ultra tiers).[^pricing][^tiers]

**Per-account notebook cap:** 100 (free), 200 (Plus), 500 (Pro), 500 (Ultra).[^pricing]

**What it does NOT ingest natively:** databases, email accounts, code repos, handwritten/inked notes (beyond OCR), Zotero/Mendeley libraries.[^limitations] (Practical workaround: dump to PDF/MD first.)

**Discover Sources / Deep Research:**[^sources][^updates]

- _Fast Research_ — keyword search across web or your Drive, picks results to add as sources.
- _Deep Research_ — agentic; Gemini browses many sites and compiles a citation-backed report you can save as a source. Free tier: 10/month; Plus: 3/day; Pro: 20/day; Ultra: 75–200/day.

### 3.2 Q&A grounded in sources

- Chat box per notebook. Every answer carries **inline citations** that link back to the source span.[^learn_about]
- **Refusal behavior:** the model declines when answers are absent from the sources — by design.[^limitations][^learn_about]
- **Saved chat history** (October 2025) — conversations persist across sessions; personal chat history stays private in shared notebooks.[^updates]
- **Custom goals / personas** (October 2025) — set system-prompt-style role instructions up to 5,000 characters via the notebook's settings gear.[^updates]
- **1M-token context window** (October 2025) — covers multiple long sources at once.[^updates]
- Source selection toggle: the Sources panel lets users include/exclude sources from the active query (powerful but accessibility-poor — see §5).

### 3.3 Generated artifacts ("Studio")

The Studio panel now has four primary tiles (Audio Overview, Video Overview, Mind Map, Report) and supports multiple outputs of each type per notebook.[^updates]

| Artifact                         | What it does                                                                            | Customization                                                                                                                                                     | Notes / accessibility                                                                                                                                                                                                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Audio Overview** ("Deep Dive") | AI-hosted podcast-style conversation summarizing the sources, two AI voices.            | Format: Deep Dive / Brief (≤2 min, single host) / Critique / Debate. Language (80+). Length: Shorter/Default/Longer (English only). Custom prompt to steer focus. | **Interactive mode** (English only) lets the user voice-call into the discussion. Files are downloadable. Native transcript provision for _Audio Overviews_ is unclear from official docs — users sometimes work around by uploading the audio output back as a source to get a transcript.[^audio][^transcript] |
| **Video Overview**               | Narrated slides with AI-generated visuals, pulled diagrams/quotes/numbers from sources. | Format: Explainer / Brief. Visual style: whiteboard, kawaii, watercolor, classic. Language. Focus prompt.                                                         | Launched mid-2025; expanded throughout 2026.[^video]                                                                                                                                                                                                                                                             |
| **Cinematic Video Overview**     | Fluid Veo-3-powered animated narrative video.                                           | Limited customization; English-only; 18+.                                                                                                                         | **Ultra-only** (2–20/day depending on TB tier).[^updates][^pricing]                                                                                                                                                                                                                                              |
| **Mind Map**                     | Branching diagram of source topics. Click nodes to ask follow-up questions.             | Expand/collapse, zoom, download.                                                                                                                                  | Web-only — **no mobile support**. Regenerate by deleting and re-running.[^mindmaps]                                                                                                                                                                                                                              |
| **Report**                       | Briefing doc, study guide, blog post, or custom-format text doc.                        | Free-text prompt.                                                                                                                                                 | The replacement for what used to be separate Study Guide / FAQ / Timeline / Briefing Doc buttons.                                                                                                                                                                                                                |
| **Flashcards**                   | Question/answer pairs from the sources.                                                 | Difficulty adjustable.                                                                                                                                            | Quiz mode available.                                                                                                                                                                                                                                                                                             |
| **Quizzes**                      | Multiple-choice / short-answer assessments.                                             | Difficulty adjustable.                                                                                                                                            |                                                                                                                                                                                                                                                                                                                  |
| **Infographic**                  | Single-page visual summary.                                                             | Visual styling options.                                                                                                                                           | Watermark on free/Plus/Pro; watermark-free on Ultra.                                                                                                                                                                                                                                                             |
| **Slide Deck**                   | Auto-generated slides. PPTX export (February 2026). Targeted slide edits via prompt.    | Visual styling.                                                                                                                                                   | Watermark on lower tiers.                                                                                                                                                                                                                                                                                        |
| **Data Table**                   | Qualitative text → structured comparison table. Exports to Google Sheets.               | (December 2025.) Good for lit reviews.                                                                                                                            |                                                                                                                                                                                                                                                                                                                  |

### 3.4 Interactive & social features

- **Customization of Audio Overviews** — the four named formats plus a free-text focus prompt is the headline UX.[^audio]
- **Interactive Audio mode** — voice into the podcast and the hosts respond live. English-only.[^audio]
- **Discover Sources** — query-based source recommendation from web/Drive.[^sources]
- **Featured Notebooks** — Google-curated notebooks (Atlantic articles, academic papers, etc.) you can chat with and consume _but cannot generate new artifacts in_. Consumer accounts only via the in-app tab; Workspace Enterprise/EDU can open them via direct URL only.[^public_share]
- **Public sharing** — "Anyone with the link" produces a public notebook (personal accounts only as of Aug 2025). Viewers can chat and play artifacts; cannot edit sources. Workspace/EDU sharing is domain-locked.[^public_share]
- **Chat-only sharing** — share querying access without exposing source documents to the collaborator.[^security]
- **Collaboration model is shallow:** no roles beyond owner/writer/reader (in Enterprise), no comments, no version history on notes, no real-time co-editing of a "note" surface (because there isn't really a freeform note editor).[^limitations]

### 3.5 Tiered offering (as of 2026-05)

NotebookLM is **not sold standalone**. It ships as a bundled benefit of Google AI Plus / Pro / Ultra, qualifying Workspace plans, or a Google Cloud Enterprise license.[^pricing]

|                                 | **Standard (Free)** | **Plus** (Google AI Plus) | **Pro** (Google AI Pro) | **Ultra 20TB** (Google AI Ultra) | **Ultra 30TB** (Google AI Ultra) |
| ------------------------------- | ------------------- | ------------------------- | ----------------------- | -------------------------------- | -------------------------------- |
| Price                           | $0                  | $7.99/mo                  | $19.99/mo               | $99.99/mo                        | $200/mo                          |
| Notebooks                       | 100                 | 200                       | 500                     | 500                              | 500                              |
| Sources / notebook              | 50                  | 100                       | 300                     | 500                              | 600                              |
| Daily chats                     | 50                  | 200                       | 500                     | 2,500                            | 5,000                            |
| Audio Overviews/day             | 3                   | 6                         | 20                      | 100                              | 200                              |
| Video Overviews/day             | 3                   | 6                         | 20                      | 100 (+2 Cinematic)               | 200 (+20 Cinematic)              |
| Deep Research                   | 10/month            | 3/day                     | 20/day                  | 75/day                           | 200/day                          |
| Model                           | Gemini 3            | Gemini 3                  | Gemini 3                | Gemini 3                         | Gemini 3 + Spark agent (US)      |
| Storage (shared w/ Gmail/Drive) | 15GB                | 200GB                     | 5TB                     | 20TB                             | 30TB                             |
| Watermark-free outputs          | No                  | No                        | No                      | Yes                              | Yes                              |

[^pricing][^tiers]

**Student / EDU pricing:** US students 18+ with a `.edu` email get Google AI Pro at **$9.99/mo** for 12 months (i.e. Pro-tier NotebookLM).[^pricing] Workspace for Education plans bundle NotebookLM with the stronger no-training data guarantee.[^privacy]

**Enterprise:** ~$9/license/month, 15-license minimum, ~5x limits, full Cloud admin controls.[^tiers]

### 3.6 Languages

- **UI:** 40+ languages.[^workspace]
- **Generation (chat, summaries, reports):** 80+ languages.[^learn_about]
- **Audio Overview voices:** 80+ languages, but length controls and Interactive mode are **English-only**.[^audio]
- **Cinematic Video Overview:** English-only.[^updates]

### 3.7 Platforms

- **Web:** primary surface. Always gets new features first.
- **iOS + Android apps:** ship core features (chat, sources, Audio Overviews) but consistently lag the web for new features. Mind Maps are explicitly _not_ on mobile.[^mindmaps][^digitalocean]
- **Desktop:** no native app. Browser only.
- **Offline:** none. Cloud-only.[^alternatives]

### 3.8 Recent updates timeline (Oct 2025 → May 2026)

| Date     | Change                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------- |
| Oct 2025 | 1M-token context window, saved chat history, custom goals up to 5,000 chars.[^updates]                   |
| Nov 2025 | Deep Research (Fast + Deep modes), expanded source types (Word, Sheets, CSV, images with OCR).[^updates] |
| Dec 2025 | Gemini 3 upgrade; Data Tables Studio output; Gemini App can ingest notebooks as sources.[^updates]       |
| Feb 2026 | Slide editing & PPTX export.[^updates]                                                                   |
| Mar 2026 | Cinematic Video Overviews (Veo 3, Nano Banana Pro), Ultra-only.[^updates]                                |
| Apr 2026 | Google AI Pro storage 2TB → 5TB at same price.[^updates]                                                 |
| May 2026 | Gemini 3.5 Flash default; Ultra restructured into 20TB ($99.99) and 30TB ($200) tiers.[^updates]         |

Cadence: roughly one significant release per month. Expect this to keep accelerating.

---

## 4. Design principles inferred

What NotebookLM is optimizing for:

1. **Grounding > capability.** The model refuses out-of-source questions. This kills "general chatbot" flexibility but slashes hallucination. Citations are first-class everywhere.[^limitations]
2. **Source → Studio → Chat as the core triangle.** Three-pane UI (Sources left, Chat center, Studio right). Everything you can do collapses into either "add a source," "generate an artifact," or "ask a question."
3. **Artifact-as-output, not document-as-output.** The notebook is _not_ a writing surface. There is no Markdown editor, no canvas, no kanban. Notes exist but are second-class. Output is consumption media (audio, video, mind map, deck), not your own crafted prose.
4. **Push-button generation over fine control.** A handful of dropdowns and a focus prompt — not a model picker, not a temperature slider, not chain-of-thought visibility. AI literacy is _not_ a prerequisite.
5. **Format pluralism for the same content.** The same sources can become podcast, video, mind map, quiz, slide deck. This is the headline "wow" demo and the core ADHD-relevant accessibility win — _and_ the core sensory-overwhelm risk.
6. **Closed loop, no plugins, no extensions.** Unlike Obsidian, there is no third-party ecosystem. Google owns the entire experience.
7. **Deliberately not doing:**

- General web browsing in chat (Deep Research is the constrained version).
- Model "knowledge" outside sources (the refusal is the feature).
- A traditional note editor / outliner / canvas.
- Cross-notebook reasoning (each notebook is an island — by design or by limitation, take your pick).[^limitations]
- Citation-style formatting (APA/MLA/Chicago) — explicit gap.[^limitations]
- Local-first / offline operation.
- Bring-your-own-key / model choice.

**How grounding shapes UX:** every chat response renders citation chips. Clicking a chip opens the source at the cited span. This is the dominant interaction pattern — it teaches users to trust outputs more than they would in a generic chatbot, _and_ gives them a frictionless verification path. It is arguably NotebookLM's single best UX idea.

**How it handles hallucination:** combination of (a) RAG-only generation, (b) explicit refusal when sources don't cover a question, (c) inline citations on every claim. Reduces but does not eliminate hallucination — research has found Audio Overviews truncate very long sources and glaze over the back half, producing confidently wrong summaries.[^limitations]

---

## 5. Relevance & lessons for our project

### 5.1 Table-stakes features for an academic notebook in 2026

A modern academic notebook app — even an accessibility-first local one — almost certainly needs:

1. **Multi-format ingest** at minimum: PDF, Word, Markdown, plain text, EPUB, web URL, image (with OCR), audio (with transcription). YouTube and Slides are nice-to-have. (NotebookLM sets the floor here.)
2. **Source-grounded chat with inline citations** that link to the exact span — this is now the expected baseline, not a differentiator.
3. **A summary / overview generator** per source and per notebook.
4. **Some form of audio output** — text-to-speech of summaries at minimum. Full "podcast" generation is aspirational and probably out of scope for a local-first app without an external API.
5. **A study artifact generator** of at least: study guide, flashcards, quiz. (These are what students actually use NotebookLM for.)
6. **Notebook-scoped chat history** that persists.
7. **Search across all notebooks.** NotebookLM lacks this (each notebook is an island); we should _not_ copy that mistake.
8. **Export.** NotebookLM's "zero native export beyond clipboard" is a widely-cited frustration.[^limitations] We can win here cheaply with Markdown, PDF, DOCX, and "open in Obsidian-vault" exports.

### 5.2 Design choices worth emulating

- **Inline citation chips on every AI response, click-to-source.** Best UX idea in the product.
- **The Sources / Chat / Studio three-pane layout** is genuinely well-suited to a research workflow. Pane visibility should be toggleable for focus mode.
- **"Refuse when sources don't cover it" default.** Reduces ambiguity — a clear accessibility win for autistic users who interpret literally. (We should still make this an explicit, visible setting, not an invisible behavior.)
- **Custom goals / personas (5,000-char system prompt) per notebook.** Cheap to implement, huge for repeat workflows.
- **Multi-format artifact pluralism (text, audio, visual, quiz)** — even if we can only offer text + TTS audio + mind map locally, the _concept_ of "same content, multiple representations" is core for ADHD/Autism support (UDL principle).
- **Source selection toggles per query** — letting users narrow which sources the model considers is genuinely useful, but needs better labeling than NotebookLM offers (see accessibility gaps).
- **Featured / public notebook sharing model** as a separate, simpler artifact than a Notion-style page. We probably do _not_ need this in v1 but the read-only "chat with this curated corpus" pattern is a useful future direction for instructor-prepared materials.

### 5.3 Choices worth deliberately rejecting (esp. for ADHD/Autism)

- **The growing menu of generated artifacts is overwhelm-by-default.** Four Studio tiles plus six secondary outputs plus customization sub-menus plus format pickers plus visual style pickers is exactly the kind of choice-overload that paralyzes ADHD users. We should ship with a **small, opinionated default set** and let users opt into more, not the reverse.
- **AI-generated cartoon visual styles** (kawaii, watercolor) for serious study material may be appealing to some users but cause **sensory-overload or "infantilization" responses** in others — particularly autistic students who often prefer plain functional UI. Make decorative visuals opt-in, not default.
- **Auto-playing audio / video** previews — none should be default. Always require an explicit play action. (NotebookLM is mostly OK on this but recent additions have crept toward auto-preview.)
- **Hidden state in the Sources toggle.** NotebookLM lets you check/uncheck sources to scope a query but doesn't make the resulting scope obvious in the chat response — confusing for anyone, hostile for screen readers.[^a11y]
- **Cloud-only, no offline.** Disqualifying for many students with unreliable connectivity, for anyone with privacy-sensitive material (medical, legal, IRB-restricted research), and conflicts with our local-first stance.
- **Closed ecosystem, no export.** A Google-owned silo is the opposite of an academic-friendly tool. Plain-text-on-disk is a core ADHD-friendliness principle (low lock-in anxiety, future-proof).
- **Unpredictable AI behavior between sessions.** When the same prompt produces different results, ADHD users (who rely on external scaffolding) lose trust. We should consider: deterministic seeds, "regenerate gives me the same thing" by default, and clear visual indicators when the model behavior has changed.
- **No keyboard-discoverable feature surface.** New users find Studio features by visually scanning tiles. A command palette (Cmd-K) is mandatory for us.
- **Skipping the note editor entirely.** Academic users _do_ want to write. NotebookLM's "notes as second-class" is a real gap; an Obsidian-like markdown editor with AI assist is a better v1.

### 5.4 WCAG AAA implications & accessibility gaps in NotebookLM

NotebookLM has been independently audited (notably by University of Wisconsin) and has _real, documented gaps_ — we should not assume "Google = accessible."[^a11y]

| WCAG criterion                                | NotebookLM finding                                                                                                                                                                                                                                                                                             | What we should do                                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.3 / 1.4.6 Contrast**                    | "Discover sources" button = blue-on-blue, 3.81:1, fails AA (needs 4.5:1) let alone AAA (7:1).[^a11y]                                                                                                                                                                                                           | All interactive text ≥ 7:1 (AAA); audit every button in a token system; never ship a button with sub-AA contrast.                                                                                         |
| **1.4.10 Reflow**                             | UI clashes from 250% magnification; clipping continues to 400%.[^a11y]                                                                                                                                                                                                                                         | Test every layout at 200% and 400% before merge; use container queries and flow layouts; no fixed-width interactive components.                                                                           |
| **2.4.7 Focus visible**                       | Inconsistent focus indicators across button types (grey wash vs. black outline vs. teal wash).[^a11y]                                                                                                                                                                                                          | One single high-contrast focus ring token; applied via `:focus-visible`; minimum 3px and 3:1 against adjacent colors.                                                                                     |
| **3.2.2 On input**                            | Notebook creation: focus lands on "close" button; no announcement of context change.[^a11y]                                                                                                                                                                                                                    | Every modal/route change announces destination; focus moves to a labeled heading or primary action, never to "close."                                                                                     |
| **4.1.3 Status messages**                     | Source upload/delete/loading lack ARIA live-region announcements.[^a11y]                                                                                                                                                                                                                                       | `aria-live` for every async state change; "uploading," "uploaded," "deleted," "generating," "ready."                                                                                                      |
| **3.3.2 / 2.4.6 Labels**                      | Source selection toggles in Sources pane lack labels explaining the consequence.[^a11y]                                                                                                                                                                                                                        | Every toggle has a description, not just a name; describe _what changes_ when toggled.                                                                                                                    |
| **2.4.1 Bypass blocks**                       | Missing landmarks, headings, skip links throughout.[^a11y]                                                                                                                                                                                                                                                     | Real `<main>`/`<nav>`/`<aside>` landmarks; one `<h1>` per view; skip-to-content and skip-to-each-pane links.                                                                                              |
| **1.2 Audio/video alternatives**              | Audio Overviews: official docs don't clearly describe transcript availability _for generated Audio Overviews_ (the official help mentions transcripts for _uploaded_ audio sources, not for generated overviews).[^audio][^transcript] Cinematic Videos are English-only with no documented caption guarantee. | **Every AI-generated audio gets a synchronized transcript by default.** Every AI-generated video gets captions. No exceptions. This is also useful for search and reduces reliance on the audio modality. |
| **2.1 Keyboard**                              | Generally OK — the chat surface is reported usable by keyboard + screen reader.[^a11y] But the Studio tile generation flow has not been audited as thoroughly.                                                                                                                                                 | All artifact generation flows must be fully keyboard-driven and screen-reader-tested before ship.                                                                                                         |
| **Cognitive load (WCAG 2.2 ADHD/coga draft)** | Studio's growing button-and-dropdown surface is heavy cognitive load on its own.                                                                                                                                                                                                                               | Progressive disclosure; simple default mode + advanced mode; remember last-used settings.                                                                                                                 |

### 5.5 Where we can meaningfully differ — what's our moat?

NotebookLM's moat is Gemini access + Google distribution. We will never out-Google Google on model quality or scale. So the moat has to be elsewhere:

1. **Local-first, offline-capable, plain-Markdown on disk.** Your notes are yours and they outlive us. This is the Obsidian moat plus AI — a combination no incumbent owns. (Cf. AFFiNE attempting similar.)[^alternatives]
2. **Accessibility-first as a hard guarantee, not a "we tried."** WCAG 2.1 AAA-targeted, screen-reader and keyboard tested every release, sensory-overload-aware defaults, ADHD- and autism-informed UI patterns. Google can't ship this without re-architecting; we can ship it on day one.
3. **Deterministic, predictable AI behavior.** Same prompt → same output by default. Regeneration is opt-in. Surface model state changes visibly.
4. **Bring-your-own-model.** Local models (llama.cpp / Ollama / MLX) for privacy + offline; cloud API keys for power users (OpenAI, Anthropic, Google AI Studio). Never lock the user into one vendor.
5. **Real note editor.** Treat the note as first-class. Markdown editor with AI assist _inside the text_, not relegated to a sidebar.
6. **Citation-style export.** APA / MLA / Chicago / BibTeX out of the box. This is the single most-requested NotebookLM gap among academic users.[^limitations]
7. **Cross-notebook search & linking.** Wikilinks. Backlinks. A graph view. Information shouldn't be trapped in per-notebook silos.
8. **Open file formats and trivial export.** Markdown + attachments folder per notebook. Right-click → open in Obsidian. No lock-in anxiety.
9. **Predictable, named AI surfaces.** Instead of a constantly-growing Studio tile menu, ship a small set of clearly-named features that users can learn and trust.

What we should _not_ claim as moat: "we have Gemini." We don't, and even if we did, Google will always have it cheaper.

---

## 6. Things to know

### 6.1 Known limitations (independent of accessibility)

- **50-source notebook cap on free tier** is a hard limit on serious lit reviews.[^limitations]
- **Each notebook is an island.** No cross-notebook references; have to duplicate sources to use them in two contexts.[^limitations]
- **No native export** beyond clipboard. Studio outputs (Audio/Video/PPTX) are downloadable, but chat responses and notes are not.[^limitations]
- **No academic citation formatting** (APA/MLA/Chicago/BibTeX) on output. Inline citations exist but aren't formatted for a bibliography.[^limitations]
- **No public consumer API.** Cannot programmatically push data in or pull artifacts out.[^api]
- **Restricted source types** — no databases, email, code repos, Zotero, OneNote, EverNote, native handwriting.[^limitations]
- **Mind Maps not on mobile.**[^mindmaps]
- **No model selection / no BYO key / no temperature control.**
- **Long-document Audio Overview truncation.** Confirmed user complaints that very long books produce summaries that fade out in the back half.[^limitations]
- **English-only for Interactive Audio, length controls, and Cinematic Video.**[^audio][^updates]
- **No version history on notes.**[^limitations]
- **Drive integration copies — does not sync.** If you update the source doc in Drive, you have to manually re-add it to the notebook.[^sources]

### 6.2 Controversies & risk signals

- **Public-sharing privacy footguns.** When public sharing launched, users with anonymous link sharing could accidentally expose private corpora. Google has since tightened to personal-account-only public links and domain-locked Workspace sharing (Aug 2025), but the pattern persists: it is easy to ship a notebook publicly without realizing what's in it.[^public_share]
- **Feedback content goes to human reviewers** (personal-account users). Disconnected from account, retained 3 years. Many users do not realize "thumbs down" submits attached content for review.[^privacy]
- **Audio voice synthesis ethics.** Audio Overviews use AI voices that sound very natural. Risk of misattribution, deep-faked academic content, and "podcast" outputs being mistaken for real human discourse. Google adds no audible watermark by default.
- **Copyright/contract concerns for uploaded sources.** Academic publishers' terms often disallow uploading PDFs to third-party AI tools. NotebookLM does not check, and the user bears the risk.[^security]
- **Reliance on Gemini changes is opaque.** Model upgrades (Gemini 3 → 3.5 Flash) change output quality without warning. ADHD users who built workflows on specific behavior have to re-adapt.
- **Closed ecosystem + Google-style sunset risk.** NotebookLM started as a Labs experiment. Google has a history of killing products. As long as it's "Labs-graduated," there's residual risk for users who put long-term research into it.

### 6.3 Roadmap signals & cadence

- Roughly **monthly significant release** since late 2024 (see §3.8).[^updates]
- Active areas: multimodal output (cinematic video, infographics), agentic features (Deep Research, Spark agent), Workspace/Enterprise distribution, model upgrades.
- Notable _absences_ from roadmap chatter: no public consumer API, no offline mode, no local-model support, no Markdown export, no cross-notebook reasoning. These look like deliberate non-goals for Google.
- Enterprise focus is increasing — the Cloud API (Pre-GA), HIPAA, and the dedicated Workspace pricing tier all point to an enterprise revenue play.

### 6.4 How rapidly it evolves

Fast. Any specific feature claim in this document should be re-verified before being used in a competitive analysis or pitch deck. Re-check the official help center and the `blog.google` Labs tag at least quarterly.

---

## Footnotes

[^privacy]: "Privacy and Terms of Use in NotebookLM," Google Support. https://support.google.com/notebooklm/answer/17004255 — covers training-on-feedback policy, Workspace/EDU carve-outs, 3-year retention, account-disconnection of feedback.

[^workspace]: "NotebookLM: AI-Powered Research and Learning Assistant Tool," Google Workspace product page. https://workspace.google.com/products/notebooklm/

[^learn_about]: "Learn about NotebookLM," Google Support. https://support.google.com/notebooklm/answer/16164461 — 80+ languages, 180+ regions, source-grounded chat, refusal behavior.

[^sources]: "Add or discover new sources for your notebook," Google Support. https://support.google.com/notebooklm/answer/16215270 — file types, size limits, YouTube/audio handling, Discover/Deep Research.

[^audio]: "Generate Audio Overview in NotebookLM," Google Support. https://support.google.com/notebooklm/answer/16212820 — formats (Deep Dive/Brief/Critique/Debate), 80+ languages, Interactive mode (English only), no explicit transcript provision documented.

[^mindmaps]: "Use Mind Maps in NotebookLM," Google Support. https://support.google.com/notebooklm/answer/16212283 — mobile not supported, download as file, regeneration by delete-and-recreate.

[^public_share]: "Use public notebooks and featured notebooks in NotebookLM," Google Support. https://support.google.com/notebooklm/answer/16322204 + "NotebookLM introduces public notebooks for sharing," Google blog, https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-public-notebooks/ — Aug 2025 restriction to personal accounts for public sharing.

[^video]: "What's new in NotebookLM: Video Overviews and an upgraded Studio," Google blog. https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-video-overviews-studio-upgrades/

[^api]: "Does NotebookLM Have an API?" AutoContent blog, https://autocontentapi.com/blog/does-notebooklm-have-an-api ; community packages `notebooklm-py` (https://github.com/teng-lin/notebooklm-py) and `nblm-rs` (https://github.com/K-dash/nblm-rs); Google AI Developers Forum thread, https://discuss.ai.google.dev/t/how-to-access-notebooklm-via-api/5084

[^enterprise_api]: "Create and manage notebooks (API), NotebookLM Enterprise," Google Cloud documentation. https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks

[^security]: "Is NotebookLM safe? A Guide to NotebookLM Data Security," Devoteam. https://www.devoteam.com/expert-view/a-guide-to-notebooklm-data-security/ — also covers HIPAA designation and chat-only sharing.

[^pricing]: "NotebookLM Pricing 2026: Free vs Plus vs Pro vs Ultra," felloai. https://felloai.com/notebooklm-pricing/ ; cross-referenced with Google AI plan pages.

[^tiers]: "NotebookLM Complete Tier Guide: Free vs Plus vs Pro vs Ultra," Abishek Lakandri (2026). https://www.abisheklakandri.com/blog/notebooklm-tiers-pricing-guide-free-plus-pro-ultra-2026

[^updates]: "NotebookLM Update 2026: Every New Feature Explained," felloai. https://felloai.com/notebooklm-update-1m-token-chat-goals-saved-history/ — timeline of Oct 2025 → May 2026 releases.

[^digitalocean]: "What Is NotebookLM? Features and How to Use It in 2026," DigitalOcean. https://www.digitalocean.com/resources/articles/what-is-notebooklm

[^limitations]: "NotebookLM Limitations (2026): 8 Gaps Google Won't Tell You," Atlas Workspace. https://www.atlasworkspace.ai/blog/notebooklm-limitations — source caps, isolated notebooks, no export, no API, restricted source types, basic collab, no citation formatting, long-doc truncation; cross-referenced with arxiv.org/pdf/2509.25498 on LLM overconfidence in document-based queries.

[^a11y]: "Google NotebookLM Accessibility and Usability Information," University of Wisconsin Knowledge Base. https://kb.wisc.edu/accessibility/157699 — independent audit; WCAG-tagged findings.

[^transcript]: "How to Get a Transcript From NotebookLM," Storylane. https://www.storylane.io/tutorials/how-to-get-a-transcript-from-notebooklm — note: describes transcription of _uploaded_ audio sources; does not confirm native transcripts for _generated_ Audio Overviews. Treat as a documented gap until Google publishes otherwise.

[^alternatives]: "NotebookLM vs Obsidian vs Atlas (2026)," Atlas Workspace, https://www.atlasworkspace.ai/blog/notebooklm-vs-obsidian-vs-atlas ; "10 Best NotebookLM Alternatives 2026," Saner, https://blog.saner.ai/10-best-notebooklm-alternatives/ ; AFFiNE overview, XDA Developers.

[^faq]: "NotebookLM Frequently Asked Questions," Google Support. https://support.google.com/notebooklm/answer/16269187
