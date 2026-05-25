# Handy

- **GitHub repo:** <https://github.com/cjpais/Handy>[^repo]
- **Project website / docs:** <https://handy.computer> · docs at <https://handy.computer/docs>[^site]
- **License:** MIT[^license-readme] (verified directly against the `LICENSE` file in the repo root, which contains the standard MIT permission grant and disclaimer of warranty, with `Copyright (c) 2025 CJ Pais`)[^license-file]
- **AGPL-compatibility verdict:** **Compatible.** MIT is a permissive, OSI-approved license. AGPL-3.0 explicitly allows incorporation of MIT-licensed code: redistributing or relicensing MIT code as part of a larger AGPL work is permitted as long as the MIT copyright notice and permission notice are preserved in the AGPL work's distribution.[^license-file] Note that Handy itself is a *standalone desktop application* — see the "Relevance" section below for whether what you actually want is to embed/fork the codebase versus to drive it as a separate process.

---

## What it is

Handy is a cross-platform desktop **speech-to-text application** built on Tauri 2.x with a Rust backend and a React + TypeScript frontend.[^readme-arch] Its design philosophy, from the README, is "not trying to be the best speech-to-text app — it's trying to be the most forkable one."[^readme-why] It runs entirely on-device with no cloud dependency for transcription.[^readme-howitworks]

### Core problem solved

The user presses a configurable keyboard shortcut, speaks, releases, and the transcribed text is pasted into whatever text field currently has focus — across any application, system-wide.[^readme-howitworks] This makes it a general-purpose dictation utility comparable in scope to macOS Dictation, Windows Voice Access, or Dragon — but FOSS, offline, and explicitly framed by its author as accessibility tooling.[^readme-why]

### Architecture (high level)[^agents-arch]

1. **Audio capture** via `cpal` (cross-platform audio I/O).
2. **Voice Activity Detection (VAD)** with Silero VAD via `vad-rs` to strip silence.
3. **Speech-to-text inference** via `transcribe-rs`, which supports two model families:
   - **Whisper** (Small / Medium / Turbo / Large) using `whisper.cpp`/`ggml`, with GPU acceleration: Metal on macOS, Vulkan on Windows/Linux, plus DirectML on Windows via ONNX Runtime.[^cargo-toml]
   - **Parakeet V2/V3** — CPU-optimized via ONNX, with automatic language detection on V3.[^readme-howitworks]
4. **Text output**: results are sent into the focused app via clipboard paste, direct typing (`enigo` / `rdev` / on Linux optionally `xdotool`, `wtype`, or `dotool`), or a user-supplied external script.[^readme-linux-notes][^paste-docs]
5. **Optional post-processing**: transcribed text can be run through an LLM (cloud or local) before paste, using a custom prompt and `${output}` template variable. Providers supported include OpenAI, Anthropic, OpenRouter, Groq, Cerebras, Z.AI, Apple Intelligence (on macOS 26+, Apple Silicon), and any OpenAI-compatible local endpoint (e.g. LM Studio).[^postproc-docs]

### Scope

Strictly a **desktop end-user app** — not a library, daemon, SDK, or HTTP server. It runs in the system tray, registers global shortcuts, and shoves text into the OS clipboard / keystroke stream. There is no documented Node/JS/Python API to import. Its external control surfaces are: CLI flags, Unix signals (Linux/macOS), and the third-party Raycast extension.[^readme-cli][^readme-integrations]

---

## How to use it

### Installation (end users)[^readme-quickstart]

