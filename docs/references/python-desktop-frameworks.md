# Python Desktop Application Frameworks (Electron alternatives for a Python-everything pivot)

## Why we are looking at this at all

The Electron plan for this notebook app already requires a Python sidecar process for _everything that matters_: Docling for PDF ingestion, markitdown for office documents, whisper / faster-whisper for lecture transcription, the OCR pipeline, Supertonic for TTS. The Python footprint we have already accepted is ~300-400 MB on disk (interpreter + ML models), and every cross-language call pays a JSON-over-stdin/stdout (or local HTTP) serialization tax. That is on top of a ~150 MB Electron + Chromium shell that we are _also_ bundling.[^pyside-size] If we go Python-native end to end, every one of those sidecars collapses into an in-process call: no JSON marshaling, no second runtime, one debugger, one packaging story, one auto-updater. The question this document answers is whether the **UI / UX / accessibility** story of any Python framework is good enough to justify giving up Electron's pinned Chromium — which is, empirically, the single strongest accessibility surface we can ship from a webview today.[^chromium-a11y]

### Rubric (used as the evaluation lens for every framework below)

1. **Accessibility — non-negotiable WCAG 2.1 AA, aspirational AAA.** Real a11y tree exposed to UIA on Windows, NSAccessibility on macOS, AT-SPI on Linux. Working NVDA / JAWS / VoiceOver / Orca / TalkBack support. Keyboard-everything. OS font scaling, dark mode, `prefers-reduced-motion`. Math rendered as MathML/MathJax for screen-reader announcement.
2. **Rich-editor surface** good enough to host TipTap / Lexical / CodeMirror, _or_ a comparably capable native editor.
3. **PDF rendering** with text-layer highlight (PDF.js in a webview, or QtPdf natively).
4. **Audio capture + playback** for STT and TTS (system mic, low-latency device enum).
5. **Cross-platform global hotkey** for a universal capture inbox.
6. **System tray, native notifications, autostart, multi-window.**
7. **File watching + filesystem-as-canon storage** (`watchdog` must work).
8. **End-user packaging** — `.dmg` / `.exe` / `.msi` / `.AppImage`, not `pip install`.
9. **Bundle size + cold-start time** honest accounting (Python + Qt is not free).
10. **AGPL-3.0 compatibility** of framework + transitive deps; ability to ship under copyleft.
11. **First-class Python ecosystem reach** — Docling, markitdown, whisper, Supertonic, Piper, sqlite-vec, transformers, openai/anthropic/openrouter SDKs.
12. **Async story** — the editor MUST remain responsive while a 90-minute lecture transcribes on a background thread.

### Taxonomy

Four families. Picking a framework is largely picking a family.

- **(A) Native widget toolkits** — PySide6/PyQt6, wxPython, Tkinter, Toga. _Real_ OS widgets on each platform; accessibility comes mostly for free, but rich-text editor work is harder.
- **(B) HTML/CSS via embedded webview** — pywebview, Pyloid, Eel, Flet's web mode, NiceGUI native. Brings the JS editor ecosystem in-house. The accessibility question becomes "_which_ webview engine, and how does its a11y tree expose to UIA/AX/AT-SPI?"
- **(C) Immediate-mode / GPU canvas custom-drawn UIs** — Kivy, DearPyGui, Flet's desktop renderer. The framework paints its own pixels; the OS has _no idea_ what's there unless the framework opts in to AccessKit-style a11y plumbing. For our use case this is a hard disqualifier in 2026 except where AccessKit integration has demonstrably shipped.
- **(D) Web-server-as-UI** — NiceGUI's browser mode, Streamlit, Gradio. The "app" is a localhost HTTP server the user opens in Chrome/Safari. Acceptable for internal dashboards; mismatched against "polished student-facing desktop app."

---

## (A) Native widget toolkits

### PySide6 (Qt for Python)

- **Repo:** <https://github.com/qtproject/pyside-setup> · **Docs:** <https://doc.qt.io/qtforpython-6/>
- **License:** **LGPL-3.0** (or commercial via The Qt Company).[^pyside-license]
- **AGPL verdict:** **Compatible**, with the LGPL dynamic-linking caveat — you must (a) link Qt dynamically so users can replace the Qt libraries, and (b) carry the LGPL notices. If you ship one consolidated AGPL binary via PyInstaller, dynamic linking is already how Qt works at runtime (`libQt6*` are separate shared libraries). Trivial to comply.
- **Family:** A (native widgets) + optional B (Qt WebEngine = Chromium).
- **Rendering model:** Real native widgets per platform via Qt's QPA plugins (`windows`, `cocoa`, `xcb`/`wayland`). Plus QML/Qt Quick for declarative UI. Plus QtWebEngine if you embed a Chromium webview.
- **Accessibility verdict:**
  - **Windows:** Qt exposes a UIA bridge (the legacy MSAA bridge was replaced with a pure UIA backend in Qt 5.11+).[^qt-uia] Modern Qt 6 widgets _do_ show up in the UIA tree. _However_, real-world reports from blind users have been mixed for years: JAWS in particular has had trouble with Qt text fields,[^blind-guru] and Anki (Qt-based) was explicitly **not recommended** by its developer for screen-reader users as of 2022 with no clean resolution since.[^anki-a11y] OBS Studio (Qt-based) similarly has a long trail of NVDA/JAWS regressions — control names disappear, list items aren't announced, and a community accessibility plugin exists to patch Qt's a11y tree by hand.[^obs-a11y]
  - **macOS:** Qt uses NSAccessibility via the Cocoa QPA. VoiceOver coverage is generally the best of the three platforms (this is consistent across Qt apps), but custom QWidgets routinely need manual `setAccessibleName`/`Role` for full coverage.
  - **Linux:** AT-SPI via DBus. Functional with Orca for standard widgets; custom-drawn widgets often invisible.
  - **Bottom line:** Qt has the _machinery_ for AA-level a11y on every platform, but achieving it in practice requires constant engineering attention. It is not free.
- **Webview:** Yes — `QtWebEngine` ships Chromium (pinned to a specific Qt-bundled version, typically ~1 major version behind upstream Chromium). Adds ~150 MB to bundle size all by itself.
- **Rich-editor story:** Two options. (1) `QTextEdit` natively supports markdown setMarkdown/toMarkdown round-tripping since Qt 5.14;[^qtextedit-md] this is a working but feature-limited block editor. (2) TipTap/Lexical/CodeMirror inside QtWebEngine via QWebChannel — see the Pyloid section below; this is the same architecture Pyloid wraps.
- **Audio:** `QtMultimedia` for playback, `QAudioSource` for capture; cross-platform device enumeration. Or skip Qt and use `sounddevice`/`PyAudio` directly.
- **Packaging:** **PyInstaller** is the de facto choice with PySide6.[^pyinstaller-pyside] Realistic per-platform sizes after `pyside6-essentials` slimming: macOS ~90 MB, Windows ~100 MB, Linux ~200 MB (Linux is fattest due to Qt platform plugins; `pyside6` full kit installs to ~614 MB on-disk, slimmed to ~207 MB).[^pyside-size] Add ~150 MB more if you ship QtWebEngine.
- **Maintenance:** Maintained by The Qt Company itself. Six-month release cycle. Mature, well-funded. Python 3.9-3.13 supported as of late 2025.
- **Async story:** Three options. (a) Run everything in worker `QThread`s and emit signals; (b) `qasync` integrates `asyncio` event loop with Qt's event loop, framework-agnostic across PyQt5/6 and PySide2/6;[^qasync] (c) PySide6's own `QtAsyncio` module ships an asyncio event loop backed by `QEventLoop`.[^qtasyncio] We can host long-running transcription on a worker thread without blocking the UI; this is a solved problem.
- **Verdict for our use case:** Strong-Plausible. It is the most production-grade Python desktop option, and most academic Python desktop apps that ship (Anki, calibre, MuseScore on the C++ side, OBS) use Qt. But Qt's track record specifically for blind users is _not_ clean; meeting our AA bar will require sustained a11y engineering and explicit per-widget annotation work.

