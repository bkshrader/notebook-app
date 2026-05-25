#!/usr/bin/env node
// fetch-changelogs.mjs — read a PR diff, extract Dependabot version bumps,
// resolve each bumped package's GitHub repository via the npm registry, and
// fetch the release notes from GitHub Releases. Output is structured JSON
// for downstream consumption by the dependency-review workflow.
//
// SECURITY MODEL
//
// This script runs in CI on Dependabot-authored PRs. The diff and the
// version strings it contains are upstream-controlled — an attacker who
// publishes a malicious package version can craft a `repository` field
// designed to manipulate downstream consumers. The defenses here are:
//
//   1. Strict URL validation. Only `https://github.com/<owner>/<repo>(.git)?`
//      and the `git+https://` variant are accepted, with `owner` and `repo`
//      restricted to `[A-Za-z0-9._-]+`. Path traversal, query strings,
//      fragments, alternate hosts, userinfo, ports, and arbitrary git
//      schemes are all rejected.
//
//   2. Size caps. Each changelog is truncated at --max-bytes-per-changelog;
//      the cumulative output is capped at --max-bytes-total. The number of
//      packages processed is capped at --max-pkgs. The workflow that
//      invokes this script also caps the input diff size before calling.
//
//   3. No package code execution. We deliberately do NOT run `npm view`,
//      `npm ci`, or any tool that would execute lifecycle scripts. The
//      `repository` field is read from the npm registry's HTTPS JSON API
//      (https://registry.npmjs.org/<pkg>/<version>) — a pure data fetch.
//
//      Note: the handoff doc that scoped this script assumed
//      `package-lock.json` carries a `repository` field per entry. Lockfile
//      v3 (which this project uses) does NOT carry that field — it stores
//      only `version`, `resolved`, `integrity`, `license`, and dep graph
//      data. Hitting the registry over HTTPS is the least-privilege path
//      to the data we need: no code runs, no install happens, and the
//      returned JSON is treated as untrusted input by the validator.
//
//   4. GitHub Releases lookup uses `gh api`, which authenticates with the
//      caller's GH_TOKEN. The release-tag path is constructed from the
//      *validated* {owner, repo} tokens only; the version string is
//      URL-encoded before interpolation as a defense-in-depth measure
//      against odd version strings.
//
// CONTRACT
//
//   Inputs (flags):
//     --diff <path>                  Path to PR unified diff. Required.
//     --out <path>                   Output JSON path. Required.
//     --max-pkgs <n>                 Max packages to process. Default 20.
//     --max-bytes-per-changelog <n>  Per-changelog body cap. Default 50000.
//     --max-bytes-total <n>          Cumulative body cap. Default 1000000.
//
//   Output JSON shape:
//     {
//       "packages": [
//         {
//           "name": "react",
//           "oldVersion": "19.2.5",
//           "newVersion": "19.2.6",
//           "repository": { "owner": "facebook", "repo": "react" },
//           "changelog": {
//             "tag": "v19.2.6",
//             "title": "...",
//             "body": "...",
//             "date": "2026-05-01T00:00:00Z",
//             "truncated": false
//           } | null,
//           "skippedReason": "<string>" | undefined
//         }
//       ],
//       "totalsCapped": false,
//       "warnings": ["..."]
//     }
//
//   Exit codes:
//     0  Success (output written; individual package failures are recorded
//        per-package in the JSON, not surfaced as exit code).
//     1  Fatal: missing required flag, unreadable input, output write
//        failure, or unexpected internal error.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const DEFAULTS = Object.freeze({
  maxPkgs: 20,
  maxBytesPerChangelog: 50_000,
  maxBytesTotal: 1_000_000,
});

export function parseArgs(argv) {
  const out = { ...DEFAULTS };
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
      case '--out':
        out.out = next();
        break;
      case '--max-pkgs':
        out.maxPkgs = parseIntStrict(next(), a);
        break;
      case '--max-bytes-per-changelog':
        out.maxBytesPerChangelog = parseIntStrict(next(), a);
        break;
      case '--max-bytes-total':
        out.maxBytesTotal = parseIntStrict(next(), a);
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!out.diff) throw new Error('--diff is required');
  if (!out.out) throw new Error('--out is required');
  return out;
}

