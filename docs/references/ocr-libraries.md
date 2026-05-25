# OCR Libraries — Deep Research

Survey of OCR engines and academic-document parsers for an accessibility-first, AGPL-licensed, Electron/Tauri note-taking app for college students and academics. Target accessibility: WCAG 2.1 AAA, AA minimum. Two distinct user journeys drive this research:

1. **PDF ingestion path.** Scanned academic readings (often badly scanned) lacking a text layer → must produce a searchable, screen-reader-accessible PDF/Markdown with preserved math, tables, and reading order. Already routed through a Python sidecar running **Docling** (PDFs) + **markitdown** (everything else); OCR for this path is an engine _inside_ Docling.
2. **In-note image path.** User drags a photo of a whiteboard, slide, textbook page, or scribbled formula into a note → fast, in-process text extraction with acceptable latency for a single image (sub-second ideal).

**AGPL-compatibility legend** (same as `related-libraries.md`):

- **Compatible** — permissive (MIT/BSD/ISC/Apache-2.0/MPL-2.0/LGPL), AGPL itself, or GPL-3.0 (FSF-compatible upward)
- **Incompatible** — GPL-2.0-only, SSPL, BSL/BUSL, source-available, custom commercial, model weights with use restrictions
- **Conditional** — dual-licensed, model-weight restrictions, attribution/watermark requirements

---

## The OCR problem space in 2025–2026

OCR has stratified into three distinct tiers, and choosing the wrong tier for the wrong job is the single biggest mistake:

### (a) Classical OCR engines — detection + recognition pipelines

Two-stage architectures: a text-detection network finds bounding boxes for lines/words, a recognition network reads each box. Tesseract, PaddleOCR, EasyOCR, RapidOCR, doctr, and Apple Vision all fit here. They output **a list of strings with bounding boxes**, nothing more — no reading order, no layout understanding, no math, no tables. Fast, mature, CPU-friendly. The right answer for "what does this image say?" and the wrong answer for "give me a Markdown version of this academic PDF."

### (b) Deep-learning end-to-end OCR / vision-language models (VLMs)

A single transformer ingests a page image and emits structured output (Markdown, LaTeX, HTML). olmOCR, GOT-OCR2.0, PaddleOCR-VL, MinerU2.5's VLM backend, Nougat, DeepSeek-OCR, Qwen2.5-VL all fit here. Quality on complex academic content is dramatically better than classical pipelines, but they are **multi-billion-parameter models** that want a GPU (or expensive CPU inference) and ship hundreds of megabytes to a few gigabytes of weights. Some have non-commercial weight licenses despite Apache-2.0 code.

### (c) Academic-doc-specialized "OCR + layout + math + tables" pipelines

Hybrid systems that combine layout detection, OCR, table-structure recognition, formula recognition, and reading-order detection into a single API. Docling, Marker (on top of Surya), MinerU, and Unstructured fit here. They typically chain (a) and/or (b) under the hood and add the structure-aware glue. This is what we actually need for the PDF-ingestion path.

**This space is moving fast.** OmniDocBench v1.6 (Q1 2026) re-ranked the top of the leaderboard; PaddleOCR-VL didn't exist a year ago; olmOCR went from announcement → v2 → de-facto open-weight baseline in roughly twelve months[^omnidoc-v16][^olmocr2]. Anything written in this doc more than six months ago is suspect; re-check before locking in.

---

## 1. Classical / general OCR engines

### Tesseract

- **Repo:** <https://github.com/tesseract-ocr/tesseract>
- **License:** **Apache-2.0** (verified on the repo page; depends on Leptonica which is BSD 2-clause)[^tesseract-license]. **AGPL-compatible.**
- **Status:** v5.5.2 (Dec 2025), 74.2k stars, 433 open issues, active.[^tesseract-stats]
- **What it is:** The 25-year-old elder statesman of open-source OCR; originally HP, then Google, now community-maintained. LSTM-based recognizer since v4.
- **Languages:** 100+ via downloadable `tessdata` files.[^tesseract-langs]
- **Accuracy reality check:** Strong on clean modern English print; meaningfully weaker than PaddleOCR or any VLM on multi-column layouts, low-resolution scans, or non-Latin scripts. Modal's 2026 round-up calls it "a benchmark for open-source OCR" but explicitly _not_ state-of-the-art.[^modal-roundup]
- **Math/tables: poor.** No math support whatsoever (renders equations as garbage strings); table layout is not preserved — Tesseract emits text in scan order with optional `hOCR`/`alto` XML for positions, which downstream tools must reconstruct into a table.
- **Integration patterns:**
  - **CLI** (`tesseract input.png output -l eng`) — easiest for sidecar invocation; what `OCRmyPDF` uses.
  - **Python bindings:** `pytesseract`, `tesserocr` — both wrap the same binary.
  - **Inside Docling:** `TesseractOcrOptions` (Python binding via tesserocr) and `TesseractCliOcrOptions` (subprocess) — Docling can use either.[^docling-pipeline-options]
- **CPU cost:** ~0.5–1 s per typical printed page on a modern x86 CPU; lighter than every alternative.[^codesota-tess-paddle]
- **When to use it:** As a sidecar fallback when nothing more sophisticated is available, or as the lowest-resource option for a v0 prototype. **Not** the right answer for PDF ingestion in this app.

### tesseract.js

- **Repo:** <https://github.com/naptha/tesseract.js>
- **License:** **Apache-2.0**.[^tesseractjs-license] **AGPL-compatible.**
- **Status:** v7.0.0 (Dec 2025), 38.1k stars, active.[^tesseractjs-stats]
- **What it is:** A WebAssembly port of Tesseract that runs in browsers and Node.js (including Electron renderer and main process). v6→v7 dropped runtime ~15–35% across devices; v5 cut English model size 54% and Chinese 73%.[^tesseractjs-perf]
- **Integration patterns:**
  - **In-renderer (browser/Electron):** `createWorker('eng')` → `worker.recognize(image)`. The `eng` traineddata file (~10 MB compressed) downloads on first use and is cached.
  - **Electron main process:** v6+ added explicit main-process compatibility.[^tesseractjs-electron]
  - **Web Worker isolation** keeps the WASM blob off the UI thread automatically.
- **Bundle cost:** Core WASM `tesseract.js-core` is roughly 2–3 MB compressed; English `tessdata` ~10 MB compressed (~22 MB uncompressed); each additional language adds ~5–15 MB.
- **Languages:** Same 100+ as upstream Tesseract; loaded on demand.
- **Why it matters here:** **This is the right answer for the in-note image path** if quality is acceptable. Zero sidecar round-trip; works fully offline; one `npm install`; runs anywhere Electron runs (including Linux ARM). Quality ceiling is the same as native Tesseract — i.e., fine for whiteboard/slide photos in English print, mediocre for handwriting, garbage for math.

### PaddleOCR

