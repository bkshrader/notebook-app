# Assistive and Adaptive Technology in Higher Education (2025–2026)

A landscape report for the notebook-app design team.

---

## 0. Front matter

**Date stamp.** Compiled 2026-05-23.

**Scope — what's in.** Assistive and adaptive technologies actively used by college and university students in 2025–2026 in the United States, with European/Canadian context where relevant. "Actively used" means: (a) students self-report using it; (b) institutional Disability Services / Disabled Students' Programs / Office of Accessible Education recommend or provision it; (c) universities license it at scale; (d) it appears on syllabi or LMS integrations. The primary disability accommodation framings explored in depth are **cognitive / learning (ADHD, autism, dyslexia, dyscalculia, dysgraphia, executive dysfunction)** and **sensory (low vision/blindness, deaf/hard-of-hearing)**. Mobility and chronic-illness tools are touched on where they intersect with note-taking workflows; mental-health apps are sketched briefly.

**Scope — what's out.** K-12-only tooling (mentioned only where it has spilled into higher ed); AAC devices for nonspeaking users beyond brief acknowledgment; clinical and rehabilitative therapy software; physical mobility hardware (wheelchairs, prosthetics); historical surveys of assistive tech before 2010.

**Caveat on shelf life.** The assistive-tech landscape moves fast and consolidates faster. In the last 24 months alone: Glean became Genio[^1], Co:Writer and Snap&Read are being sunsetted into Read&Write[^2], Texthelp rebranded its parent as Everway, Nuance's Dragon line has been effectively abandoned for the Mac and consumer Windows tiers[^3], and the entire ADA Title II compliance schedule for U.S. public universities was extended in April 2026[^4]. Citations are dated; treat anything older than 24 months with skepticism.

**Standard taxonomy of accommodations** used by typical U.S. Disability Services offices:

| Category                                                                         | Typical accommodations                                                                                                                          | This report's depth |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Cognitive / learning (ADHD, autism, LDs, dyslexia, dyscalculia, dysgraphia, TBI) | Extended time, note-taker, audio-recording permission, text-to-speech, distraction-reduced testing, AI/spell-check, executive-function coaching | **Deep**            |
| Vision (blind, low vision, color blindness)                                      | Screen readers, magnifiers, alt-format texts, tactile graphics, Braille                                                                         | **Deep**            |
| Hearing (Deaf, hard-of-hearing)                                                  | CART, ASL interpreter, captioned media, FM/Roger systems, captioning glasses                                                                    | **Deep**            |
| Mobility / dexterity                                                             | Speech-to-text, switch access, eye tracking, alternative keyboards                                                                              | Light               |
| Chronic illness / fatigue                                                        | Flexible attendance, recording permission, deadline flexibility                                                                                 | Light               |
| Mental health / psychiatric                                                      | Reduced courseload, counseling, anxiety-reduction tools                                                                                         | Brief               |
| Autism-specific (often overlapping with cognitive)                               | Predictability, sensory regulation, social-emotional support, communication scaffolds                                                           | **Deep**            |

**Legal context (brief).** Universities buy what they buy in part because of legal pressure:

- **U.S. — ADA Title II 2024 rule.** On 24 Apr 2024 the DOJ published a final rule requiring all state and local government entities (which includes all public colleges and universities) to make web content and mobile apps conform to **WCAG 2.1 Level AA**[^5]. The April 2026 deadline for institutions in jurisdictions of ≥50,000 was **extended to 26 Apr 2027**, and the small-jurisdiction date moved to 26 Apr 2028[^6]. The rule covers websites, mobile apps, digital documents (PDFs, Word, PowerPoint, Excel), multimedia, and LMS content — including content posted by faculty[^7].
- **U.S. — ADA Title III & Section 504.** Private universities are reached under Title III (public accommodations) and Section 504 (federal-funding recipients); enforcement has historically been complaint-driven, but the Title II rule has set a de facto baseline that private institutions and vendors are racing to match.
- **EU — European Accessibility Act (EAA).** Entered enforcement 28 Jun 2025 for new in-scope products and services; existing products have until 28 Jun 2030[^8]. EAA applies to commercial software and hardware including e-readers, computer hardware and operating systems, and many web/mobile services. The presumption-of-conformity standard is **EN 301 549**, which incorporates **WCAG 2.1 AA**[^9]. A note-taking app sold (or distributed gratis as a service) in the EU is in scope.
- **Canada — AODA.** Ontario requires WCAG **2.0 AA** for public-sector websites (including universities). Federal Accessible Canada Act (ACA) layered on top[^10].
- **Higher-ed-specific.** ED's Office for Civil Rights complaints, AHEAD (Association on Higher Education And Disability) professional standards, and individual state laws (e.g., California AB-434) push toward WCAG 2.1+ AA conformance.

**Why our app targets WCAG 2.1 AAA / AA-floor.** W3C itself cautions that full AAA across an entire product "is not recommended … as a general policy"[^11], because some AAA criteria are content-dependent. The pragmatic approach: take AA as a hard floor, treat AAA as the target on features where it directly serves the primary user populations (text spacing, contrast enhanced, reading level, abbreviations, identifying user-controlled context changes — most of which directly serve ADHD/Autism cognitive accommodations), and design forward to **WCAG 2.2 AA** since the LMS landscape is already publicly tracking it (Anthology Ally checks against 2.2 AA[^12]) and Title II in the U.S. is likely to migrate to 2.2 within the deliverable's useful life.

---

## 1. Reading and text access

### 1.1 Screen readers

The dominant pair in academia (and almost everywhere else) is JAWS and NVDA. Per the **WebAIM Screen Reader User Survey #10 (Jan 2024, n=1,539)**:

- **Primary desktop screen reader:** JAWS 40.5%, NVDA 37.7%, VoiceOver (macOS) 9.7%, Dolphin SuperNova 3.7%, ZoomText/Fusion 2.7%[^13].
- **OS share:** Windows 86.1%, macOS 9.6%, Linux 2.9%[^13].
- **Browser share:** Chrome 52.3%, Edge 19.3%, Firefox 16.0%, Safari 8.0%[^13].
- **Mobile screen reader:** VoiceOver 70.6%, TalkBack 34.7%[^13].
- **User-reported disability:** Blindness 76.6%, Low vision 19.9%, Deaf/HoH 6.8%, Cognitive/learning 5.2%, Motor 2.2% (multi-select)[^13].
- **Regional split for JAWS vs NVDA:** JAWS dominates North America (55.5% vs 24.0%) and Australia; NVDA dominates Europe, Africa/Middle East, and Asia[^13].
- 71.6% of respondents use more than one screen reader regularly[^13].
- 85.9% said "more accessible websites" would help more than improvements to assistive technology itself[^13].

**Implications for academia.** Universities license JAWS Multi-User and ZoomText/Fusion through Vispero/Freedom Scientific; the institutional license unlocks free **JAWS Home Annual** licenses for students/staff via their institutional email[^14]. NVDA is free and is what most students who don't qualify for institutional JAWS use. VoiceOver/Narrator/TalkBack are bundled. **In practice, any assistive-tech-aware academic app must work cleanly with JAWS + Chrome/Edge on Windows, NVDA + Firefox/Chrome on Windows, and VoiceOver + Safari on macOS/iOS** as primary targets, with TalkBack/Android second-tier.

**Math support varies sharply.** JAWS has the strongest math-aloud support (historically via MathPlayer, now via integration with Speech Rule Engine); NVDA reads MathML decently via add-ons; VoiceOver reads MathML on the web well but inconsistently in apps[^13]. PDF support quality is universally bad on untagged PDFs; JAWS "smooths" some tag errors that NVDA exposes[^15].

**Scholarly PDFs are a documented accessibility crisis.** ASSETS 2024 paper "Uncovering the New Accessibility Crisis in Scholarly PDFs" documents systematic regressions in tag quality across major publishers[^15].

**Implications for our app.**

- We must expose proper platform a11y APIs (UIA on Windows, NSAccessibility/AX API on macOS, AT-SPI on Linux). **Both Electron (Chromium) and Tauri (WebView2/WKWebView/WebKitGTK) inherit the platform's a11y tree** — but Tauri's a11y story has historically lagged because it relies on disparate native webviews and the bridging is less mature[^16]. Electron's a11y is more battle-tested; for a screen-reader-first accessibility-first product, that is a real point in Electron's favor.
- Don't roll your own focus management, tab order, ARIA role plumbing, or live regions — use established React/Svelte/Vue accessibility-mature components and audit with axe-core in CI.
- Math and citations are user-facing first-class content; we need to render math as MathML in the DOM (not as PNG or canvas) so SRE-powered TTS works.
- Optimize for keyboard-first workflows; 100% feature parity without a mouse.

### 1.2 Text-to-speech / read-aloud

The text-to-speech (TTS) market in higher ed is layered:

- **Institutionally licensed, cross-platform suites:**
  - **Read&Write by Texthelp / Everway** is the single most widely site-licensed TTS-plus-literacy product in U.S./UK/Canada/Australia universities. Licensed at scale by, e.g., Syracuse, UNLV, U Michigan, U Minnesota[^17][^18]. Pricing is per-student enrollment; full feature unlock requires Texthelp Admin Tool license assignment[^17]. Co:Writer and Snap&Read sunset 31 Dec 2025, their features folded into Read&Write[^2][^19].
  - **Kurzweil 3000** — fixture in many DSS offices (Illinois DRES, Rutgers RADR, GW DSS, Lawrence Tech, Earlham, UIC DRC, Western Carolina, UDel, Pratt)[^20]. Originally bought as a literacy/dyslexia tool; now web+desktop; integrates TTS with study skills (highlighting, extraction, OCR, voice notes).
  - **NaturalReader** has aggressive education pricing ($1.20/user/year for site license)[^21]; provisioned by Cornell among others as institutional default[^22].
- **Bundled in the OS / productivity stack:**
  - **Microsoft Immersive Reader** — built into Edge, Word, OneNote, Teams, Outlook; the Microsoft 365 EDU site license at most universities makes it free at point of use. Strong on focus mode, line focus, syllable splitting, picture dictionary, and translation[^23]. **OneNote Live Captions** (2024) adds in-app live captioning to OneNote[^23].
  - **Microsoft Office Dictate, Editor, Loop** — Editor (grammar), Dictate (speech-to-text), Loop (collaborative blocks).
  - **Apple Spoken Content / VoiceOver "Speak Screen"** — bundled; high voice quality, especially "Personal Voice" introduced 2023.
  - **Google Docs read-aloud** via Chromebook / ChromeVox or web extensions; **Google Docs voice typing** expanded 2024 to more browsers[^24].