function parseIntStrict(s, flag) {
  if (!/^\d+$/.test(s)) throw new Error(`${flag} must be a non-negative integer, got: ${s}`);
  return Number.parseInt(s, 10);
}

// ---------------------------------------------------------------------------
// Diff parsing
// ---------------------------------------------------------------------------

// Extract (name, oldVersion, newVersion) triples from a PR diff.
//
// We only consider package-lock.json hunks; package.json bumps are followed
// by lockfile bumps for the same package, so the lockfile is the canonical
// source. Each bumped package shows up in the lockfile as a paired
// `-"version": "X"` / `+"version": "Y"` change inside a stanza whose object
// key is `"node_modules/<name>":` (possibly nested for transitive deps).
//
// The strategy is line-by-line:
//   - Track the most recent `"node_modules/<name>":` key seen in the hunk
//     (whether on a context, +, or - line).
//   - When we see a paired `-"version": "X"` followed by `+"version": "Y"`
//     in close proximity, emit a triple for the currently-tracked package.
//
// "Close proximity" means: the + must come within a small window after the
// matching -. We use 5 lines, which is enough for the typical lockfile
// stanza shape but tight enough not to cross stanzas.
export function extractBumps(diff) {
  const lines = diff.split('\n');
  const bumps = [];
  const seen = new Set(); // de-dup by `name@old->new`
  let currentPkg = null;
  let inLockfile = false;
  const pendingOld = new Map(); // name -> { oldVersion, lineIndex }

  const PKG_KEY = /^[ +-]\s*"node_modules\/((?:@[^"/]+\/)?[^"/]+)"\s*:\s*\{/;
  const VERSION_LINE = /^([+-])\s*"version"\s*:\s*"([^"]+)"\s*,?\s*$/;
  const FILE_HEADER = /^\+\+\+ b\/(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fileMatch = line.match(FILE_HEADER);
    if (fileMatch) {
      inLockfile = fileMatch[1] === 'package-lock.json';
      currentPkg = null;
      pendingOld.clear();
      continue;
    }
    if (!inLockfile) continue;

    const pkgMatch = line.match(PKG_KEY);
    if (pkgMatch) {
      currentPkg = pkgMatch[1];
      continue;
    }

    const versionMatch = line.match(VERSION_LINE);
    if (!versionMatch || !currentPkg) continue;

    const [, sign, version] = versionMatch;
    if (sign === '-') {
      pendingOld.set(currentPkg, { oldVersion: version, lineIndex: i });
    } else {
      const pending = pendingOld.get(currentPkg);
      if (pending && i - pending.lineIndex <= 5) {
        const key = `${currentPkg}@${pending.oldVersion}->${version}`;
        if (!seen.has(key)) {
          seen.add(key);
          bumps.push({ name: currentPkg, oldVersion: pending.oldVersion, newVersion: version });
        }
        pendingOld.delete(currentPkg);
      }
    }
  }

  return bumps;
}

// ---------------------------------------------------------------------------
// Repository URL validation
// ---------------------------------------------------------------------------