- **Repo:** <https://github.com/PaddlePaddle/PaddleOCR>
- **License:** **Apache-2.0**.[^paddleocr-license] **AGPL-compatible.**
- **Status:** Latest is **PP-OCRv5** (2025) with +13% accuracy over v4, plus new English/Thai/Greek models with an additional +11% in English scenarios.[^paddleocr-v5]
- **What it is:** Baidu's all-in-one OCR toolkit. Includes detection, classification, recognition, plus **PP-StructureV3** which adds layout + table recognition + formula recognition and emits Markdown/JSON. 111 languages.[^paddleocr-langs]
- **Strengths:** Best-in-class for Chinese/CJK; strong tables; the PP-StructureV3 pipeline is the closest classical-pipeline analogue to Marker/MinerU and outputs Markdown directly.
- **Math:** PP-StructureV3 includes a formula-recognition model that emits LaTeX. Not as strong as Marker or pix2tex on isolated equations, but useful as part of a full-page parse.
- **Integration patterns:**
  - **Python**: `paddleocr` package — pulls in the PaddlePaddle runtime (~400 MB) and CUDA wheels if installing for GPU.
  - **ONNX / RapidOCR**: PaddleOCR models without the PaddlePaddle runtime — see RapidOCR below.
  - **Browser/JS:** "PaddleOCR.js" SDK exists but is not as mature as `tesseract.js`.
- **CPU cost:** Slightly heavier than Tesseract (~1–2 s/page); accuracy substantially higher in practice — the most accurate free option in 2026 according to CodeSOTA's benchmarks.[^codesota-tess-paddle]
- **PaddleOCR-VL (Oct 2025).** Baidu released a 0.9B-parameter VLM extension under **Apache-2.0** for _both_ code and weights, with 109 languages, charts, formulas, tables, and SOTA on OmniDocBench v1.5.[^paddleocr-vl-card][^paddleocr-vl-arxiv] **AGPL-compatible.** This is the only top-tier academic-doc VLM with fully permissive weights — important when most peers (Surya, Nougat) come with restrictions.

### EasyOCR

- **Repo:** <https://github.com/JaidedAI/EasyOCR>
- **License:** **Apache-2.0**.[^easyocr-license] **AGPL-compatible.**
- **Status:** v1.7.2 (Sep 2024) — last release is over a year old at time of writing; 29.5k stars; 475 open issues.[^easyocr-stats] Maintenance signal is weakening compared to peers.
- **What it is:** PyTorch-based two-stage OCR (CRAFT for detection, CRNN for recognition). 80+ languages. Was the easiest-to-install option for years.
- **Why it matters here: Docling's default.** When Docling can't probe the environment for a better choice, it falls back to EasyOCR.[^docling-default-easyocr] This is a defensible default (it just works), but **not** the best choice on a CPU-only machine.
- **CPU cost:** Docling's own benchmark — **13 s/page on x86 CPU**, 1.6 s on an L4 GPU, 5 s on M3 Max.[^docling-easyocr-perf] On the PDF-ingestion path, 13 s/page × 200 pages = **43 minutes per PDF** on CPU. This is the single biggest performance lever in the whole pipeline.
- **Math/tables:** Poor.

### RapidOCR

- **Repo:** <https://github.com/RapidAI/RapidOCR>
- **License:** **Apache-2.0** (code); model weights are PaddleOCR models, copyright Baidu.[^rapidocr-license] **AGPL-compatible.**
- **Status:** 6.6k stars, 49 releases, healthy activity.[^rapidocr-stats]
- **What it is:** PaddleOCR's detection/recognition models **converted to ONNX** and packaged with multiple runtime backends (ONNXRuntime, OpenVINO, MNN, PaddlePaddle, TensorRT, PyTorch). Default ~80 MB install size, ~0.2 s inference per image.[^intuitionlabs-rapidocr]
- **Why it matters: this is what you want over EasyOCR on CPU.** Same model lineage as PaddleOCR (so similar accuracy), but without dragging the ~400 MB PaddlePaddle runtime in, and dramatically faster than EasyOCR on CPU. ONNXRuntime works on Windows/macOS/Linux including ARM.
- **Integration patterns:** Python (`rapidocr-onnxruntime`), C++, C#, Java; bindings are simpler than upstream PaddleOCR.
- **Inside Docling:** `RapidOcrOptions` — Docling supports it natively, with both ONNXRuntime (CPU) and Torch (GPU) backends.[^docling-rapidocr]
- **Languages:** Chinese + English by default; additional languages via downloaded model files. **Notably weaker multilingual story than EasyOCR or Tesseract.**
- **Math/tables:** Poor (same as base PaddleOCR detection/recognition).
- **The verdict:** For English-first, CPU-bound PDF ingestion, RapidOCR is the right Docling backend override.

### ocrmac

- **Repo:** <https://github.com/straussmaximilian/ocrmac>
- **License:** **MIT** (the Python wrapper).[^ocrmac-license] **AGPL-compatible.**
- **What it wraps:** Apple's **Vision framework** (`VNRecognizeTextRequest`) via `pyobjc-framework-Vision`. The Vision framework itself is part of macOS; no separate license to track for Apple's code as long as the app runs on macOS.
- **Why it matters:** Apple's Vision OCR is genuinely excellent on macOS for printed Latin-script text — speed of native code, no model download, no Python ML stack. With macOS Sonoma+ it can use the `LiveText` recognition level which is stronger still.
- **Caveats:**
  - **macOS-only.** Hard portability hit. Tauri/Electron Linux + Windows users get nothing from this.
  - LiveText doesn't expose `recognition_level` or `confidence_threshold`.[^ocrmac-livetext]
  - 515 stars, moderate community activity (63 commits on master).[^ocrmac-stats]
- **Inside Docling:** `OcrMacOptions`. Docling will auto-pick it on macOS if `AUTO` is set.[^docling-pipeline-options]
- **Strategy:** Worth enabling as the Docling default _on macOS_ (the AUTO option already does this); fall back to RapidOCR on Linux/Windows.

### docTR (Mindee)

- **Repo:** <https://github.com/mindee/doctr>
- **License:** **Apache-2.0**.[^doctr-license] **AGPL-compatible.**
- **Status:** 6.1k stars, 1016 commits, active.[^doctr-stats]
- **What it is:** End-to-end deep-learning OCR from Mindee. Two-stage (detection → recognition); supports PyTorch and TensorFlow backends. Reasonable accuracy on printed text, mature API, document-oriented.
- **Math/tables:** No native math; no table reconstruction.
- **CPU cost:** Heavier than RapidOCR; lighter than EasyOCR.
- **When to use it:** Mostly relevant if you're already in a PyTorch shop and want a single dependency tree. For this project, **RapidOCR is the better classical pick.**

---

## 2. Academic-document specialized pipelines

These are what we actually need for the PDF-ingestion path. They care about _the document_, not just the characters.

### Docling

- **Docs:** <https://docling-project.github.io/docling/>
- **License:** **MIT** (per `markitdown.md` reference)[^docling-license]. **AGPL-compatible.**
- **What it is:** IBM's pluggable PDF → structured-document pipeline. Layout detection, table-structure recognition, reading order, figure extraction, plus a swappable OCR layer.
- **OCR engines Docling supports** (from `docling.datamodel.pipeline_options.OcrEngine`):[^docling-pipeline-options]
  - `AUTO` — runtime probe picks the best available (EasyOCR if GPU present, OcrMac on macOS, Tesseract otherwise).
  - `EASYOCR` (default fallback) — `EasyOcrOptions`.
  - `TESSERACT` (Python binding) — `TesseractOcrOptions`.
  - `TESSERACT_CLI` — `TesseractCliOcrOptions`.
  - `RAPIDOCR` — `RapidOcrOptions` with ONNXRuntime or Torch backend.
  - `OCRMAC` — `OcrMacOptions` (macOS only).
