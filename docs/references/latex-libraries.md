# LaTeX libraries — Rust & TypeScript/JavaScript

Academic note-taking apps live or die by their math story. Students and researchers expect to be able to drop `$\int_0^1 e^{-x^2}\,dx$` into the middle of a sentence and have it render correctly, and they expect to be able to edit it later without re-typing it from scratch. For an accessibility-first app targeting WCAG 2.1 AAA with an explicit ADHD/Autism focus, the math story is even more constrained: the rendered output needs to expose semantic structure to screen readers (not just visual marks), and the *input* path needs an alternative to "memorize 200 backslash commands" — a virtual keyboard, structured editor, or speech-to-math fallback.

The LaTeX / math ecosystem splits cleanly into four buckets, and almost no library does all four well:

1. **Renderers** — take a LaTeX math string and produce HTML/SVG/MathML. Examples: KaTeX, MathJax, Temml, pulldown-latex, ReX.
2. **Input / structured editors** — let a human author a math expression with WYSIWYG affordances, virtual keyboards, and accessibility hooks. Examples: MathLive, MathQuill, prosemirror-math.
3. **Parsers / AST tools** — turn LaTeX source into a tree we can transform, lint, or convert. Examples: unified-latex, latex-utensils, pulldown-latex (also a parser).
4. **Full document compilers** — actually run a TeX engine and emit PDF. Examples: SwiftLaTeX, BusyTex, Tectonic, TeXlyre-BusyTeX.

This document surveys each bucket with an emphasis on (a) license compatibility with our likely AGPL-3.0 shipping license, (b) accessibility behavior (MathML quality, screen-reader output, ARIA, speech), and (c) Electron/Tauri-fit. The Rust ecosystem (Section 6) is small and uneven — most options are either toys, JS wrappers, or part of the Typst orbit. The recommended stacks (Section 7) reflect that reality.

---

## 1. Quick license-compatibility cheat sheet for AGPL-3.0

The app will likely ship under AGPL-3.0-or-later. License compatibility for *linking* (statically or dynamically, including bundling in an Electron/Tauri build) follows:

| Library license | Compatible with AGPL-3.0 work? | Notes |
| --- | --- | --- |
| MIT / BSD-2 / BSD-3 / ISC / Zlib | Yes | Permissive; just preserve notice. |
| Apache-2.0 | Yes | Compatible with GPL-3 / AGPL-3 family (not with GPL-2-only). |
| MPL-2.0 | Yes (file-level copyleft) | MPL files stay MPL when modified; surrounding AGPL code is fine. |
| LGPL-2.1 / LGPL-3 | Yes | Linking allowed; LGPL parts retain LGPL terms. |
| GPL-3.0 | Yes | Same family. |
| AGPL-3.0 | Yes | Same license. |
| GPL-2.0-**only** | **NO** | Cannot be combined with AGPL-3. GPL-2-or-later **is** compatible (because the "or later" lets you upgrade to GPL-3, which is AGPL-compatible via §13). |
| SIL OFL 1.1 (fonts) | Yes (for fonts) | Font-specific license; redistribution allowed with caveats on font name. |
| LPPL 1.3c / GUST Font License (TeX fonts) | Yes (for fonts) | Requires renamed-on-modification for fonts; doesn't infect the app. |
| SSPL / BSL / Elastic / "Source available" | **NO** | Not OSI/FSF free software; incompatible. |
| Proprietary "free for non-commercial" | **NO** | Not redistributable in an open-source product. |

The libraries surveyed below are **all MIT, Apache-2.0, MPL-2.0, AGPL-3.0, LGPL-3.0, or dual MIT/Apache** — there are no SSPL/BSL traps in this corner of the ecosystem at the time of writing. The one library to be careful with is **`tex2math`** (LGPL-3.0-only, see §6) because dynamic linking obligations apply, and **`texlive.js`** (GPL, see §5) because it's GPL-2-only-ish from old TeX heritage. SwiftLaTeX is itself AGPL-3.0 (fine for us) but means any *fork* we ship has to remain AGPL too.[^license-summary]

---

## 2. Math rendering libraries (TypeScript / JavaScript)

### 2.1 KaTeX

