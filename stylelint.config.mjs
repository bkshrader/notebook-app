/**
 * Stylelint configuration (flat ESM, matching eslint.config.mjs).
 *
 * Layered like the eslint config: a strict shareable base
 * (stylelint-config-standard) + plugins that encode this project's
 * non-negotiable constraints — Helios design-token discipline,
 * accessibility, and logical (i18n-ready) properties.
 *
 * See the ADR at
 * docs/features/accessibility/adrs/stylelint.md for the rationale,
 * including why stylelint-high-performance-animation was deferred.
 */
export default {
  // stylelint-config-clean-order brings stylelint-order's property
  // ordering in via a shareable config (it peer-depends on the plugin).
  extends: [
    'stylelint-config-standard',
    'stylelint-config-clean-order',
    // logical-css ships a `recommended` config; we extend it but soften
    // severity to `warning` below until real component CSS exists and is
    // logical-property-clean, at which point these flip to errors.
    'stylelint-plugin-logical-css/configs/recommended',
  ],
  plugins: ['stylelint-declaration-strict-value', '@double-great/stylelint-a11y'],
  ignoreFiles: [
    '**/node_modules/**',
    'out/**',
    'dist/**',
    'storybook-static/**',
    // Nested worktrees under `.claude/worktrees/` are independent
    // checkouts of this repo and must not be linted as part of the main
    // repo. Mirrors the equivalent exclusion in eslint.config.mjs.
    '.claude/worktrees/**',
  ],
  rules: {
    // Helios discipline: color-bearing properties must use a token
    // (var(...)) or function, never a raw literal. This is the mechanical
    // enforcement of the "semantic tokens only, never raw palette /
    // hardcoded color" rule that otherwise lives only in DESIGN.md.
    //
    // The property list is provisional — tune it against the actual
    // Helios token surface once DESIGN.md and the token package land on
    // main. `disableFix` because there's no safe automatic substitution
    // for a hardcoded color; a human must pick the right token.
    'scale-unlimited/declaration-strict-value': [
      ['/color$/', 'fill', 'stroke', 'box-shadow', 'background'],
      {
        ignoreValues: ['transparent', 'currentColor', 'inherit', 'none'],
        disableFix: true,
      },
    ],

    // Accessibility (WCAG 2.1 AA floor): never strip focus outlines
    // without a replacement, and respect prefers-reduced-motion.
    'a11y/no-outline-none': true,
    'a11y/media-prefers-reduced-motion': true,

    // Soften the logical-css `recommended` rules to warnings for the
    // initial rollout — they inform without blocking until the codebase
    // has real CSS to bring into compliance. Flip to `error` (drop these
    // overrides) once it's clean.
    'logical-css/require-logical-properties': [true, { severity: 'warning' }],
    'logical-css/require-logical-keywords': [
      true,
      {
        ignore: ['caption-side', 'offset-anchor', 'offset-position'],
        severity: 'warning',
      },
    ],
    'logical-css/require-logical-units': [true, { severity: 'warning' }],
  },
};
