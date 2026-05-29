# Voice Fingerprinting for Live Captioning

- **Primary library:** sherpa-onnx (`k2-fsa/sherpa-onnx`)[^repo]
- **Project docs:** <https://k2-fsa.github.io/sherpa/onnx/speaker-identification/index.html>[^id-docs] and <https://k2-fsa.github.io/sherpa/onnx/speaker-diarization/index.html>[^diar-docs]
- **License (code):** Apache-2.0[^license-file]
- **License (recommended weights):** Apache-2.0 (3D-Speaker CAM++)[^cam-license] or Apache-2.0 (SpeechBrain ECAPA-TDNN)[^sb-license]; alternative weights are CC-BY-4.0[^titanet-license][^wespeaker-license] or MIT-but-gated[^pyannote-embedding-license]
- **AGPL-3.0-or-later compatibility verdict:** **Compatible** for the library and the recommended weight checkpoints. Apache-2.0 is one-way compatible with AGPL-3.0 per FSF guidance and AGPL §7's enumerated additional terms. The recommended bundle (sherpa-onnx + 3D-Speaker CAM++ ONNX) ships clean — code Apache-2.0, weights Apache-2.0, no gating, no use-based restrictions, no anti-deepfake riders. Other weight choices add friction (CC-BY-4.0 attribution requirements, or in pyannote's case a Hugging Face access gate that blocks pre-bundling); see §3 for the full per-model breakdown.

---

This document covers **voice fingerprinting** — extracting a low-dimensional numeric vector ("speaker embedding") from an utterance, storing it in a registry against a human-supplied label, and matching future utterances against the registry to attribute speech to known speakers. It is a deep companion to [court-reporting-speaker-id.md](./court-reporting-speaker-id.md) (which surveys the wider practice landscape) and an architectural building block under the v2 diarization line of [audio-recording-and-transcription/OVERVIEW.md](../features/audio-recording-and-transcription/OVERVIEW.md). Voice fingerprinting is what enables `Prof. Singh` to carry across every lecture in a course, instead of being reset to anonymous `Speaker_1` at the start of each session.

> **Terminology note.** The field separates _diarization_ ("who spoke when," anonymous within a session) from _speaker recognition / identification_ ("match an utterance against a registry of known identities"). Voice fingerprinting is the second. The notebook-app needs both: diarization to segment a recording into per-speaker turns, then fingerprinting to attach durable identities to those turns.

---

## 1. What it is

A speaker-embedding model is a neural network that consumes ~1.5+ seconds of speech and emits a fixed-dimensional vector — typically 192-dim for ECAPA-TDNN[^ecapa-paper] and TitaNet[^titanet-paper], 512-dim for x-vector[^xvector-paper] and for the CAM++ checkpoints shipped via 3D-Speaker.[^campp-paper] The vector lives in a learned metric space where same-speaker utterances cluster (high cosine similarity) and different-speaker utterances separate (low similarity). Speaker verification = "is this utterance from the enrolled speaker?" — a threshold on cosine similarity. Speaker identification = "which of these N enrolled speakers spoke?" — argmax over the same scores.

The numbers that determine whether this is useful: **Equal Error Rate (EER)** on the VoxCeleb1-O cleaned trial set is the canonical benchmark. Modern open-source models cluster between 0.4–1.0% EER:[^wespeaker-recipe][^threed-speaker-readme][^titanet-card][^speechbrain-card]

| Model                            | EER on VoxCeleb1-O | Embedding dim | Params                   |
| -------------------------------- | ------------------ | ------------- | ------------------------ |
| ERes2Net-large (3D-Speaker)      | 0.52%              | 512           | ~110 MB ONNX             |
| ResNet293 (WeSpeaker, LM+QMF)    | 0.43%              | 256           | ~109 MB                  |
| ResNet34 (WeSpeaker, LM+QMF)     | 0.66%              | 256           | ~25 MB                   |
| CAM++ (3D-Speaker)               | 0.65%              | 512           | 7.2M params, ~28 MB ONNX |
| NeMo TitaNet-Large               | 0.66%              | 192           | 23M params, ~97 MB       |
| ECAPA-TDNN (SpeechBrain)         | 0.80%              | 192           | ~14 MB                   |
| ECAPA-TDNN (original 2020 paper) | 0.87%              | 192           | —                        |

"EER on a clean academic benchmark" is the ceiling, not the floor. Real classrooms, lecture halls, and laptop microphones degrade EER substantially — the SVeritas 2025 benchmark shows mainstream models doubling or worsening their EER under reverberation, low-bitrate codecs (GSM, AMR), and cross-channel conditions.[^sveritas] Expect the operational error rate in a notebook-app live-captioning context to be 2–5× the published number.

## 2. How sherpa-onnx exposes it

sherpa-onnx[^repo] is the recommended runtime and is already the project's chosen engine for v2 diarization per [audio-recording-and-transcription/OVERVIEW.md](../features/audio-recording-and-transcription/OVERVIEW.md). Apache-2.0,[^license-file] copyright held per-file by Xiaomi Corporation,[^xiaomi-copyright] actively maintained — v1.13.2 released 2026-05-13, with 10 releases in the seven weeks prior at roughly one per five days.[^releases]

### Maturity signals (retrieved 2026-05-26)

12,487 stars, 1,415 forks, 578 open issues.[^repo] Default branch `master`. Bus factor: **1** — top contributor `csukuangfj` (Fangjun Kuang) has 1,523 commits versus the second-place contributor's 18, a two-orders-of-magnitude gap.[^contributors] The author has been consistent and prolific for years; the project is not at risk of abandonment in the short term, but a continuity plan is not in place. This is the same shape as `handy.md`'s maintainer pattern, with the difference that sherpa-onnx is critical infrastructure for the open-source ASR ecosystem (paired with the broader k2-fsa / Next-gen Kaldi ecosystem) rather than a single-app codebase.

