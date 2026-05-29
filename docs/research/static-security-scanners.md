# Static Security Scanners — Cursory Research

A narrow shallow comparison of **CodeQL** and the **Snyk free tier** as candidates for a SAST/SCA CI gate on this AGPL-3.0-or-later, TypeScript/Electron repo. The scope is deliberately narrow — two tools, with a verdict — not a survey of the whole SAST landscape. CI already gates on `npm audit --audit-level=high` and `license-check`; the open question is whether to add a deeper SAST scanner and, if so, which.

**Framing question:** the repo is public and hosted on GitHub.com today, but we want to keep our options open to **(a)** take it private later, or **(b)** move to a different forge (Codeberg, sr.ht, self-hosted Forgejo, GitLab). The comparison below is structured around how each tool behaves under each of those scenarios, because the "free today" picture is misleading: one of these two tools costs nothing today specifically because the repo is public-on-GitHub, and the other doesn't care where the repo lives.

**A note on what "compatibility" means here:** these are **build tools that operate on our code**, not libraries our code operates on. Neither binary is linked into or redistributed with the shipped Electron app, so AGPL-compatibility in the strict redistribution sense is **not a requirement** for this category — a proprietary CLI used only at CI time doesn't taint our distribution any more than running the proprietary GitHub Actions runner does. A fully-open-source toolchain would be nice on principle, but it's not a charter constraint here.

What actually matters per tool is therefore narrower:

1. **Are we permitted to run it** for our use case under its own EULA?
2. **Does anything it produces land in our repo** in a form that _would_ have to clear `license-check` — e.g. vendored queries, rule packs, generated config?

The verdict labels below — **Compatible / Conditional / Incompatible** — speak to question 1 (permission to run), not redistribution. "Conditional" means an EULA carve-out, a usage cap, or a proprietary data dependency worth flagging, not that the tool is unusable.

---

## 1. CodeQL

