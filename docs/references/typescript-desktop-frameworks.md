# TypeScript / JavaScript Desktop Frameworks — Alternatives Beyond Electron and Tauri

**Status:** Research note, May 2026.
**Audience:** Engineers evaluating runtime options for an accessibility-first, AGPL-3.0 note-taking app for college students/academics.

## Why this document exists

Our current bias is Electron, for three reasons we've already documented elsewhere: (1) the bundled Chromium gives the strongest accessible-tree exposure of any web-based runtime to JAWS, NVDA, VoiceOver, and AT-SPI; (2) we are already shipping ~300–400 MB of Python sidecars (Docling, markitdown, faster-whisper, RapidOCR/MinerU, Supertonic/Piper), so the ~150 MB Chromium tax is small in proportion; and (3) every prior-art accessibility-grade desktop app we trust — VS Code, Slack, Obsidian, Logseq, Standard Notes, Joplin — is Electron. Tauri was rejected because its system-webview architecture (WebView2 on Windows, WebKitGTK on Linux) gives weaker and more variable a11y exposure.

This document evaluates the *other* JS/TS desktop runtimes — every entry from the candidate list a teammate compiled, plus a few obvious 2025–2026 additions — against the same rubric, with the explicit question: *is any of them a credible win over Electron for this specific app?*

### Rubric (short form)

- **A11y first.** Real accessible tree exposed to UIA / NSAccessibility / AT-SPI, tested with NVDA / JAWS / VoiceOver / Orca. Custom-drawn engines without a real a11y tree are disqualified for the editor surface.
- **Rich editor surface.** Must host TipTap / Lexical / CodeMirror 6 / ProseMirror unmodified on a real DOM.
- **PDF.js & WebAudio.** DOM + canvas + workers; WebAudio for capture/playback.
- **OS plumbing.** Global hotkey, system tray, notifications, autostart, file watching.
- **Packaging & signing.** `.dmg` / `.exe` / `.AppImage` with code-signing and macOS notarization paths.
- **AGPL-3.0 compatibility** of the runtime and its dependencies.

### Taxonomy

I'll organise candidates into these families and refer back to the taxonomy in each section:

- **(A) Full-Chromium runtime.** Electron, NW.js. Bundled Chromium, pinned version, ~120–150 MB baseline, best-in-class a11y because you inherit Chromium's accessible tree.
- **(B) System-webview.** Tauri, DeskGap, Neutralinojs, Astrodon, webview_deno, electrino, modern-hta. Small bundle, a11y inherited from whichever webview the OS provides — varies considerably and is the central caveat for this family.[^webview2-a11y][^wails-linux]
- **(C) Qt / libui-bound JS.** NodeGui, Proton Native, Vuido, Avernakis. Native widgets, native a11y *if* the JS binding layer exposes the underlying toolkit's a11y APIs (often it doesn't). Cannot host TipTap/PDF.js without a real webview anyway.
- **(D) Novel / experimental runtimes.** Electrobun (Bun + Zig + system webview), Gluon (spawns system browser), Graffiti (Node.js HTML/CSS in Zig), nidium (mobile-focused), modern-hta (HTA on Windows). License-disqualified entries in this family (Sciter.JS, ProtonShell, WelsonJS) are listed in the appendix.
- **(E) Vue/React meta-frameworks.** Quasar. Not a runtime — wraps Electron/Tauri/Capacitor. UI-layer choice, not a runtime choice.

---

## Per-framework evaluation

### Electrobun

