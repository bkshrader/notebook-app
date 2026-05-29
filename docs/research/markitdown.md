# MarkItDown

- **GitHub repo:** <https://github.com/microsoft/markitdown>[^repo]
- **PyPI:** <https://pypi.org/project/markitdown/> · MCP server: <https://pypi.org/project/markitdown-mcp/>[^pypi]
- **Documentation site:** None. The project README (in-repo) is the only canonical documentation; `pyproject.toml` lists `Documentation = "https://github.com/microsoft/markitdown#readme"`.[^pyproject-core] There is no `mkdocs` site, no Read-the-Docs, no `/docs` directory.
- **License:** **MIT License**, verified directly against the `LICENSE` file in the repo root (1141 bytes, standard MIT text, `Copyright (c) Microsoft Corporation`).[^license-file] Each subpackage (`packages/markitdown`, `packages/markitdown-mcp`, `packages/markitdown-ocr`, `packages/markitdown-sample-plugin`) also declares `license = "MIT"` in its own `pyproject.toml`.[^pyproject-core][^pyproject-mcp][^pyproject-ocr]
- **AGPL-compatibility verdict (core `markitdown` package):** **Compatible.** MIT is permissive and OSI-approved; AGPL-3.0 §7 explicitly permits incorporation of MIT-licensed code into an AGPL work as long as the MIT copyright notice is preserved in the larger work's source distribution. The bundled third-party code (`dwml`, Apache-2.0, used for OMML→LaTeX math conversion in DOCX) is also AGPL-compatible.[^thirdparty-notices]
- **AGPL-compatibility verdict (optional / plugin dependencies — read carefully):**
  - The **core `[all]` install set is fully permissive**: `beautifulsoup4` (MIT), `requests` (Apache-2.0), `markdownify` (MIT)[^lic-markdownify], `magika` (Apache-2.0, Google)[^lic-magika], `charset-normalizer` (MIT), `defusedxml` (PSF), `python-pptx` (MIT)[^lic-pptx], `mammoth` (BSD-2)[^lic-mammoth], `pandas` (BSD-3), `openpyxl` (MIT), `xlrd` (BSD), `lxml` (BSD-3), `pdfminer.six` (MIT)[^lic-pdfminer], `pdfplumber` (MIT)[^lic-pdfplumber], `olefile` (BSD), `pydub` (MIT)[^lic-pydub], `SpeechRecognition` (BSD-3)[^lic-sr], `youtube-transcript-api` (MIT)[^lic-yta]. Azure SDK packages are MIT.[^pyproject-core]
  - **The `markitdown-ocr` plugin pulls in `PyMuPDF>=1.24.0` as a hard dependency, which is AGPL-3.0.**[^pyproject-ocr][^lic-pymupdf] PyMuPDF is dual-licensed (AGPL-3.0 / commercial via Artifex). For our AGPL app this is _technically_ license-compatible (AGPL→AGPL is fine), but it means **anyone shipping `markitdown-ocr` inside a non-AGPL product would inherit AGPL obligations from PyMuPDF**, and it forecloses any future relicensing of our app to a more permissive license. If we stay AGPL, this is fine; if we ever consider dual-licensing, we must not bundle `markitdown-ocr` or must replace its PyMuPDF dependency.
  - **The `markitdown-mcp` server depends transitively on the entire `markitdown[all]` set** (`mcp~=1.8.0` + `markitdown[all]>=0.1.1,<0.2.0`)[^pyproject-mcp] — same permissive surface, AGPL-compatible.
  - **No copyleft contamination in the core**: PyMuPDF is _not_ used by the core `markitdown` package — its PDF stack is pure `pdfminer.six` + `pdfplumber`, both MIT.[^pdf-converter-source]
- **Trademark caveat:** the LICENSE is MIT, but the README contains a "Trademarks" section reserving "MarkItDown" and "Microsoft" as Microsoft trademarks; modifications cannot imply Microsoft sponsorship.[^readme] This is standard for Microsoft OSS and does not affect code reuse, but it does affect any UI string that says "Powered by MarkItDown" — better to describe it as "Markdown conversion" without using the wordmark.

---

## What it is

MarkItDown is a Python utility from Microsoft's AutoGen team that **converts a wide range of file formats into a single Markdown string**, optimised for feeding documents into LLMs rather than for human-grade fidelity.[^readme] The README is explicit: "the output is often reasonably presentable and human-friendly, [but] is meant to be consumed by text analysis tools — and may not be the best option for high-fidelity document conversions for human consumption."[^readme]

### Supported formats[^readme][^converters-listing]

The core package ships these converters (file: `packages/markitdown/src/markitdown/converters/`):