Download from the [releases page](https://github.com/cjpais/Handy/releases) or <https://handy.computer>. Platform-specific options:

- **macOS:** drag DMG to Applications, or `brew install --cask handy` (unofficial cask).
- **Windows:** MSI installer, or `winget install cjpais.Handy` (unofficial).
- **Linux:** `.deb`, `.rpm`, or `.AppImage` bundles.

On first launch, grant microphone and accessibility permissions, configure shortcuts in Settings, and pick a model (Parakeet V3 is the recommended default for English/European languages; Whisper Medium is the recommended balanced multilingual option).[^docs-getting-started][^docs-models]

### Building from source[^build-md]

```bash
git clone git@github.com:cjpais/Handy.git
cd Handy
bun install
bun tauri dev          # development
bun run tauri build    # production bundles
```

Prerequisites: Rust (latest stable), Bun, plus the Tauri prerequisites for your platform (Xcode CLT on macOS; MSVC Build Tools on Windows; on Debian/Ubuntu: `build-essential libasound2-dev pkg-config libssl-dev libvulkan-dev vulkan-tools glslc libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libgtk-layer-shell0 libgtk-layer-shell-dev patchelf cmake`). The VAD model must also be downloaded into `src-tauri/resources/models/silero_vad_v4.onnx` before building.[^agents-arch]

### Default keyboard shortcuts[^docs-getting-started]

- **Transcribe:** `Option + Space` (macOS) / `Ctrl + Space` (Win/Linux)
- **Transcribe with post-processing:** `Option + Shift + Space`
- **Cancel:** `Escape`

### Driving Handy from another process

Handy enforces single-instance behavior via `tauri_plugin_single_instance`; launching a second copy with control flags signals the running instance and exits immediately.[^agents-arch] This is the project's only documented integration surface:

```bash
# Toggle recording on/off in the already-running instance
handy --toggle-transcription

# Toggle recording with post-processing
handy --toggle-post-process

# Cancel an in-flight operation
handy --cancel

# Startup-only flags
handy --start-hidden       # no main window
handy --no-tray            # no tray icon
handy --debug              # verbose logging
```

On macOS, you must invoke the binary inside the bundle directly: `/Applications/Handy.app/Contents/MacOS/Handy --toggle-transcription`.[^readme-cli]

On Linux/macOS, the same actions are available via Unix signals — useful for Wayland window managers that own their own keybindings:[^readme-cli][^docs-cli]

| Signal    | Action                                    |
| --------- | ----------------------------------------- |
| `SIGUSR2` | Toggle transcription                      |
| `SIGUSR1` | Toggle transcription with post-processing |

```bash
pkill -USR2 -n handy
```

### "API surface"

There is **no public library API**. The Rust backend uses Tauri commands defined in `src-tauri/src/commands/` (`audio.rs`, `history.rs`, `models.rs`, `transcription.rs`, `mod.rs`) for internal IPC with the React frontend.[^commands-dir] These are not stable, exported, or documented as embedding points. A `tauri-specta`-generated TypeScript bindings file (`src/bindings.ts`) exists, but only for the bundled frontend.[^agents-arch]

If you want programmatic access from outside the app, your options are: (1) drive the existing app via the CLI/signal interface, (2) install the Raycast extension as a model for that integration pattern,[^readme-integrations] or (3) fork the code and rip out the pipeline you need (e.g., the `transcribe-rs` crate is independently published and can be used directly).[^cargo-toml]

### Portable mode[^portable-rs]

When a file named `portable` (containing the magic string `Handy Portable Mode`) is placed next to the executable, all user data — settings, models, recordings, database, logs — is written to a sibling `Data/` directory instead of the OS app-data location. Useful for thumb-drive installs or for shipping a pre-configured Handy alongside another app.

### Custom models[^readme-custom-models]

Any Whisper GGML `.bin` file can be dropped into the user's `models/` directory (`~/Library/Application Support/com.pais.handy/models/` on macOS, `%APPDATA%\com.pais.handy\models\` on Windows, `~/.config/com.pais.handy/models/` on Linux) and Handy will auto-discover it on next launch. This is the easiest path for using a fine-tuned model.

---

## Relevance to a note-taking app

For an accessibility-first note-taking app for college students/academics, Handy is interesting in **two very different ways** depending on what you actually want:

### 1. As a system-wide dictation utility you recommend or bundle alongside the app

This is the strongest fit and what Handy is built for. Concretely:

- **Dictation for students with motor accommodations** (RSI, dystonia, paralysis, limb difference): Handy provides global push-to-talk into any text field, including yours. Because it pastes into the focused field via OS-level keystroke/clipboard, it works in your Electron/Tauri editor with zero integration work from your side.[^readme-howitworks]
- **ADHD-friendly capture**: hold a key, dump a thought into a note, release. The lack of UI friction matches the "external brain" use case well, and the `--toggle-transcription` CLI flag means your app could expose a one-click "start dictating into this note" button that shells out to a running Handy instance.[^readme-cli]
- **Autism-friendly verbal-to-written translation**: post-processing through an LLM with a custom prompt (e.g., "rewrite as a clear, organized paragraph; preserve specialized terms") lets users separate "thinking out loud" from "publishable text."[^postproc-docs]
- **Offline / privacy-respecting**: transcription runs locally, which matters for students typing lecture notes containing other people's voices or sensitive personal info. This is harder to claim with browser-based Web Speech API alternatives, which usually phone home to Google.[^readme-howitworks]
- **Custom-words dictionary** lets users teach the model their professors' names, course codes, jargon, and other domain terms that off-the-shelf ASR mangles — useful for academic vocabulary.[^docs-advanced]
- **Multilingual support** via Whisper (99+ languages) or Parakeet V3 (~25 European languages), and a Mandarin-optimized Breeze, Russian-optimized GigaAM, and East-Asian-language SenseVoice variants — relevant for international students.[^docs-models]

### 2. As code/architecture to embed or fork into your own app

This is **a much weaker fit** as-is, but the building blocks are useful:

- **Handy is a Tauri app**, not a library. There is no exposed JavaScript/Node API. The intended integration surface is the CLI, not import statements.[^commands-dir]
- **The component crates *are* independently usable** from Rust. If your note-taking app is Tauri-based, you could pull in `transcribe-rs`,[^cargo-toml] `whisper-rs`, `vad-rs`, `cpal`, `rubato`, and replicate Handy's pipeline directly inside your app's Rust backend — exactly the "forkability" the project's README invites.[^readme-why] Handy itself is the reference implementation of that stack.
- **If you ship Electron instead of Tauri**: you cannot reuse the Rust backend directly. You would either need to (a) spawn Handy as a sidecar process and control it via CLI flags, or (b) bind to `whisper.cpp` / `transcribe-rs` from Node via N-API yourself.
- **License is friendly to either path**: MIT permits including the source, modified or unmodified, in an AGPL application as long as the MIT notice is preserved in your distribution.[^license-file]

### Accessibility caveats to flag

- Handy's *own UI* (the settings window) is built with React + Tailwind. I did not audit its WCAG conformance, and the README/docs make no specific WCAG claim despite the project being framed as accessibility tooling. If you're recommending it to users with WCAG-AAA needs, the settings UI is an unknown.
- The recording overlay is a separate floating window and is known to cause focus-stealing issues on Linux/Wayland — the documented workaround is to set "Overlay Position" to "None" and use audio feedback instead.[^readme-linux-notes] For users with vestibular sensitivity or screen-reader users, the overlay's visual-only feedback is also a concern; the audio-feedback option is a meaningful alternative.

---

## Things to know

### Maturity & activity signals[^repo-api]

- **Stars:** ~22,172 (very high)
- **Forks:** 1,838
- **Contributors:** ~10+ active; the maintainer `cjpais` has 467 commits, followed by `vladstudio` (22), `VirenMohindra` (17), `xilec` (12). This is a strongly **single-maintainer-driven project** with a long tail of small contributors.[^contributors]
- **Latest release:** v0.8.3 on 2026-04-28. Release cadence has been roughly every 2–4 weeks since early 2026, with 16+ releases in the v0.7.x / v0.8.x series.[^releases]
- **Last commit:** 2026-05-23 (very recent, actively maintained).[^repo-api]
- **Open issues:** 158, including some long-running known issues (Whisper model crashes on certain Windows/Linux GPU configs; Wayland support limitations).[^readme-issues][^open-issues]
- **Pre-1.0**: still 0.x versioned. Expect breaking changes to settings/storage formats between minor versions (the `portable.rs` source includes explicit migration code for a v0.8.0 marker-file format change).[^portable-rs]

### Platform support[^readme-platforms]

- **macOS:** Intel and Apple Silicon. Metal acceleration for Whisper. Minimum macOS 10.15.[^tauri-conf]
- **Windows:** x64 only. Vulkan + DirectML acceleration for Whisper. Code-signed releases.[^cargo-toml][^tauri-conf]
- **Linux:** x64 only. Vulkan + OpenBLAS acceleration. **Wayland support is partial** — requires `wtype` or `dotool` for reliable text input, global shortcuts must be configured through the compositor instead of in-app, and the overlay window is recommended to be disabled.[^readme-linux-notes]
- **No mobile.** Tauri targets that exclude `android`/`ios` are explicitly excluded from autostart/global-shortcut/single-instance/updater plugins in `Cargo.toml`.[^cargo-toml]

### Does it work inside Electron or Tauri?

- **Electron:** No — Handy is a separate Tauri app, not an embeddable component. You would interact with it as an external process via its CLI. Its Rust crate dependencies (`whisper-rs`, `transcribe-rs`, `cpal`) are not usable from Node without writing N-API bindings yourself.
- **Tauri:** Same situation at the *application* level (Handy is its own app), but if your own app is also Tauri/Rust, the underlying crates *are* directly reusable in your `src-tauri/Cargo.toml`. `transcribe-rs` is published on crates.io at v0.3.8.[^cargo-toml]

### Performance & hardware characteristics[^readme-sysreq][^docs-models]

- **Parakeet V3:** runs CPU-only, ~5× real-time on a mid-range Intel i5. Recommended minimum: Intel Skylake (6th gen) or equivalent AMD. ~478 MB model file. Auto language detection.
- **Whisper Small / Medium / Turbo / Large:** 487 MB / 492 MB / 1.6 GB / 1.1 GB respectively. Wants a GPU (Metal/Vulkan/DirectML) for real-time use. Whisper crashes on certain Windows/Linux GPU configs are an open known issue.
- **Silero VAD model:** small (~few MB), used for silence-stripping before transcription.

### Dependencies of note[^cargo-toml]

- Tauri 2.10.2 with several patched crates pointing at the maintainer's `cjpais/tauri.git` fork on branch `handy-2.10.2` — meaning the project ships with a non-vanilla Tauri runtime. Worth flagging if you're security-auditing the supply chain.
- `rdev` from a `rustdesk-org` fork (also non-canonical).
- `vad-rs` from the maintainer's own fork.
- `rodio` from the maintainer's own fork.
- `tauri-nspanel` from `ahkohd/tauri-nspanel` on branch `v2.1` (used for the macOS overlay).
- Frontend: React 18, Tailwind 4, Zustand, i18next, Zod, sonner, lucide-react.[^package-json]
- 17 languages currently translated (en, de, es, fr, ja, ru, zh, pt, and more), enforced by an ESLint plugin that bans hardcoded JSX strings.[^agents-arch]

### Security notes

- Release artifacts are signed with Tauri updater's minisign-compatible signature format; a verification recipe is in the README.[^readme-verify]
- Open security issue #1384: "Asset Protocol scope allows reading arbitrary files from filesystem" — currently the `assetProtocol` scope in `tauri.conf.json` is set to `"**"` (allow everything), which is consistent with the issue.[^tauri-conf][^open-issues]
- Sends no telemetry today; opt-in analytics is on the roadmap.[^readme-roadmap]

### Other gotchas

- Linux startup can fail without `libgtk-layer-shell0`; workarounds include `HANDY_NO_GTK_LAYER_SHELL=1` and `WEBKIT_DISABLE_DMABUF_RENDERER=1` environment variables.[^readme-linux-notes]
- Parakeet outputs numbers as English words ("twenty twenty-five"), not digits — Whisper outputs digits.[^docs-models] Likely matters for note-taking math/lab contexts.
- "Direct Input" paste method does not respect non-US keyboard layouts (AZERTY/QWERTZ → garbled output).[^paste-docs]
- Some open issues touch ongoing bugs you'd inherit if you forked: a JetBrains Rider compatibility bug (#1421), persistent low CPU usage after recording stops (#1418), high CPU when overlay hits modern-standby states (#1371).[^open-issues]

---

## Summary of fit

For an accessibility-focused note-taking app aimed at college students with ADHD/autism, **Handy is most useful as an external dictation companion** that you point users at or optionally bundle, rather than as a library to embed. License-wise it is fully compatible with an AGPL distribution. The underlying Rust crates (especially `transcribe-rs`, `whisper-rs`, `vad-rs`, `cpal`) are independently reusable if your app is Tauri/Rust and you want to build first-party in-app dictation modeled on Handy's pipeline.

---

[^repo]: GitHub API `repos/cjpais/Handy`, retrieved 2026-05-23: `html_url` field.
[^site]: Linked from the README and `repository.homepage` in GitHub metadata.
[^license-readme]: README, "License" section: "MIT License - see [LICENSE](LICENSE) file for details."
[^license-file]: `LICENSE` file at <https://github.com/cjpais/Handy/blob/main/LICENSE>, fetched via the GitHub Contents API and decoded; full text begins "MIT License / Copyright (c) 2025 CJ Pais" followed by the standard MIT permission grant and warranty disclaimer. Verified directly, not from a summary.
[^readme-arch]: README, "Architecture" section.
[^readme-why]: README, "Why Handy?" section.
[^readme-howitworks]: README, "How It Works" section.
[^agents-arch]: `AGENTS.md` in repo root, "Architecture Overview" and "Application Flow" sections.
[^cargo-toml]: `src-tauri/Cargo.toml` in repo root — `[dependencies]` and target-specific dependency tables. Notable: `transcribe-rs = { version = "0.3.8", features = ["whisper-cpp", "onnx"] }` with platform-specific feature variants (`whisper-vulkan` on Windows/Linux, `whisper-metal` on macOS, `ort-directml` on Windows). Several dependencies pinned to git forks: `rdev` (rustdesk-org fork), `vad-rs` (cjpais fork), `rodio` (cjpais fork), `tauri-nspanel` (ahkohd fork). Tauri runtime crates patched via `[patch.crates-io]` to the maintainer's `cjpais/tauri.git` branch `handy-2.10.2`.
[^readme-linux-notes]: README, "Linux Notes" section.
[^paste-docs]: <https://handy.computer/docs/paste-methods> — six methods documented: Clipboard, Ctrl+Shift+V, Shift+Insert, Direct Input, None, External Script (Linux only).
[^postproc-docs]: <https://handy.computer/docs/post-processing>.
[^readme-cli]: README, "CLI Parameters" section.
[^readme-integrations]: README, "Integrations" section — Raycast extension by @mattiacolombomc.
[^readme-quickstart]: README, "Quick Start" → "Installation" section.
[^docs-getting-started]: <https://handy.computer/docs/getting-started>.
[^docs-models]: <https://handy.computer/docs/models>.
[^build-md]: `BUILD.md` in repo root.
[^docs-advanced]: <https://handy.computer/docs/advanced> — custom-words dictionary, overlay configuration, output methods, history management.
[^commands-dir]: GitHub Contents API listing of `src-tauri/src/commands/` — files: `audio.rs`, `history.rs`, `models.rs`, `transcription.rs`, `mod.rs`. These are Tauri command handlers for internal frontend↔backend IPC, not a stable public API.
[^portable-rs]: `src-tauri/src/portable.rs`, retrieved via GitHub Contents API. Doc comment: "When a file named `portable` exists next to the executable, all user data (settings, models, recordings, database, logs) is stored in a `Data/` directory alongside the executable instead of `%APPDATA%`." Includes migration logic for the v0.8.0 empty-marker format.
[^readme-custom-models]: README, "Custom Whisper Models" section.
[^repo-api]: GitHub API `repos/cjpais/Handy`, retrieved 2026-05-23: `stargazers_count` 22172, `forks_count` 1838, `open_issues_count` 158, `pushed_at` 2026-05-23T04:05:16Z, default branch `main`, license `MIT`.
[^contributors]: GitHub API `repos/cjpais/Handy/contributors?per_page=10`, retrieved 2026-05-23. Top contributors by commit count: cjpais (467), vladstudio (22), VirenMohindra (17), xilec (12), jacksongoode (7), ferologics (6), Maicon-Moreira (4), kakapt (4), y0usaf (4), AlexanderYastrebov (3).
[^releases]: GitHub API `repos/cjpais/Handy/releases`. Most recent 16 releases listed run from v0.7.1 (2026-02-01) to v0.8.3 (2026-04-28).
[^readme-issues]: README, "Known Issues & Current Limitations" section — calls out Whisper model crashes on certain configurations and limited Wayland support as "Help Wanted" major issues.
[^open-issues]: GitHub API `repos/cjpais/Handy/issues?state=open`, retrieved 2026-05-23. Sample of recent open issues includes #1428 (Windows Store listing), #1423 (tray icon bug), #1421 (JetBrains Rider compatibility), #1418 (persistent CPU after recording), #1387 (macOS multi-Space overlay focus), #1384 (security: asset protocol scope), #1375 (Wayland multi-monitor overlay), #1371 (overlay CPU on modern standby).
[^readme-platforms]: README, "Platform Support" section: macOS (Intel + Apple Silicon), x64 Windows, x64 Linux.
[^tauri-conf]: `src-tauri/tauri.conf.json` — `bundle.macOS.minimumSystemVersion` is `10.15`; `app.security.assetProtocol.scope.allow` is `["**"]` (relevant to security issue #1384); `bundle.windows.signCommand` uses Azure trusted-signing CLI; `plugins.updater` endpoints point to the GitHub Releases `latest.json`.
[^readme-sysreq]: README, "System Requirements/Recommendations" section.
[^package-json]: `package.json` in repo root — version `0.8.3`, depends on React 18.3.1, Tailwind 4.1.16, Zustand 5.0.8, i18next 25.7.2, Zod 3.25.76, sonner 2.0.7, lucide-react 0.542.0; Tauri JS plugins for autostart, clipboard-manager, dialog, fs, global-shortcut, opener, os, process, sql, store, updater. Build tooling is Bun + Vite + Playwright.
[^readme-verify]: README, "Verify Release Signatures" section — uses Tauri updater's minisign format; verification recipe uses `minisign -Vm` with the pubkey from `src-tauri/tauri.conf.json`.
[^readme-roadmap]: README, "Roadmap & Active Development" → "In Progress" → "Opt-in Analytics".
[^docs-cli]: <https://handy.computer/docs/cli>.
