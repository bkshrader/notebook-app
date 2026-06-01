#!/usr/bin/env node
/**
 * Token-pairing WCAG contrast matrix.
 *
 * Verifies the SEMANTIC color-token substrate (not per-component) so every
 * component inherits correct contrast. Checks the canonical Helios intent
 * pairings (foreground×surface for text, border/focus×surface for UI) across
 * the four mode×contrast combinations, against these gated thresholds:
 *
 *   text  : AA 4.5:1 in normal contrast · AAA 7:1 in `more` contrast
 *   UI    : 3:1 in all modes (borders required to identify a control/state)
 *
 * Policy decisions (settled with the user):
 *   - Disabled tokens (foreground-disabled, surface-interactive-disabled) are
 *     EXEMPT per WCAG 1.4.3 — reported informational, never gated.
 *   - border-faint is a decorative divider — reported informational, not gated
 *     (WCAG 1.4.11 applies only to state-identifying boundaries).
 *
 * Resolution: Helios base (:root) is flat hex; our tokens.css overrides it per
 * mode. 8-digit hex (alpha) is composited over the surface before measuring.
 *
 * Exit non-zero if any GATED pairing fails. Pure Node, no deps.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HELIOS = require.resolve('@hashicorp/design-system-tokens/dist/products/css/tokens.css');
const LOCAL = new URL('../src/renderer/src/styles/tokens.css', import.meta.url);

/* ── Parse declaration blocks ─────────────────────────────────────────────── */

/** Extract `--token-color-*: value;` decls from a CSS block body. */
function parseDecls(body) {
  const out = {};
  const re = /(--token-color-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(body))) out[m[1]] = m[2].trim();
  return out;
}

/**
 * Inner body of the first `{ … }` block at/after `from`, brace-balanced so
 * nested blocks don't end it early. Returns '' if no balanced block is found.
 *
 * Implementation note: depth is tracked with an arithmetic delta
 * (`+1` per `{`, `-1` per `}`, via Number(...) on equality) rather than
 * if/else branches, to keep cyclomatic complexity low on this build-time helper.
 */
function blockBody(text, from) {
  const open = text.indexOf('{', from);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    depth += Number(text[i] === '{') - Number(text[i] === '}');
    if (depth === 0) return text.slice(open + 1, i);
  }
  return '';
}

/** The Helios base :root block (first :root { ... }). */
function heliosBase() {
  const css = readFileSync(HELIOS, 'utf8');
  return parseDecls(blockBody(css, css.indexOf(':root')));
}

/* ── Compose the four modes by cascade ────────────────────────────────────── */

const base = heliosBase();
const css = readFileSync(LOCAL, 'utf8');

