# Remote Sync

**Version:** 3.0

Cross-device sync of the user's Library. Optional, opt-in; the v1/v2 local-first model remains the default.

## Sync model (open decision)

Three plausible architectures, each with different tradeoffs:

- **A: Hosted service (we run a backend).** Easiest UX. Recurring infra cost. Conflicts with the "no lock-in" principle. Lots of operational burden (compliance, security, uptime).
- **B: Self-hostable sync server (single binary, à la Syncthing).** Aligns with the local-first ethos. Lower operational burden. Higher user-onboarding friction.
- **C: BYO sync (recommend the user point their existing sync tool — iCloud / Dropbox / Drive / Syncthing — at the notes folder).** This is what v1 already does (sort of, implicitly, because notes are plain files). It "works" today; the question is whether v3 adds anything beyond that.

The roadmap currently anticipates option B or C; the choice depends on what "remote sync" needs to do that the v1 plain-files-in-iCloud approach doesn't already cover.

## What needs more than plain-file sync

- **Sub-file metadata** like [timestamp-anchored notes](../timestamp-anchored-notes/OVERVIEW.md) anchor data, embedding indices, the FTS index. These either need to be sync'd alongside (option B/C with file-level sync handles this fine, if a bit chunky) or regenerated locally (option C, with the embeddings being regenerated being meaningful).
- **Conflict resolution.** If both devices edit the same note while offline, plain-file sync produces conflict copies. Not great UX. CRDT (Yjs / Automerge) would solve this — but adds significant scope. Decision deferred.
- **Mobile.** The [mobile app](../mobile-app/OVERVIEW.md) is the dominant driver — mobile needs sync to be useful.

## Engineering implication for v1/v2

- Storage layer should remain file-system-based (it already is — see [plain-md-storage](../plain-md-storage/OVERVIEW.md)).
- Any sub-file metadata should be stored in sidecar files (e.g., `note.md` + `note.notes-meta.json`) or YAML frontmatter, both of which file-level sync handles cleanly.
- Designing v1 with sync in mind costs almost nothing if the storage model stays simple. Retrofitting later is expensive.

## What v3.0 ships (tentative)

- Option B (self-hostable sync) or C (BYO + tooling polish) — decision deferred.
- Conflict-resolution UX for the file-level-conflict case.
- Optional CRDT integration if option B and we want real-time multi-device editing.

## Relevant references

- [Related libraries](../../references/related-libraries.md) — Yjs, Automerge, RxDB, ElectricSQL, Dexie, sqlite-vec with license verdicts.
- [files.md](../../references/files-md.md) — the three-tier sync model (local → cloud-folder → self-hosted) this draws inspiration from.
- [Mobile app](../mobile-app/OVERVIEW.md) — the v3 feature that drives the need for real sync.
- [Collaborative editing](../collaborative-editing/OVERVIEW.md) — adjacent feature that may share CRDT infrastructure.
