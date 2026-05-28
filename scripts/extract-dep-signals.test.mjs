// extract-dep-signals.test.mjs — unit tests for the dependency-review
// signal extractor. Coverage focuses on:
//
//   1. name@version key parsing (scoped + unscoped).
//   2. Dep-change extraction from pnpm-lock.yaml PR diffs (bumps,
//      removals, net-new, multi-version shuffles).
//   3. Lockfile indexing — peer-dep surfacing, multiple versions of one
//      package kept separate.
//   4. Peer-range satisfaction — the highest-signal output. The killer
//      test case is the real-world PR 45 shape: bump eslint past the
//      range its plugin's peerDependencies declare.
//   5. Major-bump detection, including the 0.x convention.
//   6. End-to-end run() with synthesized inputs.
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

// ---------------------------------------------------------------------------
// extractDepChanges + classifyChanges + extractBumps
// ---------------------------------------------------------------------------

// Helper: synthesize a minimal pnpm-lock.yaml diff. Each entry is
// `[name, oldVer, newVer]` where any of oldVer/newVer may be null to
// signal removal / net-new. Scoped names are single-quoted in the YAML
// key, matching how pnpm writes them.
function keyLine(sign, name, version) {
  const key = `${name}@${version}`;
  const quoted = name.startsWith('@') ? `'${key}'` : key;
  return `${sign}  ${quoted}:`;
}

function diffOf(entries) {
  const lines = entries.flatMap(([name, oldV, newV]) => {
    const out = [];
    if (oldV) {
      out.push(keyLine('-', name, oldV), `-    resolution: {integrity: sha512-OLD}`);
    }
    if (newV) {
      out.push(keyLine('+', name, newV), `+    resolution: {integrity: sha512-NEW}`);
    }
    return out;
  });
  return [
    'diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml',
    '--- a/pnpm-lock.yaml',
    '+++ b/pnpm-lock.yaml',
    '@@ -118,10 +118,10 @@ packages:',
    ...lines,
  ].join('\n');
}

test('extractDepChanges + classifyChanges: bump / removal / netNew', () => {
  const diff = diffOf([
    ['react', '19.2.5', '19.2.6'], // bump
    ['old-pkg', '1.0.0', null], // removal
    ['new-pkg', null, '2.0.0'], // netNew
  ]);
  const { bumps, removals, netNew } = classifyChanges(extractDepChanges(diff));
  assert.deepEqual(bumps, [{ name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' }]);
  assert.deepEqual(removals, [{ name: 'old-pkg', version: '1.0.0' }]);
  assert.deepEqual(netNew, [{ name: 'new-pkg', version: '2.0.0' }]);
});

test('extractDepChanges: handles scoped packages', () => {
  const diff = diffOf([['@axe-core/playwright', '4.11.2', '4.11.3']]);
  const { bumps } = classifyChanges(extractDepChanges(diff));
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

test('extractDepChanges: same name at one removed + one added IS a bump', () => {
  // The clean 1:1 case — even though pnpm keys are distinct, a single
  // removed version paired with a single added version is the canonical
  // bump shape.
  const diff = diffOf([
    ['eslint', '9.39.4', null],
    ['eslint', null, '10.4.0'],
  ]);
  const { bumps } = classifyChanges(extractDepChanges(diff));
  assert.deepEqual(bumps, [{ name: 'eslint', oldVersion: '9.39.4', newVersion: '10.4.0' }]);
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

test('extractBumps: back-compat shape', () => {
  const diff = diffOf([
    ['react', '19.2.5', '19.2.6'],
    ['gone', '1.0.0', null], // should not appear in bumps
  ]);
  assert.deepEqual(extractBumps(diff), [
    { name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' },
  ]);
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