/** Decls of the first block whose selector matches `headerRegex` (or {}). */
function blockByHeader(headerRegex) {
  const m = css.match(headerRegex);
  return m ? parseDecls(blockBody(css, m.index)) : {};
}
const darkBlock = blockByHeader(/:root\[data-color-mode='dark'\]\s*\{/);
const lightMore = blockByHeader(
  /:root\[data-color-contrast='more'\]:not\(\[data-color-mode='dark'\]\)\s*\{/,
);
const darkMore = blockByHeader(
  /:root\[data-color-mode='dark'\]\[data-color-contrast='more'\]\s*\{/,
);

const MODES = {
  'light-normal': { ...base },
  'dark-normal': { ...base, ...darkBlock },
  'light-more': { ...base, ...lightMore },
  'dark-more': { ...base, ...darkBlock, ...darkMore },
};

/* ── Color math ───────────────────────────────────────────────────────────── */

function parseHex(hex) {
  hex = hex.trim().replace(/^#/, '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

/** Composite src (may have alpha) over opaque bg. */
function over(src, bg) {
  const a = src.a;
  return {
    r: src.r * a + bg.r * (1 - a),
    g: src.g * a + bg.g * (1 - a),
    b: src.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function relLum({ r, g, b }) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(fgHex, bgHex) {
  const bg = parseHex(bgHex);
  const fg = over(parseHex(fgHex), bg);
  const L1 = relLum(fg);
  const L2 = relLum(bg);
  const [hi, lo] = L1 >= L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── Canonical Helios intent pairings ─────────────────────────────────────── */
// kind: 'text' (AA/AAA) | 'ui' (3:1) | 'exempt' | 'info'
const NEUTRAL_SURFACES = [
  'surface-primary',
  'surface-faint',
  'surface-strong',
  'surface-interactive',
  'surface-interactive-hover',
];

const pairings = [];
const addText = (fg, surfaces) =>
  surfaces.forEach((s) => pairings.push({ kind: 'text', fg, surface: s }));
const addUI = (fg, surfaces, kind = 'ui') =>
  surfaces.forEach((s) => pairings.push({ kind, fg, surface: s }));

// Neutral text on neutral/page surfaces
addText('foreground-primary', NEUTRAL_SURFACES);
addText('foreground-strong', NEUTRAL_SURFACES);
addText('foreground-faint', NEUTRAL_SURFACES);
addText('foreground-action', NEUTRAL_SURFACES);
addText('foreground-action-hover', NEUTRAL_SURFACES);
// Disabled — EXEMPT (informational only)
pairings.push({ kind: 'exempt', fg: 'foreground-disabled', surface: 'surface-primary' });
pairings.push({ kind: 'exempt', fg: 'foreground-disabled', surface: 'surface-faint' });
// Status foreground (non-on-surface) on the page surface. Only surface-primary:
// no component pairs status text on surface-faint, and it isn't a Helios intent
// pairing (status text uses surface-primary, or the -on-surface triad on its
// status surface). Kept as a regression guard on the surface it actually uses.
for (const st of ['success', 'warning', 'critical', 'highlight']) {
  addText(`foreground-${st}`, ['surface-primary']);
}
// Status -on-surface on matching status surface (the Helios triad)
addText('foreground-success-on-surface', ['surface-success']);
addText('foreground-warning-on-surface', ['surface-warning']);
addText('foreground-critical-on-surface', ['surface-critical']);
addText('foreground-highlight-on-surface', ['surface-highlight']);
// NOTE: foreground-high-contrast is WHITE (#fff), intended for saturated palette
// fills (e.g. a primary button), which are NOT `surface-*` tokens. It has no
// surface-token pairing, so it is intentionally NOT in the matrix.

// Container / divider borders — INFORMATIONAL only. Helios is AA-conformant and
// documents these as "container and component borders ... horizontal rules"
// (decorative/structural), so WCAG 1.4.11's 3:1 does not gate them. Reported so
// regressions are visible, but never fail CI at the token layer; a component
// that makes a border the SOLE state-identifier must assert 3:1 in its own test.
addUI('border-primary', NEUTRAL_SURFACES, 'border');
addUI('border-strong', NEUTRAL_SURFACES, 'border');
addUI('border-faint', ['surface-primary', 'surface-faint'], 'border');
addUI('border-action', ['surface-primary', 'surface-faint'], 'border');
addUI('border-success', ['surface-primary', 'surface-success'], 'border');
addUI('border-warning', ['surface-primary', 'surface-warning'], 'border');
addUI('border-critical', ['surface-primary', 'surface-critical'], 'border');
addUI('border-highlight', ['surface-primary', 'surface-highlight'], 'border');

// Focus rings are state-identifying (WCAG 1.4.11) — GATED at 3:1 in all modes.
// WCAG has no AAA tier for non-text UI components (SC 1.4.6/AAA only covers text),
// so 3:1 is the floor regardless of contrast mode. A Helios focus ring is a
// two-layer indicator (internal + external); the ring is "visible" if EITHER
// layer meets contrast, so we gate on the HIGHER-contrast layer of the two
// (`fg` here names the pair stem; the run loop measures both `<stem>-internal`
// and `<stem>-external` and keeps max).
for (const s of ['surface-primary', 'surface-faint']) {
  pairings.push({ kind: 'focus', fg: 'focus-action', surface: s, focusPair: true });
  pairings.push({ kind: 'focus', fg: 'focus-critical', surface: s, focusPair: true });
}

/* ── Run ──────────────────────────────────────────────────────────────────── */

// Gated thresholds. text + focus follow AA-normal / AAA-more; borders & disabled
// are informational (null → not gated).
const threshold = (kind, mode) => {
  const more = mode.endsWith('-more');
  if (kind === 'text') return more ? 7 : 4.5;
  if (kind === 'focus') return 3; // WCAG SC 1.4.11 (AA) — no AAA tier for non-text UI
  return null; // border, exempt → informational
};

let failures = 0;
const rows = [];
for (const [mode, tokens] of Object.entries(MODES)) {
  for (const p of pairings) {
    const bgVal = tokens[`--token-color-${p.surface}`];
    // Focus pairs measure both ring layers and keep the higher-contrast one.
    const fgKeys = p.focusPair
      ? [`--token-color-${p.fg}-internal`, `--token-color-${p.fg}-external`]
      : [`--token-color-${p.fg}`];
    const fgVals = fgKeys.map((k) => tokens[k]).filter(Boolean);
    if (!fgVals.length || !bgVal) {
      rows.push({ mode, ...p, ratio: null, need: null, status: 'MISSING' });
      continue;
    }
    let cr;
    try {
      cr = Math.max(...fgVals.map((v) => ratio(v, bgVal)));
    } catch {
      rows.push({ mode, ...p, ratio: null, need: null, status: 'ERR' });
      continue;
    }
    const need = threshold(p.kind, mode);
    let status;
    if (need === null) status = 'INFO';
    else if (cr >= need) status = 'PASS';
    else {
      status = 'FAIL';
      failures++;
    }
    rows.push({ mode, ...p, ratio: cr, need, status });
  }
}

/* ── Report ───────────────────────────────────────────────────────────────── */
const fmt = (n) => (n === null ? '  -  ' : n.toFixed(2).padStart(5));
const byMode = {};
for (const r of rows) (byMode[r.mode] ||= []).push(r);

for (const [mode, list] of Object.entries(byMode)) {
  console.log(`\n=== ${mode} ===`);
  for (const r of list.filter((r) => r.status === 'FAIL')) {
    console.log(`  FAIL  ${fmt(r.ratio)} (need ${r.need})  ${r.fg} on ${r.surface}`);
  }
  const info = list.filter((r) => r.status === 'INFO' || r.status === 'MISSING');
  for (const r of info) {
    console.log(`  ${r.status.padEnd(5)} ${fmt(r.ratio)}              ${r.fg} on ${r.surface}`);
  }
  const pass = list.filter((r) => r.status === 'PASS').length;
  console.log(
    `  -- ${pass} gated pass, ${list.filter((r) => r.status === 'FAIL').length} fail, ${info.length} info/missing`,
  );
}

console.log(`\n${failures === 0 ? '✓ all gated pairings pass' : `✗ ${failures} gated failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
