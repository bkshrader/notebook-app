# OpenRouter and the LLM Gateway Landscape

> Research compiled May 2026 for the accessibility-first (ADHD/Autism, WCAG 2.1 AAA target) note-taking app. Likely shipped under AGPL on Electron or Tauri, so SDK license compatibility matters.

---

## 1. OpenRouter — Header Block

| Item                       | Value                                                                         |
| -------------------------- | ----------------------------------------------------------------------------- |
| Website                    | <https://openrouter.ai/>                                                      |
| Docs                       | <https://openrouter.ai/docs>                                                  |
| API reference              | <https://openrouter.ai/docs/api/reference/overview>                           |
| Pricing page               | <https://openrouter.ai/pricing>                                               |
| Models catalog             | <https://openrouter.ai/models>                                                |
| **TypeScript SDK repo**    | <https://github.com/OpenRouterTeam/typescript-sdk>                            |
| TypeScript SDK package     | `@openrouter/sdk` on npm                                                      |
| **TypeScript SDK license** | **Apache-2.0**[^or-ts-license]                                                |
| **Python SDK repo**        | <https://github.com/OpenRouterTeam/python-sdk>                                |
| Python SDK package         | `openrouter` on PyPI                                                          |
| **Python SDK license**     | **Apache-2.0**[^or-py-license]                                                |
| Status                     | Both first-party SDKs are in beta (breaking changes possible)[^or-ts-license] |

### AGPL compatibility verdict for the SDKs

Both first-party SDKs are **Apache-2.0**, which is **one-way compatible with AGPL-3.0**: Apache-2.0-licensed code can be incorporated into an AGPL-3.0 project, but the combined work must then be distributed under AGPL-3.0.[^fsf-license-list] In other words, **you can ship the OpenRouter SDKs in an AGPL Electron/Tauri app without modification.** You do not need to relicense the SDK itself — only the binary distribution / the project as a whole inherits AGPL obligations. The Apache-2.0 patent grant and attribution requirement (preserve the `NOTICE` file, retain the copyright header) must still be honored.

The OpenRouter **service** does not have a software license per se — it is a SaaS that you call over HTTPS. The relevant license is the SDK's, and you can always skip the SDK entirely and call the REST API with `fetch`, which has no license implications at all.

A practical note: many third-party "OpenRouter" SDKs exist on npm (e.g. `openrouter-kit`, various community wrappers). These have varied licenses and varied maintenance. If you care about AGPL alignment, **prefer the first-party `@openrouter/sdk` or call the REST endpoint directly.**

---

## 2. What OpenRouter Is

OpenRouter is a unified LLM gateway: one API key, one OpenAI-compatible endpoint (`https://openrouter.ai/api/v1/chat/completions`), and access to roughly 400+ models across 60+ providers as of mid-2026.[^or-homepage] Anthropic, OpenAI, Google, xAI, Meta, Mistral, DeepSeek, Cohere, Perplexity, Microsoft and many open-source model hosts are all reachable through a single normalized schema.

### Pricing model

- **No markup on per-token inference costs** on the pay-as-you-go plan — you pay the underlying provider's posted rate.[^or-pricing]
- **5.5% fee on credit top-ups** (credit card; 5% on crypto, $0.80 minimum).[^or-pricing] This is the actual platform fee — it shows up when you buy credits, not at request time.
- **BYOK fee**: first 1M BYOK requests per month free, then 5% of what the model would have cost via OpenRouter.[^or-pricing]
- **Free tier**: ~25+ free models, ~50 requests/day rate limited (20 RPM), no credit card required.[^or-pricing] Users holding $10+ in credits get unlimited requests on paid models and a 1,000-request/day cap on free models.
- **Enterprise**: bulk discounts, prepayment credits, annual commitments, POs.[^or-pricing]
- **Failed/fallback requests are not billed**.[^or-pricing]
- **Prompt caching** is supported on PAYG and Enterprise plans.[^or-pricing]

Note: some third-party comparisons report markups on specific Anthropic models historically; the official pricing page in May 2026 states no per-token markup.[^or-pricing] Treat the 5.5% credit fee as the effective floor.

### Supported providers and modalities

- **Chat completion**: 400+ models across 60+ providers.[^or-homepage]
- **Vision**: image inputs supported on multimodal models (filterable by `input_modalities=image` on the models page).
- **Audio**: yes — OpenRouter has dedicated speech-to-text (`/api/v1/audio/transcriptions`) and text-to-speech (`/api/v1/audio/speech`) endpoints, plus inline audio inputs in chat completions via `input_audio` content blocks.[^or-audio] Supported input formats include WAV, MP3, AIFF, AAC, OGG, FLAC, M4A, PCM16, PCM24. TTS voices include alloy, echo, fable, onyx, nova, shimmer (availability varies per model). STT providers include OpenAI (Whisper, GPT-4o Transcribe), Google (Chirp 3), and Groq (fast Whisper).[^or-audio-models]
- **Embeddings**: not the primary focus; some embedding models are present but the catalog is centered on generative chat. Confirm specific models on the models page.
- **Image generation**: routed through certain providers, but again not the headline use case.

