#!/usr/bin/env node
// extract-dep-signals.mjs — read a PR diff plus the base-ref
// `package-lock.json`, and emit structured risk signals for the
// dependency-review workflow:
//
//   1. Bumps          — (name, oldVersion, newVersion) triples for every
//                       version change in the lockfile.
//   2. Removals       — packages dropped from the dep tree.
//   3. NetNew         — packages added to the dep tree (transitive surface
//                       expansion).
//   4. LicenseChanges — packages whose license string changed.
//   5. PeerMismatches — consumers in the base-ref lockfile that declare a
//                       `peerDependencies` range NOT satisfied by the new
//                       version of a bumped package. THIS IS THE
//                       HIGHEST-SIGNAL OUTPUT — it surfaces "you bumped X
//                       but Y still wants the old range" before Claude
//                       has to reason about it.
//
// SECURITY MODEL
//
// This script runs in CI on Dependabot-authored PRs. ALL inputs are
// local files — the checked-out base-ref `package-lock.json` (trusted,
// authored by us before the PR existed) and the PR's diff (untrusted,
// authored by Dependabot which is in turn driven by upstream packages).
//
// Defenses:
//
//   1. No network. No subprocess. No `npm view`, no `gh api`, no
//      `fetch()`. The script is a pure transformer over local data.
//      Release-note content is handled by the workflow's Claude prompt
//      directly via `pr.json.body` (Dependabot's own changelog
//      embedding) — this script does NOT touch release notes.
//
//   2. Diff parsing is regex-based with bounded line-window heuristics.
//      An attacker who can shape the diff can confuse `extractStanzaChanges`
//      into emitting noise, but the downstream consumer (Claude with a
//      read-only tool allowlist) can only act on the signals
//      advisorily.
//
//   3. Peer-range satisfaction uses the `semver` library — battle-tested
//      and widely deployed, on the project's license allow list (ISC).
//
// CONTRACT
//
//   Inputs (flags):
//     --diff <path>      Path to the PR's unified diff. Required.
//     --lockfile <path>  Path to the BASE REF package-lock.json. Required.
//     --out <path>       Output JSON path. Required.
//
//   Output JSON shape (versions illustrative):
//     {
//       "bumps": [
//         { "name": "eslint", "oldVersion": "9.39.4", "newVersion": "10.4.0",
//           "oldLicense": "MIT", "newLicense": "MIT",
//           "isMajor": true }
//       ],
//       "removals":   [ { "name": "callsites", "version": "3.1.0" } ],
//       "netNew":     [ { "name": "@types/esrecurse", "version": "4.3.1",
//                         "license": "MIT" } ],
//       "licenseChanges": [
//         { "name": "foo", "version": "2.0.0",
//           "oldLicense": "MIT", "newLicense": "ISC" }
//       ],
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
// Diff parsing
// ---------------------------------------------------------------------------

// Lockfile stanzas look like:
//
//   "node_modules/<name>": {
//     "version": "X.Y.Z",
//     "resolved": "...",
//     "license": "MIT",
//     ...
//   }
//
// We track the most recent `"node_modules/<name>":` key seen, then
// scan for `version` / `license` lines (with `+` / `-` / context
// prefixes) within the stanza. The stanza terminates at the next key
// or end-of-hunk.
const PKG_KEY = /^[ +-]\s*"((?:node_modules\/.+\/)?node_modules\/(?:@[^"/]+\/)?[^"/]+)"\s*:\s*\{/;
const VERSION_LINE = /^([+-])\s*"version"\s*:\s*"([^"]+)"\s*,?\s*$/;
const LICENSE_LINE = /^([+-])\s*"license"\s*:\s*"([^"]+)"\s*,?\s*$/;
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;
const HUNK_HEADER = /^@@ /;

// Normalize a lockfile path like `node_modules/foo/node_modules/bar` to
// the bare package name `bar`. The lockfile uses nested node_modules
// paths for transitive deps; for matching against other name-keyed data
// (e.g. peerDependencies), the leaf segment is what we need.
function pathToName(lockfilePath) {
  const segments = lockfilePath.split('node_modules/');
  return segments[segments.length - 1];
}