- **[github/codeql](https://github.com/github/codeql)** — The query suites and standard library that drive CodeQL analysis. **License: MIT — Compatible.** This is the one piece of CodeQL that actually _would_ land in our repo if we wrote or vendored custom queries, and MIT passes `license-check` cleanly. **The MIT queries are portable** — they can be run by any compatible engine, including non-Microsoft re-implementations, on any forge.
- **[github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries)** — The actual analyzer binary that runs the queries. **License: proprietary "GitHub CodeQL Terms and Conditions" — Conditional.** The CLI is **not open source**. Its EULA carves out free use only when **both** of these are true: the codebase is open-source (OSI-licensed), **and** it is hosted and maintained on GitHub.com. Paraphrased from the Terms: you may generate CodeQL databases for or during automated analysis, CI, or CD of an "Open Source Codebase" **if that codebase is hosted and maintained on GitHub.com**. Both conditions are load-bearing — failing either voids the grant unless you buy GitHub Advanced Security.

**What this means for our exit scenarios:**

- **Repo stays public, stays on GitHub.com:** CodeQL is free. Today's situation.
- **Repo goes private on GitHub.com:** CodeQL is no longer free. GHAS is the only legal way to keep using it; GHAS pricing is per-active-committer per month, currently in the tens-of-dollars-per-seat range — overkill for a solo project.
- **Repo moves to a non-GitHub forge (public or private):** CodeQL is no longer free even if the code stays open-source. The "on GitHub.com" condition fails on its own. GHAS is not sold for non-GitHub-hosted code at all — so this scenario means CodeQL is effectively unavailable, not just expensive.
- **Self-hosted GitHub Enterprise Server:** counts as GitHub.com for EULA purposes if you have GHAS; otherwise out.

**What it scans:** SAST only — source-level vulnerability dataflow. It is **not** an SCA / dependency scanner, not a secret scanner, not a container scanner. Those overlap with other GitHub features (Dependabot for SCA, secret scanning as a separate product) that we already get for free on public repos.

**Languages (2026):** C/C++, C#, Go, Java/Kotlin, JavaScript/TypeScript, Python, Ruby, Swift, GitHub Actions. Rust in public preview. JS/TS support is generally considered the strongest signal-to-noise SAST available for that ecosystem; the queries are auditable (MIT) when triaging false positives.

**Integration:** CodeQL is the engine behind GitHub Code Scanning. For public repos on github.com, code scanning with CodeQL is free with no documented per-repo scan-frequency cap beyond the (already generous) free Actions minutes. The CLI also runs locally without a GitHub account, useful for a pre-push gate if we ever want one.

**Local-first posture:** runs in CI on GitHub-hosted runners. Source never leaves GitHub's infrastructure — and the repo is public anyway, so this is a non-issue.

## 2. Snyk (free tier)

- **[snyk/cli](https://github.com/snyk/cli)** — The Snyk command-line client. **License: Apache-2.0 — Compatible.** Fine as a CI dependency; not bundled into the app.
- **Snyk Vulnerability DB ("Snyk Intel")** — The actual data the CLI queries. **License: proprietary — Conditional.** Queried via API at scan time. Redistribution is prohibited by Snyk's ToS. As a CI-time API query it doesn't taint our distribution (we don't redistribute the DB), but it does mean every scan requires network access to Snyk's servers and a Snyk account.

**What this means for our exit scenarios:**

- **Snyk does not care where the code lives or whether it is public.** The Snyk free tier evaluates a project by scan volume (the monthly test caps), not by forge or visibility. Private repos and non-GitHub forges are first-class on the free tier.
- **GitHub Action vs. CLI:** the [snyk/actions](https://github.com/snyk/actions) wrapper is GitHub-specific, but the underlying `snyk` CLI is just a command — it runs from any CI runner (GitLab CI, Codeberg Woodpecker, Forgejo Actions, sr.ht builds, a local pre-push hook). Migrating CI configs is a small lift; the scanner itself moves with you.
- **Free tier is per-org, not per-repo.** The 100 SAST tests/month cap applies across all projects in your Snyk org — if multiple repos share that budget, the cap bites harder. For a solo developer with one active repo, the caps are generous.

**What's in the free tier (snyk.io/plans, retrieved 2026-05-26):** 200 Open Source (SCA) tests/month, 100 Snyk Code (SAST) tests/month, 100 Container tests/month, 300 IaC tests/month. Unlimited "contributing developers." Excludes license compliance, SBOM generation, and automated fixes. A Snyk account login is mandatory; the CLI requires authentication for cloud-backed scans.

**The local-first caveat — Snyk Code (SAST) uploads source.** Per Snyk's docs, the default `snyk code test` deployment sends source code to Snyk's SaaS for DeepCode-AI analysis. A no-upload "Snyk Code Local Engine" exists but is an **enterprise-tier** feature, not available on the free tier. **Snyk Open Source (SCA) sends only the dependency manifest, not source** — that scan mode is fine. The SaaS source upload is not a confidentiality breach for a public repo, but it is a philosophical mismatch with the project's local-first stance.

**Integration:** Official [snyk/actions](https://github.com/snyk/actions) GitHub Action (Apache-2.0). Posts PR checks on the free tier. SARIF upload to GitHub code scanning is supported, so findings can surface in the same UI as CodeQL results.

**JS/TS reputation:** Snyk Open Source is well-regarded for broad ecosystem coverage of npm advisories — comparable to GitHub Advisory Database (which Dependabot uses). Snyk Code is competitive since the DeepCode acquisition but is widely reported to have a higher false-positive rate than CodeQL on JS/TS, with faster scans and friendlier remediation suggestions as the trade-off.

---

## Summary

**Licensing surprises / "looks open, isn't" traps:**

- **CodeQL CLI** — The CLI binary is **not** open source, despite the MIT-licensed query suites in `github/codeql`. The EULA carves out free use only for the conjunction of (a) an open-source codebase **and** (b) hosting on GitHub.com. Going private or moving forges breaks the carve-out independently — both conditions must hold.
- **Snyk Vulnerability DB** — The CLI is Apache-2.0, but the **data** it queries is proprietary and not redistributable. Doesn't affect our shipped app, but it does mean the scanner's value is bound to Snyk's continued willingness to offer a free tier.

**Scanner behavior under the exit scenarios you actually care about:**

| Scenario                        | CodeQL                                         | Snyk free tier  |
| ------------------------------- | ---------------------------------------------- | --------------- |
| Public on GitHub.com (today)    | Free                                           | Free, with caps |
| **Private on GitHub.com**       | Requires paid GHAS                             | Free, with caps |
| **Public on non-GitHub forge**  | Not available (or paid GHAS, where applicable) | Free, with caps |
| **Private on non-GitHub forge** | Not available (or paid GHAS, where applicable) | Free, with caps |

Snyk is **forge-agnostic and visibility-agnostic.** CodeQL is neither.

**A third option worth flagging given the framing:** if portability is the actual goal, neither of these two is the textbook answer. **[Semgrep](https://github.com/semgrep/semgrep)** — engine LGPL-2.1, community rules LGPL-2.1 — runs anywhere, has no per-month cap, no account requirement, no SaaS upload, and works on any forge. Its JS/TS signal-to-noise is widely considered weaker than CodeQL's, but for a solo-maintained project where the alternative is "no SAST after migration," Semgrep is the option that doesn't disappear when the forge or visibility changes. A `/research deep semgrep` is worth running if portability moves from option to plan.

**Recommendation for this project, given the new framing:**

- **For today (public on GitHub.com): run CodeQL.** It is genuinely the strongest free option here, and the cost of using it is zero. Pair with Dependabot (SCA) and GitHub secret scanning, both free on public repos.
- **But treat CodeQL as a tool you're renting, not owning.** Don't write custom CodeQL queries you wouldn't be willing to throw away. Don't let CodeQL findings become the only mechanism by which a class of bug is caught — keep CI's `npm audit`, `license-check`, and lint/typecheck gates carrying their own weight independently. If you write custom queries, store them in this repo (the MIT query language is portable) so a future Semgrep migration is rewriting rules, not re-discovering them.
- **For the private-or-different-forge future: Snyk free tier is the pragmatic short-term fallback, Semgrep is the long-term fit.** Snyk works immediately in any of the exit scenarios, but the dependency on Snyk's free-tier policy is a risk in its own right (free tiers shrink). Semgrep removes the vendor dependency entirely; the cost is a noisier scanner and more triage time. The decision between them on the day of the migration is "do I want to migrate twice (CodeQL → Snyk → Semgrep) or once (CodeQL → Semgrep)?"
- **Don't run both CodeQL and Snyk concurrently.** Doubling up SAST scanners multiplies false positives faster than it improves true-positive coverage. Pick one for today, plan the migration trigger explicitly.

**Migration triggers to write down somewhere durable** (the project ROADMAP or an ADR is the right home, not memory):

- If the repo goes private on GitHub.com → swap to Snyk or Semgrep within the same PR that flips visibility; don't leave a CodeQL run that's silently in EULA breach.
- If the repo moves to a non-GitHub forge → same, in the migration PR.
- If GitHub changes the CodeQL EULA's open-source carve-out → reassess immediately.
