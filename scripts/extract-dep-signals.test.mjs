// fetch-changelogs.test.mjs — unit tests for the dependency-review
// changelog fetcher. Focuses on security-critical surfaces:
//
//   1. URL validation (the upstream-controlled `repository` field is the
//      primary attack surface — see fetch-changelogs.mjs SECURITY MODEL).
//   2. Diff parsing (must extract version bumps deterministically without
//      cross-stanza confusion).
//   3. Argument parsing (boundary checks for size caps).
//   4. Cap enforcement (size limits must fail closed).
//
// Run with: node --test scripts/fetch-changelogs.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  parseArgs,
  extractBumps,
  validateRepositoryUrl,
  fetchRegistryMetadata,
  fetchRelease,
  run,
} from './fetch-changelogs.mjs';

// ---------------------------------------------------------------------------
// validateRepositoryUrl — security-critical
// ---------------------------------------------------------------------------

test('validateRepositoryUrl: accepts canonical https github URL', () => {
  assert.deepEqual(validateRepositoryUrl('https://github.com/foo/bar'), {
    owner: 'foo',
    repo: 'bar',
  });
});

test('validateRepositoryUrl: accepts .git suffix', () => {
  assert.deepEqual(validateRepositoryUrl('https://github.com/foo/bar.git'), {
    owner: 'foo',
    repo: 'bar',
  });
});

test('validateRepositoryUrl: accepts git+https prefix with .git suffix', () => {
  assert.deepEqual(validateRepositoryUrl('git+https://github.com/foo/bar.git'), {
    owner: 'foo',
    repo: 'bar',
  });
});

test('validateRepositoryUrl: accepts dotted and dashed and underscored names', () => {
  assert.deepEqual(validateRepositoryUrl('https://github.com/foo.bar/baz-qux_quux'), {
    owner: 'foo.bar',
    repo: 'baz-qux_quux',
  });
});

test('validateRepositoryUrl: rejects path traversal (pre-parse `..` check fires)', () => {
  // Defense rationale: without the pre-parse check, the URL parser would
  // normalize `/foo/bar/../../../etc/passwd` to `/etc/passwd`, which would
  // then pass the strict 2-segment regex as if the repository were
  // `etc/passwd`. See validateRepositoryUrl header in fetch-changelogs.mjs.
  assert.equal(validateRepositoryUrl('https://github.com/foo/bar/../../../etc/passwd'), null);
});

test('validateRepositoryUrl: rejects query string', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo/bar?evil=1'), null);
});

test('validateRepositoryUrl: rejects fragment', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo/bar#main'), null);
});

test('validateRepositoryUrl: rejects non-github host', () => {
  assert.equal(validateRepositoryUrl('https://evil.com/foo/bar'), null);
});

test('validateRepositoryUrl: rejects github subdomain', () => {
  assert.equal(validateRepositoryUrl('https://api.github.com/foo/bar'), null);
});

test('validateRepositoryUrl: rejects http (non-tls)', () => {
  assert.equal(validateRepositoryUrl('http://github.com/foo/bar'), null);
});

test('validateRepositoryUrl: rejects git+ssh scheme', () => {
  assert.equal(validateRepositoryUrl('git+ssh://git@github.com/foo/bar.git'), null);
});

test('validateRepositoryUrl: rejects ssh scheme', () => {
  assert.equal(validateRepositoryUrl('ssh://git@github.com/foo/bar.git'), null);
});

test('validateRepositoryUrl: rejects git:// scheme', () => {
  assert.equal(validateRepositoryUrl('git://github.com/foo/bar.git'), null);
});

test('validateRepositoryUrl: rejects userinfo', () => {
  assert.equal(validateRepositoryUrl('https://user:pass@github.com/foo/bar'), null);
});

test('validateRepositoryUrl: rejects non-default port', () => {
  assert.equal(validateRepositoryUrl('https://github.com:8443/foo/bar'), null);
});

test('validateRepositoryUrl: rejects subpath beyond owner/repo', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo/bar/tree/main'), null);
});

test('validateRepositoryUrl: rejects empty owner segment', () => {
  assert.equal(validateRepositoryUrl('https://github.com//bar'), null);
});

test('validateRepositoryUrl: rejects empty repo segment', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo/'), null);
});

test('validateRepositoryUrl: rejects single-segment path', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo'), null);
});

test('validateRepositoryUrl: rejects owner segment with disallowed chars', () => {
  assert.equal(validateRepositoryUrl('https://github.com/foo$bar/baz'), null);
});