| Format                                                   | Converter                                                            | Underlying library / approach                                                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF                                                      | `_pdf_converter.py`                                                  | `pdfplumber` first (form-style table detection), falls back to `pdfminer.six` for prose pages.[^pdf-converter-source]                                              |
| DOCX                                                     | `_docx_converter.py`                                                 | `mammoth` (DOCX→HTML) → `markdownify`. Custom OMML→LaTeX pre-processing for equations.[^docx-source][^docx-math-source]                                            |
| PPTX                                                     | `_pptx_converter.py`                                                 | `python-pptx`; supports tables, charts, group shapes, image alt-text, slide notes, and optional LLM image descriptions.[^pptx-source]                              |
| XLSX / XLS                                               | `_xlsx_converter.py`                                                 | `pandas` + `openpyxl` / `xlrd`.                                                                                                                                    |
| HTML / Web URLs                                          | `_html_converter.py` + specific Wikipedia, Bing SERP, RSS converters | `BeautifulSoup` + `markdownify`.                                                                                                                                   |
| Images (JPG/PNG)                                         | `_image_converter.py`                                                | `exiftool` (external binary) for metadata; no built-in OCR — relies on an LLM client (OpenAI-compatible) for descriptions.[^image-source]                          |
| Audio (WAV/MP3/M4A/MP4)                                  | `_audio_converter.py`                                                | `pydub` for transcoding + `SpeechRecognition` (which **calls Google Web Speech API by default** — see "Privacy posture" below).[^audio-source][^transcribe-source] |
| YouTube URLs                                             | `_youtube_converter.py`                                              | `youtube-transcript-api`.                                                                                                                                          |
| EPUB                                                     | `_epub_converter.py`                                                 | Custom XHTML extraction.                                                                                                                                           |
| ZIP                                                      | `_zip_converter.py`                                                  | Iterates contents and recursively converts each entry.                                                                                                             |
| Outlook .msg                                             | `_outlook_msg_converter.py`                                          | `olefile`.                                                                                                                                                         |
| CSV / JSON / XML / plain text                            | Generic converters                                                   | Built-in stdlib + `charset-normalizer`.                                                                                                                            |
| Jupyter notebooks (`.ipynb`)                             | `_ipynb_converter.py`                                                | JSON parsing of notebook cells.                                                                                                                                    |
| Wikipedia, RSS, Bing SERP                                | Dedicated converters                                                 | Hardcoded site adapters.                                                                                                                                           |
| Azure Document Intelligence (PDF/images/Office)          | `_doc_intel_converter.py`                                            | **Cloud-only** — sends docs to Azure for layout-aware OCR.[^doc-intel-source]                                                                                      |
| Azure Content Understanding (all modalities incl. video) | `_cu_converter.py`                                                   | **Cloud-only** — Azure's newer multimodal extractor (added Feb 2026).[^readme]                                                                                     |

### Architecture

- **Plugin model.** The core class `MarkItDown` registers `DocumentConverter` instances with priorities (lower priority is tried first). Plugins register via the `markitdown.plugin` setuptools entry-point group and are loaded lazily with `enable_plugins=True`.[^markitdown-core-source] Third-party plugins can be discovered on GitHub by the `#markitdown-plugin` topic.[^readme]
- **Single Python package**, no compiled extension of its own (everything heavy is in dependencies). Distributed as a wheel via PyPI; can also be run from a Docker image bundled in the repo (`FROM python:3.13-slim-bullseye` with `ffmpeg` and `exiftool` apt-installed).[^dockerfile]
- **Monorepo with four packages:** `markitdown` (the library + CLI), `markitdown-mcp` (an MCP server exposing one tool, `convert_to_markdown(uri)`), `markitdown-ocr` (the LLM-vision OCR plugin), `markitdown-sample-plugin` (template for new plugins).[^packages-listing]
- **`magika`** (Google's neural file-type detector, Apache-2.0) is used for content-type sniffing on byte streams — this has been a source of friction (one of the most upvoted feature requests is to make it optional)[^issue-1234].

### Scope vs. alternatives

Implicitly positioned against:

- **Pandoc** (GPL-2.0)[^lic-pandoc] — far more mature, broader format matrix, and lossless round-tripping; but written in Haskell, ships as a separate binary, and is designed for _publishing_ not for LLM ingestion. The GPL also makes it harder to embed in proprietary apps (though AGPL is compatible).
- **Docling** (IBM, MIT)[^lic-docling] — newer, ML-heavy (~2.4 GB install), markedly better at tables, equations, and academic layouts (see "Comparison snapshot" below).
- **Unstructured** (Apache-2.0)[^lic-unstructured] — partitioning + chunking + ETL framework; broader in scope but heavier and more enterprise-oriented.
- **PyMuPDF4LLM** (AGPL-3.0)[^lic-pymupdf4llm] — single-purpose, very fast, PDF-only.
- **Marker** (datalab.to) — GPU-recommended, best-in-class for math/LaTeX preservation in academic PDFs.[^danilchenko]

MarkItDown's pitch is _breadth_ and _simplicity_ — one `pip install` and you can convert basically anything to passable Markdown without per-format setup. That convenience is what justifies its 124k+ stars[^repo-meta]; conversion _quality_ on hard PDFs is not where it competes.

---

## How to use it

### Installation[^readme]

```bash
# Python 3.10+ required
pip install 'markitdown[all]'                      # everything
pip install 'markitdown[pdf, docx, pptx]'         # à la carte
pip install markitdown                             # core only (text/HTML/CSV/JSON)
```

The MCP server (separate package):

```bash
pip install markitdown-mcp
```

**OS-level binaries** (optional but recommended for full functionality):

- `ffmpeg` — used by `pydub` for non-WAV audio decoding. The official Dockerfile apt-installs it; on macOS/Linux/Windows users must install it themselves.[^dockerfile]
- `exiftool` — used for EXIF metadata extraction from images and audio. Path is auto-discovered from `EXIFTOOL_PATH` env var, `which exiftool`, or well-known install locations (`/usr/bin`, `/opt/homebrew/bin`, `C:\Program Files`, etc.).[^markitdown-core-source]
- **No LibreOffice required** (unlike some alternatives) — DOCX is handled in-process by `mammoth`, PPTX by `python-pptx`.
- **No Tesseract / OCR engine** — there is no built-in OCR. The two options for OCR are (a) the optional `markitdown-ocr` plugin, which uses an LLM Vision API (OpenAI-compatible), or (b) the optional Azure Document Intelligence / Content Understanding integrations, both cloud.[^readme][^ocr-readme]

### CLI[^readme]

```bash
markitdown path-to-file.pdf > document.md
markitdown path-to-file.pdf -o document.md
cat path-to-file.pdf | markitdown            # stdin
markitdown --list-plugins
markitdown --use-plugins path-to-file.pdf
```

### Python API[^readme]

```python
from markitdown import MarkItDown

md = MarkItDown(enable_plugins=False)
result = md.convert("test.xlsx")
print(result.text_content)        # or result.markdown
```

With LLM-based image descriptions (PPTX images, standalone images):

```python
from markitdown import MarkItDown
from openai import OpenAI

md = MarkItDown(
    llm_client=OpenAI(),
    llm_model="gpt-4o",
    llm_prompt="Describe this image succinctly for accessibility.",
)
result = md.convert("lecture-slide.pptx")
```

Security-sensitive API (narrow conversion entry points): prefer `convert_local()`, `convert_stream()`, or `convert_response()` over the generic `convert()`, which will fetch arbitrary URIs.[^readme]

### MCP server (`markitdown-mcp`)[^mcp-readme]

Exposes **one** MCP tool: `convert_to_markdown(uri)` where `uri` can be `http:`, `https:`, `file:`, or `data:`. Transports: STDIO (default), Streamable HTTP, SSE — all bind to `localhost` by default. The server has **no auth** and runs with the user's privileges; the README repeatedly warns "DO NOT bind the server to other interfaces". A Dockerfile is provided for sandboxed deployment, and the README has a ready-to-paste Claude Desktop `mcpServers` config entry.[^mcp-readme]

### Docker[^dockerfile]

```bash
docker build -t markitdown:latest .
docker run --rm -i markitdown:latest < ~/your-file.pdf > output.md
```

---

## Relevance to a note-taking app

This is the section that matters for our project. **Verdict up top: MarkItDown is the most natural import-pipeline candidate we've evaluated so far, but with significant caveats around PDF quality and runtime architecture.**

### Source ingestion (the killer use case)

Academic users dump heterogeneous content: syllabi (PDF + DOCX), lecture decks (PPTX), problem sets (PDF, sometimes scanned), Excel data, screenshots, journal articles (PDF), audio recordings of lectures (MP3/M4A), and the occasional Jupyter notebook. MarkItDown's coverage matrix is exactly this set — there is no other single library that touches all of it. The closest competitors:

- **Docling** covers PDF/DOCX/PPTX/HTML/images well, but no audio, no YouTube, no EPUB, no MSG, no XLSX charts, no .ipynb. Better PDF quality, narrower format coverage.
- **Pandoc** covers DOCX/HTML/EPUB/Markdown extremely well, ignores PDF (input), no audio, no images.
- **Unstructured** covers all of these but is heavier and oriented toward ETL pipelines.

For "user drops a folder of stuff and we ingest", **MarkItDown wins on breadth — but expect to bolt on a better PDF backend (docling or PyMuPDF4LLM) for academic papers.**

### LLM context preparation (NotebookLM-style features)

This is exactly what MarkItDown is built for. Quote from the README: "Mainstream LLMs … natively 'speak' Markdown … Markdown conventions are also highly token-efficient."[^readme] For a chat-with-your-sources feature we essentially need ingested-text-as-markdown blobs to chunk and embed; MarkItDown's output is fit-for-purpose for that workflow with no post-processing. The MCP server (`markitdown-mcp`) means we get a ready-made tool surface if we want any of our internal LLM agents (or the user's external Claude/Cursor) to convert files on demand.

