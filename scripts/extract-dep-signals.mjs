#!/usr/bin/env node
// extract-dep-signals.mjs — read a PR diff plus the base-ref
// `pnpm-lock.yaml`, and emit structured risk signals for the
// dependency-review workflow:
//
//   1. Bumps          — (name, oldVersion, newVersion) triples for every
//                       version change in the lockfile.
//   2. Removals       — packages dropped from the dep tree.
//   3. NetNew         — packages added to the dep tree (transitive surface
//                       expansion).
//   4. PeerMismatches — consumers in the base-ref lockfile that declare a
//                       `peerDependencies` range NOT satisfied by the new
//                       version of a bumped package. THIS IS THE
//                       HIGHEST-SIGNAL OUTPUT — it surfaces "you bumped X
//                       but Y still wants the old range" before Claude
//                       has to reason about it.
//
// NO LICENSE SIGNALS. pnpm's lockfile does NOT record per-package license
// strings (npm's `package-lock.json` did). License drift can therefore no
// longer be derived from the lockfile alone, so `licenseChanges` and the
// `*License` fields are gone from the output shape. The `license-check`
// CI gate (license-checker against the installed tree) remains the
// enforcement point for production-dep licenses; devDep license drift is
// no longer surfaced here. See
//   docs/features/continuous-integration/adrs/package-manager.md
//
// SECURITY MODEL
//
// Inputs are local files only: the checked-out base-ref `pnpm-lock.yaml`
// (trusted; authored by us pre-PR) and the PR's diff (untrusted;
// upstream-controlled via Dependabot). No network, no subprocess, no
// `fetch()` / `gh api` / `pnpm view`. Diff parsing is regex-based and
// lockfile parsing uses the `yaml` parser in safe (no custom tags) mode;
// an attacker who can shape the diff can emit noise but cannot escalate
// — the downstream consumer (Claude with `Read,Grep,Glob` only) is
// advisory.
//
// Full rationale, including why this is a local extractor rather than a
// network changelog fetcher and how it fits the dep-review workflow:
//   docs/features/continuous-integration/adrs/claude-dependency-review.md
//
// CONTRACT
//
//   Inputs (flags):
//     --diff <path>      Path to the PR's unified diff. Required.
//     --lockfile <path>  Path to the BASE REF pnpm-lock.yaml. Required.
//     --out <path>       Output JSON path. Required.
//
//   Output JSON shape (versions illustrative):
//     {
//       "bumps": [
//         { "name": "eslint", "oldVersion": "9.39.4", "newVersion": "10.4.0",
//           "isMajor": true }
//       ],
//       "removals":   [ { "name": "callsites", "version": "3.1.0" } ],
//       "netNew":     [ { "name": "@types/esrecurse", "version": "4.3.1" } ],
//       "peerMismatches": [
//         { "consumer": "eslint-plugin-jsx-a11y",
//           "consumerVersion": "6.10.2",
//           "bumpedPackage": "eslint",
//           "declaredRange": "^3 || ^4 || ... || ^9",
//           "newVersion": "10.4.0",
//           "satisfies": false }
//       ],
//       "warnings": [ "..." ]
//     }
//
//   Exit codes:
//     0  Success (output written).
//     1  Fatal: missing flag, unreadable input, malformed lockfile, write failure.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import { parse as parseYaml } from 'yaml';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

// Idiomatic CLI flag-dispatch switch — cyclomatic = #flags + 2. Splitting
// each case into a helper would add ceremony without improving clarity.
// fallow-ignore-next-line complexity
export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--diff':
        out.diff = next();
        break;
      case '--lockfile':
        out.lockfile = next();
        break;
      case '--out':
        out.out = next();
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!out.diff) throw new Error('--diff is required');
  if (!out.lockfile) throw new Error('--lockfile is required');
  if (!out.out) throw new Error('--out is required');
  return out;
}

// ---------------------------------------------------------------------------
// name@version key parsing
// ---------------------------------------------------------------------------