// Strict allow-list:
//   - https://github.com/<owner>/<repo>
//   - https://github.com/<owner>/<repo>.git
//   - git+https://github.com/<owner>/<repo>.git
//
// Reject:
//   - non-github.com hosts
//   - git+ssh, ssh, git://, http:// (insecure or non-validatable)
//   - paths with anything beyond /<owner>/<repo>(.git)? (no subpaths, no
//     traversal, no encoded slashes)
//   - query strings, fragments
//   - userinfo, non-default ports
//   - owner/repo segments outside [A-Za-z0-9._-]+
//   - owner/repo segments that are "." or ".."
//
// Returns { owner, repo } on success, or null on rejection.
export function validateRepositoryUrl(input) {
  if (typeof input !== 'string') return null;

  // Strip the `git+` prefix if present; everything else must be exactly
  // an https://github.com URL.
  let url = input;
  if (url.startsWith('git+')) url = url.slice(4);

  // Pre-parse sanity: reject any path-traversal or encoded-slash sigils in
  // the raw string. The URL parser would otherwise silently normalize
  // `https://github.com/foo/bar/../../../etc/passwd` to a clean
  // `/etc/passwd`, which would then pass the strict 2-segment regex below
  // as if the package's repository were `etc/passwd`. Reject the input
  // *before* normalization erases the evidence.
  if (url.includes('..') || url.includes('//github.com//') || /%2f/i.test(url) || /\\/.test(url)) {
    // Note: the `//` check above is path-specific (two slashes inside the
    // path portion); the protocol's `//` is always preceded by `:` so this
    // substring search won't false-positive on `https://github.com/...`.
    // Only an actual `//github.com//foo` (empty owner segment) matches.
    // We also reject backslashes — Windows-style separators have no place
    // in an https URL and are an injection footgun.
    return null;
  }

  // Parse with URL — rejects malformed inputs and normalizes percent-encoding.
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (parsed.host !== 'github.com') return null;
  if (parsed.username !== '' || parsed.password !== '') return null;
  if (parsed.port !== '') return null;
  if (parsed.search !== '') return null;
  if (parsed.hash !== '') return null;

  // Pathname must be exactly /<owner>/<repo> or /<owner>/<repo>.git.
  const path = parsed.pathname;
  const TOKEN = /^[A-Za-z0-9._-]+$/;
  const match = path.match(/^\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2];

  // Reject "." and ".." explicitly — both pass [.-A-Za-z0-9] but are
  // filesystem-traversal sigils we never want to interpolate. (The
  // pre-parse `..` check catches them in the input string, but a single
  // `.` segment also slips past the token regex and needs explicit
  // rejection here.)
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;
  if (!TOKEN.test(owner) || !TOKEN.test(repo)) return null;

  return { owner, repo };
}

// ---------------------------------------------------------------------------
// Registry + Releases fetching
// ---------------------------------------------------------------------------

// Fetch the package metadata blob for a specific version from the npm
// registry. Returns { repository: <raw string or null>, warnings: [...] }.
// Network errors are returned as warnings, not thrown, so the caller can
// move on to the next package.
export async function fetchRegistryMetadata(name, version, { fetchImpl = fetch } = {}) {
  // The package name may include a scope (`@scope/name`). The registry
  // accepts the unescaped form for scoped packages — `@axe-core/playwright`
  // is requested as `/@axe-core%2Fplaywright/version` per the registry's
  // documented behavior. encodeURIComponent on the full name handles this.
  // For non-scoped packages, encodeURIComponent is a no-op for the
  // allowed npm name charset.
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  let res;
  try {
    res = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      // 10s is generous; the registry is fast. Anything slower than this
      // is signal to skip the package and move on.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return {
      repository: null,
      warnings: [`registry fetch failed for ${name}@${version}: ${err.message}`],
    };
  }
  if (!res.ok) {
    return {
      repository: null,
      warnings: [`registry returned ${res.status} for ${name}@${version}`],
    };
  }
  let body;
  try {
    body = await res.json();
  } catch (err) {
    return {
      repository: null,
      warnings: [`registry returned non-JSON for ${name}@${version}: ${err.message}`],
    };
  }
  // The `repository` field is either a string or `{type, url, directory?}`.
  // Both are upstream-controlled — we extract the url and hand it to the
  // strict validator without further interpretation.
  const repo = body && body.repository;
  let urlField = null;
  if (typeof repo === 'string') urlField = repo;
  else if (repo && typeof repo === 'object' && typeof repo.url === 'string') urlField = repo.url;
  return { repository: urlField, warnings: [] };
}

