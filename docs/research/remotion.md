# Remotion — Programmatic Video for the "Cinematic Video Overview" Feature

> Research target: evaluate whether Remotion can power a NotebookLM-style "Video Overview" feature in a v3 release of our accessibility-first, AGPL-licensed, Electron-based notebook app for students.
>
> Bottom line up front (BLUF): **Remotion's license is source-available, NOT an OSI-approved open-source license, and it is NOT compatible with AGPL distribution in the strict copyleft sense.** It can however be used by individuals and ≤3-employee for-profits and by non-profits _for free_. If our app ends up as a for-profit org of >3 employees (including contractors as of Remotion 5.0), or if we want to ship a clean AGPL artifact, we need either a Company License or an alternative. **MIT-licensed alternatives exist (Motion Canvas, Revideo, Manim) and are AGPL-compatible.**

---

## 1. Links and license — read this first

- **Homepage:** <https://www.remotion.dev/>
- **GitHub repo:** <https://github.com/remotion-dev/remotion>
- **Docs:** <https://www.remotion.dev/docs/>
- **License (canonical, in repo):** <https://github.com/remotion-dev/remotion/blob/main/LICENSE.md>
- **License doc page:** <https://www.remotion.dev/docs/license>
- **Commercial pricing:** <https://www.remotion.pro/license>
- **Licensing FAQ:** <https://www.remotion.pro/faq>
- **5.0 license-change PR:** <https://github.com/remotion-dev/remotion/pull/3750>

### 1.1 The actual license text (verbatim, from `LICENSE.md` on `main`, fetched via `gh api`)

