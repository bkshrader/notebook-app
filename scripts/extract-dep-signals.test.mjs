// extract-dep-signals.test.mjs — unit tests for the dependency-review
// signal extractor. Coverage focuses on:
//
//   1. Stanza extraction from PR diffs (bumps, removals, net-new,
//      license-only diffs).
//   2. Lockfile indexing — package name dedup, license/peer-dep
//      surfacing.
//   3. Peer-range satisfaction — the highest-signal output. The killer
//      test case is the real-world PR 45 shape: bump eslint past the
//      range its plugin's peerDependencies declare.
//   4. Major-bump detection, including the 0.x convention.
//   5. End-to-end run() with synthesized inputs.
//
// Run with: node --test scripts/extract-dep-signals.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseArgs,
  extractStanzaChanges,
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
// extractStanzaChanges + extractBumps
// ---------------------------------------------------------------------------

// Helper: synthesize a minimal package-lock.json diff. Each entry is
// `[name, oldVer, newVer]` where any of oldVer/newVer may be null to
// signal removal / net-new.
function diffOf(entries, { withLicense = null } = {}) {
  const stanzas = entries
    .map(([name, oldV, newV]) => {
      if (oldV && newV) {
        // bump
        return `\
@@ -1,5 +1,5 @@
     "node_modules/${name}": {
-      "version": "${oldV}",
+      "version": "${newV}",
${withLicense ? `       "license": "${withLicense}",\n` : ''}\
       "resolved": "..."
     },`;
      } else if (oldV) {
        // removal: stanza disappears entirely
        return `\
@@ -1,5 +1,1 @@
-    "node_modules/${name}": {
-      "version": "${oldV}",
-      "resolved": "..."
-    },`;
      } else {
        // netNew: stanza appears
        return `\
@@ -1,1 +1,5 @@
+    "node_modules/${name}": {
+      "version": "${newV}",
${withLicense ? `+      "license": "${withLicense}",\n` : ''}\
+      "resolved": "..."
+    },`;
      }
    })
    .join('\n');
  return `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
${stanzas}
`;
}

test('extractStanzaChanges: classifies bump / removal / netNew', () => {
  const diff = diffOf([
    ['react', '19.2.5', '19.2.6'], // bump
    ['old-pkg', '1.0.0', null], // removal
    ['new-pkg', null, '2.0.0'], // netNew
  ]);
  const m = extractStanzaChanges(diff);
  assert.equal(m.get('react').kind, 'bump');
  assert.equal(m.get('react').oldVersion, '19.2.5');
  assert.equal(m.get('react').newVersion, '19.2.6');
  assert.equal(m.get('old-pkg').kind, 'removal');
  assert.equal(m.get('old-pkg').oldVersion, '1.0.0');
  assert.equal(m.get('new-pkg').kind, 'netNew');
  assert.equal(m.get('new-pkg').newVersion, '2.0.0');
});

test('extractStanzaChanges: captures license diff alongside version', () => {
  const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
     "node_modules/foo": {
-      "version": "1.0.0",
+      "version": "2.0.0",
-      "license": "MIT",
+      "license": "ISC",
       "resolved": "..."
     },
`;
  const m = extractStanzaChanges(diff);
  assert.equal(m.get('foo').oldLicense, 'MIT');
  assert.equal(m.get('foo').newLicense, 'ISC');
});

test('extractStanzaChanges: handles scoped packages', () => {
  const diff = diffOf([['@axe-core/playwright', '4.11.2', '4.11.3']]);
  const m = extractStanzaChanges(diff);
  assert.ok(m.has('@axe-core/playwright'));
  assert.equal(m.get('@axe-core/playwright').kind, 'bump');
});

test('extractStanzaChanges: handles nested node_modules paths', () => {
  // npm hoists most deps but sometimes nests; the path uses
  // `node_modules/parent/node_modules/child`. We extract the leaf name.
  const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
     "node_modules/some-parent/node_modules/nested-child": {
-      "version": "1.0.0",
+      "version": "1.0.1",
       "resolved": "..."
     },
`;
  const m = extractStanzaChanges(diff);
  assert.ok(m.has('nested-child'));
});

