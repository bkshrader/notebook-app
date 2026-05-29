---
name: research
description: Conduct research and write a `docs/research/<slug>.md` report for this notebook-app project. Use whenever the user invokes `/research` or asks for a research report, library survey, "deep dive", "shallow survey", or AGPL-compatibility/accessibility verdict on a library, framework, or competing product. Triggers on both forms — `/research deep MathJax` and `/research what about something for OCR?` — and also on bare phrases like "write me a reference doc on Tantivy" or "do a shallow survey of CRDT libraries". The skill is project-scoped to notebook-app and produces reports that match the existing style and rigor of files under `docs/research/`.
argument-hint: '[deep|shallow]  the topic to be researched'
---

# /research — write a reference doc for notebook-app

You are writing into `docs/research/` of an accessibility-first, local-first note-taking app for academics. The audience of these reports is the future maintainer of this app (most often the user, sometimes a future Claude session) making decisions under the project's non-negotiable constraints. Every report exists to answer one or both of these questions:

1. **Can we legally use this in an AGPL-3.0-or-later application?** (`docs/licenses/in-use.md` and `docs/licenses/incompatible.md` are the rules of the road.)
2. **Does it fit the project — WCAG 2.1 AA floor, ADHD-/Autism-friendly UX, local-first, Electron-based?**

Read [CLAUDE.md](../../../CLAUDE.md) once near the start of any session if you haven't already; it carries the binding constraints. The "Framework and tooling decisions (decided)" section lists choices that should be treated as load-bearing — don't propose relitigating them without strong cause.

## Parsing the invocation

The argument string looks like one of:

- `deep MathJax v4 accessibility` → mode = `deep`, topic = `MathJax v4 accessibility`
- `shallow OCR libraries for the document ingestion pipeline` → mode = `shallow`, topic = `OCR libraries for the document ingestion pipeline`
- `MathJax v4 accessibility` (no mode token) → mode unspecified — **ask the user** which they want, briefly explaining the difference (see below)
- _(empty)_ → ask the user what to research and in which mode

Strip the first whitespace-delimited token; if it case-insensitively matches `deep` or `shallow`, that's the mode and the rest is the topic. Otherwise the whole string is the topic.

### Deep vs shallow — when to use which

**Deep** — one library / framework / product / standard, treated thoroughly. Aim for 400–800 lines. Heavy footnoting; every concrete claim cites a source. Verify the LICENSE file by reading its text, not by trusting summaries. Pull live repo signals (stars, forks, contributors, latest release, last commit, open-issues count) via the GitHub API. Examples in the repo: `handy.md`, `whisper.md`, `codemirror.md`, `supertonic.md`, `notebooklm.md`. Pick deep when the user is choosing between a small number of candidates and the decision matters.

**Shallow** — a category survey. Aim for 200–500 lines. One short paragraph per entry (1–3 sentences) and a one-line license verdict. No footnotes. Ends with a Summary section that names "looks open, isn't" traps, categories with no good AGPL-compatible option, and the strongest differentiators for _this_ project. Example in the repo: `related-libraries.md`. Pick shallow when the user wants to know the landscape, or to find candidates worth a deep dive later.

If the user gave no mode, offer something like:

> Want this **deep** (one library, ~500–800 lines, every claim footnoted, verified LICENSE) or **shallow** (category survey, 1–3 sentences per library, no footnotes, ends with traps + differentiators)?

## Picking the output path

The file goes in `docs/research/<slug>.md` where `<slug>` is the topic in kebab case. Strip filler words ("libraries", "options", "for X") only if it makes the name clearer — match existing naming (`whisper.md` not `whisper-stt.md`, `latex-libraries.md` because it's a survey not a single library, `typescript-desktop-frameworks.md` because it's distinguishing from the JVM/Python siblings).

Before writing: run `ls docs/research/` (or `Glob docs/research/*.md`). If the slug already exists, surface that to the user and ask whether to overwrite, append, or choose a different slug. The existing file may already be the right home for an addition.