// Extract structured stanza-level changes from a PR diff. Returns a
// Map<lockfilePath, { name, oldVersion, newVersion, oldLicense, newLicense, kind }>
// where `kind` is one of:
//   - 'bump':    both old and new versions present
//   - 'removal': only old version present (stanza deleted)
//   - 'netNew':  only new version present (stanza added)
//
// We key by full lockfile path (not bare name) to avoid merging
// distinct copies of the same package. npm hoisting + nested
// node_modules paths mean a single package name can appear at multiple
// versions in one lockfile — e.g., `semver` exists at v5.7.2, v6.3.1,
// v7.7.4, v7.8.1 in this repo across different paths. If a Dependabot
// PR removes one resolution and adds another, dedup-by-name would
// merge a `-version: "5.7.2"` line from one stanza with a
// `+version: "7.8.1"` line from another into a fake "5.7.2 → 7.8.1
// bump." Keying by path keeps them separate.
//
// Downstream consumers that want per-name semantics (`findPeerMismatches`,
// the run loop) iterate values and use `entry.name`.
//
// Accumulator for in-flight stanza state. Encapsulates the pending
// version/license values and the "flush on stanza boundary" pattern so
// the main loop in extractStanzaChanges doesn't have to.
function makeStanzaAccumulator() {
  const byPath = new Map();
  let currentPath = null;
  let currentName = null;
  let pending = {};

  return {
    setStanza(path, name) {
      this.commit();
      currentPath = path;
      currentName = name;
    },
    clearStanza() {
      this.commit();
      currentPath = null;
      currentName = null;
    },
    record(field, value) {
      pending[field] = value;
    },
    commit() {
      if (!currentPath) return;
      const existing = byPath.get(currentPath) ?? { name: currentName };
      Object.assign(existing, pending);
      // Only persist if we accumulated something beyond the bare `name`
      // sentinel (e.g., a version or license field actually appeared).
      if (Object.keys(existing).length > 1) byPath.set(currentPath, existing);
      pending = {};
    },
    finish() {
      this.commit();
      return byPath;
    },
  };
}

// Classify accumulated stanzas as bump / removal / netNew based on
// which version fields are present. Drops entries with only license
// changes (rare; not actionable). CRAP-only finding from uncovered
// 4-branch dispatch over present-version fields.
// fallow-ignore-next-line complexity
function classifyStanzas(byPath) {
  for (const [path, e] of byPath) {
    if (e.oldVersion && e.newVersion) e.kind = 'bump';
    else if (e.oldVersion) e.kind = 'removal';
    else if (e.newVersion) e.kind = 'netNew';
    else byPath.delete(path);
  }
  return byPath;
}

// Classify one diff line into a structured event for the main loop.
// Returns one of:
//   { kind: 'file', isLockfile: bool }    — file header
//   { kind: 'hunk' }                       — `@@ ... @@` hunk header
//   { kind: 'pkgKey', path: string, name: string }  — start of a stanza
//   { kind: 'field', field: 'oldVersion' | 'newVersion' | 'oldLicense' | 'newLicense', value: string }
//   { kind: 'other' }                      — line we don't care about
//
// Pattern-match dispatch over the line types we care about — each
// branch is one regex match + struct construction. Refactoring this
// into per-kind helpers would just move the dispatch up one level.
// fallow-ignore-next-line complexity
function matchDiffLine(line) {
  const fileMatch = line.match(FILE_HEADER);
  if (fileMatch) return { kind: 'file', isLockfile: fileMatch[1] === 'package-lock.json' };
  if (HUNK_HEADER.test(line)) return { kind: 'hunk' };
  const pkgMatch = line.match(PKG_KEY);
  if (pkgMatch) return { kind: 'pkgKey', path: pkgMatch[1], name: pathToName(pkgMatch[1]) };
  const versionMatch = line.match(VERSION_LINE);
  if (versionMatch) {
    return {
      kind: 'field',
      field: versionMatch[1] === '-' ? 'oldVersion' : 'newVersion',
      value: versionMatch[2],
    };
  }
  const licenseMatch = line.match(LICENSE_LINE);
  if (licenseMatch) {
    return {
      kind: 'field',
      field: licenseMatch[1] === '-' ? 'oldLicense' : 'newLicense',
      value: licenseMatch[2],
    };
  }
  return { kind: 'other' };
}