### Key features

- **OpenAI-SDK-compatible** — you can point any OpenAI client at OpenRouter by changing the base URL.[^or-quickstart]
- **Provider routing**: pick preferred providers, set order, exclude providers, sort by price or throughput, require ZDR endpoints.[^or-routing]
- **Model fallbacks**: pass an array of models in priority order; if the first 429s, gets moderation-blocked, or hits a context-length limit, OpenRouter transparently tries the next. You only pay for the model that actually answered.[^or-fallbacks]
- **Structured outputs**: both `json_object` (basic JSON mode) and `json_schema` (strict, validated against your schema) are supported. For strict tool use (`strict: true` on tools), you must opt in with the header `structured-outputs-2025-11-13`; otherwise the field is silently stripped and the request is routed loosely.[^or-structured]
- **Function/tool calling**: standard OpenAI-style `tools` array.
- **Streaming**: standard SSE — set `stream: true`, watch out for the documented "comment" payloads in the stream.[^or-api]
- **BYOK**: bring your own provider keys; you can mark them as primary (used before OpenRouter's pool) or fallback (used only after OpenRouter's pool fails). You can also force "Always use for this provider" to prevent any fallback to OpenRouter's own keys.[^or-byok]
- **Latest aliases**: `~openai/gpt-latest`-style aliases automatically follow the newest version of a model family.[^or-quickstart]

### Data handling and privacy

- **Default**: prompts and responses are **not stored**. Only metadata (token counts, latency, model used) is retained, and that powers the public model rankings.[^or-data-collection]
- **Opt-in logging** for debugging: if you turn on "Private Input & Output Logging," your prompts/completions appear in your own dashboard. OpenRouter says it does not access this data.[^or-data-collection]
- **Opt-in training-data sharing**: enabling "OpenRouter Use of Inputs/Outputs" grants OpenRouter an irrevocable commercial-use right on your prompts and completions in exchange for a 1% discount on usage.[^or-data-collection] Important caveat: if you leave prompt/chat logging on at the account level, the terms of service grant OpenRouter that broad usage right too.
- **Zero Data Retention (ZDR)**: OpenRouter publishes a programmatic list of ZDR-compliant endpoints at `https://openrouter.ai/api/v1/endpoints/zdr` and can enforce ZDR globally, per-model-group, per-API-key, or per-request (`provider.zdr: true`).[^or-zdr]
- **Opt-out of training providers**: a single account setting prevents routing to providers that train on inputs.[^or-data-collection]
- **Anonymous prompt categorization**: even if you haven't opted in, OpenRouter samples prompts for category stats — but it stores them detached from your account.[^or-data-collection]

### Accessibility-relevant notes

The OpenRouter web dashboard itself does not appear to publish a WCAG conformance statement — assume it is not AAA-conformant out of the box, but you won't be embedding that UI anyway. What matters for an accessibility-first note app:

- **STT/TTS** are first-class, which directly enables voice dictation and read-aloud features that help ADHD/Autism users.[^or-audio]
- **Streaming** is critical so the UI can render token-by-token (helpful for focus, lets users abort early).
- **Structured outputs** make it safe to build deterministic "extract action items," "summarize at grade-7 reading level," "tag concept X" workflows without flaky parsing.

---

## 3. How to Use OpenRouter

### Auth

Send an `Authorization: Bearer <OPENROUTER_API_KEY>` header. Optional `HTTP-Referer` and `X-OpenRouter-Title` (or `X-Title`) headers identify your app in OpenRouter's public rankings.[^or-quickstart]

### Direct HTTP (no SDK — license-clean)

```typescript
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://yourapp.example',
    'X-Title': 'My Notebook App',
  },
  body: JSON.stringify({
    // Fallback list: try Claude first, fall back to GPT-5, then Llama
    models: ['anthropic/claude-opus-4.7', 'openai/gpt-5.5', 'meta-llama/llama-3.3-70b-instruct'],
    messages: [
      { role: 'system', content: 'You summarize lecture notes.' },
      { role: 'user', content: 'Summarize: ...' },
    ],
    stream: true,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'Summary',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            tldr: { type: 'string' },
            action_items: { type: 'array', items: { type: 'string' } },
          },
          required: ['tldr', 'action_items'],
        },
      },
    },
    provider: {
      zdr: true, // route only to Zero-Data-Retention endpoints
      sort: 'price', // cheapest qualifying endpoint
    },
  }),
});
```

### First-party TypeScript SDK

```typescript
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const result = await client.chat.send({
  model: '~anthropic/claude-sonnet-latest',
  messages: [{ role: 'user', content: 'Hello' }],
  provider: { zdr: true, sort: 'price' },
  stream: true,
});

for await (const chunk of result) {
  process.stdout.write(chunk.choices[0].delta.content ?? '');
}
```

### First-party Python SDK

