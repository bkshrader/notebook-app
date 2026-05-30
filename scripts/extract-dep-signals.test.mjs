// extract-dep-signals.test.mjs — unit tests for the dependency-review
// signal extractor. Coverage focuses on:
//
//   1. name@version key parsing (scoped + unscoped + npm: aliases).
//   2. Dep-change extraction from pnpm-lock.yaml PR diffs (bumps,
//      removals, net-new, multi-version shuffles, CRLF diffs, nested
//      lockfile paths, --unified=0 hunks, section gating).
//   3. classifyChanges corroboration: a 1:1 is only a bump when the base
//      lockfile confirms a single resolution moved; uncorroborated 1:1s
//      and shuffles become removal+netNew+warning, never a phantom bump.
//   4. Lockfile indexing — peer-dep surfacing, multiple versions of one
//      package kept separate.
//   5. Peer-range satisfaction — the highest-signal output. The killer
//      test case is the real-world PR 45 shape: bump eslint past the
//      range its plugin's peerDependencies declare. Optional peers
//      (peerDependenciesMeta) are skipped.
//   6. Major-bump detection, including the 0.x convention.
//   7. End-to-end run() with synthesized inputs.
//
// pnpm's lockfile records NO per-package license string, so there are no
// license-signal tests — that capability was dropped in the npm→pnpm
// migration (see extract-dep-signals.mjs header and the package-manager
// ADR).
//
// Run with: node --test scripts/extract-dep-signals.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';

import {
  parseArgs,
  parseDepKey,
  extractDepChanges,
  classifyChanges,
  extractBumps,
  indexLockfile,
  findPeerMismatches,
  isMajorBump,
  run,
} from './extract-dep-signals.mjs';

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('parseArgs: all three flags required', () => {
  assert.throws(() => parseArgs([]), /--diff is required/);
  assert.throws(() => parseArgs(['--diff', 'd']), /--lockfile is required/);
  assert.throws(() => parseArgs(['--diff', 'd', '--lockfile', 'l']), /--out is required/);
});

test('parseArgs: happy path', () => {
  const o = parseArgs(['--diff', 'd', '--lockfile', 'l', '--out', 'o']);
  assert.deepEqual(o, { diff: 'd', lockfile: 'l', out: 'o' });
});

test('parseArgs: unknown flag rejected', () => {
  assert.throws(
    () => parseArgs(['--diff', 'd', '--lockfile', 'l', '--out', 'o', '--evil']),
    /Unknown argument/,
  );
});

test('parseArgs: missing value rejected', () => {
  assert.throws(() => parseArgs(['--diff']), /Missing value for --diff/);
});

// ---------------------------------------------------------------------------
// parseDepKey
// ---------------------------------------------------------------------------

test('parseDepKey: unscoped package', () => {
  assert.deepEqual(parseDepKey('react@19.2.6'), { name: 'react', version: '19.2.6' });
});

test('parseDepKey: scoped package splits on the last @', () => {
  assert.deepEqual(parseDepKey('@babel/core@7.29.7'), {
    name: '@babel/core',
    version: '7.29.7',
  });
});

test('parseDepKey: prerelease version', () => {
  assert.deepEqual(parseDepKey('foo@1.0.0-rc.1'), { name: 'foo', version: '1.0.0-rc.1' });
});

test('parseDepKey: returns null for keys without a version @', () => {
  assert.equal(parseDepKey('react'), null);
  assert.equal(parseDepKey('@scope/pkg'), null); // bare scope, no version
});

test('parseDepKey: aliased dependency (alias@npm:realname@version)', () => {
  // pnpm keys an aliased dep by the ALIAS, then `@npm:realname@version`.
  // The name must be the alias (what the tree refers to), not the blob.
  assert.deepEqual(parseDepKey('string-width-cjs@npm:string-width@4.2.3'), {
    name: 'string-width-cjs',
    version: '4.2.3',
  });
});

test('parseDepKey: scoped aliased dependency', () => {
  assert.deepEqual(parseDepKey('@scope/alias@npm:@other/real@1.2.3'), {
    name: '@scope/alias',
    version: '1.2.3',
  });
});

// ---------------------------------------------------------------------------
// extractDepChanges + classifyChanges + extractBumps
// ---------------------------------------------------------------------------

// Helper: synthesize a pnpm-lock.yaml diff. Each entry is
// `[name, oldVer, newVer]` where any of oldVer/newVer may be null to
// signal removal / net-new. Scoped names are single-quoted in the YAML
// key, matching how pnpm writes them.
function keyLine(sign, name, version) {
  const key = `${name}@${version}`;
  const quoted = name.startsWith('@') ? `'${key}'` : key;
  return `${sign}  ${quoted}:`;
}

