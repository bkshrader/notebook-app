# CI threat model: malicious fork PRs, not malicious collaborators

- Status: accepted
- Date: 2026-05-25
- Deciders: Bradley Shrader
- Tags: ci, security, threat-model

## Context and Problem Statement

The repo is public, AGPL-3.0-or-later, with a single maintainer (`bkshrader`). External contributors can open fork PRs. Dependabot opens PRs for npm and github-actions ecosystem updates. The maintainer can also `@claude`-mention the bot for ad-hoc reviews.

Every CI workflow added to the project — `ci.yml`, `codeql.yml`, `a11y-axe.yml`, `lighthouse.yml`, `claude.yml`, `claude-code-review.yml`, `claude-dependency-review.yml` — has to make a series of "do we defend against this?" calls. Without an explicit, written threat model, each decision drifts: someone hardens against one shape of attack and forgets another, or over-engineers a defense against a scenario that isn't in scope.

What attacker capabilities are we designing against?

## Decision Drivers

- The project is small and solo-maintained. Defenses cost time we don't have a budget for.
- Public repos with fork-PR support are routinely attacked via the "pwn request" pattern (`pull_request_target` + checkout of attacker code + access to write tokens or secrets). This is the canonical exploitable shape; see the [Synacktiv writeup](https://www.synacktiv.com/publications/github-actions-exploitation-untrusted-input).
- Dependabot rolls upstream-controlled code into our dependency graph weekly. Malicious upstream packages are a real, ongoing threat — independent of fork PRs.
- The maintainer has full write access to the repo. Defending CI against a malicious maintainer is incoherent: the maintainer can just push to `main`.

## Considered Options

1. **Defend only against malicious fork PRs.** Collaborators with write access are trusted. The threat is "an external attacker opens a fork PR designed to exfiltrate secrets, persist on the runner, or push to the repo."
2. **Defend against fork PRs AND maintainer compromise.** Add 2FA-style protections: required reviews on every push, hardware-key-only commits, branch protection that blocks the maintainer's own pushes, etc.
3. **Defend against fork PRs AND upstream supply-chain attacks.** Treat every Dependabot bump as potentially malicious; require human review of every diff before any install runs.

## Decision Outcome

Chosen option: **Option 1 — malicious fork PRs only.**

Concretely, every CI workflow assumes:

- An attacker can open a fork PR with arbitrary code and metadata (title, body, branch name, file contents).
- An attacker cannot push to the upstream repo, cannot add collaborators, cannot label PRs, cannot approve PRs, and cannot influence GitHub-side identity claims (`pull_request.user.login`, OIDC subject claims).
- An attacker can publish malicious package versions to npm and have Dependabot pick them up — but the package's _code_ only enters CI after the malicious version has merged into `main`, which requires a human reviewer's approval AND the seven CI gates AND (per [`claude-dependency-review.md`](claude-dependency-review.md)) an advisory Claude check.
- A maintainer with write access is trusted. If `bkshrader` decides to exfiltrate secrets, the CI cannot stop it; the right protection there is GitHub's account-level security (2FA, hardware keys), not workflow design.

Every "do we need to defend against this?" decision is answered by asking: "is the attacker someone who can open a fork PR but cannot push to `main` directly?" If yes, defend. If no, don't.

### Positive Consequences

- The threat model is small enough to hold in one head, which means defenses are consistent across workflows.
- Decisions like "use `pull_request` not `pull_request_target`" and "pin checkouts to `base.sha`" follow mechanically from the model rather than from one-off security paranoia.
- We don't waste engineering effort on defenses (e.g. forking actions to specific SHAs, sandboxing every Claude call, requiring multiple approvals on maintainer commits) whose threat is out of scope.
- The model is the right shape for the actual attacker population: the project has no real-money assets, no PII, no user accounts — the only valuable target on the CI side is the maintainer's GitHub PAT-equivalent (the runner's `GITHUB_TOKEN`), and exfiltrating that requires a fork-PR shape.

### Negative Consequences

- A maintainer-account compromise is unmitigated by CI. The mitigation lives at the GitHub account level (2FA + hardware keys + `npm config set sign-git-commit true` for npm publishes if/when we publish). This must be re-stated whenever the project considers adding additional maintainers — the model would need to be revisited.
- A sophisticated supply-chain attack that bypasses the seven CI gates AND the Claude dep-review advisory could land in `main` and then execute on the next workflow run that does `pnpm install`. We mitigate via `--ignore-scripts` on every `pnpm install` (script execution is the dominant risk shape), via pnpm's default of not running dependency build scripts outside the `onlyBuiltDependencies` allow list, and via the Claude dep-review surfacing peer-dep / transitive changes. This is genuine residual risk; the alternative ("review every transitive bump manually") is not workable for a solo maintainer.