- **Configuration example** (the literal code we'll need):

  ```python
  from docling.datamodel.pipeline_options import (
      PdfPipelineOptions, RapidOcrOptions, TableStructureOptions,
  )
  from docling.document_converter import DocumentConverter, PdfFormatOption

  opts = PdfPipelineOptions()
  opts.do_ocr = True
  opts.do_table_structure = True
  opts.table_structure_options = TableStructureOptions(do_cell_matching=True)
  opts.ocr_options = RapidOcrOptions(
      force_full_page_ocr=False,        # only OCR pages without text layer
      lang=["en"],                       # English-first
  )
  converter = DocumentConverter(format_options={...})
  ```

- **Heuristic:** Docling uses a bitmap-coverage threshold of 0.75 to decide whether selective or full-page OCR is needed; this means born-digital PDFs short-circuit OCR entirely.[^docling-deepwiki]
- **Math/tables:** Built-in table-structure model; math is handed off to layout/OCR (poor unless you swap in a math-aware OCR).
- **Performance:** Docling's own paper reports ~0.49 s/page on Nvidia L4 GPU end-to-end, ~3 s/page on x86 CPU for non-OCR pages; OCR adds whatever the chosen engine takes per page.[^docling-paper]
- **The "Docling vs Marker vs MinerU" question:** Docling is the most permissively licensed (MIT), most stable, easiest to embed; Marker and MinerU score higher on raw accuracy benchmarks but bring licensing costs (see below). For our app, **Docling is the right _framework_ and we override its default OCR.**

### Marker (Datalab)

- **Repo:** <https://github.com/datalab-to/marker>
- **License (code):** **GPL-3.0-or-later** (verified directly: `Copyright (C) 2024 Endless Labs, Inc.`).[^marker-license]
- **License (model weights, via Surya):** "modified AI Pubs Open RAIL-M" — see Surya below for the full text. **Not free for commercial use above the $2M revenue/funding threshold.**[^surya-model-license]
- **AGPL-compatibility verdict:** **Conditional.**
  - GPL-3.0 code is AGPL-3.0-compatible (FSF's compatibility table); we can ship Marker linked into our AGPL app.
  - The model-weight license adds **field-of-use and revenue restrictions** that GPL doesn't normally impose. As long as the app stays under the $2M threshold this is fine, but be aware that "AGPL-compatible code" is not the whole story — the weights ride a separate license that contradicts the spirit of free software.
- **Status:** 35.4k stars, v1.10.2 (Jan 2026), 71 releases. Very active.[^marker-stats]
- **What it is:** PDF → Markdown / JSON / HTML pipeline that uses **Surya** for OCR + layout + reading order + table recognition. Built specifically for academic content: equations become fenced `$$ ... $$` LaTeX; tables become Markdown tables (~0.816 average on FinTabNet); images are auto-extracted; reading order is preserved across multi-column layouts.[^marker-features]
- **Math:** Best-in-class open-source — explicitly preserves inline and display LaTeX. The killer feature.
- **Performance:** 0.18 s/page single-threaded **on GPU** (H100 projection: ~122 pages/s with batching).[^marker-perf] **On CPU: ~16 s/page** per the Docling paper — five times slower than MinerU's CPU mode.[^docling-paper] This is a real problem for CPU-only users; Marker is fundamentally a GPU tool.
- **Memory:** ~3.17 GB VRAM per worker on GPU.[^marker-perf]
- **When to use it:** Math-heavy academic PDFs, _if_ the user has a GPU **or** is willing to wait. v1.1 escalation tier for our app, not v1 default.

### Surya (Datalab)

- **Repo:** <https://github.com/datalab-to/surya>
- **License (code):** **GPL-3.0**.[^surya-license]
- **License (model weights):** **"AI PUBS OPEN RAIL-M LICENSE (MODIFIED)"** — the modifications are restrictive:[^surya-model-license]
  - Free for "research, personal use, and startups under $2M funding/revenue."
  - **Revenue cap:** Organizations over $2M annual gross revenue cannot use the model commercially.
  - **Funding cap:** Entities that have raised over $2M in equity/debt funding face the same restriction.
  - **Competition restriction:** Use is prohibited if your organization "provides or otherwise makes available any product or service that competes with any product or service offered by or made available by Licensor or any of its affiliates" — and Datalab's affiliates include Marker, so any document-parsing tool is at least adjacent here.
- **AGPL-compatibility verdict:** **Conditional / trap.**
  - GPL-3.0 code is fine for AGPL.
  - **The model-weight license is _not_ an OSI-approved open-source license.** OpenRAIL-M is field-of-use-restricted (the FSF and OSI both reject use-based restrictions as non-free). It's compatible enough for _us_ (a small AGPL app), but it's the kind of thing that bites when the project grows or relicenses. Document it carefully.
- **Status:** v0.17.1 (Jan 2026), 19.8k stars, 1.4k forks, 81 releases, active.[^surya-stats]
- **What it is:** OCR + layout analysis + reading-order + table-recognition + LaTeX equation OCR in 90+ languages. The engine that powers Marker.
- **Languages:** 90+ for OCR.
- **Direct integration:** `surya-ocr` PyPI package; usable independently of Marker. If you want layout + table recognition without Marker's GPL-3.0 wrapper, install Surya directly — same model-weight caveats apply.
- **Practical implication:** Any time a downstream tool says "uses Surya" — Marker, science-ocr, surya-tabular-ocr — the same model-weight terms apply. **Treat Surya as a single license-tracking concern across multiple wrappers.**

### olmOCR (Allen AI)

- **Repo:** <https://github.com/allenai/olmocr>
- **License (code):** **Apache-2.0**.[^olmocr-license] **AGPL-compatible.**
- **License (model weights):** Apache-2.0 (`allenai/olmOCR-2-7B-1025-FP8` and variants on Hugging Face).[^olmocr-weights] **Fully permissive — the cleanest license story of any top-tier academic OCR.**
- **Status:** 17.3k stars, v0.4.27 (Mar 2026), active.[^olmocr-stats]
- **What it is:** A 7-billion-parameter Qwen2.5-VL fine-tune that ingests page images and emits Markdown/HTML/LaTeX with reading order and structure preserved. Trained on `olmOCR-mix-1025` (270k pages: academic papers, scans, legal, brochures, etc.).[^olmocr-blog]
- **Benchmarks:** **82.4 on olmOCR-Bench** — beats Marker (76.1) and MinerU (75.8). Notable jumps on math (82.3%), tables (84.9%), and multi-column layouts (83.7%).[^olmocr-bench]
- **Performance and the GPU floor:** This is the catch. olmOCR is **GPU-only in practice** — Allen AI's docs require "Recent NVIDIA GPU (RTX 4090, L40S, A100, H100) with at least 12 GB of GPU RAM" and 30 GB disk space.[^olmocr-hardware] FP8-quantized variants exist but still need a real GPU. CPU inference is not supported. Cost on H100: ~$200 per million pages.
- **When to use it:** **Power-user / "max quality" tier** — gated behind GPU detection. Probably not v1; possibly v1.5 as an "advanced quality mode" toggle. Until consumer-GPU FP8 quantizations get smaller, this stays opt-in.

### MinerU (OpenDataLab)

- **Repo:** <https://github.com/opendatalab/MinerU>
- **License:** **Custom "MinerU Open Source License" based on Apache-2.0** (changed from AGPL-3.0 in v3.1.0, 2026).[^mineru-license-change] **Conditional.**
  - Apache-2.0 base permissions.
  - **Commercial threshold:** Separate commercial license required if you exceed 100M monthly active users OR $20M monthly revenue.
  - **Attribution obligation:** Online services built on MinerU must "clearly and prominently indicate that MinerU is used."
  - Auto-termination if thresholds or attribution are violated.
- **AGPL-compatibility verdict:** **Conditional.** Apache-2.0 + commercial-threshold and attribution clauses make this _almost_ permissive but not OSI-approved. For our app (well under any conceivable threshold) it's fine; we'd need to surface "Uses MinerU" credit somewhere in the UI/About box. The previous AGPL-3.0 version is still strictly AGPL-compatible if we want to pin an older release.
- **Status:** 64.6k stars, v3.1.15 (May 2026), 168 releases, **most-starred PDF-parser on GitHub.**[^mineru-stats]
- **What it is:** A hybrid pipeline backed by an in-house **MinerU2.5-Pro-2604** 1.2B vision-language model. Auto-detects headings, formula → LaTeX, tables → HTML, multi-column layouts, cross-page table merging.[^mineru-features]
- **Benchmarks:** **MinerU2.5-Pro leads OmniDocBench v1.6 at 95.75 overall** — the #1 model as of Q1 2026.[^omnidoc-v16] On olmOCR-Bench it scores 75.8 (slightly below Marker/olmOCR).
- **Performance:** **3.3 s/page on x86 CPU** — five times faster than Marker on CPU per the Docling paper.[^docling-paper] 0.21 s/page on Nvidia L4 GPU.
- **Languages:** 109 supported for OCR.
- **When to use it:** **Strongest candidate for the v1 PDF ingestion path _if_ we want to bypass Docling's OCR layer entirely for difficult/scanned academic PDFs.** Better CPU performance than Marker, math support comparable, attribution requirement is the only license cost. Strong alternative to Docling + RapidOCR for academic content specifically.

### Nougat (Meta)

- **Repo:** <https://github.com/facebookresearch/nougat>
- **License (code):** **MIT**.[^nougat-license] **AGPL-compatible.**
- **License (model weights):** **CC-BY-NC** — non-commercial only.[^nougat-license] **Incompatible** for our commercial use even though the app is free (CC-BY-NC restricts even free-as-in-beer commercial offerings).
- **Status:** Last release Aug 2023; 10k stars but only 78 commits; **effectively in maintenance / superseded** by olmOCR, Marker, and MinerU.[^nougat-stats]
- **What it is:** Meta's academic-PDF transformer, the first widely-used "VLM for papers" — directly outputs Mathpix Markdown with LaTeX. Historically important; quality is no longer competitive.
- **Verdict:** **Skip.** The non-commercial weights license rules it out for the app.

### GOT-OCR2.0

- **Repo:** <https://github.com/Ucas-HaoranWei/GOT-OCR2.0>
- **License (code):** Apache-2.0 per badge.[^got-stats]
- **License (data + checkpoints):** **CC-BY-NC 4.0** per the data badge; README explicitly says "intended and licensed for **research use only**" and restricted to follow the Vary license.[^got-license-trap]
- **AGPL-compatibility verdict:** **Incompatible** for our use — the research-only restriction on weights kills it as a shippable component.
- **Status:** 8.1k stars, very popular on Hugging Face (1M+ downloads).
- **What it is:** A unified end-to-end OCR transformer ("OCR-2.0") that handles plain text, formatted text, fine-grained region OCR, and multi-crop processing — quite good on scientific content.
- **Verdict:** Interesting research tool, not shippable here. **Skip.**

### PaddleOCR-VL

- **Repo / Card:** <https://huggingface.co/PaddlePaddle/PaddleOCR-VL>
- **License (code + weights):** **Apache-2.0** for both.[^paddleocr-vl-card] **AGPL-compatible — the only top-tier academic VLM with this clean a license story.**
- **Status:** Released Oct 2025; v1.5 referenced for 2026.[^paddleocr-vl-arxiv]
- **What it is:** A 0.9B-parameter VLM (NaViT-style dynamic-resolution vision encoder + ERNIE-4.5-0.3B language model). 109 languages, handles handwriting, historical documents, chart-to-structured-data, formulas (printed and handwritten), tables.
- **Benchmarks:** **SOTA on OmniDocBench v1.5 (academic literature error rate 0.021); v1.5 scores 94.93 on v1.6.**[^omnidoc-v16] Within striking distance of MinerU2.5-Pro at a fraction of the parameter count.
- **Why it matters:** Sub-billion-parameter VLM means it actually fits on consumer hardware. Apache-2.0 weights mean we can ship it without revenue/attribution traps. If trends hold, this becomes the recommended VLM for v1.5 over olmOCR.
- **Integration:** `from paddleocr import PaddleOCRVL` — straightforward Python API; pulls the same PaddlePaddle runtime as base PaddleOCR.

### DeepSeek-OCR

- Apache-2.0 code per the Modal round-up; transformer-based with "token compression" for efficiency.[^modal-roundup]
- GPU-required in practice; not a fit for our CPU/offline-first floor.
- **Worth tracking** but not a v1 candidate.

### Other 2026 entrants worth knowing

- **GLM-OCR (0.9B)** — second on OmniDocBench v1.6 at 95.22.[^omnidoc-v16] Verify license before considering.
- **Dolphin (ByteDance)** — vision-model layout-fidelity tool, mentioned in 2026 round-ups.[^jimmysong-roundup]
- **InternVL 2.5, Qwen2.5-VL** — general-purpose VLMs that happen to do OCR. License varies by checkpoint.[^modal-roundup]

---

## 3. Math-specific OCR

### pix2tex / LaTeX-OCR

- **Repo:** <https://github.com/lukas-blecher/LaTeX-OCR>
- **License:** **MIT**.[^pix2tex-license] **AGPL-compatible.**
- **Status:** 16.4k stars; activity has slowed; "handwritten formulae" listed as in-progress in TODOs.[^pix2tex-stats]
- **Accuracy:** BLEU 0.88, normalized edit distance 0.10, token accuracy 0.60 on test data.[^pix2tex-accuracy] Decent on **printed** equations, weak on handwriting, brittle on screenshots that aren't tightly cropped to the equation.
- **Integration:** Python CLI/library; ships a ViT-based model (~500 MB). Has a GUI.
- **When to use it:** As a focused "select equation → LaTeX" affordance in the editor — _not_ as a primary OCR. Pair with a UI gesture: user lasso-selects a region containing math, we route just that region to pix2tex.

### Mathpix Snip

- **Pricing:** Free tier; Pro from $4.99/mo; Convert API from $0.002/image; enterprise on-prem available.[^mathpix-pricing]
- **License:** Proprietary, **cloud by default**.
- **Quality:** Gold standard for math OCR — handwriting included. Used as the reference benchmark by Nougat, pix2tex, and most academic papers in this area.
- **Why list it:** Mention as the "if money were no object" baseline and the opt-in cloud option for users who want maximum quality on math. **Privacy:** documents are uploaded to Mathpix servers; must be gated behind explicit consent for FERPA reasons. Do not enable by default.

### TrOCR (Microsoft)

- **Repo:** <https://github.com/microsoft/unilm/tree/master/trocr>
- **License:** **MIT** (the parent `unilm` repo).[^trocr-license] **AGPL-compatible.**
- **What it is:** Transformer OCR with separate **handwritten** (IAM-trained) and **printed** (SROIE-trained) checkpoints in Small/Base/Large sizes (62M / 334M / 558M parameters).[^trocr-models]
- **Accuracy:** Strong on the datasets it was trained for (CER 2.89–4.22% on IAM handwriting; F1 95.86–96.60% on SROIE printed receipts). Generalizes poorly to academic content out-of-the-box but is fine-tunable.
- **Math:** No native support; would need fine-tuning on a math corpus.
- **When to use it:** **Handwriting-focused fallback** if Apple Vision isn't available (i.e., not on macOS). Heavier than pix2tex; not specifically tuned for math.

### What's new in 2025–2026

- **PaddleOCR-VL** handles printed _and_ handwritten formulas as a side benefit of its general training (see §2).
- **olmOCR**'s `olmOCR-mix` training set includes math scans; math sub-score 82.3% on olmOCR-Bench.[^olmocr-bench]
- **MinerU2.5-Pro** scores 97.45 CDM on formula recognition.[^omnidoc-v16] If we go MinerU for ingestion, we get top-tier math support for free.

---

## 4. Handwriting OCR

**Honest state of the art:** Handwriting is still the hard problem. STEM handwriting (mixed text + equations + diagrams) is the hardest sub-problem.

- **Tesseract / RapidOCR / EasyOCR — all bad** on cursive or casual handwriting. They can sometimes read very tidy block printing.
- **Apple Vision (`ocrmac`) — solid on English print, OK on tidy handwriting** when LiveText is enabled (Sonoma+). Best built-in option for macOS users.
- **TrOCR handwritten checkpoint** — best open-weights baseline for English handwriting on a single text line. Not built for full-page documents.
- **Surya/Marker** — tuned for **printed** academic content; degrades sharply on handwriting.
- **olmOCR / MinerU2.5 / PaddleOCR-VL** — VLMs are better than classical pipelines on handwriting because they can use language-model priors, but **still not at the level you'd want for a student's lecture notes**. Best of the bunch is PaddleOCR-VL per its training mix.
- **Mathpix** — the practical gold standard for handwritten math; cloud-only.
- **Apple Notes / iOS handwriting recognition** — not exposed as a usable API outside Apple's own apps; can't be embedded.

**Honest recommendation:** Do not promise robust handwriting OCR in v1. Ship a path that uses Apple Vision on macOS, falls back to PaddleOCR-VL on other platforms, and surfaces a "Try Mathpix (cloud)" opt-in for users who specifically need handwritten-math conversion.

---

## 5. PDF text-layer addition: ocrmypdf

The OCR step extracts text; **adding it back into the PDF as a searchable, screen-reader-accessible text layer** is a separate problem. This is what makes scanned PDFs accessible.

### ocrmypdf

- **Repo:** <https://github.com/ocrmypdf/OCRmyPDF>
- **License:** **MPL-2.0** (verified on repo README).[^ocrmypdf-license] **AGPL-compatible** (MPL is one-way-compatible into AGPL/GPL).
- **Status:** 33.7k stars, v17.4.1 (Apr 2026), very active; "battle-tested on millions of PDFs."[^ocrmypdf-stats]
- **What it does:** Wraps Tesseract + Ghostscript + (qpdf or pikepdf) to produce a searchable PDF — keeps the original page images at original resolution, adds an invisible text layer in the right positions for copy/paste and screen-reader access. Handles deskewing, despeckling, optimization. 100+ languages (via Tesseract).
- **Dependency licenses:**
  - **Tesseract** — Apache-2.0 (verified above). Compatible.
  - **Ghostscript** — **AGPL-3.0** (or commercial via Artifex). Compatible with our AGPL app, but Ghostscript is the licensing tripwire: anyone vendoring ocrmypdf into a non-AGPL/non-Artifex-licensed product inherits Ghostscript's AGPL obligations.
  - **qpdf / pikepdf** — Apache-2.0 / MPL-2.0. Compatible.
- **Why it matters:** **This is the canonical answer to "make this scanned PDF screen-reader-accessible."** It's not just OCR — it's the workflow that turns OCR output into a _real_ searchable PDF. Should be in our pipeline.
- **Alternative:** Docling can also emit Markdown that we render however we want, but if the user wants the original scanned PDF _with_ a text layer (the "share back to my prof, who only opens PDFs in Preview" case), ocrmypdf is the right tool.

---

## 6. Sidecar / integration architecture options

### A. In-renderer Tesseract.js (WASM)

- **Where it shines:** "Drag an image into a note" — single-image, sub-200KB photos, English print or a known small language set.
- **Perf:** ~1–3 s for a typical phone photo of a whiteboard on a modern CPU. No process spawn; no IPC; the WASM warm-up cost (~200 ms) is amortized after the first call.
- **Bundle cost:** WASM core ~2–3 MB; per-language traineddata ~10 MB; we ship English by default and download others on demand.
- **Quality ceiling:** Same as native Tesseract — fine for clean English print, weak on math/handwriting/tables.
- **AGPL-friendliness:** Apache-2.0; trivial.
- **Verdict for this use case:** **WIN.** The user-experience benefit (zero latency, fully offline, no sidecar at all) outweighs the quality ceiling for the casual image-to-text case.

### B. Shared Python sidecar (Docling + markitdown + add OCR endpoint)

- **Where it shines:** PDF ingestion — already needed for Docling; adding an `/ocr` FastAPI route is essentially free.
- **Perf:** Process is long-lived → model weights stay warm; per-call latency is dominated by inference. Sidecar IPC overhead is ~5–20 ms over localhost HTTP.
- **AGPL-friendliness:** Depends on what's loaded — Docling MIT, RapidOCR Apache-2.0, ocrmypdf MPL-2.0, Marker GPL-3.0 + Surya weights restricted. **As long as we don't load Surya/Marker without thinking, we're fine.**
- **Verdict:** **The right home for PDF ingestion and "high-quality" image OCR.** Reuse this for the image path _when_ the user explicitly asks for high quality.

### C. Native binary spawn (Tesseract / paddleocr CLI from main process)

- **Where it shines:** Truly minimal dependency surface — no Python runtime if we're willing to ship the Tesseract binary.
- **Perf:** Process-spawn cost is significant (~100–300 ms cold start per invocation). Only worth it for batch jobs.
- **Cross-platform pain:** Have to ship signed binaries per OS; macOS notarization is mandatory; Windows users need MSVCRT.
- **AGPL-friendliness:** Tesseract Apache-2.0 = fine. PaddleOCR CLI ships with PaddlePaddle = ~400 MB of runtime; not a great fit for an installer.
- **Verdict:** **Skip.** The Python sidecar already wins.

### D. HTTP microservice (PaddleOCR-Serving, etc.)

- **Where it shines:** Multi-user shared deployments, not relevant here (single-user desktop app).
- **Verdict:** **Skip for v1.** Possibly relevant if we ever ship a self-hosted multi-user variant.

### Architecture decision matrix

| Use case                       | Recommended        | Why                                                      |
| ------------------------------ | ------------------ | -------------------------------------------------------- |
| Drag image into note (default) | (A) Tesseract.js   | Zero latency, fully offline, no sidecar round-trip       |
| Drag image, "high quality" opt | (B) Python sidecar | RapidOCR / PaddleOCR-VL for accuracy when user opts in   |
| Full-PDF ingestion             | (B) Python sidecar | Docling pipeline already lives there                     |
| Make scanned PDF accessible    | (B) Python sidecar | ocrmypdf wraps the OCR + text-layer-injection workflow   |
| Math equation lasso            | (B) Python sidecar | pix2tex; eventually PaddleOCR-VL                         |
| Real-time camera (future)      | (A) Tesseract.js   | Lowest latency; quality is secondary for live-preview UX |

---

## 7. Recommended stack

### v1 — PDF ingestion path

- **Framework:** Docling (MIT, already chosen).
- **OCR engine override:** **RapidOCR (Apache-2.0)** as the cross-platform default in the sidecar. On macOS, **OcrMac** via Docling's `AUTO` so we use Apple's native Vision API where it's both faster and better. On Windows/Linux without a GPU, RapidOCR with ONNXRuntime gives PaddleOCR-class accuracy at ~0.2 s/image vs. EasyOCR's 13 s/page on CPU — **this single override turns a 43-minute 200-page PDF into a ~10–15 minute job.**
- **Math/tables in the default pipeline:** Docling's built-in table-structure model handles tables; math is whatever the OCR engine emits (typically poor). Acceptable for v1.
- **Make-it-accessible workflow:** After Docling extracts text + layout, pipe the page images through **ocrmypdf** to produce a searchable, screen-reader-accessible PDF that the user can save alongside or replace the original. **Yes, ship ocrmypdf** — it's a small wrapper that solves the entire "give me back a PDF a screen reader can navigate" problem with one CLI call.
- **License posture for v1 PDF path:** Docling MIT, RapidOCR Apache-2.0, ocrmypdf MPL-2.0 (and its Ghostscript dep is AGPL → fine for us). No GPL/RAIL-M traps. Fully AGPL-compatible.

### v1 — Single-image-in-note path

- **Default:** **Tesseract.js in the renderer.** Apache-2.0. Zero sidecar dependency. ~1–3 s on a phone photo. Quality ceiling acceptable for the dominant use case (whiteboards, slides, clean print).
- **"Improve quality" opt-in:** Right-click → "Re-OCR with high quality" routes the image through the sidecar's RapidOCR endpoint (~0.5–2 s extra). UI affordance to set this as the default for users who want it (no privacy/compute cost).

### v1.1 — Math-heavy / academic-PDF escalation

- **For math-equation lasso in the editor:** **pix2tex** in the sidecar.
- **For "this entire PDF is math-heavy, please give me LaTeX":** Two routes — (a) **MinerU** in the sidecar (3.3 s/page CPU, attribution requirement, Apache-2.0-based, strong math/tables); (b) **Marker** (heavier, GPU-recommended, GPL-3.0 + Surya restricted weights — only worth shipping if the user has a GPU). Default to MinerU; expose Marker behind a "GPU mode" toggle.
- **GPU-detected power-user tier:** Expose **olmOCR** behind a feature flag. Apache-2.0 weights, 82.4 on olmOCR-Bench, but the 12 GB VRAM floor is real — refuse to enable without GPU.
- **Future-watching:** **PaddleOCR-VL** at 0.9B parameters with Apache-2.0 weights is the most interesting late-2025/early-2026 entrant. If its CPU-quantized variants land and prove out, **it becomes the recommended default for v2** — best license, smallest footprint, near-top accuracy.

### Cloud opt-in

- **Mathpix** for math (esp. handwriting) — explicit consent, per-image counter visible to user, off by default. Document FERPA implications in UI.
- **Azure Document Intelligence** as a "very high quality, costs money, sends docs to Microsoft" tier — markitdown already supports this path, we expose it as opt-in.
- **Never** enable any cloud OCR by default. The whole "FERPA / EU AI Act" posture from STT applies identically here.

### Accessibility justifications

- **Text layer in PDFs:** ocrmypdf produces PDF/A-2u output with hidden text positioned to match images — screen readers (NVDA, VoiceOver, JAWS) can read scanned PDFs as fluently as born-digital ones.
- **MathML output:** None of the open-source pipelines emit MathML directly. We get LaTeX from Marker/pix2tex/MinerU/PaddleOCR-VL and render to MathML via KaTeX (`renderToString` with `output: 'mathml'`) so screen readers with MathML support (NVDA + MathPlayer, JAWS) can read equations. Document this as a separate pipeline stage.
- **ADHD/student use cases:**
  - "Take a photo of the whiteboard → instantly have searchable notes" (Tesseract.js, zero round-trip → low cognitive load, no waiting state).
  - "Drop this scanned reading on the app → search inside it tomorrow" (Docling + ocrmypdf → the PDF is now first-class for the rest of the academic year).
  - "Lasso this equation, paste as LaTeX into my notes" (pix2tex → low-friction math entry without a keyboard fight).

---

## 8. Things to know / gotchas

### License traps (all in one place)

- **Surya MODEL_LICENSE (modified OpenRAIL-M)** — $2M revenue/funding cap, competition restriction. Affects Marker, science-ocr, surya-tabular-ocr, and any future tool that bundles Surya weights.[^surya-model-license] **The biggest trap in the academic-OCR ecosystem.**
- **Marker GPL-3.0 code** — fine for AGPL but be aware the _weights_ it loads ride Surya's license.[^marker-license]
- **Nougat CC-BY-NC weights** — non-commercial, **rules it out** for any product (even a free one).[^nougat-license]
- **GOT-OCR2.0 research-only restriction** — Apache-2.0 in name but the README explicitly limits commercial use.[^got-license-trap]
- **MinerU custom license** — Apache-2.0 + attribution and MAU/revenue thresholds; well below thresholds for us, but we owe a "Uses MinerU" credit somewhere in the UI.[^mineru-license-change]
- **PyMuPDF AGPL-3.0** — pulled transitively by `markitdown-ocr` and various OCR pipelines. **AGPL-fine for us** but forecloses any future relicensing of the app to a permissive license. Already documented in `markitdown.md`.
- **Ghostscript AGPL-3.0** — pulled by ocrmypdf. Same story: AGPL-compatible, would block a non-AGPL fork.
- **Apple Vision (via ocrmac)** — usage is governed by macOS's licence, not the wrapper. Fine for distributing an app that runs on macOS; **don't** try to call it from a non-macOS process.

### Accuracy benchmarks worth citing

- **OmniDocBench v1.6** (CVPR 2025, OpenDataLab) — the leading academic-PDF benchmark; 1,651 PDF pages, 10 document types. Q1 2026 top results: MinerU2.5-Pro 95.75, GLM-OCR 95.22, PaddleOCR-VL-1.5 94.93, olmOCR 85.74, Marker 78.44, Docling ~78.[^omnidoc-v16]
- **olmOCR-Bench** (Allen AI, 2025) — challenging real-world PDFs: olmOCR-2 82.4, Marker 76.1, MinerU 75.8.[^olmocr-bench]
- **FinTabNet** (table reconstruction) — Marker reports 0.816 average score.[^marker-features]
- **Reality check:** Public benchmarks are dominated by clean modern academic papers. The _bad_ scans we'll actually see (1995 photocopies of 1970s journal articles, off-angle phone photos, mixed-font textbook scans) are nowhere on these leaderboards. Plan to do internal eval on **50–200 documents representative of our actual users** — every benchmark resource recommends this.[^codesota-router]

### Privacy

- All locally-running engines (Tesseract.js, RapidOCR, MinerU, etc.) are silent — no telemetry, no model fetch after install.
- **Cloud OCR (Mathpix, Azure Document Intelligence) MUST be opt-in** with clear UI signposting because uploading a student's scanned reading list to a third party is exactly what FERPA and the EU AI Act limit.
- **First-run model downloads** (EasyOCR, RapidOCR, Surya, olmOCR, PaddleOCR-VL all download weights on first use) need a UI affordance — show progress, allow cancel, allow pre-bundling on offline installs. EasyOCR and PaddleOCR-VL hit Hugging Face by default; document the URLs we hit so users on locked-down networks can mirror them.
- **No commercial OCR SDK call-home concerns** for any of the recommended engines (this is a Mathpix-class problem, which we keep cloud-by-design).

### Performance baselines (rough seconds-per-page on a modern x86 CPU)

| Engine                          |  Seconds/page (CPU) | Notes                                                                   |
| ------------------------------- | ------------------: | ----------------------------------------------------------------------- |
| Tesseract (native)              |             0.5–1.0 | Cleanest, fastest, mediocre accuracy.[^codesota-tess-paddle]            |
| PaddleOCR                       |             1.0–2.0 | Best CPU-friendly accuracy.[^codesota-tess-paddle]                      |
| RapidOCR (ONNXRuntime)          |             0.2–1.0 | PaddleOCR models without the runtime overhead.[^intuitionlabs-rapidocr] |
| EasyOCR                         |                 ~13 | Docling's benchmark — the reason to override.[^docling-easyocr-perf]    |
| Docling (no OCR, born-digital)  |                  ~3 | Layout + tables only.[^docling-paper]                                   |
| Marker                          |                 ~16 | CPU-impractical; designed for GPU.[^docling-paper]                      |
| MinerU                          |                ~3.3 | Fastest of the academic-doc pipelines on CPU.[^docling-paper]           |
| olmOCR                          |             n/a CPU | GPU-only in practice (12 GB VRAM floor).[^olmocr-hardware]              |
| tesseract.js (WASM, in browser) | 1–3 (typical photo) | Highly variable with image size; warm WASM helps.[^tesseractjs-perf]    |

### Model-storage UX

- **EasyOCR**: ~64 MB English models from Hugging Face on first use.
- **RapidOCR**: ~80 MB total (det + cls + rec) bundled in the wheel; no download needed for English/Chinese.[^intuitionlabs-rapidocr]
- **Surya / Marker**: Multiple models, ~1.5–2 GB total on first use.
- **olmOCR**: 7B model, ~14 GB FP16 / ~7 GB FP8 download.
- **PaddleOCR-VL**: ~1 GB (0.9B params, BF16).
- **MinerU**: ~2 GB for the 1.2B VLM.
- **Pre-bundling vs. on-demand:** For an "offline-first" promise, the right answer is **bundle the smallest defaults** (Tesseract.js eng + RapidOCR det+rec) in the installer, **download larger models only on user opt-in**, with a visible progress UI. ~100 MB extra installer is acceptable; ~7 GB is not.

### GPU expectation reality check

- **olmOCR and Marker are dramatically better on GPU** — Marker is ~90× faster on GPU than CPU (0.18 s vs. 16 s/page); olmOCR is GPU-only.
- **MinerU and PaddleOCR-VL run on CPU** but get 15–20× speedups on GPU.
- **Apple Silicon (MPS)** is partially supported: Marker advertises MPS; Docling probes for it; many ONNX models accelerate via CoreML EP. Treat Apple Silicon as "GPU-like" for most of these.
- **Floor for "I have a CPU laptop, no GPU"**: RapidOCR + Docling + ocrmypdf + Tesseract.js. Everything else is opt-in or behind a GPU detection.

---

## Footnotes

[^tesseract-license]: Tesseract OCR GitHub README: "License: Apache-2.0." Verified at <https://github.com/tesseract-ocr/tesseract>; depends on Leptonica (BSD 2-clause).

[^tesseract-stats]: 74.2k stars, 10.6k forks, 433 open issues, v5.5.2 released Dec 26, 2025 per GitHub repo page.

[^tesseract-langs]: README claim of 100+ language packs; per <https://github.com/tesseract-ocr/tessdata>.

[^modal-roundup]: Modal "8 Top Open-Source OCR Models Compared" (2026): <https://modal.com/blog/8-top-open-source-ocr-models-compared>. Calls Tesseract "a benchmark for open-source OCR" with weaknesses on handwriting and complex layouts.

[^codesota-tess-paddle]: CodeSOTA "PaddleOCR vs Tesseract vs EasyOCR: OCR Speed and Accuracy 2026" — Tesseract 0.77 s CPU vs PaddleOCR multi-second but higher accuracy. <https://www.codesota.com/ocr/paddleocr-vs-tesseract>

[^docling-pipeline-options]: Docling docs "Pipeline options" — lists `OcrEngine.AUTO/EASYOCR/TESSERACT/TESSERACT_CLI/RAPIDOCR/OCRMAC` and corresponding option classes. <https://docling-project.github.io/docling/reference/pipeline_options/>

[^tesseractjs-license]: tesseract.js GitHub README: Apache-2.0 license badge.

[^tesseractjs-stats]: 38.1k stars, v7.0.0 released Dec 15, 2025 per <https://github.com/naptha/tesseract.js/releases>.

[^tesseractjs-perf]: Tesseract.js v6→v7 improved runtime 15–35%; v5 reduced English model 54%, Chinese 73% — per release notes. <https://github.com/naptha/tesseract.js/releases>

[^tesseractjs-electron]: Tesseract.js v6 added main-process Electron compatibility; example repo at <https://github.com/jeromewu/tesseract.js-electron>.

[^paddleocr-license]: PaddleOCR README: Apache-2.0. <https://github.com/PaddlePaddle/PaddleOCR>

[^paddleocr-v5]: PaddleOCR README — PP-OCRv5 delivers +13% accuracy over v4; English model +11% in English scenarios.

[^paddleocr-langs]: PaddleOCR README — 111 languages including CJK, Cyrillic, Arabic, Devanagari, Bengali.

[^paddleocr-vl-card]: PaddleOCR-VL Hugging Face model card: license: apache-2.0; 0.9B params (NaViT vision encoder + ERNIE-4.5-0.3B). <https://huggingface.co/PaddlePaddle/PaddleOCR-VL>

[^paddleocr-vl-arxiv]: "PaddleOCR-VL: Boosting Multilingual Document Parsing via a 0.9B Ultra-Compact Vision-Language Model," arXiv 2510.14528. <https://arxiv.org/abs/2510.14528>

[^easyocr-license]: EasyOCR README: Apache-2.0. <https://github.com/JaidedAI/EasyOCR>

[^easyocr-stats]: 29.5k stars, 475 open issues, last release v1.7.2 (Sep 24, 2024) per GitHub.

[^docling-default-easyocr]: Docling's `AUTO` engine falls back to EasyOCR when no other engine is detected; confirmed across Docling discussions #792 and the `docling-serve` issue #554 (request for explicit default-engine config). <https://github.com/docling-project/docling/discussions/792>

[^docling-easyocr-perf]: Docling Technical Report (arXiv 2501.17887): EasyOCR ~13 s/page on x86 CPU, 1.6 s on L4 GPU, 5 s on M3 Max. <https://arxiv.org/pdf/2501.17887>

[^rapidocr-license]: RapidOCR repo: code Apache-2.0; "the copyright of the OCR model is held by Baidu." <https://github.com/RapidAI/RapidOCR>

[^rapidocr-stats]: 6.6k stars, 636 forks, 49 releases per <https://github.com/RapidAI/RapidOCR>.

[^intuitionlabs-rapidocr]: IntuitionLabs "Technical Analysis of Modern Non-LLM OCR Engines" — RapidOCR ~80 MB install, ~0.2 s inference. <https://intuitionlabs.ai/articles/non-llm-ocr-technologies>

[^docling-rapidocr]: Docling DeepWiki OCR Models section: RapidOCR primary implementation, default PP-OCRv4 mobile models, ONNXRuntime or PyTorch backends. <https://deepwiki.com/docling-project/docling/4.1-ocr-models>

[^ocrmac-license]: ocrmac README: MIT. <https://github.com/straussmaximilian/ocrmac>

[^ocrmac-livetext]: ocrmac README — LiveText requires macOS Sonoma+; doesn't support `recognition_level` or `confidence_threshold`. <https://github.com/straussmaximilian/ocrmac>

[^ocrmac-stats]: 515 stars, 63 commits per <https://github.com/straussmaximilian/ocrmac>.

[^doctr-license]: docTR README: "Distributed under the Apache 2.0 License." <https://github.com/mindee/doctr>

[^doctr-stats]: 6.1k stars, 1016 commits, 21 releases per <https://github.com/mindee/doctr>.

[^docling-license]: Verified in `docs/references/markitdown.md` footnote `^lic-docling`.

[^docling-deepwiki]: Docling DeepWiki: bitmap-coverage threshold default 0.75 for selective vs. full-page OCR. <https://deepwiki.com/docling-project/docling/4.1-ocr-models>

[^docling-paper]: Docling Technical Report (arXiv 2501.17887): pipeline performance table. <https://arxiv.org/pdf/2501.17887>. CPU per-page: MinerU 3.3 s, Marker 16+ s, Docling no-OCR ~3 s. GPU (L4): MinerU 0.21 s, Docling 0.49 s, Marker 0.86 s.

[^marker-license]: Marker LICENSE file header: "Copyright (C) 2024 Endless Labs, Inc. This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version." Verified at <https://github.com/datalab-to/marker/blob/master/LICENSE>. `pyproject.toml` declares `license = "GPL-3.0-or-later"`.

[^surya-model-license]: Surya MODEL_LICENSE: "AI PUBS OPEN RAIL-M LICENSE (MODIFIED)." Verified at <https://github.com/datalab-to/surya/blob/master/MODEL_LICENSE>. Restrictions: $2M annual revenue cap, $2M raised-funding cap, competition restriction with Datalab's products.

[^marker-stats]: 35.4k stars, 71 releases, v1.10.2 (Jan 2026) per <https://github.com/datalab-to/marker/releases>.

[^marker-features]: Marker README — equations as `$$ ... $$` LaTeX; FinTabNet table average 0.816.

[^marker-perf]: Marker README — 0.18 s/page single-threaded on GPU; ~3.17 GB VRAM per worker; H100 projection 122 pages/s.

[^surya-license]: Surya code license: GPL-3.0. Confirmed at <https://github.com/datalab-to/surya>.

[^surya-stats]: 19.8k stars, 1.4k forks, 81 releases, v0.17.1 (Jan 31, 2026) per <https://github.com/datalab-to/surya/releases>.

[^olmocr-license]: olmOCR README: Apache-2.0. <https://github.com/allenai/olmocr>

[^olmocr-weights]: `allenai/olmOCR-2-7B-1025-FP8` and related variants on Hugging Face show Apache-2.0 license tags.

[^olmocr-stats]: 17.3k stars, v0.4.27 (Mar 12, 2026) per <https://github.com/allenai/olmocr/releases>.

[^olmocr-blog]: Allen AI "olmOCR 2" blog post — trained on olmOCR-mix-1025 (270k PDF pages). <https://allenai.org/blog/olmocr-2>

[^olmocr-bench]: olmOCR-2 benchmark: 82.4 overall, math 82.3%, tables 84.9%, multi-column 83.7%. Marker 76.1, MinerU 75.8. <https://allenai.org/blog/olmocr-2>

[^olmocr-hardware]: olmOCR README — requires RTX 4090 / L40S / A100 / H100 with ≥12 GB VRAM; 30 GB disk; CPU not supported.

[^mineru-license-change]: MinerU LICENSE.md: "MinerU is licensed under Apache License 2.0 and is subject to the additional terms below." Verified at <https://github.com/opendatalab/MinerU/blob/master/LICENSE.md>. License changed from AGPL-3.0 to MinerU Open Source License in v3.1.0 (2026).

[^mineru-stats]: 64.6k stars, 168 releases, v3.1.15 (May 2026) per <https://github.com/opendatalab/MinerU/releases>.

[^mineru-features]: MinerU README — auto-detects heading levels, formula→LaTeX, tables→HTML, multi-column, cross-page table merging.

[^omnidoc-v16]: OmniDocBench v1.6 (Q1 2026): MinerU2.5-Pro 95.75, GLM-OCR 95.22, PaddleOCR-VL-1.5 94.93, olmOCR 85.74, Marker 78.44. Per <https://github.com/opendatalab/OmniDocBench>.

[^nougat-license]: Nougat repo: code MIT; "Nougat model weights are licensed under CC-BY-NC." <https://github.com/facebookresearch/nougat>

[^nougat-stats]: 10k stars, 78 commits, last release Aug 22, 2023 per <https://github.com/facebookresearch/nougat>.

[^got-stats]: GOT-OCR2.0 repo: 8.1k stars, 1M+ Hugging Face downloads. <https://github.com/Ucas-HaoranWei/GOT-OCR2.0>

[^got-license-trap]: GOT-OCR2.0 README: "the data, code, and checkpoint are intended and licensed for research use only and are also restricted to use that follow the license agreement of Vary."

[^jimmysong-roundup]: Jimmy Song "Best Open Source PDF to Markdown Tools (2026): Marker vs MinerU vs MarkItDown." <https://jimmysong.io/blog/pdf-to-markdown-open-source-deep-dive/>

[^pix2tex-license]: LaTeX-OCR README: MIT. <https://github.com/lukas-blecher/LaTeX-OCR>

[^pix2tex-stats]: 16.4k stars per <https://github.com/lukas-blecher/LaTeX-OCR>.

[^pix2tex-accuracy]: LaTeX-OCR README — BLEU 0.88, normalized edit distance 0.10, token accuracy 0.60 on test set.

[^mathpix-pricing]: Mathpix pricing page <https://mathpix.com/pricing/all>: Snip free tier + Pro $4.99/mo; Convert API $0.002/image; enterprise/on-prem available.

[^trocr-license]: Microsoft `unilm` repo LICENSE: MIT. Verified at <https://github.com/microsoft/unilm/blob/master/LICENSE>.

[^trocr-models]: TrOCR README — Small (62M)/Base (334M)/Large (558M); IAM (handwritten) and SROIE (printed) variants.

[^ocrmypdf-license]: OCRmyPDF README: "The OCRmyPDF software is licensed under the Mozilla Public License 2.0 (MPL-2.0)." <https://github.com/ocrmypdf/OCRmyPDF>

[^ocrmypdf-stats]: 33.7k stars, 52 releases, v17.4.1 (Apr 2026), "battle-tested on millions of PDFs." <https://github.com/ocrmypdf/OCRmyPDF>

[^codesota-router]: CodeSOTA "OCR SOTA Router 2026": recommends private evaluation on 50–200 representative documents rather than relying on public benchmarks. <https://www.codesota.com/ocr>