### Accessibility angle

This is genuinely strong. Converting an inaccessible PDF/PPTX/scanned-image to structured Markdown is, in itself, an accessibility win — screen readers handle Markdown reliably, headings/lists become navigable landmarks, and once we have structured content we can serve it with proper ARIA semantics. Specific wins:

- **DOCX equations become LaTeX** (`$...$` inline, `$$...$$` display) via the in-tree OMML→LaTeX converter[^docx-math-source] — these can then be rendered with MathML/KaTeX/MathJax, which screen readers (NVDA + MathPlayer, JAWS) can voice. **This is a meaningful accessibility feature** that other converters often lack.
- **PPTX preserves alt-text** from the deck itself (`descr` attribute), and optionally generates an LLM caption when none exists — exactly the pattern WCAG 1.1.1 demands.[^pptx-source]
- **Image converter accepts a custom `llm_prompt`**, so we can tune the LLM to produce screen-reader-grade alt text rather than verbose marketing prose.[^image-source]

Caveats:

- **PDF math is not preserved.** The PDF stack is `pdfminer.six` + `pdfplumber`; neither has math/MathML extraction. Equations in academic PDFs become garbled text or vanish.[^danilchenko]
- **Headings from PDFs are essentially lost** (OpenDataLoader benchmark scored MarkItDown 0.000 on heading recognition for PDFs).[^yage-survey] That's a serious accessibility/navigability gap if we depend on it for screen-reader landmarks.
- **Scanned PDFs are extraction-empty** without enabling either `markitdown-ocr` (LLM-Vision) or Azure Document Intelligence — both add per-conversion latency and (for the LLM/Azure routes) a network round-trip.

### Architecture concerns (Electron vs Tauri)

MarkItDown is **pure Python**. There is **no Node/TypeScript port, no WASM build, no static binary.** This is the single biggest integration question. Options:

1. **Python sidecar process** (most realistic).
   - Electron: spawn via `child_process` or `python-shell`; communicate over stdio/JSON-RPC or call the local MCP server (`markitdown-mcp --http --port 3001`).
   - Tauri: sidecar (`tauri.conf.json → bundle.externalBin`) with a bundled portable Python (e.g. PyOxidizer, PyInstaller, or `python-build-standalone`) plus the wheel.
   - Pros: zero porting, full feature set, easy upgrade path.
   - Cons: bundle size — even a minimal "Python 3.12 + markitdown[all]" install is 200–400 MB; on first launch we pay a slow `pip install` if we ship a venv, or we ship a frozen distribution which fights antivirus heuristics on Windows.
2. **MCP-over-HTTP**: ship the `markitdown-mcp` server as the sidecar — gives us a stable tool surface that's also reusable by any external LLM clients the user has connected. Probably the cleanest design.
3. **Docker sidecar**: only viable on power-user machines.
4. **Reimplement in TypeScript / Rust**: massive scope creep; would lose the active upstream maintenance benefit. Don't.

