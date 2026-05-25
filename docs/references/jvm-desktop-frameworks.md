# JVM / Kotlin Desktop Frameworks — Evaluation for an Accessibility-First Note-Taking App

> **Context.** We are currently leaning Electron for the desktop shell because (a) bundled Chromium gives the strongest accessibility-tree exposure to JAWS/NVDA/VoiceOver/AT-SPI of any webview option in 2026, (b) we are already paying a ~300–400 MB Python sidecar tax (Docling, markitdown, faster-whisper, RapidOCR/MinerU, Supertonic/Piper), so Electron's ~150 MB Chromium tax is small at the margin, and (c) every shipping accessibility-grade desktop note-taker we can name (VS Code, Obsidian, Logseq, Standard Notes, Joplin, Slack) ships on Electron. The JVM angle is worth taking seriously because IntelliJ IDEA, Android Studio, PyCharm, and CLion are accessibility-grade Swing apps used by blind developers in production for over a decade — the prior art is genuine. This document evaluates whether any JVM-family option is a credible alternative for *this specific app* in May 2026.
>
> **Rubric (six bullets, all load-bearing).**
> 1. **Accessibility:** real OS a11y tree exposed to UIA / NSAccessibility / AT-SPI, with JAWS / NVDA / VoiceOver / Orca actually reading our UI today — not "planned for a future release." WCAG 2.1 AA non-negotiable, AAA aspirational.
> 2. **Rich-editor surface:** can the framework host a TipTap / Lexical / CodeMirror 6 editor? (i.e., does it have a usable webview, or a native equivalent of comparable richness?)
> 3. **PDF + math rendering:** PDF.js, MathJax/MathML — same webview hosting question; native alternatives (PDFBox, JLatexMath) are weaker.
> 4. **Audio capture + global hotkey + system tray + file watching:** all solvable on every JVM toolkit; not a discriminator.
> 5. **AGPL-3.0 distribution:** framework license must permit linking from an AGPL application. OpenJDK's *GPL-2-with-Classpath-Exception* is the standard JVM pattern and is fine for AGPL; EPL-2.0, commercial-only, and LGPL each have caveats.
> 6. **Python-sidecar reality check:** since our pipeline (Docling, whisper, OCR, TTS) is Python-only, the JVM does **not** let us collapse the sidecar layer. We pay the JVM tax *on top of* the Python tax. That is the central commercial question for any JVM bet.
>
> **Taxonomy of candidates.**
> - **(A) Classic Java GUI toolkits** — Swing, JavaFX / OpenJFX. (SWT moved to license appendix.)
> - **(B) Modern declarative cross-platform** — Compose Multiplatform (incorporates "Jetpack Compose Desktop"), TornadoFX (archived).
> - **(C) Embedded webview inside JVM** — JavaFX WebView, JCEF (Java Chromium Embedded Framework).
> - **(D) Web-server-as-UI hybrids** — Vaadin (Flow / Hilla).
> - **(E) Unmaintained / license-disqualified** — see appendix.
> - **Adjacent / packaging-only tooling** — Conveyor (Hydraulic), jpackage, jlink, FlatLaf, RSyntaxTextArea, jnativehook, Apache PDFBox.

---

## 1. Swing (classic Java GUI toolkit)

- **Home / docs:** Bundled with every JDK; tutorial at <https://docs.oracle.com/javase/tutorial/uiswing/>. Modern look-and-feel typically via **FlatLaf** (<https://www.formdev.com/flatlaf/>, repo <https://github.com/JFormDesigner/FlatLaf>, Apache-2.0, 4,184 stars, last commit 2026-05-17).[^flatlaf]
- **License + AGPL verdict:** Swing is part of OpenJDK and ships under **GPL-2 with the Classpath Exception**.[^openjdk-license] The Classpath Exception explicitly permits linking your independent application code with the JRE without making your app GPL'd, so an AGPL-3.0 app linking to Swing is fine. **AGPL-compatible.**
- **Family:** Classic Java GUI toolkit. Pure-Java widget set drawn by the JDK (not native widgets), shipped with every JDK.
- **Rendering model:** All widgets are drawn by Swing's own Java2D pipeline; the OS does not draw the buttons/menus. Theming via Look-and-Feel SPI (Nimbus, FlatLaf, Darcula, etc.).
- **Accessibility verdict (Strong on Windows + macOS, Partial on Linux).** Swing implements the `javax.accessibility` API (`AccessibleContext`, `AccessibleRole`, `AccessibleAction`, `AccessibleText`) and routes to the OS through **Java Access Bridge** (JAB) on Windows and the JDK's NSAccessibility shim on macOS.[^jab-oracle] NVDA ≥ 2019.3 and JAWS ≥ 12.0.1158 read Swing apps via JAB.[^idea-a11y] The canonical prior art is IntelliJ IDEA / Android Studio / PyCharm / CLion, used by blind developers with NVDA on Windows and VoiceOver on macOS in production. **macOS support is documented to be less complete than Windows** ("you can open and build a project but may experience difficulties with editing, navigation"); Linux relies on the JDK's AT-SPI bridge, which is historically the weakest of the three.[^idea-a11y]
- **Major Windows gotcha (new in 2026):** *Eclipse Temurin (Adoptium) does not ship Java Access Bridge.* The Adoptium maintainers confirm JAB was an Oracle JDK feature that was never picked up by Temurin.[^temurin-jab] In practice this means: if we bundle Temurin via jpackage, Windows screen-reader users see nothing; we must either bundle Oracle JDK, Azul Zulu (which does include JAB and is GPL-2+CPE), or JetBrains Runtime, all of which add a license-or-distribution wrinkle. The IDEA installer ships JBR specifically for this reason.
- **Webview availability:** None natively (`JEditorPane` is HTML 3.2 era and not viable). Use JCEF (see §6) or JavaFX WebView via `JFXPanel` for embedded web content.
- **Rich-editor story:** Native options (`RSyntaxTextArea` — BSD-3, 1,236 stars, last commit 2026-03-30; `JTextPane`) are fine for code/plain text but no match for a ProseMirror-grade editor. For TipTap/Lexical we need JCEF.
- **Audio / microphone:** `javax.sound.sampled` + `TargetDataLine` is standard, well-documented, adequate.[^javasound]
- **Packaging:** `jpackage` (since JDK 14) + `jlink`-trimmed JRE produces ~80–160 MB installers per platform; a real-world reduction from ~160 MB to ~82 MB by trimming modules is documented.[^jpackage-size]
- **Maintenance signals:** Swing is in maintenance-only mode inside the JDK (no new features, but bugs are fixed; FlatLaf carries the modern look). OpenJDK itself is the most active runtime project in the world.
- **Known gotchas:** HiDPI defaults are inconsistent across LAFs (FlatLaf is the de-facto fix); custom-painted components must implement `AccessibleContext` correctly or screen readers see nothing; JAB has to be turned on by the user (`%JAVA_HOME%\bin\jabswitch /enable`) on Windows — friction even when JAB is bundled; Temurin JAB-gap above.
- **Verdict for our use case: Plausible (and the strongest pure-JVM a11y story).** This is the only JVM toolkit with a multi-decade track record of shipping accessibility-grade desktop apps that blind users actually use professionally (IntelliJ family). The right Swing bet for us is **Swing + JCEF** (see §10.2) — Swing for chrome/menus/dialogs (which JAB handles well) and JCEF for the editor pane (Chromium-grade a11y inside the WebView). Pure Swing without JCEF cannot host TipTap/Lexical and cannot match Electron's editing UX.

