import { forwardRef } from 'react';

import './Icon.css';

/**
 * Token-styled SVG icon wrapper, built to the Helios `FlightIcon`
 * specification (https://helios.hashicorp.design/icons/library).
 *
 * Icon is **presentational/static** — it has no focus, keyboard, open/close,
 * selection, or roving-tabindex semantics — so per the scope clarification in
 * the unstyled-primitives-ark ADR (2026-06-02) it is built directly on a plain
 * semantic `<svg>` element rather than an Ark primitive. There is no Ark `icon`
 * primitive, and one would add nothing: the only behavior is a CSS rotation for
 * the loading state.
 *
 * Styling convention: having no Ark scope/part, the wrapper sets its OWN
 * `data-scope="icon"` / `data-part="root"` attributes (and `data-size`,
 * `data-tone`, `data-spin`) so Icon.css keeps the attribute-selector style the
 * rest of the Component Library uses, with no class names.
 *
 * Accessibility (the Helios contract, WCAG 1.1.1 / 4.1.2):
 *   - Decorative (no `label`): the SVG is hidden from assistive tech with
 *     `aria-hidden="true"` and exposes no role — its meaning comes from an
 *     adjacent text label or the control that contains it.
 *   - Meaningful (`label` provided): the SVG becomes `role="img"` with an
 *     `aria-label`, so it is announced as a single named graphic. `aria-hidden`
 *     is NOT set in this case.
 *
 * The icon inherits its color from the surrounding text via `fill: currentColor`
 * (matching Helios), unless a semantic `tone` is set, which resolves to a
 * Helios `--token-color-foreground-*` value.
 */

/** Icon box size in px. Helios `FlightIcon` ships two sizes: 16 and 24. */
export type IconSize = 16 | 24;

/**
 * Semantic color tone. `inherit` (default) takes the surrounding text color via
 * `currentColor`; the others resolve to a Helios `--token-color-foreground-*`
 * value (see Icon.css). Mirrors the foreground tones Helios uses for icons.
 */
export type IconTone =
  | 'inherit'
  | 'primary'
  | 'faint'
  | 'disabled'
  | 'action'
  | 'highlight'
  | 'success'
  | 'warning'
  | 'critical';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /**
   * The SVG glyph content (`<path>`/`<g>`/… elements). Required — Icon is a
   * wrapper, not an icon set; the consumer supplies the paths.
   */
  children: React.ReactNode;
  /**
   * Accessible name. Provide this ONLY when the icon conveys meaning on its own
   * (no adjacent visible text): the icon is then exposed as `role="img"` with
   * this `aria-label`. Omit it for decorative icons, which are `aria-hidden`.
   */
  label?: string;
  /** Box size in px (square). Defaults to `24` (the Helios default). */
  size?: IconSize;
  /** Semantic color tone. Defaults to `inherit` (currentColor). */
  tone?: IconTone;
  /**
   * Spin continuously (the Helios loading/running state). Suppressed under
   * reduced motion (see Icon.css). Defaults to `false`.
   */
  spin?: boolean;
  /**
   * SVG coordinate system. Defaults to Helios's `0 0 24 24`; override only if
   * the supplied glyph is authored on a different grid.
   */
  viewBox?: string;
}

/**
 * Compute the a11y attributes for the icon from whether it has an accessible
 * name. Kept as a tiny pure helper so the component body stays a flat,
 * low-complexity render (no nested ternaries — cf. Field.tsx).
 */
function accessibilityProps(label: string | undefined): {
  role?: 'img';
  'aria-label'?: string;
  'aria-hidden'?: true;
} {
  if (label === undefined) {
    return { 'aria-hidden': true };
  }
  return { role: 'img', 'aria-label': label };
}

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  {
    children,
    label,
    size = 24,
    tone = 'inherit',
    spin = false,
    viewBox = '0 0 24 24',
    ...svgProps
  },
  ref,
) {
  return (
    <svg
      ref={ref}
      data-scope="icon"
      data-part="root"
      data-size={size}
      data-tone={tone}
      data-spin={spin ? 'true' : undefined}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...accessibilityProps(label)}
      {...svgProps}
    >
      {children}
    </svg>
  );
});
