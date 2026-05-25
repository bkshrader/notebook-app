# Supertonic (supertone-inc/supertonic)

## Links & License

- **GitHub repository**: <https://github.com/supertone-inc/supertonic>[^repo]
- **Python SDK repository**: <https://github.com/supertone-inc/supertonic-py>[^py-repo]
- **Python SDK documentation site**: <https://supertone-inc.github.io/supertonic-py/>[^py-docs]
- **Model weights**: <https://huggingface.co/Supertone/supertonic-3>[^hf-model]
- **Interactive WebGPU demo**: <https://huggingface.co/spaces/Supertone/supertonic-3>[^hf-demo]
- **Audio samples page**: <https://supertonic3.github.io/>[^demo-page]

### License — dual / split-license model

This project ships with **two distinct licenses** that cover two distinct things, and the distinction is critical for AGPL compatibility:

1. **Sample code in this repo (everything in `py/`, `nodejs/`, `web/`, `rust/`, `cpp/`, `csharp/`, `go/`, `swift/`, `ios/`, `java/`, `flutter/`)** — **MIT License**, Copyright (c) 2025 Supertone Inc.[^license-file] GitHub's license endpoint reports `"spdx_id": "MIT"`.[^api-license] The Python SDK package (`supertonic` on PyPI) also declares `license = "MIT"` in its `pyproject.toml`.[^pyproject]
2. **Model weights (the ONNX checkpoints on Hugging Face that you must download to actually run anything)** — **BigScience Open RAIL-M License (OpenRAIL-M), dated August 18, 2022**.[^openrail-text] The repo README explicitly notes: *"The accompanying model is released under the OpenRAIL-M License."*[^readme-license]

#### AGPL-compatibility verdict

- **Sample code (MIT) — Compatible.** MIT is a permissive license universally recognized as one-way compatible with AGPL-3.0; you may freely incorporate MIT-licensed code into an AGPL-3.0-licensed application, provided the MIT copyright/permission notice is preserved.[^license-file]
- **Model weights (OpenRAIL-M) — Ambiguous, with a strong "probably incompatible with AGPL §7" reading.** This is the load-bearing concern. OpenRAIL-M is **not OSI-approved**, and its Section III adds **use-based restrictions** (Attachment A: 13 listed forbidden uses including impersonation/deepfakes, defamation, disseminating PII, automated discriminatory decision-making, etc.) that any downstream license MUST inherit.[^openrail-text] AGPL-3.0 §7 lets you add only a fixed enumerated set of "additional terms" (anti-warranty, attribution preservation, anti-trademark, etc.); use-field restrictions are not in that enumeration and are widely considered "further restrictions" that AGPL §10 prohibits a redistributor from imposing on downstream users. The Free Software Foundation has historically treated RAIL/OpenRAIL family licenses as non-free for this reason. In practice this means: **shipping the OpenRAIL-M-licensed model weights inside an AGPL binary distribution is legally risky and very likely incompatible**. Shipping the MIT-licensed inference code alone (and having the end user separately download the weights from Hugging Face under the OpenRAIL-M terms they accept individually) is the conventional workaround the README itself implies — first-run, model files auto-download from Hugging Face into `~/.cache/supertonic3/`.[^py-docs]
- **Practical takeaway for this notebook app**: you can safely link/depend on the MIT-licensed Supertonic code from an AGPL Electron/Tauri app, but you should NOT bundle the `.onnx` weight files into your AGPL-licensed distribution. Treat the model as a separate runtime asset that the user accepts (and downloads) under its own license. Also: the OpenRAIL-M use-restrictions (especially the anti-impersonation/deepfake clauses) should be surfaced to end users in your terms of service if you ship Supertonic, since the license requires you to pass those restrictions on.[^openrail-text]
- **Additional license artifact**: the README also notes the *training* was done with PyTorch (BSD 3-Clause) which is *not redistributed* with the project, so PyTorch has no bearing on what you ship.[^readme-license]

---

## What it is

Supertonic is an **on-device, multilingual, neural text-to-speech (TTS) system** built around a compact ~99M-parameter open-weight model exported to **ONNX** and run via ONNX Runtime.[^readme-highlights] It is published by Supertone Inc. (a commercial Korean voice-AI company that also runs hosted services like Supertone Play and the Supertone API), and the open-source repo is positioned as the "fixed-voice, local inference" path that does *not* include the official voice-cloning pipeline.[^readme-cloning]

