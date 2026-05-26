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
// Inputs are local files only: the checked-out base-ref `package-lock.json`
// (trusted; authored by us pre-PR) and the PR's diff (untrusted;
// upstream-controlled via Dependabot). No network, no subprocess, no
// `fetch()` / `gh api` / `npm view`. Diff parsing is regex-based; an
// attacker who can shape the diff can emit noise but cannot escalate
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
      // `pending` is reset unconditionally — even when there's no
      // active stanza (currentPath is null). Without that, orphan
      // record() calls between a hunk-boundary clearStanza and the
      // next setStanza would accumulate in pending and then leak
      // into the next stanza's data. The hunk-boundary fix only
      // half-worked: it stopped the leak into the PREVIOUS stanza,
      // but the NEXT stanza could still pick up the polluted
      // pending object.
      if (currentPath) {
        const existing = byPath.get(currentPath) ?? { name: currentName };
        Object.assign(existing, pending);
        // Only persist if we accumulated something beyond the bare
        // `name` sentinel (e.g., a version or license field actually
        // appeared).
        if (Object.keys(existing).length > 1) byPath.set(currentPath, existing);
      }
      pending = {};
    },
    finish() {
      this.commit();
      return byPath;
    },
  };
}

// Classify accumulated stanzas as bump / removal / netNew based on
// which version fields are present. License-only stanzas (no version
// change) are dropped from the main output but surfaced as warnings
// so they don't silently disappear — `signals.warnings` is read by
// the prompt and is the right place to flag "we saw something
// interesting but couldn't classify it." Returns the array of
// warnings.
//
// CRAP-only finding from uncovered 4-branch dispatch over
// present-version fields.
// fallow-ignore-next-line complexity
function classifyStanzas(byPath) {
  const warnings = [];
  for (const [path, e] of byPath) {
    if (e.oldVersion && e.newVersion) e.kind = 'bump';
    else if (e.oldVersion) e.kind = 'removal';
    else if (e.newVersion) e.kind = 'netNew';
    else {
      // No version change. If the stanza had license-only signal,
      // surface a warning before dropping it; otherwise drop silently.
      if (e.oldLicense || e.newLicense) {
        warnings.push(
          `license-only stanza change at ${path} (oldLicense=${e.oldLicense ?? 'none'}, newLicense=${e.newLicense ?? 'none'}); not classified as a bump/removal/netNew`,
        );
      }
      byPath.delete(path);
    }
  }
  return warnings;
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

  const changes = acc.finish();
  const warnings = classifyStanzas(changes);
  return { changes, warnings };
}

// Convenience accessor for callers that only want `(name, oldVersion,
// newVersion)` triples. Discards warnings; for those, call
// `extractStanzaChanges` directly.
export function extractBumps(diff) {
  const out = [];
  for (const e of extractStanzaChanges(diff).changes.values()) {
    if (e.kind === 'bump') {
      out.push({ name: e.name, oldVersion: e.oldVersion, newVersion: e.newVersion });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lockfile parsing
// ---------------------------------------------------------------------------

// Walk the lockfile's `packages` object and return a Map keyed by full
// lockfile path. Each value carries the fields we need for peer-compat
// and license analysis. We do NOT dedup by bare name — the same
// package can appear at multiple versions under different paths
// (hoisted + nested), and dropping the duplicates loses information
// `findPeerMismatches` needs to be correct: different versions of the
// same consumer can declare different peer ranges, and `buildBumpEntry`
// needs to read the license of the specific stanza being bumped, not
// some arbitrary other copy.
//
// The root entry (key `""`) is excluded — it represents the host
// project itself, which has no useful version/license/peer info.
//
// Two early-continue filters (skip-root / skip-non-node_modules)
// followed by a build-and-set.
// fallow-ignore-next-line complexity
export function indexLockfile(lock) {
  const out = new Map();
  for (const [path, meta] of Object.entries(lock.packages ?? {})) {
    if (path === '') continue;
    if (!path.startsWith('node_modules/')) continue;
    out.set(path, {
      name: pathToName(path),
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
// `baseLockfileIndex` is path-keyed, so the same consumer name can
// appear multiple times (one per lockfile resolution — hoisted +
// nested copies). Iterating all entries means we catch peer ranges
// declared on non-hoisted copies that the previous name-dedupped
// implementation missed. We deduplicate output by
// `(consumerName, consumerVersion, peerName, declaredRange)` so the
// same logical consumer-resolution doesn't surface twice when it
// shows up at multiple paths (e.g. workspace pinning).
//
// Nested-for filter: outer over consumer resolutions, inner over
// each consumer's peer declarations. Each guard (skip-self-bumped /
// skip-no-peer / skip-satisfied / dedup / emit) is a single line.
// fallow-ignore-next-line complexity
export function findPeerMismatches(bumps, baseLockfileIndex) {
  const bumpedByName = new Map(bumps.map((b) => [b.name, b.newVersion]));
  const seen = new Set();
  const out = [];

  for (const [path, meta] of baseLockfileIndex) {
    if (bumpedByName.has(meta.name)) continue;
    for (const [peerName, declaredRange] of Object.entries(meta.peerDependencies)) {
      const newVersion = bumpedByName.get(peerName);
      if (!newVersion) continue;
      if (semver.satisfies(newVersion, declaredRange, { includePrerelease: true })) continue;
      // Dedup by (name, version-or-path, peer, range). Using version
      // alone collides when meta.version is undefined (workspace or
      // `file:` entries — they're stored without a resolved version
      // number); falling back to the lockfile path makes the key
      // distinctive even in that case while preserving the
      // intended dedup for the common same-resolution-at-multiple-
      // paths case.
      const versionKey = meta.version ?? `path:${path}`;
      const dedupKey = `${meta.name}@${versionKey}::${peerName}::${declaredRange}`;
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

// Parse a lockfile JSON blob, surfacing parse errors against --lockfile.
function parseLockfile(text, path) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Failed to parse --lockfile ${path} as JSON: ${err.message}`);
  }
}

// Build a `bumps[]` entry from a classified stanza change. License
// falls back to the base-ref lockfile entry AT THE SAME LOCKFILE PATH
// if the diff didn't include a license line in this stanza (common —
// most version-only changes don't show license context). Looking up
// by path (not by name) is load-bearing: same-named packages at
// different paths can have different licenses (hoisted vs nested
// copies), and a fallback that reads from the wrong resolution would
// either mask a real license change or fabricate a fake one.
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
function buildBumpEntry(path, name, e, baseIndex) {
  const oldLicense = e.oldLicense ?? baseIndex.get(path)?.license ?? null;
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
function classifyChange(path, name, e, baseIndex) {
  if (e.kind === 'bump') {
    const bump = buildBumpEntry(path, name, e, baseIndex);
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
  const { changes, warnings: stanzaWarnings } = extractStanzaChanges(diffText);

  const bumps = [];
  const removals = [];
  const netNew = [];
  const licenseChanges = [];
  // `changes` is keyed by lockfile path (not name) so distinct copies
  // of the same package at different paths stay separate. Threading
  // the path into classifyChange lets buildBumpEntry resolve license
  // fallbacks against the same lockfile entry rather than against an
  // arbitrarily-picked other copy.
  for (const [path, e] of changes) {
    const c = classifyChange(path, e.name, e, baseIndex);
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
    warnings: stanzaWarnings,
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