test('validateRepositoryUrl: rejects repo segment containing slash via encoding', () => {
  // %2F is the URL-encoded slash; URL normalizes it in pathname and the
  // strict 2-segment match fails.
  assert.equal(validateRepositoryUrl('https://github.com/foo/bar%2Fbaz'), null);
});

test('validateRepositoryUrl: rejects "." as owner or repo', () => {
  assert.equal(validateRepositoryUrl('https://github.com/./bar'), null);
  assert.equal(validateRepositoryUrl('https://github.com/foo/.'), null);
});

test('validateRepositoryUrl: rejects ".." as owner or repo', () => {
  // These inputs trip the pre-parse `..` substring check before the URL
  // parser ever sees them; the post-parse segment guard would also catch
  // them if the pre-parse check were ever weakened.
  assert.equal(validateRepositoryUrl('https://github.com/../bar'), null);
  assert.equal(validateRepositoryUrl('https://github.com/foo/..'), null);
});

test('validateRepositoryUrl: rejects non-string input', () => {
  assert.equal(validateRepositoryUrl(null), null);
  assert.equal(validateRepositoryUrl(undefined), null);
  assert.equal(validateRepositoryUrl(42), null);
  assert.equal(validateRepositoryUrl({ url: 'https://github.com/foo/bar' }), null);
});

test('validateRepositoryUrl: rejects malformed URL strings', () => {
  assert.equal(validateRepositoryUrl(''), null);
  assert.equal(validateRepositoryUrl('not a url'), null);
  assert.equal(validateRepositoryUrl('https://'), null);
});

// ---------------------------------------------------------------------------
// extractBumps
// ---------------------------------------------------------------------------

const SAMPLE_DIFF_SIMPLE = `\
diff --git a/package-lock.json b/package-lock.json
index 1111111..2222222 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -100,7 +100,7 @@
     "node_modules/react": {
-      "version": "19.2.5",
+      "version": "19.2.6",
       "resolved": "https://registry.npmjs.org/react/-/react-19.2.6.tgz",
       "integrity": "sha512-..."
     },
`;

test('extractBumps: single package bump', () => {
  const bumps = extractBumps(SAMPLE_DIFF_SIMPLE);
  assert.deepEqual(bumps, [{ name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' }]);
});

test('extractBumps: scoped package', () => {
  const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
     "node_modules/@axe-core/playwright": {
-      "version": "4.11.2",
+      "version": "4.11.3",
       "resolved": "https://registry.npmjs.org/.../playwright-4.11.3.tgz"
     },
`;
  assert.deepEqual(extractBumps(diff), [
    { name: '@axe-core/playwright', oldVersion: '4.11.2', newVersion: '4.11.3' },
  ]);
});

test('extractBumps: ignores non-lockfile files', () => {
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
  // The package-key regex is keyed to package-lock.json hunks only via the
  // FILE_HEADER tracker. package.json bumps are ignored.
  assert.deepEqual(extractBumps(diff), []);
});

test('extractBumps: multiple packages in one diff', () => {
  const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -100,7 +100,7 @@
     "node_modules/react": {
-      "version": "19.2.5",
+      "version": "19.2.6",
       "resolved": "..."
     },
@@ -200,7 +200,7 @@
     "node_modules/eslint": {
-      "version": "9.39.3",
+      "version": "9.39.4",
       "resolved": "..."
     },
`;
  assert.deepEqual(extractBumps(diff), [
    { name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' },
    { name: 'eslint', oldVersion: '9.39.3', newVersion: '9.39.4' },
  ]);
});

test('extractBumps: de-duplicates identical bumps', () => {
  // Same package can appear in multiple stanzas (workspace pinning, nested
  // deps); we only want one entry per (name, old, new).
  const diff = `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,5 +1,5 @@
     "node_modules/react": {
-      "version": "19.2.5",
+      "version": "19.2.6",
       "resolved": "..."
     },
@@ -100,5 +100,5 @@
     "node_modules/react": {
-      "version": "19.2.5",
+      "version": "19.2.6",
       "resolved": "..."
     },
`;
  assert.deepEqual(extractBumps(diff), [
    { name: 'react', oldVersion: '19.2.5', newVersion: '19.2.6' },
  ]);
});

test('extractBumps: returns empty for empty diff', () => {
  assert.deepEqual(extractBumps(''), []);
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

test('parseArgs: required flags', () => {
  assert.throws(() => parseArgs([]), /--diff is required/);
  assert.throws(() => parseArgs(['--diff', 'd.txt']), /--out is required/);
});

test('parseArgs: defaults applied', () => {
  const o = parseArgs(['--diff', 'd', '--out', 'o']);
  assert.equal(o.maxPkgs, 20);
  assert.equal(o.maxBytesPerChangelog, 50_000);
  assert.equal(o.maxBytesTotal, 1_000_000);
});

test('parseArgs: integer flags reject non-integers', () => {
  assert.throws(
    () => parseArgs(['--diff', 'd', '--out', 'o', '--max-pkgs', 'abc']),
    /non-negative integer/,
  );
  assert.throws(
    () => parseArgs(['--diff', 'd', '--out', 'o', '--max-pkgs', '-5']),
    /non-negative integer/,
  );
  assert.throws(
    () => parseArgs(['--diff', 'd', '--out', 'o', '--max-pkgs', '1.5']),
    /non-negative integer/,
  );
});

test('parseArgs: unknown flag rejected', () => {
  assert.throws(() => parseArgs(['--diff', 'd', '--out', 'o', '--evil']), /Unknown argument/);
});

test('parseArgs: missing value rejected', () => {
  assert.throws(() => parseArgs(['--diff']), /Missing value for --diff/);
});

// ---------------------------------------------------------------------------
// fetchRegistryMetadata (injected fetch)
// ---------------------------------------------------------------------------

test('fetchRegistryMetadata: extracts string repository', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ repository: 'https://github.com/foo/bar' }),
  });
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, 'https://github.com/foo/bar');
  assert.deepEqual(r.warnings, []);
});

