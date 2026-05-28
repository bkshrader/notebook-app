# Continuous Integration

**Version:** 1.0

The CI surface protects the project's three non-negotiable constraints (accessibility, AGPL licensing, local-first runtime) and the load-bearing tooling decisions (Electron, CodeMirror 6, MathJax v4) from regression. CI is a defensive system, not a quality goal in itself — its job is to be loud when a PR threatens one of those things and silent otherwise.

This feature exists as documentation, not code: the CI surface is the seven gates in `.github/workflows/ci.yml`, the security-hardening conventions applied across all `.github/workflows/*.yml`, the three Claude-driven workflows, and the Dependabot configuration. The ADRs in this directory record the non-obvious decisions that shaped each.

## Surface

### Required gates (block merge)

All seven run on every `pull_request` to `main` via `.github/workflows/ci.yml`:

1. **`lint`** — `eslint .`
2. **`format:check`** — `prettier --check .`
3. **`typecheck`** — `tsc --noEmit` against both project tsconfigs
4. **`build`** — `electron-vite build`
5. **`audit`** — `fallow audit` (codebase intelligence: dead code, complexity, duplication; NOT a license auditor)
6. **`npm-audit`** — `npm audit --audit-level=high`
7. **`license-check`** — `npx license-checker` against the AGPL-compatible allow list

The allow list is duplicated by design: `.github/workflows/ci.yml` enforces it; [`docs/licenses/in-use.md`](../../licenses/in-use.md) carries the human-readable rationale. Keep them in sync. Rejections live in [`docs/licenses/incompatible.md`](../../licenses/incompatible.md).

### Advisory workflows (do NOT block merge)

- **`claude.yml`** — `@claude`-mention bot for the maintainer. Read-only tool allowlist. Gated on collaborator status by both `author_association` (fast eager rejection) and a live API preflight (defense-in-depth).
- **`claude-code-review.yml`** — Per-PR code review. Uses the `code-review` plugin from `anthropics/claude-code` marketplace. Skips fork PRs and Dependabot PRs (the latter handled by the dedicated dep-review workflow). Pinned to Sonnet 4.6.
- **`claude-dependency-review.yml`** — Per-Dependabot-PR risk assessment. Reads the diff, the PR body's embedded Dependabot release notes, and a structured `signals.json` derived from the diff + base-ref lockfile (peer-dep mismatches, license changes, net-new transitives). See [`adrs/claude-dependency-review.md`](adrs/claude-dependency-review.md) for the full design rationale.

### Dormant workflows (defensive baseline, not yet wired to a trigger)

- **`a11y-axe.yml`** — axe-core scan of built Storybook stories. Inline checklist documents what must be true before broadening its trigger.
- **`lighthouse.yml`** — Lighthouse CI baseline. Same pattern.
- **`codeql.yml`** — GitHub-native SAST. `build-mode: none` (analyze without building); runs on push to `main` only.

### Dependency hygiene

- **`.github/dependabot.yml`** — npm + github-actions ecosystems on weekly cadence. **7-day cooldown** between a release's npm publish and the corresponding Dependabot PR opening, so yank windows close before we bump. **Grouping** consolidates peer-coupled ecosystems (`vite-ecosystem`, `storybook`, `eslint`, `playwright`, `electron`, `react`) into single PRs; everything else gets one PR per package. See [`adrs/dependabot-grouping.md`](adrs/dependabot-grouping.md) for why there's no catch-all group and what that implies for auto-merge.

## Threat model

Every workflow in this directory was designed against **the malicious fork PR threat model** documented in [`adrs/ci-threat-model.md`](adrs/ci-threat-model.md). The model is bounded: an external attacker who opens a fork PR cannot reach the project's secrets, cannot poison the install step, cannot exfiltrate from a Claude run, and cannot persuade Claude to do anything beyond its read-only tool allowlist. The model deliberately does NOT defend against malicious collaborators with write access — that's a different problem and a different cost.