// A pnpm `packages:` key is `name@version`, where `name` may be scoped
// (`@scope/pkg`). Versions in the `packages:` section are bare semver —
// pnpm only appends the `(peer-context)` suffix in the `snapshots:`
// section, which we deliberately do not key on. Splitting on the LAST
// `@` separates name from version while leaving a leading scope `@`
// attached to the name.
//
// ALIAS KEYS: an aliased dependency is keyed `alias@npm:realname@version`
// (e.g. `string-width-cjs@npm:string-width@4.2.3`). A naive lastIndexOf
// still picks the final `@` for the version, but the name would then
// include the whole `alias@npm:realname` blob. We special-case the
// `@npm:` marker so `name` is the alias (the identity the rest of the
// tree refers to) and `version` is the trailing semver.
//
// Returns { name, version } or null if the key has no `@` (defensive —
// every real packages key has one).
//
// Two parse paths (alias vs plain) each with their own null guards; the
// branch count is the cost of handling `@npm:` aliases correctly, not
// incidental complexity. Splitting the alias arm into a helper would
// just relocate the same guards.
// fallow-ignore-next-line complexity
export function parseDepKey(key) {
  const aliasAt = key.indexOf('@npm:');
  if (aliasAt > 0) {
    const name = key.slice(0, aliasAt);
    const spec = key.slice(aliasAt + '@npm:'.length); // realname@version
    const specAt = spec.lastIndexOf('@');
    if (specAt <= 0) return null;
    const version = spec.slice(specAt + 1);
    if (!name || !version) return null;
    return { name, version };
  }
  const at = key.lastIndexOf('@');
  if (at <= 0) return null; // no `@`, or `@` only at position 0 (bare scope)
  const name = key.slice(0, at);
  const version = key.slice(at + 1);
  if (!name || !version) return null;
  return { name, version };
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

// In a pnpm-lock.yaml diff, every dep resolution appears as a key under
// the top-level `packages:` map, indented two spaces:
//
//   packages:
//     7zip-bin@5.2.0:
//       resolution: { ... }
//     '@babel/core@7.29.7':
//       resolution: { ... }
//       peerDependencies: { ... }
//
// A bump replaces one such key with another at a new version; a net-new
// adds a key; a removal deletes one. We scan the diff for ADDED (`+`)
// and REMOVED (`-`) `packages:` keys and group them by package name.
//
// We intentionally key on the `packages:` section, NOT `snapshots:` or
// `importers:`:
//   - `packages:` keys are clean `name@version` (no peer-context suffix),
//     so version extraction is unambiguous.
//   - every resolved dep — direct or transitive — has exactly one
//     `packages:` entry, so this captures the full tree.
//   - `snapshots:` keys carry `(peer-context)` suffixes and duplicate the
//     same `name@version` many times; counting them would inflate signal.
//   - `importers:` only covers direct deps and stores the version on a
//     separate `version:` line, not the key.
//
// The key line in a unified diff is the package key prefixed by `+`/`-`
// and the EXACTLY-two-space lockfile indent. Scoped names are
// single-quoted in the YAML (because a leading `@` needs quoting), so
// the regex tolerates an optional surrounding quote.
//
// The indent is pinned to exactly two spaces (`\s{2}` then a non-space)
// because that is the only depth at which `packages:`/`snapshots:`
// section keys sit; `importers:` version lines are deeper (8 spaces)
// and so never match.
const PKG_KEY_LINE = /^([+-]) {2}(\S.*)$/;
// A package key, once we've confirmed we're on a 2-space-indented line
// in the `packages:` section: optional surrounding quotes around
// `name@version` with no whitespace. The peer-context-bearing
// `snapshots:` keys are excluded by SECTION, not by this pattern (their
// shape is `name@version(...)`, which this would still match — hence the
// section gate is load-bearing, not the regex).
const PKG_KEY_BODY = /^'?((?:@[^@'/]+\/)?[^@'\s/]+@[^'\s]+?)'?:$/;
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;
// Top-level YAML section marker — `packages:` / `snapshots:` /
// `importers:` / `settings:` at column 0. In a unified diff these appear
// either as context/added/removed content (prefixed by ` `/`+`/`-` then
// the bare word at column 0) OR as the trailing context of a hunk header
// (`@@ -a,b +c,d @@ packages:`). Both forms are recognized so the parser
// always knows which section a key line belongs to.
const SECTION_CONTENT = /^[ +-](packages|snapshots|importers|settings):\s*$/;
const HUNK_HEADER_SECTION = /^@@ .* @@\s*(packages|snapshots|importers|settings):/;