- **Standalone reader apps used by students:**
  - **Voice Dream Reader** — still active and beloved on iOS (one-time $14.99); often paired with personal-use library of EPUB/PDF[^25].
  - **Speechify** — aggressive consumer marketing, $139/year, celebrity voices, OCR-via-camera "Scan & Listen"[^26]. Often used without institutional approval.
  - **ClaroRead / ClaroPDF** — common in UK/AUS provisioning.
  - **ElevenReader** — newer high-quality neural voice TTS reader (free tier); appears on Cornell's recommended list[^22].

**Implications for our app.**

- Students entering with these tools will expect: (a) "play from cursor" or "play selection" with adjustable rate/pitch/voice; (b) word-level highlighting synced with audio; (c) export to MP3 or DAISY of any page; (d) the ability to send the document text out to their existing reader of choice via a clean clipboard/text export.
- Do not bundle a proprietary TTS engine. Instead expose system TTS (SpeechSynthesis API in Electron; native AVSpeechSynthesizer / SpeechSynthesizer / speech-dispatcher in Tauri) and an optional pluggable interface for users who run local Whisper/Coqui/Piper voices.
- "Read aloud while I follow" with caret sync is the high-impact, lowest-effort cognitive accommodation we can ship.

### 1.3 Screen magnification

- **ZoomText** (Vispero) — paired with JAWS; **Fusion** is the integrated JAWS+ZoomText product; provisioned via institutional licenses with free home licenses[^14][^27].
- **MAGic** — Freedom Scientific's older standalone magnifier, now superseded by ZoomText/Fusion.
- **OS-level:** Windows Magnifier with Narrator, macOS Zoom with VoiceOver, iOS/iPadOS Zoom + Magnifier app, Android Magnification.
- Browser zoom is the most common "low-tech magnification" in practice — which means our UI must reflow cleanly to 400% zoom and to 200% with 320px viewport (WCAG 1.4.10 Reflow).

### 1.4 Visual reading-comfort tools

This is the murkiest evidence-quality category in the report. It's also where students _want_ options and where universities _have started provisioning_ despite weak evidence.

- **OpenDyslexic** font (free). Mixed-to-negative evidence. The 2017 Wery & Diliberto study found no improvement in reading rate or accuracy in children with dyslexia[^28]; a 2024 study reported some improvement in adults[^28]. Consensus among reading researchers: dyslexia is primarily phonological, not visual; specialized fonts produce wide individual variance and no aggregate benefit[^28][^29].
- **Atkinson Hyperlegible** (Braille Institute, 2020). A _legibility_ font — designed to disambiguate similar glyphs (l/I/1, O/0, etc.) for low-vision readers. Stronger empirical grounding than OpenDyslexic for the use case it actually targets (low-vision letter distinguishability)[^29].
- **Lexend** (Bonnie Shaver-Troup, Google Fonts) — designed for reading proficiency; growing institutional traction.
- **Bionic Reading** — bolding the leading characters of each word. Skeptically reviewed: a 2,074-tester study found reading 2.6 wpm _slower_ on average[^30]. A 2024 eye-tracking study on different mediums found no significant comprehension differences[^30][^31]. ADHD subgroup may benefit from focus aid but evidence is anecdotal.
- **BeeLine Reader** — color gradients across lines. Surfaces in Anthology Ally's HTML Alternative Format as a delivery option[^12]. Research is mixed by grade level[^31]; some readers prefer plain black.
- **Lexie Readable, Comic Sans, Dyslexie** — community-popular, evidence weak.
- **High-contrast / dark modes** — well-supported, broadly preferred. Light mode causes glare for some low-vision users; dark mode causes "halation" / blur for others. We need both, plus a user-configurable theme with WCAG AAA contrast (7:1 for normal text).

**Implications for our app.**

- **Ship a typography panel** with: font family (system default, Atkinson Hyperlegible, Lexend, OpenDyslexic — and let the user load any local font), font size, line height (target 1.5×+ per WCAG AA 1.4.12), letter spacing, word spacing, paragraph spacing, max line length (45–80 chars), and per-document override.
- **Make Bionic Reading an opt-in render toggle, not a default.** Document the weak evidence honestly in the help text.
- **Ship a high-contrast theme** with WCAG AAA 7:1 contrast (1.4.6 enhanced) as one preset; sepia and dark themes as others.
- **Don't auto-detect and "help"** by silently applying experimental treatments. Let the user choose; predictability is a cognitive accommodation in itself.

### 1.5 Document accessibility tooling

- **Adobe Acrobat Pro** — the tag editor is still the de facto remediation tool, despite being slow and painful. Many universities run a Document Accessibility Center staffed by remediators.
- **Anthology Ally (formerly Blackboard Ally)** — embedded in Canvas/Blackboard/Moodle/D2L; auto-grades each course file 0–100% for accessibility and provides student-side **Alternative Formats**: tagged PDF, HTML, ePub, BeeLine Reader, electronic Braille, MP3 audio, Immersive Reader, translated[^12]. **Anthology Ally checks against WCAG 2.2 AA** now[^12].
- **SensusAccess / RoboBraille** — self-service document converter widely licensed by UC Berkeley, Syracuse, Dartmouth, Amherst, Brown, U Exeter, and others[^32]. Converts to MP3, DAISY, ePub3, digital Braille, BeeLine, large-print. Best on text-heavy docs; weak on tables/complex layouts[^32].
- **ABBYY FineReader / OmniPage** — OCR pipelines used by alt-format teams.
- **Microsoft Word Accessibility Checker / PowerPoint AC** — first-line remediation.

**Implications for our app.**

- Documents created in our app must export as **tagged PDF/UA**, accessible Word (with proper heading structure, alt text, language tags), and HTML with semantic structure. This is non-negotiable interop.
- We should provide an in-app accessibility checker mirroring MS Word's: alt text on images, heading hierarchy, language declared, reading order, contrast.
- We should integrate with SensusAccess / Ally export workflows where possible (e.g., an "Export to Ally Alternative Format" or just clean HTML export that Ally can ingest).

---

## 2. Writing and dictation

### 2.1 Speech-to-text / dictation

- **Dragon Professional (Windows)** — historically the gold standard for accuracy and command grammars. After Microsoft acquired Nuance (2021, closed 2022): the **Mac version is dead** (last release 2018), the consumer **Dragon Home** edition was discontinued in 2023, and Dragon Professional v16 (Windows) is still sold at $699 perpetual but has known issues with Windows 11[^3]. Dragon Medical One ($79–99/user/mo) is the strategically-supported product[^3]. **The Dragon brand is effectively in maintenance mode for general academic use.**
- **Apple Dictation** (macOS/iOS) — solid for everyday use; on-device since 2022.
- **Windows Voice Access** (Windows 11) and **Windows Voice Typing** — built-in, free, accurate enough for most students.
- **Google Docs voice typing** — free, ubiquitous, works in Chrome/Edge.
- **Otter.ai** — primarily transcription/captioning but commonly used for dictation. UC Davis, UCLA, UC Berkeley, Millersville, and many others list it as a recommended accommodation[^33][^34].
- **Whisper-based local tools** (whisper.cpp, MacWhisper, Wispr Flow) — increasingly used by students who want privacy or who run Linux. On-device inference for confidential material; no file size limits[^35].

**Implications for our app.**

- Universal text input (any text field, anywhere) should be dictation-capable via OS-native dictation. Don't fight the OS dictation hotkey.
- Inserting transcripts from Otter / Whisper / a Glean export should be one paste, with timestamps preserved as anchors back into the source audio.
- For users coming from Dragon: support voice command vocabulary at least at the level of "new note", "delete paragraph", "format heading 2" through the OS's voice command system; do not reinvent.

### 2.2 Word prediction and grammar

- **Read&Write word prediction** (formerly Co:Writer) — predicts whole words and short phrases, dyslexia-aware. Now integrated into Read&Write[^2][^36].
- **Grammarly** — free + premium; near-ubiquitous student install base. Often the only writing aid disclosed on syllabi.
- **ProWritingAid** — academic-focused alternative.
- **Ghotit Real Writer & Reader** — explicitly dyslexia/dysgraphia-focused predictive writing.
- **Microsoft Editor** — bundled with M365 EDU; growing footprint.

### 2.3 Alternative input

- **On-screen keyboards** — bundled in OSes.
- **Switch access** — iOS Switch Control, Android Switch Access; for users with severe motor impairments.
- **Eye tracking** — **Tobii Dynavox PCEye, TD I-Series, TD Pilot (eye-tracking iPad)**, often paired with AAC for nonspeaking users with motor disabilities[^37]. Windows 11 Eye Control is bundled but less powerful.

**Implications for our app.** Don't capture key events in ways that block OS-level switch/voice/eye-tracking input. Stick to standard input model. Allow long-press, double-click, and dwell-click equivalents on critical actions.

---

## 3. Note-taking and lecture capture

This is the heart of our app's category. Three overlapping clusters of tooling.

### 3.1 Smartpens and digital pens

- **Livescribe** — the legacy smartpen. Aegir (2024) and the 3 series continue to ship; widely recommended at Yale, Carleton, etc. for dyslexia/ADHD students who benefit from time-anchored audio over handwritten notes[^38].
- **Reading pens** (see §10).
- **iPad + Apple Pencil + Notability/GoodNotes** — de facto default for many students.
- **reMarkable, Boox, Kindle Scribe, Supernote** — distraction-free e-ink tablets, increasingly seen in ADHD note-taking workflows because the lack of notifications and apps reduces context switching[^39].

### 3.2 Audio note-taking

This is the cluster that most directly competes with us.

