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
// Returns { name, version } or null if the key has no `@` (defensive —
// every real packages key has one).
export function parseDepKey(key) {
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
// and the two-space lockfile indent. Scoped names are single-quoted in
// the YAML (because a leading `@` needs quoting), so the regex tolerates
// an optional surrounding quote.
const PKG_KEY_LINE = /^([+-])\s{2,4}'?((?:@[^@'/]+\/)?[^@'\s/]+@[^':\s]+)'?\s*:\s*$/;
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;

// The lockfile path we look for in the diff's `+++ b/<path>` header. A
// PR that touches the lockfile shows it here; anything else is ignored.
const LOCKFILE_NAME = 'pnpm-lock.yaml';

// Classify one diff line. Returns one of:
//   { kind: 'file', isLockfile: bool }                 — file header
//   { kind: 'depKey', sign: '+'|'-', name, version }   — added/removed key
//   { kind: 'other' }
function matchDiffLine(line) {
  const fileMatch = line.match(FILE_HEADER);
  if (fileMatch) return { kind: 'file', isLockfile: fileMatch[1] === LOCKFILE_NAME };
  const keyMatch = line.match(PKG_KEY_LINE);
  if (keyMatch) {
    const parsed = parseDepKey(keyMatch[2]);
    if (parsed) return { kind: 'depKey', sign: keyMatch[1], ...parsed };
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
// Only lines inside the `pnpm-lock.yaml` file section count — the
// file-header gate flips `inLockfile` so a `packages:`-shaped key that
// happens to appear in some other file's diff (e.g. a doc code block)
// is ignored.
//
// CRAP-only finding from the per-line event-kind dispatch in the loop
// body; splitting it would move the dispatch up a level without
// reducing real complexity.
// fallow-ignore-next-line complexity
export function extractDepChanges(diff) {
  const byName = new Map();
  let inLockfile = false;

  const slot = (name) => {
    let s = byName.get(name);
    if (!s) {
      s = { name, removed: new Set(), added: new Set() };
      byName.set(name, s);
    }
    return s;
  };

  for (const line of diff.split('\n')) {
    const ev = matchDiffLine(line);
    if (ev.kind === 'file') {
      inLockfile = ev.isLockfile;
    } else if (!inLockfile) {
      continue;
    } else if (ev.kind === 'depKey') {
      const s = slot(ev.name);
      (ev.sign === '-' ? s.removed : s.added).add(ev.version);
    }
  }
  return byName;
}

// Turn the per-name added/removed version sets into classified changes.
// Returns { bumps, removals, netNew, warnings }.
//
// Classification per package name:
//   - removed AND added, one each → bump (old=removed, new=added).
//   - removed AND added, but not 1:1 → ambiguous multi-version shuffle;
//     emit each removed as a removal and each added as a netNew, plus a
//     warning so the reviewer knows it wasn't a clean bump.
//   - removed only → removal(s).
//   - added only → netNew(s).
//
// fallow-ignore-next-line complexity
export function classifyChanges(byName) {
  const bumps = [];
  const removals = [];
  const netNew = [];
  const warnings = [];

  for (const { name, removed, added } of byName.values()) {
    const rem = [...removed];
    const add = [...added];
    if (rem.length === 1 && add.length === 1) {
      bumps.push({ name, oldVersion: rem[0], newVersion: add[0] });
    } else {
      if (rem.length > 0 && add.length > 0) {
        warnings.push(
          `multi-version change for ${name}: removed [${rem.join(', ')}], added [${add.join(', ')}]; reported as separate removals/netNew rather than a single bump`,
        );
      }
      for (const v of rem) removals.push({ name, version: v });
      for (const v of add) netNew.push({ name, version: v });
    }
  }
  return { bumps, removals, netNew, warnings };
}

// Convenience accessor for callers that only want `(name, oldVersion,
// newVersion)` triples. Discards everything else.
export function extractBumps(diff) {
  return classifyChanges(extractDepChanges(diff)).bumps;
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

// Walk the lockfile's `packages` map and return a Map keyed by the raw
// `name@version` package key. Each value carries the fields we need for
// peer-compat analysis. pnpm's `packages:` keys are already
// `name@version` with no peer-context suffix, so each key is a distinct
// resolution and there is no hoisting/nesting ambiguity to dedup around
// (unlike npm's path-keyed lockfile).
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
    const peer = meta && typeof meta === 'object' ? (meta.peerDependencies ?? {}) : {};
    out.set(key, {
      name: parsed.name,
      version: parsed.version,
      peerDependencies: typeof peer === 'object' && peer !== null ? peer : {},
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
  const { bumps, removals, netNew, warnings } = classifyChanges(extractDepChanges(diffText));

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