// The lockfile basename we look for in the diff's `+++ b/<path>` header.
// We compare by BASENAME, not the full path, so a workspace/monorepo
// lockfile that lives below the repo root (`+++ b/packages/app/pnpm-lock.yaml`)
// is still recognized. The diff is already scoped to lockfile changes by
// the workflow, so basename matching can't pull in an unrelated file.
const LOCKFILE_NAME = 'pnpm-lock.yaml';

// Basename of a `+++ b/<path>` header path. The lockfile uses `/` as its
// path separator in unified diffs on every platform (git emits POSIX
// separators), so splitting on `/` is correct cross-platform.
function basenameOf(path) {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

// A bare hunk header (`@@ -a,b +c,d @@[ optional context]`). When the
// trailing context does NOT name a section, the hunk has jumped to an
// unknown location, so the parser must drop any section it was tracking
// rather than carry a stale `packages` into what might be `snapshots`
// content.
const HUNK_HEADER = /^@@ /;

// Classify one diff line. Returns one of:
//   { kind: 'file', isLockfile: bool }                 — file header
//   { kind: 'section', section: string }               — section marker
//   { kind: 'hunk' }                                   — section-less hunk header
//   { kind: 'depKey', sign: '+'|'-', name, version }   — added/removed key
//   { kind: 'other' }
//
// Section detection runs BEFORE the generic hunk check so a hunk header
// carrying a section name (which also begins with `@@`) is classified as
// a section, not as a section-resetting bare hunk.
//
// Ordered regex-dispatch over the line kinds we care about — each branch
// is one match + struct construction. Cyclomatic count is just the
// number of line kinds; extracting per-kind helpers would move the
// dispatch up a level without reducing real complexity. Branch coverage
// comes via extractDepChanges' tests, not direct unit tests of this
// helper (hence the CRAP-only finding).
// fallow-ignore-next-line complexity
function matchDiffLine(line) {
  const fileMatch = line.match(FILE_HEADER);
  if (fileMatch) return { kind: 'file', isLockfile: basenameOf(fileMatch[1]) === LOCKFILE_NAME };
  const hunkSection = line.match(HUNK_HEADER_SECTION);
  if (hunkSection) return { kind: 'section', section: hunkSection[1] };
  if (HUNK_HEADER.test(line)) return { kind: 'hunk' };
  const sectionContent = line.match(SECTION_CONTENT);
  if (sectionContent) return { kind: 'section', section: sectionContent[1] };
  const keyLine = line.match(PKG_KEY_LINE);
  if (keyLine) {
    const body = keyLine[2].match(PKG_KEY_BODY);
    if (body) {
      // A `(` in the key body means a `snapshots:` peer-context suffix
      // (`name@version(peer@x)`) — never a `packages:` key. Classify it
      // as a peer-suffixed key so extractDepChanges can reject it by
      // SHAPE, independent of section tracking. This is the
      // defense-in-depth that lets us safely count clean keys even when
      // the section is unknown (a section-less hunk header).
      const isPeerSuffixed = body[1].includes('(');
      const parsed = parseDepKey(body[1]);
      if (parsed) {
        return { kind: isPeerSuffixed ? 'peerKey' : 'depKey', sign: keyLine[1], ...parsed };
      }
    }
  }
  return { kind: 'other' };
}

// Extract per-package version changes from a PR diff. Returns a
// Map<name, { name, removed: Set<version>, added: Set<version> }>.
//
// We accumulate the full set of added/removed versions per name rather
// than assuming one-in-one-out, because a single PR can legitimately
// shuffle multiple resolutions of the same package (pnpm keeps each
// distinct version as its own `packages:` key). classifyChanges below
// turns these sets into bump/removal/netNew entries.
//
// Two defenses decide whether a key line counts:
//   1. `inLockfile` — we're inside the `pnpm-lock.yaml` file section of
//      the diff (a `packages:`-shaped key in some other file, e.g. a doc
//      code block, is ignored).
//   2. Key SHAPE + section. `snapshots:` keys carry `(peer-context)`
//      suffixes (`name@version(peer@x)`); matchDiffLine classifies those
//      as `peerKey` (by the `(`) and we NEVER count them. Clean
//      (`depKey`) keys are counted only when `section === 'packages'`.
//
//      Both checks matter, and neither is redundant:
//        - The section gate is primary. A `snapshots:` entry for a
//          package with no peers is a CLEAN `name@version` key (e.g.
//          `'@babel/core@7.29.7':`), shape-indistinguishable from its
//          `packages:` entry — only the section tells them apart. So we
//          cannot count clean keys when the section is unknown.
//        - The shape check is defense-in-depth: even if section tracking
//          ever failed, a peer-suffixed key would still be rejected
//          rather than mis-split by parseDepKey into garbage.
//
//      Empirically git always carries the section funcname on the hunk
//      header (`@@ ... @@ packages:`), even under `--unified=0`, so a
//      `null` (unknown) section is a pathological/synthetic-diff case;
//      we drop keys there rather than risk counting snapshot entries.
//
// CRAP-only finding from the per-line event-kind dispatch in the loop
// body; splitting it would move the dispatch up a level without
// reducing real complexity.
// fallow-ignore-next-line complexity
export function extractDepChanges(diff) {
  const byName = new Map();
  let inLockfile = false;
  let section = null;

  const slot = (name) => {
    let s = byName.get(name);
    if (!s) {
      s = { name, removed: new Set(), added: new Set() };
      byName.set(name, s);
    }
    return s;
  };

  // Split on \r?\n so a CRLF-terminated diff (Windows checkout, or a
  // diff fetched through an API that normalizes line endings) doesn't
  // leave a trailing \r on every line — that \r defeats the `$` anchors
  // in FILE_HEADER/PKG_KEY_BODY and would silently yield zero signals.
  for (const line of diff.split(/\r?\n/)) {
    const ev = matchDiffLine(line);
    if (ev.kind === 'file') {
      inLockfile = ev.isLockfile;
      section = null;
    } else if (!inLockfile) {
      continue;
    } else if (ev.kind === 'section') {
      section = ev.section;
    } else if (ev.kind === 'hunk') {
      // Section-less hunk header: location jumped, section unknown.
      section = null;
    } else if (ev.kind === 'depKey' && section === 'packages') {
      // Count clean keys only inside the packages section. peerKey
      // events (snapshots peer-context suffix) are never counted,
      // regardless of section — that shape check is defense-in-depth on
      // top of the section gate (see the rationale above).
      const s = slot(ev.name);
      (ev.sign === '-' ? s.removed : s.added).add(ev.version);
    }
  }
  return byName;
}

// Turn the per-name added/removed version sets into classified changes.
// Returns { bumps, removals, netNew, warnings }.
//
// `baseIndex` is the base-ref lockfile index (Map keyed by `name@version`,
// from indexLockfile). It's how a `-`/`+` pair is CORROBORATED as a real
// in-place bump rather than two unrelated resolutions that happened to
// change in the same PR. Optional: when omitted (or empty), no pair can
// be corroborated, so every removed/added version is reported as a plain
// removal/netNew — the honest behavior when we have nothing to confirm a
// bump against.
//
// Why corroboration is necessary: the diff ALONE cannot distinguish
//   (a) a real bump: foo@1 removed, foo@2 added, same resolution moving;
//   (b) churn: the last consumer of foo@1 is dropped while a new consumer
//       of foo@2 is added — two independent changes that look identical
//       in the diff (`-foo@1` / `+foo@2`).
// Reporting (b) as a bump fabricates a version transition that never
// happened, and that phantom then drives a false `isMajor` flag and a
// false (highest-signal) peerMismatch downstream. So we only call it a
// bump when the base lockfile confirms the shape of a real bump: the
// removed version WAS present in the base tree and the added version was
// NOT (i.e. the resolution genuinely moved from old to new).
//
// Classification per package name:
//   1. Cancel versions present on BOTH a `-` and a `+` line (diff context
//      churn — a key re-rendered because its block was reordered).
//   2. Multi-version shuffle (the ORIGINAL removed/added sets had >1
//      version on either side): never a clean bump, even if cancellation
//      leaves a 1:1 survivor — that survivor is an arbitrary pairing of
//      unrelated resolutions. Emit removals + netNew + a warning.
//   3. Singleton 1:1 survivor (each original set had ≤1 version):
//        - corroborated by baseIndex → bump (old=removed, new=added).
//        - not corroborated → removal + netNew + a warning (we can't
//          confirm the two versions are the same resolution moving).
//   4. removed only → removal(s); added only → netNew(s).
//
// fallow-ignore-next-line complexity
export function classifyChanges(byName, baseIndex = new Map()) {
  const bumps = [];
  const removals = [];
  const netNew = [];
  const warnings = [];

  const emitSplit = (name, rem, add) => {
    for (const v of rem) removals.push({ name, version: v });
    for (const v of add) netNew.push({ name, version: v });
  };

  for (const { name, removed, added } of byName.values()) {
    // A multi-version shuffle is anything where either ORIGINAL side
    // carried more than one version. Detect it BEFORE cancellation so a
    // shuffle that cancels down to a deceptive 1:1 is never mistaken for
    // a clean bump.
    const isShuffle = removed.size > 1 || added.size > 1;

    // Cancel versions on both sides: a `-foo@1.0.0` paired with a
    // `+foo@1.0.0` is an unchanged key the diff happened to re-render,
    // not a bump-to-itself.
    const rem = [...removed].filter((v) => !added.has(v));
    const add = [...added].filter((v) => !removed.has(v));
    if (rem.length === 0 && add.length === 0) continue;

    const cleanPair = rem.length === 1 && add.length === 1 && !isShuffle;
    const corroborated =
      cleanPair && baseIndex.has(`${name}@${rem[0]}`) && !baseIndex.has(`${name}@${add[0]}`);

    if (corroborated) {
      bumps.push({ name, oldVersion: rem[0], newVersion: add[0] });
      continue;
    }

    // Not a confirmed bump. Explain why when both sides have content (a
    // plausible-but-unconfirmed change), so the reviewer sees the
    // ambiguity these heuristics deliberately refuse to resolve.
    if (rem.length > 0 && add.length > 0) {
      if (isShuffle) {
        warnings.push(
          `multi-version change for ${name}: removed [${rem.join(', ')}], added [${add.join(', ')}]; reported as separate removals/netNew rather than a single bump`,
        );
      } else {
        warnings.push(
          `unconfirmed change for ${name}: removed ${rem[0]}, added ${add[0]}; could not confirm a single resolution moved between them from the base lockfile, so reported as a separate removal + netNew rather than a bump`,
        );
      }
    }
    emitSplit(name, rem, add);
  }
  return { bumps, removals, netNew, warnings };
}

// Convenience accessor for callers that only want `(name, oldVersion,
// newVersion)` triples. Discards everything else. `baseIndex` is
// forwarded so bumps are corroborated (without it, no 1:1 is confirmable
// and bumps come back empty — see classifyChanges).
export function extractBumps(diff, baseIndex = new Map()) {
  return classifyChanges(extractDepChanges(diff), baseIndex).bumps;
}

// ---------------------------------------------------------------------------
// Lockfile parsing
// ---------------------------------------------------------------------------

// Parse a pnpm-lock.yaml blob. `yaml`'s default parse does not evaluate
// custom tags, so a hostile lockfile can at worst produce odd data, not
// code execution.
function parseLockfile(text, path) {
  try {
    const doc = parseYaml(text);
    if (doc === null || typeof doc !== 'object') {
      throw new Error('top-level YAML is not a mapping');
    }
    return doc;
  } catch (err) {
    throw new Error(`Failed to parse --lockfile ${path} as YAML: ${err.message}`);
  }
}

// Walk the lockfile's `packages` map and return a Map keyed by the
// PARSED `name@version` (from parseDepKey), NOT the raw lockfile key.
// For most packages the two are identical; for aliased deps the raw key
// is `alias@npm:real@version` while the parsed key is `alias@version` —
// and the parsed form is what every consumer of this index looks up.
// Each value carries the fields we need for peer-compat analysis. pnpm's
// `packages:` keys are already `name@version` with no peer-context
// suffix, so each key is a distinct resolution and there is no
// hoisting/nesting ambiguity to dedup around (unlike npm's path-keyed
// lockfile).
//
// A package can legitimately appear at multiple versions (`foo@1.0.0`
// and `foo@2.0.0` are separate keys); both are kept, because different
// versions of the same consumer can declare different peer ranges and
// findPeerMismatches needs to see all of them.
//
// fallow-ignore-next-line complexity
export function indexLockfile(lock) {
  const out = new Map();
  for (const [key, meta] of Object.entries(lock.packages ?? {})) {
    const parsed = parseDepKey(key);
    if (!parsed) continue;
    const isObj = meta && typeof meta === 'object';
    const peer = isObj ? (meta.peerDependencies ?? {}) : {};
    const peerMeta = isObj ? (meta.peerDependenciesMeta ?? {}) : {};
    // Key by the PARSED `name@version`, not the raw lockfile key. For
    // aliased deps the raw key is `alias@npm:real@version`, but every
    // consumer of this index looks up by parsed name@version
    // (classifyChanges does `baseIndex.has(`${name}@${rem[0]}`)`). Keying
    // by the raw `@npm:` blob would make that lookup always miss, silently
    // demoting an aliased-dep bump to removal+netNew and losing its
    // isMajor / peer-mismatch analysis. parseDepKey returns the ALIAS name
    // (not the underlying real name), so two aliases of the same
    // underlying version stay distinct keys — no collision.
    out.set(`${parsed.name}@${parsed.version}`, {
      name: parsed.name,
      version: parsed.version,
      peerDependencies: typeof peer === 'object' && peer !== null ? peer : {},
      peerDependenciesMeta: typeof peerMeta === 'object' && peerMeta !== null ? peerMeta : {},
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Peer-compat analysis
// ---------------------------------------------------------------------------

// For each bumped package, scan the base-ref lockfile for every
// consumer that declares it in `peerDependencies`. If the consumer is
// NOT also being bumped (i.e., it'll still be at its base-ref version
// after this PR merges) and the new version of the bumped package does
// NOT satisfy the consumer's declared range, emit a mismatch.
//
// We deliberately use the BASE-REF lockfile to enumerate consumers,
// not the diff. Consumers that ARE being bumped get a free pass —
// their new version may declare a wider range, and we have no way to
// know it from local data alone. Better to under-report than to
// false-flag.
//
// OPTIONAL peers are skipped: pnpm records them under
// `peerDependenciesMeta.<name>.optional: true`. An optional peer out of
// range does not break the consumer, so flagging it would be a false
// positive (the lockfile has many — typescript, rollup, etc.).
//
// Returns an array of { consumer, consumerVersion, bumpedPackage,
// declaredRange, newVersion, satisfies: false } entries. We only emit
// when satisfies is definitely false; semver.satisfies returns false
// (not throws) on malformed input as of semver@7.x, so malformed
// ranges naturally show up as mismatches — which is the right
// behavior anyway, since we shouldn't silently pass an upstream
// declaration we can't interpret.
//
// `baseLockfileIndex` is keyed by `name@version`, so the same consumer
// name can appear at multiple versions (each its own key). We dedup
// output by `(consumerName, consumerVersion, peerName, declaredRange)`
// so the same logical consumer-resolution doesn't surface twice.
//
// Nested-for filter: outer over consumer resolutions, inner over
// each consumer's peer declarations. Each guard (skip-self-bumped /
// skip-no-peer / skip-satisfied / dedup / emit) is a single line.
// fallow-ignore-next-line complexity
export function findPeerMismatches(bumps, baseLockfileIndex) {
  const bumpedByName = new Map(bumps.map((b) => [b.name, b.newVersion]));
  const seen = new Set();
  const out = [];

  for (const meta of baseLockfileIndex.values()) {
    if (bumpedByName.has(meta.name)) continue;
    for (const [peerName, declaredRange] of Object.entries(meta.peerDependencies)) {
      const newVersion = bumpedByName.get(peerName);
      if (!newVersion) continue;
      // Optional peers (peerDependenciesMeta.<name>.optional === true)
      // don't break the consumer when out of range — the consumer
      // declared it can run without them, or with a different version.
      // Flagging these produces false HIGH mismatches on routine bumps
      // (e.g. a typescript/rollup major against a plugin that lists them
      // optional), so skip them.
      if (meta.peerDependenciesMeta?.[peerName]?.optional === true) continue;
      if (typeof declaredRange !== 'string') continue;
      if (semver.satisfies(newVersion, declaredRange, { includePrerelease: true })) continue;
      const dedupKey = `${meta.name}@${meta.version}::${peerName}::${declaredRange}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      out.push({
        consumer: meta.name,
        consumerVersion: meta.version,
        bumpedPackage: peerName,
        declaredRange,
        newVersion,
        satisfies: false,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Major-bump detection
// ---------------------------------------------------------------------------

// A "major" bump is one of:
//   - semver.major(new) > semver.major(old): classic 1.x → 2.x
//   - 0.x minor change (SemVer convention: 0.x minor bumps may be breaking)
//   - prerelease churn: one side is prerelease and either
//     (a) the prerelease identifiers differ, or
//     (b) only one side is prerelease.
//     `1.0.0-rc.1` → `1.0.0-rc.2`, `1.0.0-alpha.1` → `1.0.0-beta.1`,
//     and `1.0.0-rc.5` → `1.0.0` all count. Prereleases exist
//     specifically to ship breaking experiments; treating them as
//     non-major would skip the breaking-change-vs-usage scan in the
//     prompt downstream.
//
// Anything we can't parse is `null` (unknown).
//
// Encodes the SemVer rules + parse-failure handling. Each branch is
// a documented part of the rule.
// fallow-ignore-next-line complexity
export function isMajorBump(oldVersion, newVersion) {
  const o = semver.parse(oldVersion) ?? semver.coerce(oldVersion);
  const n = semver.parse(newVersion) ?? semver.coerce(newVersion);
  if (!o || !n) return null;
  if (n.major > o.major) return true;
  if (n.major === 0 && o.major === 0 && n.minor > o.minor) return true;
  const oPre = o.prerelease ?? [];
  const nPre = n.prerelease ?? [];
  if ((oPre.length > 0 || nPre.length > 0) && oPre.join('.') !== nPre.join('.')) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Read a file by path, prefixing any I/O error with a flag-name-aware
// message so the user knows which input failed.
async function readNamedFile(path, flag) {
  try {
    return await readFile(path, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read ${flag} ${path}: ${err.message}`);
  }
}

// Top-level orchestration: read inputs, classify each change, build the
// signals output.
export async function run(opts) {
  const diffText = await readNamedFile(opts.diff, '--diff');
  const lockText = await readNamedFile(opts.lockfile, '--lockfile');
  const lock = parseLockfile(lockText, opts.lockfile);

  const baseIndex = indexLockfile(lock);
  const { bumps, removals, netNew, warnings } = classifyChanges(
    extractDepChanges(diffText),
    baseIndex,
  );

  const bumpsWithMajor = bumps.map((b) => ({
    name: b.name,
    oldVersion: b.oldVersion,
    newVersion: b.newVersion,
    isMajor: isMajorBump(b.oldVersion, b.newVersion) === true,
  }));

  const result = {
    bumps: bumpsWithMajor,
    removals,
    netNew,
    peerMismatches: findPeerMismatches(bumpsWithMajor, baseIndex),
    warnings,
  };

  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, JSON.stringify(result, null, 2) + '\n', 'utf8');
  return result;
}

// CLI entrypoint guard — see scripts/extract-dep-signals.test.mjs for
// the import-side usage.
const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    await run(opts);
  } catch (err) {
    process.stderr.write(`extract-dep-signals: ${err.message}\n`);
    process.exit(1);
  }
}