> In Remotion 5.0, the license will slightly change. [View the changes here](https://github.com/remotion-dev/remotion/pull/3750).
>
> ---
>
> Depending on the type of your legal entity, you are granted permission to use Remotion for your project. Individuals and small companies are allowed to use Remotion to create videos for free (even commercial), while a company license is required for for-profit organizations of a certain size. This two-tier system was designed to ensure funding for this project while still allowing the source code to be available and the program to be free for most. Read below for the exact terms of use.
>
> ## Free License
>
> Copyright © 2026 Remotion
>
> ### Eligibility
>
> You are eligible to use Remotion for free if you are:
>
> - an individual
> - a for-profit organization with up to 3 employees
> - a non-profit or not-for-profit organization
> - evaluating whether Remotion is a good fit, and are not yet using it in a commercial way
>
> ### Allowed use cases
>
> Permission is hereby granted, free of charge, to any person eligible for the "Free License", to use the software non-commercially or commercially for the purpose of creating videos and images and to modify the software to their own liking, for the purpose of fulfilling their custom use case or to contribute bug fixes or improvements back to Remotion.
>
> ### Disallowed use cases
>
> It is not allowed to copy or modify Remotion code for the purpose of selling, renting, licensing, relicensing, or sublicensing your own derivate of Remotion.

This is the full license. There is **no SPDX identifier** for it; it is a bespoke source-available license written by Remotion. [^license]

### 1.2 What this means for AGPL compatibility — explicit verdict

**Verdict: NOT AGPL-compatible in the strict copyleft sense, but practically usable under specific circumstances.**

Three independently fatal problems for shipping Remotion as part of a strict AGPL artifact:

1. **"Disallowed use cases" forbids relicensing.** The Remotion license says: _"It is not allowed to copy or modify Remotion code for the purpose of selling, renting, licensing, relicensing, or sublicensing your own derivative of Remotion."_ AGPL-3.0 requires that the _combined work_ be conveyed under AGPL terms (§ 5 of AGPL-3.0). You cannot simultaneously (a) ship Remotion under its own terms and (b) ship the combined work under AGPL while preserving Remotion's "no relicensing" clause. The two are mutually exclusive when Remotion is statically/dynamically linked into the same program. [^agplv3] [^fsf-licenselist]
2. **The license is not OSI-approved.** AGPL § 7 lists which "additional terms" may be layered onto AGPL distribution. Remotion's terms (eligibility-by-entity, no relicensing) are not on that list and would be treated as "further restrictions" that the AGPL forbids downstream recipients from adding. [^agplv3]
3. **The eligibility test is on the _user/distributor_, not on the code.** This is unusual. Even if you yourself qualify for the Free License today, you cannot pass that grant downstream to a fork; whoever forks your AGPL app must independently re-qualify for Remotion's Free License. That breaks the AGPL guarantee that downstream recipients receive the same rights you had.

**What this means in practice for our app:**

- If our app entity stays under 3 employees (counting contractors as of v5.0) [^v5-changes] OR registers as a non-profit/not-for-profit, AND we're willing to license our app under terms _other than_ AGPL (e.g., a dual-licensed combination where the Remotion-bundled build is _not_ AGPL, or where Remotion is loaded as a user-installed optional component), then _we can ship it for free, today_.
- A "pure" AGPL ship with Remotion bundled in is not legally clean. We would need either (a) a Remotion Company License + an additional exception from the Remotion team for the AGPL combination clause, or (b) an architecture that doesn't combine Remotion into the same program (see Pattern B in §6).

**There is real ambiguity on one point.** The Remotion FAQ and docs do not directly answer: _"If our app is open-source and our end users (each a separate individual) run the renderer locally on their own machine, does the end-user trigger the license obligation or does the distributor?"_ The FAQ acknowledges "edge cases" and points to <https://www.remotion.pro/faq>. Section 6 below decomposes the four plausible answers, but **before committing to Remotion, we should email <hi@remotion.dev> with our exact scenario and get a written answer.** This is the single highest-leverage research action remaining.

### 1.3 Sub-package licenses — they are NOT all the same

I read `package.json` for several sub-packages via the GitHub API. The `"license"` field varies:

| Package              | License field in `package.json` | Notes                                                              |
| -------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `remotion` (core)    | `SEE LICENSE IN LICENSE.md`     | The custom Remotion License [^pkg-core]                            |
| `@remotion/renderer` | `SEE LICENSE IN LICENSE.md`     | Same custom license [^pkg-renderer]                                |
| `@remotion/lambda`   | `SEE LICENSE IN LICENSE.md`     | Same custom license [^pkg-lambda]                                  |
| `@remotion/captions` | `MIT`                           | Genuinely MIT! Just SRT parse/serialize primitives [^pkg-captions] |

So the **caption utility primitives** (`parseSrt`, `serializeSrt`, the `Caption` type) are MIT and AGPL-compatible standalone. Everything that actually renders frames or drives the headless browser is under the custom license.

### 1.4 Pricing (commercial tiers)

From <https://www.remotion.pro/license>: [^pricing]

| Tier                    | Price                                        | Target                                                                                       |
| ----------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Free License            | $0                                           | Individuals, ≤3-employee for-profits (incl. contractors as of v5.0), non-profits, evaluators |
| Remotion for Creators   | $25/seat/month, **$75/mo minimum (3 seats)** | Low-volume internal video creation by people                                                 |
| Remotion for Automators | $0.01/render, **$100/mo minimum**            | Apps that programmatically render for end users (this is us)                                 |
| Enterprise              | From $500/mo                                 | Custom terms, private channel, monthly consulting                                            |

**The "Automators" tier is the one that would apply to us** if our v3 ships a "click to generate Video Overview" button to end users and we cross the size threshold. At our anticipated scale (academic users, presumably 5+ renders/week per active user), the per-render cost is small in absolute terms but the **$100/mo floor is the real number**, and it's recurring forever as long as the feature ships.

### 1.5 How enforcement works in practice

The `@remotion/licensing` package is **voluntary telemetry**, not enforcement. From its docs: [^licensing-pkg]

> Telemetry never blocks or fails a render. Even if the telemetry request fails or licensing is violated, the render will still complete successfully.

So technically the software will run regardless. The "enforcement" is contractual + reputational. Remotion is run by a small team (Jonny Burger + ~3 people, per PitchBook) [^remotion-company] and they do contact users they suspect of unlicensed commercial use. We should not plan to operate in violation.

---

## 2. What it is

Remotion is a **React-based framework for programmatically generating videos**. You write video scenes as React components; an off-thread headless Chromium renders each frame to PNG; ffmpeg stitches the frames + audio into MP4 (or WebM / GIF / image sequence).

### 2.1 Architecture (render pipeline)

```
React composition (your code)
   │
   ▼
Bundler (webpack/esbuild) ─▶ serve URL
   │
   ▼
@remotion/renderer (Node)
   │  spawns
   ▼
Headless Chromium (Chrome Headless Shell, downloaded on first run if no system browser)
   │  for each frame:
   │   • set useCurrentFrame() = N
   │   • wait for delayRender() handles
   │   • screenshot the DOM
   ▼
PNG sequence + audio tracks
   │
   ▼
ffmpeg (bundled binary, pinned version) ─▶ MP4 / WebM / GIF
```

### 2.2 What Remotion is good at

- **Data-driven video**: anything where the content is structured (a notebook, a JSON outline, a citation list). Our "video overview" is exactly this shape.
- **Reusing existing web skills**: React, CSS, Tailwind, framer-motion, all work. We already have the UI stack.
- **Parameterized re-renders**: pass `inputProps`, get a new video. Great for "regenerate the overview after the notebook changes."
- **Captions, audio sync, scenes**: first-class `<Sequence>`, `<Audio>`, `<Video>` primitives.
- **Embeddable preview**: `@remotion/player` is a real React component that can play the composition in-app without rendering to MP4 first.

### 2.3 What Remotion is NOT good at

- **Real-time / live video**. It's a frame-by-frame batch renderer.
- **Complex 3D**. You can render WebGL/three.js, but it's slow and frame-perfect determinism is brittle.
- **After Effects-style raster compositing** (proper alpha-channel layering of pre-rendered media). Works, but not its strength.
- **Anything depending on browser features that don't play nicely with headless screenshot-per-frame**: real `<video>` playback timing, microphone input, requestAnimationFrame timing assumptions, real WebRTC. (See §9 gotchas.)
- **Tiny bundle apps**. The render path needs Chrome Headless Shell + ffmpeg, both heavy.

---

## 3. How to use it

### 3.1 Install

```bash
npm i remotion @remotion/cli @remotion/renderer
# Optional for our use case:
npm i @remotion/captions @remotion/google-fonts @remotion/player
```

### 3.2 A narrated-slide composition (the building block for our Video Overview)

```tsx
// src/remotion/Overview.tsx
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';

type Slide = {
  heading: string;
  body: string;
  citation?: string;
  narrationSrc: string; // path to a Supertonic/Piper TTS .mp3
  durationFrames: number; // matches narration length
};

export const Overview: React.FC<{ slides: Slide[]; title: string }> = ({ slides, title }) => {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ background: '#0b0e14', color: '#e6e6e6', fontFamily: 'Inter' }}>
      {slides.map((s, i) => {
        const from = cursor;
        cursor += s.durationFrames;
        return (
          <Sequence key={i} from={from} durationInFrames={s.durationFrames}>
            <Audio src={s.narrationSrc} />
            <Slide {...s} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const Slide: React.FC<Slide> = ({ heading, body, citation }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeIn = Math.min(1, frame / (fps * 0.4)); // 0.4s fade-in
  return (
    <AbsoluteFill style={{ padding: 120, opacity: fadeIn }}>
      <h1 style={{ fontSize: 80, fontWeight: 700 }}>{heading}</h1>
      <p style={{ fontSize: 42, lineHeight: 1.4, marginTop: 40 }}>{body}</p>
      {citation && (
        <p style={{ position: 'absolute', bottom: 80, fontSize: 24, opacity: 0.7 }}>
          Source: {citation}
        </p>
      )}
    </AbsoluteFill>
  );
};
```

```tsx
// src/remotion/Root.tsx
import { Composition } from 'remotion';
import { Overview } from './Overview';
export const Root = () => (
  <Composition
    id="overview"
    component={Overview}
    durationInFrames={1800} // computed from slides at registration time
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ slides: [], title: '' }}
  />
);
```

### 3.3 Programmatic render from Node (what our Electron main process will call)

```ts
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const serveUrl = await bundle({ entryPoint: 'src/remotion/index.ts' });
const composition = await selectComposition({
  serveUrl,
  id: 'overview',
  inputProps: { slides, title },
});
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: '/path/to/out.mp4',
  inputProps: { slides, title },
});
```

### 3.4 Preview workflow

`npx remotion studio` opens a local browser-based timeline scrubber. Useful for designers iterating on visuals; not needed at runtime.

---

## 4. Captions and accessibility

### 4.1 What `@remotion/captions` does

`@remotion/captions` is a small, **MIT-licensed** utility package. [^pkg-captions] It exposes:

- A `Caption` type (`{ text, startMs, endMs, ... }`)
- `parseSrt()` — parse a `.srt` string into `Caption[]`
- `serializeSrt()` — turn `Caption[]` back into `.srt` text [^captions-docs]

It does **not** render anything by itself. You render captions by mapping `Caption[]` to a React component inside a `<Sequence>`.

### 4.2 Burned-in vs sidecar captions

- **Burned-in (visual only)**: render a `<Caption>` React component that reads the current frame's time and shows the active caption. The text is part of the video's pixels.
- **Sidecar `.srt`/`.vtt`**: Remotion's `renderMedia()` does _not_ automatically emit a sidecar caption file. You generate it yourself by writing `serializeSrt(captions)` to a `.srt` next to the MP4. To make players pick it up, name it `out.mp4.srt` or wrap the MP4 in an MKV.
- **Embedded soft-subtitle track in MP4**: ffmpeg supports this via `-c:s mov_text`, but Remotion's renderer doesn't expose a built-in flag for it as of v4.x. Would need to post-process with an extra ffmpeg invocation or use Remotion's `audioCodec`/`muxing` extension surfaces.

### 4.3 Accessibility design implication (critical for our app)

**A "Cinematic Video Overview" that embeds captions only visually is not accessible to screen-reader users**, and partly inaccessible to deafblind users using refreshable braille. Burned-in captions also can't be styled by the user (high-contrast, larger text, dyslexia-friendly font) — which directly conflicts with our WCAG 2.1 AAA target and our ADHD/Autism focus.

**Recommended posture for v3:**

1. Always ship the video **alongside** a structured, navigable transcript view (storyboard form: slide title, body text, citation, embedded audio per slide). This is _the_ primary accessible artifact; the video is the secondary, "cinematic" one.
2. Ship a sidecar `.vtt` so platforms (YouTube, native players, accessibility tools) can pull subtitles.
3. Embed captions visually in the video too, but as a _toggleable_ render option — let the user choose to render with or without burned-in captions.
4. Author an **audio description track** (see below).

### 4.4 Audio description tracks

Remotion supports multiple `<Audio>` tracks within a composition; they get mixed into a single audio output by default. To produce **a separate audio-description track** (a second selectable audio stream describing the visuals for blind users), you have two options:

- **Cheap, accessible-enough**: bake an "AD" mode into the composition that mixes a TTS description over the narration with the narration ducked, and render a second `out.audio-described.mp4`.
- **Proper**: render the AD as a separate stem, then use ffmpeg post-processing to mux it as a second audio track in the MP4 container (so players can switch). Remotion doesn't natively expose this; you'd shell out to `ffmpeg -i out.mp4 -i ad.mp3 -map 0 -map 1:a -c copy -metadata:s:a:1 language=eng-desc out_with_ad.mp4`.

Either path requires us to **generate the description text from the storyboard** (we have the slide content already — the description is straightforward to template).

---

## 5. Programmatic rendering at scale

### 5.1 The `@remotion/renderer` Node API

- `renderMedia()` — one-shot render of an entire composition. [^render-media]
- `renderFrames()` — older two-step API; produce PNG sequence + audio, then mux yourself.
- `renderMediaOnLambda()` from `@remotion/lambda/client` — fan out to AWS Lambda for parallel cloud rendering.

CPU is the dominant bottleneck (parallelizable per frame). GPU is largely unused unless you're rendering WebGL or HEVC. ffmpeg is **bundled and pinned** by Remotion — you get a known-good build, you don't pull from the system, this matters for reproducibility.

### 5.2 Bundling implications for Electron

**Yes, Remotion needs its own Chromium even inside Electron.**

The official `remotion-dev/template-electron` template confirms this: "may also download Chrome Headless Shell if no compatible local browser is installed yet." [^electron-template] Remotion uses Chrome Headless Shell (a separate ~200MB build), not Electron's own Chromium. The render path runs in the Node main process and spawns this child Chromium externally; it cannot piggyback on the Electron renderer's Chromium.

**Bundle-size impact:**

| Component                                             | Approx. size    |
| ----------------------------------------------------- | --------------- |
| Electron base (Chromium + Node)                       | ~200 MB         |
| Chrome Headless Shell (Remotion's renderer browser)   | ~170–200 MB     |
| ffmpeg bundled binaries (per platform)                | ~50–80 MB       |
| `@remotion/compositor-*` native binary (per platform) | ~10 MB          |
| Total Remotion overhead on top of Electron            | **~230–290 MB** |

We can defer this by **downloading Chrome Headless Shell on first use** rather than bundling it. Tradeoff: a noticeable first-render delay + a download dependency at runtime.

### 5.3 Local vs cloud render — privacy considerations

|                                                    | Local render (`@remotion/renderer`)   | Remotion Lambda                               |
| -------------------------------------------------- | ------------------------------------- | --------------------------------------------- |
| Where notebook content goes                        | Stays on user's laptop                | Uploaded to user's own AWS account            |
| Bundle/serve URL                                   | Local                                 | Stored in S3 bucket                           |
| inputProps (slide content, narration, transcripts) | In-process                            | Passed to Lambda invocation                   |
| Cost                                               | $0 (CPU + electricity)                | $ per-render + S3 + invocation [^lambda-cost] |
| Speed                                              | 5–30s/sec of video on a modern laptop | Wall-clock seconds (massive parallelism)      |
| Works offline                                      | Yes                                   | No                                            |

**For an academic notebook app, Lambda is a hard sell.** Even though it's the _user's own_ AWS account, getting students to deploy and pay for Lambda infrastructure is unrealistic. And if we instead use _our_ Lambda infrastructure as a hosted service, we (a) are sending sensitive academic content (theses, drafts, source citations) through our servers, (b) need a backend we said in our v1/v2 plan we don't want, and (c) pay perpetually for renders.

**Default recommendation: local render only. Cloud render is a v4+ premium feature, opt-in, with explicit data-residency disclosure.**

---

## 6. Integration patterns for our app

### Pattern A — Bundled Remotion in Electron, local render only

- **Pros:** All-private, no backend, "just works" for the user, matches our v1/v2 ethos.
- **Cons:** Bundle bloat (~250 MB). Slow on weak laptops. **License: requires Free License eligibility (≤3-employee org or non-profit) OR a Company License at $100/mo minimum (Automators tier).** AGPL conflict is real if our app is strictly AGPL — see §1.2.

### Pattern B — User installs Remotion themselves; we generate a project bundle

We emit a `remotion-project/` directory (composition.tsx + assets + render script). User runs `npx remotion render` against it themselves.

- **Pros:** Smaller install. License burden may legally shift to user (they are the licensee, an individual eligible for Free License). Closer to AGPL-compatible because Remotion isn't _bundled in_ our distributed work.
- **Cons:** Massive friction — no longer "click to make video." Requires user to have Node.js. Loses the magic. Plausibly violates the Remotion license intent anyway if we're _templating_ a Remotion project as part of our product's functionality; we'd want to check this in writing.

### Pattern C — Cloud render via Remotion Lambda or our own service

- **Pros:** Fastest renders. Smallest client install.
- **Cons:** Sends notebook content off-device — a hard no for our positioning. Recurring cost. Backend infrastructure we said we don't want until v3+.

### Pattern D — Skip Remotion, use an alternative

See §7. **My recommendation, given our license constraints.** The strongest candidate is **Motion Canvas (MIT)** or its server-friendly fork **Revideo (MIT)** for a TypeScript path, or **Manim (MIT)** for a Python-driven path (worse fit for an Electron+JS app).

---

## 7. Alternatives

| Tool                                       | License                                     | Renderer                         | AGPL OK?              | Fit for our use case                                                     |
| ------------------------------------------ | ------------------------------------------- | -------------------------------- | --------------------- | ------------------------------------------------------------------------ |
| Remotion                                   | Custom source-available                     | Headless Chromium + ffmpeg       | **NO** (with caveats) | Excellent technical fit; license is the blocker                          |
| Motion Canvas                              | **MIT**                                     | Browser Canvas API + ffmpeg      | **YES**               | Good fit, no React though                                                |
| Revideo (fork of Motion Canvas)            | **MIT**                                     | Canvas + Node.js + ffmpeg        | **YES**               | Best MIT alternative for programmatic Node rendering                     |
| Manim Community                            | **MIT**                                     | Cairo / OpenGL → ffmpeg (Python) | **YES**               | Python-only; awkward for Electron+TS app                                 |
| 3b1b/manim                                 | **MIT**                                     | Cairo / OpenGL → ffmpeg (Python) | **YES**               | Personal project of 3blue1brown; ManimCE is the community-maintained one |
| FFmpeg + headless Chromium (DIY)           | LGPL-2.1+ / GPL-2 / mixed [^ffmpeg-license] | DIY                              | Mostly yes            | Maximum flexibility, maximum work                                        |
| Browser `MediaRecorder` + Canvas/WebCodecs | Free (Web Platform)                         | In-renderer                      | Yes                   | Works in Electron renderer, codec limits                                 |

### 7.1 Motion Canvas

- **License:** MIT, verified by reading the actual `LICENSE` file in `motion-canvas/motion-canvas`. [^motion-canvas-license]
- **What it is:** TypeScript-first, generator-function-based animation library with a real-time editor. Designed for explainer videos. Renders an image sequence (or MP4 via FFmpeg exporter) from the browser.
- **AGPL-compat:** Yes — MIT is permissive and AGPL-compatible. We can statically link and the combined work can be AGPL.
- **Fit for us:** Good visually, but **rendering is primarily browser-driven** — not a clean Node-side render pipeline. Has an image-sequence + ffmpeg exporter and the workflow is _"render in the editor app, then post-process"_, which doesn't fit "click to generate" UX cleanly. Not React.
- **Activity (May 2026):** Last pushed Feb 2025, ~18.5k stars. Maintained but not aggressively developed. [^repo-stats]

### 7.2 Revideo

- **License:** MIT. [^revideo-license] Same license file as Motion Canvas (it's a fork).
- **What it is:** A fork of Motion Canvas specifically designed for **server-side / Node.js rendering** of automated video pipelines. Adds a `renderVideo()` function callable from a Node process — exactly the gap that makes Motion Canvas awkward for our use. [^revideo-comparison]
- **AGPL-compat:** Yes.
- **Fit for us:** **The strongest single alternative for our use case.** TypeScript, MIT, Node-renderable, designed for the exact "app generates video" workflow we want. Not React, but the generator-function style is approachable and the Canvas API gives us pixel control.
- **Activity (May 2026):** ~3.8k stars, last pushed May 2025. Smaller community than Remotion or Motion Canvas. Risk: smaller maintainer team. [^repo-stats]

### 7.3 Manim Community (ManimCE)

- **License:** MIT (verified). [^manimce-license] 3b1b/manim is also MIT (verified). [^3b1b-license]
- **What it is:** Python framework for math/science explainer animations. Famous from 3blue1brown.
- **AGPL-compat:** Yes.
- **Fit for us:** Best-in-class for math notation and graph/diagram animations. **Poor fit** as a primary renderer in an Electron+TS app — we'd need to ship Python + Manim's dependency stack (Cairo, LaTeX, FFmpeg) which dwarfs Remotion's overhead. Could be useful as a _secondary, specialized_ renderer for the subset of academic notebooks that are math-heavy.

### 7.4 FFmpeg + headless Chromium (DIY)

- **License stack:** FFmpeg is LGPL-2.1+ by default (some optional libraries like libx264 are GPL/proprietary); using LGPL via dynamic linking is AGPL-compatible. [^ffmpeg-license] Chromium is BSD-style + various.
- **What it is:** Spawn headless Chrome, screenshot DOM per frame, pipe to ffmpeg. This is essentially what Remotion does, minus the React composition framework.
- **AGPL-compat:** Yes, with attention to which ffmpeg components we build with.
- **Fit:** Most flexibility, most engineering work. **Worth considering** if we want to control the whole pipeline and not lock into a specific composition framework — but we'd be re-implementing what Remotion/Motion Canvas already solved.

### 7.5 Browser `MediaRecorder` + Canvas / WebCodecs

- **License:** Web Platform API, free.
- **What it is:** Render the composition to a Canvas (or DOM via `html2canvas`), capture via `canvas.captureStream()`, encode via `MediaRecorder` (WebM/MP4 depending on Chromium build).
- **AGPL-compat:** Yes (no third-party rendering library).
- **Fit:** Runs inside our Electron renderer process — no second Chromium, no ffmpeg binary. **Constraints:** codec support varies (Chromium's WebCodecs `VideoEncoder` does h264/AV1; MediaRecorder MP4 support is uneven). Frame-perfect timing is harder than Remotion's "set the clock manually" approach. **Could be a viable v3 path** if we keep the visual complexity modest.

---

## 8. Recommended path for v3

### 8.1 The decision tree

```
Is our org a for-profit with ≥4 employees (counting contractors)?
├─ NO ──▶ Are we shipping under strict AGPL?
│         ├─ NO ──▶ Remotion is free + technically usable. Best DX.
│         │         (Use the Free License. Add a license-attribution screen.)
│         └─ YES ──▶ Remotion has the AGPL combination problem.
│                    Either dual-license the Remotion-bundled build
│                    OR pick Revideo (MIT, AGPL-clean).
└─ YES ──▶ We need to pay Remotion ($100/mo minimum, Automators tier)
            OR pick Revideo / Motion Canvas / DIY.
```

### 8.2 My opinionated recommendation

**Use Revideo for v3.** Reasoning:

1. **License is genuinely AGPL-compatible.** No legal ambiguity, no need to dual-license, no need to email Remotion for a special exception. This alone is decisive given our AGPL posture.
2. **Designed for Node-driven programmatic rendering** — same use case we have.
3. **TypeScript, Canvas API** — fits a modern Electron+TS app. We don't need React inside the composition; we need pixel control + timeline composition, both of which Revideo gives us.
4. **No recurring cost, ever.** Whether we end up with 4 employees or 400.
5. **The downsides** (smaller community, no React, no equivalent of Remotion Studio's polish) are real but manageable. We are not building a public video-editing tool; we are building a single feature whose UI we own.

**Fallback if Revideo proves immature in practice:** Roll our own with headless Chromium + ffmpeg (Pattern from §7.4). More work but no lock-in.

**Do not** ship Remotion bundled in an AGPL Electron app without first getting a written license clarification from Remotion's team. Even though it's technically the most polished option, the legal cost is too high.

### 8.3 Is "video" the right format at all?

Worth questioning the premise. **A Cinematic Video Overview is, in our context, mostly a marketing/engagement feature**, not an accessibility one. The _information_ in the video is fully present in the transcript + audio narration + slide visuals — none of which require MP4 encoding.

Consider this alternative shape:

- **"Audio Walkthrough" mode** — a scrolling document with synchronized highlights, an audio narration track that plays alongside, and per-section navigation. No video file at all.
- 100% accessible to screen-reader users (it's a document).
- 100% accessible to keyboard users.
- User can set their own font/contrast/spacing — WCAG AAA cooperative by construction.
- Trivially indexable, searchable, copy-pasteable.
- **Zero video-licensing concerns.** No Remotion, no Motion Canvas, no codec stack.
- Renders in our existing UI stack.
- Can still be _exported_ to MP4 later via a server-side render or user-installed tool if someone wants to share it on social media.

**Strong opinion:** Ship "Audio Walkthrough" as the _primary_ feature in v3, and treat "Cinematic Video Overview" as a v4+ stretch goal. The video format adds engineering risk, licensing risk, accessibility risk, and bundle weight, in exchange for a marketing-vid demo that few academic users actually need. The walkthrough mode covers 90% of the user benefit at 10% of the cost.

If we eventually do want video export, Revideo (or `MediaRecorder` for in-renderer simple cases) becomes a clean, optional plugin on top of the walkthrough data model.

---

## 9. Things to know / gotchas

### 9.1 License history

- Pre-v4: similar two-tier model, lower thresholds, terms have been adjusted multiple times.
- **v5.0 (2026)**: contractors now count toward the 3-employee threshold; license is now bound to formal Terms & Conditions instead of auto-generated. [^v5-changes]
- Future changes: Remotion explicitly reserves the right to amend the license between versions. If we pin to v4.0.x, the v4 license terms apply _for that version_; upgrading requires re-checking. **This is a real source of long-term maintenance risk.**

### 9.2 Remotion Lambda render-farm pricing

No flat per-minute number is published. Remotion's docs say _"most users render multiple minutes of video for just a few pennies."_ [^lambda-cost] For a 60s 1080p video at typical settings, anecdotal community numbers suggest ~$0.005–$0.05 per render in AWS costs, plus S3 transfer. Plus our Automators tier cost ($0.01/render telemetry). If we render 10,000/mo, that's ~$100 to Remotion + ~$50–$500 to AWS.

### 9.3 Determinism

Remotion does **not** make an explicit determinism guarantee in its docs. In practice, given identical `inputProps`, the same composition, the same Remotion version, the same browser version, the same fonts, and the same ffmpeg, output is bit-identical or close to it. Sources of nondeterminism: async font loading (mitigated by `delayRender`), real-time Date.now() inside components (don't use it), Math.random() (seed it), browser version drift on auto-update of Chrome Headless Shell. **For caching purposes, hash on `inputProps + composition source + Remotion version`; assume determinism but don't depend on it for cryptographic correctness.**

### 9.4 Font handling

- Use `@remotion/google-fonts` for Google Fonts (it wraps `delayRender`/`continueRender` for you). [^fonts]
- Use `@remotion/fonts` + `staticFile()` for local fonts.
- **Critical**: only load the specific weights and subsets you need; loading "everything" causes `delayRender` timeouts.
- Fonts must be loaded _before_ the first frame paints, or text will pop in on later frames. The `delayRender` handle is the mechanism.

### 9.5 Browser API quirks during render

- `useCurrentFrame()` instead of `Date.now()` — time is set by the renderer per frame.
- No real `<video>` playback — use `<OffthreadVideo>` to extract frames at a given timestamp.
- No real audio playback during render — audio is mixed in the post-process ffmpeg step.
- `requestAnimationFrame` doesn't run in render mode; use frame-based animation only.
- `setTimeout` / `setInterval` are basically inert across frames.

### 9.6 ffmpeg codec licensing

- **H.264 (default)**: patent licensing for distribution exists in theory; MPEG-LA / Via LA has not pursued individual developers, but corporate distribution agreements can be expensive at scale. [^codec-fees] H.264 in software encoding is generally safe in 2026 but not legally bulletproof.
- **H.265/HEVC**: multiple competing patent pools (MPEG LA, HEVC Advance, Velos Media). **Avoid by default.** Only opt in if a user specifically needs it.
- **AV1**: Royalty-free in intent. The Sisvel pool has muddied this since 2019. Practically safe. [^codec-fees]
- **WebM/VP9**: Royalty-free, safe.
- **Recommended default for our app: H.264 in MP4 container.** WebM/VP9 as a setting for license-cautious users.

### 9.7 Maturity and project health (May 2026)

- **Remotion**: ~47.8k stars, push activity today, 4 employees, very actively maintained. The most mature option by a wide margin. [^repo-stats]
- **Motion Canvas**: ~18.5k stars, last push Feb 2025. Maintained but slowing.
- **Revideo**: ~3.8k stars, last push May 2025. Small but active.
- **Manim Community**: hundreds of contributors, multiple releases per year.

---

## 10. Open questions to resolve before committing

1. **Direct from Remotion team:** if our entity is non-profit but we ship our software under AGPL to users who are themselves non-profits or individuals, does our app trigger any obligation? Answer should be in writing, not via FAQ. Email <hi@remotion.dev>.
2. **Direct from Remotion team:** does Pattern B (we generate a Remotion project, user installs Remotion and renders) qualify the _user_ as the licensee?
3. **For us:** what is our planned legal entity structure — non-profit foundation, for-profit corp, sole proprietor, etc.? This single answer determines whether we even need to ask question 1.
4. **For us:** do we ship strict AGPL, AGPL + exception, or dual-license? This is a decision we owe ourselves regardless of Remotion.
5. **Prototype:** build a 30-slide narrated overview in Revideo and one in Remotion; compare DX, render time, bundle size, and accessibility surface. Allocate 1 week of engineering for this spike before locking in.

---

## Footnotes

[^license]: Remotion `LICENSE.md`, fetched via `gh api repos/remotion-dev/remotion/contents/LICENSE.md` on 2026-05-23. <https://github.com/remotion-dev/remotion/blob/main/LICENSE.md>

[^agplv3]: GNU Affero General Public License v3.0, sections 5 ("Conveying Modified Source Versions") and 7 ("Additional Terms"). <https://www.gnu.org/licenses/agpl-3.0.en.html>

[^fsf-licenselist]: FSF "Various Licenses and Comments about Them" — discussion of source-available / proprietary licenses and AGPL compatibility. <https://www.gnu.org/licenses/license-list.html>

[^v5-changes]: Remotion PR #3750, "Remotion 5 license changes." Notably: "Contractors also count towards team size. Previously, a company could only work with contractors and never have to get a company license." <https://github.com/remotion-dev/remotion/pull/3750>

[^pkg-core]: `packages/core/package.json` (the `remotion` npm package), fetched via `gh api repos/remotion-dev/remotion/contents/packages/core/package.json` 2026-05-23. License field: `SEE LICENSE IN LICENSE.md`.

[^pkg-renderer]: `packages/renderer/package.json`, fetched 2026-05-23. License field: `SEE LICENSE IN LICENSE.md`.

[^pkg-lambda]: `packages/lambda/package.json`, fetched 2026-05-23. License field: `SEE LICENSE IN LICENSE.md`.

[^pkg-captions]: `packages/captions/package.json`, fetched 2026-05-23. License field: `MIT`. This is the only Remotion sub-package among those examined whose `package.json` explicitly declares MIT.

[^pricing]: Remotion Pro pricing page, fetched 2026-05-23. <https://www.remotion.pro/license> — Creators tier "$25/month per seat" (3-seat minimum = $75/mo); Automators tier "$0.01 per render, $100/month minimum"; Enterprise "Starting at $500/month."

[^licensing-pkg]: `@remotion/licensing` documentation. <https://www.remotion.dev/docs/licensing> "Telemetry never blocks or fails a render. Even if the telemetry request fails or licensing is violated, the render will still complete successfully."

[^remotion-company]: PitchBook company profile lists Remotion as having 4 employees. <https://pitchbook.com/profiles/company/513100-09>

[^captions-docs]: Remotion captions docs — `parseSrt()` <https://www.remotion.dev/docs/captions/parse-srt>, `serializeSrt()` <https://www.remotion.dev/docs/captions/serialize-srt>

[^render-media]: Remotion `renderMedia()` docs. <https://www.remotion.dev/docs/renderer/render-media>

[^electron-template]: Remotion Electron template repo. <https://github.com/remotion-dev/template-electron> — "may also download Chrome Headless Shell if no compatible local browser is installed yet."

[^lambda-cost]: Remotion Lambda overview. <https://www.remotion.dev/docs/lambda> — "Most of our users render multiple minutes of video for just a few pennies."

[^motion-canvas-license]: Motion Canvas `LICENSE`, fetched via `gh api repos/motion-canvas/motion-canvas/contents/LICENSE` 2026-05-23. Verbatim MIT License, Copyright (c) 2022 motion-canvas.

[^revideo-license]: Revideo `LICENSE`, fetched via `gh api repos/redotvideo/revideo/contents/LICENSE` 2026-05-23. Verbatim MIT License (text identical to Motion Canvas, reflecting the fork).

[^revideo-comparison]: pkgpulse comparison "Remotion vs Motion Canvas vs Revideo (2026)." <https://www.pkgpulse.com/blog/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026> Revideo described as "the open-source fork of Motion Canvas" with "Node.js API" for server-side rendering.

[^manimce-license]: ManimCommunity/manim `LICENSE`, fetched via `gh api repos/ManimCommunity/manim/contents/LICENSE` 2026-05-23. MIT License, Copyright (c) 2018 3Blue1Brown LLC (inherited from the upstream 3b1b/manim fork from which ManimCE was forked).

[^3b1b-license]: 3b1b/manim `LICENSE.md`, fetched via `gh api repos/3b1b/manim/contents/LICENSE.md` 2026-05-23. MIT, Copyright (c) 2020-2023 3Blue1Brown LLC.

[^ffmpeg-license]: FFmpeg is LGPL-2.1+ by default; some optional libraries (e.g., libx264) are GPL, and a few are non-free. Default builds are LGPL and AGPL-compatible via dynamic linking. <https://ffmpeg.org/legal.html>

[^repo-stats]: Stargazer counts and last-push timestamps from `gh api repos/{owner}/{repo}` 2026-05-23: remotion-dev/remotion (47,808 stars, pushed 2026-05-23); motion-canvas/motion-canvas (18,555 stars, pushed 2025-02-16); redotvideo/revideo (3,812 stars, pushed 2025-05-09).

[^fonts]: Remotion fonts docs. <https://www.remotion.dev/docs/fonts/>

[^codec-fees]: Tom's Hardware, "H.264 streaming license fees jump from $100,000 to $4.5 million" — illustrates that codec patent fees can scale aggressively with corporate revenue but historically have not been pursued against individual developers. <https://www.tomshardware.com/service-providers/streaming/h264-streaming-license-fees-jump-from-100000-to-4-5-million>