**Recommendation:** Tauri + bundled portable Python interpreter + `markitdown-mcp` over Streamable HTTP on `localhost`, talked to from the renderer via Tauri commands. This pattern lets the same backend serve our internal ingestion _and_ external MCP-aware clients. Note that **shipping a Python runtime breaks the "single tiny binary" pitch of Tauri** — we'd be in the 100–300 MB installer range, not the 5–10 MB range Tauri normally enables. That's an acceptable tradeoff given format coverage, but it should be a deliberate decision.

### Math / LaTeX handling — honest assessment

| Format     | Equation preservation?                                                                                                                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOCX**   | **Yes, well** — OMML elements are converted to inline `$...$` / display `$$...$$` LaTeX via the bundled `dwml`-derived converter. This is genuinely useful for academic Word documents.[^docx-math-source][^thirdparty-notices]     |
| **PDF**    | **No.** No equation detection; LaTeX in PDFs is rendered to image text and `pdfminer.six` returns garbled fragments. The most-upvoted feature request labeled "math formula ocr" (issue #17) is _still open_ with no PR.[^issue-17] |
| **PPTX**   | **No special handling** — equations inside text frames are extracted as whatever Unicode glyphs Python-pptx returns.                                                                                                                |
| **HTML**   | Preserves MathML _only if_ the source HTML contains MathML tags (markdownify default behavior is to drop them); LaTeX in `<math>` or `$...$` Markdown source survives.                                                              |
| **Images** | Only via LLM caption or the Azure converters — no dedicated math OCR (no Mathpix-style backend).                                                                                                                                    |
| **EPUB**   | Inherits HTML/MathML behavior — patchy.                                                                                                                                                                                             |

**Net for academic users:** DOCX math works well. PDF math does not. If our app needs to ingest journal-article PDFs and preserve equations (which it likely does), we need a different PDF backend — likely **Marker** (which preserves LaTeX as `$...$` spans)[^danilchenko] or **Mathpix** (commercial). Pairing MarkItDown for "everything else" with Marker for PDFs is a reasonable architecture.

### OCR & audio quality (privacy posture — read carefully)

This is the section where MarkItDown can surprise users in _bad_ ways for a privacy-respecting offline-first product.

**Audio transcription:** `SpeechRecognition`'s default backend is `recognizer.recognize_google(audio)`, which **sends the audio to Google's Web Speech API** (a public Chrome-internal endpoint that has no documented privacy guarantees and was never designed for production third-party use).[^transcribe-source] The README does **not** mention this. For a privacy-first academic notebook app, **shipping MarkItDown's audio converter as-is is a privacy regression and a likely WCAG/EU AI Act/FERPA compliance issue.** Mitigation: subclass `AudioConverter` and replace with a local Whisper backend (`whisper.cpp`, `faster-whisper`, or `SpeechRecognition.recognize_whisper`).

**Image OCR:** None built in. The two production paths are (a) `markitdown-ocr` plugin → LLM-Vision API (OpenAI, Azure, Ollama LLaVA, etc.), (b) Azure Document Intelligence / Content Understanding. **There is no Tesseract / PaddleOCR / on-device option in the box.** For local-first, we'd add it ourselves.

**Image descriptions** (alt-text for PPTX images, standalone JPG/PNG): same story — any OpenAI-compatible client works, so a local Ollama / LM Studio / llama.cpp server is a drop-in replacement. The `MarkItDown(llm_client=…, llm_model=…)` API is provider-agnostic.[^image-source]

**Azure converters** (`docintel_endpoint=…`, `cu_endpoint=…`): cloud-only by definition, billable per API call, must not be enabled by default.[^doc-intel-source][^readme]

**YouTube transcription:** uses `youtube-transcript-api`, which fetches publicly available auto-generated captions over HTTPS — no API key, but obviously a network call.[^pyproject-core]

**For our app:** treat MarkItDown as _opt-in cloud is fine, opt-out cloud is required_. Concretely, our wrapper must (a) replace the audio converter with a local Whisper, (b) never auto-enable any `*_endpoint` arg, (c) document that turning on the `markitdown-ocr` plugin means choosing an LLM backend (and offer a local Ollama option in the picker).

---

## Things to know

### Maturity signals

- **Stars / forks:** ~124,791 stars, 8,488 forks as of May 2026 — top-tier popularity.[^repo-meta]
- **Created:** Nov 13, 2024. So this is an 18-month-old project; the explosive star count reflects viral attention more than long-term technical maturity.[^repo-meta]
- **Contributors:** 78 (via the standard contributors API endpoint, which caps at the top contributors).[^contributors]
- **Total issues + PRs:** 465 issues (370 open, 95 closed) + 609 PRs (288 open, 175 merged).[^issue-counts] The **288 open PRs** is concerning — there's a backlog of community contributions waiting on Microsoft review.
- **Release cadence:** Slow and lumpy. Most recent: v0.1.5 (Feb 20, 2026), preceded by v0.1.4 (Dec 1, 2025) and v0.1.3 (Aug 26, 2025). Five releases in 2025 plus one in 2026 so far. **Still pre-1.0 ("Development Status :: 4 - Beta")** — they've been "Beta" the entire time.[^pyproject-core][^releases]
- **Recent commits show active work:** Feb–May 2026 commits include the Azure Content Understanding converter, RecursionError fixes for deeply nested HTML, O(n) memory growth fix in PDF conversion (page caching), OCR layer service for embedded images. The lead maintainer is still Adam Fourney (AutoGen Team).[^recent-commits]
- **Verdict:** Microsoft is still investing, but lightly. This is not a flagship product like VS Code — it's a single-team utility. Expect bug fixes and incremental converter additions, not a fundamental rewrite of the PDF pipeline. If we depend on it, we should be prepared to maintain a fork for accessibility-specific fixes.

### Known quality issues (the honest picture)

This is the most important section. There is now a substantial body of public benchmarking that _consistently_ finds MarkItDown lacking on PDFs:

- **OpenDataLoader Benchmark** (per the yage.ai survey): MarkItDown scored **0.589 overall on PDF** (second-to-last of 12 tools), with **0.000 on heading recognition** and **0.273 on table fidelity**. Docling scored 0.882 / 0.824 / 0.887 on the same axes.[^yage-survey]
- **Direct comparison testing** (danilchenko.dev, July 2025): "MarkItDown's tables become interleaved paragraphs with no pipe characters … two-column layouts get scrambled (left and right columns sentence by sentence) … scanned PDFs produce almost no usable output."[^danilchenko]
- **Most-upvoted open issues by reactions:** "Tables in pdf files are not converted properly" (#293, 35 reactions), "PDF not supported" (#296, 28 reactions), "math formula ocr" (#17, 14 reactions). All open.[^top-issues]
- **Architecture critique** (InfoWorld, BigGo): MarkItDown is "largely a wrapper around existing third-party libraries (like mammoth and pandas) rather than offering novel conversion capabilities."[^infoworld-critique]

What it does _well_:

- Word documents (mammoth is mature; OMML→LaTeX is a real feature).
- Office formats other than PPTX images.
- HTML, CSV, JSON, Wikipedia.
- The MCP integration is clean.

What it does _poorly_:

- Complex PDFs (multi-column, tables, equations, footnotes, scanned).
- Heading recognition in PDFs (essentially nonexistent).
- Math in any PDF source.

### Privacy posture (recap)

| Capability                                                    | Default backend                               | Phones home?         | Mitigation                 |
| ------------------------------------------------------------- | --------------------------------------------- | -------------------- | -------------------------- |
| PDF extraction                                                | pdfminer.six + pdfplumber                     | No (local)           | —                          |
| DOCX/XLSX/PPTX                                                | mammoth / python-pptx / openpyxl              | No (local)           | —                          |
| HTML/Wikipedia/RSS/Bing SERP/YouTube/web URIs via `convert()` | requests                                      | **Yes**, fetches URL | Use `convert_local()`      |
| Audio transcription                                           | SpeechRecognition → **Google Web Speech API** | **Yes**              | Replace with local Whisper |
| Image OCR                                                     | None (LLM-Vision via plugin)                  | Yes (if enabled)     | Use local LLM (Ollama)     |
| Image descriptions                                            | LLM client (user-supplied)                    | Yes (if enabled)     | Use local LLM (Ollama)     |
| Azure Document Intelligence                                   | Azure cloud                                   | **Yes (cloud-only)** | Don't enable by default    |
| Azure Content Understanding                                   | Azure cloud                                   | **Yes (cloud-only)** | Don't enable by default    |
| File-type sniffing                                            | magika (Google ML model, runs locally)        | No (local)           | —                          |

### Performance characteristics

- **Synchronous, blocking API.** `convert()` returns a `DocumentConverterResult` once the whole file is processed. No streaming, no async, no progress callbacks. Long PDFs block the calling thread.[^markitdown-core-source]
- **Memory:** A recent fix (PR #1612, March 2026)[^recent-commits] addressed **O(n) memory growth on PDF conversion** by explicitly calling `page.close()` per page in the pdfplumber loop. On a 500-page PDF before this fix, RAM usage scaled with page count; now it should be roughly bounded. There is no streamed output mode regardless.
- **Speed:** Reported ~0.6s for a 14-page PDF (MarkItDown) vs ~41s for Docling on CPU.[^danilchenko] The speed advantage is real and substantial — but it's a function of _not doing the work_ (no layout analysis, no ML).
- **For our app:** wrap calls in a Web Worker (Electron) or a Tauri command (which is async by default), and surface a progress indicator that's based on file size rather than internal progress (since there is none).

### Comparison snapshot

| Tool                 | License                             | PDF table quality                   | Equation handling                              | Audio                                       | Other formats                                                            | Install size                          | Best for                                   |
| -------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------ |
| **MarkItDown**       | MIT[^license-file]                  | **Poor** (0.273)[^yage-survey]      | DOCX ✓, PDF ✗                                  | Google cloud by default[^transcribe-source] | Widest matrix (PDF/DOCX/PPTX/XLSX/HTML/EPUB/audio/YouTube/MSG/ZIP/ipynb) | ~80 MB[^danilchenko]                  | Breadth, simplicity, LLM ingestion         |
| **Docling** (IBM)    | MIT[^lic-docling]                   | **Excellent** (0.887)[^yage-survey] | LaTeX as image+OCR (loses LaTeX)[^danilchenko] | None                                        | PDF/DOCX/PPTX/HTML/images                                                | ~2.4 GB[^danilchenko]                 | Tables, complex layouts, regulated content |
| **Marker** (Datalab) | GPL-3.0/commercial[^marker-license] | Excellent (simple), weaker (nested) | **LaTeX preserved as `$...$`**[^danilchenko]   | None                                        | PDF only                                                                 | ~1.5 GB + 1.1 GB models[^danilchenko] | Academic PDFs with math                    |
| **Unstructured**     | Apache-2.0[^lic-unstructured]       | Good                                | Variable                                       | None                                        | Very wide (~25 formats)                                                  | Heavy                                 | ETL pipelines                              |
| **Pandoc**           | GPL-2.0[^lic-pandoc]                | N/A (no PDF input)                  | Excellent in DOCX/LaTeX                        | None                                        | DOCX/HTML/LaTeX/EPUB/Markdown                                            | ~150 MB binary                        | Lossless format conversion for publishing  |
| **PyMuPDF4LLM**      | **AGPL-3.0**[^lic-pymupdf4llm]      | Good                                | Decent                                         | None                                        | PDF only                                                                 | ~50 MB                                | Fast PDF-only RAG ingestion                |
| **LlamaParse**       | Commercial / cloud only             | Excellent                           | LaTeX                                          | None                                        | PDF/DOCX/PPTX                                                            | Cloud                                 | Hosted, paid, highest quality              |

**The honest take for our use case:** No single tool covers all our needs perfectly.

- **MarkItDown** is the best _single dependency_ if we want to support the widest input matrix with one library.
- **Docling** is materially better than MarkItDown on the most demanding format we care about (academic PDFs) and is also MIT-licensed. It has no audio, no YouTube, no EPUB.
- A **hybrid architecture** is probably correct: MarkItDown for DOCX/PPTX/XLSX/HTML/EPUB/audio/YouTube/MSG/ipynb, Docling (or Marker for math-heavy) for PDFs.

### Dependencies with surprising licenses

- **`PyMuPDF` (AGPL-3.0)** — pulled in by `markitdown-ocr`, _not_ by core `markitdown`.[^pyproject-ocr] AGPL is compatible with our AGPL app, but it permanently colors our app AGPL (cannot dual-license without removing this plugin).
- **`magika` (Apache-2.0, by Google)** — core dependency. Apache-2.0 has a patent grant; AGPL-compatible. Ships a small ML model for content-type detection.[^lic-magika] Several open issues complain about install size; making it optional has been requested but not implemented.[^issue-1234]
- **`SpeechRecognition` (BSD-3)** — fine license, but **its default API call goes to Google**, which is a privacy issue rather than a license issue.[^transcribe-source]
- **No GPL/AGPL deps in the core install set** beyond what's noted above.

### Other gotchas

- **Pre-1.0 / Beta status** — API surface could still shift (though `0.1.x` has been stable for a while). The `markitdown-mcp` package depends on `markitdown[all]>=0.1.1,<0.2.0` — a pre-1.0 caret-style pin that we should mirror in our own dependency management.[^pyproject-mcp]
- **CLA required for contributions** (standard Microsoft policy)[^readme] — if we patch upstream, individual contributors must sign the Microsoft CLA. Often a friction point for OSS contributors.
- **Security model**: README is now very explicit (post-PR #1807, April 2026) about untrusted-input dangers — `convert()` is a SSRF risk because it fetches arbitrary URLs.[^readme] For our app: never expose `convert()` to user-supplied URI strings without sanitization. Use `convert_local()` or `convert_stream()` instead.
- **MCP server has no auth** and the README is loud about not binding it to non-localhost interfaces.[^mcp-readme]
- **Wikipedia and YouTube** converters are tightly coupled to those services' current page layouts / APIs and can break silently when those change.

---

## Footnotes

[^repo]: GitHub repo: <https://github.com/microsoft/markitdown> — verified live via `gh repo view microsoft/markitdown` (May 23, 2026).

[^repo-meta]: `gh api repos/microsoft/markitdown` returns: stars 124,791; forks 8,488; created 2024-11-13; last push 2026-05-22; primary language Python; default branch `main`.

[^pypi]: PyPI listing for `markitdown` at <https://pypi.org/project/markitdown/> — latest version 0.1.5 (Feb 20, 2026), classifier "Development Status :: 4 - Beta", Python >=3.10.

[^license-file]: `packages/markitdown/LICENSE` (also repo-root LICENSE), SHA `9e841e7a26e4eb057b24511e7b92d42b257a80e5`, 1141 bytes: full text is standard MIT, copyright "Microsoft Corporation". Raw fetched via `gh api repos/microsoft/markitdown/contents/LICENSE`.

[^pyproject-core]: `packages/markitdown/pyproject.toml` — declares `license = "MIT"`, `requires-python = ">=3.10"`, core deps `beautifulsoup4, requests, markdownify, magika~=0.6.1, charset-normalizer, defusedxml`, and optional-dependency groups `[all]`, `[pptx]`, `[docx]`, `[xlsx]`, `[xls]`, `[pdf]`, `[outlook]`, `[audio-transcription]`, `[youtube-transcription]`, `[az-doc-intel]`, `[az-content-understanding]`.

[^pyproject-mcp]: `packages/markitdown-mcp/pyproject.toml` — declares `license = "MIT"`, deps `mcp~=1.8.0, markitdown[all]>=0.1.1,<0.2.0`, console script `markitdown-mcp = "markitdown_mcp.__main__:main"`.

[^pyproject-ocr]: `packages/markitdown-ocr/pyproject.toml` — declares `license = "MIT"`, deps include `markitdown>=0.1.0, pdfminer.six>=20251230, pdfplumber>=0.11.9, PyMuPDF>=1.24.0, mammoth~=1.11.0, python-docx, python-pptx, pandas, openpyxl, Pillow>=9.0.0`, optional `[llm] = openai>=1.0.0`, registers plugin via entry-point `[project.entry-points."markitdown.plugin"] ocr = "markitdown_ocr"`.

[^thirdparty-notices]: `packages/markitdown/ThirdPartyNotices.md` — documents incorporation of `dwml/latex_dict.py` and `dwml/omml.py` from <https://github.com/xiilei/dwml> under Apache-2.0, used for OMML→LaTeX math conversion (PR #1160).

[^readme]: Repo README at <https://github.com/microsoft/markitdown/blob/main/README.md> — fetched May 23, 2026. Covers format matrix, CLI/Python API, optional-dependency groups, Azure Document Intelligence and Content Understanding integrations, plugins, Docker, and a "Security Considerations" section emphasising SSRF risk of `convert()`.

[^converters-listing]: Source directory `packages/markitdown/src/markitdown/converters/` enumerated via `gh api`: `_audio_converter.py, _bing_serp_converter.py, _csv_converter.py, _cu_converter.py, _doc_intel_converter.py, _docx_converter.py, _epub_converter.py, _exiftool.py, _html_converter.py, _image_converter.py, _ipynb_converter.py, _llm_caption.py, _markdownify.py, _outlook_msg_converter.py, _pdf_converter.py, _plain_text_converter.py, _pptx_converter.py, _rss_converter.py, _transcribe_audio.py, _wikipedia_converter.py, _xlsx_converter.py, _youtube_converter.py, _zip_converter.py`.

[^pdf-converter-source]: `packages/markitdown/src/markitdown/converters/_pdf_converter.py` — uses `pdfminer.high_level` and `pdfplumber`. `pdfplumber` is tried first with custom form-style table detection (`_extract_form_content_from_words`, `_extract_tables_from_words`); falls back to `pdfminer.high_level.extract_text` for plain prose pages or when pdfplumber raises. No PyMuPDF / no Tesseract.

[^docx-source]: `packages/markitdown/src/markitdown/converters/_docx_converter.py` — uses `mammoth.convert_to_html`, then routes through the HtmlConverter (markdownify-based). Pre-processes DOCX with `pre_process_docx` to substitute OMML math elements with LaTeX before mammoth conversion.

[^docx-math-source]: `packages/markitdown/src/markitdown/converter_utils/docx/pre_process.py` and `converter_utils/docx/math/{omml.py, latex_dict.py}` — OMML elements (`<m:oMath>`, `<m:oMathPara>`) are converted to inline (`$...$`) or display (`$$...$$`) LaTeX using a vendored copy of `dwml`'s OMML-to-LaTeX engine.

[^pptx-source]: `packages/markitdown/src/markitdown/converters/_pptx_converter.py` — uses `python-pptx`, iterates slides; for picture shapes, uses `shape.image.blob` + optional LLM caption (`llm_client`/`llm_model`) plus the deck's own `descr` alt-text; emits `![alt](file.jpg)` or base64 data URI if `keep_data_uris=True`; supports tables (`_convert_table_to_markdown` via HTML→markdownify), charts (`_convert_chart_to_markdown`), group shapes (recursive), and slide notes.

[^image-source]: `packages/markitdown/src/markitdown/converters/_image_converter.py` — extracts EXIF metadata via `exiftool` (external binary), then if `llm_client`/`llm_model` provided, base64-encodes the image and calls `client.chat.completions.create(model=…, messages=[{role:user, content:[text, image_url]}])`. Default prompt: "Write a detailed caption for this image." User can override with `llm_prompt`.

[^audio-source]: `packages/markitdown/src/markitdown/converters/_audio_converter.py` — accepts `.wav`, `.mp3`, `.m4a`, `.mp4`. Extracts EXIF/metadata via `exiftool`, then calls `transcribe_audio()` from `_transcribe_audio.py`.

[^transcribe-source]: `packages/markitdown/src/markitdown/converters/_transcribe_audio.py` — imports `speech_recognition as sr` and `pydub`. For `.mp3`/`.mp4`, transcodes to WAV via pydub. Then: `recognizer.recognize_google(audio)` — **this calls Google's Web Speech API endpoint** (the same one Chrome uses internally for the Web Speech API). No local Whisper, no opt-in to a different engine; replacing it requires subclassing or monkeypatching.

[^markitdown-core-source]: `packages/markitdown/src/markitdown/_markitdown.py` — defines `MarkItDown` class. Lazy plugin loading from setuptools entry-point group `markitdown.plugin`. Converter registration uses priority (lower = higher precedence). Default `requests.Session` with `Accept: text/markdown, text/html;q=0.9, ...` header. `exiftool` path resolved from kwargs → `EXIFTOOL_PATH` env → `shutil.which('exiftool')` constrained to known install dirs.

[^doc-intel-source]: `packages/markitdown/src/markitdown/converters/_doc_intel_converter.py` — uses `azure.ai.documentintelligence.DocumentIntelligenceClient`. Supports DOCX/PPTX/XLSX/HTML/PDF/JPEG/PNG/BMP/TIFF. Requires Azure endpoint and credentials; sends document bytes to Azure for analysis. Cloud-only, billable.

[^dockerfile]: Root `Dockerfile`, `FROM python:3.13-slim-bullseye`; apt-installs `ffmpeg` and `exiftool`; pip-installs `/app/packages/markitdown[all]` and `/app/packages/markitdown-sample-plugin`; entrypoint `markitdown`; runs as `nobody:nogroup`. Confirms ffmpeg and exiftool are the expected OS-level binaries.

[^packages-listing]: `gh api repos/microsoft/markitdown/contents/packages` returns four dirs: `markitdown`, `markitdown-mcp`, `markitdown-ocr`, `markitdown-sample-plugin`.

[^ocr-readme]: `packages/markitdown-ocr/README.md` — describes the LLM-Vision OCR plugin: enhanced PDF / DOCX / PPTX / XLSX converters that extract text from embedded images using whatever `llm_client` / `llm_model` is configured. PDF gets full-page OCR fallback for scanned documents (300 DPI render → LLM). Output is wrapped in `*[Image OCR] ... [End OCR]*` markers. Pulls in PyMuPDF (AGPL).

[^mcp-readme]: `packages/markitdown-mcp/README.md` — single MCP tool `convert_to_markdown(uri)` accepting `http:`, `https:`, `file:`, `data:` URIs. Transports: STDIO, Streamable HTTP, SSE. Binds to localhost by default. Includes a ready-to-paste Claude Desktop `claude_desktop_config.json` snippet for Docker usage. Multiple warnings against binding to non-localhost interfaces.

[^issue-1234]: Issue #1234 "[Feature Request] Magika Dependency Optional", open, 14 reactions, 12 comments — community wants to avoid the magika ML model dep for slim installs. Listed via `gh api "repos/microsoft/markitdown/issues?state=open&sort=reactions"`.

[^issue-17]: Issue #17 "math formula ocr", open, 14 reactions, labeled `enhancement / open for contribution` — confirms no PDF math OCR is planned in core.

[^top-issues]: Top open issues by reaction count from `gh api "repos/microsoft/markitdown/issues?state=open&per_page=20&sort=reactions"`: #47 OneNote (40), #293 PDF tables (35), #296 PDF not supported (28), #23 .doc support (23), #1179 brew install (21), #56 PPTX images (17), #1234 magika optional (14), #256 LLM image descriptions (14), #25 binary CLI (14), #17 math OCR (14).

[^issue-counts]: Via GitHub Search API: `is:issue is:open` 370; `is:issue is:closed` 95; `is:pr is:open` 288; `is:pr is:merged` 175. Total issues 465 / total PRs 609.

[^contributors]: `gh api "repos/microsoft/markitdown/contributors?per_page=100" | jq length` returns 78 (top-page truncation; actual long-tail likely higher).

[^releases]: `gh api repos/microsoft/markitdown/releases` — most recent ten: v0.1.5 (2026-02-20), v0.1.5b1 (2026-01-08), v0.1.4 (2025-12-01), v0.1.3 (2025-08-26), v0.1.2 (2025-05-28), v0.1.2a1 (2025-05-21), v0.1.1 (2025-03-25), v0.1.0 (2025-03-22), v0.1.0a6 (2025-03-21), v0.1.0a5 (2025-03-20). Confirms slow / lumpy cadence (~6 final releases in 14 months).

[^recent-commits]: `gh api repos/microsoft/markitdown/commits?per_page=10` (May 2026): most recent commits include `feat: Add Azure Content Understanding converter (#1865)` 2026-05-22; `Clarify security posture in READMEs (#1807)` 2026-04-20; `fix: handle deeply nested HTML that triggers RecursionError (#1644)` 2026-04-15; `Fix O(n) memory growth in PDF conversion by calling page.close()… (#1612)` 2026-03-16; `[MS] Add OCR layer service for embedded images and PDF scans (#1541)` 2026-03-10. Maintainer activity concentrated in `afourney` (Adam Fourney) and `lesyk`.

[^lic-pdfminer]: pdfminer.six repo (`pdfminer/pdfminer.six`) declares `MIT` license via GitHub API.

[^lic-pdfplumber]: pdfplumber repo (`jsvine/pdfplumber`) declares `MIT` license via GitHub API.

[^lic-mammoth]: python-mammoth repo (`mwilliamson/python-mammoth`) declares `BSD-2-Clause` license via GitHub API.

[^lic-pptx]: python-pptx repo (`scanny/python-pptx`) declares `MIT` license via GitHub API.

[^lic-sr]: SpeechRecognition repo (`Uberi/speech_recognition`) declares `BSD-3-Clause` license via GitHub API. Description: "Speech recognition module for Python, supporting several engines and APIs, online and offline." — note "online" includes the default Google Web Speech endpoint.

[^lic-pydub]: pydub repo (`jiaaro/pydub`) declares `MIT` license via GitHub API.

[^lic-yta]: youtube-transcript-api repo (`jdepoix/youtube-transcript-api`) declares `MIT` license via GitHub API.

[^lic-magika]: magika repo (`google/magika`) declares `Apache-2.0` license; 17,039 stars; description "Fast and accurate AI powered file content types detection".

[^lic-markdownify]: markdownify repo (`matthewwithanm/python-markdownify`) declares `MIT` license via GitHub API.

[^lic-pymupdf]: PyMuPDF repo (`pymupdf/PyMuPDF`) declares `AGPL-3.0` license via GitHub API. Description: "PyMuPDF is a high performance Python library for data extraction, analysis, conversion & manipulation of PDF (and other) documents." Note: PyMuPDF is dual-licensed (AGPL-3.0 OR commercial via Artifex).

[^lic-pymupdf4llm]: PyMuPDF4LLM repo (`pymupdf/RAG`) declares `AGPL-3.0` license. Cross-referenced via WebSearch: "PyMuPDF4LLM is licensed under GNU AGPL v3. A commercial license is also available." — Dr. Leon Eversberg, Medium.

[^lic-pandoc]: pandoc repo (`jgm/pandoc`) declares `GPL-2.0` license; 44,304 stars.

[^lic-docling]: docling repo (`docling-project/docling`) declares `MIT` license; 60,242 stars as of May 2026; last push 2026-05-22; description "Get your documents ready for gen AI".

[^lic-unstructured]: unstructured repo (`Unstructured-IO/unstructured`) declares `Apache-2.0` license; 14,764 stars.

[^marker-license]: Marker (`datalab-to/marker`) — GPL-3.0 with a commercial-license alternative offered by Datalab. Cited by danilchenko comparison; not directly verified via GitHub API in this research pass.

[^danilchenko]: danilchenko.dev, "MarkItDown vs Docling vs Marker: PDF to Markdown for LLMs", <https://www.danilchenko.dev/posts/markitdown-vs-docling-vs-marker/> — provides speed/quality benchmarks: MarkItDown 0.6s on 14-page PDFs, ~80MB install; Docling 41s CPU / 9s Apple Silicon MLX, ~2.4GB install; Marker 2m14s CPU / 38s Apple Silicon, ~1.5GB + 1.1GB models. MarkItDown weaknesses quoted directly: "tables become interleaved paragraphs with no pipe characters", "two-column layouts get scrambled (left and right columns sentence by sentence)", "scanned PDFs produce almost no usable output (no OCR by default)".

[^yage-survey]: yage.ai, "MarkItDown: 80K Stars on GitHub — Is It Actually Any Good?" (Apr 2026 survey), <https://yage.ai/share/markitdown-survey-en-20260412.html> — quotes OpenDataLoader Benchmark: MarkItDown PDF overall 0.589 (12 tools, ranked 2nd from last), heading recognition 0.000, table fidelity 0.273. Docling 0.882 / 0.824 / 0.887 on the same axes. Sample failure: bank statement converted to "long, jumbled list of text" with transaction tables broken into separate columns.

[^infoworld-critique]: InfoWorld, "MarkItDown: Microsoft's open-source tool for Markdown conversion", <https://www.infoworld.com/article/3963991/markitdown-microsofts-open-source-tool-for-markdown-conversion.html> — characterises MarkItDown as "largely a wrapper around existing third-party libraries (like mammoth and pandas) rather than offering novel conversion capabilities or leveraging Microsoft's internal knowledge of its own Office formats."