## Pros and Cons of the Options

### Option 1 — Fork PRs only

- **Good**, because it matches the actual attacker population for a public solo-maintained project.
- **Good**, because every defense follows mechanically from the model; we don't have to relitigate per workflow.
- **Good**, because it lets us trust the maintainer's tooling (`gh` CLI, local lint, etc.) without designing around a paranoid model.
- **Bad**, because adding collaborators in the future requires re-evaluating the model — the assumption "anyone with write access is trusted" stops holding when "write access" expands beyond one person.

### Option 2 — Fork PRs + maintainer compromise

- **Good**, because it's strictly stronger than Option 1.
- **Bad**, because the implementation is incoherent for a solo-maintained project: required reviews on every push means the maintainer can't merge their own work; hardware-key-only commits is reasonable but lives at the account layer, not the CI layer; CODEOWNERS-driven approval workflows require multiple humans.
- **Bad**, because most of the marginal protection it offers vs. Option 1 sits outside what CI workflows can enforce.

### Option 3 — Fork PRs + upstream supply chain

- **Good**, because it's the only model that defends against the "Dependabot bumps a transitive package that was just compromised" scenario.
- **Bad**, because the only honest implementation is "human review every transitive bump and every published version's full source," which is not workable for a solo-maintained project that wants to use Dependabot at all.
- **Bad**, because the Claude dep-review workflow (see [`claude-dependency-review.md`](claude-dependency-review.md)) already provides a weaker form of this defense as an advisory layer. Promoting it to a blocking layer would require either a much narrower set of trusted ecosystems or a much larger time budget for triage. Neither fits the project today.

## Implementation conventions

The model is enforced through these patterns, applied uniformly:

- **`permissions: contents: read` at workflow level.** Per-job permissions only widen this when a specific step needs more.
- **`persist-credentials: false` on every checkout.** No workflow step can later invoke `git push` with the runner's default token.
- **`--ignore-scripts` on every `pnpm install`.** Blanket protection against upstream lifecycle-script execution; matches the dominant supply-chain attack shape. Reinforced by pnpm's default of not building dependencies outside the `allowBuilds` map (`<pkg>: true`; v11's replacement for the old `onlyBuiltDependencies` list).
- **`pull_request`, never `pull_request_target`.** The canonical "pwn request" footgun is out of scope by construction.
- **Identity gates use `pull_request.user.login` rather than `github.actor`.** The former is the actual PR author; the latter can be influenced by the triggering event in fork-PR scenarios.
- **Checkouts pin to `pull_request.base.sha`, not the merge commit**, when the workflow's job is to analyze the PR's diff against pre-merge code. The merge commit would include the PR's changes and obscure what was actually being introduced.
- **Three-dot `git diff` (`base...head`), not two-dot.** Two-dot includes intervening main changes as phantom removals; three-dot returns only the PR's contribution.
- **Diff size caps fail closed.** A PR whose diff exceeds a sanity threshold declines automated review rather than feeding under-counted data into it.
- **Claude tool allowlists are minimal.** Default is `Read,Grep,Glob` (no `Bash`, `Edit`, `Write`, `WebFetch`). Widening is per-workflow, per-decision, documented inline.

## Follow-up

- If we ever add a second maintainer, re-evaluate the "anyone with write access is trusted" assumption. Either narrow it (introduce CODEOWNERS, require reviews on changes to `.github/workflows/`) or accept the residual risk explicitly.
- If we ever start publishing to npm, the threat model expands to cover the supply chain we're feeding into. The current model is purely consumer-side.
- Revisit when [`claude-dependency-review.md`](claude-dependency-review.md)'s "advisory only" stance no longer feels sufficient — if real-world Dependabot churn surfaces a malicious package that the seven gates + Claude's advisory comment didn't catch, that's signal to promote some Claude findings (peer-mismatch, license-drift) to blocking.

## Links

- [Synacktiv: GitHub Actions exploitation](https://www.synacktiv.com/publications/github-actions-exploitation-untrusted-input) — broader landscape; the `pull_request_target` patterns we deliberately avoid.
- [GitHub Docs: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) — the official guidance whose recommendations our conventions mostly track.
- [CI continuous-integration OVERVIEW](../OVERVIEW.md) — surface and conventions.
- [`claude-dependency-review.md`](claude-dependency-review.md) — the workflow whose design most heavily depends on this threat model.
- [`claude-code-action-pinning.md`](claude-code-action-pinning.md) — why we depart from "always pin to a SHA" for one specific action.
- MADR template: <https://adr.github.io/madr/>