// Emit a SEPARATE `packages:`-context hunk per entry, with the
// blank-line separators and resolution blocks a real `git diff
// pnpm-lock.yaml` produces. Each hunk re-states the `packages:` section
// in its header (`@@ ... @@ packages:`), exactly as git's YAML funcname
// detection does — so this exercises the multi-hunk + section-restate
// path that single-hunk fixtures never touched.
function diffOf(entries) {
  const hunks = entries.flatMap(([name, oldV, newV], i) => {
    const ln = 100 + i * 20;
    const body = [];
    if (oldV) {
      body.push(keyLine('-', name, oldV), `-    resolution: {integrity: sha512-OLD}`);
    }
    if (newV) {
      body.push(keyLine('+', name, newV), `+    resolution: {integrity: sha512-NEW}`);
    }
    return [`@@ -${ln},7 +${ln},7 @@ packages:`, ' ', ...body, ' '];
  });
  return [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    ...hunks,
  ].join('\n');
}

// Build a base-ref lockfile index (name@version-keyed Map) from
// `[name, version]` pairs, matching indexLockfile's output shape. Used
// to CORROBORATE bumps: classifyChanges only reports a 1:1 as a bump
// when the removed version is present here and the added version is not.
function baseIndexOf(pairs) {
  return new Map(
    pairs.map(([name, version]) => [
      `${name}@${version}`,
      { name, version, peerDependencies: {}, peerDependenciesMeta: {} },
    ]),
  );
}