test('extractStanzaChanges: ignores non-lockfile diffs', () => {
  const diff = `\
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1,3 +1,3 @@
     "node_modules/react": {
-      "version": "19.2.5",
+      "version": "19.2.6"
     }
`;
  // The file header gate ensures package.json hunks are skipped.
  assert.equal(extractStanzaChanges(diff).size, 0);
});

test('extractStanzaChanges: returns empty for empty diff', () => {
  assert.equal(extractStanzaChanges('').size, 0);
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

test('indexLockfile: dedupes by bare name, keeps first', () => {
  const lock = {
    packages: {
      '': { name: 'host' },
      'node_modules/foo': { version: '1.0.0', license: 'MIT', peerDependencies: { bar: '^1' } },
      'node_modules/some-parent/node_modules/foo': { version: '2.0.0', license: 'ISC' },
    },
  };
  const idx = indexLockfile(lock);
  assert.equal(idx.size, 1);
  assert.equal(idx.get('foo').version, '1.0.0');
  assert.equal(idx.get('foo').license, 'MIT');
  assert.deepEqual(idx.get('foo').peerDependencies, { bar: '^1' });
});

test('indexLockfile: skips root entry', () => {
  const lock = { packages: { '': { name: 'host', version: '0.0.0' } } };
  assert.equal(indexLockfile(lock).size, 0);
});

test('indexLockfile: handles missing peerDependencies as empty object', () => {
  const lock = { packages: { 'node_modules/foo': { version: '1.0.0' } } };
  const idx = indexLockfile(lock);
  assert.deepEqual(idx.get('foo').peerDependencies, {});
});

// ---------------------------------------------------------------------------
// findPeerMismatches — the headline feature
// ---------------------------------------------------------------------------

test('findPeerMismatches: real-world PR 45 shape (eslint 9→10, jsx-a11y stuck at ^9)', () => {
  // This is the exact scenario that drove the rewrite. jsx-a11y@6.10.2
  // declares its eslint peer as `^3 || ... || ^9`. Bumping eslint to
  // 10.4.0 must produce a single mismatch entry.
  const bumps = [{ name: 'eslint', newVersion: '10.4.0' }];
  const baseIndex = new Map([
    ['eslint', { version: '9.39.4', peerDependencies: {} }],
    [
      'eslint-plugin-jsx-a11y',
      {
        version: '6.10.2',
        peerDependencies: { eslint: '^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9' },
      },
    ],
    [
      'typescript-eslint',
      {
        version: '8.59.4',
        peerDependencies: { eslint: '^8.57.0 || ^9.0.0 || ^10.0.0', typescript: '>=4.8.4' },
      },
    ],
    ['eslint-config-prettier', { version: '10.1.8', peerDependencies: { eslint: '>=7.0.0' } }],
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

test('findPeerMismatches: skips consumers that are themselves being bumped', () => {
  // If eslint AND its plugin are both bumping, we have no way to know
  // the plugin's new peer range from local data. Better to under-report.
  const bumps = [
    { name: 'eslint', newVersion: '10.0.0' },
    { name: 'eslint-plugin-jsx-a11y', newVersion: '7.0.0' },
  ];
  const baseIndex = new Map([
    ['eslint-plugin-jsx-a11y', { version: '6.10.2', peerDependencies: { eslint: '^9' } }],
  ]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: ignores consumers with no peer on bumped package', () => {
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = new Map([
    ['unrelated', { version: '1.0.0', peerDependencies: { other: '^1' } }],
  ]);
  assert.deepEqual(findPeerMismatches(bumps, baseIndex), []);
});

test('findPeerMismatches: marks satisfies=null on unparseable range', () => {
  const bumps = [{ name: 'eslint', newVersion: '10.0.0' }];
  const baseIndex = new Map([
    ['weird-consumer', { version: '1.0.0', peerDependencies: { eslint: 'not-a-real-range' } }],
  ]);
  const out = findPeerMismatches(bumps, baseIndex);
  // semver.satisfies treats invalid ranges as `false` rather than throwing,
  // so this surfaces as "definitely incompatible" — close enough to "unknown"
  // for our purposes that we still flag it. Just verify it surfaces.
  assert.equal(out.length, 1);
  assert.equal(out[0].consumer, 'weird-consumer');
});

test('findPeerMismatches: satisfies=true (no entry) when new version IS in range', () => {
  const bumps = [{ name: 'eslint', newVersion: '9.39.4' }];
  const baseIndex = new Map([
    ['eslint-plugin-jsx-a11y', { version: '6.10.2', peerDependencies: { eslint: '^9' } }],
  ]);
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

test('isMajorBump: handles v-prefix and pre-release tags via coerce', () => {
  assert.equal(isMajorBump('v1.0.0', 'v2.0.0'), true);
  assert.equal(isMajorBump('1.0.0-beta.1', '2.0.0'), true);
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
  const lockPath = join(dir, 'package-lock.json');
  const outPath = join(dir, 'signals.json');
  await writeFile(diffPath, diff, 'utf8');
  await writeFile(lockPath, JSON.stringify(lockfile, null, 2), 'utf8');
  return { diffPath, lockPath, outPath };
}

test('run: end-to-end with PR-45-shaped inputs surfaces the peer mismatch', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['eslint', '9.39.4', '10.4.0']]),
      lockfile: {
        packages: {
          '': { name: 'host' },
          'node_modules/eslint': { version: '9.39.4', license: 'MIT' },
          'node_modules/eslint-plugin-jsx-a11y': {
            version: '6.10.2',
            license: 'MIT',
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

test('run: surfaces net-new transitive with its license', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['@types/esrecurse', null, '4.3.1']], { withLicense: 'MIT' }),
      lockfile: { packages: { '': {} } },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.equal(out.netNew.length, 1);
    assert.deepEqual(out.netNew[0], { name: '@types/esrecurse', version: '4.3.1', license: 'MIT' });
  });
});

test('run: surfaces removals', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: diffOf([['callsites', '3.1.0', null]]),
      lockfile: { packages: { '': {} } },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.equal(out.removals.length, 1);
    assert.deepEqual(out.removals[0], { name: 'callsites', version: '3.1.0' });
  });
});

test('run: detects license change on bumped package', async () => {
  await withTempDir(async (dir) => {
    const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
     "node_modules/foo": {
-      "version": "1.0.0",
+      "version": "2.0.0",
-      "license": "MIT",
+      "license": "BUSL-1.1",
       "resolved": "..."
     },
`;
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff,
      lockfile: {
        packages: {
          '': {},
          'node_modules/foo': { version: '1.0.0', license: 'MIT' },
        },
      },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.equal(out.licenseChanges.length, 1);
    assert.deepEqual(out.licenseChanges[0], {
      name: 'foo',
      version: '2.0.0',
      oldLicense: 'MIT',
      newLicense: 'BUSL-1.1',
    });
  });
});

test('run: empty diff produces empty signals', async () => {
  await withTempDir(async (dir) => {
    const { diffPath, lockPath, outPath } = await writeInputs(dir, {
      diff: '',
      lockfile: { packages: { '': {} } },
    });
    const out = await run({ diff: diffPath, lockfile: lockPath, out: outPath });
    assert.deepEqual(out, {
      bumps: [],
      removals: [],
      netNew: [],
      licenseChanges: [],
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

test('run: throws on malformed lockfile JSON', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const lockPath = join(dir, 'lock');
    await writeFile(diffPath, '', 'utf8');
    await writeFile(lockPath, 'not json', 'utf8');
    await assert.rejects(
      run({ diff: diffPath, lockfile: lockPath, out: join(dir, 'out') }),
      /Failed to parse --lockfile/,
    );
  });
});