## Research workflow

Use the tools available — `WebSearch`, `WebFetch`, `Bash` with `gh api` for GitHub, `Read` for in-repo evidence. Don't ask permission for each call; the user expects you to dig.

### For both modes

1. **License first.** For each library:
   - Get the `LICENSE` (or `LICENSE.md`, `COPYING`) file _contents_ via `gh api repos/<owner>/<repo>/contents/LICENSE` and decode it. Read the actual text. Note the copyright holder and the SPDX identifier. Don't trust the GitHub sidebar — it has been wrong (it shows the _primary_ license and misses dual licensing, custom riders, and model-vs-code splits).
   - Cross-check against `docs/licenses/incompatible.md` (`Read` it). If the license is on that list, surface that prominently.
   - Render the AGPL-compatibility verdict using the legend already established in `docs/research/related-libraries.md`:
     - **Compatible** — permissive (MIT / BSD / ISC / Apache-2.0 / MPL-2.0 / LGPL) or AGPL / GPL-3.0+
     - **Incompatible** — GPL-2.0-only without "or later", SSPL, BSL/BUSL, "source-available", custom commercial, or no license at all
     - **Conditional** — dual licensing, model/code license splits, RAIL-family use restrictions, trademark or watermark conditions, premium-plugin tiers
   - If the project ships _model weights or assets_ separately (Whisper, Supertonic, Coqui, OCR models), evaluate those licenses _separately_ from the code license. This trap has bitten this project before; treat it as the default expectation rather than an edge case.

2. **Project-fit framing.** Tie the verdict back to:
   - **Accessibility (WCAG 2.1 AA floor, AAA aspirational).** Does the library expose a proper a11y tree? Does it work with NVDA / JAWS / VoiceOver / Orca? Is there a known a11y issue? For renderers/editors specifically, distinguish "claims accessibility" from "evidence of accessibility" (production deployments, audits, screen-reader bug history).
   - **Local-first.** Does it require a network call? Does it phone home for telemetry by default?
   - **Electron (decided).** Does it ship as a JS/WASM module, a native binary that needs N-API bindings, or a Python/Rust sidecar process?
   - **ADHD-/Autism-friendly UX.** Does the library have animations that ignore `prefers-reduced-motion`? Is the keyboard story stable, or is it a mouse-first widget with afterthought keybindings?

### Deep-mode workflow

Spend the time. The point of deep mode is that the doc is the _evidence base_ for an irreversible decision; speculation that can't be footnoted is worse than no doc.

