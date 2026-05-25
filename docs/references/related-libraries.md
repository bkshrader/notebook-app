# Related Libraries — Cursory Research

Survey of additional libraries that may be useful for the accessibility-first notebook app for college students/academics. Target license is **AGPL-3.0**, so AGPL compatibility (one-way, since AGPL is "stronger" than permissive licenses and incompatible with some weak-copyleft variants) is called out for every entry.

**AGPL-compatibility verdict legend:**
- **Compatible** — permissive (MIT/BSD/ISC/Apache-2.0/MPL-2.0/LGPL) or AGPL/GPL-3.0+ itself
- **Incompatible** — GPL-2.0-only, SSPL, BSL/BUSL, "source-available", custom commercial, or no license at all
- **Conditional** — needs further explanation (e.g., dual licensing, dependencies with stricter terms, trademark/watermark conditions)

---

## 1. Desktop App Shells

- **[Electron](https://github.com/electron/electron)** — Mature Chromium+Node shell; the safe, batteries-included path with the largest ecosystem and best accessibility story (Chromium's a11y tree is the most battle-tested anywhere). Heavy on disk/RAM, but accessibility-first projects benefit from Chromium's mature screen-reader support. **License: MIT — Compatible.**
- **[Tauri](https://github.com/tauri-apps/tauri)** — Rust-backed shell using each OS's native webview (WebView2/WKWebView/WebKitGTK). Smaller bundles than Electron but webview a11y parity is *not* equivalent across platforms — Linux WebKitGTK in particular has known accessibility gaps that matter for a WCAG AAA target. **License: MIT OR Apache-2.0 (dual) — Compatible.**
- **[Wails](https://github.com/wailsapp/wails)** — Go-backed Tauri analogue. Same webview-a11y caveat as Tauri; smaller ecosystem; Go vs. Rust is mostly a preference. **License: MIT — Compatible.**
- **[Neutralino.js](https://github.com/neutralinojs/neutralinojs)** — Tiny C++ shell, system-webview-based. Lightest option but the smallest community and most a11y unknowns; not recommended for an a11y-first product. **License: MIT — Compatible.**
- **[Slint](https://github.com/slint-ui/slint)** — Rust-native UI toolkit (not webview-based). Triple-licensed: royalty-free proprietary, GPLv3, or paid commercial. AGPL projects can use under GPLv3, but Slint's a11y story is much less mature than Chromium's and would force a custom a11y architecture. **License: GPL-3.0 / royalty-free / commercial (triple). Under GPL-3.0 — Compatible** (AGPL-3.0 can link GPL-3.0 code per FSF compatibility matrix).

## 2. Rich Text / Markdown Editors

- **[TipTap](https://github.com/ueberdosis/tiptap)** — Headless editor framework on ProseMirror; huge extension catalogue, very flexible, good a11y when configured carefully. The most popular "structured editor" choice in 2026. **License: MIT — Compatible.** (Note: TipTap *Cloud/Pro* features are commercial; the open-source core is MIT.)
- **[ProseMirror](https://github.com/ProseMirror/prosemirror)** — Lower-level than TipTap; the engine underneath it. Use directly if you want maximum control over the document model (worth it for academic-grade structured docs). **License: MIT — Compatible.**
- **[Lexical](https://github.com/facebook/lexical)** — Meta's modern editor framework (powers Facebook/Workplace). Strong a11y focus, fast, but smaller ecosystem and the React-first DX is heavier than TipTap. **License: MIT — Compatible.**
- **[Slate](https://github.com/ianstormtaylor/slate)** — React-native editor framework. Mature but historically rough edges around a11y/IME — has improved, but TipTap/Lexical are easier wins for an a11y-first product. **License: MIT — Compatible.**
- **[CodeMirror 6](https://github.com/codemirror/dev)** — Best-in-class code editor; modular, accessible, lightweight. Worth using as the *code-block* editor inside a richer document editor. **License: MIT — Compatible.**
- **[Monaco Editor](https://github.com/microsoft/monaco-editor)** — VS Code's editor extracted. Heavier than CodeMirror 6 and historically weaker a11y; CodeMirror 6 is the better fit here. **License: MIT — Compatible.**
- **[BlockNote](https://github.com/TypeCellOS/BlockNote)** — Notion-style block editor built on TipTap. **License: MPL-2.0 for core, but `packages/xl-*` are GPL-3.0 — Conditional.** MPL/GPL are both AGPL-compatible, but be aware the GPL-3.0 XL packages require open-sourcing your whole app under (A)GPL — fine for this project, problematic for downstream forks that want different licensing.
- **[Milkdown](https://github.com/Milkdown/milkdown)** — Plugin-driven WYSIWYG markdown editor on ProseMirror; lighter conceptual surface than BlockNote. **License: MIT — Compatible.**
- **[Editor.js](https://github.com/codex-team/editor.js)** — Block-style editor producing clean JSON. Less suitable for markdown-first workflows; output format is bespoke. **License: Apache-2.0 — Compatible.**
- **[Toast UI Editor](https://github.com/nhn/tui.editor)** — Markdown editor with split-pane preview; opinionated and less extensible than TipTap/Milkdown. **License: MIT — Compatible.**

## 3. Markdown Parsing / Rendering

- **[remark / rehype / unified](https://github.com/remarkjs/remark)** — The industry-standard pluggable Markdown/HTML AST pipeline. Unbeatable for transforming notes (e.g. extracting citations, math, callouts) — essentially the only serious choice for academic note tooling. **License: MIT — Compatible.**
- **[markdown-it](https://github.com/markdown-it/markdown-it)** — Fast, plugin-friendly CommonMark parser; great when you want render-only with minimal AST gymnastics. **License: MIT — Compatible.**
- **[marked](https://github.com/markedjs/marked)** — Mature, very fast, simple. Less extensible than markdown-it. **License: MIT — Compatible.**
- **[micromark](https://github.com/micromark/micromark)** — The CommonMark/GFM tokenizer underlying remark. Use directly only for low-level cases. **License: MIT — Compatible.**

## 4. Local-First Sync / CRDT / Storage

- **[Yjs](https://github.com/yjs/yjs)** — The de-facto CRDT for collaborative editors; first-class TipTap/ProseMirror/CodeMirror bindings. Battle-tested. **License: MIT — Compatible.**
- **[Automerge](https://github.com/automerge/automerge)** — Alternative CRDT with cleaner JSON-document semantics. Rust core, WASM bindings. Slightly heavier runtime than Yjs but easier mental model for non-text data. **License: MIT — Compatible.**
- **[ElectricSQL](https://github.com/electric-sql/electric)** — Postgres-to-SQLite sync engine for local-first apps. Promising but architecturally heavyweight (requires a Postgres backend) — overkill unless multi-device sync is a P0 feature. **License: Apache-2.0 — Compatible.**
- **[RxDB](https://github.com/pubkey/rxdb)** — Offline-first reactive database with sync replication. **License: Apache-2.0 — Compatible.** Note: many of the *interesting* RxDB plugins (encryption, server, GraphQL, etc.) are paid "premium" — verify what you need before committing.
- **[PouchDB](https://github.com/pouchdb/pouchdb)** — CouchDB-compatible local DB; mature but project velocity has slowed. **License: Apache-2.0 — Compatible.**
- **[Dexie.js](https://github.com/dexie/Dexie.js)** — Best-in-class IndexedDB wrapper; great DX for purely-local storage. **License: Apache-2.0 — Compatible.**
- **[SQLite](https://github.com/sqlite/sqlite)** — Public domain; the obvious local store for academic notes. **License: Public Domain — Compatible.**
- **[libSQL](https://github.com/tursodatabase/libsql)** — Turso's actively-developed SQLite fork (the original SQLite project doesn't accept PRs). Adds embedded replicas, async I/O, encryption. **License: MIT — Compatible.**
- **[SQLite-WASM](https://github.com/sqlite/sqlite-wasm)** — Official SQLite WASM build with OPFS storage; works inside Electron/Tauri renderer if you want notes-as-SQLite-in-browser. **License: Apache-2.0 — Compatible.**

## 5. Search

- **[MiniSearch](https://github.com/lucaong/minisearch)** — Tiny, no-dependency JS full-text search; good fit for client-side note search up to ~10k notes. **License: MIT — Compatible.**
- **[FlexSearch](https://github.com/nextapps-de/flexsearch)** — Faster than MiniSearch, more features, more complex API. **License: Apache-2.0 — Compatible.**
- **[Lunr.js](https://github.com/olivernn/lunr.js)** — Established, but maintenance is slow; MiniSearch/FlexSearch are usually better picks. **License: MIT — Compatible.**
- **[Orama](https://github.com/oramasearch/orama)** — Modern, fast, supports hybrid (vector + full-text) search in pure JS — interesting for local RAG without native deps. **License: Apache-2.0 — Compatible.**
- **[Tantivy](https://github.com/quickwit-oss/tantivy)** — Rust Lucene-equivalent; very fast, but you need to bridge it (Tauri or Neon/N-API). Overkill until you have a real scale problem. **License: MIT — Compatible.**
- **SQLite FTS5** — Built into SQLite, public domain. Excellent if you're already using SQLite for storage. **License: Public Domain — Compatible.**

## 6. Accessibility Tooling

### Audits / dev tools
- **[axe-core](https://github.com/dequelabs/axe-core)** — The accessibility test engine that backs nearly every other tool in this space. Use directly in CI and at runtime. **License: MPL-2.0 — Compatible.**
- **[jest-axe](https://github.com/nickcolley/jest-axe)** — Jest matcher wrapping axe-core; trivially added to component tests. **License: MIT — Compatible.**
- **[Storybook a11y addon](https://github.com/storybookjs/storybook)** (`@storybook/addon-a11y`) — Live axe-core panel inside Storybook; pairs naturally with `@storybook/addon-vitest` to fail PRs on a11y regressions. **License: MIT — Compatible.**
- **[Pa11y](https://github.com/pa11y/pa11y)** — CLI a11y tester; useful for URL-based audits in CI. **License: LGPL-3.0-only — Compatible** (LGPL is compatible with AGPL; the LGPL terms only apply to the library itself, which you wouldn't ship inside the app anyway — Pa11y is a dev tool).
- **[Lighthouse](https://github.com/GoogleChrome/lighthouse)** — Google's audit suite (includes a11y). Useful for one-off audits. **License: Apache-2.0 — Compatible.**

### Headless / accessible components
- **[Radix UI Primitives](https://github.com/radix-ui/primitives)** — Unstyled, accessible React primitives (dialog, menu, tabs, etc.). Industry-standard a11y-first component library. **License: MIT — Compatible.**
- **[React Aria / React Aria Components](https://github.com/adobe/react-spectrum)** — Adobe's headless a11y hooks and components; arguably the *most* a11y-rigorous option in React, with explicit support for assistive tech across platforms. Strong fit for a WCAG AAA target. **License: Apache-2.0 — Compatible.**
- **[Headless UI](https://github.com/tailwindlabs/headlessui)** — Tailwind's accessible primitives; smaller scope than Radix/React Aria. **License: MIT — Compatible.**
- **[Reach UI](https://github.com/reach/reach-ui)** — **Unmaintained as of 2026 — avoid.** Listed for completeness; use Radix or React Aria instead. **License: MIT — Compatible** (but moot).

### Focus / keyboard
- **[focus-trap](https://github.com/focus-trap/focus-trap)** — Robust focus trap library (modals, dialogs). Used by many a11y component libraries internally. **License: MIT — Compatible.**
- **[tinykeys](https://github.com/jamiebuilds/tinykeys)** — Tiny modern keybinding library with chord support; good API for a configurable-hotkeys-first app. **License: MIT — Compatible.**
- **[react-hotkeys-hook](https://github.com/JohannesKlauss/react-hotkeys-hook)** — Hook-based shortcut registration with scopes/modifiers; ~3 KB. **License: MIT — Compatible.**
- **[hotkeys-js](https://github.com/jaywcjlove/hotkeys-js)** — Framework-agnostic keybindings; mature. **License: MIT — Compatible.**
- **[mousetrap](https://github.com/ccampbell/mousetrap)** — Older, maintenance is light; tinykeys/hotkeys-js are better picks today. **License: Apache-2.0 — Compatible.**

## 7. PDF Rendering

- **[PDF.js](https://github.com/mozilla/pdf.js)** — Mozilla's canonical PDF viewer/renderer. Built-in viewer supports basic highlights/annotations in newer versions but does *not* persist them inside the PDF — you'd need to manage annotation state in your own data layer. **License: Apache-2.0 — Compatible.**
- **[react-pdf (wojtekmaj)](https://github.com/wojtekmaj/react-pdf)** — React bindings to PDF.js for rendering. No annotation support. **License: MIT — Compatible.**
- **[react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter)** — Text + rectangle highlighting on top of PDF.js, viewport-independent annotation format. Closest open-source thing to "Zotero-style" PDF reading in React. **License: MIT — Compatible.** (Note: original repo's last release was 8.0.0-rc.0 ~2 years ago — verify maintenance or check forks like `react-pdf-highlighter-plus`.)

## 8. Speech-to-Text / Dictation

- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** — Pure C/C++ Whisper port; CPU + GPU (Metal/CUDA/Vulkan), zero Python deps. The standard for local STT inside desktop apps in 2026. **License: MIT — Compatible.** (Models — OpenAI Whisper — are also MIT.)
- **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** — CTranslate2-based Whisper; much faster than reference impl, Python-only. Useful if you ship a Python sidecar. **License: MIT — Compatible.**
- **[OpenAI Whisper (original)](https://github.com/openai/whisper)** — Reference Python implementation. Slow but the upstream truth. **License: MIT — Compatible.**
- **[Vosk](https://github.com/alphacep/vosk-api)** — Kaldi-based, tiny models, real-time, CPU-friendly. Much lower accuracy than Whisper on accented/technical speech — but the best option for low-resource devices or real-time streaming. **License: Apache-2.0 — Compatible.**
- **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** — Next-gen Kaldi via ONNX Runtime; STT + TTS + diarization + VAD, supports 12 languages of bindings (Node included). Strong all-in-one local pipeline candidate. **License: Apache-2.0 — Compatible.**
- **Web Speech API (browser)** — Available inside Electron's Chromium; *requires Google's cloud servers* on Chrome/Chromium for recognition — **not actually local**. Don't rely on it for a local-first app.

## 9. Text-to-Speech

- **[Piper](https://github.com/rhasspy/piper)** — Fast, local neural TTS optimized for embedded/desktop; good voice quality. Best open-source local TTS in 2026 for a desktop app. **License: MIT — Compatible.**
- **[eSpeak-NG](https://github.com/espeak-ng/espeak-ng)** — Robotic but extremely lightweight and supports 100+ languages — invaluable as a fallback voice for languages Piper doesn't cover. **License: GPL-3.0-or-later — Compatible** (AGPL-3.0 can incorporate GPL-3.0; ship as a separate binary to avoid library-linking ambiguity).
- **[Coqui TTS (idiap fork)](https://github.com/idiap/coqui-ai-TTS)** — The original Coqui project shut down; this is the actively-maintained fork. Python-only, much heavier than Piper. **License: MPL-2.0 — Compatible.** (Note: some voice models bundled by upstream had restrictive non-commercial terms — verify per-model before shipping.)
- **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** — Also does TTS via ONNX models; mentioned above. **License: Apache-2.0 — Compatible.**
- **Web Speech Synthesis API** — Works in Chromium; voices vary by OS. Good zero-cost baseline for accessibility "read aloud" but voice quality is OS-dependent.
- **OpenAI / ElevenLabs SDKs (cloud)** — Cloud TTS; their *client SDKs* are MIT/Apache (e.g., openai-node Apache-2.0), but the **service itself is non-free** — fine to call from an AGPL app, just gates feature behind a paid API key. **SDK licenses: Compatible.**

## 10. OCR

- **[Tesseract.js](https://github.com/naptha/tesseract.js)** — WASM port of Tesseract; works in browser/Electron. The default choice. Underlying Tesseract is Apache-2.0. **License: Apache-2.0 — Compatible.**
- **[RapidOCR](https://github.com/RapidAI/RapidOCR)** — ONNX-based; significantly better on East Asian scripts and often more accurate than Tesseract. **License: Apache-2.0 — Compatible.** (Note: underlying OCR model copyright is held by Baidu — verify model redistribution terms separately.)

## 11. Citation / Bibliography Management

- **[citation.js](https://github.com/citation-js/citation-js)** — Parse/convert/format citations across BibTeX/CSL-JSON/RIS/etc. The convenient front-door for any citation feature. **License: MIT — Compatible.**
- **[citeproc-js](https://github.com/Juris-M/citeproc-js)** — Reference CSL renderer (used by Zotero, citation.js). **License: AGPL-3.0 OR CPAL (dual) — Conditional.** AGPL path is fine for this project; if a downstream user/fork wants a different license they'd need CPAL, which has its own attribution requirements. AGPL-3.0 itself is the obvious choice for an AGPL app.
- **[CSL Styles repo](https://github.com/citation-style-language/styles)** — 10k+ citation style definitions used by every citation processor. **License: CC-BY-SA 3.0 — Compatible for *use*, but redistributing modified styles requires preserving CC-BY-SA terms** (different license layer from the app code — not a problem for shipping; *is* something to surface to users who edit styles).
- **Zotero connectors / API** — Zotero core is **AGPLv3** — directly compatible with this project. The web API is documented and free to call.

## 12. LaTeX / Math Rendering

- **[KaTeX](https://github.com/KaTeX/KaTeX)** — Fast, server-renderable math; smaller subset than MathJax but easier to integrate and faster. **License: MIT — Compatible.**
- **[MathJax](https://github.com/mathjax/MathJax)** — Most-complete LaTeX support, slower. **License: Apache-2.0 — Compatible.**
- **[MathLive](https://github.com/arnog/mathlive)** — Math *input* widget with full a11y (spoken-math support, screen reader integration) — uniquely relevant for an accessibility-first academic app. **License: MIT — Compatible.**

## 13. Diagrams

- **[Mermaid](https://github.com/mermaid-js/mermaid)** — Text-to-diagram (flowcharts/sequence/etc.); ubiquitous in Markdown ecosystems. **License: MIT — Compatible.**
- **[Excalidraw](https://github.com/excalidraw/excalidraw)** — Hand-drawn-style whiteboard. **License: MIT — Compatible.** (Note: `@excalidraw/excalidraw` npm package itself is MIT; Excalidraw+ is a separate hosted commercial product, not relevant to embedding the library.)
- **[tldraw](https://github.com/tldraw/tldraw)** — Beautiful whiteboard SDK. **License: Custom "tldraw license" — Incompatible.** Free in development, but **production use requires a paid license key**. This was the legal status as of late 2024/2025 and remains so. **Do not use** for an AGPL-shipping product without buying the commercial license. (This is the most important "looks open, isn't" trap in this list.)

## 14. Voice / Audio Pipelines

- **[whisper.cpp](https://github.com/ggerganov/whisper.cpp)** — Covered above; also the foundation for diarization + lecture-transcription pipelines.
- **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** — STT + speaker diarization + VAD in one package; arguably the strongest open-source pipeline for academic recording workflows. **License: Apache-2.0 — Compatible.**
- **[LiveKit Agents](https://github.com/livekit/agents)** — Real-time multi-modal agent framework (audio in/out, STT + LLM + TTS orchestration); overkill for note-taking but interesting if you add a voice-assistant feature. **License: Apache-2.0 — Compatible.**

## 15. AI / LLM Client Libraries (beyond OpenRouter)

- **[Anthropic SDK (TypeScript)](https://github.com/anthropics/anthropic-sdk-typescript)** — Direct Claude API access. **License: MIT — Compatible.**
- **[OpenAI Node SDK](https://github.com/openai/openai-node)** — **License: Apache-2.0 — Compatible.**
- **[Vercel AI SDK](https://github.com/vercel/ai)** — Provider-agnostic streaming/tool-calling abstraction; very ergonomic for chat UIs. **License: Apache-2.0 — Compatible.**
- **[LangChain.js](https://github.com/langchain-ai/langchainjs)** — Heavy abstraction layer; useful for RAG/agent boilerplate but often unnecessary when OpenRouter or the Vercel AI SDK is in play. **License: MIT — Compatible.**
- **[llama.cpp](https://github.com/ggerganov/llama.cpp)** — De-facto local LLM runtime; ship as a sidecar process for fully-offline AI features. **License: MIT — Compatible.**
- **[transformers.js](https://github.com/huggingface/transformers.js)** — Hugging Face's WASM runtime for small models (embeddings, classifiers) in-browser/Electron. **License: Apache-2.0 — Compatible.**

## 16. Embeddings / Vector Search (for local RAG)

- **[sqlite-vec](https://github.com/asg017/sqlite-vec)** — Modern, actively-maintained SQLite vector extension; replaces sqlite-vss. The clear pick if you're using SQLite. **License: Apache-2.0 OR MIT (dual) — Compatible.**
- **[sqlite-vss](https://github.com/asg017/sqlite-vss)** — Older predecessor of sqlite-vec; *deprecated by the same author* in favor of sqlite-vec. **License: MIT — Compatible** (but use sqlite-vec).
- **[hnswlib](https://github.com/nmslib/hnswlib)** — Fast in-memory HNSW vector index; Node bindings exist. **License: Apache-2.0 — Compatible.**
- **[LanceDB](https://github.com/lancedb/lancedb)** — Embedded vector DB with Node/Python bindings; good for larger local corpora. **License: Apache-2.0 — Compatible.**
- **[Faiss](https://github.com/facebookresearch/faiss)** — Meta's industry-standard ANN library; Node bindings exist but are less polished. **License: MIT — Compatible.**
- **[Qdrant](https://github.com/qdrant/qdrant)** — Standalone vector DB; overkill for local-first but useful if you eventually run a sync service. **License: Apache-2.0 — Compatible.**
- **[Orama](https://github.com/oramasearch/orama)** — Pure-JS hybrid full-text + vector; mentioned in §5. Nice if you want one library for both. **License: Apache-2.0 — Compatible.**

## 17. Build / Tooling / Test for A11y CI

- **[Playwright](https://github.com/microsoft/playwright)** — Cross-browser e2e testing; integrates well with `@axe-core/playwright` for automated a11y assertions in CI. **License: Apache-2.0 — Compatible.**
- **[Storybook](https://github.com/storybookjs/storybook)** — Component workshop; pair with `addon-a11y` (axe panel) and `addon-vitest` to gate PRs on a11y violations. **License: MIT — Compatible.**
- **[Electron Forge](https://github.com/electron/forge)** — Standard Electron build/packaging toolchain (only relevant if Electron is chosen). **License: MIT — Compatible.**

## 18. Internationalization

- **[i18next](https://github.com/i18next/i18next)** — Most popular i18n framework; huge ecosystem; works framework-agnostic. **License: MIT — Compatible.**
- **[FormatJS / react-intl](https://github.com/formatjs/formatjs)** — ICU MessageFormat-first; better for grammatically-correct plurals/gender/dates. **License: BSD-3-Clause (verified per package) — Compatible.**
- **[Lingui](https://github.com/lingui/js-lingui)** — Compile-time-extracted catalogs, ICU-based. Smaller runtime than react-intl. **License: MIT — Compatible.**

---

## Summary

**Licensing surprises / "looks open, isn't" traps:**
- **tldraw** — Custom "tldraw license"; **production use requires a paid license**. The most common mistake people make in this space — it *was* Apache-2.0 long ago, then watermark-encumbered, now fully commercial. **Use Excalidraw or roll your own canvas instead.**
- **BlockNote `xl-*` packages** — GPL-3.0 (commercial license sold separately). Fine for this AGPL project, but the GPL viral scope is wider than the MPL-2.0 core; if you fork BlockNote you must keep `xl-*` AGPL/GPL or buy a license.
- **citeproc-js** — Dual AGPL-3.0 / CPAL; both have requirements. The AGPL path is the right one here; just know you can't relicense.
- **RxDB premium plugins** — The interesting features (encryption, server, etc.) are commercial — verify what's actually OSS before depending on them.
- **CSL styles** — CC-BY-SA 3.0 (the style files themselves, not the engine). Not a code-compatibility issue, but a user-facing one if you let users edit styles.
- **Coqui TTS** — Engine is MPL-2.0 (Compatible), but some shipped *voice models* historically had non-commercial restrictions. Audit per-model.
- **Slint** — Triple-licensed; you can use it under GPL-3.0 in an AGPL project, but most users assume "MIT" when they see the website.

**Categories with no good AGPL-compatible option:**
- **Production-grade vector-tile/whiteboard SDK with the polish of tldraw** — Excalidraw is the only meaningful open alternative and is less feature-dense; this is a genuine gap.
- **First-class local "real-time" web-speech recognition** — Chromium's built-in API sends audio to Google; "local" really means whisper.cpp/Vosk/sherpa-onnx and you're shipping native binaries.
- **PDF annotation that *writes back into the PDF*** — open-source viewers (PDF.js + react-pdf-highlighter) display and overlay highlights but don't persist them as native PDF annotations. Commercial SDKs (Nutrient, Apryse) own this niche.

**Strongest differentiators for this project specifically:**
- **React Aria / React Aria Components** — Highest-rigor a11y component library; directly serves the WCAG AAA target. Strongly recommended over Radix for the most-critical accessible interactions.
- **MathLive** — Spoken-math + screen-reader-integrated equation input is *uniquely* relevant for academic + accessibility-first; very few math editors get this right.
- **TipTap + Yjs + sqlite-vec + remark** — The combination that gives you structured documents, real CRDT collab if you want it later, hybrid search/RAG, and a transformable AST for tools (citations, exports). All MIT/Apache.
- **whisper.cpp + Piper + sherpa-onnx** — Fully-offline STT/TTS/diarization, all permissive, no cloud dependency. Aligns with both the privacy and accessibility values of the project.
- **Cherry Studio** (mentioned as reference) — Itself AGPL-3.0 with a commercial-license escape hatch; a useful prior-art reference for how an AGPL desktop app handles dual-licensing in this category.
