# Document Ingestion

**Version:** 1.1

Drag-and-drop ingestion of common academic file formats. The user drops a PDF / DOCX / PPTX / XLSX / audio / video / image into a project; the app converts it to clean Markdown, stores the original alongside the conversion, and makes both available.

## Hybrid converter strategy

- **PDFs:** **Docling** (IBM, MIT). Markitdown's PDF quality is genuinely poor on academic documents (0.000 heading recognition vs. Docling's 0.824 on the OpenDataLoader benchmark).
- **DOCX / PPTX / XLSX / HTML / EPUB / .msg / .ipynb:** **markitdown** (Microsoft, MIT). The breadth wins here, and the DOCX→LaTeX-math preservation is a real accessibility feature.
- **Audio:** **whisper.cpp / faster-whisper** sidecar (already in use for [audio-recording-and-transcription](../audio-recording-and-transcription/OVERVIEW.md)). **Markitdown's audio converter is explicitly disabled** because it silently calls Google's Web Speech API — a FERPA-hostile privacy regression we route around.
- **Images:** **Tesseract.js** in the renderer (~10 MB English traineddata) for the drag-an-image-into-note path. Fast, in-process, no sidecar round-trip. "Re-OCR at higher quality" right-click routes to the sidecar.
- **YouTube / web URLs:** markitdown sidecar, gated behind a "this hits external services" consent toggle.

## Storage model

- Original document stored alongside the converted markdown.
- Conversion produces `.md` (or `.tex` if appropriate) in the same project.
- Both files are first-class — the user can edit the markdown freely; the original remains available for reference / re-conversion.

## LLM-enhanced OCR

When the [BYO-AI](../byo-ai/OVERVIEW.md) profile is configured, OCR output can be post-processed by the user's chosen LLM to catch math-symbol mis-recognitions, fix common OCR errors, and add structure. Hidden in the AI-free build (see the AI-feature-flag note in [ROADMAP.md](../../ROADMAP.md)).

## What ships in v1.1

- Drag-drop handler for files into projects.
- Sidecar routing logic (file type → converter).
- Conversion progress UI (these can take minutes for long PDFs).
- Original-document viewer fallback (so even un-convertible files are openable in the OS default app).
- Drag-image-into-note in-renderer OCR via Tesseract.js.

## What ships in v2.0+

- Heavier math/academic-PDF pipelines: MinerU as the heavy-default, Marker behind a GPU toggle, olmOCR for GPU users, pix2tex for lasso-an-equation. See the OCR report.
- Image-content embeddings for RAG.

## Relevant references

- [Markitdown](../../references/markitdown.md) — breadth analysis, Python-sidecar architecture, the disabled-audio-converter trap, PyMuPDF AGPL caveat.
- [OCR libraries](../../references/ocr-libraries.md) — Docling vs. Marker vs. MinerU vs. olmOCR, the Surya/Marker license trap, ocrmypdf integration, math-OCR options.
- [Whisper / STT](../../references/whisper.md) — audio-pipeline engine choice.
- [PDF viewer](../pdf-viewer/OVERVIEW.md) — adjacent feature; v1.1's Tier 3 (`ocrmypdf` re-OCR-in-place) shares infrastructure.