- **Genio (formerly Glean, formerly Sonocent Audio Notetaker)** — the dominant DSS-recommended audio notetaker in UK/US/AUS higher ed. Provisioned at U Delaware, U Wisconsin-Green Bay, U Cumbria, UNC Charlotte, APSU, UMontana, Virginia Tech, Rutgers, Amherst, UCA, CUNY libraries, and many more[^40][^41]. The tool synchronizes recorded audio with slides, text notes, images, and AI-generated outlines. **Glean rebranded to Genio on 3 Jun 2025**[^41]. Conformance: previously "partially conformant with WCAG 2.1 AA," now claims full **WCAG 2.1/2.2 AA conformance** verified by Level Access (Apr 2026)[^41]. Workflow: record → chunk audio into "sections" → annotate with typed notes / image / highlight → AI summary / "Quiz Me" / labels for review. This is the gold-standard interop target for us if we want any chance of recognition by DSS offices.
- **Notability** (iOS/macOS/iPadOS) — audio recording linked to every typed/written/drawn stroke; tap any stroke during playback to jump to that moment in the recording[^42]. Free tier limited; Plus $14.99/yr.
- **GoodNotes 6** — handwriting-focused; audio recording added in recent versions; not as deeply audio-linked as Notability.
- **Microsoft OneNote** — audio recording in the desktop version is linked to notes; **OneNote Live Captions** (2024) adds live captions[^23]. Most universities have OneNote site-licensed already.
- **Otter.ai** — see §2.1. UC Berkeley DSP explicitly provides Otter accounts as a note-taking accommodation[^33].
- **Jamworks** — newer audio + AI summarization tool, on Cornell's institutional list[^22].
- **Plaud, Limitless, AI Pin (now defunct)** — wearable AI notetakers; a few students use these informally, generally without DSS sanction.

### 3.3 Real-time captioning

- **CART (Communication Access Real-time Translation)** — human stenocaptioner producing real-time word-for-word transcript; the gold standard for Deaf/HoH accommodation. Provided either on-site or remotely. The most legally defensible accommodation under ADA[^43].
- **C-Print and TypeWell** — meaning-for-meaning summary captioning; less verbatim than CART, popular at RIT/NTID and elsewhere.
- **Microsoft Teams live captions, Zoom captions, Google Meet captions** — built-in, free, quality-dependent on speaker / microphone / accent. Used as informal accommodations.
- **Otter Live** — pairs with Zoom/Teams; popular[^33].
- **Ava** — purpose-built for Deaf/HoH; combines AI + human "Scribe" for higher accuracy; used at Vanderbilt and several others; UC Berkeley origin[^44].
- **Web Captioner, Google Live Transcribe** — free single-device.

### 3.4 Peer note-takers — the human accommodation

The traditional "peer note-taker" service (instructor identifies a student volunteer; DSS provides note-taker stipend or extra-credit) still exists and is still being requested[^45], but its share is declining as students (a) want control over what's captured, and (b) increasingly use Otter/Genio independently. The 2026 Harvard Crimson piece reports Harvard students continue to prefer peer notes over AI transcripts for course-specific orientation and trust, but the AI tools are now standard in students' personal stacks[^45].

### 3.5 LMS-integrated lecture capture

- **Panopto** — 13M users; AI smart-search; ASR captions in 20+ languages[^46].
- **Echo360 / EchoVideo** — ASR captions (~85% accuracy out of box); partnership with Rev for higher-quality AI captions[^46].
- **Kaltura (REACH)** — Kaltura's captioning service[^46].
- **YuJa** — fourth major institutional platform.

All four integrate with Canvas/Blackboard/Moodle/D2L via LTI.

**Implications for our app.**

- The killer feature in Genio/Notability/OneNote is **time-anchored notes** — text and ink strokes attached to a position in an audio recording, so review can hop instantly between transcript and audio. We have to ship this or we are not in the running.
- We need to **import** transcripts from Otter (txt, srt, json), Whisper (vtt, json), Genio (export formats), Panopto/Echo360/Kaltura/YuJa transcripts, and Microsoft Teams/Zoom captions (vtt). Outputs from those tools should land in our app with timestamps preserved as anchors back into the user's audio.
- We need to **export** so that students who use multiple workflows can move out of our app without losing structure: Word .docx with audio-linked anchors as comments or footnotes, Markdown with timestamp links, .srt/.vtt/.txt of any transcript, and ideally PDF/UA.
- **Recording UX must be private by default.** Local recording, no cloud upload unless the user opts in. (This matters for FERPA and for instructor consent norms — students recording lectures is generally protected as a disability accommodation but the social/legal landscape is fraught[^47].)
- **Live captioning while recording** — even if it's just calling OS-native captioning or running a local Whisper model — is huge for HoH users and a focus aid for ADHD users.

---

## 4. Reading PDFs and academic literature

### 4.1 Reference managers

| Tool                           | License                | Accessibility status                                                                                                                                                                    | Notes                                                                                               |
| ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Zotero**                     | AGPL-3.0               | **Desktop 7.x+ claims full WCAG 2.2 AA** since Oct 2024, audited by external accessibility expert. Read Aloud accessible in v9. First annotation tool with screen-reader workflow.[^48] | Open-source, broadly accessible, the natural integration partner for an AGPL-licensed academic app. |
| **Mendeley**                   | Proprietary (Elsevier) | Limited public accessibility documentation. UI is minimalist; no full-text search.[^49]                                                                                                 | Declining market share; Elsevier has deprecated the desktop client several times.                   |
| **EndNote**                    | Proprietary            | Mature but accessibility undocumented; widely site-licensed.                                                                                                                            | Common in life sciences.                                                                            |
| **Paperpile**                  | Proprietary            | Web-based; Google Docs integration; accessibility undocumented.[^49]                                                                                                                    | Heavily Google-ecosystem.                                                                           |
| **Readwise / Readwise Reader** | Proprietary            | Web-based; growing student traction for general reading + annotation.                                                                                                                   | Active dev.                                                                                         |

### 4.2 PDF readers used by students with disabilities

- **Adobe Acrobat / Acrobat Reader** — the baseline; "Read Out Loud" is mediocre; tag navigation is power-user.
- **ClaroPDF** — DSS-licensed in UK/AUS; TTS-first PDF reader.
- **Voice Dream Reader** — iOS; OCR + TTS; beloved[^25].
- **Speechify** — OCR via camera; subscription[^26].
- **Foxit, Smallpdf** — alternatives.
- **OrbitNote** (Texthelp / Everway) — PDF + Read&Write integration; institutional license; Cornell etc.[^22][^36].

### 4.3 OCR pipelines for scanned readings

- **SensusAccess** — self-service institutional[^32].
- **Adobe Acrobat OCR / ABBYY FineReader** — staff-side.
- **Tesseract / ocrmypdf** — open source; appears in DSS workflow scripts.
- **AI vision OCR** (GPT-4o, Claude vision, Google Document AI) — increasingly used by students personally, with mixed institutional sanction.

**Implications for our app.**

- **Zotero integration is the single highest-ROI interop we can build.** Zotero is AGPL, has a clean local SQLite DB and JSON RPC, supports BetterBibTeX export, and is _demonstrably committed to accessibility_ — it shares our license stance and our user base. We should support: read citations from local Zotero, insert citation by drag-or-search, export references as CSL-JSON / BibLaTeX, and round-trip annotations.
- **PDF reading** should be a first-class panel in our app: tagged-PDF aware (reading order from tags, not from layout coordinates), with built-in TTS, sentence-level highlight on read, color overlays for selective highlighting, and the ability to **flatten annotations into our notes as quotes with citation anchors**.
- For scanned/untagged PDFs, **invoke a local OCR (tesseract or whisper-cpp-style local model) by default** — never silently upload student materials to a third-party OCR.

---

## 5. Math, science, and notation accessibility

This is research-active and consequential for STEM-discipline students. Existing tooling:

- **MathML rendering pipelines.** The accessible math rendering chain is: source (LaTeX / MathML / Office Math) → **MathJax** rendering with semantic enrichment → **Speech Rule Engine (SRE)** generating speech and Braille[^50]. MathJax 4 ships with SRE 4.0 (TypeScript)[^50]. This is the _only_ widely-deployed accessible-math pipeline on the web in 2026.
- **MathPlayer** (Design Science) — historically dominant Windows/IE plugin; effectively superseded by the MathJax+SRE pipeline, though JAWS retains some of its lineage. Its over-800 speech-rule corpus is partially reflected in SRE.
- **EquatIO** (Texthelp / Everway) — voice/handwriting/screenshot/LaTeX input; outputs accessible math; common DSS site license (Cornell, U Minnesota, NC State, QUB, U York)[^22][^51]. Reads math aloud and produces MathML output.
- **MathType** (Wiris) — equation editor with accessibility output; integrated into many LMSes.
- **MathPix** — image/handwriting-to-LaTeX; provisioned at Cornell[^22]; popular with STEM students with dysgraphia.

### LaTeX accessibility

The pragmatic state of the art in 2026:

- **LaTeX PDF output is poor for accessibility**[^52]. Screen readers fail on math symbols and lose reading order. The recommendation across U Wisconsin–Madison, Penn State, U Leeds is: **for accessible math, render to HTML+MathJax, not to PDF**[^52].
- **LaTeXML** converts LaTeX → XML → HTML; this is the engine behind **arXiv's HTML preprints**[^52]. Not all LaTeX converts cleanly (custom macros break).
- **`lwarp` package** — produces HTML files with MathJax-rendered equations; works with TeX Live/MikTeX[^52].
- **`tagged-pdf` LaTeX project** (LaTeX Team, 2024–2026) — actively developing tagged-PDF output from LaTeX directly; promising but incomplete.
- **AI-augmented LaTeX accessibility** — see arXiv 2306.02480 (Manouselis et al., 2023) on using AI tools to make LaTeX content accessible to blind readers[^52].

### Tactile graphics and Braille (for blind STEM students)

- **Tiger embossers (ViewPlus Premier, Columbia2, Delta2)** with Tiger Software Suite[^53]; produce the highest-resolution tactile graphics on the market.
- **Duxbury Braille Translator** — industry standard text-to-Braille converter; Word/HTML/Excel/MathML in, Braille out, drives Tiger and many other embossers[^53].
- **BrailleNote Touch+** (HumanWare) — Android-based note-taker with refreshable Braille and QWERTY.
- **Refreshable Braille displays** — Mantis, Brailliant, Focus, Orbit Reader.

**Implications for our app.**

