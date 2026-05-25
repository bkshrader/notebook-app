# Mind Maps

**Version:** 2.0

Hierarchical visual organization of ideas. Distinct from the [whiteboard](../whiteboard/OVERVIEW.md) — mind maps are *structured* node-and-link graphs centered on a root concept; whiteboards are *unstructured* spatial canvases.

## Why this matters

- Many ADHD and Autistic users think non-linearly; mind maps externalize that structure.
- For lecture review: re-organize a flat transcript into a concept hierarchy.
- For paper-planning: outline a thesis as a mind map before linearizing into prose.
- NotebookLM's Mind Maps feature is one of the more-loved generated artifacts; we should match it without the NotebookLM accessibility gaps.

## What v2.0 ships

- Manual mind-map creation: root node + add/edit/move child nodes via keyboard or mouse.
- Saved per-project as a structured file (likely JSON, possibly Mermaid-renderable).
- Keyboard navigation (Tab/Arrow keys) for accessibility.
- Export to image (PNG/SVG) and to outline-markdown.

## What v2.0+ may add

- **AI-generated mind maps** from a note or transcript (hidden in the AI-free build; see the AI-feature-flag note in [ROADMAP.md](../../ROADMAP.md)). The user picks a source, picks "generate mind map," gets a structured node tree as a starting point.
- Linking mind-map nodes to specific notes / sources / timestamps.

## Library candidates

- **Mermaid** (MIT) — could render mind maps from a simple syntax; lightweight, AGPL-clean.
- A custom React/Svelte component over D3 or react-flow — more flexible but more engineering.
- Decision deferred to v2.0 implementation.

## Design constraints

- **Keyboard accessibility is hard for graph UIs.** Tab order and arrow-key navigation through nodes must be designed deliberately. Screen-reader announcement of node relationships ("parent: Photosynthesis; child 2 of 3: Light reactions") must be considered.
- **No locking the user into a non-text-first format.** Mind maps export cleanly to outline markdown.

## Relevant references

- [NotebookLM](../../references/notebooklm.md) — mind-map feature reference + the accessibility gaps to avoid.
- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — Heptabase / MindMeister / XMind / Scapple landscape.
- [Related libraries](../../references/related-libraries.md) — Mermaid, react-flow, D3 with license verdicts.
