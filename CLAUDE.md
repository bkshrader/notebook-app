# notebook-app

An accessibility-first, local-first note-taking app for academics.

## Design Documentation

Before proposing features, scoping work, or making technical recommendations, read the relevant files under `docs/`. The layout:

- **`docs/ROADMAP.md`** — canonical version-by-version feature list. Intentionally terse; each entry links to its `docs/features/<slug>/OVERVIEW.md`. Start here.
- **`docs/GLOSSARY.md`** — the **source of truth for project terminology** (Library vs. Project, Note, sidecar, etc.). Capitalized terms in the docs carry the meaning defined here. See the Terminology rules below.
- **`docs/features/<slug>/OVERVIEW.md`** — per-feature design notes. Each links to relevant entries in `docs/research/`.
- **`docs/research/<name>.md`** — deep dives on libraries, competitors, and adjacent tech, with license verdicts and accessibility analyses. Cite them when making technical proposals.
- **`docs/features/<slug>/adrs/<kebab-name>.md`** — Architecture Decision Records in [MADR](https://adr.github.io/madr/) format, scoped to the feature they affect. See `docs/features/accessibility/adrs/eslint-version.md` for the pattern. Write an ADR when a decision is non-obvious, hard to reverse, or trades off against project charter constraints — and when revisiting it later (e.g. on a dependency bump), update the existing ADR's status (`superseded`, `deprecated`) rather than deleting it.

When adding a feature: add a roadmap line + create `docs/features/<kebab-name>/OVERVIEW.md`. When removing or merging a feature: delete the directory, collapse the roadmap line, and grep for inbound links.

## Terminology

[`docs/GLOSSARY.md`](./docs/GLOSSARY.md) is the **single source of truth for project terminology**. These rules are non-negotiable:

- **Consult it before naming anything.** Before introducing a term for a project concept in docs, code, or conversation, check the glossary first.
- **Reuse, don't reinvent.** If a concept already has a glossary term, use that exact term — do **not** coin a synonym or paraphrase for the same thing (e.g. don't say "notebook", "workspace", or "vault" when the term is **Library**, and don't conflate **Library** with **Project**).
- **Keep it current.** Whenever a session defines, renames, or meaningfully refines a project term, update `docs/GLOSSARY.md` in the same change — add the new entry (or edit the existing one) so the glossary never drifts behind the work. Cross-link related entries.
- **Respect the casing convention.** A capitalized glossary term in prose (e.g. "the Library", "a Project") carries its specific glossary meaning, not the generic English sense.

## Storybook MCP

Before doing any React UI, frontend, or component work, call the `storybook-mcp` MCP server (registered in [`.mcp.json`](./.mcp.json)) to read live component manifests, generate stories, and run interaction tests against the running Storybook.

The server is exposed at `http://localhost:6006/mcp` when Storybook is running locally (`npm run storybook`). If the server is unreachable, start Storybook first.

The MCP server is the source of truth for what components exist, what props they take, and what stories already cover them. Prefer it over re-reading the codebase for those facts.

## Commands

Run `npm run` or read `package.json` to discover scripts. Story tests run via `npm run test-storybook` (Vitest + Playwright chromium). Document any future test runner here only if its invocation isn't obvious from `package.json`.

CI gates on `lint`, `format:check`, `typecheck`, `build`, `audit:fallow`, `npm audit --audit-level=high`, and `license-check` (production deps must have an AGPL-3.0-or-later compatible license per the allow list in `.github/workflows/ci.yml`). Run all seven before declaring work done.

Local git hooks (husky, installed automatically via the `prepare` script on `npm install`):

- **pre-commit** runs prettier + eslint on staged files via `lint-staged`.
- **pre-push** mirrors CI: typecheck, license-check, `npm audit --audit-level=high`, `audit:fallow`, build, test-storybook.
- Bypass: `git commit --no-verify` / `git push --no-verify`, or `HUSKY=0 git <cmd>` to skip all hooks.
- The Claude-Code-only `.claude/hooks/fallow-gate.sh` (PreToolUse on Bash) continues to gate Claude-initiated commits and pushes — this is additive to the husky pre-push.

The `license-check` allow list is duplicated in `.github/workflows/ci.yml` (machine-enforced) and `docs/licenses/in-use.md` (human-facing rationale). When a new license needs evaluation, follow the process in `docs/licenses/in-use.md` and update **both** files together. Rejections go in `docs/licenses/incompatible.md`.

## Framework and tooling decisions (decided)

These are load-bearing and were the output of explicit research; don't relitigate without cause. Full reasoning lives in `docs/research/`.

- **Electron, not Tauri.** Bundled Chromium gives the strongest accessible-tree exposure to JAWS/NVDA/VoiceOver/Orca. See `docs/research/typescript-desktop-frameworks.md`.
- **CodeMirror 6** for the editor. Real contenteditable substrate beats Monaco's canvas approach for screen readers. v2's "rich markdown editor" stays on CM6; do not propose swapping to TipTap/Lexical/BlockNote. See `docs/research/codemirror.md`.
- **MathJax v4** for math rendering. Accessibility-strongest renderer; SRE-driven `aria-label` injection works regardless of screen-reader MathML support. See `docs/research/latex-libraries.md`.
- **faster-whisper** for speech-to-text, with **Silero VAD** (voice-activity detection) gating it to skip silence and suppress `large-v3` hallucination. **Supertonic** for text-to-speech. All as Python sidecars. See `docs/research/whisper.md`, `docs/research/supertonic.md`.
- **BYO AI**, OpenAI-compatible endpoint per profile. We do **not** bundle a local LLM runtime. See `docs/features/byo-ai/OVERVIEW.md`.

## Non-negotiable constraints

- **WCAG 2.1 AA is the floor.** AAA is aspirational. Every interactive element must be keyboard-reachable and screen-reader-announceable. The framework choice (Electron) was made for a11y; the editor choice (CodeMirror 6) was made for a11y; the math renderer (MathJax v4 + SRE) was made for a11y. Don't degrade these.
- **AGPL-3.0-or-later.** Every dependency must be AGPL-compatible when linked. The one exception is when the dependency is not redistributed by us, and only referenced via IPC. See `docs/licenses/in-use.md` for the current dependency-tree license summary (regenerate after any `npm install`) and `docs/licenses/incompatible.md` for known license traps and rejected libraries. Keep both files current — add new traps to `incompatible.md` as research uncovers them, and refresh `in-use.md` whenever dependencies change.
- **Local-first.** Plain `.md` files on disk are canonical. No proprietary database. No cloud account required. Sync is the user's choice (point iCloud/Dropbox/etc. at the notes folder).
- **ADHD-first UX.** Stable focus, predictable layout, animations respect `prefers-reduced-motion`. Don't add visual flair that costs cognitive load.

## Conventions worth knowing

- **Commits.** Terse imperative-mood subjects ("Add eslint claude hook", "Install fallow", "Setup electron"). Match that style.
- **GitHub owner.** `bkshrader`