// Look up a GitHub release by tag, trying `v<version>` then `<version>`.
// Uses `gh api` so it picks up the workflow's GH_TOKEN.
//
// Returns { tag, title, body, date } on success, or null if neither tag
// resolves. Errors are returned via the warnings array.
export async function fetchRelease(owner, repo, version, { execImpl = execFile } = {}) {
  // owner/repo are already strictly validated; version is URL-encoded as a
  // belt-and-suspenders defense. (The validator does not cover version
  // strings — npm semver allows e.g. `1.0.0+build.metadata` and we don't
  // want a `+` to be interpreted as a space.)
  const encVer = encodeURIComponent(version);
  const candidates = [`v${encVer}`, encVer];
  const warnings = [];
  for (const tag of candidates) {
    try {
      const { stdout } = await execImpl(
        'gh',
        ['api', `/repos/${owner}/${repo}/releases/tags/${tag}`],
        { maxBuffer: 4 * 1024 * 1024, timeout: 10_000 },
      );
      const data = JSON.parse(stdout);
      return {
        tag: data.tag_name ?? tag,
        title: typeof data.name === 'string' ? data.name : '',
        body: typeof data.body === 'string' ? data.body : '',
        date: typeof data.published_at === 'string' ? data.published_at : '',
        warnings,
      };
    } catch (err) {
      // 404 is expected when the tag-prefix convention does not match;
      // record at debug level only on the second miss.
      if (tag === candidates[candidates.length - 1]) {
        warnings.push(
          `gh api releases/tags lookup failed for ${owner}/${repo}@${version}: ${err.message.split('\n')[0]}`,
        );
      }
    }
  }
  return { tag: null, title: null, body: null, date: null, warnings };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function run(opts) {
  const result = { packages: [], totalsCapped: false, warnings: [] };

  let diff;
  try {
    diff = await readFile(opts.diff, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read --diff ${opts.diff}: ${err.message}`);
  }

  const bumps = extractBumps(diff).slice(0, opts.maxPkgs);

  let totalBytes = 0;

  for (const bump of bumps) {
    const entry = {
      name: bump.name,
      oldVersion: bump.oldVersion,
      newVersion: bump.newVersion,
      repository: null,
      changelog: null,
    };

    const meta = await fetchRegistryMetadata(bump.name, bump.newVersion);
    result.warnings.push(...meta.warnings);
    if (!meta.repository) {
      entry.skippedReason = 'no repository field in registry metadata';
      result.packages.push(entry);
      continue;
    }

    const validated = validateRepositoryUrl(meta.repository);
    if (!validated) {
      entry.skippedReason = `repository URL failed validation: ${meta.repository}`;
      result.packages.push(entry);
      continue;
    }
    entry.repository = validated;

    const release = await fetchRelease(validated.owner, validated.repo, bump.newVersion);
    result.warnings.push(...release.warnings);
    if (!release.tag) {
      entry.skippedReason = 'no matching GitHub release tag';
      result.packages.push(entry);
      continue;
    }

    let body = release.body ?? '';
    let truncated = false;
    if (body.length > opts.maxBytesPerChangelog) {
      body = body.slice(0, opts.maxBytesPerChangelog) + '\n\n[truncated]';
      truncated = true;
    }

    // Cumulative-cap check. If adding this changelog would push us over,
    // record a marker entry, set the flag, and stop processing further
    // packages.
    if (totalBytes + body.length > opts.maxBytesTotal) {
      entry.skippedReason = 'cumulative changelog size cap reached';
      result.packages.push(entry);
      result.totalsCapped = true;
      break;
    }
    totalBytes += body.length;

    entry.changelog = {
      tag: release.tag,
      title: release.title,
      body,
      date: release.date,
      truncated,
    };
    result.packages.push(entry);
  }

  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, JSON.stringify(result, null, 2) + '\n', 'utf8');
  return result;
}

// CLI entrypoint guard: only run main() when invoked directly, so the
// module can be imported by the test file without side effects.
const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('fetch-changelogs.mjs');
if (invokedDirectly) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    await run(opts);
  } catch (err) {
    process.stderr.write(`fetch-changelogs: ${err.message}\n`);
    process.exit(1);
  }
}