```python
from openrouter import OpenRouter
import os

with OpenRouter(api_key=os.getenv('OPENROUTER_API_KEY')) as client:
    res = client.chat.send(
        model='anthropic/claude-4.5-sonnet',
        messages=[{'role': 'user', 'content': 'Hello'}],
        stream=True,
    )
```

### OpenAI SDK compatibility

You can just point the OpenAI SDK at `https://openrouter.ai/api/v1` and pass `OPENROUTER_API_KEY` as the api key. Fallback `models[]` goes under `extra_body` when using the OpenAI SDK.[^or-fallbacks]

### Model selection syntax

- Provider-prefixed slug: `anthropic/claude-opus-4.7`, `openai/gpt-5.5`, `meta-llama/llama-3.3-70b-instruct`, `google/gemini-3.1-pro-preview`.
- "Latest" aliases: `~openai/gpt-latest`, `~anthropic/claude-sonnet-latest`.[^or-quickstart]
- Free-tier suffix: many models offer a `:free` variant.

---

## 4. Competitors — Deep Research

### 4.1 Vercel AI Gateway

- **Website**: <https://vercel.com/ai-gateway>
- **Docs**: <https://vercel.com/docs/ai-gateway>
- **What it is**: A unified gateway baked into the Vercel platform. Speaks OpenAI Chat Completions, OpenAI Responses, and Anthropic Messages — and integrates natively with the Vercel **AI SDK** (the open-source TypeScript library `ai` at <https://github.com/vercel/ai>).[^vercel-gw]
- **SDK license**: The Vercel AI SDK is **Apache-2.0**.[^vercel-license] **AGPL-compatible** in the same one-way sense as the OpenRouter SDKs.
- **How it differs from OpenRouter**: Tighter integration with the AI SDK's `generateText` / `streamText` / agent abstractions. Marketing emphasizes embeddings support, budgets, spend monitoring, and observability of inference inside the Vercel dashboard. Provider catalog is large (hundreds of models) and growing, but historically narrower than OpenRouter at the long tail.
- **Pricing**: **No markup on tokens**; the same per-token rate you'd pay the provider, including with BYOK.[^vercel-gw] Vercel monetizes via its hosting platform.
- **BYOK**: yes, supported.[^vercel-gw]
- **Streaming, tools, structured outputs**: yes, all supported through the AI SDK abstractions.
- **Verdict for the note app**: A reasonable second choice if you ever target the Vercel platform for any cloud component. For a pure desktop app (Electron/Tauri) you don't actually need any Vercel hosting to use the AI Gateway, but the cultural center of gravity here is web-first. **Strong contender on license (Apache-2.0) and pricing (zero markup).** The AI SDK is genuinely well-designed and idiomatic for TypeScript.

### 4.2 LiteLLM (BerriAI)

- **Website**: <https://www.litellm.ai/>
- **GitHub**: <https://github.com/BerriAI/litellm>
- **What it is**: An open-source Python library + proxy server that exposes a unified OpenAI-style interface to 100+ LLM providers. Can be embedded in your own backend (Python only) or run as a standalone proxy (any language can hit it).[^litellm]
- **License**: **MIT** for the main codebase. The `enterprise/` directory has a **separate commercial license**[^litellm-license] — if you ship the proxy you must avoid that directory. **MIT is fully AGPL-compatible**[^fsf-license-list] — no obstacle whatsoever for embedding in an AGPL app.
- **How it differs from OpenRouter**: LiteLLM is **infrastructure you run**, not a SaaS. You bring your own provider keys, set up your own routing, your own caching, your own logging. It is the de facto standard self-hosted LLM gateway. There is also a hosted LiteLLM offering for teams that don't want to operate it themselves.[^litellm]
- **Pricing**: Free for self-hosted (MIT). Enterprise tier has SSO, dedicated support, custom integrations — pricing on request.
- **Supported providers**: 100+ including OpenAI, Anthropic, Bedrock, Vertex, Azure, Gemini, Cohere, Together, Groq, Ollama, plus `/chat/completions`, `/messages`, `/embeddings`, `/image/generations`, `/audio/transcriptions`, `/batches` endpoints.[^litellm]
- **Performance**: 8 ms P95 at 1k RPS (their published number).[^litellm]
- **Verdict for the note app**: If you ever stand up a backend, LiteLLM is the most natural router. For a **pure desktop app**, LiteLLM-as-library is Python-only, which is awkward inside Electron/Tauri. Useful for backend (FastAPI) deployments though. License is great.

### 4.3 Portkey

- **Website**: <https://portkey.ai/>
- **Gateway repo**: <https://github.com/Portkey-AI/gateway>
- **What it is**: A production "AI gateway + LLMOps" stack with observability, guardrails, governance, prompt management, and RBAC bolted on. Open-source gateway plus a hosted control plane.[^portkey-gw]
- **License**: **MIT** for the open-source gateway.[^portkey-license] **AGPL-compatible** without friction.
- **How it differs from OpenRouter**: Heavily oriented toward enterprise governance — budget limits, PII redaction, audit logs, virtual keys, organization-level policy. Claims access to 1,600+ LLMs (via their hosted cloud) and 45+ providers / 200+ models through the gateway.[^portkey-gw]
- **Pricing**: Free tier on Portkey Cloud; tiered subscription pricing for production; enterprise on request. Self-hosted gateway is free.
- **BYOK**: yes — secure key management and virtual keys.[^portkey-gw]
- **Deployment**: `npx @portkey-ai/gateway` to self-host locally; Docker, Cloudflare Workers, Kubernetes for production.[^portkey-gw]
- **SDKs**: Python, JavaScript, plus OpenAI SDK compatibility.[^portkey-gw]
- **Verdict for the note app**: Overpowered for a desktop note app. If you later run a backend that proxies inference for a team/edu deployment, Portkey becomes interesting for the governance features. License (MIT) is friendly.

### 4.4 Helicone

- **Website**: <https://www.helicone.ai/>
- **GitHub**: <https://github.com/Helicone/helicone>
- **What it is**: Originally an LLM observability tool; in 2025 it added a gateway. So now it's both: an "AI Gateway + LLM Observability" platform with prompt management, evals, datasets, session tracking, agent tracing.[^helicone]
- **License**: **Apache-2.0**.[^helicone-license] **AGPL-compatible** (one-way: Apache-2.0 → AGPL).
- **How it differs from OpenRouter**: OpenRouter is a router with light observability. Helicone is observability with a router. If you care about per-user analytics, prompt versioning, evals, and request inspection, Helicone is significantly stronger. Coverage is 100+ models / 90+ providers via integrations including OpenAI, Anthropic, Gemini, Azure, Groq, Together, Anyscale, and even OpenRouter and LiteLLM as upstream providers.[^helicone]
- **Pricing**: Free tier (10k requests/month). Paid tiers for higher volume. Self-hosted via Docker Compose.[^helicone]
- **BYOK**: yes.
- **Verdict for the note app**: For a desktop app where each user calls inference directly, you typically don't need centralized observability — it's the user's API key and the user's data. Helicone's value lights up if you run a shared backend. License (Apache-2.0) is fine for AGPL.

### 4.5 Cloudflare AI Gateway

- **Website / Docs**: <https://developers.cloudflare.com/ai-gateway/>
- **What it is**: A thin proxy in front of LLM providers run from Cloudflare's edge. Adds caching, rate-limiting, retries, model fallback, analytics, and request logging.[^cf-gw]
- **License**: Not an SDK you link against — it's a managed service you POST to. You use the provider's SDK with a Cloudflare URL prefix, so there are no SDK license concerns from the gateway itself.
- **How it differs from OpenRouter**: Cloudflare doesn't normalize the API shape across providers — you still write OpenAI-shape requests or Anthropic-shape requests separately. It's more of an edge proxy than a router. **Workers AI** (Cloudflare's own inference) is separate but accessible through the same gateway.
- **Supported providers**: Workers AI, OpenAI, Anthropic, Google Gemini, Replicate, and growing.[^cf-gw]
- **Pricing**: Available on all Cloudflare plans, including free.[^cf-gw] Token costs are passthrough.
- **BYOK**: Yes — BYOK ("store keys") lets you put provider keys in the Cloudflare dashboard and reference them, so the keys never need to ship in your client.[^cf-gw]
- **Verdict for the note app**: Interesting if you already use Cloudflare for anything else (CDN, Workers, R2). Adds edge caching for LLM responses. **Not a full router** — fewer providers, no normalization. Acceptable but probably not differentiated for a desktop app.

### 4.6 Together AI

- **Website**: <https://www.together.ai/>
- **What it is**: Primarily a hosted inference platform for open-source models (Llama, Mistral, Qwen, DeepSeek, etc.) plus fine-tuning and GPU rentals. **Not a cross-provider router.** Together's own catalog is large but it does not route to OpenAI or Anthropic.[^together]
- **License/SDK**: Standard OpenAI-compatible API; their Python SDK is open-source. License posture is permissive but you generally won't link a Together-specific SDK — you'll just point an OpenAI client at their base URL.
- **Pricing**: Per-token, no markup vs. the model's published rate. Volume discounts.
- **Verdict for the note app**: Together can be **one of the providers** behind your gateway (it's a great backend for cheap open-source inference), but it is **not a competitor** to OpenRouter at the routing layer. List it as an upstream you might prefer for cost-sensitive open-source models.

### 4.7 Requesty

- **Website**: <https://requesty.ai/> (and `router.requesty.ai`)
- **What it is**: A newer (post-2024) OpenRouter-style gateway with 400+ models, intelligent routing, fallbacks, caching, observability, and BYOK. Drop-in `base_url='https://router.requesty.ai/v1'` for any OpenAI-compatible client.[^requesty]
- **Pricing**: **5% markup on model costs**. All features included.[^requesty] More expensive than OpenRouter's "0% inference + 5.5% credit fee" effective rate at low volumes, comparable at higher volumes.
- **BYOK**: yes.
- **Features**: Geo-based routing for data residency, PII detection/scrubbing, RBAC, cache-hit analytics, <20 ms failover switching.[^requesty]
- **SDK**: OpenAI SDK compatible. No proprietary SDK link required, so no license issue.
- **Verdict for the note app**: Real, credible OpenRouter competitor. The 5% markup is its main weakness vs. OpenRouter's near-zero markup model. Worth considering if its geo-routing or PII features matter to you. Not differentiated enough to displace OpenRouter as the default.

### 4.8 Unify

- **Website**: <https://unify.ai/>
- **What it is**: Originally an LLM router (`unify.ai`), but as of 2026 the public site positions it as "the AI operating layer" — an enterprise platform that connects Slack, Teams, Salesforce, Snowflake, etc. with AI teammates.[^unify] The pure LLM routing product appears to have been deprioritized.
- **License / SDK**: No clear public open-source SDK with current versions. **Hard to evaluate** as an LLM router in 2026.
- **Verdict for the note app**: **Skip.** Either pivoted away from gateway-as-product or rebranded into an enterprise integration play that doesn't fit a desktop note app.

### 4.9 NotDiamond

- **Website**: <https://notdiamond.ai/>
- **What it is**: An **intelligent model router** that sits in front of OR alongside an existing gateway (it integrates with OpenRouter, Hugging Face, Groq, Eden AI). For each prompt, NotDiamond picks the best model based on a learned policy — claims 10%+ accuracy and 50%+ cost wins.[^notdiamond]
- **License / SDK**: Closed-source product. No public OSS SDK to link.
- **Pricing**: Not publicly disclosed in detail on the landing page.
- **Verdict for the note app**: **Complementary, not competitive.** You'd run OpenRouter underneath and let NotDiamond pick which model OpenRouter calls. For a single-user desktop note app, this kind of routing optimizer is overkill. Worth revisiting only if you ship complex agentic workflows where cost-per-task varies wildly by prompt.

### 4.10 Martian (withmartian)

- **Website**: <https://withmartian.com/>
- **What it is**: As of 2026, **Martian has pivoted to interpretability research** — measurement (ARES, Code Review Bench), explanation, and applied interpretability — rather than running a public router.[^martian] Their earlier router product is no longer the headline.
- **Verdict for the note app**: **Not a current option.** The 2023–2024 Martian router exists in references and comparison articles, but as a product to build against today, the company is focused elsewhere.

### 4.11 OpenPipe

- **Website**: <https://openpipe.ai/>
- **What it is**: A fine-tuning + hosted-inference platform. They train your custom Llama/Mistral/Qwen on your traffic and serve those fine-tunes. They also resell third-party models at provider rates with no markup.[^openpipe]
- **Pricing**: Training: $0.48–$2.90 / 1M tokens (size-dependent). Inference: per-token for high-volume; hourly compute units for experimental.[^openpipe]
- **Verdict for the note app**: **Not a gateway competitor**, but interesting if you ever want to fine-tune a small model on user notes for a faster, cheaper local-ish summarizer. Out of scope for the gateway decision.

### 4.12 Bifrost (maximhq)

- **GitHub**: <https://github.com/maximhq/bifrost>
- **What it is**: A high-performance, Go-based AI gateway. **Apache-2.0**. Adds ~11 µs overhead per request at 5,000 RPS. Supports 23+ providers (1,000+ models) through OpenAI-compatible API, with failover, semantic caching, MCP gateway support, and observability built in.[^bifrost]
- **License**: **Apache-2.0**. **AGPL-compatible**.[^bifrost]
- **Pricing**: Free self-hosted. Maxim AI (the parent) offers a managed version.
- **Verdict for the note app**: Excellent **self-hosted backend** option if you go that route. For a pure desktop app with no backend, Bifrost is a Go binary you'd ship — possible but adds complexity vs. just hitting OpenRouter directly. Solid Apache-2.0 license.

### 4.13 LLM Gateway (`llmgateway.io`)

- **Website**: <https://llmgateway.io/>
- **What it is**: A newer entrant marketing **passthrough per-token pricing with no markup** — direct competitor to OpenRouter on the pricing dimension.
- **Verdict**: Worth watching, but ecosystem and SDK maturity lag OpenRouter materially in May 2026. Not enough independent reporting to make it a confident default.

### 4.14 Kong AI Gateway

- An extension of Kong's API gateway product. Targets enterprises that already use Kong for HTTP API management. Not aimed at desktop apps. Skip for this use case.

### 4.15 Eden AI

- A unified API across 500+ AI models spanning text, OCR, document parsing, speech, translation, and image analysis. More than just LLMs.[^edenai-comp] If you need OCR or document parsing alongside LLM routing in one bill, Eden is worth a look. For an LLM-only note app, OpenRouter is simpler.

---

## 5. Relevance to a Note-Taking App

A note-taking app for college students/academics has several concrete LLM use cases:

1. **Summarization** of lectures, papers, long notes — needs streaming so users see progress, and structured outputs so the summary has a stable shape (TL;DR + bullet points + tags).
2. **Q&A over notes** (RAG) — the LLM consumes retrieved passages from a local vector store and answers in the user's voice. Wants long context windows; benefits from cheap models for the embedding step.
3. **Voice command parsing** — accessibility win for ADHD users who can't always type. Needs **STT** (OpenRouter STT via Whisper-Large-V3 / GPT-4o Transcribe[^or-audio-models]) and a small fast model to map the transcript to an in-app action. Structured outputs are essential here.
4. **Read-along / TTS** — students with autism or reading difficulties benefit hugely from being able to hear notes back. **OpenRouter TTS endpoint** covers this.[^or-audio]
5. **Structured extraction** — auto-tagging, "extract all citations as APA," "find every TODO with a deadline." Strict JSON schema mode is the right tool.[^or-structured]
6. **Concept/relationship graphs** — extract entities and relations to build a personal knowledge graph. Structured outputs + a deterministic model.
7. **Rewriting / tone-shifting** — "rewrite this paragraph at a 9th-grade reading level," "make this less anxious-sounding." Streaming, no JSON needed.

### Desktop-app architectural choice: direct-from-client vs. backend-proxied

**Option A — direct from the desktop app with the user's own key (BYOK):**

- Pros: zero infrastructure on your side; the user's prompts and notes never touch your servers; clear privacy story for academic notes (FERPA-ish concerns, IP, personal medical/disability info in study materials); the user controls cost.
- Cons: users have to obtain an OpenRouter / OpenAI key (friction); you can't easily collect aggregate analytics; rate-limit / quota errors surface directly to users; you must safely store the key in the OS keychain (`safeStorage` in Electron, `keyring` in Tauri).
- **This is the right default for an accessibility-first, AGPL, local-first note app.** It aligns with the AGPL spirit (the source the user runs is the source they have) and with the privacy expectations of academics.

**Option B — backend-proxied with your platform key:**

- Pros: smoother onboarding, you can rate-limit / cache server-side, you can pre-buy capacity at volume discounts, you can run guardrails centrally.
- Cons: you become the data processor for everyone's notes (regulatory and privacy headache); you pay for everyone's inference up front; you need to operate a backend.

**Option C — hybrid:**

- BYOK by default. Offer an optional managed tier (your key) for users who don't want to set up a key, ideally with very visible disclosure of what that means privacy-wise.

### Privacy implications for academic notes

- **Always set `provider.zdr: true`** on requests when academic content is involved.[^or-zdr] Make this a per-user setting that defaults to ON. Document which providers ZDR routes to.
- **Never enable "OpenRouter Use of Inputs/Outputs"** by default — opting in would grant OpenRouter irrevocable commercial-use rights on student notes.[^or-data-collection]
- Disable "Private Input & Output Logging" by default. Users can opt in for debugging, but academic notes should not be logged anywhere by default.
- For STT specifically, prefer providers with strong privacy track records; Groq's hosted Whisper is fast but check its retention policy per-route.
- Consider letting users **route by data residency** when supported (Requesty exposes geo-routing; OpenRouter exposes provider filtering and you can constrain to US / EU providers manually).

---

## 6. Things to Know — per option

### OpenRouter

- **Maturity**: well-established (founded 2023, hugely popular by 2025), heavy traffic, large community.
- **Pricing surprise**: the "no markup" claim is true for inference, but the 5.5% **credit purchase** fee is the real cost. With $10 you keep $9.45.
- **Regional availability**: global; you can constrain to ZDR endpoints; some specific providers are US-only.
- **Model-coverage gaps**: usually the broadest catalog of any router. Newest frontier models sometimes appear on OpenRouter within days of release.
- **Rate limits**: free tier is restrictive (~50 req/day). Paid tier scales with credit balance.
- **Observability**: simple per-API-key usage in the dashboard; not a full LLMOps stack.
- **Gotchas**: strict tool use (`strict: true`) silently drops without the right header.[^or-structured] Streaming SSE has occasional comment payloads — your parser must tolerate them.[^or-api] Audio in/out requires base64 (no URL fetching).[^or-audio]

### Vercel AI Gateway

- **Maturity**: 2024+, fast-evolving.
- **Pricing**: no markup on tokens, including BYOK.[^vercel-gw]
- **Regional availability**: Vercel's global infra.
- **Coverage**: hundreds of models — slightly behind OpenRouter on long-tail / niche models.
- **Gotchas**: Most idiomatic from a Vercel/Next.js context; you can use it from anywhere but the developer surface is TS-first.

### LiteLLM

- **Maturity**: very mature, the default self-hosted choice.
- **Pricing**: free for OSS; enterprise on request.
- **Gotchas**: Python only for library use. Proxy server is language-agnostic. Some providers have version-skew when models change rapidly.

### Portkey

- **Maturity**: well-funded, heavy enterprise focus.
- **Pricing**: free tier + tiered SaaS; self-hosted OSS gateway is free.
- **Gotchas**: governance surface is large and may feel heavy for a single-user app.

### Helicone

- **Maturity**: well-known for observability; gateway is newer.
- **Pricing**: 10k req/month free; tiered after.
- **Gotchas**: positioned more as observability + routing, less pure-routing focus.

### Cloudflare AI Gateway

- **Maturity**: GA, stable.
- **Pricing**: free.
- **Coverage**: fewer providers than OpenRouter; doesn't normalize API shape.
- **Gotchas**: best if you already live on Cloudflare.

### Requesty

- **Maturity**: newer, ~2024+, growing.
- **Pricing**: 5% markup on tokens — most expensive of the bunch on inference.
- **Gotchas**: smaller community, less independent coverage.

### Bifrost

- **Maturity**: open-source, ~2024+.
- **Pricing**: free self-hosted.
- **Gotchas**: you operate it.

### Together AI

- **Maturity**: very mature for open-source model hosting.
- **Coverage**: open-source models only — no GPT, no Claude, no Gemini.
- **Gotchas**: this is an **inference provider**, not a router. Slot it behind one.

### NotDiamond / Martian / Unify

- **Status**: NotDiamond is alive but complementary (router-over-routers). Martian has pivoted to research. Unify has pivoted to enterprise AI ops.
- **Gotchas**: don't depend on these as your primary gateway.

---

## License-trap summary

| Tool / SDK              | License                        | AGPL-compatible (one-way: incorporate into AGPL app)? |
| ----------------------- | ------------------------------ | ----------------------------------------------------- |
| `@openrouter/sdk` (TS)  | Apache-2.0[^or-ts-license]     | Yes                                                   |
| `openrouter` (Python)   | Apache-2.0[^or-py-license]     | Yes                                                   |
| Vercel `ai` SDK         | Apache-2.0[^vercel-license]    | Yes                                                   |
| LiteLLM (main)          | MIT[^litellm-license]          | Yes                                                   |
| LiteLLM (`enterprise/`) | Commercial[^litellm-license]   | **Avoid** if AGPL                                     |
| Portkey Gateway         | MIT[^portkey-license]          | Yes                                                   |
| Helicone                | Apache-2.0[^helicone-license]  | Yes                                                   |
| Bifrost                 | Apache-2.0[^bifrost]           | Yes                                                   |
| Together AI Python SDK  | Permissive (Apache-2.0 family) | Yes                                                   |

**One-way means**: you can incorporate the SDK into your AGPL project, but the combined work must be distributed under AGPL.[^fsf-license-list] You cannot relicense the SDK itself; you must preserve attribution/NOTICE files.

**The only real trap** is using a closed-source third-party "OpenRouter wrapper" off npm without checking its license, or pulling in code from LiteLLM's `enterprise/` directory.

---

## Footnotes

[^or-homepage]: OpenRouter homepage, <https://openrouter.ai/>, accessed May 2026 — "400+ language models across 60+ providers."

[^or-ts-license]: OpenRouter TypeScript SDK, <https://github.com/OpenRouterTeam/typescript-sdk> — Apache-2.0 license; published as `@openrouter/sdk`; currently in beta.

[^or-py-license]: OpenRouter Python SDK, <https://github.com/OpenRouterTeam/python-sdk> — Apache-2.0; published as `openrouter` on PyPI; requires Python 3.9+.

[^or-pricing]: OpenRouter Pricing page, <https://openrouter.ai/pricing>, accessed May 2026 — 5.5% credit-purchase fee (5% on crypto, $0.80 min); no inference markup; 1M free BYOK requests/month, 5% after; free tier ~50 req/day, 20 RPM; failed/fallback requests not billed.

[^or-quickstart]: OpenRouter Quickstart, <https://openrouter.ai/docs/quickstart> — auth via `Authorization: Bearer`; `https://openrouter.ai/api/v1/chat/completions` endpoint; `~openai/gpt-latest`-style aliases.

[^or-routing]: OpenRouter Provider Routing, <https://openrouter.ai/docs/guides/routing/provider-selection> — `order`, `sort`, `zdr`, exclusion, BYOK partition controls.

[^or-fallbacks]: OpenRouter Model Fallbacks, <https://openrouter.ai/docs/guides/routing/model-fallbacks> — `models[]` array, priority order, billed at the model that actually answered. Use `extra_body` from OpenAI SDK.

[^or-structured]: OpenRouter Structured Outputs, <https://openrouter.ai/docs/guides/features/structured-outputs> — `json_object` vs. `json_schema` modes; strict tool use requires `structured-outputs-2025-11-13` header or the field is stripped.

[^or-byok]: OpenRouter BYOK, <https://openrouter.ai/docs/guides/overview/auth/byok> — prioritized vs. fallback key partitions; "Always use for this provider" prevents fallback to OpenRouter's keys.

[^or-data-collection]: OpenRouter Data Collection, <https://openrouter.ai/docs/guides/privacy/data-collection> — default no prompt storage; opt-in Private Logging; opt-in Use of Inputs/Outputs for 1% discount grants irrevocable commercial-use right.

[^or-zdr]: OpenRouter ZDR, <https://openrouter.ai/docs/guides/features/zdr> — `https://openrouter.ai/api/v1/endpoints/zdr` lists ZDR endpoints; enforce account-level / per-key / per-request (`provider.zdr: true`).

[^or-api]: OpenRouter API Reference Overview, <https://openrouter.ai/docs/api/reference/overview> — SSE streaming with occasional "comment" payloads to skip.

[^or-audio]: OpenRouter Audio guide, <https://openrouter.ai/docs/guides/overview/multimodal/audio> — input via base64 in `input_audio` content blocks; output via `modalities: ["text", "audio"]`, streamed SSE chunks with `delta.audio`. Voices: alloy, echo, fable, onyx, nova, shimmer.

[^or-audio-models]: OpenRouter STT / Audio API announcements, <https://openrouter.ai/docs/guides/overview/multimodal/stt>, <https://openrouter.ai/announcements/announcing-audio-apis> — Whisper-1, Whisper-Large-V3, Whisper-Large-V3-Turbo (99+ languages, 12% WER), GPT-4o Transcribe, Google Chirp 3, Groq Whisper.

[^vercel-gw]: Vercel AI Gateway docs, <https://vercel.com/docs/ai-gateway> — OpenAI Chat Completions / OpenAI Responses / Anthropic Messages compatibility; no markup on tokens including BYOK; embeddings supported.

[^vercel-license]: Vercel `ai` SDK LICENSE, <https://github.com/vercel/ai/blob/main/LICENSE> — Apache-2.0.

[^litellm]: LiteLLM README, <https://github.com/BerriAI/litellm> — 100+ providers; 8 ms P95 at 1k RPS; SDK + proxy modes; `/chat/completions`, `/messages`, `/embeddings`, `/image/generations`, `/audio/transcriptions`, `/batches`.

[^litellm-license]: LiteLLM LICENSE, <https://github.com/BerriAI/litellm/blob/main/LICENSE> — MIT for main codebase; `enterprise/` directory under separate commercial license.

[^portkey-gw]: Portkey Gateway README, <https://github.com/Portkey-AI/gateway> — 45+ providers, 200+ models on gateway (1,600+ via cloud); `npx @portkey-ai/gateway` self-host; Docker, Workers, Kubernetes deploys.

[^portkey-license]: Portkey Gateway LICENSE, <https://github.com/Portkey-AI/gateway/blob/main/LICENSE> — MIT.

[^helicone]: Helicone homepage and README, <https://www.helicone.ai/>, <https://github.com/Helicone/helicone> — 100+ models, 90+ providers; observability + gateway; free tier 10k req/month.

[^helicone-license]: Helicone LICENSE, <https://github.com/Helicone/helicone/blob/main/LICENSE> — Apache-2.0.

[^cf-gw]: Cloudflare AI Gateway docs, <https://developers.cloudflare.com/ai-gateway/> — caching, rate-limiting, retries, model fallback; available on all plans; supports Workers AI, OpenAI, Anthropic, Gemini, Replicate; BYOK via Cloudflare-stored keys.

[^together]: Together AI homepage, <https://www.together.ai/> — full-stack inference / fine-tuning / GPU clusters; open-source model focus; not a cross-provider router.

[^requesty]: Requesty homepage, <https://requesty.ai/> — 400+ models, 5% markup, OpenAI-SDK compatible, geo-routing, PII scrubbing, RBAC, <20 ms failover.

[^unify]: Unify homepage, <https://unify.ai/> — repositioned as "AI operating layer" enterprise integration product in 2026; LLM-routing product appears deprioritized.

[^notdiamond]: NotDiamond homepage, <https://notdiamond.ai/> — intelligent model router that runs over OpenRouter / Hugging Face / Groq / Eden AI; closed-source product; claims 10%+ accuracy, 50%+ cost wins.

[^martian]: Martian homepage, <https://withmartian.com/> — research focus on interpretability (ARES, Code Review Bench) rather than a public router product.

[^openpipe]: OpenPipe pricing docs, <https://docs.openpipe.ai/pricing/pricing> — training $0.48–$2.90 / 1M tokens; hosted inference per-token or hourly compute units; primary product is fine-tuning Llama/Mistral/Qwen, not a router.

[^bifrost]: Bifrost README, <https://github.com/maximhq/bifrost> — Go-based, Apache-2.0, ~11 µs overhead at 5k RPS; 20+ providers, 1,000+ models; semantic caching, MCP gateway, failover.

[^edenai-comp]: Eden AI vs. OpenRouter comparison, <https://www.edenai.co/post/best-alternatives-to-openrouter> — 500+ models across text, OCR, document parsing, speech, translation, image analysis.

[^fsf-license-list]: FSF License List, <https://www.gnu.org/licenses/license-list.html> — Apache-2.0 is compatible with GPLv3 / AGPLv3 (one direction: Apache → GPLv3/AGPLv3, never the reverse). MIT is compatible with all GPL/AGPL versions.