- Repo: <https://github.com/blackboardsh/electrobun>. License: **MIT** (Blackboard Technologies Inc., 2024), confirmed via LICENSE file.
- Family: (D) novel — Bun + Zig + system webview, with optional CEF bundling.
- What it is: a single-vendor (Blackboard / Jared Loosli) attempt to build "Electron-but-tiny-and-Bun-native": main process runs Bun TypeScript, webviews use WKWebView on macOS / WebView2 on Windows / WebKitGTK 4.1 on Ubuntu 22.04+. Native bindings in Obj-C, C++, and Zig. Self-extracting bundles with ZSTD compression target ~14–16 MB. Has a `bundleCEF` flag for opting *into* bundled Chromium when consistency matters more than bytes.[^electrobun-readme]
- Rendering: by default the system webview; optionally bundled CEF (Chromium Embedded Framework). Also ships custom `<electrobun-webview>` and `<electrobun-wpgu>` elements that composite OOPIFs and native WebGPU surfaces. Three.js and Babylon.js adapters that work in Bun.
- **Accessibility.** Open issue #195 "Screen readers do not focus on the loaded window" was filed Feb 2026 and remains open, unassigned, unlabelled.[^electrobun-195] That is the *only* a11y-related issue in the repo. There is no documented UIA / NSAccessibility / AT-SPI strategy beyond "whatever the system webview gives you." On Windows that means inheriting WebView2's history of complete screen-reader inaccessibility — Microsoft's own tracker (WebView2Feedback #2330) documented in 2022 that WebView2 was "completely inaccessible with all of the screen readers (NVDA, JAWS, and partially with Narrator too)"; while NVDA has since added app-module support for `msedgewebview2.exe`, the underlying tree exposure remains weaker and more variable than first-party Chromium.[^webview2-a11y] On Linux WebKitGTK historically had the AtspiText / "screen reader doesn't see the document until user tabs in" bug also seen in Wails and Tauri.[^wails-linux] On macOS WKWebView has well-known VoiceOver focus-reset bugs that Apple has not fully fixed.[^wkwebview-vo]
- Editor hosting: webview is real WebKit/Chromium/WebKitGTK, so TipTap/Lexical/CodeMirror 6 in the webview run normally. The main process uses Bun, which is mostly Node-compatible — `chokidar`, OpenAI/Anthropic SDKs, etc. work — but some Node-native modules (anything with raw `node-gyp` bindings) can hit Bun-compat edges. As of mid-2026 most editor libraries are pure ESM/CJS and run fine; the friction is in the main-process side (e.g., some Electron-specific NPM packages don't have Bun-friendly equivalents).
- IPC: typed RPC between main and webview processes; OOPIF model.
- Packaging: solution-in-a-box — self-extracting bundles, bsdiff-based delta updates as small as 4 KB, app signing tooling included.
- Maintenance: very active (v1.18.x in May 2026; commits weekly; ~12 k stars, 315 forks). Single-vendor risk: Blackboard Technologies is small.
- **Verdict: Plausible only if the a11y story improves.** Today the open #195 issue plus the WebView2/WebKitGTK inheritance means it does *not* meet our accessibility floor. The right framing: revisit Electrobun if (i) `bundleCEF` becomes the documented default for accessibility-sensitive apps, (ii) #195 is closed with a real fix, (iii) Bun's Node-compat matures enough that no editor-ecosystem package surprises us.

### Gluon

- Repo: <https://github.com/gluon-framework/gluon>. License: MIT.
- Family: (D) novel — spawns the user's installed browser (Chrome/Edge/Firefox) and talks to it via CDP/Firefox DevTools Protocol. Backend is Node.
- **Status: archived February 2024.**[^gluon-archived] No longer maintained.
- A11y: would inherit whichever browser the user has installed — best case Chromium-grade, worst case "user doesn't have a supported browser." But this is moot.
- **Disqualified** *also* on UX grounds: "open a tab in the user's Chrome" is not a single-app-window experience for a daily-driver note-taking app. Even before the archive, Gluon would have been wrong for us.

### Neutralinojs

- Repo: <https://github.com/neutralinojs/neutralinojs>. License: **MIT-with-extra**, listed as "Other" by GitHub — the LICENSE file is MIT-flavoured but worth re-reading before AGPL distribution.
- Family: (B) system-webview. Uses WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux. Backend is a small C++ server, not Node; the JS client lib talks to it over WebSocket.
- Status: actively maintained — v6.7.0 April 2026, nightly builds, 8.5 k stars.[^neutralino-releases]
- A11y: inherits the system webview, with all the caveats above. Bundle is ~2 MB uncompressed.
- IPC: WebSocket + JSON between webview and bundled C++ "Neutralino server." Extensions can be written in any language — easy to spawn Python sidecars.
- Editor: real WebView2/WKWebView/WebKitGTK can host TipTap and friends just fine.
- Python sidecar story is *actually* one of its strengths — extensions are first-class.
- **Verdict: Weak for our app.** It's a smaller Tauri with a less polished ecosystem. The webview a11y caveats kill it for the same reason Tauri lost. If we ever ship a system-webview product we'd pick Tauri over Neutralino purely for community size and tooling maturity.

### NW.js

- Repo: <https://github.com/nwjs/nw.js>. License: **MIT**.
- Family: (A) full-Chromium — Electron's older sibling. Bundled Chromium pinned per release.
- Status: **alive and actively tracking Chromium.** Latest stable v0.111.3 (May 17 2026) is Chromium 148 + Node 26.1.0; main branch commits visible the day this was written show ongoing Chromium 149 integration work.[^nwjs-versions][^nwjs-commits] Maintainer Kevin Fan (GnorTech) and contributors actively push.
- A11y: same Chromium accessible tree as Electron — UIA on Windows, NSAccessibility on macOS, AT-SPI on Linux, plus the Chrome-specific live region/aria-relations logic that JAWS and NVDA know intimately.[^electron-a11y] An accessibility-mode flag exists; auto-enables in the presence of AT.[^nwjs-a11y-issue]
- Editor hosting: identical to Electron — full DOM. PDF.js, WebAudio, the works.
- IPC: NW.js has the "Node-in-DOM" model, where the renderer can directly `require()` Node modules. Convenient, but contradicts security best practice and complicates the kind of preload/contextIsolation hardening Electron has standardised on. For an AGPL-licensed open-source app where end users *can* and *should* audit, this matters less than for a closed product.
- Packaging: nw-builder and similar — workable but the ecosystem (autoupdate, native installers, native modules rebuild) is *materially less polished* than electron-builder / Electron Forge in 2026.
- **Verdict: Plausible — the only realistic *full-Chromium* alternative to Electron**, and the only one on this list that matches Electron's a11y baseline. Reasons we'd still pick Electron: bigger community, more accessibility-grade prior art, electron-builder & Electron Forge maturity, the security model is the default rather than the harder path. NW.js is a fallback if Electron specifically becomes untenable (it won't).

### NodeGui

- Repo: <https://github.com/nodegui/nodegui>. License: **MIT**.
- Family: (C) Qt-bound JS. **Now Qt6** (README).[^nodegui-stars] React, Vue, Svelte bindings exist as separate packages.
- Status: actively maintained — v0.74.2 May 2026, 9.2 k stars, regular CI builds for darwin-arm64, win32, linux.[^nodegui-stars]
- **A11y.** Qt itself has a *good* accessibility story in theory — `QAccessibleInterface` exposes a tree to UIA on Windows, NSAccessibility on macOS, AT-SPI on Linux. *In practice*, Qt 5.11's UIA migration regressed several things and the road back has been slow; Qt 6 is better but bugs remain (e.g., the still-open Qt forum thread "QTextEdit and QPlainTextEdit on Windows: NVDA repeats previous line instead of announcing 'blank'" reproduces on PySide6 *and* PyQt6, i.e., it's a Qt-level bug not a binding bug).[^qt-textedit-bug] **Crucially, no evidence NodeGui's bindings expose Qt's a11y API to JavaScript**: a code search of the repo for `QAccessible`, `accessibility`, or `a11y` returns no relevant results. The bindings appear to not wrap Qt's a11y at all — meaning even if Qt itself would expose a tree, you cannot drive it from your TypeScript app code. The accessible tree exists only insofar as Qt's *default* widget implementations register themselves; any custom-drawn or custom-styled control would be a black box to ATs.
- Editor hosting: **Cannot host TipTap / Lexical / CodeMirror 6 unmodified.** Qt widgets are not a DOM. You can embed a `QWebEngineView` (Chromium) for HTML content — but at that point you've reintroduced ~150 MB Chromium and lost the bundle-size argument that made you consider NodeGui.
- PDF.js: same — needs a WebEngine view; native PDF means a different library.
- IPC: in-process — JS calls into the Qt binding directly. No multi-process isolation by default.
- Packaging: nodegui-packer wraps it; signing/notarization is up to you.
- **Verdict: Weak.** NodeGui is the *category* of "real native widgets with native a11y" that *should* be a viable Electron alternative. In practice (a) Qt6 has lingering screen-reader bugs even in first-party Qt apps, (b) the NodeGui binding does not expose Qt's `QAccessible` to JS so we cannot label custom widgets correctly, and (c) it cannot host the editor stack without re-embedding Chromium. For a notes app whose entire UX is a rich text editor, NodeGui is solving the wrong problem.

### Astrodon

- Repo: <https://github.com/astrodon/astrodon>. License: MIT. Family: (B) system-webview, Deno + Tauri-based.
- Status: **unmaintained** since March 2023.[^astrodon-status]
- macOS support never shipped in the alpha.
- **Disqualified — unmaintained, never feature-complete.**

### webview_deno

- Repo: <https://github.com/webview/webview_deno>. License: MIT. Family: (B) system-webview.
- Status: latest commit Feb 2025; the underlying `webview` C library is the low-level wrapper that Tauri/Wails/Electrobun all eventually descend from on Linux.
- A11y inherits the system webview, with the same caveats as Tauri/Neutralino.
- IPC: bare bones — `eval` from Deno, callback from JS. No preload/contextIsolation, no security model.
- Editor: in principle fine since it's a real webview; in practice no app of consequence ships on it.
- **Verdict: Weak.** Hobby tier — fine for a 200-LOC tool, wrong abstraction for a production app.

### electrino

- Repo: <https://github.com/pojala/electrino>. License: MIT. Family: (B) system-webview.
- Status: **effectively dead** — last push December 2022, 4.4 k stars but no activity for 3+ years.
- macOS-only at present.
- **Disqualified — unmaintained.**

### DeskGap

- Repo: <https://github.com/patr0nus/DeskGap>. License: MIT. Family: (B) system-webview + Node.
- Status: **archived December 2024.**[^deskgap-archived] Was at v0.3.0-beta2 when archived.
- Used WKWebView / IWebBrowser2 (note: IWebBrowser2 is the old Trident MSHTML, not WebView2 — so the Windows a11y story was worse than current peers') / WebKitGTK.
- **Disqualified — archived.**

### Proton Native

- Repo: <https://github.com/kusti8/proton-native>. License: MIT. Family: (C) libui-node originally, then rewritten on Qt bindings.
- Status: last commit January 2023. ~10.9 k stars but the project is dormant.
- Same a11y story as NodeGui, with worse maintenance.
- **Verdict: Disqualified — functionally dead, and even if revived would have NodeGui's editor-hosting problem.**

### Vuido

- Repo: <https://github.com/mimecorg/vuido>. License: MIT. Family: (C) libui-node-based.
- Status: last commit March 2023. libui-node itself is intermittent at best.
- libui has a *thin* a11y story (essentially MSAA on Windows, native widgets on Cocoa). Not enough for our floor; also can't host TipTap.
- **Verdict: Disqualified — unmaintained + wrong shape for an editor.**

### Avernakis (Ave-Nodejs)

- Repo: <https://github.com/qber-soft/Ave-Nodejs>. License: MIT.
- Status: low star count (86), last commit Feb 2023; Chinese-developed with most docs in Chinese (English docs partial).
- Wraps the C++ Avernakis SDK via NAPI; UI toolkit is custom (own widget library, not Qt or libui).
- A11y: the Avernakis SDK does not document UIA exposure publicly in English. Unverified.
- **Verdict: Disqualified for our team** — sparse English documentation, single-vendor, unverifiable a11y story, can't host TipTap.

### modern-hta

- Repo: <https://github.com/joncasey/modern-hta>. License: MIT.
- Brings modern JS transpilation to HTAs. Still HTA, still Windows-only, still Trident.
- **Disqualified — Windows-only.**

### nidium

- Repo: <https://github.com/nidium/Nidium>. License: "Other."
- Mobile-first rendering engine using Skia and Mozilla SpiderMonkey. Last commit November 2019.
- Not a desktop framework in any current sense.
- **Disqualified — out of scope (mobile) and abandoned.**

### Graffiti

- Repo: <https://github.com/cztomsik/graffiti>. License: MIT. Family: (D) experimental — author describes as "hobby/research project, not yet intended for any use."
- An HTML/CSS engine in Zig for Node and Deno.
- Last commit November 2023.
- No a11y story; would need to be built from scratch on top of whatever AT-SPI/UIA/AX integration the author hasn't yet started.
- **Disqualified for production use — research project.**

### Quasar

- Repo: <https://github.com/quasarframework/quasar>. License: MIT.
- Family: (E) Vue meta-framework. Quasar generates SPA / SSR / PWA / Cordova / Capacitor / **Electron** / **Tauri** targets from one Vue codebase — it is *not* a runtime, it's a build mode selector on top of an existing runtime.
- Picking Quasar does not change the runtime decision; it changes the Vue-side ergonomics. Our a11y/editor analysis still hinges on whichever underlying runtime Quasar produces (Electron or Tauri).
- **Verdict: Out of scope as a runtime alternative. Reasonable Vue framework choice if we go Vue, agnostic between Electron and Tauri.**

### Tauri (comparative)

- For completeness — already evaluated; sticking with Tauri's rejection.
- Tauri 2.x is on Wry → WebView2 / WKWebView / WebKitGTK.
- The Tauri community has confirmed Linux a11y issues (Discussion #4535: Orca can't see the document until the user manually tabs in, traced to WebKit bug #268154[^wails-linux]) and a Tauri-specific NVDA regression in frameless windows (Issue #12901, still open as of search date).[^tauri-12901]
- For a Vue+Tauri shop, bundle is ~3 MB / ~50 MB RAM[^tauri-2026]. For our specific app, the a11y inheritance from system webviews is the disqualifier.

### Wails (comparative)

- Repo: <https://github.com/wailsapp/wails>. License: MIT. ~34 k stars.
- Go backend, system webview front end (TS-friendly). v3 alpha is the active line.
- **Same a11y caveats as Tauri.** Documented Linux focus-management bug;[^wails-linux] macOS works well for VoiceOver except in RTL textareas;[^wails-rtl] Windows depends on WebView2's evolving a11y posture.
- Go backend forces a polyglot stack that doesn't fit our "Node main process, Python sidecars, TS frontend" assumption — and the TS coverage in Wails is real but limited to the renderer side.
- **Verdict: Not in the running** for us. If we were a Go shop we'd consider it; we're not.

### Servo / Verso

- Verso repo: <https://github.com/versotile-org/verso>. License: Apache-2.0. ~5.4 k stars.
- Verso is a Servo-based browser experiment. Servo itself added screen-reader hooks in mid-2025.[^servo-2025]
- Servo embedding for desktop apps is still pre-1.0; no Tauri-like glue exists in production. AccessKit-based a11y is being wired through GTK and may eventually land in Servo embeddings — but as of May 2026 there is no shipping desktop framework for note-taking apps that uses Servo.
- **Verdict: Not yet a real option in 2026.** Track for 2027.

---

## Honest comparison table

| Framework | License | AGPL? | Family | Rendering | a11y verdict | Hosts editor? | Bundle | Active 2026? | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Electron** | MIT | yes | A | Chromium (pinned) | **Strong** (real UIA/AX/AT-SPI tree) | yes | ~150 MB | yes | **Strong (baseline)** |
| **NW.js** | MIT | yes | A | Chromium (pinned) | **Strong** (same as Electron) | yes | ~120 MB | yes | **Plausible** |
| **Electrobun** | MIT | yes | D | System webview (+ optional CEF) | Inherits webview; open SR bug | yes (in webview) | ~14–16 MB | yes (active) | **Plausible w/ caveats** |
| **NodeGui** | MIT | yes | C | Qt6 widgets | Partial; bindings don't expose QAccessible | **no** | ~25 MB | yes | **Weak** |
| **Tauri** | Apache-2.0 / MIT | yes | B | WebView2/WKWebView/WebKitGTK | Inherits — variable | yes | ~3–10 MB | yes | **Weak (for this app)** |
| **Wails** | MIT | yes | B | WebView2/WKWebView/WebKitGTK | Inherits — variable | yes | ~5–15 MB | yes | **Weak (and Go backend)** |
| **Neutralinojs** | MIT-ish ("Other") | likely yes (verify LICENSE) | B | System webview | Inherits — variable | yes | ~2 MB | yes (v6.7) | **Weak** |
| **DeskGap** | MIT | yes | B | WKWebView/IWebBrowser2/WebKitGTK | Inherits — and IWebBrowser2 is *legacy* Trident on Windows | yes | ~10 MB | **archived 2024** | **Disqualified (unmaintained)** |
| **Astrodon** | MIT | yes | B (Deno) | Tauri webviews | Inherits | yes | ~5 MB | **unmaintained** | **Disqualified (unmaintained)** |
| **webview_deno** | MIT | yes | B (Deno) | System webview | Inherits | yes (limited) | ~5 MB | low activity | **Weak** |
| **electrino** | MIT | yes | B | macOS system webview | Inherits | yes | small | **dead** | **Disqualified (unmaintained)** |
| **modern-hta** | MIT | yes | D | Trident MSHTML | Legacy MSAA only; Windows-only | n/a | tiny | low | **Disqualified (Windows-only)** |
| **Gluon** | MIT | yes | D | User's browser (spawn) | Inherits user browser | yes | <1 MB | **archived Feb 2024** | **Disqualified (unmaintained)** |
| **Avernakis** | MIT | yes | C | Custom C++ | Unknown / undocumented | no | small | dormant | **Disqualified (unverifiable)** |
| **Proton Native** | MIT | yes | C | libui/Qt | partial | no | small | dormant | **Disqualified (unmaintained)** |
| **Vuido** | MIT | yes | C | libui | partial | no | small | dormant | **Disqualified (unmaintained)** |
| **Quasar** | MIT | yes | E | (delegates) | (delegates) | (delegates) | (delegates) | yes | **Not a runtime** |
| **Servo/Verso** | Apache-2.0 | yes | D | Servo | AccessKit pending | unproven | n/a | yes (pre-prod) | **Not yet shippable** |

For frameworks disqualified on license grounds, see the appendix below.

---

## Deep dives on the most plausible non-Electron candidates

The shortlist of "could conceivably replace Electron for *this* app" is small: **NW.js, Electrobun, NodeGui**. Each gets a real look below. (Sciter.JS was a candidate on architectural grounds but its engine is closed-source and commercial — see the license-disqualified appendix.)

### Deep dive: NW.js

NW.js is, candidly, the only non-Electron option on this list that *today* meets our accessibility floor — because it ships the same Chromium that Electron does, against the same renderer process model, exposing the same accessible tree to every assistive tech we care about. Maintenance posture is healthier than the conventional wisdom suggests: as of May 2026 the team is on Chromium 148 stable / Chromium 149 in dev, with Kevin Fan committing several times a week. NW.js v0.111.3 (May 17 2026) and v0.111.0 (April 23 2026) both shipped on schedule.[^nwjs-versions]

Where NW.js loses to Electron in 2026 is not in the runtime itself but in the *ecosystem* around it. electron-builder and Electron Forge have absorbed roughly a decade of "how do you actually ship to end users" knowledge — code-signing, notarization, native module rebuilding for the bundled Node, autoupdate via Squirrel.Mac and Squirrel.Windows, asset bundling. NW.js's equivalents (`nw-builder`, third-party autoupdate libraries) work, but are materially less polished and have many fewer "stack overflow recipes per Friday afternoon at 5pm." Slack, VS Code, Obsidian, Logseq, Standard Notes, Joplin — every example of an accessibility-grade JS desktop app we'd point to as prior art uses Electron, not NW.js.

The notable architectural difference: NW.js has the "Node-in-DOM" model where the renderer can directly `require()` Node modules. Convenient, ergonomic, and exactly the security posture Electron has spent five major versions trying to *prevent.* For an open-source AGPL app where the threat model is "compromised npm dependency" rather than "untrusted remote HTML," this is less catastrophic than it sounds — but it does mean you forgo a real preload-script / context-isolation boundary unless you wire it yourself.

**Honest assessment.** NW.js would credibly replace Electron for an a11y-grade note-taking app *if* we hit a specific obstacle in Electron (a corporate-license drama, a security advisory we couldn't follow, an upstream Chromium regression Electron didn't patch). We don't have any of those obstacles. The right framing: NW.js is our *fallback*, not our destination. We pick Electron for the ecosystem; we know NW.js can carry the same app on the same Chromium if we ever need to switch.

### Deep dive: Electrobun

Electrobun is the most interesting *new* entry on this list. Jared Loosli's project ships Bun-native TypeScript in the main process, Zig and Obj-C/C++ in the native layer, and a system webview by default with optional bundled Chromium via `bundleCEF`. The numbers are striking: a hello-world bundle is ~14–16 MB; delta updates via bsdiff land in the 4 KB range; the dev loop is fast because Bun is fast. Maintenance posture is healthy too — v1.18.x landed in May 2026, ~12 k stars, weekly commits.[^electrobun-readme] Real apps ship on it: a public list in the README enumerates dozens (the comic book reader cbx-tool, the audio TTS demo, dictation tools, PDF editors). It is *not* a research project.

For us the open question is accessibility, and the answer is: not good enough today and on a roadmap that is not visible. Issue #195 ("Screen readers do not focus on the loaded window") was filed in February 2026 and remains open, unassigned, unlabelled. It is the *only* a11y issue in the tracker — meaning either no other user is testing with assistive tech, or other a11y problems are getting filed somewhere else.[^electrobun-195] On Windows, the system webview is WebView2, and WebView2's accessibility tree has been a years-long Microsoft project (issue WebView2Feedback #2330 documented complete inaccessibility to NVDA/JAWS/Narrator in 2022; NVDA shipped specific WebView2 app-module support in 2024–25 that partially mitigates this; the result is *better than it was, worse than first-party Chromium*).[^webview2-a11y] On macOS the WKWebView VoiceOver focus-reset bugs are well-documented.[^wkwebview-vo] On Linux WebKitGTK has the same AtspiText "screen reader sees nothing until you tab into the document" issue that bit Wails and Tauri.[^wails-linux]

There is one promising thing: `bundleCEF`. If you opt into Chromium Embedded Framework rather than the system webview, Electrobun becomes a Bun-flavoured Electron with a bundled (rather than system) Chromium. Accessibility then approaches Electron's, and the bundle size penalty (~100 MB extra for CEF) takes you to ~120 MB total — still smaller than Electron's ~150 MB. We have not seen any first-hand accessibility testing reports for Electrobun in `bundleCEF` mode.

Editor hosting is fine — TipTap/Lexical/CodeMirror 6 run in the webview unchanged. The main-process Bun side is where the friction lives: most of the Node-compat surface is covered, but anything with native bindings (`better-sqlite3`, `node-pty`, occasional `chokidar` edge cases on macOS, occasional ffi/native modules used by Python-sidecar IPC) can hit Bun edges.

**Honest assessment.** Electrobun would credibly compete with Electron for this app *if and only if* the following three conditions land:

1. Issue #195 is resolved with a real "Electrobun exposes the webview process's accessible tree to UIA/AX/AT-SPI" fix, not a one-off focus tweak.
2. `bundleCEF` becomes documented as the recommended default for accessibility-sensitive apps, with first-party guidance on signing/notarizing the bundled CEF.
3. We test the full editor stack (TipTap + ProseMirror + PDF.js worker + WebAudio) end-to-end against NVDA, JAWS, VoiceOver, and Orca and find no Bun-runtime gotchas.

None of those are unreasonable; none are guaranteed. Revisit in late 2026 / early 2027 when Electrobun's likely v2.x has settled.

### Deep dive: NodeGui

NodeGui is the most architecturally appealing alternative on paper: Qt6 native widgets, real cross-platform desktop a11y APIs underneath (`QAccessible` → UIA on Windows, NSAccessibility on macOS, AT-SPI on Linux), MIT license, healthy ~9.2 k stars, active maintenance (v0.74.2 in May 2026).[^nodegui-stars] The promise is "native widgets with real a11y, in TypeScript, without Chromium." It is the only project on this list that *could* be a true "native a11y, no webview" alternative if the parts lined up.

In practice three things don't line up:

**(1) Qt's a11y on Windows is good-but-not-perfect.** The 2018 migration from MSAA to UIA broke things that have been getting fixed slowly ever since. As of May 2026 there are still production-impact bugs — e.g., `QTextEdit` and `QPlainTextEdit` on Windows have NVDA repeating the previous line instead of announcing "blank" for empty lines, confirmed on Qt 6 in both PySide6 and PyQt6 (same bug, since it's in Qt itself, not the bindings).[^qt-textedit-bug] That is the *exact* widget we'd use if we tried to build the editor in NodeGui.

**(2) NodeGui's bindings do not expose `QAccessible` to JavaScript.** Code searches of the repo for `QAccessible`, `accessibility`, or `a11y` turn up no relevant exports. The default a11y registration that Qt does for built-in widgets *does* fire, so a stock `QPushButton` gets a UIA element — but any custom-drawn or custom-styled widget cannot be labelled, role-typed, or value-reported from your TypeScript code. For a notes app with custom toolbars, custom block widgets, custom toggles, this is fatal.

**(3) NodeGui cannot host the editor.** TipTap, Lexical, CodeMirror 6, PDF.js — all require a DOM. The only way to get a DOM into NodeGui is to embed Qt's `QWebEngineView`, which is a full Chromium build. At which point you have Electron with extra steps.

**Honest assessment.** Even if (2) were fixed tomorrow (a real `QAccessible` binding shipped in NodeGui v0.80), we still wouldn't pick NodeGui because of (3). For a *different* app — one whose UI was a tree-of-text-fields with custom native chrome and no rich text editor — NodeGui would be tempting. For a notes app, no.

---

## Verdict relative to Electron and Tauri

**Is there a TS/JS Electron alternative that's a credible win for this app?** No. Not in May 2026. Every system-webview framework inherits a worse-and-more-variable accessibility story than Chromium-the-Electron-bundles, and that's the floor we cannot move. Every "native widgets with TS bindings" framework either has a partial Qt a11y story (NodeGui) or has the wrong shape for an editor app (all of (C)). The single full-Chromium alternative (NW.js) matches Electron's a11y but loses on ecosystem maturity.

**What's the strongest non-Electron candidate and under what conditions would we switch?** **Electrobun, conditionally.** We'd switch to Electrobun in *late 2026 or 2027* if and only if all three conditions land: (i) issue #195 closes with a real "Electrobun forwards webview accessibility tree to UIA/AX/AT-SPI" fix, (ii) Electrobun's `bundleCEF` mode is the documented-default for accessibility-sensitive apps with first-party signing/notarization recipes, and (iii) we verify end-to-end editor + AT scenarios against NVDA, JAWS, VoiceOver, and Orca. Until then, Electron remains the right pick.

**For someone who insists on a non-Electron TS/JS solution, what's the least-bad option?** **NW.js, full stop.** It is the only project on this list that today gives Chromium's accessibility tree to a JS desktop app. Tauri is the popular advice; we don't recommend it because of the webview-inheritance ceiling for a11y. NodeGui is the "in theory cleanest" answer but doesn't host the editor and doesn't bind Qt's a11y to JS.

**Cluster of clearly-disqualified candidates** (and why):

- *Dead / unmaintained:* Astrodon, electrino, DeskGap, Gluon, Proton Native, Vuido, Graffiti (research only). Avernakis is dormant.
- *License incompatible with AGPL distribution:* see appendix.
- *Wrong platform scope:* modern-hta (Windows-only, HTA/WSH); nidium (mobile).
- *Not a runtime:* Quasar (build target wrapper over Electron/Tauri/Capacitor — agnostic about the underlying runtime decision).
- *Not yet shippable:* Servo / Verso (track for 2027).

---

## Things to know / cross-cutting gotchas

### System-webview accessibility inheritance — the category caveat

Every framework in family (B) — Tauri, Wails, Neutralinojs, DeskGap, Electrobun (default mode), Astrodon, webview_deno, electrino — inherits whatever a11y exposure the host OS's webview provides:

- **Windows / WebView2.** Better than it used to be. As of NVDA 2025.x there are specific app-module hooks for `msedgewebview2.exe` that route around the historical "WebView2 is completely inaccessible" problem documented in MicrosoftEdge/WebView2Feedback#2330.[^webview2-a11y] Still measurably less reliable than first-party Chromium for things like aria-live region updates and complex ARIA composites.
- **macOS / WKWebView.** Generally usable with VoiceOver, with well-known focus-reset and nested-view bugs that are not fully fixed by Apple.[^wkwebview-vo]
- **Linux / WebKitGTK.** Historically *bad*, getting better — major STF-funded a11y work landed in 2025 making "GNOME Web a fully accessible, fully sandboxed web browser."[^gtk-2025-a11y] But specific bugs like the AtspiText document-element issue (WebKit bug #268154) still bite Wails and Tauri apps.[^wails-linux]

The headline: in 2026 it is *no longer* true that "the system webview gives you free a11y" the way Chromium does. Treat any (B) framework as "accept the OS's a11y posture, and expect to fix things you cannot fix from inside the app."

### Bundle-size claims are misleading for our specific app

We will be shipping ~300–400 MB of Python sidecar payload (Docling + faster-whisper models + RapidOCR/MinerU + Piper/Supertonic voices). On *that* baseline, the difference between "Electron 150 MB" and "Electrobun 16 MB" is ~10 % of total install. For accessibility-floor reasons, paying that 10 % for the strongest a11y story is the right trade.

### Signing & notarization paths

- **Electron:** electron-builder + electron-osx-sign + electron-notarize — battle-tested.
- **NW.js:** nw-builder + manual signing — workable but smaller ecosystem.
- **Electrobun:** built-in tooling for bundle + sign + notarize. Newer; fewer recipes online.
- **NodeGui:** nodegui-packer + manual signing — you provide the apple-id and the notarytool calls yourself.
- **Tauri / Wails / Neutralino:** each has its own bundler. Tauri's is most mature in family (B).

### Autoupdate

- **Electron:** Squirrel.Mac, Squirrel.Windows, electron-updater wrapper. Industry standard.
- **NW.js:** rolled-your-own or third-party libraries. Less polished.
- **Electrobun:** bsdiff-based delta updates as small as 4 KB — *better* than Squirrel for this property if it works reliably.
- **Tauri / Wails:** built-in updater plugins, signed manifest model.
- **NodeGui:** rolled-your-own.

### Memory baselines (hello-world)

Approximate, varies wildly by OS and webview state:

- Electron / NW.js: 150–300 MB resident.
- Tauri / Neutralino / Wails: 50–150 MB resident.
- Electrobun (system webview): 80–200 MB resident.
- NodeGui: 50–100 MB resident.

For an app that loads a TipTap editor + several PDF.js workers + a long-lived audio pipeline, real-world memory will land at 400–800 MB regardless of framework once those are running.

### Licensing surprises (recap)

- **Neutralinojs:** "Other" license listed by GitHub — appears MIT-flavoured but verify the LICENSE file before distributing.

For frameworks excluded outright on license grounds, see the appendix below.

---

## Appendix — Disqualified on license

These frameworks were excluded from the main evaluation because their licenses are not compatible with AGPL-3.0 distribution. Listed for completeness so the next person doesn't re-research them.

- **Sciter.JS** — engine is closed-source commercial ($310–$2,720+ tiered, "Free" tier is "use of pre-compiled binaries with no warranties," not an OSS license). The BSD-3 SDK is irrelevant because the SDK is useless without the commercial engine. 2020 Kickstarter to open-source the engine raised ~10 % of goal and failed; no open-sourcing has been announced since.[^sciter-pricing][^sciter-kickstarter] **Cannot ship in an AGPL app.**
- **MōBrowser** (TeamDev) — closed-source; free for non-commercial use only, commercial license required for any product distribution. Distributing to college students is a commercial use under most readings.[^mobrowser-license] **Cannot ship in an AGPL app without paying for a commercial license** — and even then the AGPL terms conflict.
- **ProtonShell** — no license listed in the repo metadata. Under default copyright, all rights are reserved by the author. **Cannot be redistributed at all.**[^protonshell-nolicense]
- **React Native Desktop (status-im fork)** — no license listed in the repo metadata. Same default-copyright situation as ProtonShell. Also unmaintained since April 2021.
- **WelsonJS** — primary license is GPL-3.0, with MS-RL as fallback "if the GPL 3.0 license is not compatible with Microsoft products."[^welsonjs-license] MS-RL is OSI-approved but not GPL-compatible per the FSF, making the dual arrangement non-standard. Disqualified separately on cross-platform grounds anyway (Windows-only WSH/HTA + Trident MSHTML).

---

## Footnotes

[^sciter-pricing]: Sciter pricing page <https://sciter.com/prices/> — "Indie" $310 (Windows lifetime, 1-year source access), "Indie+" $620 (multi-platform lifetime), "Business" $1,620 (under-20-employees), "Business+" $2,720 (multi-platform + premium support), Enterprise++ custom. "Free" tier is "use of pre-compiled binaries with no warranties," not an open-source license.
[^sciter-kickstarter]: Kickstarter "Open Source Sciter Engine" by Andrew Fedoniouk a.k.a. c-smile, Sep–Oct 2020, target $130 k CAD, raised $13.2 k CAD (~10 %). KickTraq <https://www.kicktraq.com/projects/c-smile/open-source-sciter-engine/>.
[^electrobun-readme]: Electrobun README via GitHub API; confirmed bundle target ~14 MB, bsdiff updates ~4 KB, supports macOS 14+, Windows 11+, Ubuntu 22.04+ with `webkit2gtk-4.1`. `bundleCEF` flag for pinned Chromium; `bundleWGPU` for native GPU surface without webview.
[^electrobun-195]: <https://github.com/blackboardsh/electrobun/issues/195> — "Screen readers do not focus on the loaded window." Filed 2026-02-23; state: open as of fetch; no assignee, label, or PR.
[^webview2-a11y]: <https://github.com/MicrosoftEdge/WebView2Feedback/issues/2330> — "WebView2 control is completely inaccessible with screen readers (NVDA, JAWS and partially with Narrator too)," filed April 2022, labelled "tracked" by Microsoft. NVDA 2024+ release notes document app-module support for `msedgewebview2.exe` that partially mitigates; underlying tree exposure is still less reliable than Chromium proper. See also Knowbility analysis at <https://knowbility.org/blog/2023/accessibility-apis-part-3>.
[^wails-linux]: <https://github.com/wailsapp/wails/discussions/4535> — confirms screen reader on Linux (Orca) "does not work unless the app is manually clicked with the mouse." Root cause traced to WebKit bug <https://bugs.webkit.org/show_bug.cgi?id=268154>: "The top level document-web does not implement AtspiText on Linux and thus is not accessible until the user tabs into the document." Tauri inherits the same bug.
[^wkwebview-vo]: WKWebView VoiceOver focus-reset bug reproduction repo: <https://github.com/matt-curtis/WKWebView-Voiceover-Focus-Reset-Bug-Demonstration>. Apple Developer Forums thread <https://developer.apple.com/forums/thread/655069>. Open WebKit bug #203798 "WKWebView does not shift Accessibility Focus for Catalyst."
[^gluon-archived]: gluon-framework organization marked archived by admin 2024-02-23. Repo <https://github.com/gluon-framework/gluon> shows last push 2023-11-08.
[^neutralino-releases]: Neutralinojs latest stable v6.7.0 (2026-04-02), nightly auto-built 2026-05-23. Release notes confirm WebView2 static-link improvements, browser-arg passing, and Unicode-path fix history.
[^electron-a11y]: <https://www.electronjs.org/docs/latest/tutorial/accessibility/> — "Electron applications will automatically enable accessibility features in the presence of assistive technology (e.g. JAWS on Windows or VoiceOver on macOS)." `app.setAccessibilitySupportEnabled(enabled)` to expose Chrome's accessibility tree. JAWS aria-live region quirks documented at <https://github.com/FreedomScientific/standards-support/issues/602>.
[^nwjs-versions]: NW.js release blog — v0.111.3 released 2026-05-17 (Node 26.1.0, Chromium 148). v0.111.0 released 2026-04-23 (Chromium 148). v0.110.0 (2026-03-25, Chromium 147). v0.107.0 (2026-01-11, Chromium 144). Source: <https://nwjs.io/blog/>.
[^nwjs-commits]: Per GitHub API `repos/nwjs/nw.js/commits`, commits 2026-05-22 by GnorTech updating to Chromium 149.0.7827.22.
[^nwjs-a11y-issue]: NW.js issue #2272 "FeatureRequest: Enable Accessibility mode option" — confirms the same Chromium accessibility mode toggle is exposed in NW.js.
[^nodegui-stars]: NodeGui repo <https://github.com/nodegui/nodegui>: 9.2 k stars, MIT, v0.74.2 released 2026-05-03, last commit 2026-05-03, README explicitly states "NodeGUI is powered by Qt6."
[^qt-textedit-bug]: Qt Forum thread "Screen Reader Accessibility Issue on Windows: Repeats Previous Line Instead of Announcing 'Blank' for Empty Lines in PyQt6 QTextEdit and QPlainTextEdit Widgets," <https://forum.qt.io/topic/159911/>. Reproducer confirms bug is in Qt6 itself (reproduces on both PySide6 and PyQt6). Marked "Unsolved" as of fetch date.
[^astrodon-status]: Astrodon repo last push 2023-03-26; README contains an unmaintained notice. macOS support never shipped; "supposed to be fixed in the next release" per docs.
[^deskgap-archived]: DeskGap (`branchseer/DeskGap` and the older `patr0nus/DeskGap` reference) archived 2024-12-25 per repo metadata. Final version v0.3.0-beta2.
[^welsonjs-license]: WelsonJS README — "the default license for the WelsonJS project is GPL 3.0, but if the GPL 3.0 license is not compatible with Microsoft products, it is subject to the MS-RL license." Per FSF, MS-RL is a free software license but not GPL-compatible.
[^protonshell-nolicense]: <https://github.com/r57zone/ProtonShell> — `licenseInfo: null` per GitHub API. No LICENSE file present in the repo tree.
[^mobrowser-license]: <https://teamdev.com/mobrowser/> pricing — "Free for non-commercial use" with commercial license required for production distribution. Closed-source.
[^tauri-12901]: <https://github.com/tauri-apps/tauri/issues/12901> — "Screen reader (NVDA) does not read out loud in a frameless window with `decorations: false` enabled." Regression between Tauri v2.2.5 and v2.3.1. Still open as of search date.
[^tauri-2026]: Per multiple 2026 comparison articles, Tauri 2 + Vue app footprint reported at ~3 MB / ~50 MB RAM in idle.
[^wails-rtl]: Wails issue tracker — "[v2 screen reader] rtl textarea support" <https://github.com/wailsapp/wails/issues/4671>, confirms VoiceOver works on macOS for standard textareas but breaks on `dir="rtl"`.
[^servo-2025]: Phoronix coverage of Servo June 2025 milestone — screen reader hooks and embedding improvements landing in Servoshell. <https://www.phoronix.com/news/Servo-June-2025-Highlights>.
[^gtk-2025-a11y]: GTK Development Blog 2025-05 "An accessibility update" <https://blog.gtk.org/2025/05/12/an-accessibility-update/> — confirms WebKitGTK accessibility work landed in 2025 STF-funded effort, "GNOME Web is now a fully accessible, fully sandboxed web browser." Separately, AccessKit a11y backend merged in GTK 4.18 (first time GTK apps work on Windows and macOS a11y APIs).
