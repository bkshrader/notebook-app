# Whisper and the Local Speech-to-Text Landscape

Survey of OpenAI's Whisper family **plus competing speech-to-text engines** for the accessibility-first, AGPL-licensed notebook app for college students/academics. The app's STT engine needs to cover **lecture transcription** (live + post-hoc rerun), **dictation into notes**, and **audio-linked-note playback** with timestamp anchors; **local/offline-first** with cloud as an opt-in fallback; **CPU-acceptable** on student laptops; **cross-platform** (Windows/macOS/Linux); usable as an **Electron or Tauri sidecar**.

The word **"Whisper"** is now ambiguous. It refers, in different contexts, to:

1. **OpenAI's original PyTorch reference implementation** (`openai/whisper`), released alongside the paper _Robust Speech Recognition via Large-Scale Weak Supervision_.[^paper] The reference codebase is essentially a research artifact — slow on CPU, no streaming, Python+PyTorch dependency stack.
2. **The model weights themselves**, redistributed by countless re-implementations. The weights have their own license (Apache-2.0 for `large-v3` and later)[^lic-largev3] separate from any code license.
3. **An optimized C/C++ port — `whisper.cpp`** — which is what nearly everyone actually ships in desktop apps.[^whispercpp-repo]
4. **GPU-accelerated re-implementations** (`faster-whisper` via CTranslate2;[^fw-repo] `whisper-jax` on TPU;[^jax-readme] `Const-me/Whisper` for Windows DirectCompute[^constme-repo]).
5. **Streaming wrappers** built on top of any of the above (`whisper_streaming`, `whisper-stream`, `whisper-server`, sherpa-onnx streaming).
6. **Distilled/quantized variants** that change the model itself — `distil-whisper`,[^distil-repo] `large-v3-turbo`,[^turbo-page] `CrisperWhisper`.
7. **Fully-different ASR families** that compete head-to-head with Whisper on accuracy — NVIDIA's **Parakeet / Canary**,[^parakeet-card] Useful Sensors' **Moonshine**,[^moonshine-arxiv] **Vosk**/Kaldi,[^vosk-models] and the streaming **Zipformer** family runnable via sherpa-onnx.[^sherpa-repo]

This document walks through each of those families, then lays out an opinionated recommendation against the app's specific constraints.

> **Sibling docs:** see [`handy.md`](./handy.md) for the Tauri-based desktop dictation app _Handy_, which uses `whisper.cpp` + `transcribe-rs` + Parakeet — a useful concrete reference implementation of the stack this document recommends. See [`markitdown.md`](./markitdown.md) for the existing Python sidecar (Docling/MarkItDown) we already pay the runtime cost for.

---

## 1. OpenAI reference Whisper — `openai/whisper`

- **Repo:** <https://github.com/openai/whisper>
- **License (code):** **MIT** — verified directly against the `LICENSE` file in the repo root: standard MIT permission grant + warranty disclaimer, `Copyright (c) 2022 OpenAI`.[^openai-license-file]
- **License (model weights):** **Apache-2.0** as posted on the Hugging Face model card for `openai/whisper-large-v3`.[^lic-largev3] (Older Whisper checkpoints inherited the MIT terms from the original repo, but later weights are explicitly Apache-2.0.)
- **AGPL-compatibility verdict:** **Compatible** for both code (MIT) and weights (Apache-2.0). Both are OSI-approved permissive licenses that AGPL-3.0 §7 explicitly permits incorporation of, as long as their notices are preserved in the AGPL distribution.
- **Repo signals (2026-05-23):** 100,275 ★, default branch `main`, latest release `v20250625` (2025-06-26), last push 2026-04-15. Maintained but very low velocity — the project is essentially a frozen reference implementation.[^openai-repo-api]

### What it is

The reference research codebase from the _Robust Speech Recognition via Large-Scale Weak Supervision_ paper.[^paper] Pure Python on top of PyTorch; the audio is mel-spectrogrammed, fed into a 32-layer transformer encoder, and decoded autoregressively into text tokens.

### Models shipped[^whisper-card]

| Model                             | Params | Disk (FP16) | English-only | Multilingual                  |
| --------------------------------- | ------ | ----------- | ------------ | ----------------------------- |
| `tiny`                            | 39 M   | ~75 MiB     | ✓            | ✓                             |
| `base`                            | 74 M   | ~142 MiB    | ✓            | ✓                             |
| `small`                           | 244 M  | ~466 MiB    | ✓            | ✓                             |
| `medium`                          | 769 M  | ~1.5 GiB    | ✓            | ✓                             |
| `large` / `large-v2` / `large-v3` | 1550 M | ~2.9 GiB    | —            | ✓ (99 langs)                  |
| `large-v3-turbo`                  | 809 M  | ~1.5 GiB    | —            | ✓ (99 langs, English-leaning) |

`large-v3-turbo` shares the full 32-layer encoder with `large-v3` but compresses the decoder from 32 → 4 layers, giving ~6× speedup on the _decoder_ side at <5% accuracy regression for English.[^turbo-page] On music or sung content, the trimmed decoder degrades quality noticeably.[^turbo-music]

**Language coverage:** trained on 99 languages, with strong-to-usable performance on roughly the top 30; the long tail is much weaker.[^whisper-card]

### Why we don't ship this

- **Python + PyTorch runtime** (~2 GB on disk for the wheel + CUDA libs even before model weights).
- **Slow on CPU** — `large-v3` is roughly 1× real-time on a modern CPU and **far** worse on older hardware; not a fit for live captioning on a student laptop.
- **No streaming.** Whisper is fundamentally a 30-second batch processor: the model expects a 30-second mel spectrogram per inference. Streaming requires an external scheduler/buffer (e.g., `whisper_streaming`, faster-whisper's chunked transcription, or whisper.cpp's `stream` example).[^stream-discussion]
- **Memory-hungry** — `large-v3` wants ~10 GB peak with default settings on PyTorch.
- **No built-in word-level timestamps in the reference release path** — they were added later via the `word_timestamps=True` flag, but the canonical OpenAI implementation lags the ecosystem on this.

### Why we still care

It is the canonical reference. Every other engine is judged in WER terms against it, and the model weights it publishes are what everyone downstream loads (often after a format conversion to GGML, CTranslate2, or ONNX).

---

## 2. `whisper.cpp` — the C/C++ port

- **Repo:** <https://github.com/ggml-org/whisper.cpp> (formerly `ggerganov/whisper.cpp`, moved to the `ggml-org` org along with `llama.cpp`).
- **License (code):** **MIT** — verified directly: standard MIT permission grant, `Copyright (c) 2023-2026 The ggml authors`.[^whispercpp-license-file]
- **License (model weights):** Same as upstream Whisper — MIT for older checkpoints, Apache-2.0 for `large-v3`/`large-v3-turbo`.[^lic-largev3]
- **AGPL-compatibility verdict:** **Compatible** for code (MIT) and weights (MIT / Apache-2.0).
- **Repo signals (2026-05-23):** 50,033 ★, latest release `v1.8.4` (2026-03-19), last push 2026-05-22. **Active and the de-facto local-STT runtime for desktop apps in 2026.**[^whispercpp-repo-api]

### Architecture

Pure C/C++ on the `ggml` tensor library (the same engine that powers `llama.cpp`). **No PyTorch, no Python**. The library is a single compiled object you link against or a CLI you `exec`. Default model format is `.bin` ("GGML") containing weights + mel filters + vocab.[^whispercpp-readme]

### Acceleration backends

CPU: ARM NEON, AVX/AVX2/AVX512, POWER VSX, OpenBLAS.[^whispercpp-readme]
GPU: **Metal** (Apple Silicon), **CUDA** + cuBLAS (NVIDIA), **Vulkan** (cross-vendor — including AMD/Intel on Windows/Linux), **OpenVINO** (Intel CPU/iGPU/NPU), **Core ML** (Apple Neural Engine on macOS), plus newer Ascend NPU and Moore Threads (MUSA) backends.[^whispercpp-readme]

### Performance reality check

On Apple Silicon with Metal: `large-v3-turbo` lands at roughly **10× real-time on an M1**, **21× on an M2 Pro** (1 min audio → ~2.8 s).[^apple-bench] On Windows/Linux x64 with Vulkan, similar order-of-magnitude wins on RTX/Radeon discrete GPUs.[^whispercpp-issue-1127]

**CPU-only on the kind of laptop a student actually owns** (mid-range Intel/AMD U-series, no discrete GPU): `small` runs comfortably at real-time, `medium` is roughly real-time, `large-v3-turbo` is ~1–3× real-time depending on AVX support, `large-v3` is _slower than real-time_ — fine for batch re-transcription, not OK for live captioning. faster-whisper is meaningfully quicker on **pure CPU** thanks to its Intel oneMKL/oneDNN integration (often ~2× whisper.cpp on the same Intel chip).[^promptquorum-bench]

### Quantized models

Whisper.cpp supports 4-, 5-, and 8-bit integer quantization. `large-v3-turbo-q5_0` is **547 MiB** vs the FP16 `large-v3-turbo` at 1.5 GiB, with small WER regression — the obvious default for memory-constrained laptops.[^whispercpp-models]

### Streaming

The repo ships `whisper-stream` (formerly `examples/stream`): samples audio every ~500 ms and runs a fresh transcription pass over a sliding context window. Requires SDL2.[^whispercpp-readme] The model itself is not natively streaming; whisper.cpp emulates it with overlapping 30-second windows + a VAD to cut silence. Partial-transcript UX is therefore "revising chunks", not append-only — the user sees the last segment rewrite a couple of times before it stabilizes.

### Word-level timestamps

Whisper.cpp implements **DTW (Dynamic Time Warping) alignment** on the model's cross-attention scores to derive word boundaries.[^dtw-paper] Word-level alignment is currently a build-time / runtime flag (`--dtw <model>`); accuracy is "research-grade good" (sub-100 ms boundary error on well-aligned attention heads), and the CPU overhead is roughly **+10%** on top of base inference.[^dtw-overhead] For audio-linked-notes anchoring, this is the cheapest viable path.

### Maturity / community

`whisper.cpp` is the gravitational center of the local-STT ecosystem in 2026:

- 50 k stars, very high commit cadence, well over 100 contributors.
- Bindings in nearly every language: Rust (`whisper-rs`), Go, Python (`pywhispercpp`, `whisper-cpp-python`), Java/Kotlin, Swift, .NET (`whisper.net`),[^whispernet-license] React Native.
- Official **WASM build** (`whisper.wasm`, `stream.wasm`, `command.wasm`) — runs in any browser.[^whispercpp-readme]
- Official **HTTP `whisper-server` example** exposing an OpenAI-compatible `/v1/audio/transcriptions` endpoint, with Server-Sent Events for streaming partials.[^whisper-server]

### Node.js bindings — current health (2026)

| Package              | Latest        | Last published | License | Notes                                                                                                                                        |
| -------------------- | ------------- | -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **`nodejs-whisper`** | 0.3.0         | **2026-04-11** | MIT     | Active, the current default. Wraps whisper.cpp CLI; auto-downloads models. Streaming support is limited.[^npm-nodejs-whisper]                |
| **`smart-whisper`**  | 0.8.1         | 2024-10-02     | MIT     | Native N-API addon, auto-offloads idle models. Goes through file IO rather than streaming. **No release in ~19 months.**[^npm-smart-whisper] |
| **`whisper-node`**   | 1.1.1         | 2023-11-29     | MIT     | **Unmaintained** — 2+ years since last release.[^npm-whisper-node] Avoid for new projects.                                                   |
| `whisper-node-addon` | various forks | 2025           | MIT     | Cross-platform prebuilt `.node` binaries for Electron; useful if you don't want a build step.[^smart-whisper-search]                         |

There is no _official_ Node binding maintained inside the `ggml-org/whisper.cpp` repo — the official artifact is the CLI and the WASM build. Everything in Node land is third-party.

### Known gotchas

- **`large-v3` hallucinates on silence**, much worse than `large-v2`. Reported on both the HF model card and the whisper.cpp issue tracker.[^hallu-hf][^hallu-cpp] **Mitigation:** run a VAD (Silero) ahead of the model and skip non-speech windows; set `condition_on_previous_text=false` to break repetition-reinforcement across chunks; set `compression_ratio_threshold≈2.4` and `log_prob_threshold≈-1.0` so the decoder discards low-confidence/looping segments.[^memo-hallu]
- **Repetition loops in long-form decoding** — same root cause; same mitigations. There's an open PR proposing automatic hallucination detection + silence skipping.[^cpp-issue-3744]
- **Language detection failures on short utterances** — the auto-detect first-sample probe can lock onto the wrong language for the rest of the file. Always pass `--language` if you know it.
- **`large-v3-turbo` is worse than `large-v3` on music, on sung content, and on heavy code-switching** because the decoder is shallower.[^turbo-music]
- **Memory on very long files** stays _flat_ (whisper.cpp uses a deterministic memory pool) — this is actually a _strength_ vs faster-whisper on long lectures. The flip side is the CPU cost grows linearly so a 4-hour seminar file takes 4× longer than a 1-hour one regardless of available RAM.[^promptquorum-bench]

---

## 3. `faster-whisper` and the CTranslate2 ecosystem

- **Repo:** <https://github.com/SYSTRAN/faster-whisper>
- **License (code):** **MIT** — verified, `Copyright (c) 2023 SYSTRAN`.[^fw-license-file]
- **License (model weights):** Same upstream Whisper — MIT / Apache-2.0.[^lic-largev3]
- **License (CTranslate2 runtime):** MIT.[^ct2-license]
- **AGPL-compatibility verdict:** **Compatible** (MIT all the way down).
- **Repo signals (2026-05-23):** 23,099 ★, latest release `faster-whisper 1.2.1` (2025-10-31), last push 2025-11-19. Active, somewhat slower cadence than whisper.cpp.[^fw-repo-api]

### What it is