test('fetchRegistryMetadata: extracts object repository.url', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ repository: { type: 'git', url: 'git+https://github.com/foo/bar.git' } }),
  });
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, 'git+https://github.com/foo/bar.git');
});

test('fetchRegistryMetadata: returns null repository on missing field', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, null);
});

test('fetchRegistryMetadata: surfaces non-2xx as warning, not throw', async () => {
  const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, null);
  assert.match(r.warnings[0], /404/);
});

test('fetchRegistryMetadata: surfaces network error as warning, not throw', async () => {
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, null);
  assert.match(r.warnings[0], /ECONNREFUSED/);
});

test('fetchRegistryMetadata: rejects non-JSON response gracefully', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new Error('Unexpected token <');
    },
  });
  const r = await fetchRegistryMetadata('foo', '1.0.0', { fetchImpl });
  assert.equal(r.repository, null);
  assert.match(r.warnings[0], /non-JSON/);
});

// ---------------------------------------------------------------------------
// fetchRelease (injected execFile)
// ---------------------------------------------------------------------------

// Stub builder for `gh api` calls. Each invocation pops the next handler
// from `responses`; a handler is either a value to return as `stdout` or
// an Error to throw. Tracks invocation count via the returned `calls`
// closure so tests can assert exact-N gh calls without duplicating
// counter scaffolding.
function ghApiStub(responses) {
  let i = 0;
  const calls = [];
  const execImpl = async (cmd, args) => {
    calls.push({ cmd, args });
    const r = responses[i++];
    if (r === undefined) throw new Error(`ghApiStub: unexpected call #${i} (${args[1]})`);
    if (r instanceof Error) throw r;
    return { stdout: typeof r === 'string' ? r : JSON.stringify(r) };
  };
  return { execImpl, calls };
}

test('fetchRelease: v-prefix tag matches', async () => {
  // gh args layout: ['api', '/repos/{owner}/{repo}/releases/tags/{tag}']
  // — the path is args[1].
  const { execImpl, calls } = ghApiStub([
    {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      body: 'Notes.',
      published_at: '2026-01-01T00:00:00Z',
    },
  ]);
  const r = await fetchRelease('foo', 'bar', '1.0.0', { execImpl });
  assert.equal(r.tag, 'v1.0.0');
  assert.equal(r.title, 'Release 1.0.0');
  assert.equal(r.body, 'Notes.');
  assert.equal(r.date, '2026-01-01T00:00:00Z');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cmd, 'gh');
  assert.equal(calls[0].args[0], 'api');
  assert.equal(calls[0].args[1], '/repos/foo/bar/releases/tags/v1.0.0');
});

test('fetchRelease: falls back to bare-version tag on v-prefix 404', async () => {
  const { execImpl, calls } = ghApiStub([
    new Error('HTTP 404'),
    { tag_name: '1.0.0', name: '', body: 'X', published_at: '' },
  ]);
  const r = await fetchRelease('foo', 'bar', '1.0.0', { execImpl });
  assert.equal(calls.length, 2);
  assert.equal(r.tag, '1.0.0');
  // First-attempt failure should not surface as a warning since the
  // second attempt succeeded — only total-failure attempts get reported.
  assert.deepEqual(r.warnings, []);
});