---

## 2. JavaFX / OpenJFX

- **Home / docs:** <https://openjfx.io/>, source at <https://github.com/openjdk/jfx>.
- **License + AGPL verdict:** **GPL-2 with Classpath Exception** (verified — repo's `LICENSE` is GPL-2.0; the OpenJFX project itself states "free software; licensed under the GPL with the class path exception, just like the OpenJDK"[^openjfx-license]). **AGPL-compatible** for the same Classpath-Exception reason as Swing.
- **Family:** Modern Swing successor, retained-mode scene graph + CSS styling. Shipped *separately* from the JDK since Java 11 (must be added as a Maven/Gradle dep or via the Gluon JavaFX SDK). Latest stable: JavaFX 25 (Sep 2025) with JavaFX 26 in development; WebView is on WebKit 622.1 in JavaFX 25, 620.1 in JavaFX 24.0.2.[^jfx-webkit]
- **Rendering model:** Scene graph rendered through Prism (DirectX / Metal / OpenGL); native pixels not native widgets.
- **Accessibility verdict (Partial — meaningfully behind Swing).** JavaFX has an accessibility API (`AccessibleRole`, `AccessibleAttribute`) and the documentation claims "JavaFX supports accessibility on Windows and Mac OS X" with Narrator / JAWS / VoiceOver.[^jfx-a11y] In practice the OpenJFX project's own wiki characterizes a11y as work-in-progress ("Accessibility has remained unimplemented in OpenJFX" — historical exploration page).[^jfx-a11y-wiki] Recent OpenJFX releases (23, 24, 25) have continued to add keyboard scrolling and navigation fixes for `ListView`/`TreeView`/`TableView`, indicating that fundamentals are still being filled in. **Linux a11y (AT-SPI) is the weakest of the three platforms.** No JAB intermediation is required (JavaFX talks UIA on Windows directly), so the Temurin-JAB gap does not apply.
- **Webview availability:** Yes — `javafx.scene.web.WebView`, backed by a JavaFX-shipped fork of WebKit (GTK lineage), upgraded ~every 6 months.[^jfx-webkit] **A11y consequence:** we'd inherit WebKitGTK's a11y story (decent on macOS via VoiceOver, weaker on Windows than Chromium, dependent on AT-SPI on Linux). Notably weaker than JCEF/Chromium for screen-reader exposure, especially on Windows.
- **Rich-editor story:** WebView can host TipTap / Lexical / CodeMirror but the underlying WebKit is several major versions behind Chromium and lags on modern web platform features (CSS Container Queries, View Transitions, recent IntersectionObserver behavior, etc.); we have hit real compatibility issues with modern web apps in JavaFX WebView in the past.
- **Audio:** `javax.sound.sampled` works in JavaFX apps too.
- **Packaging:** jpackage + jlink works identically; the JavaFX modules add ~30–50 MB on top of a trimmed JRE.
- **Maintenance signals:** Active. Repo: 3,238 stars, last commit 2026-05-23. JavaFX 25 in Sep 2025, point releases through 2026.
- **Known gotchas:** WebView WebKit is older than Chromium and slips behind on web standards; JavaFX must be added as a separate dep (no longer bundled in the JDK since 11); HiDPI on Windows still has rough edges in some controls.
- **Verdict for our use case: Weak.** JavaFX a11y is unambiguously worse than Swing's, the WebView's WebKit-GTK is worse than JCEF's Chromium for hosting modern web editors, and there is no compensating advantage. TornadoFX (a Kotlin DSL on top of JavaFX) is now archived (see §4), so the only ergonomic upgrade is gone. **Pass.**

---

## 4. TornadoFX (Kotlin DSL on JavaFX)

- **Home / docs:** <https://github.com/edvin/tornadofx>.
- **License + AGPL verdict:** Apache-2.0 (verified). Compatible with AGPL.
- **Maintenance signals: ARCHIVED.** The GitHub repo is `archived: true`, last commit 2023-04-13.[^tornadofx-archived] 3,636 stars, 197 open issues, no activity. Project explicitly stated it was waiting for "decoupled JavaFX" which never arrived as planned, then went dormant.
- **Verdict for our use case: Disqualified (unmaintained).** Inherits JavaFX's a11y story (Weak) and adds an additional unmaintained dependency layer on top. **Pass.**

---

## 5. Compose Multiplatform (JetBrains — deepest section)

- **Home / docs:** <https://kotlinlang.org/compose-multiplatform/>, repo <https://github.com/JetBrains/compose-multiplatform> (19,074 stars, last commit 2026-05-23, **Apache-2.0** per verified repo license metadata). Latest stable **1.11.0** (2026-05-13); **1.12.0-alpha01** out 2026-05-19. **Note:** "Jetpack Compose Desktop" is the same codebase — Compose Multiplatform is JetBrains' umbrella that includes the desktop target; do not treat them as separate options.
- **License + AGPL verdict:** **Apache-2.0** — clean for AGPL.
- **Family:** Modern declarative UI framework on top of Kotlin Multiplatform. Targets Android (stable), iOS (stable since 1.8.0, May 2025), Desktop/JVM (stable: Windows / macOS / Linux), and Web/Wasm (Beta as of 1.9.0).[^compose-roadmap]
- **Rendering model:** **Skia.** Every pixel is drawn by Skia; there are no native widgets in the rendered output, only in the surrounding window chrome and `SwingPanel`/`UIKitView` interop islands. This is the central a11y challenge — there is no native widget for the OS a11y framework to introspect; everything must be reconstructed by an explicit accessibility-tree shim.

### 5.1 The accessibility reality in May 2026

This is critical and JetBrains' marketing does not lead with it. The official docs page **"Support for desktop accessibility features"** (<https://kotlinlang.org/docs/multiplatform/compose-desktop-accessibility.html>) states the current desktop a11y matrix as follows:[^compose-desktop-a11y]

| Platform | Status |
|----------|--------|
| **macOS** | Fully supported |
| **Windows** | Supported **via Java Access Bridge** (and JAB is **disabled by default** — user must run `%JAVA_HOME%\bin\jabswitch.exe /enable`; native distribution must explicitly include the `jdk.accessibility` module) |
| **Linux** | **Not supported** |

That is JetBrains' own published guidance in 2026. It is not a leak; it is the official "Support for desktop accessibility features" page. Recent release-note progress is real but narrow:

- **1.6.0** (Feb 2024) — added iOS accessibility.
- **1.8.0** (May 2025) — "First-class accessibility support with VoiceOver, AssistiveTouch, and Full Keyboard Access" — **iOS only**.[^compose-180]
- **1.10.0** (Jan 2026) — desktop entry points (`ComposeWindow`, `ComposePanel`, `ImageComposeScene`) now expose `semanticsOwners`; bugfix for stale-state announcements.
- **1.11.0** (May 2026) — `[A11y, Windows] Fixed the accessibility hierarchy, allowing NVDA traversal commands to work correctly` (#2637); `TextField now properly uses contentDescription as accessible name` (#2680); VoiceOver "wrong button click" fix (#2720).[^compose-110]

The trajectory is clearly *toward* a real desktop a11y story, but in May 2026:

- **macOS:** VoiceOver works on basic controls. Real-world coverage of complex compositions, custom layouts, scrollables, and overlays is improving but not parity with native AppKit. The "wrong button" VoiceOver bug needed a fix as recently as 1.11.0.
- **Windows:** Works via JAB, with the same screen-reader caveats as Swing — and you must ship JBR (which bundles JAB) rather than Temurin, *and* tell users to enable JAB. NVDA traversal needed a fix as recently as 1.11.0.
- **Linux:** Not supported at all. For an academic note-taking app, the Linux user base is small in absolute terms but disproportionately represented among accessibility-first power users (Orca on Fedora / Ubuntu is a real workflow). Shipping a Linux build that screen-reader users cannot use is a brand and ethics problem.
- **JBR dependency:** JetBrains' recommended setup for desktop Compose is to run on **JetBrains Runtime (JBR)** rather than vanilla OpenJDK, because JBR ships a11y plumbing (including JAB, NVDA Controller Client, and a JCEF binary) that vanilla OpenJDK does not.[^jbr-recommended] We can ship JBR (it is GPL-2+CPE like OpenJDK), but it adds a constraint.

There is no public commitment in JetBrains' **August 2025 KMP roadmap** to closing the Linux desktop a11y gap by any specific date.[^kmp-roadmap-aug2025]

### 5.2 Other rubric items

- **Editor host:** Compose Desktop has no built-in WebView. The community library `compose-webview-multiplatform` (Kevin Zou) wraps **JCEF** for desktop (after dropping JavaFX WebView in 1.3.0); commercial **JxBrowser 8.0+** also targets Compose directly.[^compose-webview] In practice, hosting TipTap/Lexical/CodeMirror in Compose Desktop means embedding JCEF — so the editor pane's a11y is Chromium's, separate from Compose's own a11y for the chrome.
- **Audio / hotkeys / tray:** Standard JVM facilities (`javax.sound.sampled`, `java.awt.SystemTray`, jnativehook for global hooks) all work.
- **Bundle size:** jpackage + jlink yields ~40–100 MB desktop installers; Skiko/Skia native libs add ~20–40 MB per platform.[^compose-size]
- **Shipping apps:** **JetBrains Toolbox** (1M+ MAU, migrated from Electron in 2021), Wrike, Markaz, Feres.[^toolbox-case-study] None are positioned as accessibility-flagship apps.

### 5.3 Verdict for our use case: Weak today, Plausible by 2027 if Linux lands

Compose Multiplatform is the most modern declarative JVM bet by a wide margin, and the development velocity is real. But for an *accessibility-first* app shipping in 2026 under WCAG 2.1 AA non-negotiable + Linux as a first-class target, the framework's own docs say desktop a11y is uneven and Linux is absent. If we picked Compose today we would be a frequent upstream bug-filer through 2026–2027. The honest framing: **the bet for Compose Multiplatform is "we will be early adopters and accept a11y as a 2027 problem."** That conflicts with our non-negotiable. **The precise condition under which we'd reconsider:** Linux desktop a11y reaches "Fully supported" status on the official docs page *and* an independent screen-reader user can complete the app's full task list with Orca on Fedora and NVDA on Windows without manual JAB enablement.

---

## 6. JCEF (Java Chromium Embedded Framework) — deepest section

- **Home / docs:** Upstream <https://github.com/chromiumembedded/java-cef>; JetBrains fork <https://github.com/JetBrains/jcef> (360 stars, last commit 2026-05-11); Maven distribution via <https://github.com/jcefmaven/jcefmaven> (Apache-2.0, 299 stars, last commit 2026-05-05, latest CEF/Chromium 143/146 series).[^jcefmaven]
- **License + AGPL verdict:** The core JCEF code is **BSD 3-Clause** (verified by direct read of `JetBrains/jcef/LICENSE.txt` — Marshall Greenblatt / Google Inc., standard BSD-3).[^jcef-license] The packaging layer `jcefmaven` is Apache-2.0. The bundled Chromium is the standard CEF distribution. **AGPL-compatible** for both the framework and the Chromium binary (Chromium is BSD-3 + a mix of permissive third-party licenses; the project itself ships under those terms).
- **Family:** Embedded webview — Chromium running as a sub-process driven by Java/Kotlin via JNI. Same architectural model as Electron, just driven from a JVM main process instead of a Node main process.
- **Rendering model:** A real Chromium content process drawing into an OS window (or off-screen rendering composited into Swing/JavaFX). HTML/CSS/JS all present.
- **Accessibility verdict (Strong — best of any non-Electron JVM option).** A JCEF pane *is* a Chromium pane; it exposes the full HTML accessibility tree to UIA / NSAccessibility / AT-SPI exactly as Electron does, with the same JAWS / NVDA / VoiceOver / Orca compatibility. The **JetBrains Runtime** that ships JCEF as a first-party component is built with explicit JAWS support and bundles the NVDA Controller Client library for announcement APIs[^jbr-a11y] — i.e., the same people who maintain IntelliJ a11y on Windows treat JCEF as a first-class a11y surface. **In a Swing-shell-plus-JCEF-pane architecture, the JCEF pane's a11y is Chromium-grade and the surrounding Swing chrome's a11y is Swing-grade (Strong on Windows + macOS).**
- **What JetBrains ships through it:** Markdown preview, Jupyter preview, browser-based plugin UIs across IntelliJ-based IDEs.[^jcef-intellij] JCEF is the production a11y bet for JetBrains' own embedded HTML use cases.
- **Bundle size:** Chromium is ~150 MB per platform — same as Electron, because it is the same Chromium. Hydraulic published a Conveyor recipe specifically for shipping JCEF apps with proper code-signing and delta updates (requires Conveyor 7.2+).[^hydraulic-jcef]
- **Maintenance signals:** Upstream `chromiumembedded/java-cef` and JetBrains fork are both actively updated; jcefmaven ships builds tracking CEF within weeks of upstream Chromium releases (chromium-143.x in early 2026, 146.x by mid-2026).
- **Known gotchas:** Bring-your-own-process-management is more manual than Electron; no built-in Node integration (we use Java/Kotlin instead, which for us is fine since our sidecars are Python over `ProcessBuilder` anyway); native binaries are large and platform-specific (must ship per-arch); JCEF DOM bridge is asynchronous callback-based, not as ergonomic as Electron's contextBridge but fully sufficient.
- **Verdict for our use case: Strong** — and architecturally the most interesting JVM option for us. See §10.2 for the full Swing+JCEF deep dive.

---

## 7. Vaadin (Flow / Hilla)

- **Home / docs:** <https://vaadin.com/>.
- **License + AGPL verdict:** Apache-2.0 core (compatible with AGPL); commercial Pro tier for some components.
- **Family:** Vaadin is a **web framework**, not a desktop framework. Flow renders server-side from Java and pushes diffs to the browser; Hilla is a React-on-Spring stack. Vaadin's official "desktop" story is *wrap-with-Electron* (see <https://github.com/MarciaBM/electron-vaadin-hilla-template>, <https://github.com/jreznot/electron-java-app> — the canonical examples ship Electron around a Jetty-embedded Vaadin app).[^vaadin-electron]
- **Accessibility verdict (N/A — not a desktop framework for our purposes).** Vaadin components themselves do reasonably on WCAG and Vaadin makes a11y claims, but the desktop story is "ship Electron + Jetty + Java + Vaadin," which is *more* runtime tax than Electron + Node, not less, and gives us nothing we don't already get from Electron alone.
- **Verdict for our use case: Pass.** If we want a Java backend with a web UI on the desktop, the honest answer is "use Electron and put Java behind it" — at which point Vaadin is one of several options, not a special one. **Not a JVM-desktop framework in any meaningful sense.**

---

## 9. webview (ronysfreitas/webview)

- The "webview" listed on the source page (`ronysfreitas/webview`) is an Android WebView template, not a JVM-desktop framework. The original `webview` cross-platform C library has a Kotlin-MPP wrapper (`webviewkoCLI`) that is **archived** because the underlying `webviewko` binding is unmaintained.[^webviewko-archived]
- **Verdict for our use case: Disqualified (mislabeled and/or unmaintained).**

---

## 10. Honest comparison table

| Framework | License | AGPL-compat | Family | Rendering | a11y (desktop) | Editor-host viable? | Bundle (trimmed JRE) | Active 2025–26 | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **Swing** | GPL-2+CPE | Yes | Classic (drawn) | Java2D | **Strong** Win/macOS, Partial Linux (JAB required on Win; Temurin gap) | Only via JCEF / JFX WebView | 80–160 MB | Yes (in JDK) | **Plausible (best pure-JVM a11y)** |
| **JavaFX / OpenJFX** | GPL-2+CPE | Yes | Classic (Prism) | Prism (DX/Metal/GL) | Partial Win/macOS, Weak Linux | Yes, via JFX WebView (WebKit ~older) | 100–180 MB | Yes (JFX 25, 26 dev) | **Weak** |
| **TornadoFX** | Apache-2.0 | Yes | Modern (DSL on JFX) | Inherits JFX | Inherits JFX (Partial) | Inherits JFX WebView | Same as JFX | **Archived 2023** | **Disqualified (unmaintained)** |
| **Compose Multiplatform** | Apache-2.0 | Yes | Modern declarative | Skia (custom-drawn) | macOS Full; Windows via JAB (off by default); **Linux Not supported** | Only via JCEF interop | 60–120 MB | Yes (1.11, very active) | **Weak today, Plausible 2027** |
| **JCEF** | BSD-3 (Chromium: BSD+permissive) | Yes | Embedded webview | Chromium | **Strong** (same as Electron) | **Yes — natively** | +150 MB Chromium / platform | Yes (CEF tracks Chromium) | **Strong (as a pane)** |
| **Vaadin** | Apache-2.0 + commercial | Yes (core) | Web-server-as-UI | Browser | N/A as desktop | N/A | N/A (server) | Yes | **Pass (not a desktop framework)** |
| **webview (ronysfreitas / webviewko)** | mixed | n/a | Wrapper | Native | Inherits OS webview | Yes | Small | **Unmaintained** | **Disqualified (unmaintained)** |

For frameworks excluded on license grounds (SWT, JxBrowser), see the appendix below.

---

## 11. Deep dives on the three most strategically interesting options

### 11.1 Compose Multiplatform — the modern declarative bet

**The promise.** Single Kotlin codebase across Android, iOS, Desktop, Web. Lean ~60–120 MB desktop installers with jlink. Production validation from JetBrains Toolbox (1M+ MAU). Excellent DX with Compose Hot Reload (default in 1.10.3+). Apache-2.0 (clean AGPL).

**The accessibility reality as of May 2026.** Per JetBrains' own "Support for desktop accessibility features" docs page:
- macOS: Fully supported.
- Windows: Works via JAB; JAB is off by default; user must enable; native dist must include `jdk.accessibility` module; JBR recommended over Temurin.
- **Linux: Not supported.**

Release-notes archaeology confirms the official page: Compose 1.10.0 finally exposed `semanticsOwners` on desktop entry points (Jan 2026); 1.11.0 (May 2026) finally fixed an NVDA traversal bug on Windows; 1.6.0 added iOS a11y; 1.8.0 made iOS a11y "first-class." Desktop has been the slowest target. The **August 2025 KMP roadmap** highlights Web/Wasm Beta, iOS DX, and Swift export — there is no public commitment to Linux desktop a11y on any timeline.

**Where Compose Multiplatform's a11y has to come from.** Because every pixel is Skia-drawn, Compose must hand-roll a semantic tree per OS and bridge it: NSAccessibility on macOS, MSAA-via-JAB on Windows, AT-SPI on Linux. The macOS bridge is the most mature (Skiko has had `org.jetbrains.skiko.AccessibilityKt.initializeCAccessible` for years); Windows shares the JAB-mediated path with Swing but with Compose's own semantic tree as the source; Linux requires a Skiko-to-AT-SPI bridge that JetBrains has not landed.

**Realistic 2026 verdict.** For a *general* desktop app, Compose Multiplatform is a credible production choice — Toolbox proves it. For an *accessibility-first* app committed to WCAG 2.1 AA non-negotiable across Windows + macOS + Linux, Compose's own docs say one of those three is unsupported and another requires manual user setup. **We would be early adopters fixing a11y bugs upstream through 2026–2027.** That is at odds with the project's premise.

**The precise condition under which we'd switch:** The official docs page lists Linux as "Fully supported," and an independent screen-reader user can complete our full task flow with Orca on Fedora and NVDA on Windows without manually running `jabswitch /enable`. Realistic timeline: ≥ 18 months out.

### 11.2 Swing + JCEF — the pragmatic accessibility-grade bet

**The architecture.** A Kotlin/Swing shell (FlatLaf for modern look, JFormDesigner-style layout) wraps a JCEF pane that hosts our TipTap/Lexical editor, MathJax, PDF.js, and any other DOM-resident UI. Surrounding chrome (menus, dialogs, command palette, sidebar tree, settings, system tray, global hotkey overlay) is native Swing.

**Why this is the strongest non-Electron a11y bet on the JVM.**
- **Editor pane:** Chromium's a11y tree — identical to Electron — exposed to UIA / AX / AT-SPI. JAWS / NVDA / VoiceOver / Orca all work on the editor surface.
- **Surrounding chrome:** Swing's JAB-mediated a11y on Windows (the IntelliJ stack), NSAccessibility on macOS, AT-SPI on Linux. Two decades of blind-developer testing in IntelliJ.
- **Two-pane a11y split.** Screen readers handle the focus/role switch at the JCEF window boundary correctly in practice (this is how IntelliJ's Markdown / Jupyter preview works; if there were a sharp regression, JetBrains' blind users would have reported it long ago).

**Concrete prior art.** JetBrains uses JCEF in IntelliJ for Markdown preview, Jupyter preview, and various plugin UIs.[^jcef-intellij] Anki uses the analogous architecture in the Qt world: Qt shell + `QtWebEngineWidgets` (which is Chromium) for card rendering.[^anki-qt] The pattern is well-trodden.

**Bundle implications.** Trimmed JRE (~40–80 MB) + JCEF Chromium (~150 MB per platform) + our Python sidecar payload (~300–400 MB) ≈ ~500–630 MB per platform. **This is larger than Electron** (Electron's Chromium ~150 MB + Node ~30 MB + Python sidecars 300–400 MB ≈ ~480–580 MB). The JVM tax is real and *adds* to the Chromium tax instead of replacing it.

**Packaging.** Hydraulic Conveyor publishes a `jcef-conveyor` example specifically for shipping JCEF apps with code signing and delta updates (Conveyor 7.2+). jpackage alone is workable but its macOS notarization story is rough — jpackage's bundles fail notarization without re-signing due to missing hardened-runtime entitlements and timestamp gaps.[^jpackage-notarize] Conveyor papers over this on the macOS side via Sparkle 2.

**Verdict.** This is the only JVM architecture in which a screen-reader user has an end-to-end accessibility-grade experience in May 2026 across all three OSes. It is also more complex, larger, and slower-starting than Electron — without buying us anything Electron does not already provide. See §12.

### 11.3 JavaFX / TornadoFX + JavaFX WebView — the all-OpenJFX bet

**The architecture.** A JavaFX/Kotlin scene-graph shell with embedded `WebView` for editor/PDF/math.

**Why it loses.**
- **TornadoFX is archived** (April 2023 last commit), so the Kotlin ergonomics layer is gone. Writing modern Kotlin against raw JavaFX is workable but feels dated.
- **JavaFX a11y is meaningfully behind Swing's** — see §2; OpenJFX's own wiki tracks a11y as exploration-tier work; recent release notes show fundamental keyboard-nav fixes still landing in 2024–2025.
- **JavaFX WebView's WebKit lags Chromium by 6–18 months** on web platform features. TipTap, Lexical, and CodeMirror 6 all target current browsers; we have hit modern-CSS and JS-engine incompatibilities in JavaFX WebView before.
- WebKit's a11y on Windows (where JAWS/NVDA dominate) is weaker than Chromium's.

**Verdict.** Strictly dominated by both Swing+JCEF (better a11y, better web compat) and pure Electron (better a11y, better web compat, smaller stack). No reason to choose this for our app.

---

## 12. Verdict relative to Electron

### Does the JVM credibly beat Electron for *this* app?

**No.** With evidence:

1. **Accessibility.** The best JVM a11y story (Swing + JCEF) is *equal* to Electron in the editor pane (same Chromium) and arguably *equal-to-slightly-better* in the surrounding chrome (Swing's JAB-mediated a11y on Windows is at least as battle-tested by IntelliJ as Electron's BrowserWindow chrome a11y is by VS Code). It does not *beat* Electron — and the cost of getting there is much higher complexity.
2. **Bundle size.** The Python-sidecar payload (~300–400 MB) is the dominant cost in both cases. JVM does not eliminate it. Adding a trimmed JRE (+40–80 MB) and JCEF Chromium (+150 MB) yields a **larger** distribution than Electron's Chromium + Node + Python sidecars. Bundle size goes *up*, not down.
3. **Sidecar architecture is unchanged.** `ProcessBuilder` replaces `child_process.spawn`. We get exactly the same async-IPC architecture. The JVM does not let us host CPython in-process meaningfully (Jython is dead for our deps; GraalPython does not support our scientific Python stack).
4. **Editor maturity.** Our editor stack (TipTap, Lexical, CodeMirror 6, MathJax, PDF.js) is web-first. No JVM-native option matches it; JCEF *is* Chromium, so we're back to Electron with a JVM main process.
5. **Auto-update.** Squirrel.Mac / .Win are well-trodden for Electron. JVM auto-update is less mature; Conveyor (paid for commercial, free for OSS) is the modern best option but is a single-vendor tool, while Electron's update path has many vendors.
6. **Notarization on macOS.** Easier with Electron (electron-builder / electron-forge) than with jpackage (which requires post-build re-signing).
7. **macOS / Windows / Linux a11y matrix.** Electron's Chromium gives uniform a11y exposure across all three (with Orca-on-Linux real-world gaps in some specific cases, but at least *something* on each OS). The best JVM option (Compose Multiplatform) says "Linux: Not supported" in its own 2026 docs. The IntelliJ-style Swing path has the Linux AT-SPI weakness too, though less catastrophically than Compose.

### The strongest argument *for* JVM that survives scrutiny

Swing + JCEF is the one architecture where we genuinely get a high-quality native shell *and* a Chromium-grade editor pane in the same app, and the shell side benefits from 20+ years of IntelliJ-driven a11y polish. If we had no Python sidecars (so the only JVM-vs-Node delta was the JVM cost itself) and we strongly preferred Kotlin's type system over TypeScript, this would be a real consideration. **We have Python sidecars and the team prefers TypeScript on the renderer; the comparative advantage is mostly theoretical for us.**

### If the JVM *is* picked, which framework?

**Swing + JCEF** on accessibility merits — the only option that gives a real screen-reader experience across Windows, macOS, and Linux in May 2026. Compose Multiplatform is the option to choose if you can accept a11y as a 2027 problem and you really want the modern declarative DX.

### Precise condition under which we'd switch to JVM

We would switch off Electron and onto **Swing + JCEF** only if:
- An independent accessibility audit found that Swing's JAB-mediated chrome a11y materially outperforms Electron's BrowserWindow chrome a11y on JAWS-on-Windows (the screen reader most over-represented among enterprise/government academic users) — *and*
- Our team capacity allowed us to absorb the JVM + Conveyor + JCEF packaging burden on top of the Python sidecar burden — *and*
- We were willing to commit to bundling JetBrains Runtime (not Temurin) on Windows to get JAB support out of the box.

We would switch to **Compose Multiplatform** only if Linux desktop a11y reaches "Fully supported" on the official docs page and we have user-tested screen-reader flows on Orca-Fedora and NVDA-Windows that pass our task list without manual setup steps. Realistically not before mid-2027.

---

## 13. Cross-cutting gotchas and things to know

- **Java Access Bridge on Windows is not universal.** Adoptium Temurin does **not** ship JAB — this was an Oracle JDK feature never adopted by Temurin.[^temurin-jab] If we want JAB out of the box, we must bundle Oracle JDK (license complications for redistribution), **Azul Zulu** (GPL-2+CPE, ships JAB, generally acceptable), or **JetBrains Runtime** (GPL-2+CPE, ships JAB + NVDA Controller Client + JCEF; recommended for Compose). JAB is also off by default on the JRE level; users must `jabswitch /enable` unless our installer does it. This is a real friction point for end users that has bitten IntelliJ users for years.
- **macOS notarization** for JVM apps is harder than for Electron: jpackage's output fails notarization without re-signing due to missing hardened-runtime entitlements and timestamp gaps.[^jpackage-notarize] Conveyor handles this via Sparkle 2 and codesigning, but is a single-vendor solution.
- **Auto-update** for JVM apps: Conveyor (uses Sparkle 2 on macOS; native MSIX/etc. on Windows; native package formats on Linux) is the cleanest modern option, free for OSS projects. install4j (commercial) is also widely used.
- **JCEF bundle realities.** The Chromium native blob is ~150 MB per platform per arch — exactly the same as Electron, because it *is* Chromium. Delta updates via Conveyor are essential to keep update bandwidth sane.
- **HiDPI.** JavaFX is best out of the box. Modern Swing via FlatLaf is fine. Compose is Skia-rendered and DPI-aware. Vanilla Swing with the system LAF is the rough one.
- **Async runtime.** Kotlin coroutines, Java Loom virtual threads (stable since JDK 21), RxJava — none block us. All are AGPL-compatible (Kotlinx is Apache-2.0; Loom is GPL-2+CPE; RxJava is Apache-2.0).
- **Math rendering.** No good JVM-native alternative to MathJax/KaTeX. JLatexMath exists but is rendered-to-image and not screen-reader-friendly. This further pushes us toward a webview-hosted approach (JCEF) whether we are on Electron or JVM.
- **Audio.** `javax.sound.sampled` (`TargetDataLine`) is adequate but ergonomically clunkier than WebAudio; for STT (faster-whisper sidecar) we mostly need to capture WAV/PCM and forward to the sidecar, which Java does fine.
- **Global hotkey.** `jnativehook` (LGPL — verify GPL/AGPL compat: jnativehook is dual-LGPLv3/GPLv3; AGPL-compatible when consumed as an external library, but be careful about modifying it). Alternative: platform-specific JNI per OS. jnativehook last commit 2024-09-03 — maintained but not very active (1,857 stars).
- **License gotchas in transitive Java deps:** jnativehook (LGPL/GPL — be careful with modifications under AGPL); jcefmaven (Apache-2.0, clean); FlatLaf (Apache-2.0, clean); Apache PDFBox (Apache-2.0, clean — useful as a parsing fallback; not a viewer); RSyntaxTextArea (BSD-3, clean); JxBrowser / install4j (commercial, disqualified for OSS); SWT (EPL-2.0, **not GPL/AGPL-compatible**); OpenJFX, OpenJDK, JBR (GPL-2 + Classpath Exception, **compatible with AGPL**).
- **Vaadin trap.** If anyone proposes "use Vaadin on the desktop," the canonical answer is *Vaadin-on-the-desktop is Vaadin-in-Electron-with-an-embedded-Jetty* — strictly more runtime than vanilla Electron, with no a11y advantage.
- **Distribution path.** GitHub Releases + Conveyor for cross-platform signing/notarization/delta-update; signed installers per platform; appcasts hosted on GitHub Pages or our CDN.

---

## Appendix — Disqualified on license

These frameworks were excluded from the main evaluation because their licenses are not compatible with AGPL-3.0 distribution. Listed for completeness so the next person doesn't re-research them.

- **SWT (Standard Widget Toolkit)** — **EPL-2.0** (verified via repo metadata — `spdx_id: EPL-2.0`).[^swt-license] The FSF's published position is that "EPL2 without [the GPL-2-secondary-license designation] remains incompatible with the GPL"; "if this optional designation is absent, then the Eclipse license remains source incompatible with the GPL (any version)."[^fsf-epl] Eclipse SWT does *not* designate a GPL secondary license. **Cannot ship in an AGPL app.** Painful loss: SWT uses native OS widgets directly, so its accessibility story would be the strongest in the JVM family (MSAA/UIA, NSAccessibility, AT-SPI just work). Eclipse IDE is the prior art. None of that matters under our license posture.[^swt-a11y]
- **JxBrowser** (TeamDev) — proprietary commercial license; per-project pricing reportedly ~$5,475/year for typical configurations.[^jxbrowser-price] Distributing an AGPL app that links a proprietary closed-source library to end users is not workable; the JxBrowser license terms also conflict with AGPL's distribution requirements unless special terms are negotiated. **Cannot ship in an AGPL app.** The functional equivalent for our needs is JCEF (covered in §6), which is BSD-3 and clean.

---

## Footnotes

[^flatlaf]: FormDev, *FlatLaf — Flat Look and Feel*. <https://www.formdev.com/flatlaf/>; repository <https://github.com/JFormDesigner/FlatLaf>.
[^openjdk-license]: OpenJDK, *GPLv2 + Classpath Exception*. <https://openjdk.org/legal/gplv2+ce.html>.
[^jab-oracle]: Oracle, *Enabling and Testing Java Access Bridge*. <https://docs.oracle.com/en/java/javase/11/access/enabling-and-testing-java-access-bridge.html>.
[^idea-a11y]: JetBrains, *Accessibility | IntelliJ IDEA Documentation*. <https://www.jetbrains.com/help/idea/accessibility.html>. "NVDA version 2019.3 or later... JAWS version 12.0.1158 64-bit or later. IntelliJ products can be used with screen readers, best of all with NVDA on Windows. ... Fuller screen reader support is provided on Windows rather than macOS."
[^temurin-jab]: Adoptium, GitHub issue #1281 "Does v8 LTS have a roadmap for JAB (Java Access Bridge) support?" — maintainer response 2025-05-05: "It does not, this is/was an Oracle JDK feature." <https://github.com/adoptium/adoptium-support/issues/1281>.
[^javasound]: Oracle, *Capturing Audio* (Java Tutorials). <https://docs.oracle.com/javase/tutorial/sound/capturing.html>.
[^jpackage-size]: Multiple sources: jpackage app images are typically ~160 MB unmodified, reducible to ~82 MB by trimming with jlink. See <https://tanin.nanakorn.com/publishing-a-java-based-database-tool-on-mac-app-store-mas/>.
[^openjfx-license]: OpenJFX, *openjfx.io* — "free software; licensed under the GPL with the class path exception, just like the OpenJDK." Repo license: GPL-2.0 (verified via `gh api repos/openjdk/jfx`).
[^jfx-webkit]: Gluon, *OpenJFX 24/25 Release Notes*. JavaFX 24.0.2 (July 2025) ships WebKit 620.1; JavaFX 25 ships WebKit 622.1. <https://gluonhq.com/products/javafx/openjfx-24-release-notes/>.
[^jfx-a11y]: Oracle, *JavaFX WebView Overview*. <https://blogs.oracle.com/java/javafx-webview-overview>.
[^jfx-a11y-wiki]: OpenJDK Wiki, *Accessibility Exploration*. <https://wiki.openjdk.org/display/OpenJFX/Accessibility+Exploration>.
[^swt-license]: Verified directly via `gh api repos/eclipse-platform/eclipse.platform.swt` — `spdx_id: EPL-2.0`.
[^fsf-epl]: FSF, *Various Licenses and Comments about Them* — EPL 2.0 entry. <https://www.gnu.org/licenses/license-list.en.html>. "EPL2 without [GPL-2-secondary designation] remains incompatible with the GPL."
[^swt-a11y]: SWT documentation; `org.eclipse.swt.accessibility` package and IBM accessibility guidelines. <https://www.eclipse.org/articles/Article-Accessibility/>.
[^tornadofx-archived]: Verified via `gh api repos/edvin/tornadofx` — `archived: true`, `pushed_at: 2023-04-13`.
[^compose-roadmap]: JetBrains, *What's Next for Kotlin Multiplatform and Compose Multiplatform – August 2025 Update*. <https://blog.jetbrains.com/kotlin/2025/08/kmp-roadmap-aug-2025/>.
[^compose-desktop-a11y]: JetBrains, *Support for desktop accessibility features*, Kotlin Multiplatform documentation. <https://kotlinlang.org/docs/multiplatform/compose-desktop-accessibility.html>. (Verbatim: macOS "Fully supported"; Windows "Supported via Java Access Bridge"; Linux "Not supported"; JAB disabled by default.)
[^compose-180]: JetBrains, *Compose Multiplatform 1.8.0 Released*. <https://blog.jetbrains.com/kotlin/2025/05/compose-multiplatform-1-8-0-released-compose-multiplatform-for-ios-is-stable-and-production-ready/>. "First-class accessibility support with VoiceOver, AssistiveTouch, and Full Keyboard Access" — iOS-only.
[^compose-110]: JetBrains, *Compose Multiplatform 1.11.0 Release Notes*. <https://github.com/JetBrains/compose-multiplatform/releases/tag/v1.11.0>. Includes "[A11y, Windows] Fixed the accessibility hierarchy, allowing NVDA traversal commands to work correctly" (#2637) and "TextField now properly uses contentDescription as the accessible name/label" (#2680).
[^jbr-recommended]: JetBrains, *Native distributions | Kotlin Multiplatform Documentation*. <https://kotlinlang.org/docs/multiplatform/compose-native-distribution.html>; JBR repo <https://github.com/JetBrains/JetBrainsRuntime>.
[^kmp-roadmap-aug2025]: JetBrains, *What's Next for KMP and Compose – August 2025 Update*. No specific commitment to Linux desktop a11y. <https://blog.jetbrains.com/kotlin/2025/08/kmp-roadmap-aug-2025/>.
[^compose-webview]: Kevin Zou, *compose-webview-multiplatform*. <https://github.com/KevinnZou/compose-webview-multiplatform> (switched from JavaFX WebView to JCEF in v1.3.0). TeamDev, *JxBrowser for Compose Multiplatform*. <https://teamdev.com/jxbrowser/blog/web-view-for-compose-multiplatform/>.
[^compose-size]: jDeploy / Compose Multiplatform tutorials report ~40 MB platform-specific bundles to ~100 MB universal. <https://www.jdeploy.com/docs/tutorials/kotlin-multiplatform/>.
[^toolbox-case-study]: JetBrains, *JetBrains Toolbox Case Study: Moving 1M users to Kotlin & Compose Multiplatform*. <https://blog.jetbrains.com/kotlin/2021/12/compose-multiplatform-toolbox-case-study/>. Toolbox previously was C++/Electron; migrated to Compose for Desktop.
[^jcefmaven]: jcefmaven, repo metadata verified via `gh api repos/jcefmaven/jcefmaven` — Apache-2.0, 299 stars, last pushed 2026-05-05. Tracks current Chromium ~143/146 series in 2026.
[^jcef-license]: Verified by direct read of `JetBrains/jcef/LICENSE.txt` via `gh api repos/JetBrains/jcef/contents/LICENSE.txt` — BSD 3-Clause, copyright Marshall A. Greenblatt / Google Inc.
[^jbr-a11y]: JetBrains/jcef README: "Note: You may skip NVDA controller client installation, but you'd need to patch `mkimages_x64.sh` script." — i.e., JBR's standard build includes the NVDA Controller Client for a11y announcement. <https://github.com/JetBrains/jcef/blob/dev/README.md>.
[^jcef-intellij]: JetBrains, *Embedded Browser (JCEF) | IntelliJ Platform Plugin SDK*. <https://plugins.jetbrains.com/docs/intellij/embedded-browser-jcef.html>. JCEF is used to render Jupyter and Markdown previews.
[^hydraulic-jcef]: Hydraulic, *Deploying apps with JCEF*. <https://hydraulic.dev/blog/13-deploying-apps-with-jcef.html>; sample at <https://github.com/hydraulic-software/jcef-conveyor>.
[^vaadin-electron]: <https://github.com/MarciaBM/electron-vaadin-hilla-template> and <https://github.com/jreznot/electron-java-app>; Vaadin docs on embedding.
[^jxbrowser-price]: Vendr.com pricing-data aggregator reports JxBrowser average annual cost ~$5,475 (varies by license tier). <https://www.vendr.com/buyer-guides/jxbrowser>.
[^webviewko-archived]: <https://github.com/Winterreisender/webviewkoCLI> — archived because the underlying webviewko binding is unmaintained.
[^anki-qt]: AnkiWeb forums and add-on docs confirm Anki ships QtWebEngine (Chromium-based) for card rendering. <https://addon-docs.ankiweb.net/qt.html>.
[^jpackage-notarize]: Joel Auterson, *Notarizing Java applications on macOS*. <https://www.joelotter.com/posts/2020/08/macos-java-notarization/>. jpackage output requires re-signing for notarization.
