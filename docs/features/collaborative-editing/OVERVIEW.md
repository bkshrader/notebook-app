# Collaborative Editing

**Version:** 3.0

Real-time multi-user editing of notes. Study group on the same lecture transcript; lab group co-authoring a method document; classroom shared notebook.

## Scope

- Real-time concurrent editing (multiple cursors visible, character-level live updates).
- Comments and suggestions (revision-suggestion mode, à la Google Docs).
- Presence indicators (who's currently in this note).
- Permissions per-Note or per-Project (view / comment / edit).
- Conflict-free via CRDT.

## Engineering shape

- **CRDT library:** Yjs (MIT) is the de facto choice. Mature, well-integrated with CodeMirror 6 via `y-codemirror.next`. AGPL-clean.
- **Transport:** WebRTC or WebSocket. Decision deferred.
- **Persistence:** the CRDT state is persisted alongside the note; the canonical Markdown is materialized from the CRDT.
- **Sync infrastructure:** shares architecture with [remote sync](../remote-sync/OVERVIEW.md).

## Why this is v3.0

- Significant engineering: CRDT integration, presence, permissions, conflict UX.
- The v1 user is "one student studying" — solo by definition. Adding collaboration up-front bloats the surface for everyone for the benefit of few.
- Mature in v3 when [remote sync](../remote-sync/OVERVIEW.md) is also being designed; the two share infrastructure.

## Open questions

- Does the AGPL license model interact with collaboration in non-obvious ways? (E.g., AGPL §13 network-interaction triggers — but we're not the server unless we self-host the sync.)
- Hosted vs. peer-to-peer collaboration. P2P (WebRTC) avoids a backend but is fussy with NAT traversal.

## Relevant Documentation

- [Related libraries](../../research/related-libraries.md) — Yjs, Automerge, ElectricSQL, RxDB with license verdicts.
- [Remote sync](../remote-sync/OVERVIEW.md) — sister feature with shared infrastructure.
- [CodeMirror 6](../../research/codemirror.md) — `y-codemirror.next` integration story.
