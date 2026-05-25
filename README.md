# notebook-app

[![Status: pre-implementation](https://img.shields.io/badge/status-pre--implementation-orange.svg)](#)
[![Last commit](https://img.shields.io/github/last-commit/bkshrader/notebook-app)](https://github.com/bkshrader/notebook-app/commits/main)
[![CI](https://github.com/bkshrader/notebook-app/actions/workflows/ci.yml/badge.svg)](https://github.com/bkshrader/notebook-app/actions/workflows/ci.yml)
[![CodeQL](https://github.com/bkshrader/notebook-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/bkshrader/notebook-app/actions/workflows/codeql.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

> ⚠️ **Very early WIP — not ready for install or use.** This project is in pre-implementation research and scaffolding. There is no working application yet, no installer, no usable feature set. The code here is exploratory. Do not attempt to use it as a notebook.

An accessibility-first note-taking application for college students and academics.

## What it is

`notebook-app` is a desktop note-taking app designed from the ground up around accessibility — primarily cognitive accommodations for ADHD and Autism, with first-class support for physical, vision, and hearing disabilities layered on top.

## Goals

- **Cognitive accessibility first.** Reduced visual clutter, predictable layout, stable focus, executive-function scaffolding.
- **WCAG 2.1 AAA aspirational, AA non-negotiable.** Every interactive surface meets AA contrast, focus visibility, keyboard reachability, label/role/value exposure, and reduced-motion compliance.
- **Keyboard navigation and screen reader support are first-class.** JAWS, NVDA, VoiceOver, and Orca must produce a usable experience for the full app surface.
- **Academic-grade math, citations, and document handling.** LaTeX is first-class, bibliography management is integrated, and the math renderer must produce screen-reader-announceable output.
- **Local-first, plain-Markdown storage.** Your notes are plain files on your disk — readable without this app. No vendor lock-in.

## Tech stack

- **Electron** — chosen specifically because bundled Chromium exposes the strongest accessible tree of any web-based runtime.
- **electron-vite** + **TypeScript** — build tooling.
- **ESLint** + **Prettier** + **fallow** — code quality tooling.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the in-progress feature catalog, and [docs/features/accessibility/OVERVIEW.md](docs/features/accessibility/OVERVIEW.md) for the accessibility charter.

## License

notebook-app — accessibility-first note-taking app for academics.
Copyright (C) 2026 Bradley Shrader

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
