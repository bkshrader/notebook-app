# Component Library — build progress & recovery notes

> Working scratch document for the Phase 2 component-coverage build. Tracks what is
> done, what remains, and how to recover the multi-agent workflow if interrupted.
> Delete (or fold into OVERVIEW.md) once the library is complete and merged.

_Last updated: 2026-05-31 (overnight autonomous run)._

## Goal

Build, for every in-scope Ark UI component, the triad the
[unstyled-primitives-ark ADR](../accessibility/adrs/unstyled-primitives-ark.md) implies:
a Helios-token-styled `forwardRef` wrapper + CSF3 stories + a keyboard/a11y play test,
generated at scale via multi-agent Workflows and enforced by the existing
`a11y.test:'error'` Storybook gate. **53 components in scope** (see OVERVIEW.md scope
section); `switch` is the locked reference template.

## Status snapshot

- **Committed & green (HEAD `9344244` and earlier):** Switch (reference), Checkbox,
  Avatar, Dialog, Select — plus infra: `vitest.config.ts` optimizeDeps glob,
  `eslint.config.mjs` `.claude/` ignore.
- **Generated on disk, NOT yet committed:** the remaining ~41 component dirs +
  `src/renderer/src/components/index.ts` (global barrel) + `docs/` (this feature's
  OVERVIEW/ROADMAP/GLOSSARY/ADR cross-link) + `package.json`/`pnpm-lock.yaml`
  (`@internationalized/date` runtime dep, added for DatePicker/DateInput).
- **Static gate (lint/stylelint/typecheck): GREEN** across all components as of this
  checkpoint (`pnpm typecheck` RC=0, `stylelint **/*.css` RC=0, `eslint components` RC=0).