### PyQt6 (Riverbank)

- **Repo:** <https://www.riverbankcomputing.com/software/pyqt/> · _Note: development is not on GitHub._
- **License:** **GPL-3.0** (or commercial via Riverbank).[^pyqt-license]
- **AGPL verdict:** **Compatible.** GPL-3.0 and AGPL-3.0 are explicitly cross-compatible via the dual §13 clauses each license carries — you may "convey" a combined work formed by linking GPL-3.0 code into an AGPL-3.0 program, and the network-interaction terms of AGPL §13 apply to the combined whole.[^agpl-gpl-compat] Important nuance: this **does not** mean you can sublicense PyQt under AGPL — Riverbank retains GPL ownership — only that the resulting program-as-a-whole is distributable as AGPL.
- **Functionally identical** to PySide6 API-wise (minor differences: PySide uses snake_case property setters and `Signal`/`Slot`, PyQt uses `pyqtSignal`/`pyqtSlot`; enums after PyQt6 are scoped which differs from old PyQt5 style).
- **Why pick PySide over PyQt:** PySide is LGPL — friendlier downstream for anyone forking our AGPL code into a permissively-licensed plugin context. Both work; the academic Python world has _roughly_ split between PyQt5 (legacy, Anki, calibre) and PySide6 (modern).
- **Verdict for our use case:** Plausible, but choose PySide6 first. PyQt6 is a fine second choice if PySide6 hits an inexplicable bug.

### Tkinter (stdlib)

- **Docs:** <https://docs.python.org/3/library/tkinter.html>
- **License:** Python Software Foundation License (permissive). AGPL-compatible.
- **Family:** A.
- **Rendering:** Wraps Tk, a Tcl/Tk widget toolkit.
- **Accessibility verdict:** **Disqualifying.** Tk's accessibility on Windows is essentially non-existent — there is **no MSAA or UIA support** in mainline Tk;[^tk-a11y] community projects like `Tka11y` only expose accessibility on Linux via ATK/AT-SPI. Tk on macOS uses Cocoa and gets _some_ VoiceOver coverage, but the cross-platform story is unacceptable for an a11y-first app.
- **Verdict:** **Disqualified.** Acknowledged for completeness because Tkinter is in the stdlib, but it is the worst-supported a11y option in this list. Do not consider.

### wxPython

- **Repo:** <https://github.com/wxWidgets/Phoenix> · **Docs:** <https://docs.wxpython.org/>
- **License:** **wxWindows Library Licence** — essentially LGPL with an extra clause permitting binary distribution under your own terms; OSI-approved and confirmed by RMS as GPL-compatible.[^wxpython-license]
- **AGPL verdict:** **Compatible.**
- **Family:** A. Uses real native widgets on each platform via wxWidgets: Win32 on Windows, Cocoa on macOS, GTK on Linux.
- **Accessibility verdict:** Because wxWidgets thin-wraps native OS widgets, you get whatever accessibility the OS gives you — which is generally decent on Windows (Win32 standard controls are well-supported by NVDA/JAWS) and Cocoa (NSAccessibility), and merely OK on GTK Linux. The catch is that `wx.html2.WebView` (the embedded webview widget) is a different story — that uses WebView2/WKWebView/WebKitGTK and inherits the system-webview a11y caveats discussed under pywebview.
- **Webview:** `wx.html2.WebView` wraps native system webviews. Same WebView2 / WebKit / WebKitGTK split as pywebview.
- **Rich-editor:** `wx.richtext.RichTextCtrl` is a native rich-text widget; not as feature-rich as TipTap but real OS text editing with native a11y.
- **Audio:** No first-class audio in wxPython; you'd use `sounddevice` or `PyAudio` independently.
- **Packaging:** PyInstaller. No first-party packager.
- **Async story:** Worker threads + `wx.CallAfter` for main-thread marshaling. Less polished than Qt's signal/slot or qasync.
- **Maintenance:** Active but slower-tempo than Qt/PySide. Latest releases tracking wxWidgets 3.2.x.
- **Verdict for our use case:** Plausible. The "uses native widgets per platform" property is the single most valuable thing for accessibility, but wxPython's developer ergonomics and async story are noticeably behind PySide6, and `wx.html2.WebView` inherits the same a11y caveats as pywebview anyway. Choose only if a wxPython-specific feature matters more than Qt's tooling depth.

### Toga (BeeWare)

