# Defer wiring `extract-dep-signals` coverage into the Fallow gate

- Status: accepted
- Date: 2026-06-03
- Deciders: Bradley Shrader
- Tags: tooling, ci, fallow, coverage, dev-tooling

## Context and Problem Statement

The Fallow complexity gate scores each function on **CRAP** (`CC² · (1 − cov)³ + CC`), where `cov` is the function's test coverage. Coverage dominates the score cubically, so a fully-covered function collapses to `CRAP ≈ CC` while an _apparently_ uncovered one inflates to `CC² + CC`. Fallow only knows a function's coverage if it is handed an Istanbul-format `coverage-final.json` and can match the function to an entry in it.

The `audit:fallow:cov` gate (run in CI and the pre-push hook) generates that coverage from the **Storybook/Vitest** run — it covers the React component library under `src/renderer/src/components/`. It does **not** cover `scripts/`.

`scripts/extract-dep-signals.mjs` is the dependency-review signal extractor (see [claude-dependency-review.md](claude-dependency-review.md)). It is thoroughly tested by `scripts/extract-dep-signals.test.mjs` (~99% line coverage, run via `pnpm test:unit` / `node --test`). But that coverage is emitted by a **separate pipeline** from the Storybook/Vitest run, so it never reaches the `coverage-final.json` Fallow consumes. Fallow therefore scores all eight non-trivial functions in the file as 0%-covered and flags them on CRAP (72–210) even though every one is under Fallow's cyclomatic threshold of 20.

The eight findings are currently silenced with `// fallow-ignore-next-line complexity` plus a file-level note explaining the coverage gap. (This is the same 0%-coverage false-positive class root-caused for the component `forwardRef` bodies, which were instead fixed by a rename so their _existing_ Storybook coverage matched — see the Links.)

The question: do we wire the script's `node --test` coverage into the Fallow gate so the suppressions can be removed, or accept the suppressions?

## Decision Drivers

- **Implementation + maintenance cost of a second coverage pipeline.** `node --test` emits LCOV/text, not the Istanbul `coverage-final.json` Fallow wants. Bridging it means adding a coverage tool (e.g. `c8`) over the `node --test` run, converting/merging its output with the Storybook coverage map, and keeping that merge step correct across Node, Vitest, `c8`, and Fallow version bumps — in CI _and_ the pre-push hook.
- **Coverage is already good in practice.** The script is at ~99% line coverage. The suppressions hide a _scoring_ artifact, not an actual test gap; wiring the pipeline would change the number Fallow prints without changing how well the code is tested.
- **This is dev-tooling, not application code.** `extract-dep-signals.mjs` runs only in the dependency-review workflow. It is never bundled into the Electron app, never reaches an end user, and carries none of the accessibility/local-first constraints that justify rigor on `src/`.
- **Honesty of the gate.** A suppression with a truthful, file-level justification is preferable to a gate number that looks clean only because of plumbing. The current note documents exactly why each finding is a false positive and how to remove it.
- **Reversibility.** The decision is a no-op to reverse — adding the pipeline later removes suppressions; it does not require undoing anything.

## Considered Options

1. **Wire the script's coverage into the Fallow gate now.** Run `node --test` under `c8` (or equivalent), convert to Istanbul, merge with the Storybook `coverage-final.json`, feed the merged map to `audit:fallow:cov`, and delete the eight suppressions.
2. **Defer it. Keep the eight suppressions with honest justifications.** (Chosen.)
3. **Drop `scripts/` from Fallow's analysis entirely** (e.g. via `ignorePatterns`), so the file is never scored.

## Decision Outcome

Chosen option: **Option 2 — defer wiring the coverage pipeline; keep the eight suppressions with honest, file-level justifications.**

The cost of building and maintaining a second coverage pipeline (LCOV → Istanbul conversion + map merge, wired into both CI and the pre-push hook, kept green across four moving toolchains) outweighs the benefit, because the only thing it buys is removing suppressions on **dev-tooling** code whose real-world coverage is already ~99%. The suppressions are not masking a test gap; they are masking a coverage-attribution artifact, and a documented suppression communicates that more honestly than added plumbing would.

Option 3 was rejected because excluding `scripts/` from Fallow would also discard the dead-code, duplication, and circular-dependency analysis Fallow _does_ run usefully over that directory — a broad loss to silence a narrow complexity false positive. A targeted, documented per-function suppression is more surgical than removing the whole directory from the tool's view.

### Positive Consequences

- **No new CI surface to maintain.** No `c8` dependency, no coverage-merge step, no second place for a Node/Vitest/Fallow bump to break the gate.
- **The gate stays fast and self-contained.** `audit:fallow:cov` keeps doing exactly one coverage run (Storybook).
- **The suppressions are truthful.** The file-level note and each per-function comment explain that the shape is idiomatic complexity _and_ that the CRAP is inflated by the coverage-pipeline gap — not a "Windows path" myth or an unexplained ignore.

### Negative Consequences

- **The repo is not at zero Fallow suppressions.** Eight remain, all in this one dev-tooling file. Anyone auditing suppression count must know these are intentional and documented.
- **A genuine future complexity regression in these functions could hide behind the suppression.** `// fallow-ignore-next-line complexity` silences the function's complexity finding wholesale, so if one of these functions later grows past CC 20 (real, not coverage-driven), Fallow would no longer flag it. Mitigation: the per-function justifications describe the _expected_ shape (flag dispatch, regex line-kind dispatch, SemVer rules), so a reviewer adding unrelated branches has a documented baseline to notice the drift against. The `node --test` suite remains the real correctness gate.

## Follow-up / When to Revisit

Revisit and implement **Option 1** if any of these become true:

- `scripts/` grows into more than a couple of files with the same 0%-coverage-attribution problem, so a shared coverage-merge step amortizes across many findings.
- Fallow gains native support for multiple coverage inputs (or a non-Istanbul format that `node --test` emits directly), collapsing the conversion/merge cost to near-zero.
- The script stops being purely dev-tooling — e.g. its logic moves into a path that ships in the app — at which point application-code rigor applies.
- A real (CC-driven, not coverage-driven) complexity regression slips through one of these functions, demonstrating that the wholesale suppression is too blunt.

When implementing, the shape is: `c8 --reporter=json node --test scripts/**/*.test.mjs` → Istanbul map; merge with the Storybook `coverage-final.json` (e.g. `istanbul-lib-coverage` `createCoverageMap().merge(...)`); pass the merged map to `fallow audit --coverage`; then delete the eight suppressions and the file-level note.

## Links

- CI feature: [continuous-integration OVERVIEW](../OVERVIEW.md)
- Fallow CRAP / coverage false-positive root cause (component `forwardRef` bodies, fixed by rename): the inner function of a `forwardRef(function Name(){})` bound to `const Name` is mangled to `Name2` in the coverage map, defeating Fallow's name-keyed matcher — see the `extract-dep-signals.mjs` file-level coverage note and project memory `fallow-forwardref-coverage-fp`.
- Dependency-review extractor: [claude-dependency-review.md](claude-dependency-review.md)
- Package-manager ADR (why the extractor parses `pnpm-lock.yaml`): [package-manager.md](package-manager.md)
- Fallow CRAP metric: <https://docs.fallow.tools/explanations/complexity>
- MADR template: <https://adr.github.io/madr/>