- **Browser test gate (`test-storybook` + axe): IN PROGRESS.** A first full run showed
  ~13 green / ~24 red; repair batch 1 (10 components) completed and fixed its set; a
  fresh full gate is re-running to get the current count. Reds are being repaired in
  workflows of ≤10 (per the user's rate-limit instruction).

## What changed vs. the original plan

1. **Verify is 1 combined opus agent per component**, not the 3-lens panel — the pilot
   proved the LLM verify is blind to mechanical + runtime-test failures, so the **real
   gate is the tools** (eslint + stylelint + token-allowlist + the actual browser test),
   run by the orchestrator. LLM verify stays for semantic review only.
2. **Generation ran as one big fan-out** (interrupted by a rate limit), then switched to
   **batches of ≤10** for repair, with a `/rate-limit` check before each batch (wait if
   5h > 65% or 7d > 80%).
3. **`signature-pad` / `time-picker` excluded** as planned; 4 components
   (Combobox/DatePicker/TagsInput/TreeView) were left half-written by the interrupted
   run and finished by a dedicated completion workflow.

## Dominant failure classes (and the fixes)

1. **axe color-contrast (WCAG 2.1 AA, the #1 systemic bug).** Generate agents picked
   token pairs below 4.5:1. Fixes:
   - `<mark>`/highlight: `--token-color-foreground-highlight` → `…-highlight-on-surface`.
   - success "Copied": `--token-color-foreground-success` → `…-success-on-surface`.
   - action-blue on grey: `--token-color-foreground-action` → `…-foreground-strong`.
   - disabled text `…-disabled` (#8c909c, 3.18:1) → `…-foreground-faint` (#656a76).
2. **Test-contract bugs.** `toBeDisabled()` on Ark controls that only get `data-disabled`
   (not native `disabled`); slider arrow direction / `aria-disabled` assumptions; overlay
   `toBeVisible()` racing the enter animation (use `findByRole` + assert `data-state=open`,
   `waitFor` the close); `getByRole` role-name mismatches; highlight-index assumptions
   (read `data-highlighted` instead).
3. **Mechanical lint** (CSS property order, `vw/vh`→`vi/vb`, missing `await`, `:not(a,b)`
   forgiving notation, `box-shadow: 0…` and `fill: currentcolor` strict-value) — mostly
   `--fix`-able; the `currentcolor`/`0` cases were resolved by adding them to
   `.stylelintrc.json` `ignoreValues` (both are non-theming values).

## Workflow / artifact map (for recovery)

All under `.claude/artifacts/` (gitignored):

- `ark-coverage-workflow.mjs` — main generate+verify fan-out (sonnet gen, opus verify).
- `complete-partials-workflow.mjs` — finishes half-written components.
- `repair-workflow.mjs` — repairs failing components; **edit the embedded `COMPONENTS`
  array per batch** (the Workflow `args` global does NOT propagate — confirmed).
- `gate-component.sh` / `gate-static.sh` / `run-full-gate.sh` — per-component gates;
  results in `full-gate-results.txt`, red detail in `full-red/<Pascal>.txt`.
- `token-allowlist.txt` — 361 frozen `--token-*` names; the source of truth for valid
  tokens (a misspelled token resolves to nothing and stylelint won't catch it).
- `fail-detail/<Pascal>.txt` — per-component captured browser-test failures (repair input).

**Models:** sonnet for generate/repair, opus for verify/orchestration.
**Commit policy:** one commit per component as it passes the full gate; push only when the
whole suite is green. `@internationalized/date` + regenerated `docs/licenses/in-use.md`
land with the DatePicker commit.

## Remaining work

1. Finish repair batches over all red components; re-gate to green.
2. Re-gate the 4 completed partials + 5 committed.
3. Commit each green component (terse imperative subject + `Co-Authored-By: Claude Opus 4.8`).
4. Commit the global barrel, the date dep (with `in-use.md` regen), and the docs.
5. Full CI gate: `typecheck`, `lint`, `lint:css`, `format:check`, `build`,
   `build-storybook`, `test-storybook`, `audit:fallow`, `pnpm audit --audit-level high`,
   `license-check`.

## 2026-06-02 — Helios/Ark audit + library expansion

A full audit-and-fix pass over the existing library plus a Helios-coverage
reconciliation that expanded it from 47 → **78 components**. All gates green; full
Storybook suite **814/814**, deterministic across repeated runs.

**Phase A–B (audit + reconciliation).** Read-only fan-out audited all 47 existing
components against each component's own Ark `data-*` contract (per-component,
per-part — verified, NOT assumed) and static Helios parity. Headline systemic find:
~58 dead `[data-part='…'][data-focus-visible]` selectors across 34 components — Ark
emits `data-focus-visible` on only some parts, so these were dead keyboard focus
rings (WCAG 2.4.7) that passed every CI gate. Plus ~62 false "Ark emits X" header
comments. A reconciliation against the Helios component index split our set into
present / extra (Ark primitives with no 1:1 Helios entry — kept) / missing.

**Phase C1 (fix existing 47).** Per-component fixes: dead `data-focus-visible` →
native `:focus-visible` (per each part's real Ark contract — no global sed), false
comments corrected in-place, borrowed-token-VALUE fixes, missing props/variants, and
a `.spec.stories.tsx` with regression guards for **every** component. Real bugs found
and fixed during verification: ScrollArea viewport missing `tabindex` (axe
`scrollable-region-focusable`); HoverCard Escape-dismiss test race.

**Phase C2 (build missing).** Built **31 new components** (47→78). Architecture: the
[unstyled-primitives-ark ADR](../accessibility/adrs/unstyled-primitives-ark.md) was
amended (2026-06-02 scope clarification) — the library wraps an Ark primitive where
one exists and a plain semantic HTML element where none does. Built:

- _Presentational (plain HTML):_ Alert, Badge, BadgeCount, Card, Separator, Tag,
  Text, Time, Icon, IconTile.
- _Ark-backed:_ Toast, FileInput (file-upload), ColorPicker, DateInput, Carousel,
  Marquee, CopySnippet (clipboard), Dropdown (menu), SuperSelect (combobox),
  TextInput / Textarea / RadioCard (field/radio-group).
- _Composable HTML:_ Button, ButtonSet, Breadcrumb, InlineLink, StandaloneLink,
  MaskedInput, KeyValueInputs, StepperIndicator, StepperNav.

**Test infra hardening.** De-flaked the browser suite at its source: a `beforeEach`
focus-reset in [`.storybook/preview.tsx`](../../../.storybook/preview.tsx) (kills
cross-story ambient-focus flakes) + `retry: 2` on the storybook vitest project. Suite
now deterministic across repeated full runs. Fixed the `audit:fallow:cov` Windows
coverage-path quirk note; complexity findings resolved via genuine sub-component
splits (Field, Alert, Button, MaskedInput) or documented coverage-false-positive
suppressions (Button, StepperNav) — never CC-chasing over coverage.

### Deferred — Tier 3 (not built; tracked for a follow-up effort)

These Helios components are out of scope for this pass by explicit decision — each is
a multi-day feature, not a primitive wrapper, and some belong to other roadmap items:

- **App shell:** App Header, App Footer, App Side Nav, Page Header, Filter Bar,
  Application State — app-composition surfaces, not library primitives.
- **Data tables:** Table, Advanced Table — pair Ark with TanStack Table (MIT) per the
  unstyled-primitives-ark ADR follow-up; a dedicated effort.
- **Code surfaces:** Code Block, Code Editor — these are the **CodeMirror 6** feature
  ([codemirror research](../../research/codemirror.md)); must align with that ADR, not
  be hand-rolled here.

Each should get its own roadmap line + `OVERVIEW.md` when picked up. 6. Completeness critic pass; push; update the PR.