A Python re-implementation of Whisper inference on top of **CTranslate2** (OpenNMT's optimized C++ transformer inference engine, originally built for translation).[^fw-readme] Same model weights as upstream, faster pipeline.

### Speed claims and how they hold up

- "Up to **4× faster than `openai/whisper`** for the same accuracy while using less memory."[^fw-readme]
- INT8 quantization on CPU and GPU: e.g., `large-v3` drops from 4.7 GB → 2.9 GB VRAM with no measurable WER change.[^fw-readme]
- `BatchedInferencePipeline` (1.1+) — up to **12.5× speedup** over sequential at `batch_size=16`, useful for re-transcribing a backlog of lectures.[^fw-batched]
- Built-in **Silero VAD** filter for silence removal — eliminates a meaningful source of `large-v3` hallucination.[^fw-readme]
- Built-in **word-level timestamps** via `word_timestamps=True`.[^fw-readme]
- Works with **distil-whisper** checkpoints (`distil-large-v3`, etc.) for further speedup.[^fw-readme]

### CPU vs GPU vs whisper.cpp

| Hardware               | Engine              | `large-v3` realtime factor |
| ---------------------- | ------------------- | -------------------------- |
| NVIDIA RTX (CUDA)      | faster-whisper FP16 | ~5–10× RT                  |
| Apple Silicon M-series | whisper.cpp Metal   | ~10× RT                    |
| Intel x86_64 CPU only  | faster-whisper INT8 | ~1.5–3× RT                 |
| Intel x86_64 CPU only  | whisper.cpp INT8    | ~0.7–1.5× RT               |
| Apple Silicon CPU only | faster-whisper INT8 | ~2–3× RT                   |

On pure-CPU x86, faster-whisper has the edge (Intel oneMKL/oneDNN). On Apple Silicon, whisper.cpp + Metal pulls ahead. On NVIDIA discrete GPUs, faster-whisper wins.[^promptquorum-bench]

### The Python implication

faster-whisper requires a Python sidecar. **For this project that's a re-use, not a new runtime** — we are already shipping a Python sidecar for Docling + MarkItDown ingestion (see [`markitdown.md`](./markitdown.md)). Adding `faster-whisper` + `ctranslate2` to that sidecar's environment is a marginal disk cost (~300 MB Python wheels + the model) rather than a new architecture. Reuse the same `uv`-managed venv, the same IPC channel, the same crash-supervision logic.

### WhisperX — `m-bain/WhisperX`

- **Repo:** <https://github.com/m-bain/WhisperX>
- **License (code):** **BSD-2-Clause** — verified, `Copyright (c) 2024, Max Bain`.[^wx-license-file]
- **AGPL-compatibility verdict:** **Compatible** (BSD-2 is permissive, OSI-approved).
- **Repo signals (2026-05-23):** 22,053 ★, latest release `v3.8.5` (2026-04-01), actively maintained.[^wx-repo-api]

WhisperX wraps `faster-whisper` and adds:

- **Forced alignment** to a phoneme model (wav2vec2-CTC) to give word-level timestamps that are _much_ more accurate than Whisper's native cross-attention DTW (median error ~20 ms vs ~100–200 ms).
- **Speaker diarization** via `pyannote-audio` (see §9 below for the license-gating issue).
- **Batched whisper** before SYSTRAN's BatchedInferencePipeline landed upstream.

**Catch:** the diarization path requires accepting Hugging Face terms on the `pyannote/speaker-diarization-3.1` and `pyannote/segmentation-3.0` model cards and using an HF auth token at runtime — this is a _user-side_ requirement we cannot fulfil on their behalf as a redistributor.[^pyannote-gate] Bundling the pyannote weights inside our app installer is **not permitted** by the gate even though the underlying license is MIT.

---

## 4. Distil-Whisper — `huggingface/distil-whisper`

- **Repo:** <https://github.com/huggingface/distil-whisper>
- **License (code):** **MIT** — verified, `Copyright 2023 The OpenAI Authors and The HuggingFace Inc. team`.[^distil-license-file]
- **License (model weights):** **MIT** — inherited from upstream Whisper per the `distil-large-v3` model card.[^distil-card]
- **AGPL-compatibility verdict:** **Compatible** for both.
- **Repo signals (2026-05-23):** 4,081 ★, no GitHub release (model releases are on HF), last push 2025-01-08 — **code repo is mostly inactive** but the _models_ on HF continue to receive minor updates.[^distil-repo-api]

### What it is

A _knowledge-distilled_ family of Whisper variants — Hugging Face trained smaller "student" decoders on `openai/whisper-large-v3`'s pseudo-labels.[^distil-paper]

### Variants

| Model                         | Params | Use case                                           | Long-form WER vs upstream                                             |
| ----------------------------- | ------ | -------------------------------------------------- | --------------------------------------------------------------------- |
| `distil-large-v3`             | 756 M  | English long-form (drop-in `large-v3` replacement) | 9.7% vs 8.4% short, 10.8% vs 10.0% long-form sequential[^distil-card] |
| `distil-large-v3.5` (2025-03) | 756 M  | English, optimized for popular Whisper libraries   | small further improvement[^distil-card]                               |
| `distil-medium.en`            | ~395 M | Smaller-footprint English                          | trades accuracy for size                                              |
| `distil-small.en`             | ~166 M | Very small                                         | trades accuracy for size                                              |

`distil-large-v3` is **51% smaller than `large-v3` and ~6.3× faster on long-form**.[^distil-card] **English only**. Multilingual distilled checkpoints exist as **community efforts** (e.g., `bofenghuang/whisper-large-v3-distil-multi7-v0.2` covering 7 European languages) but are not maintained by HF.[^distil-multi]

> For a multilingual-leaning student/academic app, the official `large-v3-turbo` from OpenAI is the better drop-in than `distil-large-v3`, because Turbo retains the 99-language coverage while still being ~6× faster.

---

## 5. Other Whisper variants worth knowing

### `Const-me/Whisper` — Windows DirectCompute

- **Repo:** <https://github.com/Const-me/Whisper>
- **License:** **MPL-2.0** — verified.[^constme-repo-api]
- **AGPL-compatibility:** **Compatible** (MPL-2.0 is file-level copyleft, AGPL-compatible per the FSF compatibility matrix).
- **Status:** 10,420 ★ but **last release was July 2023** and last commit August 2024 — **stale**.[^constme-repo-api] Worth mentioning historically for Windows GPU users on older hardware; superseded for new projects by whisper.cpp's Vulkan backend.

### `whisper-jax` — JAX/TPU

- **Repo:** <https://github.com/sanchit-gandhi/whisper-jax>
- **License:** Apache-2.0.
- **Use case:** server-side batch processing on TPUs (70× speedup on TPU v4-8 vs PyTorch CPU). **Not relevant** to a laptop-targeted notebook app.[^jax-readme]

### `whisper-turbo` (FL33TW00D) — Rust/WebGPU in-browser

- **Repo:** <https://github.com/FL33TW00D/whisper-turbo>
- **Status:** Innovative but small/experimental; superseded in practice by Hugging Face's `transformers.js` Whisper + WebGPU pipeline (Xenova) which has a larger maintenance footprint.[^xeno-whisper] WebGPU coverage is still uneven (works in Chromium-based browsers on Windows/macOS; Linux flaky; Safari only via experimental flag).

### `CrisperWhisper` (nyrahealth)

A community fine-tune optimised for _verbatim_ transcription with much tighter timestamp boundaries; useful if filler words, repetitions, and disfluencies matter (e.g., for linguistic study). Apache-2.0 weights.[^crisper-card] **Out of scope for v1** but worth flagging.

### `whisper-timestamped` (linto-ai)

Adds word-level timestamps and per-word confidence on top of openai/whisper without leaving Python. AGPL-3.0 license on the code itself — **AGPL-compatible** (same-license) but propagates AGPL obligations if used.[^wt-repo] Mention but prefer `faster-whisper`'s built-in `word_timestamps` for the same feature with a permissive license.

---

## 6. Non-Whisper alternatives

### NVIDIA Parakeet / Canary

- **Model cards:** [`nvidia/parakeet-tdt-0.6b-v2`](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2) (English), [`nvidia/parakeet-tdt-0.6b-v3`](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) (25 European languages), `nvidia/parakeet-tdt-1.1b` (older, English), `nvidia/canary-1b`, `nvidia/canary-qwen-2.5b`.
- **License (model weights):** **CC-BY-4.0**, explicitly: _"License to use this model is covered by the CC-BY-4.0. By downloading the public and release version of the model, you accept the terms and conditions of the CC-BY-4.0 license."_[^parakeet-card][^parakeet-v2-card]
- **AGPL-compatibility verdict:** **Compatible with caveats.** CC-BY-4.0 allows commercial use and redistribution; the _attribution_ requirement (Section 3(a)) must be satisfied — i.e., we must include NVIDIA's model attribution in our distribution. CC-BY-4.0 is **not** an OSI-approved software license, and the [SPDX/FSF positions](https://www.gnu.org/licenses/license-list.html#ccby) flag CC licenses as not ideal for _software_ but acceptable for _data/models_. For _weights_ (which behave more like data than software), CC-BY-4.0 is generally treated as compatible with AGPL-3.0 distribution as long as attribution is preserved. **Lower-risk than a gated model** (pyannote), **higher-friction than MIT/Apache** (Whisper).

### Why Parakeet is interesting

- **Top of the [Hugging Face Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard)** through 2025 — Canary-Qwen-2.5B at **5.63% average WER**, Parakeet-TDT-0.6B-v2 at **6.05%** while running at **RTFx 3386** (i.e., processes ~1 hour of audio per second on a single GPU at batch 128).[^huggingface-asr-leaderboard][^next-level-asr]
- **English-only v2 is more accurate than Whisper-large-v3** (8.4% WER) and _vastly_ faster.
- **v3** adds 25 European languages, at a small English regression.
- **Already ONNX-exported in the sherpa-onnx model zoo:** [`sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8`](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models).[^sherpa-parakeet]
- **Native CPU performance:** Handy's release notes report ~5× real-time on a mid-range Intel i5 for Parakeet V3 with no GPU.[^handy]
- **Long files in a single pass:** up to 24 minutes of audio in one inference — Whisper is stuck at 30-second windows.[^parakeet-v2-card]

### Why Parakeet is not (yet) a v1 default

- **Streaming story is weaker than Whisper's** — Parakeet is a transducer (TDT) model that _can_ be run streamingly, but the canonical inference paths (NeMo / ONNX) assume batch.
- **Multilingual coverage is narrower** — 25 European languages on v3 vs 99 on Whisper.
- **CC-BY-4.0 attribution requirement** adds a small downstream-redistribution chore (a credits screen entry).
- **NeMo runtime is heavyweight** if we go through NVIDIA's first-party stack; the ONNX-via-sherpa path is the only sane one for a desktop app.

### Vosk — `alphacep/vosk-api`

- **Repo:** <https://github.com/alphacep/vosk-api>
- **License (code):** **Apache-2.0** — verified directly against `COPYING`.[^vosk-license-file]
- **License (models):** Mostly **Apache-2.0**, but **some Vosk models are Apache-2.0 with a commercial-use restriction in the Vosk Hub** (e.g., gigaspeech variants) — must be checked per-model.
- **AGPL-compatibility verdict:** **Compatible** (Apache-2.0 code + most models). Some larger acoustic models are gated/restricted; check before bundling.
- **Repo signals (2026-05-23):** 14,764 ★, latest release `v0.3.50` (2024-04-22), last push 2026-02-22. Still maintained but cadence has slowed.[^vosk-repo-api]

Kaldi-derived, lightweight, **natively streaming**, runs comfortably on a Raspberry Pi or smartphone. English model sizes range from **40 MB `small` (WER ~9.85% LibriSpeech test-clean) to 2.3 GB `gigaspeech` (WER 5.64%)**.[^vosk-models] Native Node, Python, C#, Java, Go, Swift, Kotlin bindings.

**For our use case:** Vosk loses badly to Whisper on accented English, on technical/STEM vocabulary, and on noisy lecture-hall recordings — the WER gap is 3–5× in difficult conditions.[^vosk-vs-whisper] It's the right choice for _low-latency dictation on a 5-year-old laptop_ or for _captioning live where Whisper's 1-second window is too laggy_; not the right v1 default for a STEM-leaning note-taker.

### Coqui STT

- **Repo:** <https://github.com/coqui-ai/STT>
- **Status:** **Effectively dead.** Last release `v1.4.0` was September 2022; the Coqui company shut down in late 2023; the STT repo (separate from the TTS repo which the Idiap Research Institute forked) has no active maintenance.[^coqui-status][^coqui-dead]
- **AGPL-compatibility:** MPL-2.0, would be compatible if active. **Skip.**

### Mozilla DeepSpeech

- **Repo:** <https://github.com/mozilla/DeepSpeech>
- **Status:** **Officially archived by Mozilla in 2021**, `isArchived: true` on the GitHub repo.[^deepspeech-archived] Last release `0.9.3` in December 2020. **Historical reference only.**
- **AGPL-compatibility:** MPL-2.0, moot.

### NVIDIA NeMo

- **Repo:** <https://github.com/NVIDIA-NeMo/NeMo>
- **License (code):** Apache-2.0.[^nemo-license-file]
- **AGPL-compatibility:** **Compatible.**
- **Repo signals:** 17,253 ★, active.[^nemo-repo-api]

The full NVIDIA training+inference toolkit. Heavy (gigabytes of Python deps including PyTorch + CUDA), server-leaning, designed for fine-tuning and large-scale deployment. **Not appropriate as a desktop runtime** — but it's the upstream provenance for Parakeet and Canary weights, and is how Handy and other apps generate the ONNX exports we'd ship.

### sherpa-onnx — `k2-fsa/sherpa-onnx`

- **Repo:** <https://github.com/k2-fsa/sherpa-onnx>
- **License (code):** **Apache-2.0** — verified.[^sherpa-license-file]
- **AGPL-compatibility:** **Compatible.**
- **Repo signals (2026-05-23):** 12,423 ★, latest release `v1.13.2` (2026-05-13), last push 2026-05-20. **Very active**, frequent releases.[^sherpa-repo-api]
- **npm:** [`sherpa-onnx@1.13.2`](https://www.npmjs.com/package/sherpa-onnx), published 2026-05-13.[^npm-sherpa]

This is genuinely interesting for our use case and probably the most underrated option. Sherpa-onnx is a thin, statically-linked ONNX Runtime wrapper around the _next-gen Kaldi_ (`k2`) family of models, with first-party support for:

- **Streaming Zipformer (RNN-T)** for true low-latency captioning;
- **Whisper** in non-streaming mode;
- **Parakeet TDT** (CPU INT8 builds available pre-packaged);
- **SenseVoice** (multilingual, dialect-aware Asian languages);
- **Moonshine** (see below);
- **Paraformer** (Chinese);
- **Silero VAD** integration;
- **Speaker diarization** (Pyannote/3D-Speaker-based, all running through ONNX).

Bindings for **12 languages including Node.js**, with **prebuilt binaries on npm**.[^sherpa-readme] First-party WebAssembly build. Runs on every platform that has ONNX Runtime — Windows/macOS/Linux x86_64 + ARM, Android, iOS, Raspberry Pi.

The big draw is **one runtime that gives us Whisper today + Parakeet tomorrow + diarization later** without re-architecting the sidecar each time we change models. For a project that wants optionality, sherpa-onnx is the most forward-looking foundation.

### Moonshine — `moonshine-ai/moonshine`

- **Repo:** <https://github.com/moonshine-ai/moonshine>
- **License (code):** **MIT.**
- **License (model weights):** **MIT for English models. "Moonshine Community License" (non-commercial) for non-English models.**[^moonshine-license-file] **Important read-the-license-twice case.**
- **AGPL-compatibility verdict:** **Compatible for English; INCOMPATIBLE for non-English models** — the non-commercial Moonshine Community License is _not_ AGPL-compatible because AGPL §7 forbids further restrictions, and "non-commercial" is exactly such a restriction.
- **Repo signals (2026-05-23):** 8,223 ★, latest release `v0.0.59` (2026-04-20). Active.[^moonshine-repo-api]

### Why Moonshine is interesting for dictation

- **Tiny** (Tiny: 27M params, Base: 61M params) — fits in tens of megabytes after quantization.
- **Optimized for short utterances** — unlike Whisper which fixed-pads to 30 s, Moonshine processes audio in proportion to its actual length, so a 2-second dictation command transcribes in ~50 ms.[^moonshine-arxiv]
- **Generally as accurate as `whisper-small.en` and faster than `whisper-tiny.en`** on the Open ASR Leaderboard.[^moonshine-arxiv]

### Why Moonshine is bad for lecture transcription

- **Performance regresses on very short clips under 1 second** (training set under-represented those — ~0.5% of training data).[^moonshine-short]
- **English-only that is AGPL-compatible** (other languages are non-commercial and therefore unshippable for us).
- Not built for long-form: chunking long files defeats the latency advantage.

**Fit:** **Excellent secondary model for the dictation-mode path; not for lecture mode.** Whisper-medium / Parakeet for lectures, Moonshine Tiny/Base for "press shortcut, say a word, paste it" dictation, both shipped from the same sherpa-onnx runtime, gets us the best of both at ~150 MB total weight footprint.

### Cloud STT — opt-in backup only

Always **opt-in**, never default. Documented here for the moments where the user explicitly says "I'm OK with this audio leaving the device because I need the best possible accuracy on this important lecture."

| Provider               | Best feature for us                                                                                             | Privacy posture                                                                                             | Pricing (May 2026, public)       | On-prem option?                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| **AssemblyAI**         | Best diarization + speaker labels; "Universal-2" multilingual model; LeMUR for post-processing; topic/sentiment | SOC 2 Type 1+2, ISO 27001; BAA at enterprise tier only.[^aai-deepgram-compare]                              | ~$0.12–0.37/hr depending on tier | Yes, enterprise VPC/on-prem; no public air-gap.                                                   |
| **Deepgram**           | Lowest latency; best WER on phone-quality audio; Nova-3 with custom vocab API                                   | SOC 2 Type II; HIPAA + BAA via enterprise; SOC 2, GDPR, CCPA, PCI.[^deepgram-privacy]                       | ~$0.04–0.43/hr (Nova-3)          | Yes — Docker/Podman/K8s self-host; License Proxy for single egress.                               |
| **Speechmatics**       | Strongest accuracy on accented English (UK origin); best public air-gap story                                   | ISO 27001:2022, SOC 2 Type II, HIPAA-stated.[^aai-speechmatics-compare]                                     | ~$0.10–0.30/hr                   | **Yes — full on-premise + edge supported**, the strongest of the three for air-gapped deployment. |
| **OpenAI Whisper API** | Cheap, well-known                                                                                               | OpenAI Data Privacy applies (no training on API data, 30-day retention by default).[^openai-privacy-policy] | $0.006/min ≈ $0.36/hr            | No.                                                                                               |

**Recommended cloud-backup provider for this project:** **Deepgram or Speechmatics**, picked at runtime by the user. Deepgram for accuracy + latency + BYOK enterprise SSO; Speechmatics for the air-gap option which matters most to institutional/research customers. AssemblyAI's diarization is best-in-class but the privacy posture is less institutional-friendly.

### OS-native STT

| OS          | API                                     | On-device?                                                                                                                                                                                 | Useful for us?                                                                     |
| ----------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **macOS**   | `SFSpeechRecognizer` (Speech framework) | **On-device since macOS 10.15 Catalina** if `supportsOnDeviceRecognition == true` (true on Apple Silicon; varies on Intel by locale). **Less accurate than cloud variant.**[^sfspeech-rod] | Marginal — quality is below Whisper-small. Useful only as a zero-install fallback. |
| **Windows** | `Windows.Media.SpeechRecognition` (UWP) | **No usable offline free-form dictation.** Local grammar-constrained recognition works offline; free-form dictation requires cloud ("Online Speech Recognition" toggle).[^win-srec]        | Not useful for our use case.                                                       |
| **Linux**   | None standard.                          | —                                                                                                                                                                                          | Not applicable.                                                                    |

**Verdict:** OS-native STT is **not a viable cross-platform baseline**. Use only on macOS as an opportunistic fallback if Whisper isn't installed yet.

### Web Speech API (`SpeechRecognition`) — the privacy footgun

The browser API `window.SpeechRecognition` / `webkitSpeechRecognition`:

- On Chrome/Chromium (the rendering engine inside Electron): **historically streamed audio to Google's cloud servers** with no clear user disclosure beyond the mic permission prompt.[^webspeech-privacy]
- Chrome 139 (August 2025) added an opt-in `processLocally` flag that _can_ run on-device — **but it's opt-in, the page must request it explicitly, and support is "best effort"**.[^chrome139-onbeing-device] If the device doesn't support it, Chrome silently falls back to the cloud path.
- On Safari, the spec/implementation calls Apple's cloud (not on-device).
- On Firefox, the API is gated behind a pref and largely non-functional in 2026.

**Do not use Web Speech API as a "local" recognition path** in an offline-first / FERPA-conscious app. Even with `processLocally: true`, the silent-fallback behavior makes it impossible to _guarantee_ the audio stays on the device. Document this prominently in the app's privacy page; ensure the in-app dictation never routes through `SpeechRecognition` regardless of how convenient it would be.

---

## 7. Real-time / streaming considerations

### Voice Activity Detection (VAD)

| VAD                                      | License                   | Verdict        | Notes                                                                                                                                      |
| ---------------------------------------- | ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Silero VAD** (`snakers4/silero-vad`)   | MIT[^silero-license-file] | **Compatible** | The de-facto choice. ONNX model ~few MB. Used by faster-whisper, sherpa-onnx, Handy. Latest `v6.2.1` 2026-02-24, active.[^silero-repo-api] |
| **WebRTC VAD**                           | BSD-3                     | Compatible     | Old, lightweight, more false positives than Silero. Sufficient for "strip silence before sending to Whisper".                              |
| **`vad-rs`**                             | MIT (Rust port of Silero) | Compatible     | Used by Handy. Pure Rust, no Python. Good if your sidecar is Rust.                                                                         |
| **`ricky0123/vad-web`**                  | ISC[^vadweb-license]      | Compatible     | Silero VAD packaged for the browser/Node. Useful in the renderer.                                                                          |
| **faster-whisper built-in `vad_filter`** | MIT                       | Compatible     | Just Silero with batteries included; no extra integration.                                                                                 |

**Recommendation:** **Silero VAD** via faster-whisper's `vad_filter=True` for the Python sidecar path, or via sherpa-onnx's first-party Silero integration for the sherpa path. There's no good reason to roll your own.

### Partial-transcript UX

There are two patterns; both are accessible if implemented correctly:

1. **Append-only.** The transcript grows monotonically; new words appear at the end and never change. This is what users expect from a typewriter / dictation tool. Models that natively support this are streaming transducers (Zipformer RNN-T, Parakeet TDT, Vosk). For users with cognitive disabilities, this is the friendlier mode — text doesn't shift under their gaze.
2. **Revising chunks.** A 30 s sliding-window decoder (Whisper) emits a tentative segment that may be rewritten when the next window completes. Reads as "watch the cursor scrub left and rewrite the last few words". For users with vestibular sensitivity or ADHD, this can be distressing. **WCAG-friendly mitigation:** render the not-yet-stable tail in a visually distinct style (dimmed, italic, with `aria-live="polite"`) and only commit to the main transcript on segment finalization.

### Caption latency targets

WCAG 2.1 success criterion **1.2.4 Captions (Live)** (Level AA) requires captions for live media, and the WAI guidance explicitly says **auto-generated captions are not by themselves sufficient** for prerecorded content (SC 1.2.2): "Captions are provided for all prerecorded audio content in synchronized media."[^wcag-captions-aelira] For live, no fixed accuracy threshold is mandated, but the working consensus from accessibility consultants is **≥95% accuracy as a floor and ~99% as the human-captioning industry baseline**.[^level-access]

**Practical implication for our app:** when we present live transcripts as captions, we **must** prominently label them as auto-generated, **must** allow the user to flag corrections in-line (which then feed back into the post-recording high-accuracy rerun), and **must not** claim WCAG 1.2.4 compliance from auto-captions alone. Live captions in this app are a _cognitive accessibility aid_, not a _deaf/hard-of-hearing accommodation_.

### Pre-roll buffering

The "I just realized I should be recording" pattern: keep a rolling 30–60 s audio ring buffer in memory at all times when the recording UI is open but not yet armed; when the user hits "Record", prepend the buffer to the captured stream. Costs roughly **2 MB at 16 kHz mono PCM per minute** of buffer. Worth doing — pre-roll is one of the highest-ROI affordances for ADHD users.

---

## 8. Speaker diarization

### `pyannote-audio`

- **Repo:** <https://github.com/pyannote/pyannote-audio>
- **License (code):** **MIT** — verified.[^pyannote-license-file]
- **License (models):** MIT _but gated_ — `pyannote/speaker-diarization-3.1` and its dependency `pyannote/segmentation-3.0` both require accepting Hugging Face terms and using an HF auth token at download time.[^pyannote-gate]
- **AGPL-compatibility verdict (code):** Compatible.
- **AGPL-compatibility verdict (model redistribution):** **Conditional and effectively no** — the HF gating mechanism prevents us from bundling the weights in our installer. End users must accept the terms themselves and supply an HF token, which is a real onboarding friction wall.
- **Repo signals (2026-05-23):** 9,977 ★, latest release `4.0.4` (2026-02-07), active.[^pyannote-repo-api]

**Quality:** state of the art for on-CPU diarization in 2026; on GPU it's effectively real-time.

**CPU reality:** pyannote 3.1 runs at roughly **3× real-time on CPU** for the segmentation + embedding pipeline (`~50 s for 1 hour of audio` on a recent Intel core during the embedding step, but the clustering step is sequential).[^pyannote-cpu] An optimised pipeline using Silero VAD + WeSpeaker embeddings + GMM+spectral clustering can do **~1.5 min for a 90-minute file on CPU** — a meaningful CPU-only option, at slightly lower DER.[^pyannote-cpu-alt]

### NeMo speaker diarization

NVIDIA's `nvidia.collections.asr` diarization stack — top WER+DER numbers but **NeMo runtime is too heavy for a desktop sidecar**.

### sherpa-onnx diarization

3D-Speaker / Pyannote-derived models exported to ONNX, runnable through the sherpa-onnx runtime with first-party Node bindings. **This is the only diarization path that doesn't require an HF auth token at user runtime.** Quality is below pyannote's top tier but acceptable.[^sherpa-readme]

### Honest 2026 verdict on diarization for v1

Diarization on CPU in 2026 **works** but is **not free**: 3–10% additional CPU cost per minute of audio, plus the model-gating friction (if pyannote) or the lower-quality ceiling (if sherpa-onnx ONNX models). For a v1 college-student app, **defer diarization to v1.x or v2** unless we ship the sherpa-onnx-ONNX path opportunistically. The 80/20 win is to surface a single "[speaker change here]" hint based on a simpler change-point detector, and label the speakers only after the recording is finished and the user manually tags the lecturer once.

---

## 9. Word-level timestamps for audio-linked notes

The use case: a student selects text in a transcript and is taken to that exact moment in the original audio. Cheap if alignment is segment-level (`{start: 17.4s, end: 21.2s, text: "..."}`); expensive if word-level (`{words: [{w: "the", t: 17.42}, {w: "professor", t: 17.51}, ...]}`).

| Engine                                  | Mechanism                                      | Boundary error (median) | CPU overhead                    |
| --------------------------------------- | ---------------------------------------------- | ----------------------- | ------------------------------- |
| `whisper.cpp` `--dtw`                   | DTW on cross-attention[^dtw-paper]             | ~50–100 ms              | ~+10%[^dtw-overhead]            |
| `faster-whisper` `word_timestamps=True` | Same DTW, integrated                           | ~50–100 ms              | ~+5–15%                         |
| WhisperX                                | Forced alignment to wav2vec2-CTC phoneme model | **~20 ms**              | ~+30–50% (loads a second model) |
| `whisper-timestamped`                   | Cross-attention + per-word confidence          | ~50–100 ms              | ~+15% (AGPL — see §5)           |

**Design implication:** if word-level alignment is too expensive at live time, **commit to segment-level for the live path and run a word-level re-alignment pass after recording stops** as a background job. This naturally complements the "re-transcribe at higher accuracy after the lecture ends" pattern.

For v1: ship segment-level alignment (5–30 s windows, every Whisper segment). For v1.1, add word-level via WhisperX's wav2vec2 forced alignment as part of the post-recording rerun. The combination gives the precision when it matters (clicking a specific word) without paying the alignment cost during live capture.

---

## 10. Sidecar architecture options for Electron / Tauri

We are an **Electron or Tauri** app with **a Python sidecar already required** for Docling + MarkItDown ingestion.

### Option A — Spawn whisper.cpp CLI as a sidecar binary

- **Distribution:** ship `whisper-cli` + `whisper-server` binaries cross-built per platform under `resources/bin/whisper-cli-<target-triple>`.
- **Process model:** start `whisper-server` once at app launch; it listens on `127.0.0.1:9000`; renderer/main process POSTs WAV chunks and receives JSON/SSE.[^whisper-server]
- **Pros:** zero new languages, very low per-invocation overhead after warm-up, official upstream artifact.
- **Cons:** must cross-compile binaries (or use prebuilt releases); model download is your responsibility; streaming partials require SSE handling on the JS side.

### Option B — Reuse the existing Python sidecar for `faster-whisper`

- **Distribution:** add `faster-whisper`, `ctranslate2`, `silero-vad` to the same `uv`-managed venv as Docling/MarkItDown. Net add ~400 MB (CT2 + faster-whisper wheels + Silero).
- **Process model:** the Python sidecar exposes a transcription endpoint over the same IPC channel it uses for ingestion. The renderer streams 16 kHz mono PCM and gets back word/segment JSON.
- **Pros:** **one fewer runtime**; reuse the existing crash supervisor; faster-whisper has the best CPU performance on x86; built-in VAD, batching, and word timestamps; the same sidecar can do diarization later.
- **Cons:** Python sidecar startup cost (~2–4 s cold); slightly worse Apple Silicon performance than whisper.cpp + Metal; CTranslate2 doesn't ship a Metal backend.

### Option C — WASM in the renderer (`whisper.wasm`, `transformers.js`)

- **Distribution:** bundle the WASM artifact and ONNX/GGML model into the renderer.
- **Process model:** Web Worker runs inference, posts results to main thread.[^transformers-js]
- **Pros:** no native binary cross-compilation; the renderer is the only process; works offline immediately.
- **Cons:** WASM is **5–10× slower than native** for ASR;[^transformers-js] bundle size balloons (~50–150 MB for the WASM runtime + model in the installer); WebGPU acceleration is available in Chromium only, doesn't help on Linux Electron reliably, and falls back to WASM CPU otherwise. The "Real-time Whisper WebGPU" demos work but only on a desktop GPU.

### Option D — Sherpa-onnx via Node bindings

- **Distribution:** `npm i sherpa-onnx` (Apache-2.0, prebuilt binaries for all desktop platforms).[^npm-sherpa]
- **Process model:** load the model inside the Electron main process or a dedicated Node worker; stream PCM in, get text out via callbacks.
- **Pros:** **one runtime that covers Whisper + Parakeet + Zipformer + diarization + VAD**; first-party Node API; prebuilt; small footprint; supports both streaming and non-streaming.
- **Cons:** smaller community than whisper.cpp; harder to debug when something goes wrong; some models still require manual conversion to ONNX.

### Recommendation for _this_ project

**Lowest-friction sidecar pattern given our context: Option B (reuse Python sidecar with faster-whisper) as the v1 default, with Option D (sherpa-onnx in Node) as the v1.x replacement once we want a unified streaming + Parakeet path.**

Rationale: we're already paying the Python-sidecar cost. Adding faster-whisper there is a 1-day integration, not a multi-week one. The downside (slightly worse Apple Silicon perf vs whisper.cpp) is real but not catastrophic — most modern M-series Macs still hit real-time with faster-whisper on CPU. When the project matures to wanting (a) lower bundle size, (b) Parakeet for English speed, (c) Zipformer streaming for ADHD-friendly captions, the migration to sherpa-onnx is a swap-the-engine change, not a re-architecture: the same audio pipeline and transcript model carry over.

> If we were greenfield with **no existing Python sidecar**, Option D (sherpa-onnx) would be the v1 default and Option B would not be on the table — adding Python just for ASR is too much for what it gives you in 2026.

---

## 11. Recommended stack

### v1 default — CPU, local, dictation + lecture

- **Engine:** **faster-whisper** running inside the existing Python sidecar (see §10 Option B).
- **Model (lecture, long-form):** **`distil-large-v3` for English** / **`large-v3-turbo` for multilingual**, INT8-quantized via CTranslate2. ~750 MB on disk for the Distil path, ~810 MB for Turbo. Both real-time on a 2022+ Intel U-series or Apple Silicon CPU.
- **Model (dictation, low-latency):** **`small` or `base`** in INT8 — ~250 / 75 MB; produces partial transcripts every ~200 ms with negligible CPU.
- **VAD:** **Silero VAD** via `faster_whisper.WhisperModel(..., vad_filter=True)`. Eliminates `large-v3` silence-hallucination; cuts CPU cost by 30–60% on classroom recordings with long quiet stretches.[^memo-hallu]
- **Streaming:** `BatchedInferencePipeline` with a 5–10 s sliding window; render the not-yet-stable trailing segment in a visually distinct style with `aria-live="polite"`; commit on segment finalization.
- **Word-level timestamps (live):** off; segment timestamps only.
- **Word-level timestamps (post-recording):** on, via `word_timestamps=True`, run as a background re-pass.

### v1.1 additions

- **WhisperX wav2vec2 forced-alignment** for ~20 ms word-boundary accuracy, only on the post-recording rerun (not in the live path). Audio-linked notes become precise.
- **Pre-roll buffer** (30–60 s rolling) for "I should have been recording" moments.
- **Custom-vocabulary `initial_prompt`** populated from the user's course names, professor names, and recent technical terms — 40–60% WER reduction on domain-specific vocab.[^prompt-stem]

### GPU-accelerated path (when present)

- **On NVIDIA:** faster-whisper switches to CUDA + cuDNN automatically; pull in `nvidia-cudnn-cu12`. `large-v3-turbo` runs at 10–30× real-time, opening up live word-level timestamps and live diarization.
- **On Apple Silicon (Metal):** Python sidecar path can't use Metal directly (no CT2 Metal backend). Either (a) accept the CPU performance and trust the M-series chip is fast enough (it is for everything except `large-v3`), or (b) ship whisper.cpp as a _secondary_ CLI sidecar invoked only on macOS when the user opts into "use Metal acceleration". A reasonable v1.1 upgrade.

### Cloud opt-in backup

- **First-class provider:** **Deepgram Nova-3** for accuracy + latency + BYOK enterprise; secondary **Speechmatics** when air-gap / on-prem / institutional procurement matters.
- **Always opt-in**, always with a clearly-labeled "this will leave your device" banner, always with a per-recording toggle (not a global default).
- **No retention enforced** at the provider level: Deepgram supports an HTTP header to disable storage of submitted audio; Speechmatics' batch API has a similar parameter.

### Why these choices for an accessibility-first, ADHD/autism-focused, AGPL note-taker

- **Caption latency** is sub-2 seconds on a real-time-capable model; ADHD users get the immediate-feedback loop they need for "verbal idea → captured note" without losing track of the thought.
- **STEM accuracy** is dramatically improved by the `initial_prompt` custom-vocabulary path; we can teach Whisper "this is a physics 101 lecture, terms include `eigenvector`, `Hamiltonian`, `Schrödinger`".
- **Local by default** keeps FERPA exposure to zero for the audio path; institutional adoption is unblocked.
- **AGPL compatibility** is clean across the entire recommended stack: faster-whisper (MIT), CTranslate2 (MIT), Whisper weights (MIT/Apache-2.0), Distil-Whisper (MIT), Silero (MIT), WhisperX (BSD-2). Cloud providers are opt-in and don't bind us to their licenses.
- **No model gating** (we avoid the pyannote weights for v1, deferring diarization or using sherpa-onnx instead).
- **Re-transcription pattern** matches the lecture workflow: rough captions during, precise word-aligned transcript after — this is how human-stenographer-augmented captioning works too.

---

## 12. Things to know / gotchas

### Long-audio failure modes

- **Memory:** faster-whisper holds the full encoded mel in RAM by default — a 4-hour lecture is ~8 GB at FP16. Mitigation: process in 30-minute logical chunks with VAD-aligned boundaries, then stitch transcripts. whisper.cpp's memory profile stays flat regardless of audio length but linear CPU growth applies either way.[^promptquorum-bench]
- **Hallucination drift:** the longer the file, the more `condition_on_previous_text=True` (the default) amplifies any single hallucination across subsequent windows. **Set it to `False` for lectures longer than ~30 minutes**, accepting the small accuracy hit at chunk boundaries.[^memo-hallu]
- **Right chunk size:** 30 s logical chunks for streaming/live (the Whisper-native window); 30–60 _minute_ chunks for offline re-pass with VAD-aligned boundaries.

### Language switching mid-recording

Multilingual classrooms (a professor swapping between English and Mandarin, code-switching in a foreign-language seminar): Whisper auto-detects language per 30 s window, but the auto-detect is statistically biased toward the first detected language, and lock-in failures are common. **Mitigations:** (a) re-detect language every chunk explicitly; (b) for known-bilingual contexts, run two passes with different `--language` and pick segments by confidence; (c) use SenseVoice (via sherpa-onnx) which is purpose-built for Asian-language code-switching.

### Domain adaptation for STEM vocabulary without fine-tuning

- **`initial_prompt`** (Whisper-family) — up to **40–60% WER reduction** on technical terms.[^prompt-stem] Keep ≤224 tokens (≤500–800 chars). Auto-generate from the active note's tags, recent typed terms, the user's flashcard deck if we have one. **Easiest win in the entire stack.**
- **Custom-words dictionary** — a UI for explicit per-term substitutions, applied post-transcription.
- **Fine-tuning** is technically possible but operationally hostile for an end-user desktop app. Skip for v1.

### Model storage and first-run download UX

| Default model              | Disk         | First-run download      | When to use this default                                               |
| -------------------------- | ------------ | ----------------------- | ---------------------------------------------------------------------- |
| `tiny` 39 M FP16           | ~75 MiB      | Instant on any network  | Initial install / extremely slow connections / very old laptops        |
| `base` 74 M FP16           | ~142 MiB     | A few seconds           | Conservative default for the dictation path                            |
| `small` 244 M INT8         | ~250 MiB     | ~30 s on broadband      | Reasonable lecture default for users on a budget laptop                |
| **`distil-large-v3` INT8** | **~750 MiB** | **~2 min on broadband** | **Recommended lecture default for English speakers on a 2022+ laptop** |
| `large-v3-turbo` INT8      | ~810 MiB     | ~2 min                  | Recommended lecture default for multilingual users                     |
| `large-v3` FP16            | ~2.9 GiB     | ~10 min                 | Power-user opt-in for highest accuracy (post-recording reruns only)    |

**Recommended UX:** ship the app with **no model bundled** (keeps the installer tiny) and download `base` on first launch in the background; offer an explicit "pick your lecture-transcription model" first-run prompt with the table above and an honest "100 MB → 800 MB depending on accuracy" framing. Show download progress prominently with WCAG-compliant ARIA live region updates.

### Hardware floor

**Recommended minimum for smooth real-time live captioning at WCAG-AA-claim-supporting accuracy:**

- **CPU:** Intel 8th-gen / AMD Zen 2 / Apple M1 or newer; 4+ physical cores; AVX2 support is essential, AVX-512 is a nice bonus.
- **RAM:** 8 GB system minimum, 16 GB recommended (lets us hold `distil-large-v3` + the application + a browser tab open simultaneously).
- **Disk:** 2 GB free for models + Docling/MarkItDown + the app itself.
- **Microphone:** any built-in mic is fine for dictation; for lecture recording on a laptop placed on a desk in a 50-seat hall, signal quality dominates model quality. Recommend the user pair with an inexpensive USB lapel mic if they're capturing professor-only audio.

Below this floor: **fall back to `small` or `tiny` and document the accuracy regression.** Do not silently degrade.

### Background processing on macOS / Windows energy and battery implications

- **macOS** App Nap will throttle the renderer if the app is backgrounded. The Python sidecar will _not_ be throttled, but if it's pegging a core for a 90-minute lecture re-pass, the user's fan ramps and battery dies. Mitigation: detect `powerMonitor.isOnBatteryPower()` and prefer the post-recording rerun to only kick off when plugged in (with a user-visible toggle).
- **Windows** has similar Modern Standby implications — Electron apps that spawn long-running native processes can keep the system from entering S0ix; this is a known cause of "laptop hot in the bag" complaints. Document this clearly.
- **Linux** depends entirely on the desktop environment; less constrained than macOS/Windows.

### Library / model-weight licenses with surprising terms

1. **Parakeet — CC-BY-4.0 weights.** Compatible with AGPL distribution; **requires NVIDIA attribution preserved in our installer's credits and the about box.**[^parakeet-card]
2. **pyannote diarization weights — gated.** Code is MIT but model download requires the _end user_ to accept HF terms with an HF auth token. **We cannot pre-bundle pyannote weights in our installer.** Use sherpa-onnx's ONNX-exported diarization models instead for the no-friction path.[^pyannote-gate]
3. **Moonshine non-English weights — Moonshine Community License (non-commercial).** **AGPL-incompatible.** Only ship the English Moonshine weights; if we want non-English Moonshine support, the model has to be downloaded by the user themselves under that license, not bundled by us.[^moonshine-license-file]
4. **`whisper-timestamped` — AGPL-3.0 code.** Same license as us, _compatible_, but using it makes the AGPL obligations _extra_ sticky on the transitive dependency graph. Prefer `faster-whisper`'s built-in `word_timestamps` for the same feature under MIT.[^wt-repo]
5. **Vosk — most models Apache-2.0, but per-model check needed.** Some specialty acoustic models have additional commercial-use clauses in the Vosk model index. Bundle only the canonical Apache-2.0 English/Spanish/etc. models.
6. **OpenAI Whisper API (cloud) Terms of Use** prohibit certain content categories and require disclosure to end users about audio being sent to OpenAI. If we offer it as a cloud fallback, the disclosure language goes in the dialog where the user opts in, not buried in a privacy policy.
7. **Const-me/Whisper — MPL-2.0** (file-level copyleft). Compatible with AGPL but means modifications to those specific files must be released. Not a real concern since we wouldn't fork it anyway in 2026.

---

[^paper]: Radford et al., _Robust Speech Recognition via Large-Scale Weak Supervision_, OpenAI, 2022. <https://cdn.openai.com/papers/whisper.pdf>. Released alongside the `openai/whisper` repo.

[^openai-license-file]: `LICENSE` file at <https://github.com/openai/whisper/blob/main/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. Standard MIT License text, `Copyright (c) 2022 OpenAI`. Verified directly, not from README summary.

[^lic-largev3]: Hugging Face model card <https://huggingface.co/openai/whisper-large-v3>, `model_metadata.license: apache-2.0`. Fetched 2026-05-23.

[^openai-repo-api]: GitHub API `repos/openai/whisper`, retrieved 2026-05-23: `stargazers_count: 100275`, `pushed_at: 2026-04-15T16:32:15Z`, latest release `v20250625`.

[^whispercpp-repo]: GitHub repository <https://github.com/ggml-org/whisper.cpp>. Originally hosted at `ggerganov/whisper.cpp`; transferred to the `ggml-org` organization in 2024-2025 alongside the broader ggml/llama.cpp move.

[^whispercpp-license-file]: `LICENSE` file at <https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. Standard MIT License text, `Copyright (c) 2023-2026 The ggml authors`. Verified directly.

[^whispercpp-repo-api]: GitHub API `repos/ggml-org/whisper.cpp`, retrieved 2026-05-23: `stargazers_count: 50033`, `pushed_at: 2026-05-22T06:27:35Z`, latest release `v1.8.4` published 2026-03-19, `license: MIT`.

[^whispercpp-readme]: README at <https://github.com/ggml-org/whisper.cpp/blob/master/README.md>, fetched 2026-05-23. Sections enumerate supported backends (Metal, CUDA, Vulkan, OpenVINO, Core ML, Ascend NPU, MUSA), examples directory (whisper-stream, whisper-server, whisper.wasm, stream.wasm, command.wasm), and quantization (Q5_0).

[^stream-discussion]: openai/whisper discussion #2, "Possible to use for real-time / streaming tasks?" — confirms Whisper is fundamentally a 30 s batch processor and streaming requires external buffering.

[^apple-bench]: Multiple Apple Silicon benchmarks: <https://www.voicci.com/blog/apple-silicon-whisper-performance.html>; <https://fazm.ai/blog/whisper-cpp-metal-apple-silicon>; <https://medium.com/@dzianisv/ai-engineering-whisper-cpp-on-macbook-with-m2-pro-apple-silicon-614f45d2329e>. Numbers consistent across sources: M2 Pro hits ~21× real-time on `large-v3-turbo` with Metal+flash attention.

[^whispercpp-issue-1127]: GitHub issue/discussion <https://github.com/ggml-org/whisper.cpp/issues/1127>, "Comparison with faster-whisper" — community benchmarking thread.

[^promptquorum-bench]: <https://www.promptquorum.com/power-local-llm/local-whisper-stt-comparison-2026>, "Whisper.cpp vs faster-whisper 2026: Local STT Benchmarks". Reports faster-whisper edge on Intel CPU (oneMKL/oneDNN), whisper.cpp edge on Apple Silicon (Metal), flat memory profile for whisper.cpp on long files, linear-with-length memory for faster-whisper.

[^whispercpp-models]: `models/README.md` at <https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md>, fetched 2026-05-23. Lists tiny (75 MiB), base (142 MiB), small (466 MiB), medium (1.5 GiB), large-v1/v2/v3 (2.9 GiB), large-v3-turbo (1.5 GiB), with `-q5_0` quantized variants (e.g., `large-v3-turbo-q5_0` at 547 MiB).

[^dtw-paper]: Cao et al., _Whisper Has an Internal Word Aligner_, 2025. <https://arxiv.org/abs/2509.09987>. Identifies specific attention heads in Whisper that capture accurate word alignments and proposes character-level-filtered DTW for sub-100 ms boundary accuracy.

[^dtw-overhead]: <https://github.com/ggml-org/whisper.cpp/discussions/2307>, "Word level time stamps with Whisper 1.6.2 / DTW" — reports ~10% CPU overhead for DTW.

[^whisper-server]: `whisper-server` example documented in the whisper.cpp README; OpenAI-compatible endpoint with `--inference-path /v1/audio/transcriptions`; SSE for streaming partials via `Accept: text/event-stream`. Third-party reference: <https://github.com/pfrankov/whisper-server> (macOS menu bar wrapper).

[^whispernet-license]: `LICENSE` file at <https://github.com/sandrohanea/whisper.net/blob/main/LICENSE>, fetched 2026-05-23. Standard MIT License, `Copyright (c) 2024 sandrohanea`. Verified.

[^npm-nodejs-whisper]: npm registry metadata for `nodejs-whisper`, fetched 2026-05-23 from `https://registry.npmjs.org/nodejs-whisper`: latest `0.3.0`, published `2026-04-11T18:26:17Z`, license MIT, description "Node bindings for OpenAI's Whisper. Optimized for CPU."

[^npm-smart-whisper]: npm registry metadata for `smart-whisper`, fetched 2026-05-23: latest `0.8.1`, published `2024-10-02T12:56:02Z`, license MIT, description "Whisper.cpp Node.js binding with auto model offloading strategy."

[^npm-whisper-node]: npm registry metadata for `whisper-node`, fetched 2026-05-23: latest `1.1.1`, published `2023-11-29T20:27:28Z`, license MIT. Snyk marks `whisper-node` as Inactive in maintenance health: <https://snyk.io/advisor/npm-package/whisper-node>.

[^smart-whisper-search]: <https://github.com/Kutalia/whisper-node-addon> and forks ship cross-platform prebuilt `.node` binaries.

[^hallu-hf]: HF discussion <https://huggingface.co/openai/whisper-large-v3/discussions/19>, "Hallucination / repetition" — confirms `large-v3` regresses vs `large-v2` on silence-hallucination behavior.

[^hallu-cpp]: whisper.cpp discussion <https://github.com/ggml-org/whisper.cpp/discussions/1490>, "Large Model hallucination and repeating issue".

[^memo-hallu]: <https://memo.ac/blog/whisper-hallucinations>, "Solutions to Repeated Output Issues with Whisper". Documents the canonical mitigations: VAD pre-filtering, `condition_on_previous_text=False`, `compression_ratio_threshold=2.4`, `log_prob_threshold=-1.0`.

[^cpp-issue-3744]: whisper.cpp issue <https://github.com/ggml-org/whisper.cpp/issues/3744>, "Proposal: reduce repetition hallucinations in long-form decoding". Open PR for automatic hallucination detection + silence skipping.

[^turbo-page]: HF model card <https://huggingface.co/openai/whisper-large-v3-turbo>; <https://fazm.ai/blog/ggml-large-v3-turbo-bin>. 4-decoder-layer distillation of `large-v3` with the full 32-layer encoder; 95%+ of `large-v3` accuracy at ~6× speed.

[^turbo-music]: Cited in <https://github.com/ggml-org/whisper.cpp/discussions/3074>, "Comparing Whisper Models for Transcribing Queen's 'Don't Stop Me Now'": turbo's shallow decoder misses vocalizations and incorrect endings.

[^fw-repo]: GitHub repository <https://github.com/SYSTRAN/faster-whisper>.

[^fw-license-file]: `LICENSE` file at <https://github.com/SYSTRAN/faster-whisper/blob/master/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. Standard MIT License, `Copyright (c) 2023 SYSTRAN`. Verified directly.

[^fw-repo-api]: GitHub API `repos/SYSTRAN/faster-whisper`, retrieved 2026-05-23: `stargazers_count: 23099`, latest release `faster-whisper 1.2.1` published 2025-10-31, `pushed_at: 2025-11-19T14:40:46Z`, license MIT.

[^fw-readme]: README at <https://github.com/SYSTRAN/faster-whisper/blob/master/README.md>, fetched 2026-05-23. Lists 4× speedup over openai/whisper, INT8 quantization on CPU+GPU, BatchedInferencePipeline with up to 16× speedup at batch_size=8, built-in Silero VAD via `vad_filter=True`, word-level timestamps via `word_timestamps=True`, distil-whisper support.

[^ct2-license]: <https://github.com/OpenNMT/CTranslate2/blob/master/LICENSE> — MIT.

[^fw-batched]: <https://mobiusml.github.io/batched_whisper_blog/> and <https://modal.com/docs/examples/batched_whisper>. Up to 12.5× speedup on long-form audio at batch_size=16.

[^wx-license-file]: `LICENSE` file at <https://github.com/m-bain/whisperX/blob/main/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. BSD 2-Clause "Simplified" License, `Copyright (c) 2024, Max Bain`. Verified directly.

[^wx-repo-api]: GitHub API `repos/m-bain/whisperX`, retrieved 2026-05-23: `stargazers_count: 22053`, latest release `v3.8.5` published 2026-04-01, license BSD-2-Clause.

[^pyannote-gate]: HF model card <https://huggingface.co/pyannote/speaker-diarization-3.1>, fetched 2026-05-23: "You need to agree to share your contact information to access this model" — requires accepting user conditions for both `pyannote/speaker-diarization-3.1` AND `pyannote/segmentation-3.0`, plus an HF access token at runtime. Cited reason: "the collected contact information helps maintainers understand the user base and improve the project."

[^distil-repo]: GitHub repository <https://github.com/huggingface/distil-whisper>.

[^distil-license-file]: `LICENSE` file at <https://github.com/huggingface/distil-whisper/blob/main/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. Standard MIT License, `Copyright 2023 The OpenAI Authors and The HuggingFace Inc. team`. Verified directly.

[^distil-card]: HF model card <https://huggingface.co/distil-whisper/distil-large-v3>, fetched 2026-05-23. 756 M parameters, 6.3× faster than large-v3, within 1% WER on long-form audio, MIT license inherited from upstream Whisper. Collection variants: `-openai`, `-ggml`, `-faster-whisper`, `-transformers.js`, `-candle`.

[^distil-repo-api]: GitHub API `repos/huggingface/distil-whisper`, retrieved 2026-05-23: `stargazers_count: 4081`, `latestRelease: null`, `pushed_at: 2025-01-08T10:09:47Z`. Repo activity slowed but HF model variants continue to receive updates (distil-large-v3.5 released 2025-03-25).

[^distil-paper]: Gandhi et al., _Distil-Whisper: Robust Knowledge Distillation via Large-Scale Pseudo Labelling_, 2023. <https://arxiv.org/pdf/2311.00430>.

[^distil-multi]: Community multilingual distillations e.g. <https://huggingface.co/bofenghuang/whisper-large-v3-distil-multi7-v0.2> (7 European languages), <https://huggingface.co/bofenghuang/whisper-large-v3-distil-multi4-v0.2> (4 European languages).

[^constme-repo]: GitHub repository <https://github.com/Const-me/Whisper>.

[^constme-repo-api]: GitHub API `repos/Const-me/Whisper`, retrieved 2026-05-23: `stargazers_count: 10420`, latest release `1.12.0` (2023-07-22), `pushed_at: 2024-08-03T02:35:39Z`, license MPL-2.0.

[^jax-readme]: <https://github.com/sanchit-gandhi/whisper-jax>, README. 7× from batching × 2× from JAX × 5× from TPU ≈ 70× total. Apache-2.0.

[^xeno-whisper]: <https://huggingface.co/spaces/Xenova/realtime-whisper-webgpu>; Hugging Face's `@xenova/transformers` (now `@huggingface/transformers`) WebGPU pipeline.

[^crisper-card]: <https://huggingface.co/nyrahealth/faster_CrisperWhisper>, Apache-2.0.

[^wt-repo]: <https://github.com/linto-ai/whisper-timestamped>. AGPL-3.0 license on the code.

[^parakeet-card]: <https://huggingface.co/nvidia/parakeet-tdt-1.1b>, fetched 2026-05-23: License CC-BY-4.0. Verbatim language on the card: "License to use this model is covered by the CC-BY-4.0. By downloading the public and release version of the model, you accept the terms and conditions of the CC-BY-4.0 license."

[^parakeet-v2-card]: <https://huggingface.co/nvidia/parakeet-tdt-0.6b-v2>, fetched 2026-05-23. CC-BY-4.0; English-only; up to 24 minutes of audio in a single inference; RTFx 3386 at batch_size=128 on the HF Open ASR leaderboard.

[^huggingface-asr-leaderboard]: <https://huggingface.co/spaces/hf-audio/open_asr_leaderboard> and the corresponding paper <https://arxiv.org/abs/2510.06961>, _Open ASR Leaderboard: Towards Reproducible and Transparent Multilingual Speech Recognition Evaluation_. Canary-Qwen-2.5B at 5.63% average WER; Parakeet-TDT-0.6B-v2 at 6.05% WER with RTFx 3386.

[^next-level-asr]: <https://nextlevel.ai/best-speech-to-text-models/>, "Best Speech to Text Models 2026" — corroborates the leaderboard numbers.

[^sherpa-parakeet]: <https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models> — `sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2` is the pre-converted ONNX INT8 build of `nvidia/parakeet-tdt-0.6b-v2`.

[^handy]: See sibling document [`handy.md`](./handy.md), which cites Handy's own docs at <https://handy.computer/docs/models>: Parakeet V3 runs ~5× real-time on a mid-range Intel i5 CPU-only.

[^vosk-license-file]: `COPYING` file at <https://github.com/alphacep/vosk-api/blob/master/COPYING>, fetched via the GitHub Contents API on 2026-05-23 and decoded. Apache License 2.0. Verified directly.

[^vosk-repo-api]: GitHub API `repos/alphacep/vosk-api`, retrieved 2026-05-23: `stargazers_count: 14764`, latest release `v0.3.50` (2024-04-22), `pushed_at: 2026-02-22T08:51:10Z`, license Apache-2.0.

[^vosk-models]: <https://alphacephei.com/vosk/models>, fetched 2026-05-23. English model index: `vosk-model-small-en-us-0.15` (40 MB, 9.85% WER LibriSpeech test-clean); `vosk-model-en-us-0.22-lgraph` (128 MB, 7.82% WER); `vosk-model-en-us-0.42-gigaspeech` (2.3 GB, 5.64% WER).

[^vosk-vs-whisper]: <https://www.jamy.ai/blog/openai-whisper-vs-other-open-source-transcription-models/>, "OpenAI Whisper vs Vosk: Comparing Open-Source Transcription Models" — quantifies the WER gap on accented/noisy English.

[^coqui-status]: GitHub discussion <https://github.com/coqui-ai/TTS/discussions/3489>, "Coqui is shutting down" — confirms company wind-down. STT repo last release `v1.4.0` September 2022, no subsequent activity.

[^coqui-dead]: GitHub API `repos/coqui-ai/STT`, retrieved 2026-05-23: latest release `v1.4.0` (2022-09-03), `pushed_at: 2024-03-11T07:55:56Z`. Effectively unmaintained.

[^deepspeech-archived]: GitHub API `repos/mozilla/DeepSpeech`, retrieved 2026-05-23: `isArchived: true`, latest release `0.9.3` (2020-12-10), MPL-2.0.

[^nemo-license-file]: `LICENSE` file at <https://github.com/NVIDIA/NeMo/blob/main/LICENSE>, fetched via the GitHub Contents API on 2026-05-23. Apache License 2.0. Verified directly.

[^nemo-repo-api]: GitHub API `repos/NVIDIA/NeMo`, retrieved 2026-05-23: `stargazers_count: 17253`, latest release `NVIDIA Neural Modules 2.7.3` (2026-04-23), active.

[^sherpa-repo]: GitHub repository <https://github.com/k2-fsa/sherpa-onnx>.

[^sherpa-license-file]: `LICENSE` file at <https://github.com/k2-fsa/sherpa-onnx/blob/master/LICENSE>, fetched via the GitHub Contents API on 2026-05-23. Apache License 2.0. Verified directly.

[^sherpa-repo-api]: GitHub API `repos/k2-fsa/sherpa-onnx`, retrieved 2026-05-23: `stargazers_count: 12423`, latest release `v1.13.2` (2026-05-13), `pushed_at: 2026-05-20T04:10:06Z`, license Apache-2.0.

[^npm-sherpa]: npm registry metadata for `sherpa-onnx`, fetched 2026-05-23 from `https://registry.npmjs.org/sherpa-onnx`: latest `1.13.2`, published `2026-05-13T11:04:07Z`, license Apache-2.0, description "Speech-to-text, text-to-speech, speaker diarization, and speech enhancement using Next-gen Kaldi without internet connection".

[^sherpa-readme]: README at <https://github.com/k2-fsa/sherpa-onnx>, fetched 2026-05-23. Enumerates 12 language bindings (C, C++, Python, JavaScript, Java, C#, Kotlin, Swift, Go, Dart, Rust, Pascal), supported model families (Zipformer streaming/offline, Paraformer, Whisper, Parakeet, SenseVoice, Moonshine, CTC variants), Silero VAD integration, speaker diarization, WebAssembly support.

[^moonshine-arxiv]: Jeffries et al., _Moonshine: Speech Recognition for Live Transcription and Voice Commands_, Useful Sensors, 2024. <https://arxiv.org/abs/2410.15608>. Quantifies Moonshine's adaptive-window architecture (processing time proportional to audio length rather than fixed-30-s) and its short-utterance regression.

[^moonshine-license-file]: `LICENSE` file at <https://github.com/moonshine-ai/moonshine/blob/main/LICENSE>, fetched via the GitHub Contents API on 2026-05-23 and decoded. **Mixed:** "The code in this repo (https://github.com/moonshine-ai/moonshine), apart from the source in core/third-party, is licensed under the MIT License. The English-language models are also released under the MIT License. See SECTION 1 for terms. Models for other languages are released under the Moonshine Community License, which is a non-commercial license. See SECTION 2 for terms." Verified directly.

[^moonshine-repo-api]: GitHub API `repos/usefulsensors/moonshine`, retrieved 2026-05-23: `stargazers_count: 8223`, latest release `v0.0.59` (2026-04-20), active.

[^moonshine-short]: Moonshine paper §4: "fewer than 0.5% of examples in [the] training set are shorter than one second"; corresponding evaluation shows degraded performance on Earnings22's short-utterance subset (~8% of clips <1 s).

[^aai-deepgram-compare]: AssemblyAI vs Deepgram vs Speechmatics comparison <https://deepgram.com/learn/deepgram-vs-speechmatics-vs-assemblyai>; AssemblyAI's <https://www.assemblyai.com/blog/deepgram-alternatives>; <https://www.assemblyai.com/blog/speechmatics-alternatives>. SOC 2 / HIPAA / on-prem availability confirmed across the three pages.

[^deepgram-privacy]: <https://deepgram.com/learn/speech-to-text-privacy> and <https://deepgram.com/learn/on-premise-stt-comparison>.

[^aai-speechmatics-compare]: <https://www.speechmatics.com/company/articles-and-news/best-speech-to-text-ai-guide-apis-platforms-and-services-compared> — corroborates Speechmatics' strongest public air-gap positioning.

[^openai-privacy-policy]: OpenAI API Data Usage Policy <https://openai.com/policies/api-data-usage-policies>: API submitted data is not used for training; 30-day retention by default; zero-data-retention available for eligible customers.

[^sfspeech-rod]: Apple Developer Documentation, _SFSpeechRecognitionRequest.requiresOnDeviceRecognition_: "A Boolean value that determines whether a request must keep its audio data on the device." Constraint: requires `SFSpeechRecognizer.supportsOnDeviceRecognition == true`. On-device speech recognition works on iOS 13+ and macOS Catalina+; all Mac devices support it but accuracy is lower than the cloud variant. <https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition>.

[^win-srec]: Microsoft Learn, `Windows.Media.SpeechRecognition` namespace docs and Q&A thread <https://learn.microsoft.com/en-us/answers/questions/2121375/does-another-local-offline-api-have-less-lag-than>. Local grammar-constrained recognition is offline; free-form dictation requires the "Online Speech Recognition" toggle.

[^webspeech-privacy]: <https://polypane.app/blog/not-all-browser-apis-are-web-apis/>, "Not All Browser APIs Are 'Web' APIs" — explains that `SpeechRecognition` in Chrome and Safari historically streams audio to vendor cloud servers.

[^chrome139-onbeing-device]: <https://medium.com/@roman_fedyskyi/on-device-speech-uis-in-chrome-139-4b9f0397b9c9>, "On-Device Speech UIs in Chrome 139". Chrome 139 (August 2025) added an opt-in `processLocally` flag; falls back to cloud silently when unsupported.

[^silero-license-file]: `LICENSE` file at <https://github.com/snakers4/silero-vad/blob/master/LICENSE>, fetched via the GitHub Contents API on 2026-05-23. Standard MIT License, `Copyright (c) 2020-present Silero Team`. Verified directly.

[^silero-repo-api]: GitHub API `repos/snakers4/silero-vad`, retrieved 2026-05-23: `stargazers_count: 9126`, latest release `v6.2.1: Make ONNX Runtime optional` (2026-02-24), license MIT.

[^vadweb-license]: `LICENSE` file at <https://github.com/ricky0123/vad/blob/master/LICENSE>, fetched 2026-05-23. ISC License, `Copyright (c) 2022-present ricky0123`. Verified directly. ISC is functionally equivalent to MIT and AGPL-compatible.

[^pyannote-license-file]: `LICENSE` file at <https://github.com/pyannote/pyannote-audio/blob/develop/LICENSE>, fetched via the GitHub Contents API on 2026-05-23. Standard MIT License, `Copyright (c) 2020 CNRS`. Verified directly.

[^pyannote-repo-api]: GitHub API `repos/pyannote/pyannote-audio`, retrieved 2026-05-23: `stargazers_count: 9977`, latest release `4.0.4` (2026-02-07), license MIT.

[^pyannote-cpu]: <https://github.com/pyannote/pyannote-audio/issues/1753>, "High CPU usage during embeddings step of diarization" — reports ~50 s of CPU time for the embedding step on 1 hour of audio.

[^pyannote-cpu-alt]: <https://medium.com/@shashwat.gpt/towards-approximate-fast-diarization-a-cpu-only-alternative-to-pyannote-3-1-2ba4843db297>, "Towards Approximate Fast Diarization: A CPU-Only Alternative to Pyannote 3.1" — Silero VAD + WeSpeaker embeddings + GMM+BIC + spectral clustering, ~1.5 min for 90-min audio on CPU.

[^wcag-captions-aelira]: <https://aelira.ai/us/blog/why-auto-captions-not-wcag-compliant>, "Why Auto-Captions Aren't WCAG Compliant (And What to Do Instead)" — explicit framing that AI-only captions do not meet WCAG SC 1.2.2 because they fail to capture non-speech audio elements (sound effects, music cues) that human captioners include. Corroborated by <https://www.boia.org/blog/does-wcag-require-live-captions> on the SC 1.2.4 live-caption interpretation.

[^level-access]: <https://www.levelaccess.com/blog/closed-captioning/>, "Closed Captioning vs. AI Captions: Which Is Better". 95% accuracy floor / 99% industry standard for human captions.

[^transformers-js]: <https://blog.openreplay.com/run-ai-models-browser-transformers-js/> and <https://www.sitepoint.com/webgpu-vs-webasm-transformers-js/>. WASM on CPU is 5–10× slower than native for Whisper inference; WebGPU recovers most of that on Chromium-with-supported-GPU but falls back silently to WASM when WebGPU is unavailable.

[^prompt-stem]: <https://medium.com/axinc-ai/prompt-engineering-in-whisper-6bb18003562d>, "Prompt Engineering in Whisper"; <https://sotto.to/blog/improve-whisper-accuracy-prompts>; <https://weesperneonflow.ai/en/blog/2026-03-14-voice-dictation-custom-vocabulary-technical-terminology-guide/>. Reports up to 40–60% WER reduction for domain-specific vocabulary when using `initial_prompt`; constraint: ≤224 tokens (~500–800 chars).