test('fetchRelease: returns null tag and reports both attempts when nothing found', async () => {
  const { execImpl } = ghApiStub([new Error('HTTP 404'), new Error('HTTP 429')]);
  const r = await fetchRelease('foo', 'bar', '1.0.0', { execImpl });
  assert.equal(r.tag, null);
  assert.equal(r.warnings.length, 2);
  assert.match(r.warnings[0], /tags\/v1\.0\.0.*404/);
  assert.match(r.warnings[1], /tags\/1\.0\.0.*429/);
});

// ---------------------------------------------------------------------------
// run — end-to-end with all injectable callouts stubbed
// ---------------------------------------------------------------------------

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'fetch-changelogs-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Stub builder for npm registry fetches. Returns a fetchImpl that maps
// each call to a fake Response. Map keys are `<pkg>@<version>` so a
// single stub can serve multi-package diffs.
function registryStub(byPkgVersion) {
  return async (url) => {
    // url is `https://registry.npmjs.org/<pkg-encoded>/<version>`
    const m = url.match(/^https:\/\/registry\.npmjs\.org\/(.+)\/([^/]+)$/);
    if (!m) throw new Error(`registryStub: unrecognized url ${url}`);
    const pkg = decodeURIComponent(m[1]);
    const ver = decodeURIComponent(m[2]);
    const key = `${pkg}@${ver}`;
    const body = byPkgVersion[key];
    if (body === undefined) return { ok: false, status: 404, json: async () => ({}) };
    if (body instanceof Error) throw body;
    return { ok: true, status: 200, json: async () => body };
  };
}

function makeDiff(bumps) {
  // Synthesize a minimal package-lock.json diff containing the given
  // (name, old, new) triples. Each stanza is the smallest shape
  // extractBumps will recognize.
  const stanzas = bumps
    .map(
      ([name, oldV, newV]) => `\
@@ -1,5 +1,5 @@
     "node_modules/${name}": {
-      "version": "${oldV}",
+      "version": "${newV}",
       "resolved": "..."
     },`,
    )
    .join('\n');
  return `\
diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
${stanzas}
`;
}

test('run: end-to-end pipeline with mocked fetch and gh produces full entries', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    await writeFile(
      diffPath,
      makeDiff([
        ['react', '19.2.5', '19.2.6'],
        ['eslint', '9.39.3', '9.39.4'],
      ]),
      'utf8',
    );

    const fetchImpl = registryStub({
      'react@19.2.6': {
        repository: { type: 'git', url: 'git+https://github.com/facebook/react.git' },
      },
      'eslint@9.39.4': { repository: 'https://github.com/eslint/eslint' },
    });
    const { execImpl } = ghApiStub([
      {
        tag_name: 'v19.2.6',
        name: 'React 19.2.6',
        body: 'React notes',
        published_at: '2026-05-06T00:00:00Z',
      },
      {
        tag_name: 'v9.39.4',
        name: 'ESLint 9.39.4',
        body: 'ESLint notes',
        published_at: '2026-05-07T00:00:00Z',
      },
    ]);

    const out = await run(
      {
        diff: diffPath,
        out: outPath,
        maxPkgs: 20,
        maxBytesPerChangelog: 50_000,
        maxBytesTotal: 1_000_000,
      },
      { fetchImpl, execImpl },
    );

    assert.equal(out.packages.length, 2);
    assert.deepEqual(out.packages[0].repository, { owner: 'facebook', repo: 'react' });
    assert.equal(out.packages[0].changelog.tag, 'v19.2.6');
    assert.equal(out.packages[0].changelog.truncated, false);
    assert.deepEqual(out.packages[1].repository, { owner: 'eslint', repo: 'eslint' });
    assert.equal(out.totalsCapped, false);

    // Output file written and matches return value.
    const persisted = JSON.parse(await readFile(outPath, 'utf8'));
    assert.deepEqual(persisted, out);
  });
});

test('run: enforces --max-bytes-per-changelog by truncating body', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    await writeFile(diffPath, makeDiff([['react', '19.2.5', '19.2.6']]), 'utf8');

    const fetchImpl = registryStub({
      'react@19.2.6': { repository: 'https://github.com/facebook/react' },
    });
    const { execImpl } = ghApiStub([
      { tag_name: 'v19.2.6', name: 'R', body: 'x'.repeat(200), published_at: '' },
    ]);

    const out = await run(
      {
        diff: diffPath,
        out: outPath,
        maxPkgs: 20,
        maxBytesPerChangelog: 50,
        maxBytesTotal: 1_000_000,
      },
      { fetchImpl, execImpl },
    );

    assert.equal(out.packages[0].changelog.truncated, true);
    assert.ok(out.packages[0].changelog.body.startsWith('x'.repeat(50)));
    assert.ok(out.packages[0].changelog.body.endsWith('[truncated]'));
  });
});