### Embedding API

The canonical surface, defined in C++ at `sherpa-onnx/csrc/speaker-embedding-manager.h`:[^manager-header]

```cpp
class SpeakerEmbeddingManager {
  // construct with the embedding dim (192, 256, or 512)
  SpeakerEmbeddingManager(int32_t dim);

  bool Add(const std::string& name, const float* p);
  bool Add(const std::string& name, const std::vector<std::vector<float>>& embedding_list);
  bool Remove(const std::string& name);

  std::string Search(const float* p, float threshold);
  std::vector<SpeakerMatch> GetBestMatches(const float* p, float threshold, int32_t n);
  bool Verify(const std::string& name, const float* p, float threshold);
};
```

A second class, `SpeakerEmbeddingExtractor`, runs the model itself and produces the embedding vector to feed into the manager. Both classes are re-exported through every language binding sherpa-onnx supports — verified via repository code search:[^bindings]

- Python via the `sherpa-onnx` pip package (the pybind11 extension `_sherpa_onnx`).
- Node.js via the `sherpa-onnx-node` npm package (v1.13.2, published 2026-05-13, matching the GitHub release).[^npm]
- C, C++, C# (.NET), Java, Kotlin, Rust, Go, Dart/Flutter, HarmonyOS (ArkTS), with Swift listed as supported in the project's 12-language matrix.

