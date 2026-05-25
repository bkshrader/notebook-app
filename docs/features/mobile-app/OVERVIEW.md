# Mobile App

**Version:** 3.0

A companion mobile app for iOS and Android. Primary use case: **audio capture when the laptop isn't available.** Secondary: review/light-edit on the go.

## Why mobile is v3 not earlier

- Mobile architecture is meaningfully different from desktop (different framework decision, different a11y APIs, different OS lifecycle).
- The desktop experience must be solid before splitting engineering attention.
- Mobile is meaningfully coupled to [remote sync](../remote-sync/OVERVIEW.md) — without sync, a mobile app is an isolated island. Both land together in v3.

## Scope

- **In scope:** audio capture (record a lecture, sync to library), basic note viewing, light note editing, capture-inbox parity.
- **Out of scope for v3:** PDF viewing/annotation (defer), heavy editor parity, math editing.

## Framework decision (open)

- **React Native** / **Capacitor** if we want to share UI code with the desktop Electron app.
- **Native (Swift / Kotlin)** for best a11y experience — iOS VoiceOver and Android TalkBack are most polished against native widgets.
- Decision deferred until v3 planning starts; the trade is engineering velocity vs. a11y polish, same shape as the desktop framework decision.

## Accessibility consideration

- Mobile screen readers (VoiceOver iOS, TalkBack Android) have their own quirks distinct from desktop ATs.
- TalkBack in particular is fussy about gesture-based navigation; the CodeMirror research flagged an open CM6 issue (#1556) where TalkBack jumps to syntax regions instead of lines. If we ship a web-tech mobile path, this needs investigation.

## Relevant references

- [Adaptive tech in academia](../../references/adaptive-tech-in-academia.md) — mobile-app expectations of the target audience, the iPad+Apple-Pencil ecosystem, hardware students actually carry.
- [Audio recording and transcription](../audio-recording-and-transcription/OVERVIEW.md) — the primary mobile use case.
- [Remote sync](../remote-sync/OVERVIEW.md) — coupled feature that makes mobile useful.
- [CodeMirror 6](../../references/codemirror.md) — TalkBack issue to investigate if we ship CM6 on mobile.
