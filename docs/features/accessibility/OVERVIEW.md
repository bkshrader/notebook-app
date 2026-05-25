# Accessibility

**Version:** 1.0

The app is accessibility-first. Accessibility is not a feature shipped alongside other features — it is the design constraint every other feature is built under. Primary focus is cognitive accommodation for ADHD and Autism; vision and hearing disabilities are also accommodated.

## Targets

- **WCAG 2.1 AA — non-negotiable.** Every interactive surface meets AA contrast, focus indicator visibility, keyboard reachability, label/role/value exposure, and reduced-motion compliance.
- **WCAG 2.1 AAA — aspirational.** Pursue AAA where it doesn't conflict with ADHD-friendly UX (some AAA criteria around visual density and timing are counterproductive for ADHD users; AA is the floor we never go below).
- **Keyboard navigation — first-class citizen.** Every interactive element reachable and operable without a mouse. Mouse nav fully supported alongside.
- **Screen reader support — first-class citizen.** JAWS, NVDA, VoiceOver, Orca all produce a usable experience for the full app surface. Custom widgets carry correct ARIA semantics.

## Why this matters

The primary user is the ADHD undergrad. Cognitive accommodations (reduced visual clutter, predictable layout, no surprise modals, stable focus, executive-function scaffolding) drive every UX decision. Vision/hearing accommodations are layered on top, with the universal-design insight that what works for blind/low-vision users (keyboard nav, semantic markup, transcripts) also works for ADHD users (clear structure, no hidden state).

## Engineering implications

- Framework choice is constrained by a11y: Electron is the current lean precisely because bundled Chromium exposes the strongest accessible tree of any web-based runtime.
- All custom components must pass `axe-core` in CI.
- The math renderer must produce screen-reader-announceable output (drives the MathJax v4 + SRE decision).
- The editor surface must work with a real contenteditable (drives the CodeMirror 6 decision; Monaco is disqualified for its canvas approach).
- `prefers-reduced-motion`, OS dark-mode, OS font-scaling, and high-contrast modes are honored, not overridden.
- No animation longer than 200ms without an opt-out.
- Focus indicators meet AA contrast (3:1 against adjacent colors).

## Relevant references

- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — what students with disabilities actually use today; the interop targets and design directives drawn from that landscape.
- [Related libraries](../../references/related-libraries.md) — React Aria Components, axe-core, and other a11y tooling candidates.
- [TS/JS desktop frameworks](../../references/typescript-desktop-frameworks.md) — why Electron's bundled Chromium beats system-webview options on a11y.
- [Python desktop frameworks](../../references/python-desktop-frameworks.md) — Pyloid as the only Python option that preserves Chromium-grade a11y.
- [LaTeX libraries](../../references/latex-libraries.md) — MathJax v4 + SRE as the accessibility-strongest math renderer.
- [NotebookLM](../../references/notebooklm.md) — accessibility gaps in the dominant competitor that we should not replicate.