The threat model drives every non-obvious choice: why every checkout uses `persist-credentials: false`, why every `npm ci` uses `--ignore-scripts`, why the Claude workflows pin to `pull_request.base.sha` and not the merge commit, why the dep-review workflow uses `pull_request` and not `pull_request_target`, and why `pull_request.user.login` is checked rather than `github.actor`.

## Decisions worth being explicit about

The ADRs in this directory capture decisions that are non-obvious, hard to reverse, or trade off against project charter constraints:

- [`ci-threat-model.md`](adrs/ci-threat-model.md) — the malicious-fork-PR threat model that governs every other CI decision. Foundational.
- [`claude-dependency-review.md`](adrs/claude-dependency-review.md) — the Claude-driven Dependabot review workflow. Why Claude over Copilot, why `pull_request` over `pull_request_target`, why Dependabot secrets namespace, why local signal extractor over network changelog fetcher, why three-dot git diff, why identity gating via `pull_request.user.login`.
- [`claude-code-action-pinning.md`](adrs/claude-code-action-pinning.md) — the deliberate choice to pin `anthropics/claude-code-action@v1` to a moving tag rather than a SHA. Standard "pin to SHA" security advice is wrong for this specific dependency.
- [`dependabot-grouping.md`](adrs/dependabot-grouping.md) — why the Dependabot config uses six named pattern groups and no catch-all, why the original dev/prod split was removed, and why auto-merge would require revisiting the grouping shape before being enabled.
- [`hook-environments.md`](adrs/hook-environments.md) — the four invariants every `.claude/hooks/*` and `.husky/*` hook has to satisfy to fire correctly across worktrees and the main repo, and the chronology of seven incidents (May 2026) that surfaced them. Read this before touching any hook script.

## Conventions worth knowing

- **Every workflow has `permissions: contents: read` at workflow level.** Per-job permissions only widen this when a specific step needs more (e.g. `pull-requests: write` for the dep-review comment).
- **Every checkout has `persist-credentials: false`.** No workflow's later steps should be able to invoke `git push` with the runner's default token.
- **Every `npm ci` uses `--ignore-scripts`.** Blanket protection against upstream lifecycle-script execution.
- **Every long-running workflow has `timeout-minutes` and a `concurrency` group with `cancel-in-progress: true`** — except the dep-review workflow, where cancel-in-progress combined with the wrong trigger types created a race that tore down in-flight runs (see ADR).
- **Claude workflows use OIDC.** The `id-token: write` permission is for _issuing_ an OIDC token (not write-to-repo). The Claude GitHub App mints a short-lived, app-scoped installation token from the OIDC assertion; that's what Claude uses for any repo operations.
- **`anthropics/claude-code-action@v1` is a moving tag and that's deliberate.** See ADR.

## Relevant references

- [`docs/licenses/in-use.md`](../../licenses/in-use.md) — the license allow list backing the `license-check` gate, with rationale per license.
- [`docs/licenses/incompatible.md`](../../licenses/incompatible.md) — rejected licenses and the libraries we've ruled out because of them.
- [GitHub Changelog, 2021-02-19](https://github.blog/changelog/2021-02-19-github-actions-workflows-triggered-by-dependabot-prs-will-run-with-read-only-permissions/) — the Dependabot read-only-token + secrets-blackout change that drives the Dependabot secrets namespace requirement.
- [GitHub Docs: Understanding GitHub secret types](https://docs.github.com/en/code-security/reference/secret-security/understanding-github-secret-types) — the Actions-vs-Dependabot secrets distinction.
- [Synacktiv: GitHub Actions exploitation](https://www.synacktiv.com/publications/github-actions-exploitation-untrusted-input) — broader landscape of `pull_request_target` / untrusted-input exploitation patterns; informs the threat model and the `pull_request`-not-`pull_request_target` choice.
