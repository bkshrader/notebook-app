# Effect — TypeScript effect system, and the "vendor-the-source" agent workflow

- **GitHub repo:** <https://github.com/Effect-TS/effect>[^repo]
- **Project website / docs:** <https://effect.website/> · <https://effect.website/docs/>[^site]
- **License (code):** MIT[^license-file]
- **Companion repos researched:** [`Effect-TS/tsgo`](https://github.com/Effect-TS/tsgo) (MIT — the Effect Language Service ported onto Microsoft's native compiler)[^tsgo] and [`microsoft/typescript-go`](https://github.com/microsoft/typescript-go) (Apache-2.0 — the "TypeScript 7" native compiler the above wraps).[^msgo]
- **AGPL-compatibility verdict:** **Compatible.** `effect` is MIT ("Copyright (c) 2023 Effectful Technologies Inc"), a permissive one-way-compatible license that links cleanly into our AGPL-3.0-or-later app — identical posture to CodeMirror. The `@effect/*` ecosystem packages publish under MIT as well. `tsgo` is MIT; the underlying `microsoft/typescript-go` is Apache-2.0 — both are build-time _tooling that operates on our code_, not shipped code, so the relevant test is permission-to-run (granted), not redistribution-linking. No copyleft trap on any of the three.

---

## TL;DR / verdict up front

**Don't adopt the `effect` runtime library now. Do adopt the blog post's workflow now — it is free, library-agnostic, and unrelated to whether we ever use Effect.**

The user pointed at three things and they are _not the same decision_:

1. **The `effect` library itself** — a large, excellent, MIT-licensed effect system (typed errors, dependency injection, structured concurrency). Adopting it is a real architecture commitment with a real learning curve. **Defer** it to a future decision scoped to our genuinely-effectful surfaces (sidecar IPC, BYO-AI client), made with an ADR — not a v1-wide foundational bet.
2. **The "one weird git trick" blog post** — despite the Effect branding, its actual content is a **library-agnostic agent workflow**: vendor a dependency's _source code_ into your repo with `git subtree --squash` so the coding agent can read idiomatic usage, while never importing from it. This is **completely decoupled** from adopting Effect at runtime, costs nothing but repo size, and works for _any_ dependency. **Adopt the technique now** where it helps (CodeMirror 6 is the obvious first candidate, not Effect).
3. **`Effect-TS/tsgo`** — _not_ a compiler fork and _not_ what makes the blog trick work. It's the **Effect Language Service** repackaged to run inside Microsoft's native TypeScript compiler (`@typescript/native-preview`). It is **Alpha**, Effect-specific, and only useful _if_ we write Effect code. Irrelevant unless/until we adopt the library. The genuinely reusable fast-typecheck win is Microsoft's `tsgo` (`@typescript/native-preview`) directly — and that's its own evaluation, not this one.

The marketing fuses these so the workflow's appeal rubs off on the library. Keep them separate.

_Researched 2026-05-30._

---

## What it is

[Effect](https://effect.website/docs/) (`effect` on npm) is a TypeScript library that adds an **effect system** to the language. Instead of functions returning `Promise<T>` and throwing arbitrary values, you write functions returning `Effect<Success, Error, Requirements>`, where the type tracks three channels:[^effect-type]

- **`Success` (A)** — the value produced on success. `void` means "no useful value"; `never` means it never succeeds.
- **`Error` (E)** — the _expected, typed_ failures. `never` here means the effect cannot fail. This is the headline difference from `Promise`, which erases its rejection type to `unknown`. The docs put it: _"Effect's major unique insight is that we can use the type system to track errors and context, not only success values."_[^why-effect]
- **`Requirements` (R)** — the contextual services the effect needs, stored in a `Context` collection. The compiler will not let you _run_ an effect until every requirement in `R` has been provided. `never` means no dependencies. This is statically-checked dependency injection.[^effect-type]

The compiler accumulates `E` and `R` as you compose effects, so a finished pipeline's signature states the complete set of possible failures and the complete set of services it needs.[^effect-type] Around that core sits a large standard library: structured concurrency and fibers, interruption/cancellation, retry/scheduling, resource management (`Scope`), a `Layer` system for wiring dependencies, observability, and a schema module for runtime validation with static types. It is closer to "a runtime and standard library for TypeScript" than to a utility package — the lineage is ZIO / Cats-Effect from Scala, which is where the principal author (Michael Arnaldi / Effectful Technologies) came from. The team explicitly frames it as _"the missing standard library for TypeScript,"_ a positioning that has drawn both enthusiasm and pushback.[^criticism]

What it is **not**: a UI library (it renders nothing), a small focused utility, or something you sprinkle on. Its benefits accrue where code is _written in_ the Effect style.

## How to use it

```bash
pnpm add effect
```

Effect is ESM-first and the docs describe it as tree-shakeable: _"Effect is tree-shaking friendly so you'll only include what you use,"_ with a stated _"minimum cost \[of] about 25k of gzipped code"_ for the runtime + core.[^myths] Latest stable is **`effect@3.21.2`** (2026-04-22); the `effect` 3.x line is the current stable series.[^releases]

You write effects and compose them with the library's combinators rather than `async`/`await`:

```ts
import { Effect } from 'effect';

// Effect<number, FetchError, HttpClient>
const program = Effect.gen(function* () {
  const client = yield* HttpClient; // pull a service from R
  const body = yield* client.get('/notes'); // typed error joins E
  return body.length;
});
```

Boundaries to the non-Effect world are explicit: `Effect.promise` / `Effect.tryPromise` lift a `Promise` _in_, and `Effect.runPromise` / `Effect.runSync` run an effect back _out_. Adoption can be incremental at these boundaries — but the more you island it, the more you pay a "two worlds" conversion tax and the less of the type-level benefit you keep. The docs counter the all-or-nothing fear directly: you _"can safely start using Effect knowing just 10-20 functions and progressively discover the rest."_[^myths]

## The blog post: "the one weird git trick" — what it actually says

The post the user flagged — [_"The one weird git trick that makes coding agents more Effect-ive"_](https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/), by **Maxwell Brown, 2026-05-11** — has a misleading title. The "trick" is **not** about Effect's type system being a better oracle. It is a **library-agnostic vendoring workflow**:[^blog]

1. **Vendor the dependency's source into your repo with `git subtree`:**
   ```bash
   git subtree add  --prefix=repos/effect https://github.com/Effect-TS/effect.git main --squash
   git subtree pull --prefix=repos/effect https://github.com/Effect-TS/effect.git main --squash
   ```
   `--squash` collapses the imported history into one commit so you don't inherit thousands of upstream commits.[^blog]
2. **Point the coding agent at it** via `AGENTS.md`: _"When writing Effect code, inspect @repos/effect/ for examples of idiomatic usage, tests, module structure, and API design."_[^blog]
3. **Exclude it from your own tooling** so it never leaks into builds or autocomplete — `.vscode/settings.json` excludes `repos/**` from `autoImportFileExcludePatterns` and search.[^blog]
4. **Never import from it.** The post is explicit: _"Do not import from @repos/ - application code should continue importing from normal package dependencies."_[^blog]

The rationale: _"Documentation usually explains what an API does but not how it is actually used across a codebase. Coding agents rely on patterns and examples, not descriptions."_ So you give the agent the real source as a reading corpus.[^blog]

**Two facts make this decisive for our decision:**

- **It is explicitly not Effect-specific.** The post says so: _"this approach isn't specific to Effect - it works for any external software your application depends on."_[^blog] Effect is just the example, because the Effect team fields a lot of "is AI-written Effect any good?" questions.
- **It is entirely separable from runtime adoption.** You vendor the source as _reference only_; you never import it; your app's dependencies are unchanged.[^blog] So "set up Effect for the workflow benefit alone" is a category error — the workflow benefit has nothing to do with the `effect` package being a dependency. You'd get the identical benefit vendoring CodeMirror's source.

The author names the cost honestly: _"Vendoring repositories does increase the size of your project, and you take on a bit of responsibility for keeping them up to date. It's not free."_[^blog]

## `Effect-TS/tsgo`: what it is, and what it is not

The user linked [`Effect-TS/tsgo`](https://github.com/Effect-TS/tsgo) alongside the blog. It is widely misread (I misread it on a first pass), so to be precise from its README:[^tsgo-readme]

- It is **"A wrapper around TypeScript-Go that builds the Effect Language Service, providing Effect-TS diagnostics and quick fixes."** It targets **Effect v4** (codename "smol") primarily, and also v3.
- It is **not** a fork of the compiler. It rides on **Microsoft's `typescript-go`** — the Go-based native TypeScript compiler (`tsgo`, shipped as `@typescript/native-preview`) that is the basis of the forthcoming **"TypeScript 7."**[^msgo-blog] Its README notes you _"still need the standard native TypeScript install (`@typescript/native-preview`) alongside `@effect/tsgo`."_[^tsgo-readme]
- It is **Alpha**: _"The TypeScript-Go version of the Effect LSP should be considered in Alpha. Expect breaking changes between releases."_ Created 2026-03-11; 109★.[^tsgo]
- What it actually does is **Effect-aware diagnostics** — a long table of lints like `missingEffectError` (unhandled error types in the `E` channel), `missingEffectContext` (unhandled `R` requirements), `floatingEffect` (an effect neither yielded nor run), and dozens more.[^tsgo-readme] These are _only meaningful if your code is written in Effect._ For a codebase with zero Effect, `@effect/tsgo` does nothing.

So `tsgo` is **not the thing that makes the blog trick work**, and it is **not a reusable fast-typecheck win for us** — it's an Effect-specific linter gated behind adopting the library. The genuinely reusable speed story is _Microsoft's_ native compiler (`@typescript/native-preview`, ~10× faster type-checks, early-2026 GA target, still preview),[^msgo-blog] which is its own evaluation independent of Effect and worth a separate look for the agent loop and CI.

## Relevance to a note-taking app

**The library, if we ever adopt it,** would earn its keep only at surfaces that don't exist yet in this pre-v1 repo (the tree today is tooling, tokens, and a Storybook scaffold — essentially no runtime code, little async, no IPC):

- **Sidecar IPC** (faster-whisper, Supertonic, MathJax/SRE): typed errors plus first-class **interruption/cancellation** across process boundaries is exactly Effect's wheelhouse — cancel an in-flight transcription, retry a flaky sidecar, time out a hung process, all type-tracked.
- **BYO-AI client** (OpenAI-compatible endpoint per profile): a typed `E` channel for network/auth/rate-limit/malformed-response, plus Effect's schema module for validating responses, is a clean fit.
- **File/storage layer:** `Scope`-managed file handles and typed filesystem errors.

But v1 is "plain-text Markdown on CodeMirror 6 + `.md` files on disk + organization + the a11y baseline." **Adopting an effect system before there is an effectful runtime to model is solving a problem we don't have yet.** It is far easier to introduce Effect later, scoped to the IPC/AI layer, than to unwind a premature v1-wide commitment.

**Accessibility:** Effect is a non-UI runtime library — no DOM, no rendered output, so **no direct WCAG surface** either way. The only second-order consideration is mild and indirect: Effect is a heavy idiom every contributor (and the coding agent) must learn, and this project explicitly prizes low cognitive load and predictable, legible structure (ADHD-first UX — applied here to the codebase, not the user). Effect's style is the opposite of "boring TypeScript a new contributor reads on day one." That's a contributor-experience cost, not a user a11y cost, but worth naming for a project with these values.

**Local-first:** Effect makes no network calls and has no telemetry; neutral on this axis.

**The blog workflow, by contrast, is immediately relevant and a11y-neutral.** Our strongest v1 dependency is **CodeMirror 6**, whose idiomatic usage (decorations, transactions, view plugins, accessibility patterns) is exactly the kind of "patterns not descriptions" knowledge the post argues agents lack. Vendoring `repos/codemirror` (or the specific `@codemirror/*` packages) as agent-readable source would plausibly improve agent output on our editor work far more than vendoring Effect would, since we _write_ CodeMirror code and don't write Effect code.

## Things to know

### Maturity & activity signals

- **`effect`:** 14,452★, 580 forks, 552 open issues; created 2019-11-13, last push 2026-05-19.[^repo] Latest stable **`effect@3.21.2`** (2026-04-22), with the broad `@effect/*` ecosystem (`platform`, `sql`, `rpc`, `cluster`, `workflow`, `ai-openai`, …) releasing in lockstep through April 2026.[^releases] This is a **mature, actively-developed** core.
- **Contributors:** Concentrated but not a one-person project — top contributors `mikearnaldi` (2,301), `tim-smart` (1,407), `gcanti` (1,312), then a real long tail.[^contributors] Backed by **Effectful Technologies**, a funded company built around the library, so bus factor is healthier than most projects this ambitious.
- **`Effect-TS/tsgo`:** 109★, created 2026-03-11, last push 2026-05-31, **Alpha**.[^tsgo]
- **`microsoft/typescript-go`:** 25,559★, Apache-2.0, active; the TS7 native compiler, **early-2026 release target, still preview** (not yet full parity, not the default `tsc`).[^msgo][^msgo-blog]

The risk profile is the inverse of abandonment: a **mature, fast-moving, opinionated platform** with a younger, experimental edge (`tsgo` alpha; v4/"smol" in flight). Major-line API churn has happened historically — expect the v3→v4 transition to require migration (the `@effect/tsgo` `outdatedApi` lint exists precisely to flag v4-removed APIs).[^tsgo-readme]

### Performance & bundle size

The docs' "Myths" page addresses the common objections head-on: the "500x slower" benchmark _"compares trivial operations (raw math)"_ not realistic app workloads; internals are _"not built on generators"_ (generators are only the surface API mimicking async/await); minimum footprint is _"about 25k of gzipped code,"_ and it's _"tree-shaking friendly so you'll only include what you use."_[^myths] These are the vendor's own claims — credible directionally, but verify the _actual_ installed/bundled size against our build at adoption time rather than trusting marketing.

### Learning curve

This is the dominant adoption cost and the most-cited criticism. Community write-ups note the _"code is more complex than the one without Effect ... not as simple as writing plain TypeScript,"_ and that the _"learning curve has a few sharp edges."_ The _"missing standard library"_ positioning itself draws pushback as _"extremely off-putting."_[^criticism] The docs' rebuttal — productive with _"just 10-20 functions"_ — is fair but doesn't erase the fact that it is a _new programming model_, not an API, and every future contributor (and the agent, which is far more practiced on plain async TS) pays it. The blog post's implicit counter is "the agent learns Effect from vendored source" — plausible, but unproven for _our_ agent on _our_ tasks, and again that benefit is workflow, not library.

### Security / telemetry

No telemetry, no network calls, no install-time build scripts of note observed; MIT with standard warranty disclaimer.[^license-file] Standard supply-chain hygiene applies (it's a large dependency surface via `@effect/*` if you pull those), but nothing exotic.

---

## Alternatives considered

- **Plain strict TypeScript + a tiny `Result` type (e.g. `neverthrow`)** — if the _only_ goal is typed errors at boundaries, a small `Result`/`Either` gets ~80% of the "errors-in-the-type" benefit at ~1% of the conceptual cost, with no runtime model to learn. Strong default for the AI client and sidecar boundaries when we reach them. (Evaluate its license/health at that time.)
- **A standalone schema/validation library** for runtime validation of AI/sidecar payloads — you can get schema-validated parsing without buying the whole Effect runtime. Effect's schema module is excellent but couples you to Effect.
- **Just the blog workflow, no `effect` dependency (recommended now).** Adopt the vendoring technique for the dependencies we _actually write against_ (CodeMirror 6 first), wire the `AGENTS.md` pointer and tooling-exclusions, and skip the library entirely until there's a runtime reason. This captures the post's real value with none of Effect's cost.
- **Microsoft `tsgo` (`@typescript/native-preview`) as a fast advisory typecheck** in the agent loop / CI — independent of Effect, ~10× faster, but pre-GA, so use as _advisory_ with stock `tsc` remaining the authoritative gate. Worth a separate evaluation; not part of the Effect decision.

---

## Summary of fit

**Effect the library: defer, don't adopt now.** It is genuinely good — MIT, AGPL-compatible, actively maintained, well-designed — and a legitimate future choice for the **sidecar IPC** and **BYO-AI** layers, where typed errors, cancellation, retries, and statically-checked DI pay for the learning curve. But none of those layers exist yet, and committing a pre-v1, accessibility-and-legibility-first codebase to a heavy effect-system idiom on the strength of a marketing-titled blog post would be a textbook premature abstraction. When the effectful surfaces materialize, revisit it deliberately — weighed against a lightweight `Result` type for the same typed-error win at a fraction of the cost — and write an ADR capturing "why here, why now."

**The "git trick": adopt the technique now, decoupled from Effect.** Read past the title and it's a library-agnostic way to make coding agents write more idiomatic code by vendoring dependency _source_ (`git subtree --squash`) as read-only reference, never imported. It costs only repo size, has zero relation to whether we use Effect at runtime, and its highest-value target for us is **CodeMirror 6**, not Effect, because that's the code our agents actually write. There is **no** standalone "set up Effect for the workflow benefit" — that benefit isn't tied to the library at all.

**`Effect-TS/tsgo`: ignore for now.** It's an Alpha, Effect-specific language-service add-on that only does anything once you write Effect code; it is not the compiler and not the thing that powers the blog trick. If we want the fast-typecheck win, that's Microsoft's `@typescript/native-preview`, evaluated on its own.

---

[^repo]: GitHub API `repos/Effect-TS/effect`, retrieved 2026-05-30: stars 14,452, forks 580, open issues 552, created 2019-11-13, last push 2026-05-19, default branch `main`, SPDX `MIT`.

[^site]: <https://effect.website/> and <https://effect.website/docs/>, retrieved 2026-05-30.

[^license-file]: `LICENSE` at `Effect-TS/effect`, fetched via the GitHub Contents API and base64-decoded 2026-05-30; full text begins "MIT License / Copyright (c) 2023 Effectful Technologies Inc" — verified directly, not from the sidebar badge.

[^tsgo]: GitHub API `repos/Effect-TS/tsgo`, retrieved 2026-05-30: SPDX `MIT` (`LICENSE` decoded: "MIT License / Copyright (c) 2026 Effect"), stars 109, created 2026-03-11, last push 2026-05-31, not a fork (`fork=false`, no parent).

[^msgo]: GitHub API `repos/microsoft/typescript-go`, retrieved 2026-05-30: SPDX `Apache-2.0`, stars 25,559, last push 2026-05-30.

[^effect-type]: Effect docs, "The Effect Type" — <https://effect.website/docs/getting-started/the-effect-type/>, retrieved 2026-05-30. `Effect<Success, Error, Requirements>`; Success/Error/Requirements channel definitions and compiler accumulation of E/R quoted/paraphrased from that page.

[^why-effect]: Effect docs, "Why Effect" — <https://effect.website/docs/getting-started/why-effect/>, retrieved 2026-05-30. Quote: "Effect's major unique insight is that we can use the type system to track errors and context, not only success values."

[^myths]: Effect docs, "Myths About Effect" — <https://effect.website/docs/additional-resources/myths/>, retrieved 2026-05-30. Quotes: "minimum cost is about 25k of gzipped code"; "tree-shaking friendly so you'll only include what you use"; "internals are not built on generators"; "you can safely start using Effect knowing just 10-20 functions and progressively discover the rest."

[^releases]: GitHub API `repos/Effect-TS/effect/releases`, retrieved 2026-05-30: latest `effect@3.21.2` published 2026-04-22, alongside `@effect/platform@0.96.1`, `@effect/sql`, `@effect/rpc`, `@effect/cluster`, `@effect/workflow`, `@effect/ai-openai` all dated 2026-04.

[^contributors]: GitHub API `repos/Effect-TS/effect/contributors?per_page=10`, retrieved 2026-05-30: mikearnaldi 2301, tim-smart 1407, gcanti 1312, then IMax153 302, fubhy 170, and a long tail (bots excluded).

[^blog]: Effect blog, "The one weird git trick that makes coding agents more Effect-ive," Maxwell Brown, 2026-05-11 — <https://effect.website/blog/the-one-weird-git-trick-that-makes-coding-agents-more-effect-ive/>, retrieved 2026-05-30. Quotes: "this approach isn't specific to Effect - it works for any external software your application depends on"; "Do not import from @repos/ - application code should continue importing from normal package dependencies"; "Documentation usually explains what an API does but not how it is actually used across a codebase. Coding agents rely on patterns and examples, not descriptions"; "Vendoring repositories does increase the size of your project ... It's not free." `git subtree add/pull --squash` commands and the `AGENTS.md` / `.vscode/settings.json` exclusions quoted from the post.

[^tsgo-readme]: `README.md` at `Effect-TS/tsgo`, fetched via GitHub Contents API and decoded 2026-05-30. Quotes: "A wrapper around TypeScript-Go that builds the Effect Language Service, providing Effect-TS diagnostics and quick fixes"; "should be considered in Alpha. Expect breaking changes between releases"; "you still need the standard native TypeScript install (`@typescript/native-preview`) alongside `@effect/tsgo`"; install via `npx @effect/tsgo setup`. Diagnostic names (`missingEffectError`, `missingEffectContext`, `floatingEffect`, `outdatedApi`, …) from the README's diagnostics table.

[^msgo-blog]: Microsoft TypeScript devblog, "A 10x Faster TypeScript" / "Announcing TypeScript Native Previews" / "Progress on TypeScript 7 – December 2025" (devblogs.microsoft.com/typescript), and InfoWorld "Microsoft steers native port of TypeScript to early 2026 release," retrieved via web search 2026-05-30: native Go port (`tsgo`, npm `@typescript/native-preview`), ~10× faster type-checks and ~8× faster editor load, "Corsa"/TS7 vs "Strada"/TS5.8, early-2026 target, still preview / not full parity.

[^criticism]: Community commentary on Effect's learning curve and positioning, retrieved via web search 2026-05-30: dnlytras.com "My impressions of Effect-TS," tweag.io "Exploring Effect in TypeScript," and related posts — "code is more complex than the one without Effect ... not as simple as writing plain TypeScript code"; "learning curve has a few sharp edges"; the "missing standard library for TypeScript" positioning described as "extremely off-putting." Counterpoints from the Effect docs' Myths page (see [^myths]).