- **Repo:** <https://github.com/beeware/toga> · **Docs:** <https://toga.beeware.org/>
- **License:** **BSD-3-Clause** (Copyright Russell Keith-Magee, 2014).[^toga-license]
- **AGPL verdict:** **Compatible.**
- **Family:** A.
- **Rendering model:** Pluggable backends per platform — Cocoa on macOS, **WinForms via pythonnet on Windows**, GTK on Linux, plus Android, iOS, Web, and a Qt backend.[^toga-backends] Toga's promise: "widgets inherit all of the native platform's accessibility affordances."[^toga-a11y]
- **Accessibility verdict:** _In principle_, very good because of native widgets. _In practice_ on Windows, the WinForms backend gives you whatever WinForms gives you, which is competent (NVDA/JAWS read standard `Button`, `TextBox`, `ListView` reliably) but visually 2010s; a WinUI3 backend is on the roadmap but blocked on Python bindings for WinUI3.[^toga-winforms] Specific a11y testing documentation is sparse — the project asserts the property rather than demonstrating it. Real-world deployments at the WCAG-AA bar are scarce.
- **Maturity:** Toga 0.5.x as of mid-2026 (latest 0.5.4 released May 2026; 0.5.0 was the March 2025 milestone).[^toga-release] Still classified internally as "in development." Widget catalog is _small_ relative to Qt — no rich-text widget comparable to QTextEdit, no built-in table editing, no native PDF view.
- **Webview:** A `WebView` widget exists that wraps the system webview per platform; same a11y caveat as everywhere else with system webviews.
- **Audio:** Not first-class. You'd use `sounddevice` independently.
- **Packaging:** **Briefcase** is the first-party packager and is genuinely good — produces `.app`/`.dmg`/`.pkg` for macOS, MSI for Windows, AppImage/deb for Linux, plus mobile.[^briefcase] Briefcase ships a complete isolated Python interpreter per app; expected per-platform bundle is ~50-80 MB plus your code.[^briefcase-size]
- **Async story:** Toga has a built-in asyncio event loop integration (Toga's `App` runs an asyncio loop natively).
- **Verdict for our use case:** Plausible-Weak. The native-widget premise is exactly what we want for accessibility, and Briefcase's packaging story may be the best in this list. But the widget surface area is too small for a feature-rich note-taking app — building the editor, the PDF panel, math rendering, and the audio capture UI from scratch in Toga in 2026 is a real-multi-quarter undertaking. _Revisit when Toga 1.0 ships and the WinUI3 backend lands._

## (B) HTML/CSS via embedded webview

### Pyloid

This deserves its own deep-dive section after the framework summaries (see Section 4 below). Brief inline verdict here:

- **Repo:** <https://github.com/pyloid/pyloid> · **Docs:** <https://pyloid.com/>
- **License:** **Apache-2.0** (Pyloid itself), with PySide6 dependency under LGPL-3.[^pyloid-license]
- **AGPL verdict:** **Compatible.** Apache-2.0 is one-way compatible with AGPL-3.0; LGPL-3.0 (PySide6) is compatible as discussed above.
- **Family:** B — explicitly an "Electron for Python" architecture wrapping PySide6 + QtWebEngine (Chromium-based).
- **Stars / activity:** ~510 stars, 17 forks (Nov 2025); latest version 0.27.2 released Nov 8, 2025; ongoing weekly-monthly releases.[^pyloid-pypi] Project is young (~2024 origin based on PyPI history).
- **Verdict for our use case:** **Strongest single candidate for the pivot**, with the caveat that it is a young project (see deep dive below for why and what concrete risks remain).

### pywebview

- **Repo:** <https://github.com/r0x0r/pywebview> · **Docs:** <https://pywebview.flowrl.com/>
- **License:** **BSD-3-Clause**.[^pywebview-license]
- **AGPL verdict:** **Compatible.**
- **Family:** B.
- **Stars / activity:** ~5.9k stars; 2,443 commits on master; latest release 6.2.1 (April 2026); actively maintained.[^pywebview-repo]
- **Webview engines per platform** (this is the entire story for pywebview):[^pywebview-engines]
  - **Windows:** Edge WebView2 (Chromium-based, requires .NET 4.6.2+). Optional CEF and legacy MSHTML (deprecated).
  - **macOS:** WKWebView (system WebKit). Always.
  - **Linux GTK:** WebKit2GTK ≥ 2.2.
  - **Linux Qt:** QtWebEngine or QtWebKit.
- **Accessibility verdict:** **Same caveats as Tauri.** WebView2 on Windows is notoriously poor for screen readers — multiple long-running upstream issues with NVDA, JAWS, and Narrator (control inaccessibility, focus traps, missing tree, arrow-key nav broken). The well-known pywebview bug r0x0r/pywebview#545 specifically tracks "Most controls aren't accessible to blind users via screen readers like NVDA" and is **closed as stale, never fixed**.[^pywebview-a11y-545] WebView2's own upstream issue (MicrosoftEdge/WebView2Feedback#2330) calls the control "completely inaccessible with all of the screen readers" and was tracked but resolution status is opaque.[^webview2-a11y] WKWebView on macOS is broadly OK with VoiceOver. WebKit2GTK with Orca varies. **Net:** pywebview's a11y story is hostage to whichever system webview the user happens to have, and Windows — where most of our students will be — is the weakest link.
- **Rich-editor:** Any JS editor you want.
- **Audio:** WebAudio via the embedded browser; fine.
- **Packaging:** PyInstaller, Nuitka, py2app — pywebview deliberately doesn't bundle a webview engine, so packaged size is small. Trade-off: WebView2 runtime must be installed on the user's machine (preinstalled on Win10 22H2+ / Win11) or you ship the bootstrapper.
- **Verdict for our use case:** Plausible but inherits the **system-webview a11y problem** that disqualified Tauri for us. Not the worst option, but you do not get Pyloid's pinned Chromium safety net.

### Pyloid (cross-reference)

See Section 4.

### Eel

- **Repo:** <https://github.com/python-eel/Eel> · **License:** MIT.
- **Status:** **Archived June 22, 2025; read-only repository, effectively unmaintained.**[^eel-archived]
- **Verdict:** **Disqualified.** Unmaintained = unpatched security = unsafe to ship to students. Skip.

### Flet (desktop mode)

- **Repo:** <https://github.com/flet-dev/flet> · **Docs:** <https://flet.dev/>
- **License:** **Apache-2.0**.[^flet-license]
- **AGPL verdict:** Compatible.
- **Family:** C (custom-drawn) — Flet is Flutter under the hood, and Flutter renders to a canvas.
- **Stars / activity:** 16.1k stars; latest v0.85.1 May 2026; very active.[^flet-repo]
- **Accessibility verdict:** **The hardest call in this list.** Flutter has done serious work on a11y; Flutter 3.32 (May 2025) shipped a `SemanticsRole` API with fine-grained roles, optimized semantics tree compilation (~80% faster), and improvements to text fields / focus / menus / sliders / dropdowns for better screen-reader context.[^flutter-3-32-a11y] But **the desktop story is still uneven** — open issues against real Flutter desktop apps continue to report "UI elements appear to the screen reader as a single graphic object," "keyboard Tab doesn't move focus between buttons or input fields," and "NVDA cannot read button labels."[^flclash-a11y] Flet itself has open issues on iOS VoiceOver (#5417, opened July 2025); broader Flutter-desktop NVDA support is **improving but not at parity with native widgets or Chromium**.
- **Verdict for our use case:** Plausible-Weak today. Worth re-evaluating in 12-18 months. For an a11y-first AA-required app _shipping now_, the residual risk that NVDA + a complex Flet view degrades to "single graphic" is unacceptable.

### NiceGUI

- **Repo:** <https://github.com/zauberzeug/nicegui> · **License:** MIT. 15.8k stars; v3.12.1 May 2026; very active.[^nicegui-repo]
- **Architecture:** Python/FastAPI backend + Vue/Quasar frontend over socket.io; users open the app in a browser tab, or pass `ui.run(native=True)` to wrap it in a pywebview window for a "desktop feel."[^nicegui-native]
- **Accessibility verdict:** In native mode you inherit pywebview's a11y problems above (WebView2 weakness on Windows in particular). In browser mode, accessibility is whatever the user's browser provides — _which can actually be best-in-class if it's a recent desktop Chrome/Firefox/Edge with NVDA or VoiceOver running against it._
- **Verdict for our use case:** Plausible only as a fallback "open in your default browser if our desktop a11y story is failing" experience. Architecturally mismatched as the flagship student-facing UX.

### Streamlit / Gradio

- **Streamlit:** Apache-2.0. Server-as-UI, opens in browser.
- **Gradio:** Apache-2.0. Server-as-UI, opens in browser.
- **Verdict:** **Disqualified.** Neither produces a native desktop app; both are excellent for dashboards or ML demos but mismatched for "polished note-taking app a student downloads and runs."

## (C) Immediate-mode / GPU canvas custom-drawn UIs

### Kivy

- **Repo:** <https://github.com/kivy/kivy> · **License:** MIT.[^kivy-license]
- **Rendering:** OpenGL ES 2 custom-drawn widgets.
- **Accessibility verdict:** **Today: essentially zero screen reader support.** Multiple issues across years (kivy/kivy#2820, #5836, #8596) explicitly note that "Kivy apps are not accessible by the screen reader" and that automation/UIA support was never added.[^kivy-a11y] **Good news for 2026+:** Kivy 3.0 is being designed around an `AccessKit` integration that finally provides screen-reader plumbing on Windows/macOS/Linux (AccessKit-Python bindings exist via PyO3).[^accesskit-python] AccessKit itself is solid (used by egui, others), and the Kivy team is working with the AccessKit core team. **Today, however, Kivy 3.0 is not shipped.**
- **Verdict:** **Disqualified for v1.** Revisit if Kivy 3.0 with AccessKit lands and demonstrates production NVDA/JAWS/VoiceOver compatibility with a non-trivial app.

### DearPyGui

- **Repo:** <https://github.com/hoffstadt/DearPyGui> · **License:** MIT. v2.3.1 May 2026; 15.4k stars; well-maintained.
- **Rendering:** GPU-direct (DirectX 11 / Metal / OpenGL 3) via Dear ImGui under the hood. Immediate-mode.
- **Accessibility verdict:** **Same fundamental problem as Kivy** — the framework paints its own pixels, and the OS sees a single graphics surface. No documented screen reader support, no AccessKit integration plans visible.
- **Verdict:** **Disqualified** for an a11y-first app. Excellent for technical tooling, scientific dashboards, game-dev tooling.

## (D) Web-server-as-UI (acknowledged, then dismissed)

### Streamlit, Gradio, Anvil

These all render in the user's browser. For an _internal_ tool where the user opens `localhost:8501`, the accessibility story is "whatever Chrome+NVDA give you," which is excellent. But the deliverable is no longer "a desktop app the student downloads;" it's "a Python web app the student starts a local server for." Architectural mismatch for our deliverable. **Disqualified.**

## Build-tool footnotes

### fbs (fman Build System)

- License: GPL-3.0 (the build tool itself); wraps PyQt5.
- Status: Latest release Jan 2025, but the project is widely considered to have stalled (mherrmann/fbs-tutorial last meaningful update years ago).
- **Verdict:** Use PyInstaller + your own packaging scripts instead. fbs's only real value was that it pre-baked PyQt5 packaging recipes, which PyInstaller now handles natively.

### PySimpleGUI

- **License history is a cautionary tale.** PySimpleGUI 4.x was LGPL-3. In April 2024, the maintainer released PySimpleGUI **5.x as a proprietary $99/year commercial product with anti-redistribution clauses** — you couldn't republish the library or share your developer key.[^psg-5-license] Community backlash was severe; PySimpleSoft announced shutdown February 2025 and the codebase was eventually re-released as LGPL-3.[^psg-5-shutdown] **Lesson:** the older PySimpleGUI 4.x tutorials you'll Google up may still imply the old license. Verify before adopting. We will not use PySimpleGUI regardless — it's a thin Tkinter wrapper and inherits all Tk a11y problems.
- **Verdict:** **Disqualified.**

### PyGUI

- Niche, lightly maintained, no comparative advantage. Skip.

---

## 3. Honest comparison table

| Framework              | License                          | AGPL-compat            | Family                  | a11y Win                                    | a11y mac         | a11y Linux               | Webview engine                            | Rich-editor host viable?                    | Packaging                            | Active 2025-26            | **Verdict**                                 |
| ---------------------- | -------------------------------- | ---------------------- | ----------------------- | ------------------------------------------- | ---------------- | ------------------------ | ----------------------------------------- | ------------------------------------------- | ------------------------------------ | ------------------------- | ------------------------------------------- |
| **PySide6**            | LGPL-3 / commercial              | Yes (LGPL caveats)     | A (+ B)                 | Mixed — UIA bridge exists, JAWS issues real | Good (VoiceOver) | OK (Orca)                | QtWebEngine (Chromium, pinned)            | Yes via QtWebEngine or QTextEdit            | PyInstaller mature                   | Yes                       | **Strong**                                  |
| **PyQt6**              | GPL-3 / commercial               | Yes (GPL→AGPL one-way) | A (+ B)                 | Same as PySide6                             | Same             | Same                     | Same                                      | Same                                        | Same                                 | Yes                       | **Plausible** (prefer PySide6)              |
| **Pyloid**             | Apache-2 (on PySide6 LGPL)       | Yes                    | B (on Qt)               | Chromium-as-good                            | Chromium-as-good | Chromium-as-good         | QtWebEngine (Chromium, pinned)            | **Yes — TipTap/Lexical/CodeMirror all run** | PyInstaller / Nuitka via own builder | Yes (young)               | **Strong, with maturity caveat**            |
| **pywebview**          | BSD-3                            | Yes                    | B (system webview)      | **Weak** (WebView2 a11y broken)             | OK (WKWebView)   | Variable                 | System: WebView2 / WKWebView / WebKit2GTK | Yes (any JS editor)                         | PyInstaller / Nuitka                 | Yes                       | Plausible — inherits Tauri a11y caveat      |
| **Toga (BeeWare)**     | BSD-3                            | Yes                    | A (native via backends) | OK (WinForms, dated look)                   | Good (Cocoa)     | OK (GTK)                 | System webview widget                     | No native rich-text widget                  | **Briefcase (excellent)**            | Yes                       | **Plausible-Weak** (revisit at 1.0)         |
| **wxPython**           | wxWindows (LGPL-ish)             | Yes                    | A                       | Good (Win32 native)                         | Good (Cocoa)     | OK (GTK)                 | wx.html2.WebView (system)                 | RichTextCtrl (limited)                      | PyInstaller                          | Yes                       | Plausible (less ergonomic than PySide6)     |
| **Tkinter**            | PSF                              | Yes                    | A                       | **Disqualifying — no UIA/MSAA**             | Some VoiceOver   | AT-SPI via Tka11y add-on | None                                      | No                                          | Stdlib + PyInstaller                 | Stdlib                    | **Disqualified**                            |
| **Kivy**               | MIT                              | Yes                    | C                       | **Zero** (3.0 AccessKit pending)            | Zero             | Zero                     | None                                      | Custom-drawn                                | Buildozer / PyInstaller              | Yes                       | **Disqualified for v1**                     |
| **DearPyGui**          | MIT                              | Yes                    | C                       | Zero                                        | Zero             | Zero                     | None                                      | Custom-drawn                                | PyInstaller                          | Yes                       | **Disqualified**                            |
| **Flet**               | Apache-2                         | Yes                    | C (Flutter canvas)      | Improving, **not at parity**                | Improving        | Improving                | Skia canvas                               | Native Flutter widgets only                 | Built-in `flet pack`                 | Yes                       | Plausible-Weak (re-evaluate 2026-2027)      |
| **NiceGUI**            | MIT                              | Yes                    | D (+ B via pywebview)   | Browser-as-good or pywebview-as-weak        | Same             | Same                     | Browser tab OR pywebview                  | Yes (in browser)                            | Native via pywebview                 | Yes                       | Plausible (architectural mismatch)          |
| **Eel**                | MIT                              | Yes                    | B                       | —                                           | —                | —                        | Chrome app mode                           | Yes                                         | —                                    | **No — archived 2025-06** | **Disqualified**                            |
| **Streamlit / Gradio** | Apache-2                         | Yes                    | D                       | Browser-as-good                             | Same             | Same                     | Browser tab                               | Limited                                     | Server packaging                     | Yes                       | **Disqualified** (not a desktop app)        |
| **PySimpleGUI**        | LGPL-3 (re-opened post-shutdown) | Yes (now)              | A (Tk wrapper)          | Tk-as-bad                                   | OK               | OK via ATK               | None                                      | No                                          | PyInstaller                          | Limited                   | **Disqualified** (license trauma + Tk a11y) |
| **fbs**                | GPL-3 (build tool)               | Yes                    | Build tool only         | n/a                                         | n/a              | n/a                      | n/a                                       | n/a                                         | Itself a packager                    | Stalled                   | **Skip** (use PyInstaller directly)         |

---

## 4. The Pyloid deep dive

Pyloid bills itself as **"Electron for Python Developer"** and is the strongest single candidate in this whole document because, architecturally, **it is the closest thing to "same app, different language"** as the Electron plan we already have. It is also the _youngest_ serious option here. Both facts matter.

### 4.1 What it actually is

- **Architecture:** Three layers.[^pyloid-deepwiki]
  1. **User-facing layer:** an HTML/CSS/JS frontend rendered inside QtWebEngine (Chromium-based, version-pinned by Qt 6.9.x), plus system integration (tray, notifications, native dialogs).
  2. **Framework core:** Pyloid's own classes — `Pyloid` (the app), `BrowserWindow` (the webview window), `PyloidIPC` (the @Bridge decorator system), `PyloidRPC` (the JSON-RPC alternative).
  3. **Qt foundation:** PySide6 (currently pinned to 6.9.2) doing the windowing, the menus, the tray, the native APIs.
- **Origin:** GitHub organization `pyloid` was set up ~2024 based on PyPI version history. The author/lead maintainer is not prominently disclosed in the README — appears to be a small Korea-based team based on contributor patterns and Discord activity. **This is a single-digit-contributor project**, not a corporate-backed framework like PySide6.
- **Stars / activity:** ~510 GitHub stars; 17 forks; the main repo had ~6-7 documented releases through 2025 culminating at v0.27.2 in November 2025. **Beta versioning** (`v0.27.1-beta`) — the project does not yet claim 1.0.[^pyloid-pypi]
- **Show HN:** Posted to Hacker News November 2025; discussion mostly positive but limited critical scrutiny.[^pyloid-hn]

### 4.2 IPC bridge — the most important comparison vs. Electron

Pyloid offers **two complementary IPC mechanisms** out of the box:[^pyloid-deepwiki]

1. **QWebChannel-backed `@Bridge` decorator** — synchronous-feeling method calls.
   - Python side: a class subclassing `PyloidAPI` with methods decorated `@Bridge(...)`. The class is passed via `js_apis=[...]` when creating a window with `app.create_window(...)`.
   - JS side: `window.pyloid.YourAPIClassName.yourMethod(arg)` returns a Promise.
   - Plus a global `window.ipc` for app-wide stuff and `window.pyloid.WindowAPI` for built-in window methods.
2. **`PyloidRPC` — JSON-RPC 2.0 over HTTP** via an embedded `aiohttp` server. JS issues `fetch('http://pyloid.rpc', { ... })`. **This is where async-native Python lives** — perfect for transcription jobs that take 90 seconds to return.

Compared to Electron's `ipcRenderer`/`ipcMain` + `contextBridge`:

| Concern                             | Electron                          | Pyloid                                                                               |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| Synchronous call from JS to backend | `ipcRenderer.invoke` → Promise    | `window.pyloid.API.method()` → Promise                                               |
| Backend → JS push                   | `webContents.send`                | `window.invoke('event-name', payload)`                                               |
| Long-running async work             | Worker + IPC                      | `PyloidRPC` async handlers (native asyncio)                                          |
| Context isolation                   | `contextBridge.exposeInMainWorld` | Per-API decorator surface                                                            |
| Bridge maturity                     | Battle-tested, many years         | Young; QWebChannel itself is mature (Qt provides it) but Pyloid's wrapping is recent |
| Type safety                         | TypeScript types you write        | None enforced; runtime errors only                                                   |

The QWebChannel underlay is **rock-solid** (it has been Qt's official JS-Python bridge for ~10 years); the risk in Pyloid is not the bridge transport, it's that Pyloid's _wrapper API_ may break or change between minor versions before 1.0.

### 4.3 First-party features

Pyloid ships, per its docs:[^pyloid-pypi]

- Window management (multi-window, custom titlebar)
- System tray, native notifications, autostart
- Clipboard, file dialogs, **global shortcuts**
- File watching
- Splash screens
- Threading helpers (thread-safe GUI calls — important for our background transcription)
- A "Store" (PickleDB-based key-value storage)
- A built-in HTTP server for serving the frontend assets
- **Builder/packaging via PyInstaller + an in-house "pyloid-builder" with auto-bundling and size optimization** (this is the bit most differentiated from raw PySide6 + PyInstaller)
- DevTools integration

**Conspicuously absent or undocumented:**

- **Auto-update mechanism.** I found no built-in autoupdater in Pyloid's docs. You'd need to bolt on something like `PyUpdater`, or use a platform native (Sparkle on macOS, Squirrel-style on Windows). This is a real gap versus Electron's `electron-updater` ecosystem.
- **Code signing & notarization recipes.** Generic PyInstaller-on-macOS pain applies — Hardened Runtime entitlements, `notarytool` (since `altool` deprecated), all Qt/PySide6 binaries individually signed.[^pyinstaller-signing]
- **Crash reporting** out of the box. Add Sentry-Python yourself.

### 4.4 Tutorials, examples, shipping apps

- The `create-pyloid-app` CLI scaffolds project starters for React, Vue, Svelte, SvelteKit, Next.js with TypeScript or JS variants and Pyloid-RPC or FastAPI backends.[^pyloid-quickstart]
- There is a `pyloid-js` package providing the JS-side conveniences.
- **I could find no publicly-listed shipping production apps using Pyloid.** No "apps built with Pyloid" page, no notable third-party apps. This is the single most important honest data point: Pyloid in November 2025 is a _credible Electron-style architecture demo + framework_, not a proven foundation under a shipping app you can examine.

### 4.5 Honest assessment

**Strengths:**

- Uses pinned Chromium (via QtWebEngine), inheriting Chromium's best-in-class a11y for the web content — _the very feature that made Electron our default choice_ — while letting us pull all our Python ML pipelines in-process.
- The Bridge API is ergonomic; not as polished as Electron's, but small enough to learn in an afternoon.
- Apache-2.0 license is non-viral and AGPL-compatible.
- Same `PySide6 + QtWebEngine` core powers Anki, calibre, MuseScore, and countless other shipped academic Python apps — this part is not novel.

**Weaknesses:**

- **Beta version, single-digit contributors, no known production deployments.** If Pyloid the wrapper stops being maintained tomorrow, we are stuck on raw PySide6 + QtWebEngine and rewriting Pyloid's bridge layer. **Mitigation:** Pyloid is thin enough that this is recoverable; the underlying Qt machinery is what does the heavy lifting.
- No auto-update mechanism out of the box.
- Documentation is partial (sections of `docs.pyloid.com` 404'd during this research; content has migrated and consolidated under `pyloid.com`).
- Bundle size: PySide6 + QtWebEngine + Python = ~250-350 MB before any models. _This is competitive with our existing Electron + sidecar plan_ because we collapse the Python sidecar runtime that was ~150-200 MB on its own; the _net_ is roughly break-even on disk, and a win on RAM (one Python interpreter, not two processes).

**Compared to Electron — concrete missing things:**

- No auto-updater story.
- No equivalent of `electron-builder`/`electron-forge` cross-platform packaging maturity; PyInstaller + Pyloid-builder is real but younger.
- No equivalent of Electron's huge published-app track record (Discord, VS Code, Slack, 1Password, Notion).
- No equivalent of Electron Fiddle for rapid prototyping.

**Production-ready in 2026?** **Not yet for a flagship student-facing app**, but **production-ready as the architecture pattern** if your team is comfortable owning the framework layer (i.e., willing to fork or contribute fixes to Pyloid when needed, and willing to write your own auto-updater).

---

## 5. Architectural sketches for our specific app

### Sketch A — Pyloid (PySide6 + QtWebEngine) + Python everything

```
PyInstaller bundle
 ├─ Python 3.11 runtime           (~30 MB)
 ├─ PySide6 + Qt 6.9              (~210 MB, slimmed from 614 MB with pyside6-essentials)
 ├─ QtWebEngine + Chromium        (~160 MB)
 ├─ pyloid + pyloid-rpc           (~5 MB)
 ├─ Frontend assets               (~10-30 MB depending on SvelteKit/React build)
 │   └─ TipTap or Lexical or CodeMirror, PDF.js, MathJax, …
 ├─ Docling + dependencies        (~150 MB)
 ├─ markitdown                    (~5 MB)
 ├─ faster-whisper + CTranslate2  (~30 MB code; +800 MB-1.5 GB models)
 ├─ Supertonic (inference code)   (~10 MB; +100 MB ONNX models, download-on-first-run)
 ├─ Piper TTS                     (~10 MB; +50 MB models)
 ├─ sqlite-vec, transformers, etc (~100 MB)
 └─ App code                      (~5 MB)
```

- **Estimated installer size (zipped):** 700 MB - 1.5 GB depending on which models are bundled vs. downloaded on first run.
- **Architecture:** Frontend (SvelteKit or React) inside QtWebEngine. TipTap/Lexical/CodeMirror for editor; PDF.js for PDF rendering; MathJax for math. Python backend owns: file IO, watchdog, all ML pipelines, network calls to OpenAI/Anthropic/OpenRouter, sqlite-vec for embeddings. IPC: Pyloid `@Bridge` for sync UI calls, `PyloidRPC` for long-running transcription jobs (async-native).
- **Hot spots:** (a) Models — bundle vs. download is a real UX decision; favor download-on-first-run for whisper-large and Supertonic to keep installer under 1 GB. (b) Cold start — Python + Qt + Chromium init is 1.5-3 seconds, **slower than Electron**. (c) Memory baseline ~250-400 MB before models are loaded.
- **Risks:** Pyloid project maturity (mitigated by Pyloid being a thin wrapper); QtWebEngine version skew with cutting-edge editor JS (mitigated by Chromium-based pinning being close enough to upstream); JAWS-vs-QtWebEngine a11y edge cases — _Chromium itself is best-in-class for a11y; we should be no worse than Electron here, and possibly identical_.

### Sketch B — Pure PySide6 + QtWidgets (no webview)

- **Architecture:** QMainWindow with QDockWidgets for the panel layout. Editor = `QTextEdit` in markdown mode (native to Qt 5.14+), or a `QQuickItem`-based custom editor in QML. PDF = `QPdfView` + `QPdfDocument` (Qt's first-party PDF widget). Math = render to images via a Python LaTeX→PNG pipeline (matplotlib/sympy) — _cannot get MathML/screen-reader announcement without WebView+MathJax._ Audio = `QtMultimedia`. All Python libs in-process.
- **Strengths:** Smallest bundle (no Chromium, ~150 MB total for Qt+Python+code). Fastest cold start. Best native a11y bridge per platform (UIA/NSAccessibility/AT-SPI).
- **Weaknesses:** **The editor is the showstopper.** There is no `QTextEdit` equivalent of TipTap/Lexical/CodeMirror with extensible inline content, slash commands, embedded blocks. Building it from scratch is a multi-person-quarter undertaking and ends up with worse editor UX than 2010-era browser editors. PDF panel works but no JS-based annotation overlay layer.
- **Verdict:** Best a11y story, worst editor UX. Disqualified unless we drastically reduce editor scope.

### Sketch C — pywebview + Python everything

- **Architecture:** Same as Sketch A but pywebview wrapping the system webview instead of QtWebEngine. ~100 MB smaller bundle on Windows (no bundled Chromium; rely on WebView2 runtime preinstalled in Win10 22H2+).
- **Weakness:** **WebView2 a11y on Windows is broken** as documented above. Multiple unresolved upstream issues across NVDA, JAWS, Narrator. Same blast radius that disqualified Tauri.
- **Verdict:** Disqualified for our app — _the entire reason we considered the Python pivot was to avoid giving up Chromium's a11y story; pywebview re-introduces it_.

---

## 6. Final recommendation

**Stick with Electron-with-sidecars for v1. Plan a Pyloid migration spike for v1.5 / v2.** Here is the reasoning, head-on:

### Accessibility delta (dominant factor)

Electron pins Chromium and inherits its industry-leading a11y tree, ARIA semantics, focus management, and reduced-motion support; NVDA/JAWS/VoiceOver have ~10 years of working against Chromium-based webviews. **Pyloid + QtWebEngine should give us the same Chromium-quality a11y for web content** because QtWebEngine _is_ Chromium. We do not give up the Chromium a11y story by moving to Pyloid; we only give up Electron's _packaging_ of it. This is the single most important finding in this document: **the a11y delta between Electron and Pyloid is small-to-zero for the web content; the delta with native-widget options like PySide6-only or Toga is larger and goes either direction depending on platform**.

### Performance delta

Pyloid wins on RAM (one Python interpreter, not two processes) and on per-call latency (in-process Python is microseconds, sidecar IPC is milliseconds-to-tens-of-milliseconds for small payloads, hundreds for large ones). For our app's hot paths — drag-a-PDF-in → Docling parse → embedding → vector index — this is a meaningful improvement. Cold-start time is Pyloid's loss: Python+Qt+Chromium is ~2-3s, vs. Electron's ~1s.

### Maintenance-burden delta

One runtime is genuinely simpler than two. One packager (PyInstaller) instead of two (electron-builder + PyInstaller). One debugger. But: Pyloid is a young framework run by a small team; if it goes unmaintained, you're maintaining a Pyloid fork or migrating to raw PySide6 + QtWebEngine. Electron is maintained by OpenJS Foundation with sustained corporate investment.

### Library ecosystem delta

We already chose Docling, markitdown, whisper / faster-whisper, Supertonic, Piper, sqlite-vec, transformers, openai/anthropic SDKs — **all Python-first**. The editor and renderer ecosystem (TipTap, Lexical, CodeMirror, PDF.js, MathJax) is JS-first, but **all of it runs unchanged inside QtWebEngine via Pyloid**. So the ecosystem delta is roughly a wash; Pyloid keeps both legs intact.

### Distribution-size delta

- **Electron + sidecars (current plan):** ~150 MB Electron + ~200 MB Python runtime + ~50 MB app code + models = **~400 MB before models**, ~1 GB-1.5 GB with whisper-large/Supertonic bundled.
- **Pyloid:** ~210 MB Qt + ~30 MB Python + ~160 MB Chromium + ~30 MB app code + models = **~430 MB before models**, ~1 GB-1.5 GB with models.
- **Net:** Pyloid is _slightly larger_ on disk because Qt is bigger than Electron's per-app overhead, but the _Python runtime double-bundle goes away_. Realistically a wash.

### Risk delta

- **Sticking with Electron:** Known IPC tax, known double-packaging, known accessibility ceiling = Chromium's (best). Mature ecosystem. Low surprise. Risk of pivot regret.
- **Pivoting to Pyloid now:** Young framework risk (single-digit contributors, beta versions, no auto-updater). Mitigated because Pyloid is thin over Qt's well-understood machinery. Real risk of having to maintain Pyloid ourselves.
- **Pivoting to PySide6-pure now:** Editor work explodes. Disqualified.
- **Pivoting to Toga now:** Same editor problem; revisit at 1.0.
- **Pivoting to Flet now:** Flutter desktop a11y not at parity. Revisit in 18 months.

### The recommendation in one sentence

**Ship v1 on Electron with the planned Python sidecars; in parallel, build a 2-week Pyloid spike that ports the editor + PDF viewer + one Python pipeline (probably the OCR pipeline, smallest model) into a Pyloid window** and have an actual blind student tester or NV Access engineer evaluate it. **If the spike's NVDA+JAWS+VoiceOver experience is at least as good as Electron's** (it should be, because Chromium = Chromium), schedule the migration for v1.5/v2 and start chipping away at the Pyloid gaps (autoupdate, signing, anchor third-party-app shipping example).

### Revisit triggers

Pivot to Pyloid earlier than v2 if:

- Pyloid reaches 1.0 with a documented production-shipped reference app.
- We hit a specific Electron-sidecar performance ceiling (e.g., concurrent transcription + indexing trips IPC backpressure).
- A bundled-Chromium security CVE forces us to update both Electron and Qt regardless.

Avoid Pyloid altogether if:

- Pyloid's main repo stops shipping releases for >6 months.
- Our NVDA/JAWS spike shows non-trivial regressions vs. Electron despite both using Chromium under the hood.

---

## 7. Cross-cutting gotchas

### Async story

PySide6's signals/slots are the canonical Qt way to push from worker threads to the main UI thread. For `asyncio` integration: **`qasync`** is the long-standing community choice (fork lineage: quamash → asyncqt → qasync) and is actively maintained;[^qasync] PySide6 also ships **its own `QtAsyncio`** that provides a Qt-backed asyncio event loop.[^qtasyncio] Pyloid's `PyloidRPC` is `aiohttp`-backed and async-native out of the box. **Net:** running a 90-minute lecture transcription on a worker without blocking the UI is a solved problem in every Qt-based option here.

### Hot reload during development

PySide6 has no native HMR; you restart the app on Python change. Frontend assets inside QtWebEngine _can_ hot-reload via Vite dev server proxied through QtWebEngine. Pyloid's CLI scaffolds this for you (the frontend dev server runs in dev mode, QtWebEngine loads `localhost:5173` / similar).

### Multi-window UX

Qt (and therefore Pyloid) handles multiple windows cleanly. The "capture inbox window + main editor + system tray" pattern is straightforward. Each window has its own `BrowserWindow` instance with its own URL; tray icon driven by `QSystemTrayIcon` (exposed via Pyloid's tray API).

### Native menus / OS integration

- **macOS menu bar:** Qt automatically promotes a `QMenuBar` on a top-level window to the macOS menu bar. Standard items (`About`, `Preferences`, `Services`, `Hide`) recognized by name and placed in the correct slot. Pyloid inherits this for free.
- **Windows jumplists:** Not built into Pyloid; PySide6 provides `QWinJumpList` (Windows extras).
- **Linux .desktop integration:** Handled by your packaging step (Briefcase, AppImage, deb).

### Code signing & notarization

- **macOS:** Hardened Runtime entitlements (must allow unsigned executable memory because of CPython JIT-ish behavior in some C extensions), `--deep` sign all bundled Python libraries, then `notarytool submit` (since `altool` was deprecated in Nov 2023). Specific PyInstaller issues exist (pyinstaller/pyinstaller#7937) but workarounds are established.[^pyinstaller-signing]
- **Windows:** Authenticode signing of the `.exe` and the WiX-generated MSI. PyInstaller doesn't help directly; you sign the output. Cost: $300-500/year for an OV cert, $400-700 for EV (which avoids SmartScreen reputation gating).
- **Linux:** Generally unsigned; AppImage / Flatpak / Snap have their own stories.

### Auto-update

- **Pyloid:** No built-in. Roll your own with PyUpdater or vendor-specific (Sparkle/macOS, Squirrel-style for Win). This is a real cost we don't pay with Electron's `electron-updater`.
- **PySide6 raw:** Same.
- **Briefcase:** No first-party auto-updater either as of v0.3.24.

### Memory baseline ("hello world")

- **Tkinter:** ~25 MB.
- **wxPython:** ~40 MB.
- **PySide6 (QWidgets only):** ~60-90 MB.
- **PySide6 + QtWebEngine empty page:** ~180-250 MB.
- **Pyloid hello-world:** ~200-280 MB (same as PySide6 + QtWebEngine).
- **Electron hello-world:** ~150-200 MB.
- **Flet hello-world:** ~100-150 MB.
- **Toga hello-world:** ~50-80 MB.

### License gotchas in transitive Python deps

- **PyMuPDF (`pymupdf` / legacy `fitz`):** **AGPL-3.0** (or commercial via Artifex, typically $10-50k/year).[^pymupdf-license] **Fine for us as an AGPL app**; flagged because some dependency-tree scanners will surface AGPL and downstream forkers need to know they cannot relicense permissively. Document in `NOTICE`.
- **PyQt6 / `pyqt-tools`:** GPL-3 → AGPL-3 one-way compatible.[^agpl-gpl-compat] Fine for us; downstream forks must remain (A)GPL.
- **whisper.cpp / faster-whisper:** MIT and MIT respectively. Fine.
- **Docling:** MIT. Fine.
- **Supertonic:** MIT code + OpenRAIL-M model weights — model weights are a separate-runtime-asset question, _do not bundle the weights into the AGPL distribution_; have the user accept OpenRAIL-M on first-run download. (See the existing `supertonic.md` reference doc for the full analysis.)
- **`fbs` build tool:** GPL-3 — if you adopt fbs for packaging your build pipeline, the build pipeline becomes GPL-3. Not contagious to the _built_ app, but a friction point.
- **`accessible_output` (TTS for assistive tech bridge if you go that way):** LGPL-2.1. Fine.

---

## Footnotes

[^pyside-size]: Stack Overflow / Qt forum discussions confirm `pyside6` full installation is ~614 MB on disk; `pyside6-essentials` reduces this to ~207 MB with zero code changes for typical desktop apps. PyInstaller output sizes per platform: macOS ~87 MB, Windows ~100 MB, Linux ~600 MB (un-slimmed) → ~200 MB slimmed.

[^chromium-a11y]: Chromium's accessibility implementation (now AccessibilityTree, ARIA-aware) is widely considered the strongest web a11y surface; this is empirically corroborated by WebAIM survey #10 which shows Chrome+NVDA/JAWS as the most-used screen reader+browser pair.

[^pyside-license]: PySide6 license confirmed LGPL-3 (or commercial). Qt for Python documentation, <https://doc.qt.io/qtforpython-6/commercial/index.html>; PyPI `PySide6` package metadata; Riverbank/Qt licensing pages at <https://www.qt.io/licensing/open-source-lgpl-obligations>.

[^pyqt-license]: PyQt6 license confirmed GPL-3 (or commercial via Riverbank Computing). PyPI `PyQt6` page; <https://www.riverbankcomputing.com/commercial/pyqt>; Python GUIs licensing comparison page.

[^agpl-gpl-compat]: GPL-3.0 and AGPL-3.0 are mutually combinable via the §13 clauses each license carries. See FSF: <https://www.gnu.org/licenses/license-compatibility.html> and Wikipedia "GNU Affero General Public License" / "GNU General Public License" articles. The combined work is distributable, with AGPL §13 (network interaction) applying to the combination.

[^qt-uia]: Qt 5.11+ replaced legacy MSAA with a pure UI Automation backend, with MSAA support via the OS UIA-to-MSAA bridge. See <https://doc.qt.io/qt-6/accessible.html> and NVDA issue <https://github.com/nvaccess/nvda/issues/8604> regarding the transition.

[^blind-guru]: <https://blind.guru/blog/2017-08-07-qta11y.html> — extended discussion of Qt accessibility from a blind developer's perspective. Key claim: "text entry fields indeed do not work with the most widely used screen reader on Windows" (JAWS) at the time of writing. Recommendation: "If you want to write cross-platform accessible software: You definitely should not use Qt."

[^anki-a11y]: Anki forums discussion <https://forums.ankiweb.net/t/accessibility-questions-using-anki-if-you-need-to-use-assistive-technology-like-screen-readers/17856> — developer's August 2022 explicit "cannot recommend Anki" for screen reader users; identified issues including modal dialog non-dismissibility, focus defaulting to toolbar, unnamed card-content buttons. No clean resolution since.

[^obs-a11y]: OBS Studio accessibility issues: <https://github.com/obsproject/obs-studio/issues/3361> (filter list invisible to screen readers), <https://github.com/obsproject/obs-studio/issues/3524> (regression: control names disappeared in 26.0.0). Community workaround plugin: <https://github.com/samtupy/obs-accessibility>.

[^qtextedit-md]: `QTextEdit.setMarkdown()` / `toMarkdown()` available since Qt 5.14. See <https://doc.qt.io/qt-6/qtextedit.html>.

[^pyinstaller-pyside]: pythonguis.com PySide6 + PyInstaller tutorials confirm this is the standard packaging path: <https://www.pythonguis.com/tutorials/packaging-pyside6-applications-pyinstaller-macos-dmg/>, <https://www.pythonguis.com/tutorials/packaging-pyside6-applications-windows-pyinstaller-installforge/>.

[^qasync]: <https://github.com/CabbageDevelopment/qasync> and <https://pypi.org/project/qasync/>; fork lineage quamash → asyncqt → qasync; supports PyQt5/6 and PySide2/6; Python 3.8–3.13.

[^qtasyncio]: PySide6 ships `QtAsyncio` module providing native asyncio event loop on Qt's loop: <https://doc.qt.io/qtforpython-6/PySide6/QtAsyncio/index.html>.

[^tk-a11y]: Linux-only ATK exposure via `Tka11y` add-on (<https://pypi.org/project/Tka11y/>); Windows MSAA/UIA support not available in mainline Tk; community thread <https://nvda-addons.groups.io/g/nvda-addons/topic/how_can_i_use_tkinter_to_set/10784805>.

[^wxpython-license]: wxPython License page <https://wxpython.org/pages/license/index.html>; wxWindows Library Licence is essentially LGPL with a binary-distribution exception; OSI-approved; RMS-confirmed GPL-compatible.

[^toga-license]: Toga LICENSE file (BSD 3-Clause, Copyright (c) 2014 Russell Keith-Magee), verified at <https://github.com/beeware/toga/blob/main/LICENSE>.

[^toga-backends]: Toga backend list verified from <https://github.com/beeware/toga>: cocoa, gtk, winforms, android, iOS, qt, web, textual, positron.

[^toga-a11y]: Toga README/site claim: "widgets inherit all of the native platform's accessibility affordances, such as support for screen readers and adaptive font sizes." <https://toga.beeware.org/>.

[^toga-winforms]: WinUI3 backend issue: <https://github.com/beeware/toga/issues/2574>; blocked on Python bindings for WinUI3.

[^toga-release]: Toga 0.5.4 release date May 6, 2026; 0.5.0 was March 2025 milestone (<https://beeware.org/news/buzz/>).

[^briefcase]: Briefcase docs <https://briefcase.beeware.org/>; supports .app/.dmg/.pkg on macOS, MSI on Windows, AppImage/deb on Linux, plus iOS/Android.

[^briefcase-size]: Briefcase bundles a complete isolated Python interpreter per app — slightly space-inefficient but guarantees each app has its known-good Python. Typical bundle ~50-80 MB plus your code.

[^pyloid-license]: Pyloid LICENSE file is Apache-2.0 (template form, copyright holder name not filled in). PySide6 dependency remains LGPL-3.

[^pyloid-pypi]: PyPI `pyloid` page <https://pypi.org/project/pyloid/>; version 0.27.2 released November 8, 2025; supports Python 3.9-3.13; pinned PySide6 6.9.2; deps include platformdirs, pickledb, aiohttp-cors, aiofiles.

[^pyloid-deepwiki]: DeepWiki Pyloid architecture summary: <https://deepwiki.com/pyloid/pyloid> — three-layer architecture (user-facing QtWebEngine + system integration / framework core Pyloid+BrowserWindow+PyloidIPC+PyloidRPC / Qt foundation PySide6).

[^pyloid-hn]: Show HN November 2025 thread: <https://news.ycombinator.com/item?id=45950724>.

[^pyloid-quickstart]: Pyloid quickstart CLI scaffolds React/Vue/Svelte/SvelteKit/Next.js + JS/TS + Pyloid-RPC/FastAPI: <https://pyloid.com/>.

[^pywebview-license]: pywebview LICENSE file (BSD-3-Clause); <https://github.com/r0x0r/pywebview>.

[^pywebview-repo]: pywebview repo statistics from <https://github.com/r0x0r/pywebview>: ~5.9k stars; 2,443 commits on master; latest 6.2.1 April 2026; very active.

[^pywebview-engines]: pywebview docs <https://pywebview.flowrl.com/guide/web_engine.html> — Windows: WebView2 (Chromium) primary, CEF / MSHTML fallback. macOS: WKWebView. Linux GTK: WebKit2GTK ≥2.2. Linux Qt: QtWebEngine or QtWebKit. Android: Chromium via WebKit.

[^pywebview-a11y-545]: pywebview issue #545 (closed-stale, never fixed): "Most controls aren't accessible to blind users via screen readers like NVDA" <https://github.com/r0x0r/pywebview/issues/545>.

[^webview2-a11y]: WebView2Feedback#2330 "WebView2 control is completely inaccessible with screen readers (NVDA, JAWS and partially with Narrator too)" <https://github.com/MicrosoftEdge/WebView2Feedback/issues/2330>.

[^eel-archived]: Eel repository archived June 22, 2025; <https://github.com/python-eel/Eel>.

[^flet-license]: Flet LICENSE file Apache-2.0 (template form): <https://github.com/flet-dev/flet/blob/main/LICENSE>.

[^flet-repo]: Flet repository: 16.1k stars; latest v0.85.1 May 13, 2026; <https://github.com/flet-dev/flet>.

[^flutter-3-32-a11y]: Flutter 3.32 (May 2025) shipped `SemanticsRole` API, ~80% faster semantics tree compilation, ~30% web frame-time reduction with semantics enabled, text-field/focus/menu/slider/dropdown screen-reader improvements. Coverage summary at <https://dcm.dev/blog/2025/06/30/accessibility-flutter-practical-tips-tools-code-youll-actually-use/>.

[^flclash-a11y]: Real-world Flutter desktop a11y issues reported in 2024-2025 on third-party apps, e.g. <https://github.com/chen08209/FlClash/issues/1576> — "UI elements appear to the screen reader as a single graphic object," "Tab key does not move focus between buttons or input fields," "NVDA cannot read button labels."

[^nicegui-repo]: NiceGUI repository: 15.8k stars; v3.12.1 May 2026; ~6,678 commits on main; <https://github.com/zauberzeug/nicegui>.

[^nicegui-native]: NiceGUI native mode via `ui.run(native=True)` wraps the app in a pywebview window. Architectural notes: <https://news.ycombinator.com/item?id=35386990>.

[^kivy-license]: Kivy LICENSE file (MIT, "Copyright (c) 2010-2025 Kivy Team and other contributors"); <https://github.com/kivy/kivy/blob/master/LICENSE>.

[^kivy-a11y]: Kivy a11y issues: <https://github.com/kivy/kivy/issues/2820>, <https://github.com/kivy/kivy/issues/5836>, <https://github.com/kivy/kivy/issues/8596>. Kivy 3.0 plan integrates AccessKit.

[^accesskit-python]: AccessKit Rust core with Python bindings via PyO3: <https://github.com/AccessKit/accesskit> and <https://github.com/AccessKit/accesskit-python>. Already integrated in egui (Rust immediate-mode UI) which proves the model works.

[^psg-5-license]: PySimpleGUI 5.0 commercial-license launch: <https://www.globenewswire.com/news-release/2024/04/01/2855346/0/en/PySimpleSoft-releases-PySimpleGUI-5-the-top-rated-Python-GUI-development-environment-with-a-99-perpetual-license.html> ($99 perpetual; anti-redistribution clauses; cannot share developer key).

[^psg-5-shutdown]: PySimpleSoft shutdown announcement February 2025; PySimpleGUI 5 re-released LGPL-3 on GitHub and PyPI after community backlash. Discussion: <https://discuss.python.org/t/pysimplegui-now-requires-a-paid-license-opinions/48790>.

[^pymupdf-license]: PyMuPDF dual-licensed AGPL-3.0 or commercial via Artifex Software; commercial license typically $10-50k/year. PyPI: <https://pypi.org/project/PyMuPDF/>.

[^pyinstaller-signing]: macOS signing/notarization with PyInstaller: hardened-runtime entitlements required (allow unsigned executable memory), all bundled Python libraries individually signed, use `notarytool` (since `altool` deprecated Nov 2023). Known issues: <https://github.com/pyinstaller/pyinstaller/issues/7937>, gist reference <https://gist.github.com/txoof/0636835d3cc65245c6288b2374799c43>.
