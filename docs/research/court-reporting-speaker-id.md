# Speaker Identification in Stenography, Court Reporting, and CART — Cursory Research

Survey of how professional stenographers, court reporters, voice writers, and CART (Communication Access Real-time Translation) providers identify and label multiple speakers in real-time transcripts. The motivating question: what should the notebook-app's [live captioning mode](../features/audio-recording-and-transcription/OVERVIEW.md#mode-2--live-captioning) borrow from a century of professional practice, and where is fully-automatic acoustic diarization actually used in production today (spoiler: rarely, and not where you'd think).

Court reporting is the closest production-deployed analogue to "live captions for a multi-speaker setting with strict accuracy expectations" that we have. CART providers — who serve deaf and hard-of-hearing students in exactly the academic settings this app targets — use the same stenographic skillset and the same speaker-labeling conventions. Borrowing their conventions costs us nothing and makes the app's output trivially upgradeable by a human stenographer or downstream tool. **Not borrowing them means reinventing a solved problem worse.**

**AGPL-compatibility verdict legend:**

- **Compatible** — permissive (MIT/BSD/ISC/Apache-2.0/MPL-2.0/LGPL) or AGPL/GPL-3.0+ itself
- **Incompatible** — GPL-2.0-only, SSPL, BSL/BUSL, "source-available", custom commercial, or no license at all
- **Conditional** — needs further explanation (dual licensing, model-vs-code splits, trademark/watermark conditions, premium-plugin tiers)

This document covers _practices and standards_ for the most part — license analysis is only relevant for the named software tools.

---

## 1. The labeling conventions to copy