1. **Fetch repo metadata** via `gh api repos/<owner>/<repo>` — capture `stargazers_count`, `forks_count`, `open_issues_count`, `pushed_at`, `default_branch`, `license.spdx_id`. Note the retrieval date in the footnote — these numbers go stale.
2. **Fetch contributor stats** via `gh api repos/<owner>/<repo>/contributors?per_page=10`. Note the top contributor's commit count and the long-tail shape. A "single-maintainer-driven project with a long tail" (the phrasing used in `handy.md`) is real signal worth surfacing.
3. **Fetch recent releases** via `gh api repos/<owner>/<repo>/releases?per_page=10`. Compute cadence and note pre-1.0 / post-1.0 status. Pre-1.0 + active = expect breaking changes; pre-1.0 + stagnant = abandonment risk.
4. **Read the README and primary docs.** Cite by section name (e.g., README, "Architecture" section). Don't paraphrase load-bearing claims; quote them when precision matters.
5. **Read the key source files** when the design matters (e.g., `Cargo.toml` for dependency surprises, `package.json` for build-tooling, the `commands/` or `src/` entry points for what's actually a stable API).
6. **Check open issues** for known bugs that would affect us. Cite issue numbers and titles.
7. **Walk the architecture.** Audio pipelines, editor pipelines, parser pipelines — describe the data flow. The reader should be able to decide between embedding the library, forking it, or driving it as an external process.
8. **Note the gotchas.** Things you only learn by reading: forked dependencies pinned to a maintainer's GitHub, non-canonical patched crates, Wayland support qualifications, signed-release verification, telemetry posture, security-issue scope (`asset protocol "**"` scope etc.).

### Shallow-mode workflow

The point of shallow mode is to be a _map_, not a _deep dive_. Be efficient with your tool budget.

1. For each candidate in the category, **at minimum** verify: (a) the SPDX license, (b) whether the project is actively maintained (`pushed_at` within ~6 months is a reasonable cut), (c) whether there is a known AGPL trap (model license split, premium tiers, source-available rider).
2. Skip footnotes. Each entry gets 1–3 sentences. Lead with what the library _is_ and end with the license verdict on the same line. Example shape, lifted from `related-libraries.md`:
   > **[TipTap](https://github.com/ueberdosis/tiptap)** — Headless editor framework on ProseMirror; huge extension catalogue, very flexible, good a11y when configured carefully. **License: MIT — Compatible.**
3. Group entries into clearly-named sections by sub-category. Don't try to be exhaustive within a category — three to ten well-chosen entries per section is the right density.
4. End with a Summary section that calls out:
   - **Licensing surprises / "looks open, isn't" traps** — tldraw and similar are the canonical example.
   - **Categories with no good AGPL-compatible option** — name them honestly. The reader needs to know about the gap.
   - **Strongest differentiators for this project specifically** — the 2–5 picks that uniquely serve the accessibility / local-first / academic-workflow goals.

## Report structure

### Deep report template

Use this skeleton, but treat it as a _guide_ rather than a fill-in-the-blank form — the docs in this repo vary their headings to fit the topic (compare `whisper.md`'s numbered sections to `handy.md`'s narrative ones). Adapt.

```markdown
# <Topic>

- **GitHub repo:** <url>[^repo]
- **Project website / docs:** <urls>[^site]
- **License (code):** <SPDX>[^license-file]
- **License (model weights / assets, if separate):** <SPDX>[^model-license]
- **AGPL-compatibility verdict:** **Compatible / Incompatible / Conditional.** <one-paragraph reasoning that names the exact mechanism — §7 enumerated additional terms, dual licensing, OFL font scope, etc.>

---

## What it is

<2–6 paragraphs describing the project, its architecture, what problem it solves, and what its actual scope is — including what it is _not_ (very useful, see `handy.md`).>

## How to use it

<Installation, basic usage, the external control surface — CLI flags, signals, supported integration patterns. For libraries this is the API shape; for desktop apps this is the IPC story.>

## Relevance to a note-taking app

<Walk through _specific_ use cases in this project: dictation, lecture capture, math input, screen-reader output, etc. Distinguish "embed as library" from "ship as sidecar" from "recommend to user" — they have very different AGPL implications. Flag accessibility caveats specifically.>

## Things to know

### Maturity & activity signals

<Stars, forks, contributors, latest release, last commit, open issues count — all dated.>

### Platform support

<macOS / Windows / Linux / mobile, including hardware-acceleration availability per platform.>

### Performance characteristics

<Real numbers if available. Cite the source; don't extrapolate.>

### Dependencies of note

<Forked deps, patched crates, sidecar runtimes, build-tooling surprises.>

### Security notes

<Code-signing, asset-scope settings, telemetry posture, known CVEs / open security issues.>

### Other gotchas

<Anything you'd only learn by reading the source. Wayland qualifications, keyboard-layout bugs, etc.>

---

## Summary of fit

<2–4 paragraphs: explicit recommendation framed against the project's constraints. "Useful as X, but not as Y, because Z." Don't hedge.>

---

[^repo]: GitHub API `repos/<owner>/<repo>`, retrieved YYYY-MM-DD.

[^site]: <which page, retrieved YYYY-MM-DD if relevant>.

[^license-file]: `LICENSE` file at <permalink>, fetched via the GitHub Contents API and decoded; full text begins "..." — verified directly, not from a summary.

[^...]: <one footnote per concrete claim, naming the exact source — README section name, file path, API endpoint and retrieval date>.
```

### Shallow report template

```markdown
# <Category Name> — Cursory Research

<One paragraph framing: what this is a survey of, why we care, the project context (AGPL, accessibility, etc.).>

**AGPL-compatibility verdict legend:**

- **Compatible** — permissive (MIT/BSD/ISC/Apache-2.0/MPL-2.0/LGPL) or AGPL/GPL-3.0+ itself
- **Incompatible** — GPL-2.0-only, SSPL, BSL/BUSL, "source-available", custom commercial, or no license at all
- **Conditional** — needs further explanation (e.g., dual licensing, dependencies with stricter terms, trademark/watermark conditions)

---

## 1. <Sub-category>

- **[Name](github-url)** — what it is, what it's good for, key trade-off. **License: <SPDX> — Compatible/Incompatible/Conditional.**
- **[Name](github-url)** — ... **License: <SPDX> — ...**

## 2. <Sub-category>

...

---

## Summary

**Licensing surprises / "looks open, isn't" traps:**

- **<Name>** — <the trap>. <what to do instead>.

**Categories with no good AGPL-compatible option:**

- <category> — <honest description of the gap>.

**Strongest differentiators for this project specifically:**

- <Name> — <why it uniquely serves the accessibility / local-first / academic goals>.
```

## Style notes

- **Voice.** Direct, evidence-led, opinionated when the evidence supports an opinion. The existing docs are not neutral encyclopedia entries — they make recommendations and name traps. Match that voice. "Looks open, isn't" is a load-bearing recurring header; honor it when applicable.
- **Hedging.** Hedge when you don't have evidence; don't hedge when you do. "I did not audit this WCAG conformance" is honest and useful. "May or may not be accessible" without further specifics is filler.
- **Dates.** Always include retrieval dates for API calls and "last commit" / "latest release" claims. These numbers go stale fast and the reader needs to know how stale.
- **License-file verification.** If you do nothing else differently from a casual research write-up, do this: actually open the LICENSE file and read it. The bottom of `handy.md` shows the pattern — quote the opening line and note the copyright holder. The GitHub sidebar license badge is wrong often enough to matter, especially for dual-licensed or RAIL-licensed projects.
- **Project-specific framing.** Every report should end with the reader knowing whether _this project_ should use the thing. Generic surveys without a verdict are noise.
- **Math, accessibility, model licenses.** These are recurring traps for this project. If your topic touches any of them, flag it specifically — even in shallow mode.

## After writing

When the report is done:

1. **Tell the user where it landed**: a markdown link to the new file.
2. **Suggest the followups** they might want to make manually:
   - Add a line in `docs/ROADMAP.md` if this research enables or changes a planned feature.
   - Update or create `docs/features/<slug>/OVERVIEW.md` to link to the new reference (most existing feature OVERVIEWs cite their references).
   - If the report uncovered a licensing trap, add it to `docs/licenses/incompatible.md`.
   - If the report changes a previously-decided dependency, surface that the relevant ADR under `docs/features/<feature>/adrs/` may need updating (status → `superseded` or `deprecated`).

   Don't make these edits yourself unless the user asks — they're cross-cutting and the user is the right person to decide whether the research is decisive enough to act on.

3. **Commit.** Don't auto-commit; the user controls when things land in git.

## Antipatterns to avoid

- **Citing summaries instead of sources.** "According to its docs, the license is MIT" is not verification; opening the LICENSE file and reading the text is.
- **Letting the GitHub sidebar drive license analysis.** Dual licensing, model/code splits, and custom riders are all invisible to it.
- **Generic recommendations.** "It's worth considering" is filler. Either recommend or don't.
- **Drive-by speculation in deep reports.** If a claim isn't footnoteable, either go find a source or cut it.
- **Footnotes in shallow reports.** They signal the wrong mode; the shallow format intentionally trades depth for surface area.
- **Skipping the project-fit section.** A reference doc that doesn't tell the future reader whether _this app_ should use the thing has failed at its only real job.