test('extractDepChanges + classifyChanges: bump / removal / netNew', () => {
  const diff = diffOf([
    ['react', '19.2.5', '19.2.6'], // bump
    ['old-pkg', '1.0.0', null], // removal
    ['new-pkg', null, '2.0.0'], // netNew
  ]);
  // Base index corroborates the react bump: 19.2.5 was present, 19.2.6
  // was not, so the 1:1 is a real resolution moving.
  const base = baseIndexOf([['react', '19.2.5']]);
  const { bumps, removals, netNew } = classifyChanges(extractDepChanges(diff), base);
  assert.deepEqual(bumps, [{ name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' }]);
  assert.deepEqual(removals, [{ name: 'old-pkg', version: '1.0.0' }]);
  assert.deepEqual(netNew, [{ name: 'new-pkg', version: '2.0.0' }]);
});

test('extractDepChanges: handles scoped packages', () => {
  const diff = diffOf([['@axe-core/playwright', '4.11.2', '4.11.3']]);
  const base = baseIndexOf([['@axe-core/playwright', '4.11.2']]);
  const { bumps } = classifyChanges(extractDepChanges(diff), base);
  assert.deepEqual(bumps, [
    { name: '@axe-core/playwright', oldVersion: '4.11.2', newVersion: '4.11.3' },
  ]);
});

test('classifyChanges: multi-version shuffle is NOT a fake bump', () => {
  // A Dependabot rollup removes two resolutions of `semver` and adds two
  // others. There's no unambiguous old→new pairing, so we report each as
  // a separate removal/netNew plus a warning, never a fabricated bump.
  const diff = diffOf([
    ['semver', '5.7.2', null],
    ['semver', '6.3.1', null],
    ['semver', null, '7.7.4'],
    ['semver', null, '7.8.1'],
  ]);
  const { bumps, removals, netNew, warnings } = classifyChanges(extractDepChanges(diff));
  assert.equal(bumps.length, 0);
  assert.equal(removals.length, 2);
  assert.equal(netNew.length, 2);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /multi-version change for semver/);
});

test('extractDepChanges: same name at one removed + one added IS a corroborated bump', () => {
  // The clean 1:1 case — a single removed version paired with a single
  // added version is the canonical bump shape, AND the base lockfile
  // corroborates it (9.39.4 present, 10.4.0 absent), so it's reported as
  // a bump rather than a removal + netNew.
  const diff = diffOf([
    ['eslint', '9.39.4', null],
    ['eslint', null, '10.4.0'],
  ]);
  const base = baseIndexOf([['eslint', '9.39.4']]);
  const { bumps } = classifyChanges(extractDepChanges(diff), base);
  assert.deepEqual(bumps, [{ name: 'eslint', oldVersion: '9.39.4', newVersion: '10.4.0' }]);
});

test('classifyChanges: an UNcorroborated 1:1 is a removal + netNew, not a bump', () => {
  // Same diff shape as a bump, but the base lockfile does NOT contain the
  // removed eslint@9.39.4 — so we can't confirm a single resolution moved
  // from 9.39.4 to 10.4.0 (it could be two unrelated changes). Report a
  // removal + netNew + a warning rather than fabricating a bump.
  const diff = diffOf([
    ['eslint', '9.39.4', null],
    ['eslint', null, '10.4.0'],
  ]);
  const { bumps, removals, netNew, warnings } = classifyChanges(extractDepChanges(diff), new Map());
  assert.deepEqual(bumps, []);
  assert.deepEqual(removals, [{ name: 'eslint', version: '9.39.4' }]);
  assert.deepEqual(netNew, [{ name: 'eslint', version: '10.4.0' }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /unconfirmed change for eslint/);
});

test('classifyChanges: a shuffle that cancels to a 1:1 is NOT a clean bump', () => {
  // The phantom-bump trap (finding #1): foo@1.0.0 is dropped and
  // foo@3.0.0 added, while foo@2.0.0 is re-rendered on both sides. The
  // cancellation removes 2.0.0, leaving rem=[1.0.0], add=[3.0.0] — a
  // deceptive 1:1. But the ORIGINAL sets had >1 version, so this is a
  // shuffle: it must NOT classify as a 1.0.0→3.0.0 bump even though the
  // base lockfile would "corroborate" the survivors.
  const byName = new Map([
    [
      'foo',
      { name: 'foo', removed: new Set(['1.0.0', '2.0.0']), added: new Set(['2.0.0', '3.0.0']) },
    ],
  ]);
  const base = baseIndexOf([
    ['foo', '1.0.0'],
    ['foo', '2.0.0'],
  ]);
  const { bumps, removals, netNew, warnings } = classifyChanges(byName, base);
  assert.deepEqual(bumps, [], 'a cancelled shuffle must never become a clean bump');
  assert.deepEqual(removals, [{ name: 'foo', version: '1.0.0' }]);
  assert.deepEqual(netNew, [{ name: 'foo', version: '3.0.0' }]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /multi-version change for foo/);
});

test('extractDepChanges: ignores snapshots-section keys (peer-context suffixes)', () => {
  // THE REGRESSION TEST. A real `git diff pnpm-lock.yaml` for a bump
  // touches BOTH the `packages:` section (clean `name@version` keys) AND
  // the `snapshots:` section, where keys carry `(peer-context)` suffixes
  // at the SAME 2-space indent. Without section tracking, the snapshot
  // keys match the key regex and parseDepKey mis-splits them on the last
  // `@` into garbage name/version pairs, inflating removals/netNew. Only
  // the packages-section bump must survive.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -1000,7 +1000,7 @@ packages:',
    '-  eslint@9.39.4:',
    '+  eslint@10.4.0:',
    '     resolution: {integrity: sha512-x}',
    '@@ -5000,8 +5000,8 @@ snapshots:',
    "-  '@eslint-community/eslint-utils@4.9.1(eslint@9.39.4(jiti@2.7.0))':",
    "+  '@eslint-community/eslint-utils@4.9.1(eslint@10.4.0(jiti@2.7.0))':",
    '     dependencies:',
    '       eslint: 9.39.4',
  ].join('\n');
  const base = baseIndexOf([['eslint', '9.39.4']]);
  const { bumps, removals, netNew } = classifyChanges(extractDepChanges(diff), base);
  assert.deepEqual(bumps, [{ name: 'eslint', oldVersion: '9.39.4', newVersion: '10.4.0' }]);
  assert.deepEqual(removals, [], 'snapshot keys must not become removals');
  assert.deepEqual(netNew, [], 'snapshot keys must not become netNew');
});

test('extractDepChanges: a section-less hunk header does not leak snapshot keys', () => {
  // If a packages-section hunk is followed by a hunk header that does NOT
  // re-state the section, the parser must NOT carry `packages` into what
  // might be snapshots content. Two defenses cover this: the section
  // resets to null (so the gate fails), AND the peer-suffixed snapshot
  // key is rejected by SHAPE regardless. Either way the snapshot-shaped
  // key after the bare hunk header is dropped.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -1000,3 +1000,3 @@ packages:',
    '-  react@19.2.5:',
    '+  react@19.2.6:',
    '@@ -5000,3 +5000,3 @@',
    "-  'react-dom@19.2.5(react@19.2.5)':",
    "+  'react-dom@19.2.6(react@19.2.6)':",
  ].join('\n');
  const base = baseIndexOf([['react', '19.2.5']]);
  const { bumps, removals, netNew } = classifyChanges(extractDepChanges(diff), base);
  assert.deepEqual(bumps, [{ name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' }]);
  assert.deepEqual(removals, []);
  assert.deepEqual(netNew, []);
});

test('extractDepChanges: ignores importers-section version lines', () => {
  // The `importers:` section lists direct deps as a bare `name:` key with
  // the resolved version on a deeper-indented `version:` line. Neither
  // shape should be parsed as a dep key.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -10,7 +10,7 @@ importers:',
    '       eslint:',
    '         specifier: ^9.39.4',
    '-        version: 9.39.4(jiti@2.7.0)',
    '+        version: 10.4.0(jiti@2.7.0)',
  ].join('\n');
  assert.equal(extractDepChanges(diff).size, 0);
});

test('classifyChanges: a version on BOTH sides cancels (no phantom no-op bump)', () => {
  // Diff context churn can re-render an unchanged key as both `-foo@1.0.0`
  // and `+foo@1.0.0` (e.g. its resolution block was reordered). That is
  // not a bump-to-itself; both must cancel and produce no signal.
  const byName = new Map([
    ['foo', { name: 'foo', removed: new Set(['1.0.0']), added: new Set(['1.0.0']) }],
  ]);
  const { bumps, removals, netNew } = classifyChanges(byName);
  assert.deepEqual(bumps, []);
  assert.deepEqual(removals, []);
  assert.deepEqual(netNew, []);
});

test('classifyChanges: cancels the shared version but keeps a real bump alongside', () => {
  // foo@1.0.0 churns (both sides) while foo also genuinely bumps
  // 1.0.0 -> 2.0.0 is not this case; here foo@1.0.0 is unchanged and
  // foo@2.0.0 is net-new — after cancelling 1.0.0 only the 2.0.0 add
  // remains, classified as netNew (single-sided), not a bump.
  const byName = new Map([
    ['foo', { name: 'foo', removed: new Set(['1.0.0']), added: new Set(['1.0.0', '2.0.0']) }],
  ]);
  const { bumps, removals, netNew } = classifyChanges(byName);
  assert.deepEqual(bumps, []);
  assert.deepEqual(removals, []);
  assert.deepEqual(netNew, [{ name: 'foo', version: '2.0.0' }]);
});

test('extractDepChanges: ignores keys outside the pnpm-lock.yaml file section', () => {
  // A `packages:`-shaped key appearing in some OTHER file's diff (here a
  // markdown doc) must not be counted. The file-header gate handles this.
  const diff = [
    'diff --git a/docs/example.md b/docs/example.md',
    '--- a/docs/example.md',
    '+++ b/docs/example.md',
    '@@ -1,2 +1,2 @@',
    '+  react@19.2.6:',
    '-  react@19.2.5:',
  ].join('\n');
  assert.equal(extractDepChanges(diff).size, 0);
});

test('extractDepChanges: ignores resolution/integrity lines, only keys count', () => {
  // Only the `name@version:` key lines drive classification; the
  // resolution lines beneath them must not be parsed as deps.
  const diff = diffOf([['react', '19.2.5', '19.2.6']]);
  const byName = extractDepChanges(diff);
  assert.equal(byName.size, 1);
  assert.ok(byName.has('react'));
});

test('extractDepChanges: returns empty for empty diff', () => {
  assert.equal(extractDepChanges('').size, 0);
});

test('extractDepChanges: parses a CRLF-terminated diff', () => {
  // A diff produced on a CRLF system (or normalized by an API) must still
  // parse — the \r must not defeat the regex `$` anchors and silently
  // yield zero signals.
  const lf = diffOf([['react', '19.2.5', '19.2.6']]);
  const crlf = lf.split('\n').join('\r\n');
  const byName = extractDepChanges(crlf);
  assert.equal(byName.size, 1);
  assert.ok(byName.has('react'));
  const base = baseIndexOf([['react', '19.2.5']]);
  assert.deepEqual(classifyChanges(byName, base).bumps, [
    { name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' },
  ]);
});

test('extractDepChanges: captures a packages bump under a --unified=0 diff', () => {
  // git diff --unified=0 emits zero context lines but STILL carries the
  // section funcname on the hunk header (`@@ -123 +123 @@ packages:`), so
  // the section is known and the bump is captured.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -123 +123 @@ packages:',
    '-  7zip-bin@5.2.0:',
    '+  7zip-bin@5.2.1:',
  ].join('\n');
  const base = baseIndexOf([['7zip-bin', '5.2.0']]);
  assert.deepEqual(classifyChanges(extractDepChanges(diff), base).bumps, [
    { name: '7zip-bin', oldVersion: '5.2.0', newVersion: '5.2.1' },
  ]);
});

test('extractDepChanges: drops a clean key when the section is unknown', () => {
  // A clean key appearing after a section-less hunk header is dropped:
  // a clean `name@version` can be a snapshots entry for a peerless
  // package (e.g. `'@babel/core@7.29.7':`), so we cannot safely count it
  // without knowing the section. This is the deliberate trade-off that
  // keeps snapshot entries from inflating signals.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -5000,3 +5000,3 @@',
    '-  some-pkg@1.0.0:',
    '+  some-pkg@2.0.0:',
  ].join('\n');
  assert.equal(extractDepChanges(diff).size, 0);
});

test('extractDepChanges: recognizes a nested/workspace lockfile path by basename', () => {
  // A monorepo lockfile below the repo root (`b/packages/app/pnpm-lock.yaml`)
  // must still be recognized — the file gate compares by basename.
  const diff = [
    'diff --git a/packages/app/pnpm-lock.yaml b/packages/app/pnpm-lock.yaml',
    '--- a/packages/app/pnpm-lock.yaml',
    '+++ b/packages/app/pnpm-lock.yaml',
    '@@ -100,7 +100,7 @@ packages:',
    '-  react@19.2.5:',
    '+  react@19.2.6:',
  ].join('\n');
  const byName = extractDepChanges(diff);
  assert.equal(byName.size, 1);
  assert.ok(byName.has('react'));
});

test('extractBumps: back-compat shape (base index corroborates the bump)', () => {
  const diff = diffOf([
    ['react', '19.2.5', '19.2.6'],
    ['gone', '1.0.0', null], // should not appear in bumps
  ]);
  const base = baseIndexOf([['react', '19.2.5']]);
  assert.deepEqual(extractBumps(diff, base), [
    { name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' },
  ]);
});

test('extractBumps: without a base index, an uncorroborated 1:1 is not a bump', () => {
  const diff = diffOf([['react', '19.2.5', '19.2.6']]);
  assert.deepEqual(extractBumps(diff), []);
});

// ---------------------------------------------------------------------------
// indexLockfile
// ---------------------------------------------------------------------------

test('indexLockfile: keys by name@version and surfaces peerDependencies', () => {
  const lock = {
    packages: {
      'foo@1.0.0': { resolution: {}, peerDependencies: { bar: '^1' } },
      'foo@2.0.0': { resolution: {} },
    },
  };
  const idx = indexLockfile(lock);
  // Both resolutions of `foo` kept separate.
  assert.equal(idx.size, 2);
  assert.equal(idx.get('foo@1.0.0').name, 'foo');
  assert.equal(idx.get('foo@1.0.0').version, '1.0.0');
  assert.deepEqual(idx.get('foo@1.0.0').peerDependencies, { bar: '^1' });
  assert.equal(idx.get('foo@2.0.0').version, '2.0.0');
  assert.deepEqual(idx.get('foo@2.0.0').peerDependencies, {});
});

test('indexLockfile: scoped names parsed correctly', () => {
  const lock = { packages: { '@babel/core@7.29.7': { resolution: {} } } };
  const idx = indexLockfile(lock);
  assert.equal(idx.get('@babel/core@7.29.7').name, '@babel/core');
  assert.equal(idx.get('@babel/core@7.29.7').version, '7.29.7');
});

test('indexLockfile: handles missing packages map', () => {
  assert.equal(indexLockfile({}).size, 0);
});

test('indexLockfile: handles missing peerDependencies as empty object', () => {
  const lock = { packages: { 'foo@1.0.0': { resolution: {} } } };
  assert.deepEqual(indexLockfile(lock).get('foo@1.0.0').peerDependencies, {});
});

test('indexLockfile: aliased dep is keyed by parsed alias@version, not the raw @npm: key', () => {
  // pnpm writes an aliased dep's `packages:` key as
  // `alias@npm:realname@version`. The index must key it by the PARSED
  // `alias@version` so corroboration lookups (classifyChanges does
  // `baseIndex.has(`${name}@${version}`)`) hit. Keying by the raw blob
  // would make every aliased-dep bump fail corroboration.
  const lock = {
    packages: {
      'string-width-cjs@npm:string-width@4.2.3': { resolution: {}, peerDependencies: {} },
    },
  };
  const idx = indexLockfile(lock);
  assert.ok(idx.has('string-width-cjs@4.2.3'), 'keyed by parsed alias@version');
  assert.ok(!idx.has('string-width-cjs@npm:string-width@4.2.3'), 'raw @npm: key not used');
  assert.equal(idx.get('string-width-cjs@4.2.3').name, 'string-width-cjs');
  assert.equal(idx.get('string-width-cjs@4.2.3').version, '4.2.3');
});

test('indexLockfile: scoped aliased dep keyed by parsed scope/alias@version', () => {
  const lock = {
    packages: {
      '@scope/alias@npm:@other/real@1.2.3': { resolution: {}, peerDependencies: {} },
    },
  };
  const idx = indexLockfile(lock);
  assert.ok(idx.has('@scope/alias@1.2.3'));
  assert.equal(idx.get('@scope/alias@1.2.3').version, '1.2.3');
});

test('classifyChanges: an aliased-dep bump corroborates against the real index (C1 regression)', () => {
  // End-to-end against an index built by indexLockfile from a REAL aliased
  // packages: key — not the synthetic baseIndexOf helper. This is the
  // regression that caught the keying bug: before the fix, indexLockfile
  // stored `string-width-cjs@npm:string-width@4.2.3` while classifyChanges
  // looked up `string-width-cjs@4.2.3`, so the bump was demoted to
  // removal+netNew+warning instead of a clean corroborated bump.
  const baseLock = {
    packages: {
      'string-width-cjs@npm:string-width@4.2.3': { resolution: {}, peerDependencies: {} },
    },
  };
  const baseIndex = indexLockfile(baseLock);
  // Use the AUTHENTIC raw diff-line shape a real `git diff pnpm-lock.yaml`
  // emits for an aliased dep (`alias@npm:real@version:`), not the
  // simplified diffOf form — so this guards the true production input.
  const diff = [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -100,7 +100,7 @@ packages:',
    ' ',
    '-  string-width-cjs@npm:string-width@4.2.3:',
    '-    resolution: {integrity: sha512-OLD}',
    '+  string-width-cjs@npm:string-width@4.3.0:',
    '+    resolution: {integrity: sha512-NEW}',
    ' ',
  ].join('\n');
  const { bumps, removals, netNew, warnings } = classifyChanges(extractDepChanges(diff), baseIndex);
  assert.deepEqual(bumps, [{ name: 'string-width-cjs', oldVersion: '4.2.3', newVersion: '4.3.0' }]);
  assert.equal(removals.length, 0);
  assert.equal(netNew.length, 0);
  assert.equal(warnings.length, 0, 'no "unconfirmed change" warning for a corroborated alias bump');
});

// ---------------------------------------------------------------------------
// findPeerMismatches — the headline feature
// ---------------------------------------------------------------------------

// Test helper: build a name@version-keyed baseIndex from a flat
// `[name, version, peerDeps]` shape.
function lockIndex(entries) {
  return new Map(
    entries.map(([name, version, peerDependencies = {}]) => [
      `${name}@${version}`,
      { name, version, peerDependencies },
    ]),
  );
}

test('findPeerMismatches: real-world PR 45 shape (eslint 9→10, jsx-a11y stuck at ^9)', () => {
  // jsx-a11y@6.10.2 declares its eslint peer as `^3 || ... || ^9`.
  // Bumping eslint to 10.4.0 must produce a single mismatch entry.
  const bumps = [{ name: 'eslint', newVersion: '10.4.0' }];
  const baseIndex = lockIndex([
    ['eslint', '9.39.4', {}],
    ['eslint-plugin-jsx-a11y', '6.10.2', { eslint: '^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9' }],
    [
      'typescript-eslint',
      '8.59.4',
      { eslint: '^8.57.0 || ^9.0.0 || ^10.0.0', typescript: '>=4.8.4' },
    ],
    ['eslint-config-prettier', '10.1.8', { eslint: '>=7.0.0' }],
  ]);
  const out = findPeerMismatches(bumps, baseIndex);
  assert.equal(out.length, 1);
  assert.equal(out[0].consumer, 'eslint-plugin-jsx-a11y');
  assert.equal(out[0].consumerVersion, '6.10.2');
  assert.equal(out[0].bumpedPackage, 'eslint');
  assert.equal(out[0].newVersion, '10.4.0');
  assert.equal(out[0].satisfies, false);
  assert.match(out[0].declaredRange, /\^9$/);
});

test('findPeerMismatches: catches peer ranges from a non-hoisted same-name copy', () => {
  // The hoisted `foo@1.0.0` has no peer on eslint; a second resolution
  // `foo@2.0.0` declares `peerDependencies.eslint: ^9`. Both are distinct
  // name@version keys, so a bump past `^9` flags the 2.0.0 copy.
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = lockIndex([
    ['foo', '1.0.0', {}],
    ['foo', '2.0.0', { eslint: '^9' }],
  ]);
  const out = findPeerMismatches(bumps, baseIndex);
  assert.equal(out.length, 1);
  assert.equal(out[0].consumer, 'foo');
  assert.equal(out[0].consumerVersion, '2.0.0');
  assert.equal(out[0].declaredRange, '^9');
});

test('findPeerMismatches: skips consumers that are themselves being bumped', () => {
  const bumps = [
    { name: 'eslint', newVersion: '10.0.0' },
    { name: 'eslint-plugin-jsx-a11y', newVersion: '7.0.0' },
  ];
  const baseIndex = lockIndex([['eslint-plugin-jsx-a11y', '6.10.2', { eslint: '^9' }]]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: ignores consumers with no peer on bumped package', () => {
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = lockIndex([['unrelated', '1.0.0', { other: '^1' }]]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: flags unparseable range as incompatible', () => {
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = lockIndex([['weird-consumer', '1.0.0', { eslint: 'not-a-real-range' }]]);
  const out = findPeerMismatches(bumps, baseIndex);
  assert.equal(out.length, 1);
  assert.equal(out[0].consumer, 'weird-consumer');
  assert.equal(out[0].satisfies, false);
});

test('findPeerMismatches: ignores non-string declared ranges', () => {
  // A malformed lockfile could carry a non-string peer range. We skip it
  // rather than throw — better to under-report than crash the review.
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = new Map([
    ['weird@1.0.0', { name: 'weird', version: '1.0.0', peerDependencies: { eslint: { foo: 1 } } }],
  ]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: satisfies=true (no entry) when new version IS in range', () => {
  const bumps = [{ name: 'eslint', newVersion: '9.39.4' }];
  const baseIndex = lockIndex([['eslint-plugin-jsx-a11y', '6.10.2', { eslint: '^9' }]]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: skips an OPTIONAL peer that is out of range', () => {
  // @rollup/pluginutils declares `rollup` as a peer AND marks it optional
  // via peerDependenciesMeta. A rollup major bump out of the declared
  // range must NOT produce a mismatch — the consumer runs without it.
  const bumps = [{ name: 'rollup', newVersion: '5.0.0' }];
  const baseIndex = new Map([
    [
      '@rollup/pluginutils@5.3.0',
      {
        name: '@rollup/pluginutils',
        version: '5.3.0',
        peerDependencies: { rollup: '^1.20.0||^2.0.0||^3.0.0||^4.0.0' },
        peerDependenciesMeta: { rollup: { optional: true } },
      },
    ],
  ]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: a REQUIRED peer out of range is still flagged', () => {
  // Same shape, but the peer is NOT optional — regression guard ensuring
  // the optional skip didn't suppress genuine mismatches.
  const bumps = [{ name: 'rollup', newVersion: '5.0.0' }];
  const baseIndex = new Map([
    [
      'needs-rollup@1.0.0',
      {
        name: 'needs-rollup',
        version: '1.0.0',
        peerDependencies: { rollup: '^4.0.0' },
        peerDependenciesMeta: { rollup: { optional: false } },
      },
    ],
  ]);
  const out = findPeerMismatches(bumps, baseIndex);
  assert.equal(out.length, 1);
  assert.equal(out[0].consumer, 'needs-rollup');
  assert.equal(out[0].bumpedPackage, 'rollup');
  assert.equal(out[0].satisfies, false);
});

// ---------------------------------------------------------------------------
// isMajorBump
// ---------------------------------------------------------------------------

test('isMajorBump: classic 1.x → 2.x is major', () => {
  assert.equal(isMajorBump('1.5.3', '2.0.0'), true);
});

test('isMajorBump: same-major minor bump is NOT major', () => {
  assert.equal(isMajorBump('1.5.3', '1.6.0'), false);
});

test('isMajorBump: 0.x minor bump IS major (SemVer 0.x convention)', () => {
  assert.equal(isMajorBump('0.1.5', '0.2.0'), true);
});

test('isMajorBump: 0.x patch bump is NOT major', () => {
  assert.equal(isMajorBump('0.1.5', '0.1.6'), false);
});

test('isMajorBump: handles v-prefix and pre-release tags', () => {
  assert.equal(isMajorBump('v1.0.0', 'v2.0.0'), true);
  assert.equal(isMajorBump('1.0.0-beta.1', '2.0.0'), true);
});

test('isMajorBump: RC-to-RC churn on same numeric version IS major', () => {
  assert.equal(isMajorBump('1.0.0-rc.1', '1.0.0-rc.2'), true);
});

test('isMajorBump: alpha-to-beta track change IS major', () => {
  assert.equal(isMajorBump('1.0.0-alpha.1', '1.0.0-beta.1'), true);
});

test('isMajorBump: prerelease to stable on same numeric version IS major', () => {
  assert.equal(isMajorBump('1.0.0-rc.5', '1.0.0'), true);
});

test('isMajorBump: stable to prerelease IS major', () => {
  assert.equal(isMajorBump('1.0.0', '1.0.0-experimental.1'), true);
});

test('isMajorBump: stable to same stable is NOT major', () => {
  assert.equal(isMajorBump('1.0.0', '1.0.0'), false);
});

test('isMajorBump: returns null on unparseable input', () => {
  assert.equal(isMajorBump('not-a-version', '1.0.0'), null);
});

// ---------------------------------------------------------------------------
// run — end-to-end
// ---------------------------------------------------------------------------

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'extract-dep-signals-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeInputs(dir, { diff, lockfile }) {
  const diffPath = join(dir, 'pr.diff');
  const lockPath = join(dir, 'pnpm-lock.yaml');
  const outPath = join(dir, 'signals.json');
  await writeFile(diffPath, diff, 'utf8');
  await writeFile(lockPath, stringifyYaml(lockfile), 'utf8');
  return { diffPath, lockPath, outPath };
}

test('run: end-to-end with PR-45-shaped inputs surfaces the peer mismatch', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['eslint', '9.39.4', '10.4.0']]),
      lockfile: {
        lockfileVersion: '9.0',
        packages: {
          'eslint@9.39.4': { resolution: { integrity: 'sha512-x' } },
          'eslint-plugin-jsx-a11y@6.10.2': {
            resolution: { integrity: 'sha512-y' },
            peerDependencies: { eslint: '^3 || ^9' },
          },
        },
      },
    });

    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });

    assert.equal(out.bumps.length, 1);
    assert.equal(out.bumps[0].name, 'eslint');
    assert.equal(out.bumps[0].isMajor, true);
    assert.equal(out.peerMismatches.length, 1);
    assert.equal(out.peerMismatches[0].consumer, 'eslint-plugin-jsx-a11y');
    assert.equal(out.peerMismatches[0].satisfies, false);

    // Output file matches return value.
    const persisted = JSON.parse(await readFile(outPath, 'utf8'));
    assert.deepEqual(persisted, out);
  });
});