A century of court reporting has converged on two stable modes, governed by [NCRA Transcript Format Guidelines](https://omegareporting.com/client-services/formatting-guidelines/) (model), [28 U.S.C. § 753](https://www.law.cornell.edu/uscode/text/28/753) (federal statutory floor), and per-jurisdiction overrides (e.g. [E.D.N.C. Chapter 18](https://www.nced.uscourts.gov/pdfs/TranscriptFormatting.pdf)). Broadcast captioning uses a third, simpler convention.

- **Q&A mode** — `Q.` and `A.` prefixes for sworn witness examination only. When an attorney resumes questioning, a "BY-line" precedes the next Q: `BY MR. SMITH:`. Used in depositions and trial examinations. ([Molloy College CR103 Ch.2](https://www.studocu.com/en-us/document/molloy-college/introduction-to-legal-studies/chapter-2-question-and-answer-and-colloquy/55178481))
- **Colloquy mode** — every speaker labeled in ALL CAPS followed by a colon, either by role (`THE COURT`, `THE WITNESS`, `THE BAILIFF`) or by honorific + surname (`MR. SMITH`, `MS. WAGNER`). Used for everything that isn't sworn examination.
- **Broadcast captioning** — `>> SPEAKER NAME:` (uppercase, chevron prefix). Simpler because broadcast doesn't share court reporting's certified-record expectations. ([NAD on CART](https://www.nad.org/resources/technology/captioning-for-access/communication-access-realtime-translation/), [TV Tech on Verbit's broadcast speaker ID](https://www.tvtechnology.com/news/verbit-launches-speaker-identification-for-live-asr-broadcast-captions))

The chevron convention dates back to [EIA-608 line-21 captioning](https://en.wikipedia.org/wiki/EIA-608); the colloquy/Q&A conventions predate computers entirely. Both are screen-reader-friendly: the ALL-CAPS-plus-colon-plus-newline pattern is exactly what NVDA, JAWS, and VoiceOver punctuate as a hard speaker transition.

**Recommendation for the notebook-app:** adopt the broadcast `>> NAME:` form as the default and offer the colloquy `NAME:` form as a setting for legal/academic users who want the more formal output. Don't invent a third idiom.

## 2. The legal "rough draft" wedge

The legal world distinguishes the **realtime / uncertified / "rough draft"** feed (a working tool, not the record) from the **certified transcript** (signed by a CSR/RPR, NCRA-format-compliant, statutorily authorized). See [CalDRA's Uncertified Rough Draft Guidelines](https://www.caldra.org/uncertified-draft-guidelines) and [28 U.S.C. § 753(b)](https://www.law.cornell.edu/uscode/text/28/753) — the "or any other method" clause is what legally permits ASR-based capture under Judicial Conference rules, and [the federal court-reporting policy](https://www.uscourts.gov/file/2854/download) elaborates.

**This is the wedge live captions fit through cleanly.** A notebook-app's live caption is explicitly a rough draft. It doesn't need to meet certified-transcript accuracy to be useful — but adopting the same conventions means the output is one human-review pass away from being upgradeable to a certified transcript or a CART-quality archive.

## 3. Computer-Aided Transcription (CAT) software

The stenographer's transcript editor. Closed-source commercial dominates; speaker labels are emitted by **per-stroke macros**, not after-the-fact diarization — saying "Smith" is a single chord that emits `\n\nMR. SMITH: ` with the next character capitalized.

- **[Stenograph Case CATalyst Pro](https://www.stenograph.com/catalyst-pro-39441)** — the dominant US commercial CAT. Windows-only, licenses in the thousands. Features [live mistranslation suggestions and Case Prep briefs](https://www.stenograph.com/catalyst-pro-popular-features). Speaker labels emitted by user dictionary macros. **License: Closed-source commercial — Incompatible.** (Useful as UX reference only.)
- **[Advantage Software Eclipse / Total Eclipse](https://www.eclipsecat.com/Eclipse)** — Stenograph's main competitor. Its **["See It - Speakers & Timekeeping"](https://www.eclipsecat.com/node/574) feature maps speakers via a seating chart to physical microphone channels** — mic 1 = judge, mic 2 = witness — and color-codes them in real time. This is the closest commercial example of operator-driven diarization-by-hardware. **License: Closed-source commercial — Incompatible.**
- **[Eclipse RSR (Realtime Speech Reporting)](https://www.eclipsecat.com/product/EclipseRSR)** — Eclipse's voice-writing flavor, integrates with Dragon. **License: Closed-source commercial — Incompatible.**
- **ProCAT Winner / Xpression / Impression** — third major commercial CAT vendor; features AutoBrief and multi-channel audio recording ([Planet Depos roundup](https://planetdepos.com/the-latest-writers-and-cat-software-technology-part-4)). **License: Closed-source commercial — Incompatible.**
- **StenoCAT, digitalCAT, and other smaller vendors** — listed at [StenoLife](https://www.stenolife.com/index.php/site/links/category/CAT-Software). Niche commercial. **License: Closed-source commercial — Incompatible.**
- **[Plover (Open Steno Project)](https://opensteno.org/plover/)** — the only meaningful FOSS option. Cross-platform input engine that converts steno strokes to keystrokes for any app; works with hobby NKRO keyboards or real steno machines. It is **not a CAT** — it has no transcript document model, no realtime feed, no speaker-aware features per se. But it's used by professionals and hobbyists to emit speaker labels via dictionary macros: the [stanographer blog](https://blog.stanographer.com/my-top-essential-plover-commands/) shows the canonical pattern — one stroke → `\n\nJOSH: ` with the next character capitalized. [Paul Fioravanti's "Plover For The Record"](https://www.paulfioravanti.com/blog/plover-for-the-record/) documents the Q&A dictionary outlines (`STPHAO` → `MR.`) and the find-and-replace surname customization workflow. **License: GPL-2.0-or-later — Compatible.** Worth surfacing in the notebook-app as a supported _input device_ for users who already own steno hardware, not something we ship in the box.

### Digital reporter tools (microphone-first, not stenographer-first)

- **[For The Record (FTR) Gold / RealTime](https://fortherecord.com/)** — the dominant tool for "digital court reporters" (non-stenographer operators). Multi-mic capture + [annotation suite](https://fortherecord.com/our-solutions/ftr-gold-annotation-suite/). [FTR RealTime](https://www.fortherecord.com/our-solutions/ftr-realtime/) claims ~95% ASR accuracy with "highly accurate speaker attribution," driven by per-seat mic channel separation rather than acoustic diarization. **License: Closed-source commercial — Incompatible.** The architecture insight is the relevant takeaway: in production, "speaker ID" usually means "which microphone is hot."

## 4. Voice writing / stenomask

A court reporter wears a sound-dampening mask, _silently re-speaks everything they hear including speaker designations_ ("Mr. Smith: …"), and feeds a single-speaker ASR engine. This collapses multi-speaker diarization to a trained-single-speaker ASR problem by moving the labeling work into the human's mouth. See [Rev's overview](https://www.rev.com/blog/what-is-a-voice-writer), [Regal Court Reporting](https://www.regalcourtreporting.com/voice-stenography), [Grokipedia on stenomasks](https://grokipedia.com/page/Stenomask), and the [CSRNation voice-writing blog](https://csrnation.ning.com/profiles/blogs/what-i-wish-my-steno-colleagues-knew-about-voice-writing).

- **[Nuance Dragon Legal v16](https://www.nuance.com/dragon/business-solutions/dragon-legal.html)** — the de-facto ASR engine for voice writers. **Single-speaker by design** — Nuance explicitly states it is "not designed to transcribe multiple people speaking in a single recording." Each user has their own profile, trained from a ~90-second sample. **License: Closed-source commercial — Incompatible.**
- **[Martel Dragon Stenomask](https://martelelectronics.com/revolutionary-dragon-stenomask-for-voice-recognition/)** and **[Advantage Software's Dragon Stenomask](https://www.eclipsecat.com/product/Dragon-Stenomask)** — USB stenomask hardware tuned for Dragon; integrates with Stenograph and Eclipse. Per Martel, used in every US military courtroom. **License: Hardware — N/A.**
- **[Dragon Legal v16 for court reporters](https://martelelectronics.com/dragon-legal-v16-for-court-reporters/)** — Martel's bundled offering.

**Why the notebook-app should care:** this is a working production design that _routes around the diarization-accuracy problem entirely_ at the cost of a wearable and a trained human. The open-source analogue would be: trained user dictates speaker labels aloud, ASR transcribes them as commands. We do not need a stenomask to borrow the idea. A voice command like "**speaker change, Professor Singh**" treated as a label-event rather than transcript content would replicate the workflow.

## 5. ASR-based legal/captioning vendors

The state of "hosted ASR + automatic diarization" for legal and broadcast use.

- **[Verbit](https://verbit.ai/courtroom-transcription/)** — most-funded legal ASR vendor. [Captivate ASR](https://verbit.ai/ai-technology/verbit-launches-revolutionary-real-time-transcription-service-for-legal-proceedings/) is domain-trained on legal terminology. **The key finding, from [TV Tech](https://www.tvtechnology.com/news/verbit-launches-speaker-identification-for-live-asr-broadcast-captions): Verbit's broadcast speaker ID is not pure acoustic diarization.** Their "Global Prep Team captures voice profiles ('voice signatures') from designated speakers — anchors, reporters, sportscasters — before a program goes to air," and real-time ASR matches against those enrolled signatures. Output format: `>> JONATHAN WILLIAMS:`. **License: Closed-source SaaS — Incompatible.**
- **[Rev](https://www.rev.com/)** — ASR + diarization ~90–95% on ≤6–7 speakers ([Guideflow comparison](https://www.guideflow.com/blog/transcription-software-ai-tools)), human-review tier hits 99%. **License: Closed-source SaaS — Incompatible.**
- **[Otter.ai](https://otter.ai/)** — ~93–95% ASR, ~85% speaker ID per the same comparison. Accuracy drops sharply with crosstalk or similar voices ([OpusClip diarization roundup](https://www.opus.pro/blog/best-speaker-diarization-tools-multi-speaker-video)). **License: Closed-source SaaS — Incompatible.**
- **[Sonix](https://sonix.ai/legal/court-reporters)** — frames legal-grade ASR as a stack: ASR + diarization + glossary + human QC. Marketing source but the architectural framing is correct. **License: Closed-source SaaS — Incompatible.**
- **[AI-Media LEXI ASR](https://www.ai-media.tv/our-products/lexi-ai-powered-captioning-tool-kit/lexi-asr/)** — ASR-based auto-captioning from the company that absorbed Alternative Communication Services. **License: Closed-source SaaS — Incompatible.**
- **[Trint](https://trint.com/)** — multilingual ASR + diarization SaaS for journalism and enterprise. **License: Closed-source SaaS — Incompatible.**

**Takeaway:** every production vendor in this space treats automatic diarization as a hint, not ground truth. They all sell a human-review path. The legal industry's [own pushback](https://clereporting.com/court-reporters-v-digital-recording-and-voice-recognition-a-comprehensive-breakdown/) — that voice recognition is not trusted for the certified record — is a useful asymmetry to lean on: live captioning users do not need certified accuracy, but they do need the output to _structurally resemble_ a certified transcript.

## 6. Open-source diarization libraries

Where the field actually is.

- **[pyannote.audio](https://github.com/pyannote/pyannote-audio)** — the most-cited research diarization library. **License: MIT — Compatible.** Models are on Hugging Face under a gated agreement that requires accepting terms — the v2 weights were openly distributed but **v3.1 weights require Hugging Face authentication and Conditional acceptance of pyannote.ai's terms of use**. Treat as **Conditional** for shipping — the library is MIT but you cannot pre-bundle the weights in an AGPL distribution without the user accepting pyannote.ai's terms. [pyannote.ai benchmark](https://www.pyannote.ai/benchmark) reports ~10% DER on clean audio, ~2.5% real-time factor on GPU. The [whisper.md reference](./whisper.md) already flags this trap; reiterated here.
- **[NVIDIA NeMo Sortformer](https://github.com/NVIDIA/NeMo)** — the current open-source SOTA per the [Neosophie December 2025 benchmark](https://neosophie.com/en/blog/20260223-diarization): ~11% DER, ~77% better than pyannote 3.1, and faster. **License: Apache-2.0 (code) — Compatible.** But the pretrained Sortformer checkpoints ship under the [NVIDIA AI Model License](https://huggingface.co/nvidia/diar_sortformer_4spk-v1) which permits non-production use freely and has additional terms for commercial production deployments — **Conditional**, read it before bundling.
- **[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)** — already endorsed in [related-libraries.md](./related-libraries.md) and the [audio-recording-and-transcription OVERVIEW](../features/audio-recording-and-transcription/OVERVIEW.md) as the v2 diarization target because pyannote weights can't be pre-bundled. ONNX-based pipeline supporting STT + TTS + VAD + speaker diarization in one package. **License: Apache-2.0 — Compatible.** Models distributed separately, with their own licenses.
- **[AssemblyAI's diarization library survey (2026)](https://www.assemblyai.com/blog/top-speaker-diarization-libraries-and-apis)** and **[the SDBench paper (arxiv 2507.16136)](https://arxiv.org/html/2507.16136v2)** — useful for citing real numbers.
- **[Overlap-aware diarization (arxiv 1910.11646)](https://arxiv.org/pdf/1910.11646)** — academic baseline for the overlap problem. Still not solved for live use.

### Known failure modes — _all_ documented in production

These bite every diarization system. [GoTranscript's operational guide on crosstalk](https://gotranscript.com/en/blog/edit-crosstalk-in-transcripts-overlapping-speakers-attribution-rules), [UMEVO's writeup on overlapping speech](https://www.umevo.ai/blogs/ume-all-posts/how-ai-voice-recorders-handle-overlapping-speech-and-cross-talk), and the [EDM 2025 classroom-diarization paper](https://educationaldatamining.org/EDM2025/proceedings/2025.EDM.short-papers.199/index.html) (most relevant to academic settings) document the same recurring failures:

- **Crosstalk** — single-channel diarization mathematically cannot separate two voices in the same waveform window; labels flip, merge, or fragment. Standard human convention: mark `[crosstalk]` or `[overlapping speech]` rather than guess.
- **Similar timbres** — two attorneys of the same age and gender, the same professor lecturing in two voices for emphasis, students in a small seminar.
- **Fast back-and-forth** — Q&A under cross-examination; rapid-fire seminar discussion.
- **Reverberant rooms** — courtrooms, lecture halls, every academic setting we care about.
- **Hot-swap of unknown speakers** — a new student speaks for the first time mid-session; system has no enrolled profile, picks `Speaker_5` arbitrarily, then mis-merges with the next new voice.

## 7. Speaker enrollment / voice profiles

The "pre-register expected speakers, then match in real time" model. Already alluded to in the Verbit and Dragon entries above.

- **[Microsoft Teams "Express voice enrollment"](https://support.microsoft.com/en-us/office/use-microsoft-teams-intelligent-speakers-to-identify-in-room-participants-in-a-meeting-transcription-a075d6c0-30b3-44b9-b218-556a87fadc00)** — per-user voice profile created once, then any Teams Room can attribute speech by name. [Microsoft's blog on Teams Rooms speaker recognition](https://techcommunity.microsoft.com/blog/microsoftteamsblog/get-the-most-out-of-any-teams-rooms-meeting-with-speaker-recognition-and-copilot/4182595) confirms this is the most production-deployed example of pre-session enrollment. **License: Proprietary SaaS — Incompatible**, but useful as design precedent.
- **[Nuance Dragon's per-user profiles](https://www.nuance.com/dragon/business-solutions/dragon-legal.html)** — single-speaker by design; 90-second enrollment per user. **License: Closed-source commercial — Incompatible.**
- **[Apple's on-device speaker recognition](https://developer.apple.com/documentation/speech)** — used by Siri and Voice Control. **License: Proprietary, OS-only — Incompatible.**
- **Theoretical disambiguation** — [AssemblyAI's speaker recognition vs verification](https://www.assemblyai.com/blog/speaker-recognition-vs-verification) clarifies terminology: _diarization_ = "who spoke when" (anonymous), _speaker recognition_ = "match against enrolled identities." Live captioning UX wants the second if it can get it.

The open-source path: **sherpa-onnx and pyannote both support speaker embeddings** (x-vectors / ECAPA-TDNN) suitable for an enroll-then-match flow. Enrolment doesn't require gated weights — only the diarization clustering step does. This makes a "register voices once, recognize forever" feature plausibly shippable even before pyannote's licensing softens.

## 8. CART providers — the closest production analogue

Communication Access Real-time Translation = a human stenographer/voice-writer providing real-time text for deaf/HoH users. Authoritative definition at the [NAD](https://www.nad.org/resources/technology/captioning-for-access/communication-access-realtime-translation/). Same skillset as court reporting; many CART providers hold both NCRA's CRR (Certified Realtime Reporter) and CRC (Certified Realtime Captioner) credentials, governed by [NCRA's COPE](https://www.ncra.org/home/the-profession/NCRA-Code-of-Professional-Ethics/cope---guidelines-for-professional-practice). Per [Deaf Services Unlimited's CART 101](https://deafservicesunlimited.com/cart-captioning-101-real-time-captioning-for-clear-communication/), speaker identification is a required component of _quality_ captions, not optional.

CART providers handle speaker ID **the same way court reporters do** — typed inline via macros — because they are court reporters in a different setting.

- **[Caption First](https://www.captionfirst.com/cart-services-provider)** — major US CART vendor since 1989. All captioners NCRA-certified. [Realtime captioning FAQs](https://www.captionfirst.com/realtime-captioning-services-faqs) document the same colloquy conventions.
- **[ACS Captions (now AI-Media)](https://www.acscaptions.com/services/cart-services-live-captioning/)** — Alternative Communication Services, acquired by AI-Media in 2020.
- **[Harvard Disability — captioning](https://accessibility.harvard.edu/captioning)** — institutional perspective; CART is the default for live academic events.
- **[Minnesota DHHS — Captioning vs CART (PDF)](https://mn.gov/mnit/assets/CaptioningVsCart_tcm38-61805.pdf)** — useful one-pager distinguishing CART from generic captioning.
- **[arXiv 2503.15120 — Collaborative correction of ASR for CART](https://arxiv.org/pdf/2503.15120)** — recent academic work on hybrid human+ASR CART. Where the field is heading.

**Why this matters for the notebook-app:** the deaf/HoH academic user is _already_ a target persona for this app. They are also a target user of CART services. If the live-caption output looks like CART output, the user can switch between the app and a human CART feed without cognitive reorientation. This is a free win.

## 9. Standards and statutes

- **[28 U.S.C. § 753](https://www.law.cornell.edu/uscode/text/28/753)** — federal statute. "Recorded verbatim by shorthand, mechanical means, electronic sound recording, or any other method." The "or any other method" clause is what legally permits ASR.
- **[US Courts Federal Court Reporting Program](https://www.uscourts.gov/court-programs/federal-court-reporting-program)** and the **[Federal Court Reporting Policy PDF](https://www.uscourts.gov/file/2854/download)** — operational policy from the Guide to Judiciary Policy.
- **[NCRA "Making the Record"](https://www.ncra.org/docs/default-source/uploadedfiles/ncrf/making-the-record-booklet.pdf)** — official NCRA primer on building the verbatim record, including the reporter's responsibility to identify speakers.
- **[NCRA Transcript Format Guidelines (Omega summary)](https://omegareporting.com/client-services/formatting-guidelines/)** — model format covering Q&A, colloquy, and speaker identification symbols.
- **[CalDRA — Uncertified Rough Draft Guidelines](https://www.caldra.org/uncertified-draft-guidelines)** — defines the realtime/rough-draft tier vs the certified tier. The wedge.
- **[E.D.N.C. transcript format Ch.18 (PDF)](https://www.nced.uscourts.gov/pdfs/TranscriptFormatting.pdf)** — an actual federal court's published transcript-format rules; example of per-jurisdiction overrides on NCRA's model.
- **[eTranslationServices — 2026 legal transcription standards](https://etranslationservices.com/transcription/legal-transcription-standards-you-must-follow-in-2026-for-hearings-depositions-and-court-audio/)** — industry-side overview.

## 10. Hardware / "push-to-identify" controls

No dedicated commercial product surfaced for the most ergonomically obvious idea — a button per role that the operator presses to tag the next utterance. The closest analogues:

- **Eclipse's seating-chart microphone association** (§3 above) — operator pre-assigns each room mic to a role; speaker label is a function of which mic is hot. Effectively passive push-to-identify via hardware routing.
- **FTR digital-reporter annotation** (§3 above) — hotkeys drop "speaker identification" annotations into the timeline.
- **[Push-to-talk hardware (Wikipedia)](https://en.wikipedia.org/wiki/Push-to-talk)** — parliamentary conference systems (delegate/chairman units) do exactly "press button → identify yourself," but the packaging targets multi-party calls, not accessibility captioning.

**This is a gap.** A simple, accessibility-first "press a key, label next utterance" UX seems to not exist as a discrete product. It's a sub-feature of every CAT and CART tool, but always coupled to thousand-dollar professional software. **Concrete opportunity for the notebook-app.**

---

## Summary

### Conventions worth copying verbatim

- **Use `>> SPEAKER NAME:` for the default live-caption rendering**, with `NAME:` (colloquy) as a setting for users who want a more legal-record-shaped output. Both are screen-reader-graceful and instantly readable to anyone with court-reporting, CART, or broadcast-captioning exposure. Don't invent a third idiom.
- **Treat the live caption as a "rough draft" per CalDRA's wedge.** This is the legitimate not-the-certified-record category that ASR can occupy without accuracy claims it can't honor. Output that structurally resembles a certified transcript is one human pass away from being upgradeable to one — a meaningful affordance for academic users who later need formal documentation.
- **Bake in operator-driven speaker labeling from day one.** The Plover macro, the Eclipse seating chart, the voice writer's spoken designations, the Verbit pre-enrolment signatures — every production-quality system in this space treats speaker identity as _operator input_, not as a problem for the model to solve unaided. The notebook-app should: let users pre-register expected speakers per session, expose a one-keystroke "next utterance is Speaker X" hotkey, and let users rename or reassign auto-labels with edits propagating backwards through the buffer.

### "Looks open, isn't" traps in this space

- **pyannote model weights v3.1+** — library is MIT but weights require Hugging Face authentication and acceptance of pyannote.ai's terms. **Cannot pre-bundle in an AGPL distribution.** Already documented in [whisper.md](./whisper.md); reiterated here because it's the load-bearing reason the [audio-recording-and-transcription OVERVIEW](../features/audio-recording-and-transcription/OVERVIEW.md) chose sherpa-onnx Zipformer for v2 diarization.
- **NVIDIA NeMo Sortformer checkpoints** — code is Apache-2.0 but pretrained weights ship under the NVIDIA AI Model License. Permits non-production use freely; commercial production terms need an explicit read before bundling. Best-of-breed accuracy as of late 2025 (~11% DER per the [Neosophie benchmark](https://neosophie.com/en/blog/20260223-diarization)), but the license adds friction the AGPL distribution can't absorb without scrutiny.
- **Every legal-ASR SaaS vendor (Verbit, Rev, Otter, Trint, AI-Media LEXI, Sonix)** — useful for UX reference; nothing redistributable.
- **Every commercial CAT (Stenograph, Eclipse, ProCAT, FTR)** — same caveat. The architectural insights (per-mic channel = speaker, seating chart, AutoBrief, in-line speaker macros) are free to borrow; the code is not.
- **Dragon Legal** — single-speaker by design; relevant only as a model of "trained-single-speaker ASR" as part of the voice-writer workflow.

### Categories with no good AGPL-compatible option

- **Production-grade real-time multi-speaker diarization with low DER on noisy real-world audio.** sherpa-onnx + a Zipformer pipeline is the closest we get; expect ~15-25% DER on classroom-quality audio with crosstalk, similar voices, and reverberation. The legal industry has effectively conceded this and routed around it (voice writers, per-mic channels, pre-enrolled signatures). The notebook-app should plan to do the same: treat automatic diarization as a hint, not ground truth.
- **An accessibility-first "push button → label speaker" packaged product.** Every CAT and CART tool has this as a sub-feature, but it doesn't exist as a discrete, low-cost, accessibility-marketed product. **Concrete opportunity for this app.**
- **Open-source pre-session voice enrollment with a UX comparable to Teams' Express voice enrollment.** The building blocks exist (sherpa-onnx + ECAPA-TDNN embeddings), but the integrated user experience does not.

### Strongest applicable patterns for the notebook-app live-captioning feature

1. **Per-session speaker registry as a first-class concept.** Before recording starts, the user can type in expected speakers (`Prof. Singh`, `Witness`, `Me`). The registry feeds three things: the colloquy-label dropdown, the speaker-enrollment voice-profile slot, and the diarization-rename UX. Without this, every other speaker-ID feature is rootless.
2. **Operator-driven labeling via hotkey and voice command.** A keystroke (e.g. `Alt+1` through `Alt+9` mapped to the speaker registry) tags the _next_ utterance with that speaker. A voice command — "Speaker change, Professor Singh" — does the same. Both replicate professional practice (Plover macros, voice writer's spoken designations) without specialized hardware. This is the highest-leverage feature in this whole space and is essentially free to implement.
3. **ASR diarization as a hint, with low-friction relabeling.** When sherpa-onnx says `Speaker_3`, render it as an editable chip that the user can reassign to a registered name; the reassignment propagates back through every prior utterance attributed to that auto-label. This is the [arXiv 2503.15120 hybrid-CART pattern](https://arxiv.org/pdf/2503.15120) at the UX layer.
4. **Mark overlapping speech explicitly, don't guess.** When the diarizer's confidence drops below a threshold, render `[crosstalk]` rather than a wrong label. This matches the [GoTranscript convention](https://gotranscript.com/en/blog/edit-crosstalk-in-transcripts-overlapping-speakers-attribution-rules) and is a signal of competence, not failure — every professional tool does the same.
5. **Two output modes, both screen-reader-graceful.** `>> NAME:` for academic/casual default; `NAME:` colloquy for legal/formal. The user picks once per session or globally. Mode-conflation is avoided by making this an explicit setting, consistent with the OVERVIEW's "mode-conflation in the UI causes mode-confusion errors" thesis.
6. **Voice-writer-friendly mode (deferred, but worth planning for).** A mode where the live caption assumes single-speaker input from a microphone-on-the-user (or a stenomask), and the user speaks speaker designations inline. This collapses the diarization problem entirely. Probably v2 or later, but the speaker registry from §1 unblocks it for free.
