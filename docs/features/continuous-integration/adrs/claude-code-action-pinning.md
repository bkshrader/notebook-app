# Pin `anthropics/claude-code-action@v1` to a moving tag, not a SHA

- Status: accepted
- Date: 2026-05-25
- Deciders: Bradley Shrader
- Tags: ci, security, supply-chain, actions

## Context and Problem Statement

Three workflows in this project use `anthropics/claude-code-action@v1`: `claude.yml`, `claude-code-review.yml`, and `claude-dependency-review.yml`. The standard security-hardening guidance for third-party GitHub Actions — including [GitHub's own](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions) and most prominent independent guides (StepSecurity, ossf, the various "GitHub Actions security checklist" posts) — is **always pin to a full commit SHA**, like `anthropics/claude-code-action@a1b2c3d4...`.

The reasoning is real: a moving tag like `@v1` resolves to whatever commit the maintainer points it at _right now_. If `anthropics/claude-code-action`'s maintainer account is compromised, an attacker can force-push a new commit and re-point `v1` to it. Every workflow run after that picks up attacker-controlled code with the same trust we extended to the legitimate action.

But pinning to a SHA has a real cost too: the action stops receiving security patches between manual updates. The maintainer of THIS project has to remember to re-pin periodically, evaluate diffs, and bump. That manual cadence is the rate-limiting factor for getting security fixes into our CI.

For most third-party actions, the SHA-pin tradeoff is correct: the action is published by a small team or individual, the upstream maintainer is one compromise away from owning your CI, and the upstream churn is slow enough that "manual bumps every few months" works. For `anthropics/claude-code-action` specifically, neither of those things is true.

## Decision Drivers

- The threat model is [malicious fork PRs, not malicious collaborators or upstream supply chain](ci-threat-model.md). Upstream-action compromise IS in the broader supply-chain class that the model deliberately leaves out of scope — but a compromised Claude action would have access to OIDC tokens, which is more interesting to an attacker than "another supply-chain vector" suggests, so it's worth thinking through explicitly rather than reflexively.
- This is a solo-maintained project. The cost of "remember to manually re-pin SHAs every few months" is real and the failure mode (forgetting and falling behind on security patches) is genuine.
- The action in question is published by Anthropic, the same vendor whose API we're calling via the action. If Anthropic's GitHub org is compromised, the action being SHA-pinned doesn't help us much — the attacker can still ship a malicious `claude-code` CLI version, a malicious Sonnet model, etc. The trust we extend to Anthropic-the-company is upstream of the trust we extend to one specific commit hash.
- Anthropic's GitHub org has the operational maturity of a large vendor (real security team, account-protection practices, public security policy). The "small-team-one-compromise" risk model doesn't fit.
- The action is updated frequently with security patches and feature improvements. Falling behind has a real cost.

## Considered Options

1. **Pin to a specific SHA, manually update on a calendar cadence.** Standard advice.
2. **Pin to a major version tag (`@v1`), accept that it's a moving reference.** Current choice.
3. **Pin to a SHA, automate updates via Dependabot.** Dependabot supports github-actions ecosystem; it would open PRs for SHA bumps.
4. **Fork the action to a project-owned repo, pin to a SHA on the fork, and manually pull from upstream.** Strongest trust-control; highest maintenance burden.

## Decision Outcome

Chosen option: **Option 2 — pin to `@v1`**.

The reasoning is that the standard "pin to SHA" advice is calibrated for a different threat model than ours. SHA-pinning protects against a specific shape of upstream-account-compromise where the attacker can re-point a tag but not break vendor-wide trust. For `anthropics/claude-code-action` specifically, the trust boundary is "Anthropic-the-company," not "a specific commit on the action repo." If Anthropic's GitHub org is compromised:

- The attacker can re-point `@v1` to a malicious commit (defeats `@v1`-pinning).
- The attacker can also publish a malicious version of `@anthropic-ai/claude-code` to npm (defeats `npm view`-style trust).
- The attacker can publish a malicious model card or steer requests to a malicious endpoint via the Claude GitHub App (defeats workflow-level SHA-pinning).

SHA-pinning narrows ONE of those windows. It doesn't narrow the others. And it adds a real cost: someone has to remember to bump.

The Anthropic-org-compromise scenario is bad enough that the marginal protection from SHA-pinning isn't load-bearing. The non-Anthropic-org-compromise scenarios (random commit by a confused maintainer; bug in a v1 release) are bounded by:

- Claude's tool allowlist in this project is read-only (`Read,Grep,Glob`). A buggy or malicious commit to `claude-code-action` would have to escape that allowlist to reach the runner's secrets — which is a separate trust boundary at the GitHub-Actions level.
- The OIDC token Claude mints is short-lived and scoped to the Claude GitHub App's installation permissions. A compromised action can't ask the App for permissions it wasn't granted.
- All three Claude workflows run on `pull_request` (not `pull_request_target`), so they execute in the PR's downgraded-token context. The blast radius of a compromised action is bounded by what that context allows.

The combination of "the attacker can compromise multiple Anthropic-owned trust paths simultaneously, so narrowing one doesn't help much" + "the per-workflow tool allowlist and OIDC scope bound the damage even if the action is compromised" + "the solo-maintainer cost of manual SHA bumps is high and the security-patch-flow benefit of staying current is real" makes Option 2 the right tradeoff for this project.

This decision should be revisited if any of those premises change. Notably: if we ever start running Claude with `Bash` or `Edit` in any workflow's allowlist, the bounded-blast-radius argument weakens substantially and SHA-pinning would become more attractive.

### Positive Consequences

- We receive security patches to `claude-code-action` automatically, in line with our security-patch SLA being "whenever upstream ships."
- No manual SHA-bump cadence to maintain. One less calendar reminder for the solo maintainer.
- The action's documented usage pattern (`@v1`) matches ours, so when we copy snippets from Anthropic docs we don't have to remember to re-pin.

### Negative Consequences

- An Anthropic-org compromise that re-points `@v1` to a malicious commit would land in our CI on the next workflow run with no warning. The mitigations are the per-workflow allowlist and the OIDC scope, both already in place, but neither prevents the action from doing whatever the workflow's `permissions:` block grants it (which for the dep-review workflow includes `pull-requests: write`).
- The decision is unconventional and looks careless on a security-review surface scan. This ADR exists primarily so a future reviewer (or a future maintainer) can find the reasoning rather than reflexively "fixing" it to a SHA.
- Re-evaluating the decision requires re-evaluating the bounded-blast-radius argument, which means re-checking every workflow's `claude_args` and `permissions:` block. The decision is bound up with how the rest of the Claude surface is configured.

## Pros and Cons of the Options

### Option 1 — Pin to SHA, manual updates

- **Good**, because it follows standard security-hardening advice; passes any reflexive security-scanner check.
- **Good**, because it narrows the upstream-account-compromise window for this specific dependency.
- **Bad**, because the manual update cadence will slip on a solo-maintained project. Falling behind on security patches is a real cost.
- **Bad**, because the protection it offers is narrow relative to the broader Anthropic-vendor trust we're extending. The attacker who can re-point `@v1` can also poison `@anthropic-ai/claude-code` npm or the Claude GitHub App — SHA-pinning narrows one window of many.

### Option 2 — Pin to major version tag `@v1` (chosen)

- **Good**, because security patches arrive automatically.
- **Good**, because the cost matches the actual marginal protection: standard advice assumes a small-team upstream, which doesn't fit Anthropic.
- **Good**, because the per-workflow allowlist and OIDC scope already bound the blast radius of a compromised action.
- **Bad**, because it depends on Anthropic's vendor-level security posture remaining roughly current. If their GitHub org has a public incident, we should react.
- **Bad**, because it looks careless on a quick review; requires this ADR to explain.

### Option 3 — Pin to SHA, Dependabot auto-bump

- **Good**, because SHA-pinning's protection IS preserved (Dependabot opens a PR with the new SHA; the merge is gated on review).
- **Good**, because the manual cadence problem is solved by automation.
- **Bad**, because Dependabot bumps land in the maintainer's review queue weekly, each one requiring "skim the diff between SHAs" to be worth anything. The maintainer's marginal benefit per bump is low (it's the same Anthropic-published action, just at a different commit).
- **Bad**, because if the bumps are auto-merged (e.g. via a Dependabot-merge-bot pattern), the security benefit of SHA-pinning evaporates — the attacker who re-points `@v1` is the same attacker who could ship a new SHA Dependabot would auto-bump to. Manual review is the whole point; making it automatic defeats the protection.
- **Bad**, because adds another moving piece to the dep-review workflow's own dep-bump churn (recursive).

### Option 4 — Fork to project-owned repo, pin to SHA on fork

- **Good**, because it's the only option that truly decouples our trust from Anthropic's GitHub-org operational security.
- **Good**, because it gives the maintainer veto power over upstream changes.
- **Bad**, because the maintenance cost is huge. A pre-implementation solo-maintained project has no budget for hand-maintaining a fork of a first-party CI action that ships frequent updates.
- **Bad**, because divergence from upstream tends to compound. Once we miss one upstream update, the next merge is harder; eventually we've effectively re-implemented the action.
- **Bad**, because if we're going to fork anything to a project-owned trust path, the action's plugin marketplace (`plugin_marketplaces: 'https://github.com/anthropics/claude-code.git'` in `claude-code-review.yml`) is the higher-value target — that's actually unpinnable today.

## Related: `plugin_marketplaces` is also unpinnable

`claude-code-review.yml` uses the `plugin_marketplaces` + `plugins`
inputs to load the `code-review` plugin from
`https://github.com/anthropics/claude-code.git`. As of writing, there
is no version-pinning syntax for either input — they resolve fresh
from the marketplace's default-branch HEAD on every workflow run.

This is a second moving-reference trust assumption with the same
shape as the action-tag one, and the same reasoning applies: the
trust boundary is Anthropic-the-company, not a specific commit on the
marketplace repo. The escape hatch (if Anthropic ever does something
that requires us to depart from this) is to fork
`anthropics/claude-code` and point `plugin_marketplaces` at the fork
at a known-good ref. Currently the fork's maintenance burden does not
justify itself.

Same revisit triggers as Option 2 above: an Anthropic-org compromise,
a tool-allowlist widening, or any change to the Anthropic-vendor
trust posture.

## Follow-up

- If Anthropic publishes a security incident affecting their GitHub org or the `claude-code-action` repo, flip this decision: pin to the last-known-good SHA immediately, then re-evaluate when the dust settles.
- If any Claude workflow ever widens its tool allowlist to include `Bash`, `Edit`, `Write`, `WebFetch`, or arbitrary `Read` outside `$GITHUB_WORKSPACE`, re-evaluate. The bounded-blast-radius argument here weakens substantially when the tools are broader.
- If we ever publish to npm or take on additional maintainers, the cost-benefit calculation changes (more secrets at stake, more humans to coordinate SHA bumps with) and SHA-pinning may become the right choice.

## Links

- [GitHub Docs: Using third-party actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions) — the standard "pin to SHA" advice.
- [Anthropic: claude-code-action](https://github.com/anthropics/claude-code-action) — the action itself.
- [CI threat model](ci-threat-model.md) — the broader model this decision sits inside.
- [Claude dependency review](claude-dependency-review.md) — the workflow that uses this action with the tightest tool allowlist (`Read,Grep,Glob`).
- [Continuous integration OVERVIEW](../OVERVIEW.md)
- MADR template: <https://adr.github.io/madr/>
