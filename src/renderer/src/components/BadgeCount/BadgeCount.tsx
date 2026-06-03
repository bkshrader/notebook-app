import { forwardRef } from 'react';

import './BadgeCount.css';

/**
 * BadgeCount — a token-styled wrapper over a plain semantic `<span>`, built to
 * the Helios Badge Count specification
 * (https://helios.hashicorp.design/components/badge-count).
 *
 * Helios uses Badge Count to display numeric values — version numbers
 * ("v1.2.0"), collection counts in tabs, and similar. It is purely
 * presentational: it has no focus, keyboard, open/close, or selection state, so
 * per the unstyled-primitives-ark ADR scope clarification (2026-06-02) it is
 * built on a semantic HTML element rather than an Ark primitive. There is no
 * Ark `badge`/`count` primitive in any case.
 *
 * It carries its own `data-part="root"` attribute (no Ark scope/part exists),
 * which BadgeCount.css styles — keeping the attribute-selector convention and
 * avoiding class-name styling. The variant axes mirror Helios:
 *   - `size`: small | medium | large    → padding, min-height, radius, type scale
 *   - `type`: filled | inverted | outlined → color treatment
 *
 * Helios additionally offers a `neutral` vs `neutral-dark-mode` color axis; we
 * collapse that to a single `neutral` treatment because our color tokens are
 * theme-adaptive (the token layer resolves light/dark centrally — see
 * tokens.css), so a separate dark-mode color prop would be redundant.
 *
 * The element is a `<span>` (inline, non-interactive). When the count conveys
 * meaning that the surrounding text does not already provide, pass an
 * `aria-label` for a fuller spoken form (e.g. aria-label="3 unread" on "3").
 */
export interface BadgeCountProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual color treatment. Mirrors the Helios `type` axis. Defaults to `filled`. */
  type?: 'filled' | 'inverted' | 'outlined';
  /** Size scale: padding, min-height, radius, and type scale. Defaults to `medium`. */
  size?: 'small' | 'medium' | 'large';
  /** The numeric label to display (e.g. a count or version string). */
  children: React.ReactNode;
}

/**
 * Numeric count badge. Presentational `<span>`; styling targets its own
 * `data-part`/`data-type`/`data-size` attributes (BadgeCount.css).
 */
export const BadgeCount = forwardRef<HTMLSpanElement, BadgeCountProps>(function BadgeCount(
  { type = 'filled', size = 'medium', children, ...rest },
  ref,
) {
  return (
    <span ref={ref} data-part="root" data-type={type} data-size={size} {...rest}>
      {children}
    </span>
  );
});
