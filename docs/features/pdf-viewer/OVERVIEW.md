# PDF Viewer

**Version:** 1.0 (Tier 1) → 1.1 (Tier 3)

In-app PDF rendering with text-layer highlighting that produces Note quotes with backlinks. Built on PDF.js.

## Tier scoping (decided)

- **Tier 0 (always)** — view-only. PDF.js renders the file; scroll, zoom, text-select.
- **Tier 1 (v1)** — read-and-extract. Tier 0 + text highlights captured into a Note as a blockquote with a backlink to "page N of document.pdf."
- **Tier 2 (deferred)** — annotate-in-place. Drawing/highlighting/sticky-notes persisted _to the PDF file itself_. Most users get by with highlight-to-note; polish-heavy; not v1 or v1.1.
- **Tier 3 (v1.1)** — OCR + accessibility upgrade. Detect when a PDF lacks a text layer; offer to OCR it in place via `ocrmypdf`, making scanned readings screen-reader-accessible _outside_ our app, not just inside it.

## Why this matters

- Academic workflows revolve around reading PDFs and extracting passages into notes.
- Tier 3 is a meaningful accessibility win: scanned course readings without text layers are essentially unusable for blind students. Adding the text layer makes them usable in any PDF reader, not just ours.

## What v1 ships

- PDF.js viewer pane with text-layer enabled.
- Selection → "save as quote" → inserts a blockquote into the active Note with a backlink.
- Backlinks resolve to "open this PDF at this page" inside the app.
- Keyboard nav for page/zoom (standard PDF.js keymap).

## What v1.1 adds (Tier 3)

- Detect scanned PDFs (no/sparse text layer).
- "Make this readable" action runs `ocrmypdf` (sidecar) and writes back a PDF/A-2u with an invisible text layer.
- OCR engine choice: Tesseract is the default for ocrmypdf; we may surface RapidOCR or MinerU for math-heavy academic content.

## Relevant Documentation

- [OCR libraries](../../research/ocr-libraries.md) — `ocrmypdf` analysis, Tesseract vs. RapidOCR vs. MinerU vs. Marker, math-OCR options (pix2tex).
- [Related libraries](../../research/related-libraries.md) — PDF.js and react-pdf-highlighter candidates.
- [Adaptive tech in academia](../../research/adaptive-tech-in-academia.md) — how blind students currently consume PDFs; the SensusAccess / Ally landscape this Tier 3 feature competes with.