test('run: enforces --max-bytes-total by setting totalsCapped and breaking', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    // Three bumps; per-changelog cap accommodates 60 bytes each, total cap
    // is 100 bytes — so package 1 fits (60), package 2 trips the cap (would
    // bring total to 120) and is recorded as skipped, package 3 is never
    // processed because we break on cap.
    await writeFile(
      diffPath,
      makeDiff([
        ['a', '1.0.0', '1.0.1'],
        ['b', '1.0.0', '1.0.1'],
        ['c', '1.0.0', '1.0.1'],
      ]),
      'utf8',
    );

    const fetchImpl = registryStub({
      'a@1.0.1': { repository: 'https://github.com/x/a' },
      'b@1.0.1': { repository: 'https://github.com/x/b' },
      'c@1.0.1': { repository: 'https://github.com/x/c' },
    });
    const { execImpl, calls } = ghApiStub([
      { tag_name: 'v1.0.1', name: '', body: 'y'.repeat(60), published_at: '' },
      { tag_name: 'v1.0.1', name: '', body: 'y'.repeat(60), published_at: '' },
      // No third response — if `run` doesn't break, we'd see "unexpected call #3".
    ]);

    const out = await run(
      {
        diff: diffPath,
        out: outPath,
        maxPkgs: 20,
        maxBytesPerChangelog: 100,
        maxBytesTotal: 100,
      },
      { fetchImpl, execImpl },
    );

    assert.equal(out.totalsCapped, true);
    assert.equal(out.packages.length, 2);
    assert.equal(out.packages[0].changelog.body.length, 60);
    assert.equal(out.packages[1].changelog, null);
    assert.match(out.packages[1].skippedReason, /size cap reached/);
    // Two gh calls — third package never reached.
    assert.equal(calls.length, 2);
  });
});

test('run: records skippedReason when registry has no repository field', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    await writeFile(diffPath, makeDiff([['mystery', '1.0.0', '2.0.0']]), 'utf8');

    const fetchImpl = registryStub({ 'mystery@2.0.0': {} }); // no repository
    const { execImpl } = ghApiStub([]); // gh must NOT be called

    const out = await run(
      {
        diff: diffPath,
        out: outPath,
        maxPkgs: 20,
        maxBytesPerChangelog: 50_000,
        maxBytesTotal: 1_000_000,
      },
      { fetchImpl, execImpl },
    );

    assert.equal(out.packages.length, 1);
    assert.equal(out.packages[0].repository, null);
    assert.equal(out.packages[0].changelog, null);
    assert.match(out.packages[0].skippedReason, /no repository field/);
  });
});

test('run: records skippedReason when registry returns invalid repository URL', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    await writeFile(diffPath, makeDiff([['evil', '1.0.0', '1.0.1']]), 'utf8');

    const fetchImpl = registryStub({
      'evil@1.0.1': { repository: 'git+ssh://evil.example/evil.git' },
    });
    const { execImpl } = ghApiStub([]);

    const out = await run(
      {
        diff: diffPath,
        out: outPath,
        maxPkgs: 20,
        maxBytesPerChangelog: 50_000,
        maxBytesTotal: 1_000_000,
      },
      { fetchImpl, execImpl },
    );

    assert.equal(out.packages[0].repository, null);
    assert.match(out.packages[0].skippedReason, /failed validation/);
  });
});

test('run: writes empty result for empty diff', async () => {
  await withTempDir(async (dir) => {
    const diffPath = join(dir, 'pr.diff');
    const outPath = join(dir, 'out.json');
    await writeFile(diffPath, '', 'utf8');
    await run({
      diff: diffPath,
      out: outPath,
      maxPkgs: 20,
      maxBytesPerChangelog: 50_000,
      maxBytesTotal: 1_000_000,
    });
    const parsed = JSON.parse(await readFile(outPath, 'utf8'));
    assert.deepEqual(parsed, { packages: [], totalsCapped: false, warnings: [] });
  });
});

test('run: throws on missing --diff file', async () => {
  await withTempDir(async (dir) => {
    await assert.rejects(
      run({
        diff: join(dir, 'does-not-exist'),
        out: join(dir, 'out.json'),
        maxPkgs: 20,
        maxBytesPerChangelog: 50_000,
        maxBytesTotal: 1_000_000,
      }),
      /Failed to read --diff/,
    );
  });
});
