import { forwardRef } from 'react';

import './Card.css';

/**
 * Elevation scale. Mirrors the Helios Card `level` options
 * (https://helios.hashicorp.design/components/card) — a `box-shadow` drawn
 * from the Helios `surface-*` and `elevation-*` shadow tokens.
 *
 * Helios exposes `surface-{base,mid,high}` and `elevation-{base,mid,high}`. Our
 * pinned `@hashicorp/design-system-tokens` build ships every one of those EXCEPT
 * `--token-elevation-base-box-shadow` (verified absent from the package), so that
 * single option is intentionally omitted rather than aliased to a wrong token.
 */
export type CardLevel =
  | 'surface-base'
  | 'surface-mid'
  | 'surface-high'
  | 'elevation-mid'
  | 'elevation-high';

/**
 * Background scale. Mirrors the Helios Card `background` neutral options:
 *   - `primary`   → `--token-color-surface-primary` (the default card surface)
 *   - `secondary` → `--token-color-surface-faint` (Helios uses a secondary
 *      neutral surface here; our token build ships `surface-faint` as the
 *      nearest secondary surface — `--token-color-surface-secondary` is not in
 *      the pinned package).
 */
export type CardBackground = 'primary' | 'secondary';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Resting elevation. When omitted the card is flush (no shadow). */
  level?: CardLevel;
  /**
   * Elevation applied on `:hover`. Use for cards that wrap an interactive
   * element (the interactive control — `<a>`/`<button>` — lives in `children`
   * and owns the focus ring; the card itself stays a non-interactive container,
   * matching Helios).
   */
  hoverLevel?: CardLevel;
  /** Elevation applied on `:active` (pointer press), for interactive cards. */
  activeLevel?: CardLevel;
  /** Neutral background surface. Defaults to `primary`. */
  background?: CardBackground;
  /**
   * Clip or expose content that overflows the rounded corners. Defaults to
   * `visible` (Helios default); set `hidden` for edge-to-edge media that must
   * follow the border radius.
   */
  overflow?: 'hidden' | 'visible';
  /** Card content. */
  children?: React.ReactNode;
}

/**
 * Card — a token-styled presentational container surface.
 *
 * Per the unstyled-primitives-ark ADR scope clarification, Card is
 * presentational/static (there is no Ark `card` primitive and no focus /
 * keyboard / open / selection state to manage), so it is built on a plain
 * semantic `<div>` rather than an Ark primitive. State/variant selection is
 * expressed through our own `data-*` attributes on the wrapper, styled via
 * attribute selectors (no class names) — see Card.css.
 *
 * The card is a NON-interactive container: it carries no `role`, `tabindex`, or
 * focus ring of its own. Interactivity (and its accessible name + focus ring)
 * belongs to the control the consumer places in `children` (e.g. a wrapping
 * `<a>` or a `<button>`), exactly as Helios models it. `hoverLevel`/`activeLevel`
 * provide the resting → raised affordance for those interactive cards without
 * making the `<div>` itself a fake button.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    level,
    hoverLevel,
    activeLevel,
    background = 'primary',
    overflow = 'visible',
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-scope="card"
      data-part="root"
      data-level={level}
      data-hover-level={hoverLevel}
      data-active-level={activeLevel}
      data-background={background}
      data-overflow={overflow}
      {...rest}
    >
      {children}
    </div>
  );
});