// Main driver — delegates per-line classification to matchDiffLine and
// per-stanza accumulation to the StanzaAccumulator. CRAP-only finding
// from the 5-event-kind dispatch in the loop body.
//
// Hunk-boundary handling: `@@` lines reset the current stanza. Without
// this, a hunk that ends mid-stanza followed by a hunk that begins
// mid-some-other-stanza (no fresh `"node_modules/..."` key) would
// mis-attribute the second hunk's version/license lines to the first
// stanza's package.
// fallow-ignore-next-line complexity
export function extractStanzaChanges(diff) {
  const acc = makeStanzaAccumulator();
  let inLockfile = false;

  for (const line of diff.split('\n')) {
    const ev = matchDiffLine(line);
    if (ev.kind === 'file') {
      inLockfile = ev.isLockfile;
      acc.clearStanza();
    } else if (!inLockfile) {
      continue;
    } else if (ev.kind === 'hunk') {
      acc.clearStanza();
    } else if (ev.kind === 'pkgKey') {
      acc.setStanza(ev.path, ev.name);
    } else if (ev.kind === 'field') {
      acc.record(ev.field, ev.value);
    }
  }

  return classifyStanzas(acc.finish());
}

// Convenience accessor for callers that only want `(name, oldVersion,
// newVersion)` triples. Iterates the path-keyed map and extracts the
// name from each value.
export function extractBumps(diff) {
  const out = [];
  for (const e of extractStanzaChanges(diff).values()) {
    if (e.kind === 'bump') {
      out.push({ name: e.name, oldVersion: e.oldVersion, newVersion: e.newVersion });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lockfile parsing
// ---------------------------------------------------------------------------

// Walk the lockfile's `packages` object and return a Map keyed by bare
// package name (deduped). Each value carries the fields we need for
// peer-compat and license analysis. If a package appears under
// multiple nested paths, the FIRST seen wins — npm's hoisting puts the
// top-level resolution first in the object's key order.
//
// The root entry (key `""`) is excluded — it represents the host
// project itself, which has no useful version/license/peer info.
//
// Three early-continue filters (skip-root / skip-non-node_modules /
// skip-duplicate) followed by a build-and-set. Splitting would obscure
// the linear filter chain.
// fallow-ignore-next-line complexity
export function indexLockfile(lock) {
  const out = new Map();
  for (const [path, meta] of Object.entries(lock.packages ?? {})) {
    if (path === '') continue;
    if (!path.startsWith('node_modules/')) continue;
    const name = pathToName(path);
    if (out.has(name)) continue;
    out.set(name, {
      version: meta.version,
      license: typeof meta.license === 'string' ? meta.license : undefined,
      peerDependencies: meta.peerDependencies ?? {},
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
// Returns an array of { consumer, consumerVersion, bumpedPackage,
// declaredRange, newVersion, satisfies: false } entries. We only emit
// when satisfies is definitely false; semver.satisfies returns false
// (not throws) on malformed input as of semver@7.x, so malformed
// ranges naturally show up as mismatches — which is the right
// behavior anyway, since we shouldn't silently pass an upstream
// declaration we can't interpret.
//
// Nested-for filter: outer over consumers, inner over the consumer's
// peer declarations. Each guard (skip-self-bumped / skip-no-peer /
// emit-on-fail) is a single line. Splitting would require threading
// state through helpers.
// fallow-ignore-next-line complexity
export function findPeerMismatches(bumps, baseLockfileIndex) {
  const bumpedByName = new Map(bumps.map((b) => [b.name, b.newVersion]));
  const out = [];

  for (const [consumer, meta] of baseLockfileIndex) {
    if (bumpedByName.has(consumer)) continue;
    for (const [peerName, declaredRange] of Object.entries(meta.peerDependencies)) {
      const newVersion = bumpedByName.get(peerName);
      if (!newVersion) continue;
      if (semver.satisfies(newVersion, declaredRange, { includePrerelease: true })) continue;
      out.push({
        consumer,
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

// A "major" bump is one where semver.major(new) > semver.major(old).
// For 0.x packages we additionally treat any minor bump (0.1 → 0.2) as
// effectively major — that's the SemVer convention for 0.x: minor
// bumps may be breaking. Anything we can't parse is `null` (unknown).
//
// Encodes the SemVer 0.x rule + parse-failure handling. Each branch is
// a documented part of the rule; splitting would scatter the rule
// across helpers.
// fallow-ignore-next-line complexity
export function isMajorBump(oldVersion, newVersion) {
  try {
    const o = semver.coerce(oldVersion);
    const n = semver.coerce(newVersion);
    if (!o || !n) return null;
    if (n.major > o.major) return true;
    if (n.major === 0 && o.major === 0 && n.minor > o.minor) return true;
    return false;
  } catch {
    return null;
  }
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

// Parse a lockfile JSON blob, surfacing parse errors against --lockfile.
function parseLockfile(text, path) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse --lockfile ${path} as JSON: ${err.message}`);
  }
}

// Build a `bumps[]` entry from a classified stanza change. License
// falls back to the base-ref lockfile if the diff didn't include a
// license line in this stanza (common — most version-only changes
// don't show license context).
//
// Limitation: a stanza with ONLY a `-"license"` line (license removed
// in the new version, no `+` counterpart) collapses to newLicense ===
// oldLicense, so buildLicenseChangeEntry won't surface it as a change.
// In practice packages don't drop their license string between
// versions, so we accept this gap rather than complicate the schema
// with a "license-explicitly-removed" tri-state.
//
// CRAP-only finding from uncovered nullish-coalesce chains for the
// license-fallback logic.
// fallow-ignore-next-line complexity
function buildBumpEntry(name, e, baseIndex) {
  const oldLicense = e.oldLicense ?? baseIndex.get(name)?.license ?? null;
  const newLicense = e.newLicense ?? oldLicense;
  return {
    name,
    oldVersion: e.oldVersion,
    newVersion: e.newVersion,
    oldLicense,
    newLicense,
    isMajor: isMajorBump(e.oldVersion, e.newVersion) === true,
  };
}

// If the bumped package's license string changed, return the
// licenseChange entry; otherwise null.
function buildLicenseChangeEntry(bump) {
  const { oldLicense, newLicense } = bump;
  if (!oldLicense || !newLicense || oldLicense === newLicense) return null;
  return { name: bump.name, version: bump.newVersion, oldLicense, newLicense };
}

// Dispatch a classified stanza change into the per-kind builder.
// Returns `{ bump?, removal?, netNew?, licenseChange? }`. CRAP-only
// finding from the 3-kind dispatch.
// fallow-ignore-next-line complexity
function classifyChange(name, e, baseIndex) {
  if (e.kind === 'bump') {
    const bump = buildBumpEntry(name, e, baseIndex);
    const licenseChange = buildLicenseChangeEntry(bump);
    return licenseChange ? { bump, licenseChange } : { bump };
  }
  if (e.kind === 'removal') return { removal: { name, version: e.oldVersion } };
  if (e.kind === 'netNew') {
    return { netNew: { name, version: e.newVersion, license: e.newLicense ?? null } };
  }
  return {};
}

// Top-level orchestration: read inputs, classify each change, build the
// signals output. CRAP-only finding from the 4-bucket dispatch over
// classifyChange's result shape. The dispatch is a 4-line if-chain
// against optional fields and doesn't benefit from further extraction.
// fallow-ignore-next-line complexity
export async function run(opts) {
  const diffText = await readNamedFile(opts.diff, '--diff');
  const lockText = await readNamedFile(opts.lockfile, '--lockfile');
  const lock = parseLockfile(lockText, opts.lockfile);

  const baseIndex = indexLockfile(lock);
  const changes = extractStanzaChanges(diffText);

  const bumps = [];
  const removals = [];
  const netNew = [];
  const licenseChanges = [];
  // `changes` is keyed by lockfile path (not name) so distinct copies
  // of the same package at different paths stay separate.
  for (const e of changes.values()) {
    const c = classifyChange(e.name, e, baseIndex);
    if (c.bump) bumps.push(c.bump);
    if (c.removal) removals.push(c.removal);
    if (c.netNew) netNew.push(c.netNew);
    if (c.licenseChange) licenseChanges.push(c.licenseChange);
  }

  const result = {
    bumps,
    removals,
    netNew,
    licenseChanges,
    peerMismatches: findPeerMismatches(bumps, baseIndex),
    warnings: [],
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