For the notebook-app, the relevant binding is **Node.js** (the renderer runs in Electron's Chromium with Node integration). The Node API exposes `class SpeakerEmbeddingExtractor` with `createStream()` / `isReady(stream)` / `compute(stream, enableExternalBuffer=true) → Float32Array`, and `class SpeakerEmbeddingManager` with `add({name, v})`, `addMulti({name, v: Float32Array[]})`, plus search/verify methods.[^node-binding] Embeddings are returned as `Float32Array`, which is straightforward to persist as raw bytes in SQLite (or to encode as base64 in a Companion file if we want plain-file storage to remain compatible with the [files-md.md](./files-md.md)-inspired plain-md doctrine).

### Streaming gap

This is the load-bearing limitation for live captioning. sherpa-onnx exposes only **offline (batch) speaker diarization** — `OfflineSpeakerDiarization` and friends are exported; a repository code search for `OnlineSpeakerDiarization` returns zero results.[^streaming-gap] Two open issues confirm the gap: feature request #1460 ("Extracting speaker embeddings during diarization")[^issue-1460] and #3497 ("Sortformer support" — NVIDIA's streaming-capable diarizer).[^issue-3497]

Speaker embedding _extraction_ itself is fine for streaming: `SpeakerEmbeddingExtractor.createStream()` returns an `OnlineStream` and embeddings can be computed on whatever chunk you choose to give it. What sherpa-onnx does not ship is the streaming segmentation + online clustering glue that converts "a new chunk of audio just arrived" into "this chunk is speaker X."

The implication for live captioning: we have to write that glue ourselves, on top of sherpa-onnx's per-chunk embedding API and `SpeakerEmbeddingManager`. The conceptual pieces are well-understood — Silero VAD already segments into voiced spans for the ASR path,[^vad] each voiced span longer than ~1.5s gets an embedding, and the embedding is matched against the registry via cosine similarity threshold. Streaming end-to-end neural diarization (LS-EEND from Audio-WestlakeU is the current published SOTA[^ls-eend]) is interesting prior art but is not what sherpa-onnx ships.

## 3. Pretrained embedding models — the AGPL question

The architecturally important thing about embedding models is that **code license and weight license are separate questions**, and the weight side is where every model-licensing trap in this project has lived (Supertonic's OpenRAIL split, pyannote v3.1's gating, Sortformer's NVIDIA model license — all already in our refs). For voice fingerprinting specifically, the picture is unusually clean: most reputable embedding model checkpoints are Apache-2.0 or CC-BY-4.0, with one notable HF-gating wrinkle.

| Model                                                                                           | Code license                                                    | Weight license | Gated?                         | Bundle-with-AGPL verdict                                                                                                                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3D-Speaker CAM++** (`iic/speech_campplus_sv_zh-cn_16k-common`)[^cam-license]                  | Apache-2.0 (ModelScope `3D-Speaker` repo)[^threed-speaker-code] | Apache-2.0     | No                             | **Compatible.** Bundle freely.                                                                                                                                   |
| **3D-Speaker ERes2Net / ERes2NetV2 / ECAPA-TDNN** variants[^eres-license]                       | Apache-2.0                                                      | Apache-2.0     | No                             | **Compatible.**                                                                                                                                                  |
| **SpeechBrain ECAPA-TDNN** (`speechbrain/spkrec-ecapa-voxceleb`)[^sb-license]                   | Apache-2.0 (SpeechBrain repo)                                   | Apache-2.0     | No                             | **Compatible.** Cleanest single-file option for English-only use.                                                                                                |
| **NVIDIA NeMo TitaNet-Large** (`nvidia/speakerverification_en_titanet_large`)[^titanet-license] | Apache-2.0 (NeMo)                                               | CC-BY-4.0      | No                             | **Compatible** with attribution. Older checkpoint — does _not_ fall under the newer NVIDIA AI Model License that gates Sortformer.                               |
| **WeSpeaker ResNet/CAM++** (`Wespeaker/wespeaker-voxceleb-resnet34-LM`)[^wespeaker-license]     | Apache-2.0 (`wenet-e2e/wespeaker`)                              | CC-BY-4.0      | No                             | **Compatible** with attribution.                                                                                                                                 |
| **pyannote/wespeaker-voxceleb-resnet34-LM**[^pyannote-wespeaker-license]                        | — (HF model)                                                    | CC-BY-4.0      | No (per current card)          | **Compatible** with attribution. Re-verify the gate state before shipping — pyannote.ai's gating policy has shifted in the past.                                 |
| **`pyannote/embedding`**[^pyannote-embedding-license]                                           | — (HF model)                                                    | MIT            | **Yes — HF contact-info gate** | License-compatible; **bundling blocked** by the Hugging Face access gate. Fetch on first run, do not redistribute. Same pattern as the v3.1 diarization weights. |

sherpa-onnx itself ships its own ONNX conversions of these models in two GitHub release tags: `speaker-recongition-models` [sic — typo preserved upstream] for embedding extractors and `speaker-segmentation-models` for diarization segmentation.[^speaker-models-release][^segmentation-models-release] The release notes are explicit that each model retains its upstream license: "Each model has its own license. Please see the corresponding repository for the specific license of a given model." The conversion itself does not relicense the weights.

**VoxCeleb caveat (upstream training data).** Every model trained on VoxCeleb inherits a CC-BY-4.0 attribution obligation toward the dataset, regardless of the model's own license.[^voxceleb] In practice this means a NOTICES screen or About page that credits VoxCeleb. The KAIST mirror also adds "for research purposes" advisory language not present in Oxford's own license page — practitioners (SpeechBrain, WeSpeaker, NVIDIA, pyannote) treat this as non-binding context.

**Recommendation: bundle 3D-Speaker CAM++** (`3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx`, ~28 MB) as the default English/multilingual embedding model. It hits 0.65% EER on VoxCeleb1-O[^threed-speaker-readme] at a tenth the parameter count of the larger ResNet/ERes2Net options, is Apache-2.0 with no gate, and is what sherpa-onnx itself recommends for diarization pairing. SpeechBrain ECAPA-TDNN is a reasonable English-only alternative if there's a reason to prefer the speechbrain ecosystem.

## 4. Cosine similarity, thresholds, and what they mean operationally

Storage and matching is mechanically simple: each embedding is an L2-normalized float vector; matching is cosine similarity (dot product) against the registry; a threshold gates "accept as a match" vs "treat as unknown."

The threshold is **model-specific** and not universal. Useful anchors from primary sources:

- A SpeechBrain maintainer answering a HF discussion thread suggests **0.7–0.75** for the SpeechBrain ECAPA-TDNN model when similarity is scaled to [0, 1].[^speechbrain-threshold]
- SpeechBrain's `inference.speaker` module ships a default of **0.25 on cosine distance** (= 0.75 on cosine similarity) for the same model.[^speechbrain-default]
- sherpa-onnx requires `threshold` as a float in [0, 1] but does not pin a recommended value.[^manager-header] Its offline diarization example uses `--clustering.cluster-threshold 0.90`,[^diar-example] but that's a clustering hyperparameter (when to merge two clusters), not a verification threshold (when to accept a registry match) — different semantics.

The principled framing: at the EER operating point, false-accept-rate equals false-reject-rate. For SpeechBrain ECAPA at 0.80% EER, that's both error rates around 0.8% on clean academic audio. Push the threshold higher → fewer false accepts (a stranger being attributed to Prof. Singh), more false rejects (Prof. Singh being marked "unknown" mid-lecture). For a live-captioning UX the cost of these two errors is **asymmetric**: a false reject prompts the user with "is this Prof. Singh?" (annoying but recoverable), while a false accept silently misattributes speech (sometimes invisible until much later). Default to a high threshold (~0.75 cosine on the [0,1] scale for ECAPA / CAM++) and offer an explicit "less strict" option for users who'd rather get prompted less.

This deserves real-world tuning per shipped model, not a setting we copy from a paper. A first-launch calibration step — record the user saying a short prompt twice, observe the cosine distance, set the threshold at some fraction below that — would be more robust than any hardcoded number.

## 5. Enrollment duration

The published literature is unhelpfully vague on this — toolkits leave it to the application. The Short-Duration Speaker Verification Challenge framed the "short" regime as <10 seconds of test audio,[^sdsv] but that's the _test_ side, not enrollment. Practitioner guidance for text-independent verification is typically 10–30 seconds of natural speech as a minimum and 60+ seconds for robustness.

The widely-cited "Microsoft Teams Express voice enrollment is 90 seconds" number that surfaced in earlier research turns out to **not be in Microsoft's current public documentation**.[^teams-enrollment] Microsoft describes the enrollment as "typically takes a couple of meetings" of passive ambient capture for the in-meeting path, with manual enrollment using read text but no published duration. Treat that 90-second figure as folklore.

For the notebook-app, the right shape is probably:

- **Passive enrollment is the default.** Every confirmed speaker label adds an embedding sample to that speaker's profile, drawn from the just-spoken utterance. By session 2 or 3, the profile is sufficient for cross-session recognition without the user doing anything explicit.
- **Active enrollment is an option, not a requirement.** A "register a voice" UI that asks the user to record ~30 seconds gets a speaker bootstrapped in one shot for users who want it.
- **Multi-embedding profiles.** `SpeakerEmbeddingManager.Add(name, embedding_list)`[^manager-header] explicitly supports a list of embeddings per identity — keep ~20 samples per speaker and prefer averaging or nearest-neighbor matching over single-embedding centroid matching. This handles voice drift (illness, age, microphone change) gracefully without re-enrollment.

## 6. Cross-microphone robustness

A laptop-mic enrollment embedded today and matched against a lapel-mic recording tomorrow will not have the same cosine similarity as two laptop-mic recordings of the same speaker. The SVeritas benchmark (EMNLP Findings 2025)[^sveritas] is the most current resource quantifying this for modern models — WavLM-based verification degrades from 23.05% EER in clean conditions to over 40% under noise/reverb/low-bitrate codec mismatches, with ECAPA-TDNN, RedimNet, and MFA-Conformer holding up better under similar stress.

No published number isolates the specific "laptop mic ↔ lapel mic" comparison. The closest published evidence is the INTERSPEECH 2020 Far-Field SV Challenge corpus,[^far-field] which suggests near-field-to-far-field mismatch inflates EER by 2–5×. Cross-lingual / cross-channel domain adaptation literature (ADDA-style approaches) recovers some of that gap — Lee et al. 2019 reduced x-vector EER from 9.33% to 7.65% with adversarial domain adaptation[^adda] — but a notebook-app live-captioning feature is unlikely to ship domain adaptation training itself.

The pragmatic mitigation: **store embeddings tagged by capture context** (built-in mic vs external mic vs Bluetooth headset, sample rate, codec), and bias matching toward same-context embeddings when available. The user-visible cost is small (the registry just has more rows) and the matching cost is negligible (cosine similarity over a few hundred 192-dim vectors is sub-millisecond). This pushes the cross-channel problem off until the user genuinely uses the app in mismatched conditions, at which point passive re-enrollment handles it organically.

## 7. Streaming clustering — what we have to build ourselves

sherpa-onnx ships offline diarization. Live captioning needs streaming. The gap can be closed without invention — the algorithms are published — but it's real work the project has to budget for.

The minimum streaming flow:

1. **VAD-segment incoming audio** into voiced spans. Silero VAD is already in the pipeline for ASR purposes.[^vad]
2. **Filter spans by minimum duration.** Embeddings are unreliable below ~1.5s of speech.[^threed-speaker-readme] Spans shorter than that get attributed to the previous speaker by continuity heuristic.
3. **Extract an embedding** per qualifying voiced span via `SpeakerEmbeddingExtractor`.
4. **Match against the registry** via `SpeakerEmbeddingManager.Search()` with a tuned threshold. Above threshold → attribute to the matched identity. Below threshold → create a new anonymous identity (e.g. `speaker-7f3a`) and add this embedding to it; subsequent above-threshold matches against that anonymous identity should keep using the same pseudonym.
5. **Allow user relabeling.** When the user renames `speaker-7f3a` to `Prof. Singh`, the rename propagates to every prior segment attributed to that identity, both within the current session and as a registry merge with any prior `Prof. Singh` profile.

This is essentially the [arXiv 2503.15120 collaborative-correction CART pattern][^cart-collab] at the UX layer combined with on-device passive enrollment, which is novel for an open-source local-first app even though every individual piece is published. The LS-EEND streaming end-to-end neural diarizer[^ls-eend] and the multi-stage on-device clustering approach[^on-device-streaming] are interesting prior art if we want to upgrade beyond the simple online-clustering baseline.

## 8. Privacy posture — biometric law applies

Voice embeddings are biometric data. The legal framing is unambiguous across the three regimes most likely to apply to this project's users:

- **GDPR Article 9 (EU).** A voice recording becomes "biometric data" under Art. 4(14) once it's processed for unique identification, and biometric data processed for identification is special-category data under Art. 9 — requiring explicit consent or another Art. 9(2) lawful basis. The European Data Protection Board's 2021 guidance on virtual voice assistants[^edpb-vva] recommends that voiceprint data be stored on the user's device rather than on remote servers when biometric identification is used, which is the architectural direction the project is already heading in. The UK ICO's biometric guidance is more explicit: "On-device verification is a technique that can reduce the amount of biometric data created and shared."[^ico-biometric]
- **Illinois BIPA (US).** "Biometric identifier" is defined to include voiceprints explicitly (740 ILCS 14/10).[^bipa] _Wilcosky v. Amazon_ confirmed voice-assistant-derived voiceprints fall within BIPA. BIPA reaches "private entities" that collect, capture, or otherwise obtain biometric identifiers — for a strictly local-only app where the vendor never receives the voiceprint, the collection prong arguably doesn't trigger, but disclosure and retention obligations may still attach if any telemetry exists.
- **California CCPA / CPRA.** "Biometric information" includes voice recordings from which an identifier template like a voiceprint can be extracted (Cal. Civ. Code § 1798.140),[^ccpa] and when processed for unique identification, the data is "sensitive personal information" under CPRA.

The household-activity exemption under GDPR Art. 2(2)(c) protects the _user's_ purely personal use; it does not exempt the _vendor_ from designing a biometric system responsibly. Vendor controller obligations (transparency, DPIA, data-minimization) attach to the design decisions regardless of whether the data ever leaves the device.

What this means concretely for the notebook-app:

- **Storage stays local.** Embeddings in plain files alongside the user's notes, or in a per-profile SQLite DB. Never synced through a project-operated service. (Users syncing their notes folder through iCloud/Dropbox is their choice, made for them by the existing local-first doctrine.)
- **Delete-all is one click.** A "purge all voice data" affordance, separate from the per-recording delete already in [audio-recording-and-transcription/OVERVIEW.md](../features/audio-recording-and-transcription/OVERVIEW.md). Both the embedding registry and any cached audio used for enrollment have to be purgeable.
- **Disclose what's happening.** A first-launch notice when voice recognition is first enabled. Not buried in settings. "Your voiceprints stay on this device and you can delete them at any time" is the load-bearing claim.
- **Don't enroll by default in shared-device contexts.** Voice profiles for non-primary speakers (Prof. Singh, classmates) attach biometric data to people who didn't install the app and haven't consented. This is the awkward case the EDPB's VVA guidance explicitly worries about. The honest mitigation: enroll non-user speakers only with an explicit per-session opt-in by the user, and surface a UI that signals "you are storing voiceprints for other people" prominently.

## 9. The voice-cloning attack surface

A speaker embedding is not a one-way hash. Two failure modes worth flagging:

- **Direct synthesis conditioning.** Modern multi-speaker TTS architectures (SV2TTS, VALL-E descendants, and the broader survey landscape[^cloning-survey]) consume a speaker embedding directly as the conditioning input to a synthesizer. A 192-dim ECAPA-TDNN vector is sufficient — by design — to drive synthesis of arbitrary text in the target speaker's voice. The cross-lingual multi-speaker TTS work using x-vectors directly[^xtts] is the canonical example.
- **Model inversion / waveform reconstruction.** Pizzi et al. 2023 demonstrated model inversion attacks that reconstruct audio directly from speaker embeddings well enough to spoof voice-protected commands.[^model-inversion] Champion et al. 2021 recovered up to 62% of speaker identities from anonymized x-vector embeddings via learned rotation reversal.[^embedding-inversion] GhostVec (2023) synthesizes waveform from embeddings extracted from end-to-end ASR systems, reaching 10.83% EER against target speakers.[^ghostvec]

Implication for the notebook-app: **treat the registry as biometric-grade sensitive material**, comparable to a password manager. At-rest encryption in a single-user app on a single user-owned device is overkill, but a few things are not overkill:

- Don't expose the registry through any API, IPC channel, or file picker that a third-party plugin or sync target can read transparently.
- If we ever ship a sync feature for it, ship it encrypted client-side, with the user holding the key.
- Voice-cloning risk is fundamentally an upstream problem (we can't make the embeddings less invertible without breaking their utility), so we mitigate at the storage and access layer rather than the embedding layer.

## 10. Summary of fit

Voice fingerprinting is a strong fit for this project specifically. The match goes deeper than "it's possible":

- **sherpa-onnx is already chosen** for v2 diarization in the existing roadmap; the embedding API is the same library and same Node binding. No new dependency.
- **The licensing picture is uncharacteristically clean.** sherpa-onnx is Apache-2.0, 3D-Speaker CAM++ weights are Apache-2.0, none of the recommended weights are gated. Compare to the pyannote v3.1 / Sortformer / Supertonic traps the project has already had to navigate — voice fingerprinting is the rare model-bundling story where nothing is encumbered.
- **The UX is the differentiator.** Every commercial product surveyed in [court-reporting-speaker-id.md](./court-reporting-speaker-id.md) either uses pre-enrolled signatures (Verbit, Teams) or treats speaker ID as a function of microphone routing (Eclipse, FTR). A local-first, passive-enrollment, user-labels-once-and-it-sticks design — applied to academic settings rather than courtrooms or broadcast — is genuinely novel.
- **The privacy posture is defensible.** Local-only, user-owned, one-click delete, clear disclosure. The path that's hardest legally is the path the project's local-first doctrine already commits to.

The work that has to happen to ship it:

1. **Online clustering glue** on top of sherpa-onnx's per-chunk embedding API and `SpeakerEmbeddingManager`. ~1.5s minimum span filtering, VAD-segmented, threshold-tuned matching, anonymous-pseudonym creation, rename propagation. Probably a few hundred lines of TypeScript in the renderer process plus a Node-side wrapper around `sherpa-onnx-node`.
2. **Speaker registry schema** — per-profile SQLite (or a sidecar JSON if we want plain-files compatibility) keyed by user-chosen name, storing N embedding samples per speaker, tagged with capture context (mic, room).
3. **Enrollment UX** — passive by default (every label is an enrollment sample), with an optional explicit "register a voice" path.
4. **Relabeling UX** — editable speaker chips inline in the caption stream; renames propagate backward through the buffer and merge with prior matching profiles.
5. **Disclosure and purge UX** — first-launch notice when voice ID is enabled, one-click "delete all voice data" in settings.

Roadmap placement: most of this sits cleanly under the v2 diarization line. Items 1–4 are the v2 feature. Item 5 (disclosure + purge) is a v1.0 prerequisite if voice ID ships even in stub form.

---

[^repo]: GitHub API `repos/k2-fsa/sherpa-onnx`, retrieved 2026-05-26: `stargazers_count` 12487, `forks_count` 1415, `open_issues_count` 578, `default_branch` "master", `pushed_at` 2026-05-20, `license.spdx_id` "Apache-2.0", `created_at` 2022-09-01. <https://github.com/k2-fsa/sherpa-onnx>

[^id-docs]: Speaker identification docs index, <https://k2-fsa.github.io/sherpa/onnx/speaker-identification/index.html>, retrieved 2026-05-26 (HTTP 200, sparse — points to the GitHub release tag `speaker-recongition-models` for pretrained weights).

[^diar-docs]: Speaker diarization docs index, <https://k2-fsa.github.io/sherpa/onnx/speaker-diarization/index.html>, retrieved 2026-05-26.

[^license-file]: `LICENSE` file at <https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/LICENSE>, fetched via the GitHub Contents API and decoded; full text is the standard Apache License 2.0 (January 2004) boilerplate verbatim from apache.org. The LICENSE file leaves the `Copyright [yyyy] [name of copyright owner]` template unfilled — copyright holders are named in individual source-file headers (e.g. "Copyright (c) 2024 Xiaomi Corporation" in `speaker-embedding-manager.h`).

[^xiaomi-copyright]: Per-file copyright header in `sherpa-onnx/csrc/speaker-embedding-manager.h`: "Copyright (c) 2024 Xiaomi Corporation". Verified via `gh api repos/k2-fsa/sherpa-onnx/contents/sherpa-onnx/csrc/speaker-embedding-manager.h`.

[^cam-license]: ModelScope model card for `iic/speech_campplus_sv_zh-cn_16k-common` at <https://modelscope.cn/models/iic/speech_campplus_sv_zh-cn_16k-common>, retrieved 2026-05-26; `License` field reads "Apache License 2.0", `IsAccessible: 1`, no acceptance form.

[^eres-license]: ModelScope model cards for `iic/speech_eres2net_sv_zh-cn_16k-common`, `iic/speech_ecapa-tdnn_sv_en_voxceleb_16k`, `iic/speech_ecapa-tdnn_sv_zh-cn_3dspeaker_16k`, each carrying `"License": "Apache License 2.0"` and no gating; retrieved 2026-05-26.

[^sb-license]: Hugging Face model card for `speechbrain/spkrec-ecapa-voxceleb`, <https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb>, retrieved 2026-05-26; metadata `license: apache-2.0`, no gating.

[^titanet-license]: Hugging Face model card for `nvidia/speakerverification_en_titanet_large`, <https://huggingface.co/nvidia/speakerverification_en_titanet_large>, retrieved 2026-05-26. Card text: "License to use this model is covered by the [CC-BY-4.0]. By downloading the public and release version of the model, you accept the terms and conditions of the [CC-BY-4.0] license." No NVIDIA AI Model License clause; this older TitaNet checkpoint is straight CC-BY-4.0, unlike Sortformer.

[^wespeaker-license]: Hugging Face model card for `Wespeaker/wespeaker-voxceleb-resnet34-LM`, <https://huggingface.co/Wespeaker/wespeaker-voxceleb-resnet34-LM>, retrieved 2026-05-26; `license: cc-by-4.0`. Card README: "The pretrained model in WeNet follows the license of it's corresponding dataset. For example, the pretrained model on VoxCeleb follows Creative Commons Attribution 4.0 International License."

[^pyannote-embedding-license]: Hugging Face model card for `pyannote/embedding`, <https://huggingface.co/pyannote/embedding>, retrieved 2026-05-26; metadata `license: mit`, card displays: "You need to agree to share your contact information to access this model." Requires HF login and access-token acceptance. License is MIT; the gate is contractual access, not a license restriction, but blocks pre-bundling.

[^pyannote-wespeaker-license]: Hugging Face model card for `pyannote/wespeaker-voxceleb-resnet34-LM`, <https://huggingface.co/pyannote/wespeaker-voxceleb-resnet34-LM>, retrieved 2026-05-26; `license: cc-by-4.0`. No gating notice present on the card at retrieval; pyannote.ai's gating policy has shifted before, re-verify before redistributing.

[^threed-speaker-code]: `gh api repos/modelscope/3D-Speaker/contents/LICENSE`, decoded — Apache License 2.0 verbatim. Repo at <https://github.com/modelscope/3D-Speaker>.

[^ecapa-paper]: Desplanques, Thienpondt, Demuynck (2020), "ECAPA-TDNN: Emphasized Channel Attention, Propagation and Aggregation in TDNN Based Speaker Verification," Interspeech 2020. arXiv:2005.07143, <https://arxiv.org/abs/2005.07143>. Architecture ends in `FC(4096→192) → BatchNorm + ReLU → 192-dim speaker embedding`; reported 0.87% EER on VoxCeleb1 with C=1024.

[^titanet-paper]: Koluguri, Park, Ginsburg (2021), "TitaNet: Neural Model for speaker representation with 1D Depth-wise separable convolutions and global context," arXiv:2110.04410, <https://arxiv.org/abs/2110.04410>. 192-dim embedding, 23M parameters.

[^xvector-paper]: Snyder, Garcia-Romero, Sell, Povey, Khudanpur (2018), "X-Vectors: Robust DNN Embeddings for Speaker Recognition," ICASSP 2018. <https://www.danielpovey.com/files/2018_icassp_xvectors.pdf>. 512-dim Kaldi standard.

[^campp-paper]: Wang et al. (2023), "CAM++: A Fast and Efficient Network for Speaker Verification Using Context-Aware Masking," arXiv:2303.00332, <https://arxiv.org/abs/2303.00332>. Reports 7.2M parameters and 0.65% EER on VoxCeleb1-O. The embedding dimension is not stated in the abstract; the 3D-Speaker CAM++ checkpoint configs distribute with 512-dim outputs by convention. Verify against `egs/voxceleb/sv-cam++/conf/*.yaml` in <https://github.com/modelscope/3D-Speaker> before citing the dim definitively.

[^wespeaker-recipe]: WeSpeaker VoxCeleb v2 recipe results, <https://github.com/wenet-e2e/wespeaker/blob/master/examples/voxceleb/v2/README.md>, retrieved 2026-05-26: ResNet34-TSTP-emb256 0.659% EER, ResNet293-TSTP-emb256 0.425%, ECAPA_TDNN_GLOB_c1024-ASTP-emb192 0.707% (all with LM + AS-Norm + QMF). Paper: arXiv:2306.15161, <https://arxiv.org/pdf/2306.15161>.

[^threed-speaker-readme]: `3D-Speaker` repo README benchmark table, <https://github.com/modelscope/3D-Speaker>, retrieved 2026-05-26: Res2Net 1.56% / ResNet34 1.05% / ECAPA-TDNN 0.86% / ERes2Net-base 0.84% / CAM++ 0.65% / ERes2NetV2 0.61% / ERes2Net-large 0.52% on VoxCeleb1-O.

[^titanet-card]: NVIDIA TitaNet-Large model card, <https://huggingface.co/nvidia/speakerverification_en_titanet_large>, retrieved 2026-05-26: 0.66% EER on VoxCeleb1 cleaned trial file.

[^speechbrain-card]: SpeechBrain ECAPA-TDNN model card, <https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb>, retrieved 2026-05-26: 0.80% EER on VoxCeleb1-test (cleaned) with s-norm; release date 2021-05-03.

[^sveritas]: Pham et al. (2025), "SVeritas: Benchmark for Robust Speaker Verification under Diverse Conditions," EMNLP Findings 2025. arXiv:2509.17091, <https://arxiv.org/abs/2509.17091>, <https://aclanthology.org/2025.findings-emnlp.516/>. Benchmarks microphone distance, reverberation, channel mismatches, audio bandwidth, codec degradation; WavLM-SV degrades from 23.05% to >40% EER under stress.

[^releases]: `gh api repos/k2-fsa/sherpa-onnx/releases?per_page=10`, retrieved 2026-05-26. Most recent 10 releases run from v1.12.34 (2026-03-26) through v1.13.2 (2026-05-13).

[^contributors]: `gh api repos/k2-fsa/sherpa-onnx/contributors?per_page=10`, retrieved 2026-05-26. Top contributors by commit count: csukuangfj (1523), pkufool (18), Wasser1462 (16), ZhaoChaoqun (10), pingfengluo (9). Two-orders-of-magnitude gap between #1 and #2.

[^manager-header]: `sherpa-onnx/csrc/speaker-embedding-manager.h`, retrieved via `gh api repos/k2-fsa/sherpa-onnx/contents/sherpa-onnx/csrc/speaker-embedding-manager.h` on 2026-05-26.

[^bindings]: Bindings verified via `gh api search/code?q=repo:k2-fsa/sherpa-onnx+SpeakerEmbeddingManager` returning files in `sherpa-onnx/python/sherpa_onnx/__init__.py`, `sherpa-onnx/csrc/speaker-embedding-manager.{h,cc}`, `sherpa-onnx/c-api/{c-api.cc,cxx-api.{h,cc}}`, `scripts/dotnet/SpeakerEmbeddingManager.cs`, `sherpa-onnx/java-api/...`, `sherpa-onnx/kotlin-api/Speaker.kt`, `sherpa-onnx/rust/...`, `scripts/go/sherpa_onnx.go`, `scripts/node-addon-api/lib/speaker-identification.js`, `flutter/sherpa_onnx/lib/src/speaker_identification.dart`, `harmony-os/SherpaOnnxHar/.../SpeakerIdentification.ets`. Retrieved 2026-05-26.

[^npm]: npm package `sherpa-onnx-node` at <https://registry.npmjs.org/sherpa-onnx-node> and <https://www.npmjs.com/package/sherpa-onnx-node>; latest version 1.13.2 published 2026-05-13T10:57:52Z (matches GitHub v1.13.2 release date), license Apache-2.0. Retrieved 2026-05-26.

[^node-binding]: `scripts/node-addon-api/lib/speaker-identification.js` in `k2-fsa/sherpa-onnx` master, retrieved 2026-05-26 — exports `SpeakerEmbeddingExtractor` with `createStream()` / `isReady(stream)` / `compute(stream, enableExternalBuffer)` returning `Float32Array`, and `SpeakerEmbeddingManager` with `add({name, v})` / `addMulti({name, v: Float32Array[]})`.

[^streaming-gap]: `gh api 'search/code?q=repo:k2-fsa/sherpa-onnx+OnlineSpeakerDiarization'` returns `total_count: 0`. Python `__init__.py` exports only `Offline*`-prefixed diarization classes (`OfflineSpeakerDiarization`, `OfflineSpeakerDiarizationConfig`, etc.). Retrieved 2026-05-26.

[^issue-1460]: <https://github.com/k2-fsa/sherpa-onnx/issues/1460> "Feature: Extracting speaker embeddings during diarization", opened 2024-10-23, still open at retrieval 2026-05-26.

[^issue-3497]: <https://github.com/k2-fsa/sherpa-onnx/issues/3497> "[FEATURE] Sortformer support", opened 2026-04-10, still open at retrieval 2026-05-26.

[^vad]: Silero VAD is already part of the project's audio pipeline per <https://github.com/snakers4/silero-vad> and the existing reference in [`whisper.md`](./whisper.md).

[^speaker-models-release]: `gh api repos/k2-fsa/sherpa-onnx/releases/tags/speaker-recongition-models` [sic — typo `recongition` preserved upstream] → <https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-recongition-models>. Release body verbatim: "This release contains speaker recognition models for sherpa-onnx. Each model has its own license. Please see the corresponding repository for the specific license of a given model." Hosts 9 3D-Speaker ONNX files, 9 WeSpeaker ONNX files, 3 NeMo ONNX files. Retrieved 2026-05-26.

[^segmentation-models-release]: `gh api repos/k2-fsa/sherpa-onnx/releases/tags/speaker-segmentation-models` → <https://github.com/k2-fsa/sherpa-onnx/releases/tag/speaker-segmentation-models>. Hosts `sherpa-onnx-pyannote-segmentation-3-0.tar.bz2` (6.6 MB), `sherpa-onnx-reverb-diarization-v1.tar.bz2` (10.4 MB), `sherpa-onnx-reverb-diarization-v2.tar.bz2` (242.3 MB). Retrieved 2026-05-26.

[^voxceleb]: VoxCeleb license at <https://www.robots.ox.ac.uk/~vgg/data/voxceleb/> (Oxford VGG) and the KAIST mirror <https://mm.kaist.ac.kr/datasets/voxceleb/>: "The data is covered under a Creative Commons Attribution 4.0 International license." KAIST mirror adds "available to download for research purposes" advisory language; Oxford's page does not. Oxford additionally warns underlying YouTube clip copyrights remain with original video owners — concern for redistributing the _dataset_, not for weights derived from it.

[^speechbrain-threshold]: SpeechBrain maintainer "Shreenidhics" in the model's HF discussion thread <https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb/discussions/7>: "Normally 0.7-0.75 is the threshold used when scaled from [0,1]." Retrieved 2026-05-26.

[^speechbrain-default]: SpeechBrain `inference.speaker` module documentation at <https://speechbrain.readthedocs.io/en/latest/API/speechbrain.inference.speaker.html>: default threshold of 0.25 on cosine _distance_ (equivalent to 0.75 cosine _similarity_). Retrieved 2026-05-26.

[^diar-example]: `sherpa-onnx-offline-speaker-diarization.cc` at <https://github.com/k2-fsa/sherpa-onnx/blob/master/sherpa-onnx/csrc/sherpa-onnx-offline-speaker-diarization.cc> uses `--clustering.cluster-threshold 0.90`. This is a clustering merge threshold, not a registry verification threshold.

[^sdsv]: Short-Duration Speaker Verification Challenge, arXiv:1912.06311, <https://arxiv.org/pdf/1912.06311>. Framed the "short" regime as <10s test segments.

[^teams-enrollment]: Microsoft Learn page on Teams voice and face recognition, <https://learn.microsoft.com/en-us/microsoftteams/rooms/voice-and-face-recognition>, retrieved 2026-05-26. Describes Express voice enrollment as "Generating a voice profile using in-meeting speech typically takes a couple of meetings"; no specific duration in seconds for the manual enrollment path. The "~90 seconds" figure cited in third-party summaries is not in current Microsoft documentation.

[^far-field]: INTERSPEECH 2020 Far-Field Speaker Verification Challenge corpus, arXiv:2008.03521, <https://arxiv.org/pdf/2008.03521>. Near-field-to-far-field mismatch inflates EER by 2–5× in challenge results.

[^adda]: Lee et al. (2019), "Cross-lingual Text-independent Speaker Verification using Unsupervised Adversarial Discriminative Domain Adaptation," <https://arxiv.org/pdf/1908.01447>. ADDA reduces x-vector EER from 9.331% to 7.645% in mismatched conditions.

[^ls-eend]: Liang & Li (2024), "LS-EEND: Long-Form Streaming End-to-End Neural Diarization with Online Attractor Extraction," TASLP 2025. arXiv:2410.06670, <https://arxiv.org/abs/2410.06670>. Repo: <https://github.com/Audio-WestlakeU/FS-EEND>. Streaming DER: CALLHOME 12.11%, DIHARD II 27.58%, DIHARD III 19.61%, AMI 20.76%.

[^on-device-streaming]: Xia et al. (Google), "Highly Efficient Real-Time Streaming and Fully On-Device Speaker Diarization with Multi-Stage Clustering," arXiv:2210.13690, <https://arxiv.org/abs/2210.13690>.

[^cart-collab]: arXiv:2503.15120, "Collaborative correction of ASR for CART," <https://arxiv.org/pdf/2503.15120>. Hybrid human+ASR for real-time captioning.

[^edpb-vva]: EDPB Guidelines 02/2021 on Virtual Voice Assistants v2.0 (adopted July 2021), <https://www.edpb.europa.eu/system/files/2021-07/edpb_guidelines_202102_on_vva_v2.0_adopted_en.pdf>. Recommends voiceprint data be stored on the user's local device when biometric identification is used.

[^ico-biometric]: UK ICO biometric recognition guidance, <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/biometric-data-guidance-biometric-recognition/key-data-protection-concepts/>: "On-device verification is a technique that can reduce the amount of biometric data created and shared." Retrieved 2026-05-26.

[^bipa]: 740 ILCS 14/10, "Biometric Information Privacy Act" §10 definitions, mirror at <https://law.justia.com/codes/illinois/chapter-740/act-740-ilcs-14/>, retrieved 2026-05-26: "'Biometric identifier' means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry." _Wilcosky v. Amazon, Inc._ confirms voice-assistant-derived voiceprints fall within BIPA.

[^ccpa]: Cal. Civ. Code § 1798.140 as summarized at <https://ccpa-info.com/home/1798-140-definitions/>: "biometric information" includes "voice recordings, from which an identifier template, such as a faceprint, a minutiae template, or a voiceprint, can be extracted." CPRA full text at <https://www.caprivacy.org/cpra-text/>.

[^cloning-survey]: "Voice Cloning: Comprehensive Survey," arXiv:2505.00579, <https://arxiv.org/html/2505.00579v1>. Surveys SV2TTS, VALL-E, and descendant architectures that consume speaker embeddings as conditioning input.

[^xtts]: Xin et al. (2019), "Cross-lingual Multi-Speaker Text-to-Speech Synthesis Using Domain Adversarial Training," arXiv:1911.11601, <https://arxiv.org/abs/1911.11601>. Direct use of x-vector embeddings as TTS conditioning.

[^model-inversion]: Pizzi et al. (2023), "Introducing Model Inversion Attacks on Automatic Speaker Recognition," arXiv:2301.03206, <https://arxiv.org/abs/2301.03206>. Sliding model inversion reconstructs audio from speaker embeddings well enough to spoof voice-protected commands; first MI attack against audio.

[^embedding-inversion]: Champion et al. (2021), "On the invertibility of a voice privacy system using embedding alignment," arXiv:2110.05431, <https://arxiv.org/pdf/2110.05431>. Recovers up to 62% of speaker identities from anonymized x-vector embeddings via learned rotation reversal.

[^ghostvec]: Wang et al. (2023), "GhostVec: A New Threat to Speaker Privacy of End-to-End Speech Recognition System," arXiv:2311.10689, <https://arxiv.org/pdf/2311.10689>. Synthesizes waveform from speaker information extracted from end-to-end ASR systems; reaches 10.83% EER against target speakers.