- **GitHub:** <https://github.com/KaTeX/KaTeX>[^katex-repo]
- **Docs:** <https://katex.org>
- **License:** MIT (verified against the repo's `LICENSE` file; copyright "Khan Academy and other contributors").[^katex-license]
- **AGPL-compatibility verdict:** **Compatible.** Standard MIT, preserve the notice.
- **Current version:** v0.17.0 (May 2026).[^katex-repo]

**What it is.** A pure-JS LaTeX-math renderer originally developed at Khan Academy, optimized for speed and synchronous (no-reflow) rendering. It supports a sizable but not exhaustive subset of LaTeX math; it does *not* render full LaTeX documents.

**Usage.**

```js
import katex from "katex";
import "katex/dist/katex.min.css";

const html = katex.renderToString("\\int_0^1 e^{-x^2}\\,dx", {
  output: "htmlAndMathml",   // default; also "html" or "mathml"
  throwOnError: false,
  displayMode: false,        // true → display block
});
```

**Accessibility story.** KaTeX's `output: "htmlAndMathml"` (the default) emits visually rendered HTML *plus* a parallel MathML tree inside `<span aria-hidden="true">` / `<span class="katex-mathml">` wrappers.[^katex-options] In theory screen readers can pick up the MathML. In practice this approach has well-documented holes:

- VoiceOver does not pick up the hidden MathML on Safari without specific markup tweaks.[^katex-issue820]
- NVDA does not see the rendered math by default; the hidden-MathML trick has broken across browser updates.[^katex-issue3120]
- Khan Academy's own production rollout (per the issue tracker) chose to *generate plain-text speech* from the KaTeX parse tree and inject it as a sibling node, rather than relying on MathML — a strong signal that KaTeX's MathML alone is **not** sufficient for WCAG AA accessibility in 2026.[^katex-issue3120]

**Performance / bundle.** Roughly ~280 KB minified JS plus ~24 KB minified CSS plus ~1 MB of WOFF2 font files for the full KaTeX font family (KaTeX_Main, KaTeX_Math, KaTeX_AMS, KaTeX_Caligraphic, KaTeX_Fraktur, KaTeX_Script, KaTeX_SansSerif, KaTeX_Size1–4, KaTeX_Typewriter).[^katex-fonts] Rendering is synchronous and fast — typically <10 ms per expression — which is why blogging platforms and chat apps love it.

**Server-side rendering.** First-class. `katex.renderToString()` is pure and works under Node; output is plain HTML you can ship statically. No headless browser required.[^katex-repo]

**Electron/Tauri fit.** Trivial. Bundle the JS+CSS+fonts in your renderer asset pipeline. Works identically across WebView2, WKWebView (macOS/iOS), and WebKitGTK (Linux Tauri).

**Maturity.** 20k+ stars, ~2.3k commits, 114 releases. Khan Academy still uses it in production. Extremely stable API.

**When to pick it.** When raw rendering speed for a large notebook of pre-existing math is the priority and you're willing to bolt on a separate speech/accessibility layer (SRE, or MathLive's static renderer, or MathJax's a11y module) for the screen-reader story.

---

### 2.2 MathJax (v3 / v4)

- **GitHub:** <https://github.com/mathjax/MathJax> (CDN distribution) and <https://github.com/mathjax/MathJax-src> (TypeScript source)[^mathjax-repos]
- **Docs:** <https://docs.mathjax.org>
- **License:** Apache-2.0 (verified against `LICENSE` in both repositories; SPDX `Apache-2.0`).[^mathjax-license]
- **AGPL-compatibility verdict:** **Compatible.** Apache-2.0 is one-way compatible with GPL-3 / AGPL-3.
- **Current version:** v4.1.2 (May 2026).[^mathjax-repos]

**What it is.** The reference implementation of "math on the web," now in its fourth major version, written in TypeScript. Handles LaTeX, MathML, and AsciiMath as inputs; CHTML, SVG, and MathML as outputs. Substantially larger than KaTeX in both bundle size and feature coverage (full AMS environments, custom macros, BibTeX-style cross-references via packages, etc.).

**Usage (web component bundle).**

```html
<script>
  MathJax = {
    tex: { inlineMath: [["$", "$"], ["\\(", "\\)"]] },
    options: { enableMenu: true },
    loader: { load: ["[tex]/ams", "a11y/explorer", "a11y/speech"] }
  };
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js"></script>
```

**Usage (Node SSR).**

```js
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
// build document, call convert(), write SVG into HTML
```

**Accessibility story — the strongest of any web math renderer.** MathJax v4 ships five distinct accessibility components in its `a11y/*` namespace:[^mathjax-a11y-docs]

1. **`a11y/semantic-enrich`** — runs the [Speech Rule Engine](#81-speech-rule-engine-sre) over the parsed MathML to attach semantic-tree attributes (so a "fraction" reads as a fraction, not a stack of glyphs).
2. **`a11y/speech`** — generates speech strings in a Web Worker and attaches them as `aria-label` / `aria-braillelabel` attributes, so the screen reader gets the speech *regardless of whether the screen reader natively understands MathML*. This is the critical insight that distinguishes MathJax's a11y story from KaTeX's: it doesn't depend on the screen reader knowing MathML.[^mathjax-a11y-docs]
3. **`a11y/explorer`** — arrow-key and click-driven interactive exploration of expression subtrees, with magnification and synchronized speech. **This is now the default assistive tool in v4**, replacing the v3 `assistive-mml` approach that "embedded MathML hidden visually" and had the same reliability problems as KaTeX's hidden-MathML strategy.[^mathjax-a11y-docs]
4. **`a11y/complexity`** — computes a complexity score and lets large expressions collapse to a summary that the user can expand.
5. **`a11y/assistive-mml`** — still available as a fallback / opt-in for users who prefer the old hidden-MathML mode.

Braille output (Nemeth and Euro Braille) is supported via SRE.

**Performance / bundle.** Larger than KaTeX. The CDN component bundles (`tex-mml-chtml.js`, `tex-chtml.js`, `tex-svg.js`) are 1–1.5 MB minified; with a11y modules loaded you're closer to 2–3 MB plus the SRE locale data. CHTML uses web fonts (defaults to STIX Two); SVG embeds glyphs inline (heavier per-page but font-free). Render time is async and noticeably slower than KaTeX (tens to hundreds of milliseconds per page for non-trivial documents) but is essentially never a UX problem for a note editor where the visible math is small at any given moment.

**Server-side rendering.** Yes, via `mathjax-full` on npm. Used widely by Pandoc, Quarto, Jupyter Book, etc.

**Electron/Tauri fit.** Works in both. In Electron (Chromium) the explorer and speech modules work as designed. In Tauri **on Windows (WebView2 = Chromium)** the same applies. In Tauri **on macOS (WKWebView)** the explorer still works; on **Linux (WebKitGTK)** WebKitGTK's accessibility tree is the weakest of the three and the speech-injection-via-`aria-label` strategy is your friend because it sidesteps native MathML AT-SPI exposure.

**Maturity.** Project is 15+ years old, sponsored by AMS / SIAM / NumFOCUS, and is the *de facto* mathematical typesetting layer for the academic web. 46 releases on the distribution repo.

**When to pick it.** When accessibility is a hard requirement, when you need the broadest LaTeX/AMS package coverage, or when you want the option of MathML and SVG outputs from a single library. The size cost is real but acceptable for a desktop app.

---

### 2.3 Temml

- **GitHub:** <https://github.com/ronkok/Temml>[^temml-repo]
- **Docs:** <https://temml.org>
- **License:** MIT (verified against `LICENSE`, copyright Ron Kok 2020).[^temml-license]
- **AGPL-compatibility verdict:** **Compatible.** Standard MIT.
- **Current version:** v0.13.3 (May 2026).[^temml-repo]

**What it is.** A KaTeX *fork* that strips out HTML rendering and emits **MathML Core** instead. Once the MathML is in the DOM, no JS is needed at runtime — the browser handles rendering natively. Function coverage exceeds KaTeX 0.16.x and is comparable to MathJax's TeX input scope.[^temml-repo]

**Usage.**

```js
import temml from "temml";
const mathml = temml.renderToString("\\int_0^1 e^{-x^2}\\,dx");
// stick `mathml` directly into the DOM — browser renders it.
```

**Accessibility story.** Output is *presentation* MathML, optionally with a `<semantics>` wrapper containing the original TeX as an `<annotation>` element.[^temml-repo] Presentation MathML is what screen readers actually consume; the original TeX in the annotation is a useful fallback for tools that prefer round-tripping. Temml does **not** ship SRE or speech-string generation — for non-MathML-aware screen readers you still need MathJax's `a11y/speech` module or a sidecar SRE call. Verified browser support:

- **Firefox / Safari (WebKit):** rendering and screen-reader pickup (VoiceOver in particular) are excellent.[^mathml-browser-support]
- **Chromium 109+:** rendering works (MathML Core landed in Chrome 109 via the Igalia effort); screen-reader exposure to NVDA/JAWS is still inferior to Firefox.[^mathml-browser-support]

**Performance / bundle.** ~200 KB minified JS, no runtime JS once converted, and **no custom fonts shipped** — Temml relies on system math fonts (STIX Two, Latin Modern Math, Cambria Math, or the browser's default math font). This is the smallest payload of any LaTeX→math renderer with MathJax-class function coverage. The tradeoff is that on systems without a good math font installed, output looks worse than KaTeX.

**Server-side rendering.** First-class. Generate the MathML at build time, ship it in the HTML, the browser renders it with zero JS. This is the "static-first" path.

**Electron/Tauri fit.** Excellent for Tauri on macOS (WKWebView's MathML is great). Good on Tauri/Linux (WebKitGTK is OK). Adequate on Tauri/Windows (WebView2 / Chromium 109+). The "ship a math font with the app" plan (see §8) eliminates the system-font-quality variance.

**Maturity.** Single-maintainer (Ron Kok), but extremely active — 65 releases. Used by Quartz, several Jupyter alternatives, and increasingly common in static-site generators (`rehype-mathml` is a unified plugin that uses it).[^temml-rehype]

**When to pick it.** When you want zero runtime JS for math, the smallest payload, and you're targeting modern browsers/webviews. This is the *most accessibility-friendly path for VoiceOver*, the screen reader most commonly used by macOS-using academics.

---

### 2.4 Mathup (AsciiMath authoring)

- **GitHub:** <https://github.com/runarberg/mathup>[^mathup-repo]
- **License:** MIT.[^mathup-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A small library that parses an AsciiMath-flavored shorthand (e.g., `1/2`, `int_0^1 e^(-x^2) dx`) and emits presentation MathML. Latest release v1.0.0 in March 2025, ~245 commits.[^mathup-repo] Useful as an *input* fallback for users who find LaTeX punctuation hard but can tolerate quasi-natural math notation.

**When to pick it.** Probably *not* as the primary renderer (KaTeX/MathJax/Temml are stronger). But it's worth knowing about as an alternative *input* mode for the virtual keyboard — some ADHD/dyslexic users find AsciiMath's `1/2` much easier to type than `\frac{1}{2}`. MathJax v4 also accepts AsciiMath as an input format natively, which is a cleaner path if you've already picked MathJax.

---

### 2.5 At-a-glance comparison

| | KaTeX | MathJax v4 | Temml |
| --- | --- | --- | --- |
| License | MIT | Apache-2.0 | MIT |
| AGPL-compat | Yes | Yes | Yes |
| Output | HTML + hidden MathML | CHTML / SVG / MathML | MathML Core |
| Runtime JS after render | None | None (post-init) | **None** |
| Built-in speech/SRE | No | **Yes (`a11y/speech`)** | No |
| Bundle (min, no fonts) | ~280 KB | ~1–1.5 MB (component) | ~200 KB |
| Math fonts shipped | ~1 MB WOFF2 | STIX Two (~500 KB) | **none — uses system** |
| LaTeX function coverage | Good | **Best** | Very good |
| SSR support | Excellent | Good | Excellent |
| Default accessibility | Weak | **Strong** | Browser-dependent |

---

## 3. Math input / structured editing (TypeScript / JavaScript)

### 3.1 MathLive (Cortex JS)

- **GitHub:** <https://github.com/arnog/mathlive>[^mathlive-repo]
- **Docs:** <https://mathlive.io>
- **License:** MIT (verified against `LICENSE.txt`, copyright Arno Gourdol).[^mathlive-license]
- **AGPL-compat:** **Compatible.**

**What it is.** A suite of three web components (`<math-field>`, `<math-span>`, `<math-div>`) that handle interactive math editing, static inline rendering, and static display rendering. The editor is the headline feature: type LaTeX *or* use a virtual keyboard *or* paste MathML/ASCIIMath/Typst/MathJSON and it round-trips through a single MathJSON-based AST.[^mathlive-repo]

**Usage.**

```html
<script type="module">
  import "https://esm.run/mathlive";
</script>
<math-field id="mf">\int_0^1 e^{-x^2}\,dx</math-field>
<script>
  const mf = document.getElementById("mf");
  mf.addEventListener("input", () => console.log(mf.value));        // LaTeX
  console.log(mf.getValue("math-json"));                            // MathJSON AST
  console.log(mf.getValue("application/mathml+xml"));               // MathML
</script>
```

**Accessibility — best-in-class for input.** MathLive ships:[^mathlive-repo][^mathlive-vkb]

- **Auto-generated ARIA labels** containing speech-friendly text (so a focused fraction reads as "fraction one over two").
- **Math-to-speech** built in (the static `<math-span>` / `<math-div>` components also generate these labels).
- **Virtual keyboard** sized for touch, with long-press variants for related symbols, suitable for users who cannot or will not memorize LaTeX syntax — *directly relevant* to the ADHD/Autism focus, where reducing the working-memory burden of "what's the command for nth-root" is a meaningful accessibility win.
- **Physical keyboard shortcuts** for power users.
- Speech-to-text macros (you can pipe Whisper output into MathLive via its `executeCommand`).

**Mobile / touch.** The virtual keyboard is the most polished math keyboard on the web. Auto-shows on touch devices, sized for thumbs, theme-aware.

**Integration patterns.**

- **TipTap:** No first-party extension; community examples wrap MathLive in a TipTap node view (the official TipTap Mathematics extension uses **KaTeX**, not MathLive).[^tiptap-math][^prosemirror-math-tiptap]
- **ProseMirror:** Community examples exist treating MathLive as an inline atomic node; there is an active discussion thread about selection edge cases.[^prosemirror-mathlive]
- **Lexical / CodeMirror:** No first-party plugin; TeXlyre is a working example combining MathLive with CodeMirror.[^texlyre]
- **React / Svelte:** First-party documentation guides; Vue/Solid work via standard custom-element interop.[^mathlive-integration]

**Maturity.** Single-maintainer (Arno Gourdol, formerly Adobe) but extremely active and battle-tested. 800+ built-in LaTeX commands.[^mathlive-repo] Powers Khan Academy's math input, Wolfram Cloud math entry, and many other production sites.

**When to pick it.** This is the *only* serious choice for accessible math input on the web today. Pair it with any renderer (KaTeX/MathJax/Temml) for display.

---

### 3.2 MathQuill

- **GitHub:** <https://github.com/mathquill/mathquill>[^mathquill-repo]
- **License:** MPL-2.0.[^mathquill-repo]
- **AGPL-compat:** **Compatible** (MPL is file-level copyleft; can be combined with AGPL works as long as the MPL files themselves remain MPL-licensed).

**What it is.** The original "WYSIWYG math input" widget for the web, originally written for Desmos. Last formal release v0.10.1 (2016); the maintainers acknowledge a long dormancy but report renewed activity, with 4,200+ commits.[^mathquill-repo]

**Accessibility story.** Weak in the modern sense — no built-in screen-reader speech, no ARIA-label auto-generation comparable to MathLive. Adding accessibility is a project, not a config flag.

**Mobile / touch.** Dated. Predates the modern mobile-input ergonomics MathLive was designed around.

**When to pick it.** Only if you need to maintain compatibility with an existing MathQuill integration. For a new app, MathLive supersedes it on every axis that matters for accessibility.

---

### 3.3 prosemirror-math (renderer-side math nodes for ProseMirror)

- **GitHub:** <https://github.com/benrbray/prosemirror-math>[^prosemirror-math-repo]
- **License:** MIT.[^prosemirror-math-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** Schema + plugins for "first-class" math nodes in ProseMirror (and therefore TipTap with a wrapper). Renders with **KaTeX** internally. Lets you type `$x+y=5$` inline and have the dollar-bounded text behave like a single editable math atom with proper cursor semantics.[^prosemirror-math-repo]

**When to pick it.** If you've chosen ProseMirror/TipTap as your editor framework and you want math-as-text behavior. Pair with KaTeX (built in) or swap the NodeView for a MathLive-backed one if you want the structured editor on focus.

---

### 3.4 TipTap Mathematics extension

- **Docs:** <https://tiptap.dev/docs/editor/extensions/nodes/mathematics>[^tiptap-math]
- **License:** TipTap core is MIT; the Mathematics extension is part of the TipTap suite (verify per-extension license — most are MIT, some Pro extensions have a different license).
- **What it does:** Wraps KaTeX for both inline and block math nodes inside TipTap. First-party, simpler than rolling your own prosemirror-math integration.[^tiptap-math]

---

## 4. LaTeX parsing & transformation (TypeScript / JavaScript)

These libraries take LaTeX source (math or full document) and give you an AST you can walk, transform, or convert. Useful for: normalizing user input, converting `\frac{a}{b}` into accessible MathML server-side, syntax highlighting in a code-view fallback, linting, autocomplete.

### 4.1 unified-latex (Siefkenj)

- **GitHub:** <https://github.com/siefkenj/unified-latex>[^unified-latex-repo]
- **Docs:** <https://siefkenj.github.io/unified-latex/>
- **License:** MIT.[^unified-latex-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A monorepo of `@unified-latex/*` packages that plug into the [unified.js](https://unifiedjs.com) framework (the same family as remark/rehype). Provides:[^unified-latex-packages]

- `@unified-latex/unified-latex-util-parse` — PEG-based LaTeX parser → AST.
- `@unified-latex/unified-latex-types` — TypeScript types for the AST.
- `@unified-latex/unified-latex-to-hast` — convert to HAST (HTML AST), letting you pipe into rehype.
- `@unified-latex/unified-latex-to-mdast` — convert to MDAST (Markdown AST).
- `@unified-latex/unified-latex-to-pretext` — convert to PreTeXt (the accessibility-focused academic markup).
- `@unified-latex/unified-latex-util-{align,arguments,argspec,catcode,comments,environments,glue,macros,parse,visit,trim,split}` — surgical AST utilities.
- `@unified-latex/unified-latex-cli`, `-prettier`, `-lint`, `-builder` — tooling.

**Maturity.** 124 stars, 245 commits, 28 releases, ~20 open issues. The maintainer is honest about the fundamental limit: "parsing LaTeX isn't possible since it effectively has no grammar" — unified-latex makes practical assumptions, special-cases known macros, and works well on the 95% of real-world input that doesn't redefine catcodes in weird ways.[^unified-latex-repo]

**When to pick it.** Whenever you need to *transform* LaTeX rather than just render it. For the notebook app this matters for: converting raw LaTeX paste into the canonical internal AST; emitting accessible MathML for blocks; linting user input; building syntax highlighting; eventually exporting notes as a TeX file.

---

### 4.2 LaTeX.js

- **GitHub:** <https://github.com/michael-brade/LaTeX.js>[^latexjs-repo]
- **Site:** <https://latex.js.org>
- **License:** MIT (copyright 2015–2021 Michael Brade).[^latexjs-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A LaTeX → HTML5 translator written in JS with a PEG.js grammar. It is *not* a TeX engine — it parses and translates a subset of LaTeX to HTML, comparable in scope to what `marked` does for Markdown.[^latexjs-repo]

**Status.** Latest release v0.12.6 (April 2023); 14 releases total, 49 open issues. Mature but slowing.[^latexjs-repo] No accessibility/MathML story documented.

**When to pick it.** If you want to render small full-document LaTeX *previews* in HTML without spinning up a TeX engine, and you control the input enough to stay within its supported subset.

---

### 4.3 latex-utensils

- **GitHub:** <https://github.com/tamuratak/latex-utensils>[^latex-utensils-repo]
- **License:** MIT.[^latex-utensils-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A LaTeX + BibTeX parser library that produces an AST. Provides both a CLI (`luparse`) and a programmatic API; supports location tracking and comment preservation. v7.0.0 released April 2026; 553 commits — actively maintained.[^latex-utensils-repo]

**Notable user.** It is the parser inside the **LaTeX Workshop** VSCode extension (the dominant LaTeX editor for VSCode). That's a strong production signal.

**When to pick it.** When you want a battle-tested LaTeX/BibTeX AST and don't need the unified.js plugin ecosystem. For pure parsing-and-walking inside a Tauri/Electron app, `latex-utensils` is the most production-proven choice.

---

### 4.4 Quick mention: pulldown-latex (Rust, parser+renderer) and unlatex (Rust→JS bridge)

Covered in §6.1 and §6.5 respectively. The latter is interesting because it lets a Rust backend in Tauri call unified-latex via the QuickJS-in-Rust runtime.

---

## 5. Full LaTeX compilation in the browser / desktop (TS/JS)

### 5.1 SwiftLaTeX

- **GitHub:** <https://github.com/SwiftLaTeX/SwiftLaTeX>[^swiftlatex-repo]
- **License:** **AGPL-3.0** (verified against `LICENSE`; no classpath/font exception).[^swiftlatex-license]
- **AGPL-compat:** **Compatible** (same license). **But:** *any modifications we ship are AGPL-bound* — this is fine for our app, but if any consumer of our notebook wants to build a closed-source fork, they can't.

**What it is.** A browser-side compilation pipeline that emits **PDF** by running `pdfTeX` and `xeTeX` compiled to WebAssembly. Fetches missing CTAN packages on-demand from a remote mirror. Originally a WYSIWYG editor; the engine modules are reusable.[^swiftlatex-repo]

**Status.** Upstream last released February 2022; the canonical engine is essentially frozen. **Active forks** (notably TeXlyre/swiftlatex) have continued development.[^swiftlatex-alternatives] WASM payload is multi-MB (engines are not tiny); font fetching adds latency on first compile.

**When to pick it.** If you need to compile real `.tex` documents from inside the app and you accept AGPL plus a multi-megabyte WASM payload.

---

### 5.2 BusyTex / TeXlyre-BusyTeX

- **GitHub:** <https://github.com/busytex/busytex>[^busytex-repo] (engine) and <https://github.com/TeXlyre/texlyre-busytex>[^texlyre-busytex-repo] (wrapper, 2026 active).
- **Licenses:** BusyTex core is **MIT**;[^busytex-repo] TeXlyre-BusyTeX is **AGPL-3.0** with MIT-derived parts.[^texlyre-busytex-repo]
- **AGPL-compat:** Both **compatible**.

**What it is.** A more recent take: TexLive 2026's `xelatex`/`pdflatex`/`lualatex` compiled to a single static WASM binary (~32 MB for the WASM, with 90–400 MB of TexLive assets hosted out-of-band on GitHub Releases). Supports BibTeX and makeindex; produces PDF as a Uint8Array; can emit SyncTeX for editor sync.[^texlyre-busytex-repo]

**Status.** Latest assets release April 19, 2026 — currently *the* most active in-browser LaTeX compiler.[^texlyre-busytex-repo]

**When to pick it.** If you want browser-side full LaTeX compilation in 2026 and don't mind the multi-MB payload (or are bundling assets in an Electron/Tauri offline build).

---

### 5.3 texlive.js (legacy)

- **Site:** <https://manuels.github.io/texlive.js/>
- **License:** GPL (inherited from TeX heritage; effectively GPL-2-or-later but documentation is sparse).[^texlivejs]
- **AGPL-compat:** Almost certainly **compatible** (GPL-2-or-later → upgrade to GPL-3 → compatible with AGPL-3). Verify the exact license terms before shipping. **Avoid if it turns out to be GPL-2-only — that's incompatible.**
- **Status.** Largely abandoned; superseded by SwiftLaTeX and BusyTex. Don't pick it for a new build.

---

### 5.4 latex.js (clarification)

The `latex.js` package covered in §4.2 is a **parser/HTML translator**, not a compiler. It does not emit PDF and does not run a TeX engine. The name collision with "latex.js" generally is unfortunate; if someone says "let's use latex.js to compile our notes," ask which library they mean.

---

## 6. Rust ecosystem — rendering, parsing, compiling

The Rust math-typesetting ecosystem is *small, uneven, and largely orbiting Typst*. There is no production-grade pure-Rust LaTeX renderer comparable to KaTeX or MathJax in 2026. The realistic options are:

1. **Use Tectonic for full-document compilation from a Tauri backend** (mature, MIT).
2. **Use Typst as the typesetting engine and convert math via mitex** (mature ecosystem, Apache-2.0).
3. **Wrap KaTeX from Rust via the `katex` crate** (uses an embedded JS runtime; pragmatic).
4. **Use pulldown-latex or tex2math for pure-Rust LaTeX→MathML on the backend** (smaller, math-only, less mature).
5. **Avoid ReX** — it's experimental and unmaintained for production.

### 6.1 pulldown-latex

- **Repo:** <https://github.com/carloskiki/pulldown-latex>[^pulldown-latex-repo]
- **crates.io:** `pulldown-latex` v0.7.1.
- **License:** MIT.[^pulldown-latex-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A pull-parser-style LaTeX-math → MathML library in pure Rust, inspired by `pulldown-cmark` (the popular Markdown parser). Carries ~390 KB of embedded fonts and ~6k SLoC. Requires Rust 1.74.1+.[^pulldown-latex-repo]

**Maturity.** Maintainer claims "95% of what KaTeX supports is properly working and minimally tested" but explicitly cautions against large-scale production use until fuzzing and additional tests land.[^pulldown-latex-repo] ~1.7k monthly downloads, used in 4 other crates.

**Sample usage.**

```rust
use pulldown_latex::{Parser, Storage, RenderConfig, push_mathml};

let storage = Storage::new();
let parser = Parser::new(r"\frac{1}{1 + x^2}", &storage);
let mut s = String::new();
push_mathml(&mut s, parser, RenderConfig::default()).unwrap();
// s now contains a <math>...</math> string
```

**When to pick it.** When you want a *small*, pure-Rust path to render math → MathML server-side in Tauri without shelling out to Node. Acceptable today for tested-internally use; not yet recommended as the only renderer for user-supplied math.

---

### 6.2 tex2math

- **Repo / docs:** lib.rs `tex2math`.[^tex2math-repo]
- **License:** **LGPL-3.0-only**.[^tex2math-repo]
- **AGPL-compat:** **Compatible** (LGPL-3 + AGPL-3 are explicitly compatible per the LGPL grant). **Note:** LGPL-3 imposes additional dynamic-linking obligations — keep `tex2math` as a separate crate, don't statically inline it, and document the user's right to swap out the LGPL portion.

**What it is.** "A blazing fast, zero-copy LaTeX to MathML conversion library and CLI" built on the `winnow` parser combinator library. v1.2.1 released April 2026; 7 releases; 50+ regression tests; supports 450+ symbols and nested structures like `\sqrt{\frac{a}{b}}`.[^tex2math-repo]

**When to pick it.** If you want fast, zero-copy LaTeX-math → MathML server-side and can accept LGPL-3 dynamic-linking discipline. Newer and arguably more polished than pulldown-latex.

---

### 6.3 ReX

- **Repo:** <https://github.com/ReTeX/ReX>[^rex-repo]
- **License:** Dual **MIT / Apache-2.0** (with some BSD-licensed portions).[^rex-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** A pure-Rust math typesetter that emits SVG. Cited as the inspiration for several other Rust math projects.

**Status.** **Not production-ready.** From the README directly: "ReX is currently in heavy development and is not intended to be used in any way other than for testing and debugging."[^rex-repo] 132 stars, last commit relatively recent but the project is unambiguous about its experimental nature.

**When to pick it.** Don't, for production. Worth tracking.

---

### 6.4 katex (the Rust crate)

- **Repo / crate:** lib.rs `katex` v0.4.6.[^katex-rust-crate]
- **License:** Dual **MIT / Apache-2.0**.[^katex-rust-crate]
- **AGPL-compat:** **Compatible.**

**What it is.** Rust bindings that *embed* the JavaScript KaTeX library and run it via one of three pluggable JS runtimes (`quick-js` default, `duktape`, or `wasm-js`). Output is the same HTML string you'd get from KaTeX in a browser.[^katex-rust-crate]

**Trade-offs.** Pragmatic if you want KaTeX's behavior from a Rust process; the dependency footprint is real (~6 MB of dependencies, ~153k SLoC including the JS runtime). 116k monthly downloads — by far the most downloaded "rust + LaTeX" crate.[^katex-rust-crate] Last release Feb 2023 (the underlying JS KaTeX has moved on since); not the freshest.

**When to pick it.** When you need to pre-render KaTeX from a Rust Tauri backend (e.g., generating thumbnails or static exports) and want exact parity with the browser KaTeX output.

---

### 6.5 unlatex

- **Crate:** `unlatex` on docs.rs.[^unlatex-repo]
- **License:** Dual **MIT / Apache-2.0**.[^unlatex-repo]
- **AGPL-compat:** **Compatible.**

**What it is.** Rust bindings to `unified-latex` (the JS library from §4.1), via the `rquickjs` embedded JS runtime. Functions: `parse()`, `jparse()`, `format()`, `format_with_opts()`.[^unlatex-repo]

**When to pick it.** When you want unified-latex's transformation capabilities from a Rust backend without rewriting them. Tradeoff is the QuickJS dependency.

---

### 6.6 Tectonic

- **Repo:** <https://github.com/tectonic-typesetting/tectonic>[^tectonic-repo]
- **License:** **MIT** (verified against `LICENSE`).[^tectonic-license]
- **AGPL-compat:** **Compatible.**

**What it is.** A modernized, self-contained TeX/LaTeX engine in Rust. Internally wraps the XeTeX engine (the codebase is 63% C, 27% Rust) but exposes a clean Rust API: pass in a `.tex` source, get back PDF bytes, with packages auto-fetched from a bundled snapshot of TeX Live.[^tectonic-repo]

**Sample usage.**

```rust
let latex = r#"
\documentclass{article}
\begin{document}
Hello, $\int_0^1 e^{-x^2}\,dx$!
\end{document}
"#;
let pdf_bytes: Vec<u8> = tectonic::latex_to_pdf(latex)
    .expect("processing failed");
std::fs::write("out.pdf", pdf_bytes).unwrap();
```

**Maturity.** v0.16.9 (April 2026), 248 releases, 4k+ commits. The TeX experience it delivers is "completely embeddable: if you link with this crate you can fully process TeX documents, from source to PDF, without relying on any externally installed software."[^tectonic-repo]

**When to pick it.** As the backend in a Tauri build for "compile this note (or this whole notebook) to a real, publishable PDF." This is the most important Rust crate for our app's "export to publishable paper" story.

---

### 6.7 Typst (and how it fits LaTeX content)

- **Repo:** <https://github.com/typst/typst>[^typst-repo]
- **License:** **Apache-2.0**.[^typst-license]
- **AGPL-compat:** **Compatible.**

**What it is.** A fundamentally **new typesetting system** in Rust — not a LaTeX engine. Designed to be "as powerful as LaTeX while being much easier to learn and use." Markup-based, with integrated scripting, math, bibliography (`biblatex` crate, dual MIT/Apache-2.0[^biblatex-repo]), and incremental compilation. v0.14.2 released Dec 2025; 53k+ stars; very actively developed.[^typst-repo]

**LaTeX content interop.** Typst does not natively read LaTeX. Two community bridges fill the gap:

- **mitex** (`@preview/mitex`) — LaTeX-to-Typst conversion for math, powered by Rust+WASM. Converted 32.5k OI Wiki equations correctly; ~185 KB binary vs. `texmath`'s 17 MB. Available as Typst package, `cargo install mitex` CLI, and a web app. **License: Apache-2.0.**[^mitex-repo]
- **tex-to-typst** (curvenote) — a TypeScript library that uses unified-latex to parse LaTeX and emit Typst markup. Alpha-quality but useful for full-document conversion.[^tex-to-typst-repo]

**Output formats.** PDF (primary), PNG/SVG via the CLI, and increasingly HTML — though Typst's HTML math export is acknowledged as imperfect: complex math falls back to inline SVG, and the team has stated that future Typst will emit MathML for accessible HTML math. Today, for accessible HTML math, this is *not* yet a fully solved path.[^typst-html-export]

**When to consider it.** Typst is *not* a drop-in LaTeX replacement for our app. But it is a credible *backend* for "compile this notebook to a polished PDF" with much better Rust integration than Tectonic (since it's pure Rust and was designed for it). For users who don't care which engine compiles their notes, Typst is faster, simpler, and easier to embed. The pragmatic path is: **let users author in our editor (which speaks LaTeX math via MathLive/MathJax/Temml in the UI), then offer both Tectonic (for true `.tex` output) and Typst (for fast, modern PDF) as compile targets.**

---

### 6.8 Honorable mentions in Rust

- **biblatex** (`typst/biblatex`) — BibTeX/BibLaTeX parsing in Rust. Dual MIT/Apache-2.0. ~248k downloads. Essential if we want to import citations.[^biblatex-repo]
- **texlab** — LaTeX Language Server. MPL-2.0. Relevant if we ever add a power-user `.tex` code mode.
- **codebook-tree-sitter-latex** — Tree-sitter grammar for LaTeX. Apache-2.0 / MIT (per Tree-sitter convention). Useful for syntax highlighting in code-view fallback.

### 6.9 What does *not* exist (be honest)

- A production-grade pure-Rust LaTeX **document** renderer to HTML+MathML with accessibility comparable to MathJax. Not in 2026.
- A pure-Rust math typesetter to SVG that matches KaTeX visual quality. ReX is the closest and it's explicitly not ready.
- A pure-Rust replacement for Speech Rule Engine. The Speech Rule Engine remains the *only* mature TS/JS implementation, and any "Rust-native" stack will end up calling it through Node, embedded JS, or a port that doesn't exist yet.

---

## 7. Recommended stacks

All three stacks share a common assumption: **MathLive is the input layer** regardless of backend. There's simply no alternative that comes close on accessibility for math input in 2026.

### 7.1 Stack A — Electron (pure-web), accessibility-strong

| Role | Library | License |
| --- | --- | --- |
| Editor framework | TipTap (or ProseMirror direct) | MIT |
| Math input | MathLive `<math-field>` | MIT |
| Math rendering (default) | **MathJax v4 with `a11y/speech` + `a11y/explorer`** | Apache-2.0 |
| Math rendering (fast preview) | KaTeX (rendered in node views during typing) | MIT |
| LaTeX AST / transforms | unified-latex + latex-utensils | MIT |
| LaTeX → MathML for export | Temml (static, no runtime JS) | MIT |
| Full LaTeX compile (optional) | TeXlyre-BusyTeX in a hidden BrowserView | AGPL-3.0 |
| Speech for screen readers | bundled via MathJax `a11y/speech` (SRE) | Apache-2.0 |
| Math font (bundled, optional) | STIX Two Math | SIL OFL 1.1 |

**Why this composition.**

- MathJax v4's `a11y/speech` module *generates plain text speech for every math expression and attaches it as `aria-label`*, which sidesteps the inconsistent MathML support across Electron's Chromium and any third-party screen reader the user runs. This is the path that most reliably hits **WCAG 2.1 AAA Success Criterion 1.3.1** (info and relationships) and **1.1.1** (non-text content) for mathematical content.
- KaTeX as the "live typing preview" reduces perceived latency on edit (KaTeX renders <10ms; MathJax can run async after a debounce for the canonical render).
- Temml is the *export* path: when the user exports a note to HTML for sharing, we precompute MathML once with Temml and ship zero runtime JS. This is the most-accessible, smallest, screen-reader-friendliest static output.
- unified-latex handles the internal canonical AST so we can normalize variants (`\frac` vs. `\dfrac`, `\,` vs. `\thinspace`) before render.

**Pros.** Best accessibility story available. No language barrier between input, render, and a11y — everything is JS/TS. Single-process simplicity.

**Cons.** Electron base bloat (~100 MB on disk before our code). MathJax v4 component is ~1.5 MB minified + SRE locale data on top.

### 7.2 Stack B — Tauri with Rust backend

| Role | Library | License |
| --- | --- | --- |
| Renderer (UI) | Web frontend with **MathLive** for input + **Temml** for static render + **MathJax v4** for accessibility | MIT / MIT / Apache-2.0 |
| LaTeX AST in Rust | **pulldown-latex** or **tex2math** for math-only paths; `unlatex` if we need unified-latex's transforms server-side | MIT / LGPL-3.0 / MIT+Apache-2.0 |
| Full LaTeX compile (heavy) | **Tectonic** (`tectonic::latex_to_pdf`) for `.tex` export | MIT |
| Modern fast PDF | **Typst** + `mitex` for LaTeX-math islands when user explicitly chooses | Apache-2.0 / Apache-2.0 |
| BibTeX | `biblatex` crate | MIT/Apache-2.0 |

**Why this composition.**

- Tauri is ~5–15 MB on disk versus Electron's ~100 MB — a meaningful win for an "always with you" student app.
- The renderer stack is essentially Stack A's web layer minus the Electron base. Math input/display is unchanged.
- The Rust backend handles three things the renderer shouldn't: (i) compiling notes to publishable PDF via Tectonic; (ii) batch operations (e.g., "re-render all 400 equations in this notebook to MathML for export") via pulldown-latex or tex2math; (iii) imports/exports of `.bib` files via `biblatex`.
- Optional Typst path lets advanced users get a fast, modern PDF in seconds rather than the full TeX compile cycle.

**Pros.** Much smaller install. Rust backend gives us a clean separation between UI and "expensive" operations. AGPL stays clean throughout (only `tex2math` requires the LGPL dynamic-link discipline).

**Cons.** **The WebView story varies by platform** — see §8 for Tauri WebView accessibility caveats. WebView2 on Windows is Chromium and mostly OK. WKWebView on macOS gives the best native MathML rendering. WebKitGTK on Linux is the weakest link for screen-reader integration. The mitigation is that we lean on MathJax's `a11y/speech` (`aria-label` injection) rather than relying on native MathML accessibility tree exposure.

### 7.3 Stack C — Accessibility-optimized (recommended for AAA target)

This is Stack A or Stack B with three additional commitments:

1. **Always enable `a11y/speech` + `a11y/explorer` in MathJax v4 by default**, with a user-facing toggle for verbosity (terse/medium/verbose) and locale (English/German/Spanish/French via SRE).
2. **Ship MathLive's static `<math-span>` renderer alongside Temml** so that every rendered equation has both: (a) MathML for native screen reader pickup *and* (b) an `aria-label` with speech text, with the speech text generated by SRE so it's not a worse second source of truth.
3. **Bundle STIX Two Math (SIL OFL 1.1)** and **Latin Modern Math (GUST/LPPL)** as offline fonts so that MathML output renders correctly regardless of user's system fonts. This is the offline-first commitment that an academic note app needs.

**Justification with respect to AAA + ADHD/Autism + AGPL.**

- *AAA targets:* AAA 1.4.6 (contrast 7:1) is a *typography* problem solved by bundled fonts at the right weight, not a library choice. AAA 1.3.6 (identify purpose) and 1.4.10 (reflow) are handled by emitting MathML rather than rasterized math. AAA 2.4.10 (section headings) and 3.1.5 (reading level) are upstream of math libraries. Where libraries matter is **AAA 1.4.8 (visual presentation — line spacing, max width, justification) and 1.4.9 (images of text — math must be text, not an image)**. MathML or HTML+CSS rendering (KaTeX, MathJax CHTML, Temml) all satisfy 1.4.9 trivially. KaTeX/MathJax/Temml all support CSS-level zoom and reflow.
- *ADHD/Autism focus:* the dominant accessibility win here is **reducing the cognitive load of math input** — MathLive's virtual keyboard with long-press variants, predictable spatial layout, and visible structure feedback (you see the fraction "build" as you type its parts) is materially better than asking users to remember `\dfrac{}{}` versus `\frac{}{}`. The secondary win is **predictability of output**: MathJax with explicit a11y/speech gives the same speech text on every machine, which matters more for autistic users who value consistency than the on-the-fly variability of "what NVDA happens to read today."
- *AGPL licensing:* every library named in any of the three stacks is permissively licensed (MIT/Apache/MPL/dual) or AGPL-compatible. There is **no SSPL/BSL/Elastic trap** in the LaTeX ecosystem at this layer.

---

## 8. Things to know / gotchas

### 8.1 Speech Rule Engine (SRE)

- **Repo:** <https://github.com/Speech-Rule-Engine/speech-rule-engine>[^sre-repo]
- **License:** **Apache-2.0** (verified against `LICENSE`).[^sre-license]
- **AGPL-compat:** **Compatible.**
- **Current version:** v5.0.0-rc.1 (April 2026).[^sre-repo]
- **Maintainer:** Volker Sorge (long-time maintainer; originally built for ChromeVox).

**What it does.** Takes MathML and produces spoken text (English, German, French, Spanish, others), Braille (Nemeth and Euro Braille), and semantic enrichment annotations. **This is the speech engine inside MathJax v3+ and v4** — when you load `a11y/speech` in MathJax you are running SRE.[^sre-repo][^mathjax-a11y-docs]

**Standalone use.** You can `npm install speech-rule-engine` and call it directly from a Tauri Rust backend (via a node child process) or from the Electron renderer for non-MathJax pipelines (e.g., to add speech text to KaTeX or Temml output). The locale files add a few hundred KB each — bundle only what your users need.

**Why it matters for us.** SRE is the *only* mature open-source math-to-speech engine. There is no Rust port. If you want consistent, configurable math speech for accessibility, you are using SRE (directly or via MathJax). Plan for it.

### 8.2 MathML support in browsers and screen readers (2026 state)

| Browser | MathML rendering | Screen reader pickup |
| --- | --- | --- |
| Firefox (Gecko) | Excellent (full MathML support across all versions).[^mathml-browser-support] | Good with NVDA. |
| Safari (WebKit) | Excellent (full support v10+).[^mathml-browser-support] | **Best with VoiceOver** — no plugin required.[^mathml-screen-reader] |
| Chrome / Edge (Chromium 109+) | Good (MathML Core landed via Igalia in Chrome 109; full support through Chrome 145).[^mathml-browser-support] | Inconsistent: NVDA may need MathCAT add-on; JAWS works best on Chrome 109+.[^mathml-screen-reader] |
| Chromium <109 | Not supported. | N/A. |
| WebKitGTK (Tauri/Linux) | Inherits WebKit MathML — generally good. | AT-SPI exposure varies by distro and screen reader version. |
| WKWebView (Tauri/macOS) | Inherits WebKit MathML — excellent. | VoiceOver works well. |
| WebView2 (Tauri/Electron Windows) | Chromium-based, MathML Core. | NVDA/JAWS as above. |

**Practical takeaway.** Relying *only* on native MathML accessibility is fragile in 2026 on Windows-with-NVDA/JAWS (the most common AT combination among college students). MathJax's `a11y/speech` (which injects plain-text speech as `aria-label`) is the reliable path that works everywhere because it doesn't require the screen reader to understand MathML at all. Pair MathML output (for VoiceOver and future-proofing) with `aria-label` speech (for everyone else).

### 8.3 WebView accessibility — Tauri vs. Electron

- **Electron** ships its own Chromium and gets a consistent accessibility tree across platforms. Math libraries can rely on uniform behavior.
- **Tauri** uses **WebView2 on Windows (Chromium-based)**, **WKWebView on macOS (WebKit)**, **WebKitGTK on Linux (WebKit)**.[^tauri-webview] WebView2 has had documented screen-reader accessibility gaps;[^webview2-a11y] WKWebView and WebKitGTK have their own quirks. Tauri also has an open tracking issue specifically for screen-reader accessibility,[^tauri-a11y-tracking] meaning it's an acknowledged work-in-progress.
- **Implication.** If accessibility is a hard "AAA-or-bust" requirement and we're shipping primarily on Windows (where most US college students are), **Electron has the lower-risk accessibility story today.** If we want the smaller-binary Tauri story, we must (a) lean on MathJax's `aria-label` speech path that bypasses the AT tree limitations of WebView2, and (b) accept that Tauri's screen-reader story is improving but isn't yet at Electron's level.

### 8.4 Font shipping

- **STIX Two Math** — by STI Pub Companies / Tiro Typeworks. **SIL OFL 1.1**.[^stix-license] Excellent coverage. ~600 KB WOFF2. Safe to bundle.
- **Latin Modern Math (lm-math)** — by GUST e-Foundry. **GUST Font License (GFL), equivalent to LPPL 1.3c+**.[^lm-license] Classic TeX look. Safe to bundle; note the rename-on-modify clause.
- **KaTeX font family** — KaTeX's own. **MIT/OFL**. ~1 MB WOFF2 for the full set. Required if using KaTeX as a renderer.
- **Asana Math** — another OFL math font, less commonly used.

For an *offline-first* desktop app, bundling at least one full math font is non-negotiable: relying on the user's OS to have STIX or Latin Modern installed is a reliability gamble that mostly fails on Windows.

### 8.5 Bundle size summary for an offline-first desktop app

| Asset | Approx size (gzipped/WOFF2) |
| --- | --- |
| KaTeX JS + CSS | ~80 KB |
| KaTeX fonts (full) | ~1 MB |
| MathJax v4 `tex-mml-chtml.js` | ~400 KB |
| MathJax `a11y/speech` + SRE en locale | ~300 KB |
| Temml JS | ~70 KB |
| MathLive | ~400 KB (with virtual keyboard assets) |
| unified-latex + utilities | ~150 KB |
| STIX Two Math (bundled) | ~600 KB |
| Tectonic standalone binary | ~50–100 MB (with TeX Live snapshot) |
| TeXlyre-BusyTeX WASM | ~32 MB + 90–400 MB asset bundles |
| Typst standalone binary | ~30 MB |

The "render and edit math accessibly" stack is ~2–3 MB. The "compile real LaTeX/Typst documents" stack adds tens to hundreds of MB. Plan accordingly.

### 8.6 Licenses in transition / surprises

- **MathQuill (MPL-2.0)** — the only MPL library in the lineup. Compatible, but file-level copyleft means our patches to MathQuill source files must stay MPL.
- **SwiftLaTeX (AGPL-3.0)** — already AGPL. Compatible *for us*, but downstream commercial forkers of our app cannot escape AGPL.
- **tex2math (LGPL-3.0-only)** — the LGPL-3 obligation means we must let users *replace* the LGPL library (dynamic linking or equivalent). For a Rust crate, this is satisfied by keeping `tex2math` behind a trait and documenting the user's right to swap implementations. Compatible but slightly higher operational burden than MIT.
- **texlive.js (GPL, version exact wording unclear)** — verify the LICENSE file directly before using. If it turns out to be **GPL-2-only**, it is *incompatible* with AGPL-3 and must not be combined.
- **No SSPL/BSL/Elastic libraries** in this corner of the ecosystem as of May 2026.

### 8.7 Final gotchas worth flagging

- **Server-side rendering matters even in Electron/Tauri.** Pre-rendering all math in a note to static MathML on save (via Temml) means the open/scroll path doesn't need to invoke a renderer at all. This is a big perceived-performance win in long notebooks.
- **`displayMode` flag is per-expression.** Most renderers default to inline mode. Make sure your editor model carries an inline-vs-display marker per math node and passes it through.
- **`throwOnError` defaults differ.** KaTeX throws by default; MathJax shows an error placeholder. For a note app where users will *intentionally type half-finished equations as they think*, you want `throwOnError: false` and a gracefully-degraded error display.
- **MathLive's `<math-field>` is a custom element.** That means SSR frameworks like Next.js need `"use client"` boundaries or dynamic imports; Tauri has no such issue (it's all client-side).
- **MathJSON** (MathLive's AST format) is a *great* internal canonical form for math — it round-trips to LaTeX, MathML, ASCIIMath, and Typst, and is easier to manipulate than raw LaTeX. Consider storing math as MathJSON in your notebook file format rather than LaTeX strings.

---

## Footnotes

[^license-summary]: License compatibility analysis derived from the FSF's [License Compatibility list](https://www.gnu.org/licenses/license-list.html), the Apache Software Foundation's [3rd-party license policy](https://www.apache.org/legal/resolved.html), and direct reading of each library's `LICENSE` file as cited below. The AGPL-3.0 compatibility verdicts for MIT/Apache/MPL/LGPL/GPL-3 follow standard practice.

[^katex-repo]: KaTeX repository at <https://github.com/KaTeX/KaTeX>; metadata as of May 2026 — v0.17.0, 20.1k stars, 2,294 commits, 114 releases.

[^katex-license]: KaTeX `LICENSE` file fetched directly from `https://raw.githubusercontent.com/KaTeX/KaTeX/main/LICENSE`; standard MIT text, copyright "Khan Academy and other contributors."

[^katex-options]: KaTeX `output` option documentation: <https://katex.org/docs/options.html> — three valid choices `html`, `mathml`, `htmlAndMathml`, with the default being `htmlAndMathml` which "outputs HTML for visual rendering and includes MathML for accessibility."

[^katex-issue820]: GitHub issue: "VoiceOver screenreader can't read KaTeX's hidden MathML" (KaTeX/KaTeX#820) — documents that VoiceOver does not pick up the hidden MathML wrapper KaTeX emits by default.

[^katex-issue3120]: GitHub discussion: "Accessibility" (KaTeX/KaTeX#3120) — community discussion noting that "NVDA doesn't see the rendered math," the hidden-MathML trick has broken across browser updates, and that Khan Academy's own production approach generates plain text from the KaTeX parse tree rather than relying on MathML.

[^katex-fonts]: KaTeX font documentation: <https://katex.org/docs/browser.html> and <https://katex.org/docs/font.md>; full WOFF2 font set is approximately 1 MB across KaTeX_AMS, KaTeX_Caligraphic, KaTeX_Fraktur, KaTeX_Main, KaTeX_Math, KaTeX_Script, KaTeX_SansSerif, KaTeX_Size1-4, KaTeX_Typewriter.

[^mathjax-repos]: MathJax distribution repo <https://github.com/mathjax/MathJax> and TypeScript source <https://github.com/mathjax/MathJax-src>; v4.1.2 latest, released May 3, 2026.

[^mathjax-license]: MathJax `LICENSE` file (both repos): Apache License Version 2.0, January 2004.

[^mathjax-a11y-docs]: MathJax v4 accessibility components documentation: <https://docs.mathjax.org/en/latest/web/components/accessibility.html>. Lists `a11y/semantic-enrich`, `a11y/speech`, `a11y/explorer`, `a11y/complexity`, `a11y/assistive-mml`. Confirms that v4's `explorer` is the default assistive tool, replacing v3's `assistive-mml`, and that `speech` generates strings via web workers and attaches them as `aria-label` and `aria-braillelabel`.

[^temml-repo]: Temml repository at <https://github.com/ronkok/Temml>; v0.13.3 (May 2026), 65 releases. Author Ron Kok. Fork of KaTeX with HTML rendering removed and MathML Core output added; coverage of LaTeX functions "comparable to MathJax and exceeds KaTeX 0.16.0."

[^temml-license]: Temml `LICENSE` file: MIT License, copyright Ron Kok 2020.

[^temml-rehype]: `rehype-mathml` (npm: `@daiji256/rehype-mathml`) and the Quartz static-site generator both use Temml as their LaTeX → MathML compile-time conversion. See <https://github.com/Daiji256/rehype-mathml>.

[^mathup-repo]: Mathup repository at <https://github.com/runarberg/mathup>; MIT, v1.0.0 (March 2025), 245 commits, 91 stars; AsciiMath-inspired authoring with MathML output.

[^mathlive-repo]: MathLive repository at <https://github.com/arnog/mathlive>; describes itself as "Web components for math input, display, and accessibility"; provides `<math-field>`, `<math-span>`, `<math-div>`; supports export/import as LaTeX, MathML, ASCIIMath, Typst, MathJSON; 800+ built-in LaTeX commands.

[^mathlive-license]: MathLive `LICENSE.txt` file: MIT License, copyright (c) 2017–present Arno Gourdol.

[^mathlive-vkb]: MathLive virtual keyboard documentation: <https://mathlive.io/mathfield/guides/virtual-keyboard/> and <https://mathlive.io/mathfield/virtual-keyboard/>. The keyboard auto-shows on touch devices, is comfortably sized for thumbs, scales to container, and supports long-press variants on keycaps for related symbols.

[^tiptap-math]: TipTap Mathematics extension docs: <https://tiptap.dev/docs/editor/extensions/nodes/mathematics> — uses KaTeX for rendering (not MathLive or MathJax).

[^prosemirror-math-tiptap]: GitHub issue benrbray/prosemirror-math#27 ("Support Tiptap") and ueberdosis/tiptap#1975 discussion document the community approach of wrapping prosemirror-math (which uses KaTeX) inside a TipTap node. No first-party MathLive-in-TipTap exists.

[^prosemirror-mathlive]: ProseMirror discussion thread "Inline Atomic Node Selection Issues - MathLive Integration with draggable Property Conflict" documents active community work integrating MathLive as inline atomic nodes in ProseMirror.

[^texlyre]: TeXlyre project: <https://texlyre.github.io/> — a local-first LaTeX & Typst web editor that combines CodeMirror as the text editor with MathLive for equation editing, demonstrating MathLive+CodeMirror integration in practice.

[^mathlive-integration]: MathLive framework integration docs: <https://mathlive.io/mathfield/guides/integration/> — first-party guides for React and Svelte; general "import as ES module" pattern works for any framework consuming custom elements.

[^mathquill-repo]: MathQuill repository at <https://github.com/mathquill/mathquill>; MPL-2.0; v0.10.1 (March 2016) is the last formal release but maintainers report 4,255 commits and ongoing activity.

[^prosemirror-math-repo]: prosemirror-math repository at <https://github.com/benrbray/prosemirror-math>; MIT, 299 stars, 12 releases; provides ProseMirror schema and plugins for inline/display math using KaTeX as the renderer.

[^unified-latex-repo]: unified-latex repository at <https://github.com/siefkenj/unified-latex>; MIT; 124 stars, 245 commits, 28 releases. Maintainer's own caveat: "parsing LaTeX isn't possible since it effectively has no grammar."

[^unified-latex-packages]: unified-latex `packages/` directory enumerates: `unified-latex` (main), `unified-latex-types`, `unified-latex-to-hast`, `unified-latex-to-mdast`, `unified-latex-to-pretext`, plus `unified-latex-util-*` (align, arguments, argspec, catcode, comments, environments, glue, macros, parse, visit, trim, split), `unified-latex-cli`, `unified-latex-prettier`, `unified-latex-lint`, `unified-latex-builder`.

[^latexjs-repo]: LaTeX.js repository at <https://github.com/michael-brade/LaTeX.js>; MIT, copyright 2015–2021 Michael Brade; v0.12.6 (April 2023); 14 releases; 863 stars; PEG.js-based LaTeX → HTML5 translator, not a TeX engine.

[^latex-utensils-repo]: latex-utensils repository at <https://github.com/tamuratak/latex-utensils>; MIT; v7.0.0 (April 2026); 553 commits; LaTeX + BibTeX parser with location tracking, comment preservation, both CLI (`luparse`) and programmatic API.

[^swiftlatex-repo]: SwiftLaTeX repository at <https://github.com/SwiftLaTeX/SwiftLaTeX>; pdfTeX and XeTeX engines compiled to WebAssembly, packages fetched from CTAN on demand, last upstream release February 2022.

[^swiftlatex-license]: SwiftLaTeX `LICENSE` file: GNU AFFERO GENERAL PUBLIC LICENSE Version 3, November 2007 — standard AGPL-3.0 text without classpath or font exception.

[^swiftlatex-alternatives]: SwiftLaTeX active forks include TeXlyre/swiftlatex and gboyd068/SwiftLaTeX; the most active 2026 alternative is TeXlyre-BusyTeX (see below) which packages TeX Live 2026.

[^busytex-repo]: BusyTex repository at <https://github.com/busytex/busytex>; MIT; static binaries for x86_64-linux and WebAssembly; bundles xetex, pdftex, luahbtex, bibtex8; 1,962 commits, 157 releases.

[^texlyre-busytex-repo]: TeXlyre-BusyTeX repository at <https://github.com/TeXlyre/texlyre-busytex>; AGPL-3.0 with MIT-derived parts from BusyTex; supports TeX Live 2026 XeLaTeX/pdfLaTeX/LuaLaTeX with BibTeX and makeindex; WASM ~32 MB, asset bundles 90–400 MB hosted on GitHub Releases; latest release April 19, 2026.

[^texlivejs]: texlive.js site <https://manuels.github.io/texlive.js/>; described as "A LaTeX Compiler for Javascript" built with Mozilla Emscripten; distributed under "GNU/GPL." Exact license version not clearly documented on the project page — verify before using.

[^pulldown-latex-repo]: pulldown-latex repository at <https://github.com/carloskiki/pulldown-latex> and crate at <https://crates.io/crates/pulldown-latex>; MIT; v0.7.1 (November 2024); ~1.7k monthly downloads; ~390 KB embedded fonts; ~6k SLoC; requires Rust 1.74.1+; maintainer notes "95% of what KaTeX supports is properly working and minimally tested" but "not recommended for large scale production use."

[^tex2math-repo]: tex2math at <https://lib.rs/crates/tex2math>; LGPL-3.0-only; v1.2.1 (April 23, 2026); 7 releases; built on `winnow` parser combinator library; over 450 mathematical symbols; 50+ regression tests.

[^rex-repo]: ReX repository at <https://github.com/ReTeX/ReX>; dual MIT / Apache-2.0 with some BSD-licensed portions per the LICENSE-MIT / LICENSE-APACHE files; README explicitly states "ReX is currently in heavy development and is not intended to be used in any way other than for testing and debugging."

[^katex-rust-crate]: `katex` Rust crate at <https://lib.rs/crates/katex>; dual Apache-2.0 / MIT; v0.4.6 (February 2023); ~116k monthly downloads; three pluggable JS runtime backends (`quick-js` default, `duktape`, `wasm-js`); ~6 MB total dependencies.

[^unlatex-repo]: unlatex crate at <https://docs.rs/unlatex>; dual MIT / Apache-2.0; Rust bindings to unified-latex via the `rquickjs` (QuickJS-in-Rust) embedded JS engine; provides `parse()`, `jparse()`, `format()`, `format_with_opts()`.

[^tectonic-repo]: Tectonic repository at <https://github.com/tectonic-typesetting/tectonic> and crate at <https://crates.io/crates/tectonic>; v0.16.9 (April 17, 2026); 248 releases; 4,131 commits; ~63.4% C / 27.2% Rust (wraps XeTeX). Per the crate description: "TeX experience delivered by Tectonic is completely embeddable: if you link with this crate you can fully process TeX documents, from source to PDF, without relying on any externally installed software."

[^tectonic-license]: Tectonic `LICENSE` file: standard MIT License text.

[^typst-repo]: Typst repository at <https://github.com/typst/typst>; v0.14.2 (December 12, 2025); 27 releases; 53.7k stars; 84.7% Rust.

[^typst-license]: Typst `LICENSE` file: Apache License, Version 2.0, January 2004. SPDX `Apache-2.0`. No exceptions.

[^mitex-repo]: mitex repository at <https://github.com/mitex-rs/mitex>; Apache-2.0; processes LaTeX into an abstract syntax tree, then transforms into Typst code; ~185 KB binary vs. texmath's 17 MB; converted 32.5k OI Wiki equations in 2.28s via WASM or 0.085s on x86. Typst package import: `#import "@preview/mitex:0.2.7": *`.

[^tex-to-typst-repo]: tex-to-typst repository at <https://github.com/curvenote/tex-to-typst>; MIT; TypeScript (99.8%); uses `@unified-latex` for parsing; v0.0.9 (November 2024); explicit alpha-quality disclaimer in the README.

[^typst-html-export]: Typst HTML export status documented at <https://typst.app/docs/guides/accessibility/> and <https://typst.app/docs/reference/html/>; complex math currently embedded as inline SVG with `alt` parameter required for accessibility; future versions intend to leverage MathML for native HTML+PDF math accessibility.

[^biblatex-repo]: biblatex repository at <https://github.com/typst/biblatex>; dual MIT / Apache-2.0; 173 stars, ~248k downloads; v0.11.0; parses BibTeX and BibLaTeX with strongly-typed structs (Person, Date, etc.).

[^sre-repo]: Speech Rule Engine repository at <https://github.com/Speech-Rule-Engine/speech-rule-engine>; 79 releases; v5.0.0-rc.1 (April 22, 2026). MathJax v3+ "uses sre directly via its npm release."

[^sre-license]: SRE `LICENSE` file: Apache License Version 2.0.

[^mathml-browser-support]: MathML browser support data from the Igalia MathML in Web Browsers tracker <https://mathml.igalia.com/>, Can I Use <https://caniuse.com/mathml>, and MDN <https://developer.mozilla.org/en-US/docs/Web/MathML>. Firefox: full support all versions. Safari: full support v10+, partial v3.2–9. Chrome: full support v109–145, no support v4–111. MathML Core specifically targets browser-quality rendering with LaTeX-derived rules and Open Font Format integration.

[^mathml-screen-reader]: Screen reader / MathML interaction summary: NVDA does not read MathML by default — requires MathPlayer 4 or MathCAT add-on. JAWS has best experience on Chrome 109+. VoiceOver supports MathML out of the box on Safari/macOS/iOS without plugins. Sources include WebAssign accessibility documentation, MathJax MathML support wiki, and DAISY Consortium MathML guidance.

[^tauri-webview]: Tauri v2 WebView reference <https://v2.tauri.app/reference/webview-versions/>: WebView2 (Chromium-based) on Windows, WKWebView (WebKit) on macOS, webkit2gtk (WebKit) on Linux, Android System WebView (Chromium) on Android.

[^webview2-a11y]: MicrosoftEdge/WebView2Feedback#2330 ("A11Y: WebView2 control is completely inaccessible with screen readers (NVDA, JAWS and partially with Narrator too)") documents long-standing screen-reader accessibility gaps in WebView2 on Windows.

[^tauri-a11y-tracking]: tauri-apps/tauri#207 ("Tracking : accessibility (a11y)") — Tauri's main tracking issue for screen-reader and AT support, indicating active work but not yet feature parity with Electron's bundled Chromium.

[^stix-license]: STIX Two Math font is licensed under SIL Open Font License 1.1, per <https://github.com/stipub/stixfonts> and <https://www.stixfonts.org/>. Royalty-free; allows bundling, modification, and redistribution with name preservation rules.

[^lm-license]: Latin Modern fonts are licensed under the GUST Font License (GFL), legally equivalent to the LaTeX Project Public License (LPPL) version 1.3c or later, per the GUST e-Foundry license document at <https://www.gust.org.pl/projects/e-foundry/licenses/tb91Berry_Ludwichowski.pdf>. Requires renaming derived font work but does not affect the application linking to or shipping the fonts.