- We must render math as **MathML in the DOM** (not as PNG or canvas), driven by MathJax + SRE. This is non-negotiable for any STEM use.
- Support **LaTeX-style input** (`$...$` and `$$...$$`) and **typeset live** to MathML so the user sees both math and accessibility annotations.
- Export math correctly to: HTML+MathJax, LaTeX, Office Math (.docx), and image fallback with alt text (auto-generated from SRE's spoken form).
- We do not need to build a Braille embosser pipeline ourselves, but our HTML export should be cleanly ingestable by Duxbury and SensusAccess.

---

## 6. Focus, executive function, ADHD/Autism-specific tools

This is the category where our app's primary differentiator lives. It is also the category with the most fragmentation and the weakest evidence base.

### 6.1 Time / task management actively used by ADHD students

- **Todoist** — the GTD-ish workhorse; ADHD-friendly because of low-friction quick capture, natural-language input, and consistent cross-platform UX[^54]. Cornell DSS lists it explicitly[^22].
- **TickTick** — Todoist competitor with built-in Pomodoro + habit tracking + visual stats helpful for "time blindness"[^54].
- **Forest** — gamified Pomodoro with tree-growing; effective for some users, manipulative-feeling for others; on Cornell DSS list[^22].
- **Pomofocus.io** — web-only Pomodoro timer; minimal, free; on Cornell DSS list[^22].
- **Notion** — knowledge base + tasks + DBs; ADHD-popular for "second brain" but often becomes its own organizational tax.
- **Goblin Tools** — explicitly markets to ADHD/autism. Cornell DSS lists it[^22]. Free web + mobile. **Magic ToDo** (break a task into bite-sized steps with adjustable "spiciness"), **Formalizer** (rewrite messages in any tone), **Judge** (read the emotional tone of received text), **Professor** (explain anything simply), **Consultant**, **Estimator** (time estimate), **Compiler** (turn brain-dump into structured action), **Chef**[^55]. _Evidence: no peer-reviewed efficacy studies as of 2026; large user testimonial base, plausible mechanism via reduced executive load._[^55]

### 6.2 Distraction blockers

- **Cold Turkey** — system-level lockdown, hard to bypass; popular for students[^56].
- **Freedom** — cross-device blocking across phone + laptop[^56].
- **LeechBlock NG** — Firefox extension; free; classic.
- **OS-native focus modes** — macOS Focus, Windows Focus Sessions, iOS Focus, Android Focus mode.

### 6.3 Mind-mapping and non-linear notes

Particularly valuable for ADHD/autism users who think in associations or who hit serial-order working-memory limits.

- **Heptabase** — spatial canvas of cards, infinite whiteboards, links, mind maps, PDF annotation; explicitly marketed at deep learners and researchers[^57].
- **Scapple** (Literature & Latte, $) — minimal, free-form non-hierarchical notes[^57].
- **MindMeister, XMind, MindNode** — traditional mind-mapping tools.
- **Obsidian** — file-over-app, Markdown, plugin ecosystem; ADHD community has built dedicated workflows but mixed reports on whether the plugin sprawl helps or hurts focus[^58].
- **Logseq** — block-based, outliner-first; also Markdown.
- **Roam Research, Tana, Mem, Capacities, Amplenote** — competitors in the "PKM" space.
- **TheBrain** — historical mind-map / outliner with dedicated user base.
- **MindView, Inspiration** — older DSS-provisioned mind-map tools.

### 6.4 Sensory regulation and visual scheduling

These are often imported from K-12 special education contexts into higher-ed autism accommodations.

- **Tiimo** — visual planner explicitly built with ADHD/autism in mind; iPhone App of the Year 2025; AI-assisted task breakdown[^59]. ~500K users.
- **Routinery, Sectograph, Time Timer** — visual timers.
- **Choiceworks, FirstThen, Pictello** — visual scheduling, K-12 roots, rare in higher ed but documented use.
- **Calm, Headspace, Insight Timer** — meditation/grounding; sometimes university-licensed.

### 6.5 Reading/writing scaffolds for ADHD/autism

- **Goblin Tools Formalizer** — autistic users in particular cite this as a tone-flattener for high-stakes emails[^55].
- **Goblin Tools Magic ToDo** — task breakdown that doesn't shame; the "spiciness" dial models cognitive load explicitly[^55].
- **Speechify focus mode** — single-line reading[^26].
- **Microsoft Immersive Reader line focus** — same idea, free at most universities[^23].
- **Bionic Reading, hyperlegible fonts** — see §1.4; mixed evidence.

### 6.6 Honest note on evidence

Cornell DSS, Genio's blog, and DSS offices broadly recommend Goblin Tools, mind maps, and dyslexia fonts. The **evidence quality is uneven**: working-memory-supportive scaffolds (audio + text + slide co-location, like Genio/Notability) have decent supporting cognitive psychology literature[^60]; ADHD task-breakdown via AI tools (à la Goblin Tools, ChatGPT) is widely adopted and intuitively supported but **lacks RCTs as of 2026**[^55]. Mind-mapping for ADHD has some narrative review evidence (CHADD)[^57]. Specialty fonts (OpenDyslexic) have _negative_ meta-evidence[^28]. Bionic Reading is contested[^30].

**Implications for our app.**

- Build cognitive scaffolds in _as opt-in tools the user can compose into their own workflow_, not as defaults that change behavior unpredictably.
- **Task-breakdown** is a clear win: a "Goblin Tools-style" task breakdown built into our task panel, with a "step it down further" command, but local-first and provider-pluggable for the LLM (OpenAI / Anthropic / Ollama-local).
- **Tone-rewrite** (à la Formalizer) on selected text — same LLM channel.
- **Non-linear canvas** as a first-class view alongside outline/document — not a separate "whiteboard product".
- **Pomodoro timer + focus mode** built in, with the option to dim non-active sections of the document.
- **Visual schedule view** (Tiimo-style time blocks) for time-blindness — this overlaps with our calendar/ICS sync.
- **Visible structure**: every note should have heading hierarchy visible, breadcrumb navigation, and a per-document table of contents.
- **Predictability**: no UI elements that change position based on use, no surprise modal pop-ups, no animations that cannot be disabled (WCAG 2.3.3 enhanced, 2.2.2).

---

## 7. Mental health and wellbeing tools provisioned by DSS

Brief — not our primary focus but appears in DSS recommendations and intersects with anxiety regulation, which is relevant to deadline management and focus.

- **Headspace, Calm** — sometimes university-licensed (e.g., as part of student wellness programs).
- **Sanvello, Talkspace, BetterHelp** — counseling-app integrations; some universities now offer Sanvello or TimelyMD as a benefit.
- **Notes-based CBT apps** (MoodKit, Woebot) — rarely DSS-provisioned but appear in clinician recommendations.
- **Crisis Text Line, 988 Lifeline** — integrated into university crisis pages.

**Implications for our app.** Negligible direct interop, but: (a) avoid alarmist UI patterns (red error banners that flash, urgency framing); (b) consider a built-in "deep breath / micro-break" prompt that the user can enable; (c) when the user is in Focus Mode, hide notification badges entirely.

---

## 8. The platforms students live in

### 8.1 LMS

| LMS                        | Accessibility surface                                                                                                                                 | Notes                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Canvas (Instructure)**   | RCE accessibility checker, Studio with auto-captions, SpeedGrader screen-cap + captions (2024), LTI 1.3 / LTI Advantage[^61], LaTeX→MathJax rendering | Largest U.S. higher-ed market share; site-licensed at majority of R1s. |
| **Blackboard / Anthology** | Native accessibility checker (Ally-powered), Ally for files, Anthology Ally checks against WCAG 2.2 AA[^12]                                           | Anthology acquired Blackboard; Ally is the differentiator.             |
| **Moodle**                 | Brickfield accessibility checker; Ally also available; open-source plugin ecosystem                                                                   | Strong in EU; varying quality of plugins.                              |
| **D2L Brightspace**        | Built-in checker; Anthology Ally optional; Accessibility+ AI-remediation product; sponsored Aira partnership for blind users[^62]                     | Common in Canada (incl. AODA-compliant).                               |

### 8.2 Microsoft 365 EDU

Near-ubiquitous at U.S./UK universities. The accessibility stack: **Immersive Reader, Editor (grammar), Dictate, Live Captions in PowerPoint, OneNote audio recording and OneNote Live Captions (2024), Translator, Read Aloud in Word/Outlook/Edge**[^23][^63]. The accessibility competence in the Microsoft stack is high; the failure mode is friction (sign-in tenants, conditional access, app sprawl).

### 8.3 Google Workspace for Education

Voice typing (expanded May 2024 to more browsers), live captions in Slides, screen-reader-tuned Docs, braille display support[^24]. Workflow: Google Docs is where many groups write. Accessibility is generally good but voice typing requires Chromium browsers.

### 8.4 Apple ecosystem

Live Captions (macOS Apple Silicon, iOS, vision OS), Spoken Content, VoiceOver, Live Listen, Personal Voice, Eye Tracking (iOS 18, 2024)[^64]. **VoiceOver on iOS is the dominant mobile screen reader in academia** per WebAIM data[^13]. iPads + Apple Pencil are the de facto digital-notebook hardware.

**Implications for our app.**

- **LTI 1.3 LTI Advantage integration** with Canvas / Blackboard / Moodle / D2L is a multi-quarter investment but the single biggest legitimacy unlock.
- **ICS calendar export** for assignments and due dates (and ideally CalDAV sync) — universal interop with student calendars regardless of LMS.
- **OneNote .onepkg, Notion HTML, Obsidian Markdown, Evernote ENEX, plain Markdown + frontmatter** import and export to cover migration paths.
- **MS Word and Google Docs round-trip** that preserves heading structure, alt text, comments, and inline math.

---

## 9. Hardware actually in dorms

| Category            | Common devices                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reading pens        | **C-Pen ReaderPen / Reader 2, ExamReader 2** (dyslexia, JCQ exam-approved)[^65]                                                                                          |
| Smart pens          | **Livescribe Aegir / 3 / Echo** (still recommended)[^38]                                                                                                                 |
| Digital paper       | **iPad + Apple Pencil**, **reMarkable Paper Pro**, **Boox Note Air/Tab**, **Kindle Scribe**, **Supernote A5/A6**[^39]                                                    |
| Tablets             | **Microsoft Surface + Pen**, iPad Pro/Air                                                                                                                                |
| Hearing assistance  | **Phonak Roger receivers (Roger ON, Touchscreen Mic, MultiMedia Hub, DigiMaster 7000 for lecture halls)** — install base via student hearing aids/cochlear implants[^66] |
| Captioning glasses  | **XRAI AR2** (launched 2025, $750–880, 223+ language captions, 98% claimed accuracy, 8h battery)[^67]; Vuzix, EssilorLuxottica's Nuance Audio glasses                    |
| Refreshable Braille | Mantis Q40, Brailliant BI, Orbit Reader                                                                                                                                  |
| AAC / eye control   | **Tobii Dynavox TD I-Series, TD Pilot (iPad), PCEye**[^37]                                                                                                               |
| Audio               | Bone-conduction headphones (sensory regulation, situational awareness); active-noise-cancellation headphones (focus + sensory regulation, autism)                        |
| FM systems (legacy) | Some universities still maintain campus loop systems                                                                                                                     |
| CART hardware       | Stenotype machines (stenocaptioners); remote CART by web stream                                                                                                          |

**Implications for our app.**

- The single most-used hardware tier is **iPad + Apple Pencil + Notability or GoodNotes**. We need a credible iPad experience (Pencil, Apple Pencil hover, palm rejection, low-latency ink) or we forfeit a huge segment.
- **Audio-input devices** — Bluetooth headsets, Roger receivers piping through Bluetooth, USB lecture-hall microphones — should "just work". Use platform default input; do not lock to internal mic.
- **External Braille display + screen reader** should work; this means no canvas-rendered text. Use real DOM.

---

## 10. What students actually report wanting (and not getting)

Drawing on 2024–2026 evidence:

- **Friction with provisioned tools.** EDUCAUSE 2025 Students and Technology Report: institutional-support satisfaction dropped 13 points to 55% since 2023; fewer students feel comfortable disclosing accommodation needs to instructors[^68]. Disabled Students UK 2024 Access Insights: nearly half of disabled student respondents say they got a _lower mark_ due to an inaccessible assessment[^69].
- **Faculty preparedness gap.** Only 10% of faculty believe their institution provides "absolutely adequate" tools to support students with disabilities; 22% report considering accessibility when designing materials[^69].
- **Disclosure stigma.** Many invisible-disability students (ADHD, autism, mental health) delay or skip disclosure[^70]. National Disability Center: only ~21% of students disclose, vs ~43% who report having a disability when surveyed anonymously[^68].
- **Tool fragmentation / switching cost.** Students assemble personal stacks of 5–10 tools (e.g., Otter for transcription + Notability for handwriting + Goblin Tools for tasks + Forest for focus + Read&Write for TTS + Zotero for refs + Canvas for delivery). Each switch is taxed: re-orienting, re-authenticating, copy-pasting, format-converting. The "invisible burden of accommodations"[^71].
- **AI policy chaos.** ChatGPT and Copilot are simultaneously: (a) recommended by disability advocates as cognitive accommodation[^72], (b) banned in some courses (e.g., timed exams, first-year writing), and (c) tolerated-but-disclose-required in most[^73]. Disabled students using ChatGPT to break tasks down or rewrite text are caught between accommodation needs and academic-integrity rules. Cornell, U Texas, and others have published sample syllabus statements but practice is fragmented[^73]. Per a 2025 ScienceDirect study, the main generative AI tools used by students with disabilities are ChatGPT, Microsoft Copilot, Goblin Tools, Grammarly, Quillbot[^72].
- **Cognitive load of new tools.** Each "accommodation app" that students are told to use can itself be inaccessible or distracting. EDUCAUSE: "AI tools can close accessibility gaps or widen them"[^68].
- **Peer note-takers vs AI.** Students report trusting peer note-takers more than AI transcripts for course-specific summarization but use both in parallel[^45].
- **Privacy.** Lecture recording for personal accommodation is generally protected, but the FERPA implications when students speak, plus the social discomfort of recording in seminars, are unresolved[^47]. AI lecture-capture tools that upload to cloud (Otter, Plaud, etc.) raise additional consent questions.
- **Hardware cost.** Even with DSP technology grants (UC Berkeley caps grants at $1,000/year/student[^74]), the cost of an iPad Pro + Pencil + Notability + Otter Pro + Read&Write + Genio + a Roger receiver is well beyond a grant.

---

## 11. Implications and design directives for our note-taking app

Consolidated, opinionated. Each directive lists: (P) the primary user population it serves, (T) the existing tools it competes with or interoperates with, (E) the evidence base.

### Foundational — non-negotiable

1. **Use platform a11y APIs; do not reimplement screen-reader semantics.**
   - P: blind / low-vision / motor users. T: JAWS, NVDA, VoiceOver, TalkBack, Narrator. E: WebAIM survey[^13], W3C ARIA guidance. Render all text in DOM (no canvas text). Expose roles, names, states. Support keyboard focus rings (WCAG 2.4.7 + 2.4.11 enhanced) and 24×24 minimum target sizes (WCAG 2.5.8).

2. **WCAG 2.2 AA as floor, 2.1/2.2 AAA on cognitive criteria where practical.**
   - P: all. T: Anthology Ally checks 2.2 AA[^12]; DOJ requires 2.1 AA[^5]. E: legal mandate plus moving target. Specifically commit to: 1.4.6 Enhanced Contrast (7:1), 1.4.8 Visual Presentation (text customization), 1.4.9 No Images of Text, 1.4.12 Text Spacing, 2.3.3 Animation from Interactions (off by default), 3.1.3 Unusual Words (in-app glossary), 3.1.4 Abbreviations, 3.1.5 Reading Level, 3.3.5 Help, 3.3.6 Error Prevention.

3. **Keyboard-first design with documented shortcuts and a discoverable command palette.**
   - P: motor, vision, ADHD ("hands-on-keys, hands-stay-on-keys" focus). T: VS Code-style command palette. E: ubiquitous power-user pattern.

4. **Local-first storage and computation; opt-in cloud.**
   - P: privacy-sensitive students, FERPA-bound recordings, students whose institutions ban specific cloud providers. T: Obsidian, Logseq, Zotero. E: §10 above on FERPA[^47]; growing institutional skepticism of vendor-cloud LLM uploads.

### Reading / TTS

5. **Built-in read-aloud with word-level highlight, adjustable rate/voice, and platform TTS by default.**
   - P: blind, low-vision, dyslexia, ADHD. T: Read&Write, Kurzweil, NaturalReader, Voice Dream, Speechify. E: dominant TTS use case in DSS provisioning[^17][^20].

6. **Pluggable TTS engine.** Surface system voices, but allow the user to drop in a local Piper/Coqui voice model or call a paid Eleven/Speechify API.
   - P: power users; users on Linux; users sensitive to neural-voice quality. T: ElevenLabs, Speechify[^26].

7. **Typography panel: font (incl. Atkinson Hyperlegible, Lexend, OpenDyslexic and user-loaded), size, line height, letter/word/paragraph spacing, max line length, contrast preset.** Per-document override.
   - P: dyslexia, low-vision, ADHD. T: every literacy tool ships some subset. E: WCAG 1.4.12 mandates this for accessibility; honest about mixed evidence on specialty fonts[^28].

8. **Bionic Reading as an opt-in toggle, not default.** Document the weak evidence honestly in the tooltip.
   - P: ADHD focus help (subgroup). T: Anthology Ally's BeeLine alternative format[^12]. E: mixed/negative[^30].

### Writing / dictation

9. **OS-native dictation in every text field.** Do not shadow the OS dictation hotkey.
   - P: motor, dyslexia, fatigue, multilingual. T: Apple Dictation, Windows Voice Typing, Google Docs voice. E: Dragon's decline[^3] pushes everyone to OS dictation.

10. **Transcript import** for Otter (.txt, .srt, .json), Whisper (.vtt, .json), Genio export, Panopto/Echo360/Kaltura/YuJa transcripts, Teams/Zoom .vtt. Timestamps must survive and become clickable anchors.
    - P: HoH, ADHD, anyone using lecture capture. T: Otter, Genio, lecture-capture LMS plugins. E: §3.5.

### Note-taking / lecture capture (the core)

11. **Time-anchored notes.** Every stroke, typed character, and image inserted while audio is recording is bound to the audio timestamp. Tapping/clicking it during playback scrubs the audio. Same model as Notability, OneNote, Genio.
    - P: ADHD, dyslexia, HoH, slow processors, anyone with note-taking-while-listening trouble. T: **Notability, OneNote, Genio (formerly Glean)**[^40][^42]. E: long-established DSS recommendation[^45][^60].

12. **Live captioning while recording.** Pipe OS captioning (Mac Live Captions, Windows Live Captions) or local Whisper. Display caption stream side-by-side with notes during recording; persist as transcript after.
    - P: HoH, focus-impaired, ESL. T: Otter Live, Ava, XRAI Glass, OneNote Live Captions[^23][^33][^44][^67]. E: §3.3.

13. **Visible audio waveform + section chunks** (Genio's killer pattern). Auto-detect speaker pauses and chunk the audio so the user can label/highlight whole "thoughts" not raw seconds.
    - P: ADHD, dyslexia, autism (auditory processing). T: Genio, Sonocent[^40]. E: cognitive psychology of chunking in working memory.

14. **AI summarization and quiz-style review** of recorded sessions, run _locally_ via Ollama or via a user-chosen API. Surface as opt-in tools, not as default.
    - P: ADHD, executive function, autism. T: Genio's "AI outline" + "Quiz Me", Otter Summary, NotebookLM[^40][^41]. E: nascent but rapidly adopted.

### Math / STEM

15. **Math as MathML in DOM, MathJax rendered, SRE-spoken.** LaTeX-syntax input. Math accessible from screen readers; math accessible from TTS.
    - P: blind/low-vision STEM, dyslexia, dyscalculia. T: EquatIO, MathType, MathJax[^50][^51]. E: only viable accessible math pipeline on web[^50].

16. **Export math to HTML+MathJax, LaTeX, Office Math, image-with-alt-text.**
    - P: all STEM. T: every math editor. E: Word/PDF/PPT interop reality.

### Focus / ADHD / Autism

17. **Built-in Focus Mode** with: section dimming outside the cursor, hidden non-essential UI, optional Pomodoro timer, distraction blocker passthrough (or invoke Cold Turkey/Freedom via URL scheme), and visible "what am I doing right now" goal banner.
    - P: ADHD, autism, anyone. T: Cold Turkey, Freedom, Forest[^56], Microsoft Immersive Reader line focus[^23]. E: §6.2.

18. **Task breakdown ("Goblin Tools-style") integrated into our task list.** Highlight a goal; ask the LLM to break it into N steps; iteratively refine. Tone-rewrite for selected text.
    - P: ADHD, autism. T: Goblin Tools Magic ToDo, Formalizer[^55]. E: rapid adoption, no RCTs[^55].

19. **Non-linear canvas view** as a first-class peer to outline/document, with cards, links, and infinite pan/zoom.
    - P: ADHD, autism, visual thinkers. T: Heptabase, Scapple, Excalidraw, tldraw[^57]. E: CHADD narrative review[^57].

20. **Visible time / visual schedule view** with time blocks per task; Tiimo-style.
    - P: ADHD time blindness, autism predictability. T: Tiimo[^59]. E: visual-time research.

21. **Predictability above novelty.** No surprise modals. No layout changes on use. Animations off by default (WCAG 2.3.3 AAA). Every dynamic content change announced via aria-live politely. Settings always in the same place.
    - P: autism, ADHD, cognitive impairment. T: every well-built native app does this; many web apps do not. E: W3C COGA user research[^75].

22. **Optional sensory regulation cues.** Break reminders; a "deep breath" micro-prompt; soundscape audio (rain, white noise) gated behind a single toggle; an unobtrusive end-of-session decompression screen.
    - P: autism, ADHD, anxiety. T: MyNoise (Cornell-listed)[^22], Calm. E: §6.4.

### Interop must-haves

23. **Zotero integration.** Read local Zotero library; insert citations; pull annotations; export citations as CSL-JSON/BibLaTeX. Zotero is AGPL and accessibility-mature[^48] — they're the natural ally.

24. **Word .docx export with retained tags** (heading hierarchy, alt text, language tags, semantic lists, tables with headers, math). Excel/PPT not in v1.

25. **PDF/UA export** (tagged, valid PDF/Universal Accessibility). Not just "PDF" — _tagged_ PDF that Adobe's Accessibility Check and PAC2024 will pass.

26. **HTML export** that Anthology Ally will accept and that SensusAccess will convert cleanly[^32].

27. **Markdown / CommonMark** (with math, footnotes, citations) round-trip — for interop with Obsidian, Logseq, Pandoc, static site generators.

28. **ICS calendar feed** for due dates / scheduled blocks. CalDAV optionally. Bidirectional sync nice-to-have.

29. **LTI 1.3 / LTI Advantage** integration with Canvas, Blackboard, Moodle, D2L. Multi-quarter investment but the legitimacy and assignment-ingestion unlock is real.

30. **Audio export** as MP3 + .vtt/.srt transcript + a manifest .json with audio-anchor positions.

### Things to avoid

- **Don't bundle a proprietary TTS engine.** Use OS / pluggable.
- **Don't make Bionic Reading or OpenDyslexic the default.** Evidence is weak/negative[^28][^30].
- **Don't reimplement screen-reader navigation.** Use platform a11y APIs.
- **Don't capture global hotkeys** that would shadow JAWS/NVDA/VoiceOver commands.
- **Don't render text on canvas.** Real DOM only, so screen readers and Braille displays work.
- **Don't auto-upload audio or notes** to any cloud (ours or third-party) without explicit, granular, per-recording opt-in. FERPA + autonomy + trust.
- **Don't gate accessibility features behind a paywall.** Anything that helps a disability accommodation should be in the free tier.
- **Don't ship "AI study buddy" features that disengage learning.** Disabled-student advocates flag this concern[^45].
- **Don't make the user announce their disability to use accommodations.** Provide every accommodation as a normal user setting; treat it as universal design, not stigmatized opt-in.

### Platform choice note

Both Electron and Tauri can hit AA. Electron (Chromium) has the more mature accessibility tree exposed to platform AT consistently across OSes. Tauri (native webviews) has been catching up but historically had a11y gaps the Tauri team explicitly tracked[^16]. For an accessibility-first AGPL project, **Electron is the safer choice for the core editor view**, with Tauri reconsidered only if the a11y story across WebView2/WKWebView/WebKitGTK has independently been demonstrated to match Chromium on all three desktop OSes by the time of selection. AGPL is compatible with both.

---

## Footnotes / sources

[^1]: Genio (formerly Glean). "Goodbye Glean, Hello Genio." 3 Jun 2025. <https://genio.co/blog/goodbye-glean-hello-genio>

[^2]: Texthelp / Everway. "Read&Write Changes — Snap&Read and Co:Writer sunset Dec 31 2025." <https://academy.everway.com/lp/read-write-changes/>

[^3]: Dictation Daddy. "5 Best Dragon NaturallySpeaking Alternatives in 2026" (covers Dragon Home discontinued 2023; Mac discontinued; Windows 11 issues). <https://www.dictationdaddy.com/blog/dragon-dictation-alternative>; Voibe. "Dragon Pricing 2026." <https://www.getvoibe.com/resources/dragon-pricing/>

[^4]: Inside Higher Ed. "DOJ Extends Web Accessibility Deadline." 21 Apr 2026. <https://www.insidehighered.com/news/government/colleges-localities/2026/04/21/doj-extends-web-accessibility-deadline>

[^5]: U.S. DOJ. Final Rule, Nondiscrimination on the Basis of Disability; Accessibility of Web Information and Services of State and Local Government Entities. 24 Apr 2024. See OSU summary: <https://accessibility.osu.edu/title-ii>

[^6]: Federal Register. "Extension of Compliance Dates for Nondiscrimination on the Basis of Disability." 20 Apr 2026. <https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web>

[^7]: Western Washington University. "Final Rule on Web Accessibility." <https://crtc.wwu.edu/compliance/final-rule-web-accessibility>; Ohio State. "Title II." <https://accessibility.osu.edu/title-ii>

[^8]: European Commission. "European Accessibility Act." <https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en>; Inside Global Tech. "EAA: June 2025 deadline." 10 Jun 2025. <https://www.insideglobaltech.com/2025/06/10/european-accessibility-act-june-2025-deadline-has-arrived/>

[^9]: Level Access. "European Accessibility Act 2026: EAA Compliance Guide." <https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/>

[^10]: Allyant. "From AODA to ACA: Understanding Canada's Digital Accessibility Regulations." <https://allyant.com/blog/from-aoda-to-aca-understanding-canadas-digital-accessibility-regulations/>

[^11]: W3C. "Web Content Accessibility Guidelines (WCAG) 2.1." <https://www.w3.org/TR/WCAG21/> (conformance section).

[^12]: Anthology. "Accessibility Checklist — Ally for LMS." <https://help.anthology.com/ally-lms/en/administrators/ally-accessibility-checklist.html>; "Accessibility Scores — Ally." <https://help.anthology.com/ally-lms/en/instructors/accessibility-scores.html>; "Alternative Formats." <https://help.anthology.com/ally-lms/en/students/alternative-formats.html>

[^13]: WebAIM. "Screen Reader User Survey #10 Results." Mar 2024 (n=1,539, surveyed Dec 2023–Jan 2024). <https://webaim.org/projects/screenreadersurvey10/>

[^14]: Freedom Scientific. "School Licenses." <https://www.freedomscientific.com/products/software/school-licenses/>; Vispero. "Higher Ed home-use unlock for students/staff." <https://portal.freedomscientific.com/HomeUse/HigherEd>; Accessing Higher Ground. "The Freedom Scientific Academic License." <https://accessinghigherground.org/the-freedom-scientific-academic-license-a-schoolwide-solution/>

[^15]: Wang et al. "Uncovering the New Accessibility Crisis in Scholarly PDFs." ASSETS 2024. arXiv:2410.03022. <https://arxiv.org/pdf/2410.03022>; PDF a11y JAWS-vs-NVDA: <http://accessibilitychatter.com/?p=18>

[^16]: Tauri. "Tracking: accessibility (a11y) #207." <https://github.com/tauri-apps/tauri/issues/207>; Hacker News discussion of Tauri a11y challenge. <https://news.ycombinator.com/item?id=35724084>

[^17]: Texthelp. "Read&Write for Education." <https://www.texthelp.com/products/read-and-write-education/>; "Pricing." <https://www.texthelp.com/pricing/>; "Deploying and Licensing Read&Write." <https://support.texthelp.com/help/deploying-and-licensing-readwrite>

[^18]: UNLV IT. "Texthelp Read&Write." <https://www.it.unlv.edu/software/texthelp-readwrite>; Syracuse ITS. "TextHelp Read&Write." <https://su-jsm.atlassian.net/wiki/spaces/itsservapp011/pages/159386618/TextHelp+Read+Write>

[^19]: Texthelp. "Switching between Snap&Read and Read&Write features in OrbitNote." <https://support.texthelp.com/help/switchting-between-readandwrite-and-snapandread-in-orbitnote>

[^20]: U Illinois DRES. <https://dres.illinois.edu/accommodations/ams/assitive-technology/technology-to-try-out/kurzweil-3000-for-personal-use/>; Rutgers RADR. <https://radr.rutgers.edu/resource/kurzweil-3000>; GW DSS. <https://disabilitysupport.gwu.edu/kurzweil>; Lawrence Tech. <https://www.ltu.edu/disability-services/kurzweil-3000>; Earlham. <https://earlham.edu/academics/academic-enrichment-center/accessibility-services/kurzweil-3000/>; UIC DRC. <https://drc.uic.edu/accommodations/alternate-format/kurzweil-users/>; UDel DSS. <https://sites.udel.edu/dss/technology/kurzweil-version-15/>; Pratt. <https://ixd.prattsi.org/2025/02/assistive-technology-kurzweil-3000-3/>

[^21]: NaturalReader. "Education / EDU Plans." <https://www.naturalreaders.com/edu.html>; Speechify (comparison). <https://speechify.com/blog/naturalreader-cost-is-it-worth-it/>

[^22]: Cornell SDS. "Assistive Technology Resources." <https://sds.cornell.edu/resources/assistive-technology>

[^23]: Microsoft Education Blog. "6 Microsoft classroom accessibility tools for Global Accessibility Awareness Day 2024." <https://www.microsoft.com/en-us/education/blog/2024/05/6-microsoft-classroom-accessibility-tools-for-global-accessibility-awareness-day-2024/>; Microsoft Tech Community. "Inclusive and accessible updates with OneNote Live Captions and Immersive Reader." <https://techcommunity.microsoft.com/blog/educationblog/inclusive-and-accessible-microsoft-education-updates-with-onenote-live-captions-/3238638>

[^24]: Google Workspace Updates. "Expanding voice typing and automatic captions to additional browsers." 22 May 2024. <https://workspaceupdates.googleblog.com/2024/05/voice-typing-and-automatic-captions-in-additional-browsers.html>; Google for Education. "Workspace for diverse learners." <https://edu.google.com/our-values/accessibility/google-workspace-for-education-accessibility/>

[^25]: Voice Dream. (still active product) <https://alternativeto.net/software/voice-dream/>; Speech Central comparison. <https://speechcentral.net/speech-central-vs-voice-dream-reader-vs-speechify/>

[^26]: Speechify. <https://speechify.com/>

[^27]: Vispero. "ZoomText." <https://vispero.com/zoomtext-screen-magnifier-software/>; "Fusion." <https://vispero.com/fusion-accessibility-software/>

[^28]: Wery & Diliberto (2017). "The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy." PMC. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5629233/>; Franzen et al. (later). "The dyslexia font OpenDyslexic facilitates visual processing of text and improves reading comprehension in adult dyslexia." Annals of Eye Science. <https://aes.amegroups.org/article/view/5209/html>

[^29]: Pimp My Type. "Dyslexia friendly fonts: Are they any good?" <https://pimpmytype.com/dyslexia-fonts/>; Braille Institute. Atkinson Hyperlegible.

[^30]: Readwise. "Does Bionic Reading actually work? 2,074-tester study." <https://blog.readwise.io/bionic-reading-results/>; Možina et al. "Usability of Bionic Reading on Different Mediums: Eye-Tracking Study" (2025). <https://journals.sagepub.com/doi/10.1177/21582440251376158>

[^31]: BeeLine Reader research: "Does BeeLine Reader's gradient-coloured font improve the readability of digital texts for beginning readers?" (Leiden). <https://scholarlypublications.universiteitleiden.nl/handle/1887/3448262>

[^32]: SensusAccess. <https://www.sensusaccess.com/>; UC Berkeley RTL. <https://rtl.berkeley.edu/services-programs/sensusaccess/sensusaccess-conversion>; Syracuse ITS. <https://itsaccessibility.syr.edu/accessible-documents/sensusaccess-document-remediation-format-conversion-service/>; Dartmouth SAS. <https://students.dartmouth.edu/student-accessibility/about/self-service-technologies/sensusaccess>; Amherst. <https://www.amherst.edu/offices/it/academic-technology-services/digital-accessibility-for-teaching-learning/assistive-technology/document-conversion>; Brown. <https://ithelp.brown.edu/kb/articles/using-sensusaccess-for-document-accessibility>; RoboBraille. <https://www.robobraille.org/service-description/>

[^33]: UC Berkeley DSP. "Otter AI." <https://dsp.berkeley.edu/auxiliary-service-units/note-taking-services/note-taking-technologies/otter-ai>; Otter.ai. "Otter for Education." <https://otter.ai/education>; Millersville Learning Services. <https://www.millersville.edu/learningservices/accomodations-services/assistive-technology/otterai.php>

[^34]: Otter.ai. "UC Davis Case Study." <https://otter.ai/case-study/university-of-california-davis>

[^35]: AMIA 2024. "Whisper AI Transcription, Human Implementation." <https://amia2024.sched.com/event/1rKZ2/whisper-ai-transcription-human-implementation>

[^36]: Texthelp. "Read&Write and OrbitNote Premium Features." <https://www.texthelp.com/products/orbitnote/read-write-integration-premium-features/>; "Latest features and highlights in Read&Write for Education." <https://academy.texthelp.com/read-and-write-education/updates/>

[^37]: Tobii Dynavox. PCEye. <https://www.tobiidynavox.com/products/pceye>; TD I-Series. <https://us.tobiidynavox.com/pages/td-i-series>; TD Pilot. <https://www.tobiidynavox.com/pages/td-pilot>

[^38]: Livescribe. <https://www.livescribe.com/>; Yale Dyslexia. "Livescribe Smartpen." <http://dyslexia.yale.edu/resources/tools-technology/tech-tips/livescribe-smartpen/>; ADDitude. "Livescribe 3 smartpen ADHD recommendations." <https://www.additudemag.com/product/livescribe-3-smartpen/>; Carleton. "Smartpens." <https://www.carleton.edu/assistive-technology/smartpens/>

[^39]: Foertter. "Using reMarkable for ADHD." <https://foertter.com/2023/12/30/using-remarkable-for-adhd/>; MY PA Planner. "Best ADHD digital planner for iPad / Kindle Scribe / Remarkable." <https://www.mypaplanner.com/blog/2026/3/23/best-adhd-digital-planner-for-ipad-kindle-scribe-and-remarkable-in-2026>

[^40]: Genio. "Sonocent / Audio Notetaker history." <https://help.genio.co/article/335-the-future-of-sonocent-audio-notetaker>; "Why upgrade to Genio Notes from Audio Notetaker." <https://genio.co/why-upgrade-to-genio>; APSU DSSC. <https://www.apsu.edu/disability/assistive-technology/glean.php>; UNC Charlotte DOS. <https://ds.charlotte.edu/disability-documentation-guidelines/accessible-classrooms-and-furniture/glean-audio-notetaker/>; U Cumbria. <https://my.cumbria.ac.uk/Student-Life/Support/Disability/Assistive-Technology/Apps-for-Learning/>; U Delaware DSS. <https://sites.udel.edu/dss/technology/>; U Wisconsin–Green Bay SAS. <https://www.uwgb.edu/student-accessibility/assistive-technology/notetaking/>

[^41]: Genio. "Goodbye Glean, Hello Genio." (rebrand 3 Jun 2025). <https://genio.co/blog/goodbye-glean-hello-genio>; PR. "Glean Rebrands as Genio." <https://www.prnewswire.com/news-releases/glean-rebrands-as-genio-launches-the-confident-notetakers-masterclass-and-previews-a-forthcoming-presentation-support-tool-302471703.html>; Virginia Tech TLOS. <https://tlos.vt.edu/digital-accessibility/at-network-software/genio.html>; UCA Office of Accessibility Resources and Services. <https://uca.edu/oars/notetaking-with-genio/>; CUNY Library Guide. <https://guides.cuny.edu/accessibility/notetakingapps>

[^42]: Notability. UC Riverside SDRC. <https://sdrc.ucr.edu/notability>; U Calgary SAS. <https://ucalgary.ca/student-services/access/current-students/resources-and-supports/assistive-software-how-videos/ipad-audio>; Princeton ODS. <https://ods.princeton.edu/assistive-technology/note-taking-technology>; Yale SAS. <https://sas.yale.edu/assistive-technology-services/notetaking>

[^43]: NAD. "When is Captioning Required?" <https://www.nad.org/resources/technology/captioning-for-access/when-is-captioning-required/>; Harvard UDR. "Captioning." <https://accessibility.harvard.edu/captioning>; Sorenson. "Captioning in Higher Education." <https://sorenson.com/blog/enterprise/captioning-in-education-benefits-of-next-generation-captioning-solutions-in-learning-environments/>

[^44]: Ava. <https://www.ava.me/>; UC Berkeley News. "This company's mission is to make the world accessible to Deaf people." 8 Nov 2024. <https://news.berkeley.edu/2024/11/08/this-companys-mission-is-to-make-the-world-accessible-to-deaf-people-it-all-started-at-berkeleys-big-ideas-contest/>

[^45]: Harvard Crimson. "Will AI Make Peer Notetakers Obsolete?" Apr 2026. <https://www.thecrimson.com/article/2026/4/25/artificial-intelligence-and-peer-notetaking/>; CU Boulder Disability Services. "Note-Taking Accommodations." <https://www.colorado.edu/disabilityservices/accommodations/note-taking-accommodations>

[^46]: Panopto. "Best Content Management System for Higher Education." <https://www.panopto.com/blog/education-best-video-management-systems/>; Echo360 captioning via Rev. <https://tuftsedtech.screenstepslive.com/s/19028/m/73472/l/1313227-how-do-i-create-transcripts-or-captions-for-recordings>; Kaltura REACH captioning service.

[^47]: U Denver OTL. "FERPA." <https://otl.du.edu/plan-a-course/teaching-resources/ferpa/>; MSU Denver. "Recording Lectures and Protecting Student Privacy." <https://www.msudenver.edu/academic-affairs/ferpa-class-recordings/>; UTSA. "FERPA and Classroom Recordings." <https://provost.utsa.edu/academicinnovation/resources/privacy-online-recordings.html>; UNC Charlotte. "Classroom Recordings & FERPA: FAQs." <https://legal.charlotte.edu/legal-topics/classroom-policies-and-practices/classroom-recordings-ferpa-faqs/>

[^48]: Zotero. "Accessibility." <https://www.zotero.org/accessibility>; Emory Libraries Guide. "Accessibility – Zotero." <https://guides.libraries.emory.edu/health/zotero/accessibility>; DLF Wiki. "Zotero Accessibility." <https://wiki.diglib.org/Zotero_Accessibility>

[^49]: Paperpile. "EndNote vs Mendeley: Which reference manager to choose [2025]." <https://paperpile.com/r/endnote-vs-mendeley/>

[^50]: Speech Rule Engine. <https://speechruleengine.org/>; GitHub. <https://github.com/Speech-Rule-Engine/speech-rule-engine>; MathJax docs. "Accessibility Extensions Options." <https://docs.mathjax.org/en/latest/options/accessibility.html>; DeepWiki. "Speech Rule Engine Integration." <https://deepwiki.com/mathjax/MathJax-src/5.1-speech-rule-engine-integration>

[^51]: Texthelp / Everway. "EquatIO." <https://www.everway.com/products/equatio/>; NC State DRO. "EquatIO (Voiced Math)." <https://dro.equalopportunity.ncsu.edu/accommodations/assistive-technology-2/equatio-voiced-math/>; QUB Assistive Tech Hub. "Your Guide to Texthelp EquatIO." Dec 2024. <https://blogs.qub.ac.uk/studentatguide/2024/12/19/your-guide-to-texthelp-equatio/>; U York Subject Guides. "Introduction to EquatIO." <https://subjectguides.york.ac.uk/accessibility/equatio>

[^52]: MathTech.org. "Accessible Course Materials." Apr 2025. <https://mathtech.org/2025/04/10/accessibility.html>; Penn State. "Equation Format and Accessibility." <https://accessibility.psu.edu/math/equations/>; U Wisconsin–Madison. "Accessibility & LaTeX." <https://researchguides.library.wisc.edu/latex/accessibility>; "Using AI tools to make LaTeX content accessible to blind readers." arXiv:2306.02480. <https://arxiv.org/pdf/2306.02480>

[^53]: ViewPlus Premier and Tiger software suite. <https://irie-at.com/product/vp-premier/>; Duxbury Systems. "Duxbury Braille Translator." <https://americanthermoform.com/product/duxbury-braille-translation-software/>; AbleData. <https://abledata.acl.gov/product/tiger-advantage-tactile-graphics-braille-embosser>

[^54]: Todoist. "Using Todoist to Successfully Manage the Symptoms of ADHD." <https://www.todoist.com/inspiration/managing-adhd-todoist>; ADDitude. "Todoist: Online To-Do-Lists Manager." <https://www.additudemag.com/todoist-online-to-do-lists-manager/>; Sachs Center. "12 ADHD Time Management Tools." <https://sachscenter.com/adhd-time-management-tools/>

[^55]: Goblin Tools. <https://goblin.tools/>; "About." <https://goblin.tools/About>; Psychelicht. "Goblin Tools Review 2026: The Best AI for ADHD." <https://psychelicht.com/en/goblin-tools-review-magic-todo/> (note: no peer-reviewed efficacy trials located as of May 2026).

[^56]: TechCrunch. "The best distraction blockers to jump-start your focus in the new year." 25 Dec 2025. <https://techcrunch.com/2025/12/25/the-best-distraction-blockers-to-jumpstart-your-focus-in-the-new-year/>; SB Neurofocus. "Cold Turkey Blocker Review ADHD (UK)." <https://sbneurofocus.co.uk/cold-turkey-blocker-review-adhd-uk/>

[^57]: Heptabase. <https://heptabase.com/>; ToolStack. "Heptabase Review." <https://toolstack.io/tools/heptabase>; Literature & Latte. "Scapple Overview." <https://www.literatureandlatte.com/scapple/overview>; CHADD. "From Chaos to Clarity: Using Mind Maps to Navigate Adult ADHD." <https://chadd.org/wp-content/uploads/2024/10/ATTN_10_2024-From-Chaos-to-Clarity.pdf>

[^58]: Obsidian Forum. "ADHD-friendly system." <https://forum.obsidian.md/t/adhd-friendly-system/12800>; Adriana, Medium. "My Productivity/Knowledge Management System: A Guide from a Neurodivergent Person." <https://adrianagabsalot.medium.com/my-productivity-knowledge-management-system-a-guide-from-a-neurodivergent-person-a42b7351f06a>

[^59]: Tiimo. <https://www.tiimoapp.com/>; "Neuroinclusive AI Planning." <https://www.tiimoapp.com/resource-hub/ai-planner> (winner iPhone App of the Year 2025).

[^60]: Shimko et al. (2025). "A Classroom Study on Notetaking Modalities and Inattentive Attention-Deficit/Hyperactivity Disorder Symptoms." Applied Cognitive Psychology. <https://onlinelibrary.wiley.com/doi/10.1002/acp.70105?af=R>; "Learning From Recorded Lectures: Perceptions of Students With ADHD." ResearchGate. <https://researchgate.net/publication/370552695_Learning_From_Recorded_Lectures_Perceptions_of_Students_With_ADHD>

[^61]: Instructure. Canvas release notes (2024-03-16, 2024-06-15). <https://community.canvaslms.com/t5/Canvas-Releases/Canvas-Release-Notes-2024-03-16/ta-p/595880>; MIT Sloan T&LT. "New in Canvas: Screen Capture Feedback Feature Added to SpeedGrader." Feb 2025. <https://mitsloanedtech.mit.edu/2025/02/26/new-in-canvas-screen-capture-feedback-feature-added-to-speedgrader/>

[^62]: D2L. "Accessibility in Education." <https://www.d2l.com/accessibility/>; "Accessibility+." <https://www.d2l.com/brightspace/accessibility-plus/>; "Multi-Year Accessibility Plan 2022–2027." <https://www.d2l.com/legal/accessibility-plan/>

[^63]: Microsoft Support. "Accessibility tools for Microsoft 365." <https://support.microsoft.com/en-au/office/accessibility-tools-for-microsoft-365-b5087b20-1387-4686-a0a5-8e11c5f46cdf>; "Accessibility tools for neurodiversity." <https://support.microsoft.com/en-us/topic/accessibility-tools-for-neurodiversity-6dbd8065-b543-4cf8-bdfb-7c84d9e8f74a>

[^64]: Apple Support. "Get captions of spoken and computer audio on Mac." <https://support.apple.com/guide/mac-help/get-live-captions-of-spoken-audio-mchldd11f4fd/mac>; "What's new in VoiceOver on Mac." <https://support.apple.com/guide/voiceover/whats-new-in-voiceover-vo15627/mac>; iMore. "Apple unveils new iOS 18 accessibility features including Eye Tracking." <https://www.imore.com/apple/apple-unveils-new-ios-18-accessibility-features-including-eye-tracking-and-live-captions-for-vision-pro>

[^65]: C-Pen. "Reader 2." <https://cpen.com/insights/assistive-technology-for-dyslexia/>; Scanning Pens. <https://www.scanningpens.com/>; Dyslexic.com. "The Exam Pen Reader 2 from C-Pen." <https://www.dyslexic.com/product/the-exam-pen-reader-from-c-pen/>

[^66]: Phonak. "Roger for Education." <https://www.phonak.com/en-us/hearing-devices/microphones/roger-for-education>; "Roger SoundField / DigiMaster 7000." <https://www.phonak.com/en-int/hearing-devices/microphones/phonak-roger-soundfield>

[^67]: XRAI. "XRAI Unveils Next-Gen Captioning Glasses at AWE 2025." <https://xrai.glass/blog/ar2-launched-at-awe-2025/>; HearingTracker. "AR Live Captioning Glasses Review." <https://www.hearingtracker.com/hearing-glasses/hear-with-your-eyes-five-ar-live-captioning-glasses>

[^68]: EDUCAUSE. "2025 Students and Technology Report." Apr 2025. <https://library.educause.edu/resources/2025/4/2025-educause-students-and-technology-report>; "The Impact of AI in Advancing Accessibility for Learners with Disabilities." Sep 2024. <https://er.educause.edu/articles/2024/9/the-impact-of-ai-in-advancing-accessibility-for-learners-with-disabilities>; National Disability Center. "Access Leads to Achievement: A National Report on Disabled Students." Feb 2025. <https://nationaldisabilitycenter.org/wp-content/uploads/2025/02/Student-Access-Report-2025-Accessible.pdf>

[^69]: Disabled Students UK. "2024 Access Insights Report." <https://disabledstudents.co.uk/wp-content/uploads/2024/12/2024-Access-Insights-Report.pdf>; Inside Higher Ed. "Faculty Survey Shows Need for Digital Accessibility Support." 15 May 2025. <https://www.insidehighered.com/news/student-success/academic-life/2025/05/15/faculty-survey-shows-need-digital-accessibility>

[^70]: ScienceDirect. "Getting ahead in the online university: Disclosure experiences of students with apparent and hidden disabilities." <https://www.sciencedirect.com/science/article/pii/S0883035522000696>; T&F. "Balancing attendance and disclosure: identity work of students with invisible disabilities." <https://www.tandfonline.com/doi/full/10.1080/09687599.2023.2181765>; Regulatory Review. "Special Treatment Stigma in Higher Education." <https://www.theregreview.org/2021/10/27/buonocore-porter-special-treatment-stigma-in-higher-education/>

[^71]: Psychology Today. "What Is the Invisible Burden of School Accommodations?" Jun 2024. <https://www.psychologytoday.com/us/blog/living-neurodivergence/202406/what-is-the-invisible-burden-of-school-accommodations>; Inside Higher Ed. "4 barriers to accommodation for students with disabilities." 7 Jun 2024. <https://www.insidehighered.com/news/student-success/college-experience/2024/06/07/4-barriers-accommodation-students-disabilities>; GAO. "Higher Education: Education Could Improve Information on Accommodations for Students with Disabilities." GAO-24-105614. <https://www.gao.gov/products/gao-24-105614>

[^72]: ScienceDirect. "The use of generative AI by students with disabilities in higher education." 2025. <https://www.sciencedirect.com/science/article/pii/S1096751625000235>; Inside Higher Ed. "The Case for AI as Accommodation." 26 Nov 2025. <https://www.insidehighered.com/opinion/views/2025/11/26/case-ai-accommodation-opinion>

[^73]: GradPilot. "Can You Use ChatGPT in College? AI Policies in 210 Syllabi Across 75 Disciplines." <https://gradpilot.com/news/can-you-use-chatgpt-in-college-ai-syllabus-policies-by-discipline>; UT Austin CTL. "ChatGPT and Generative AI Tools: Sample Syllabus Policy Statements." <https://ctl.utexas.edu/chatgpt-and-generative-ai-tools-sample-syllabus-policy-statements>; EdTech Magazine. "Generative AI in Higher Education: How to Craft a Use Policy." Jul 2024. <https://edtechmagazine.com/higher/article/2024/07/how-craft-generative-ai-use-policy-higher-education-perfcon>

[^74]: UC Berkeley DSP. "Technology Grants." <https://dsp.berkeley.edu/auxiliary-service-units/other-services/technology-grants>

[^75]: W3C WAI. "Cognitive Accessibility User Research." <https://www.w3.org/TR/coga-user-research/>; "Cognitive and learning." <https://www.w3.org/WAI/people-use-web/abilities-barriers/cognitive/>

---

_End of report._