The repo is essentially a **bag of reference inference implementations**, not a single library. The Python implementation (`py/` and the standalone `supertonic-py` PyPI package) is the most-developed surface; everything else (`nodejs/`, `web/`, `rust/`, `cpp/`, `csharp/`, `go/`, `swift/`, `ios/`, `java/`, `flutter/`) is a sample app demonstrating how to feed the same shared ONNX models through a language-native ONNX Runtime binding.[^readme-langs] The line counts confirm this: roughly comparable amounts of Swift/C++/JS/Java/C#/Dart/Go/Rust code (~30-55K bytes each), but only ~19K bytes of Python.[^langs]

### Core architecture

- **Model**: ~99M parameter SupertonicTTS architecture described in [arXiv:2503.23108](https://arxiv.org/abs/2503.23108) — speech autoencoder + flow-matching text-to-latent module, with two follow-on papers describing Length-Aware RoPE (LARoPE, [arXiv:2509.11084](https://arxiv.org/abs/2509.11084)) for text-speech alignment and self-purifying flow matching ([arXiv:2509.19091](https://arxiv.org/abs/2509.19091)) for noisy-label robustness.[^readme-papers]
- **Format**: ONNX assets (with an optional OnnxSlim-optimized variant), 44.1 kHz / 16-bit WAV output, no GPU required.[^readme-highlights]
- **Voice styles**: "fixed-voice" preset speakers shipped as small JSON files (`M1`-`M5`, `F1`-`F5`); custom voices come via the proprietary hosted *Voice Builder* tool that emits a compatible JSON.[^web-readme][^readme-cloning]
- **Languages**: 31 supported language codes (Arabic through Vietnamese), plus a `lang="na"` "language-agnostic" fallback when the input language is unknown.[^readme-langs-list]
- **Inline expression tags**: 10 tags (examples cited: `<laugh>`, `<breath>`, `<sigh>`) that inject paralinguistic events into output without prompt engineering or reference audio.[^readme-highlights] The full list of 10 is not documented in the README I read — issue #155 is open requesting it.[^issue-155]
- **Long-form handling**: automatic text chunking (default ~300-char chunks joined with 0.3s of silence) for inputs that exceed a single-pass synthesis window. Disabled in batch mode.[^nodejs-readme]
- **Text normalization**: the model handles complex inline text natively (`$5.2M`, phone numbers like `(212) 555-0142 ext. 402`, units like `30kph`) without requiring upstream preprocessing.[^readme-normalize]

### Scope (what it is *not*)

- **Not** a voice-cloning toolkit — the open repo intentionally excludes the cloning pipeline. Cloning requires either the proprietary hosted Voice Builder or the paid Supertone API.[^readme-cloning]
- **Not** a speech-to-text / ASR system. TTS only.
- **Not** GPU-required, but also: **GPU inference is currently not supported** in the Node.js and Rust example apps (the `--use-gpu` flag is reserved but inactive in those bindings as of the latest README).[^nodejs-readme][^rust-readme]
- **Not** a packaged single library you can `npm install` — you `npm install` *the example folder's dependencies* and then run that folder's `helper.js` glue code, which is illustrative rather than a published `@supertonic/*` package.

---

## How to use it

### Installation (Python, the easiest path)

```bash
pip install supertonic
# Optional: for local playback
pip install 'supertonic[playback]'
# Optional: to expose the HTTP/OpenAI-compatible REST server
pip install 'supertonic[serve]'
```

Requires Python >=3.9; depends on `onnxruntime`, `numpy`, `soundfile`, `huggingface-hub`.[^pyproject]

### Basic synthesis (Python)

```python
from supertonic import TTS

# First run downloads model weights (~400 MB) from Hugging Face
# into ~/.cache/supertonic3/
tts = TTS(auto_download=True)

style = tts.get_voice_style(voice_name="M1")

wav, duration = tts.synthesize(
    text="Supertonic is a lightning fast, on-device TTS system.",
    lang="en",            # one of 31 codes, or "na" for language-agnostic
    voice_style=style,
    total_steps=8,        # 5 (faster) -> 12 (higher quality)
    speed=1.05,           # 0.7 .. 2.0
)
# wav: np.float32 shape (1, num_samples) @ 44.1 kHz
# duration: np.float32 shape (1,) in seconds

tts.save_audio(wav, "output.wav")
```

[^readme-quickstart]

### Local HTTP server (good fit for Electron/Tauri sidecar)

```bash
pip install 'supertonic[serve]'
supertonic serve --host 127.0.0.1 --port 7788
```

Exposes:

- Native `POST /v1/tts`
- OpenAI-compatible `POST /v1/audio/speech` (so any client that already speaks the OpenAI TTS REST shape works against it)
- Interactive OpenAPI docs at `/docs`

[^readme-quickstart] The README explicitly calls out **Electron apps** as a target use case for this server.[^readme-quickstart]

### Node.js usage (no published npm package — vendor the helper)

The `nodejs/` folder is a runnable example, not a publishable package. The dependencies are minimal:

```json
{
  "dependencies": {
    "fft.js": "^4.0.3",
    "js-yaml": "^4.1.0",
    "onnxruntime-node": "^1.19.2"
  }
}
```

[^node-pkg] The usage pattern (from `example_onnx.js`):

```javascript
import { loadTextToSpeech, loadVoiceStyle, writeWavFile }
  from './helper.js';

const textToSpeech = await loadTextToSpeech('../assets/onnx', /* useGpu */ false);
const style = loadVoiceStyle(['../assets/voice_styles/M1.json'], true);

const { wav, duration } = await textToSpeech.call(
  'Hello, world.',
  'en',
  style,
  /* totalSteps */ 8,
  /* speed */ 1.05
);

writeWavFile('out.wav', wav.slice(0, Math.floor(textToSpeech.sampleRate * duration[0])),
             textToSpeech.sampleRate);
```

[^node-example] To use this in a real app you would vendor `helper.js` (~19 KB) into your codebase, since it is the only API surface available on the Node side.

### Browser usage (Vite + ONNX Runtime Web + WebGPU)

The `web/` folder is a Vite project that loads `onnxruntime-web` and tries WebGPU first, falling back to WebAssembly:[^web-main]

```javascript
import * as ort from 'onnxruntime-web';

// In helper.js (vendored):
const session = await ort.InferenceSession.create(modelBytes, {
  executionProviders: ['webgpu'],   // fallback handled at call site
  graphOptimizationLevel: 'all',
});
```

Dependencies: `onnxruntime-web ^1.17.0`, `fft.js ^4.0.3`, dev-dep `vite ^5.0.0`.[^web-pkg]

### Rust usage

`Cargo.toml`:[^rust-cargo]

```toml
[dependencies]
ort = "2.0.0-rc.7"             # ONNX Runtime Rust binding
ndarray = { version = "0.17", features = ["rayon"] }
hound = "3.5"                  # WAV I/O
rustfft = "6.2"
rayon = "1.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

The package is named `supertonic-tts` v0.1.0 but is **not published to crates.io**; you would copy the `src/` directory into your project.

### Other bindings (sample apps only)

| Binding   | Runtime needed                        | Notes |
|-----------|----------------------------------------|-------|
| Python    | `onnxruntime` Python wheel            | Has a real PyPI package (`supertonic`) — preferred path[^py-docs] |
| Node.js   | `onnxruntime-node` (prebuilt binaries) | Example only |
| Browser   | `onnxruntime-web` (WASM + WebGPU)     | Example only; WebGPU fallback to WASM[^web-main] |
| C++       | ONNX Runtime C++ libraries, CMake     | Example only |
| C#        | .NET 9 (forward-compatible)           | Example only[^readme-quickstart] |
| Java      | JDK 17+ via Maven                     | Example only |
| Go        | ONNX Runtime C library (e.g. `brew install onnxruntime`) | Example only |
| Swift     | Swift Package Manager                 | Example only |
| iOS       | XcodeGen + Xcode signing              | Example only |
| Rust      | `ort` v2.0 RC                          | Example only; no crates.io publish[^rust-cargo] |
| Flutter   | Flutter SDK; macOS supported as of 2025.11.24 | Example only[^readme-news] |

---

## Relevance to a note-taking app for college students/academics

This is potentially a very strong fit for the **read-aloud / text-to-speech accessibility feature** that an ADHD- and autism-focused, accessibility-first study app would want. Concrete uses:

1. **"Read this note/passage/article aloud"** — the foundational accessibility primitive. Supertonic's *Chrome Extension* demo literally turns "any webpage into audio in under one second"[^readme-demos], and one of the projects in their "Built With" list (TLDRL) is exactly that pattern in production today.[^readme-built-with] Replicating that for selected text in a notebook is straightforward.
2. **Read-aloud while studying without internet** — critical for students working offline (library, transit, focus mode with the network firewalled). Supertonic runs entirely on-device with **zero network dependency** after the one-time weight download; the README even shows it running on an Onyx Boox e-reader *in airplane mode*.[^readme-demos]
3. **Multilingual academic reading** — 31 supported languages plus a `lang="na"` mixed-language fallback is unusually broad. Useful for any student reading non-English source material (language classes, comparative literature, international students reading their L2 textbook).[^readme-langs-list]
4. **Long-form audio of lecture notes** — automatic text chunking with 0.3s natural pauses handles full-chapter inputs without prompt-engineering or external splitter.[^nodejs-readme]
5. **Text normalization for STEM/academic content** — the model handles units (`30kph`, `2.3h`), currency (`$5.2M`), phone numbers, and abbreviations natively, which most TTS engines mangle.[^readme-normalize] A note-taking app heavy on engineering, finance, or physics content would benefit measurably.
6. **Expression tags for engagement** — `<laugh>`, `<breath>`, `<sigh>` etc. let you optionally turn dry text into more naturalistic narration, which has a small but real accessibility benefit for users whose attention drops on monotone narration (a documented ADHD friction point).[^readme-highlights]
7. **OpenAI-compatible local server as Electron sidecar** — the Python `supertonic serve` command exposes an OpenAI `POST /v1/audio/speech`-compatible REST endpoint. For an Electron app this is the cleanest integration pattern: spawn a Python sidecar at app launch, have the renderer call `http://127.0.0.1:7788/v1/audio/speech` like it would call OpenAI, ship `pyinstaller`-bundled Python alongside the Electron binary.[^readme-quickstart] For a Tauri app you'd do the same with a tauri-sidecar.
8. **Pure-browser fallback for web-deploy** — if you ever ship a web/PWA variant of the app, the `web/` example proves WebGPU+WASM inference works in modern Chrome/Edge (113+), enabling client-side TTS with no backend at all.[^web-readme]

### Accessibility-specific notes (WCAG 2.1 AAA / ADHD / autism)

- **Voice variety**: 10 preset voices (5M, 5F) gives users with sensory sensitivities room to find a comfortable timbre — important for ASD users where a specific voice can be intolerable.[^web-readme]
- **Speed control**: `speed` parameter (0.7-2.0) maps directly to a "playback rate" UI that ADHD users frequently tune up to 1.5-2x to maintain attention.[^readme-quickstart]
- **Quality/latency tradeoff**: `total_steps` parameter (5-12) lets you expose a "lower latency vs higher fidelity" toggle, useful for users who need immediate response on short snippets (highlight-then-speak) vs longer narration.[^readme-quickstart]
- **No phonetic preprocessing**: students don't have to learn how to phonetically annotate technical terms for the TTS to pronounce them correctly — a real ergonomic win.[^readme-normalize]
- **Output format is plain WAV at 44.1 kHz / 16-bit**: clean, well-supported by every HTML5 `<audio>` element, no codec drama.[^readme-highlights]

### Risks/mismatches to consider

- The **OpenRAIL-M license on weights** is the single biggest barrier (see License section). For an AGPL distribution you'd need to keep the weights as a separately-downloaded asset, not a bundled binary blob.
- Supertonic does not provide an **on-device voice-cloning** capability — "make my notes sound like me" is not supported in the open release, only in the proprietary Voice Builder.[^readme-cloning]
- Model download is **~400 MB on first run**[^py-docs], which is a non-trivial first-launch UX cost. You will need a download-progress UI and disk-space check.
- **No published npm package** — for an Electron app that wants to avoid a Python sidecar you'd need to vendor the `nodejs/helper.js` example yourself or use a community wrapper (the "Built With" list mentions `Transformers.js` support via a Hugging Face PR which would be the most idiomatic JS path).[^readme-built-with]

---

## Things to know

### Maturity and activity signals

- **Repo created**: 2025-11-18.[^api-metadata] Roughly six months old at the time of this writing.
- **Stars**: ~9,701 (very high adoption velocity for a six-month-old repo — this is essentially a viral OSS project).[^api-metadata]
- **Forks**: ~1,001.[^api-metadata]
- **Last push**: 2026-05-22, well within active maintenance.[^api-metadata]
- **Open issues**: 93.[^api-metadata] Issues triage looks healthy — most recent ones are real bug reports (#157 numeric-pronunciation issue, #156 init hang, #153 Chinese language request) rather than abandoned spam.[^issues-sample]
- **Contributors**: only **7** people have committed to the main repo, with one author (`ANLGBOY`) responsible for 25 of ~38 commits — heavy single-maintainer concentration.[^contributors] This is a bus-factor concern: the contributor base is essentially the Supertone Inc. internal team plus three external one-off PR authors.
- **Releases**: only **1 tagged GitHub release** (`v2.0.0`, dated 2026-01-06). The Python package on PyPI (`supertonic` v1.3.1) is more actively versioned than the GitHub repo's release tags.[^releases][^pyproject]
- **PR cadence**: 21 PRs since April 2026, most of them README and docs polish; substantive engineering happens on the `supertonic-py` companion repo.[^activity]
- **Branches**: only `main`, a `release/supertonic-2` legacy branch, and a handful of dependabot/feature branches.[^branches]
- **Active companion repo (`supertonic-py`)**: stand-alone Python SDK in active development (MIT-licensed, last updated 2026-05-23, 55 stars).[^py-repo]

**Net assessment**: highly active but small, corporate-backed, and very young. Not abandoned; production-grade for the listed sample languages but the Python SDK is the only path with a real "supported product" feel.

### Platform support

| Platform | Status |
|----------|--------|
| **Windows** | Yes via Python (`onnxruntime` ships Windows wheels) and via `onnxruntime-node` / `onnxruntime-web`. C++/Rust/Go/.NET examples work on Windows with appropriate native ONNX Runtime libs. |
| **macOS** | Yes for all bindings; Flutter explicitly got macOS support on 2025-11-24.[^readme-news] |
| **Linux** | Yes via all bindings; the Raspberry Pi demo confirms arm64 Linux works.[^readme-demos] |
| **Electron (Node.js main process)** | Yes — `onnxruntime-node` is the documented dependency; vendor `helper.js`. Best practice: run as a worker thread or as a Python sidecar via `supertonic serve` to avoid blocking the main process.[^node-pkg][^readme-quickstart] |
| **Electron (renderer)** | Possible via `onnxruntime-web` + WebGPU; the `web/` example proves it works.[^web-main] Caveat: requires WebGPU enablement and is heavy in the renderer process. |
| **Tauri (Rust backend)** | Possible via the `ort = "2.0.0-rc.7"` crate, but the example is not crates.io-published; you would need to vendor `src/`.[^rust-cargo] **Easier alternative**: spawn the Python `supertonic serve` as a tauri sidecar. |
| **Tauri (webview)** | Same as Electron renderer — `onnxruntime-web` works, but you have less control over WebGPU availability in webview backends, especially WebKit on macOS/Linux. |
| **iOS / Android** | iOS example provided; Flutter binding covers Android. Outside this project's scope. |
| **Raspberry Pi / e-readers** | Demonstrated working at "RTF 0.3x" on an Onyx Boox Go 6.[^readme-demos] |

### Performance characteristics

- **CPU-only inference is the design point**; "open-weight fixed-voice setting does not require a GPU."[^readme-perf]
- **Latency claim**: "fast enough to turn an entire webpage into audio in under a second" and "real-time synthesis across desktop, browser, mobile, and edge"[^readme-highlights] — the Raspberry Pi and e-reader demos suggest sub-realtime (RTF < 1) on very modest ARM hardware.[^readme-demos]
- **Memory**: ~99M parameters in the public ONNX assets; total model directory ~400 MB on disk.[^readme-perf][^py-docs] Substantially below 0.7-2B-parameter open TTS systems.[^readme-perf]
- **Quality (WER/CER on Minimax-MLS benchmark)**: competitive with much larger models for the headline language set — English WER 2.06 (vs VoxCPM2 2.11), Korean CER 3.26 (vs Qwen3-TTS 4.07). Outliers where Supertonic 3 lags: Vietnamese (4.49 WER), Finnish (5.40 WER), Japanese (4.61 CER).[^readme-perf-table] For an English-primary college audience this is more than adequate.

### Dependencies of note

- **Python**: `onnxruntime`, `numpy`, `soundfile`, `huggingface-hub`; optional `sounddevice` for playback, `fastapi`/`uvicorn`/`pydantic` for the HTTP server.[^pyproject]
- **Node.js**: `onnxruntime-node`, `fft.js`, `js-yaml` — small and clean.[^node-pkg]
- **Web**: `onnxruntime-web`, `fft.js`; Vite as dev dep.[^web-pkg]
- **Rust**: `ort` (still v2.0-rc), `ndarray`, `rustfft`, `hound`, `serde`, `rand`. The use of `libc::_exit()` in the Rust example to work around an ONNX Runtime mutex-cleanup warning at process exit is a known quirk to be aware of.[^rust-readme]

### Gotchas

- **OpenRAIL-M weights** are not a typical permissive ML model license — re-read the License section above.[^openrail-text]
- **Use-restriction passthrough**: if you ship Supertonic-generated audio in your app, the OpenRAIL-M license requires you to pass the Attachment A restrictions through to your end users via your own legal terms.[^openrail-text]
- **First-run model download (~400 MB)** is not user-controlled in the basic Python flow; for an offline-first study app you'd want to pre-stage the model or expose a "Download voice model" preferences step.[^py-docs]
- **Git LFS required** if you clone the model repo directly from Hugging Face instead of using the Python SDK's automatic download.[^readme-quickstart]
- **GPU support in non-Python bindings is incomplete** — the `--use-gpu` flag exists in the Rust and Node.js examples but is documented as "not supported yet."[^nodejs-readme][^rust-readme]
- **Voice cloning is not in this repo** — if your students want to clone a professor's voice or their own, you cannot do it with the open-source release.[^readme-cloning]
- **Single-maintainer bus factor** on the main repo (one contributor with 25/38 commits).[^contributors]
- **The Node.js helper code is a sample, not a library** — there is no `import { TTS } from '@supertonic/node'`. You will be vendoring ~19 KB of `helper.js` per binding you adopt.[^node-pkg]
- **Vietnamese, Finnish, and Japanese accuracy** trails leading peers on the published benchmark; verify with your own ear if those languages are critical.[^readme-perf-table]
- **Inline expression tag list is not fully documented**; the README cites only `<laugh>`, `<breath>`, `<sigh>` of the advertised 10. Issue #155 is open requesting the complete list.[^issue-155]

---

## Bottom line for this project

For an AGPL-licensed, accessibility-first, Electron/Tauri notebook app, Supertonic looks like a **strong candidate for the read-aloud feature** — fast, on-device, multilingual, with good text-normalization and an OpenAI-compatible local-server option that drops into an Electron sidecar architecture cleanly. The MIT-licensed inference code is unambiguously safe to depend on. **The only meaningful caveat is the OpenRAIL-M model license**: do not bundle the `.onnx` weights into your AGPL distribution; instead have the app download them on first run from Hugging Face so the user accepts the model license directly. With that one architectural decision, Supertonic appears compatible and high-value.

---

## Footnotes

[^repo]: GitHub repository root: <https://github.com/supertone-inc/supertonic>
[^py-repo]: Companion Python SDK repository: <https://github.com/supertone-inc/supertonic-py>; `gh api repos/supertone-inc/supertonic-py` reports MIT-licensed, 55 stars, created 2025-11-24, last updated 2026-05-23.
[^py-docs]: Python SDK docs: <https://supertone-inc.github.io/supertonic-py/>; the site notes "first run downloads the model (~400 MB) into `~/.cache/supertonic3/`".
[^hf-model]: Hugging Face model: <https://huggingface.co/Supertone/supertonic-3>. The model repo's listed license tag is `openrail`; reported total disk size ~415 MB.
[^hf-demo]: Interactive WebGPU demo space: <https://huggingface.co/spaces/Supertone/supertonic-3>.
[^demo-page]: Audio samples page: <https://supertonic3.github.io/>.
[^license-file]: Verbatim from `LICENSE` at <https://raw.githubusercontent.com/supertone-inc/supertonic/main/LICENSE>: "MIT License / Copyright (c) 2025 Supertone Inc. / Permission is hereby granted, free of charge, ..." (standard MIT text, 1,070 bytes).
[^api-license]: `gh api repos/supertone-inc/supertonic/license` returns `"license": {"key": "mit", "spdx_id": "MIT", "name": "MIT License"}`.
[^pyproject]: `supertonic-py/pyproject.toml`, version 1.3.1, declares `license = "MIT"` and lists `onnxruntime`, `numpy`, `soundfile`, `huggingface-hub` as dependencies plus optional `sounddevice`, `fastapi`/`uvicorn`/`pydantic` extras.
[^openrail-text]: BigScience OpenRAIL-M License, dated August 18, 2022; full text mirrored at <https://huggingface.co/Supertone/supertonic-3/raw/main/LICENSE>. Section III §4 requires inheriting Attachment A use restrictions in any downstream legal agreement. Attachment A enumerates 13 prohibited uses including (b) exploiting minors, (e) AI-generated content without disclosure, (g) impersonation/deepfakes without consent, (h) automated decision-making affecting legal rights, etc.
[^readme-license]: Repo README, "License" section: "This project's sample code is released under the MIT License. ... The accompanying model is released under the OpenRAIL-M License. ... This model was trained using PyTorch, which is licensed under the BSD 3-Clause License but is not redistributed with this project."
[^readme-highlights]: Repo README, "Highlights" section: lightning-fast on-device synthesis, 31 languages, 99M-parameter open-weight checkpoint, 44.1 kHz 16-bit WAV output, 10 inline expression tags, "Multi-Runtime SDKs ... through ONNX Runtime across Python, Node.js, Browser (WebGPU), Java, C++, C#, Go, Swift, iOS, Rust, and Flutter".
[^readme-cloning]: Repo README, "Voice Cloning" section: "This open-weight repository focuses on fixed-voice, local TTS and does not include an official voice-cloning pipeline. ... [Voice Builder](https://supertonic.supertone.ai/voice-builder) turns a short reference recording into version-specific JSON files".
[^readme-langs]: Repo README, "Programming Language Support" table listing 11 binding directories (`py/`, `nodejs/`, `web/`, `java/`, `cpp/`, `csharp/`, `go/`, `swift/`, `ios/`, `rust/`, `flutter/`).
[^langs]: `gh api repos/supertone-inc/supertonic/languages` byte counts: Swift 54,452, C++ 54,126, JavaScript 53,724, Java 42,681, C# 39,379, Dart 34,413, Go 33,746, Rust 32,281, Python 19,189, Shell 14,274, CSS 7,843, HTML 6,452, CMake 3,332, Ruby 1,507.
[^readme-papers]: Repo README, "Citation" section. Four cited papers: SupertonicTTS architecture (arXiv:2503.23108), LARoPE for alignment (arXiv:2509.11084), Self-Purifying Flow Matching (arXiv:2509.19091), RobustSpeechFlow (arXiv:2605.22083).
[^web-readme]: `web/README.md`: "10 voice style presets are provided (M1-M5, F1-F5)." "WebGPU is only available in recent Chrome/Edge browsers (version 113+) ... The app will automatically fall back to WebAssembly if WebGPU is not available."
[^readme-langs-list]: Repo README, "Supported Languages (31)" section enumerates: ar, bg, hr, cs, da, nl, en, et, fi, fr, de, el, hi, hu, id, it, ja, ko, lv, lt, pl, pt, ro, ru, sk, sl, es, sv, tr, uk, vi. Plus: "Pass `lang=\"na\"` and Supertonic will handle the input in a language-agnostic way".
[^issue-155]: GitHub issue #155 (opened 2026-05-22, currently open): "What are all the Expression Tags?" — confirms the full list is not yet documented in the README.
[^nodejs-readme]: `nodejs/README.md`: "Long-Form Inference: For long texts, the system automatically chunks the text into manageable segments and generates a single audio file ... split the long text into smaller chunks (max 300 characters by default) ... Insert brief silences (0.3 seconds) between chunks for natural pacing". Also: "GPU Support: GPU mode is not supported yet".
[^readme-normalize]: Repo README, "Natural Text Handling" section: tabulates Financial Expression, Phone Number, and Technical Unit cases where Supertonic passes (`$5.2M`, `(212) 555-0142 ext. 402`, `30kph`) and competitors (ElevenLabs Flash v2.5, OpenAI TTS-1, Gemini 2.5 Flash TTS, Microsoft) fail.
[^rust-readme]: `rust/README.md`: "GPU Support: GPU mode is not supported yet"; "Known Issues: On some platforms (especially macOS), there might be a mutex cleanup warning during exit. This is a known ONNX Runtime issue and doesn't affect functionality. The implementation uses `libc::_exit()` and `mem::forget()` to bypass this issue."
[^readme-quickstart]: Repo README, "Quick Start" + "Local HTTP Server" sections; pip-installable, exposes `POST /v1/tts` and OpenAI-compatible `POST /v1/audio/speech`, OpenAPI docs at `/docs`, explicitly lists "Electron apps" as a target consumer; also notes C# example "targets .NET 9 and allows major-version roll-forward".
[^node-pkg]: `nodejs/package.json`: dependencies `fft.js ^4.0.3`, `js-yaml ^4.1.0`, `onnxruntime-node ^1.19.2`; engine `node >=16.0.0`; declared as MIT-licensed example.
[^node-example]: `nodejs/example_onnx.js` — pattern shown is `loadTextToSpeech(onnxDir, useGpu)` → `loadVoiceStyle([paths], true)` → `textToSpeech.call(text, lang, style, totalStep, speed)` → `writeWavFile(...)`.
[^web-main]: `web/main.js` — explicitly tries `executionProviders: ['webgpu']` first, falls back to `['wasm']` on failure; displays a backend badge to user.
[^web-pkg]: `web/package.json`: dependencies `onnxruntime-web ^1.17.0`, `fft.js ^4.0.3`; dev-dep `vite ^5.0.0`; MIT-licensed example.
[^rust-cargo]: `rust/Cargo.toml`: package `supertonic-tts` v0.1.0, edition 2021. Dependencies: `ort = "2.0.0-rc.7"`, `ndarray 0.17` w/ rayon feature, `rand 0.8`, `rand_distr 0.4`, `rayon 1.10`, `hound 3.5`, `rustfft 6.2`, `serde 1.0`, `serde_json 1.0`, `clap 4.5`, `anyhow 1.0`, `unicode-normalization 0.1`, `regex 1.10`, `libc 0.2`. Single binary target `example_onnx`. Not published to crates.io.
[^readme-news]: Repo README, "Update News" section: "2025.11.24 - Added Flutter SDK support with macOS compatibility."
[^readme-demos]: Repo README, "Demo" section: Raspberry Pi video, "Supertonic on an Onyx Boox Go 6 e-reader in airplane mode, achieving an average RTF of 0.3× with zero network dependency", and a Chrome Extension "Turns any webpage into audio in under one second".
[^readme-built-with]: Repo README, "Built with Supertonic" table includes TLDRL (Chrome extension), Read Aloud (open-source TTS browser extension), PageEcho (iOS e-book reader), VoiceChat, OmniAvatar, CopiloTTS (Kotlin Multiplatform), Aftertone, Voice Mixer, Supertonic MNN, Transformers.js (via Hugging Face PR), and Pinokio.
[^api-metadata]: `gh api repos/supertone-inc/supertonic`: created_at 2025-11-18T08:23:58Z, pushed_at 2026-05-22T05:05:12Z, stargazers_count 9701, forks_count 1001, open_issues 93, default_branch `main`, language `Swift` (by line count of top file type).
[^issues-sample]: `gh api 'repos/supertone-inc/supertonic/issues?state=open&per_page=5'` returned #157 "Roman numerals & Temperatures are not sound correct" (2026-05-23), #156 "stuck in initializing" (2026-05-22), #155 "What are all the Expression Tags?" (2026-05-22), #153 "Feature Request: Add Chinese (zh) Language Support" (2026-05-21), #152 "Docs/feature: ship a systemd unit (or README section) for 'supertonic serve'" (2026-05-20).
[^contributors]: `gh api repos/supertone-inc/supertonic/contributors --paginate`: 7 contributors total — ANLGBOY (25), fbdp1202 (6), Yangyangii (2), juheo (2), abhimanyupandian (2), NgoQuocViet2001 (1), omarelkhal (1).
[^releases]: `gh api repos/supertone-inc/supertonic/releases`: 1 release, `v2.0.0` published 2026-01-06.
[^activity]: `gh api 'repos/supertone-inc/supertonic/issues?state=all&since=2026-04-01'` returned 97 items (76 issues, 21 PRs) since April 2026.
[^branches]: `gh api repos/supertone-inc/supertonic/branches`: `main`, `release/supertonic-2`, `ios/issue25`, `pr-18`, `readme-patch-1`, plus three dependabot upgrade branches.
[^readme-perf]: Repo README, "Runtime Footprint" and "Model Size" sections: "Supertonic 3 runs fast on CPU, even compared with larger baselines measured on A100 GPU, and uses substantially less memory. The open-weight fixed-voice setting does not require a GPU"; "At about 99M parameters across the public ONNX assets, Supertonic 3 is much smaller than 0.7B to 2B class open TTS systems."
[^readme-perf-table]: Repo README, "Detailed per-language results" table — Supertonic 3 numbers vs the best of {VoxCPM2, OmniVoice, Qwen3-TTS, Supertonic 2}: English 2.06 WER, German 0.86 WER, Korean 3.26 CER, Vietnamese 4.49 WER, Finnish 5.40 WER, Japanese 4.61 CER.
