# Incompatible / trap-laden licenses

Libraries we have evaluated and rejected (or accepted with a caveat) on license grounds. Consult before proposing a new dependency in the same problem space.

**Keep this up to date.** Add an entry any time research rules a library out for license reasons, or any time a library's license changes in a way that affects us.

## Rejected

### `tldraw`

Custom commercial license (not OSI-approved, not AGPL-compatible). **Use Excalidraw instead** for the whiteboard/canvas feature.

### `citeproc-js`

Dual-licensed AGPL-3.0 / CPAL-1.0 — **not MIT**, despite what some package metadata claims. Acceptable for us (AGPL is our project license), but anyone proposing a permissive-license alternative should know citeproc-js is not it.

## Accept with caveat

### BlockNote `xl-*` packages

GPL-3.0. Compatible with AGPL-3.0-or-later when linked, but pulls in strong copyleft beyond what the core MIT BlockNote packages require. Worth noting if we ever consider relicensing.

### PyMuPDF

AGPL-3.0. Fine for us, but using it bakes in a permanent AGPL-only dependency — we can never relicense to anything weaker than AGPL while PyMuPDF is in the tree.

### Supertonic model weights

OpenRAIL-M license. The code is fine; the **weights** are not redistributable under AGPL. Ship as a first-run download from the upstream source, never bundle in the AGPL distribution.