test('run: surfaces net-new transitive', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['@types/esrecurse', null, '4.3.1']]),
      lockfile: { lockfileVersion: '9.0', packages: {} },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.equal(out.netNew.length, 1);
    assert.deepEqual(out.netNew[0], { name: '@types/esrecurse', version: '4.3.1' });
  });
});

test('run: surfaces removals', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['callsites', '3.1.0', null]]),
      lockfile: { lockfileVersion: '9.0', packages: {} },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.equal(out.removals.length, 1);
    assert.deepEqual(out.removals[0], { name: 'callsites', version: '3.1.0' });
  });
});

test('run: empty diff produces empty signals', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: '',
      lockfile: { lockfileVersion: '9.0', packages: {} },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.deepEqual(out, {
      bumps: [],
      removals: [],
      netNew: [],
      peerMismatches: [],
      warnings: [],
    });
  });
});

test('run: an uncorroborated 1:1 does not fabricate a bump or a peer mismatch', async () => {
  // The phantom-bump trap end-to-end (findings #1-#3). The diff drops
  // foo@1.0.0 and adds foo@2.0.0, but the base lockfile does NOT contain
  // foo@1.0.0 — so this is NOT a confirmed bump. It must surface as a
  // removal + netNew + warning, and must NOT drive a peer mismatch even
  // though a base consumer pins foo to ^1.
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['foo', '1.0.0', '2.0.0']]),
      lockfile: {
        lockfileVersion: '9.0',
        packages: {
          // foo@1.0.0 is intentionally absent — only a consumer pinning ^1.
          'bar@5.0.0': { resolution: { integrity: 'sha512-z' }, peerDependencies: { foo: '^1' } },
        },
      },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.deepEqual(out.bumps, [], 'must not fabricate a bump');
    assert.deepEqual(out.peerMismatches, [], 'must not fabricate a peer mismatch off a phantom');
    assert.deepEqual(out.removals, [{ name: 'foo', version: '1.0.0' }]);
    assert.deepEqual(out.netNew, [{ name: 'foo', version: '2.0.0' }]);
    assert.equal(out.warnings.length, 1);
    assert.match(out.warnings[0], /unconfirmed change for foo/);
  });
});

test('run: throws on missing --diff', async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(
      run({ diff: join(dir, 'nope'), lockfile: join(dir, 'lock'), out: join(dir, 'out') }),
      /Failed to read --diff/,
    );
  });
});

test('run: throws on missing --lockfile', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    await writeFile(diffPath, '', 'utf8');
    await assert.rejects(
      run({ diff: diffPath, lockfile: join(dir, 'nope'), out: join(dir, 'out') }),
      /Failed to read --lockfile/,
    );
  });
});

test('run: throws on malformed lockfile YAML', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const lockPath = join(dir, 'pnpm-lock.yaml');
    await writeFile(diffPath, '', 'utf8');
    // A scalar (not a mapping) at the top level is rejected.
    await writeFile(lockPath, 'just a string', 'utf8');
    await assert.rejects(
      run({ diff: diffPath, lockfile: lockPath, out: join(dir, 'out') }),
      /Failed to parse --lockfile/,
    );
  });
});
