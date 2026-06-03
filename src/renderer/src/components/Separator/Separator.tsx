import { forwardRef } from 'react';

import './Separator.css';

/**
 * Orientation of the divider. Helios ships a horizontal-only divider (a `<hr>`
 * with a `border-top`); we additionally expose a vertical option (a common
 * layout need, e.g. between inline toolbar groups) styled with logical
 * properties so it tracks the writing mode. Defaults to `horizontal`.
 */
export type SeparatorOrientation = 'horizontal' | 'vertical';

/**
 * Block/inline spacing around the divider, in the two options Helios offers:
 *   - `'24'` — 24px of margin on the cross axis (default; visually distinguishes
 *     sections). Helios: `.hds-separator--spacing-24 { margin: 24px 0 }`.
 *   - `'0'`  — no margin (tightly integrated layout). Helios:
 *     `.hds-separator--spacing-0 { margin: 0 }`.
 */
export type SeparatorSpacing = '24' | '0';

export interface SeparatorProps extends Omit<
  React.HTMLAttributes<HTMLHRElement>,
  'role' | 'aria-orientation'
> {
  /** Divider direction. Defaults to `horizontal`. */
  orientation?: SeparatorOrientation;
  /** Cross-axis margin, matching the Helios spacing options. Defaults to `'24'`. */
  spacing?: SeparatorSpacing;
}

/**
 * Separator — a token-styled horizontal/vertical divider built to the Helios
 * Separator specification (https://helios.hashicorp.design/components/separator).
 *
 * Presentational primitive: it is pure markup + token styling with no focus,
 * keyboard, open, or selection state, so per the unstyled-primitives-ark ADR's
 * scope clarification it is built on a plain semantic element (`<hr>`) rather
 * than an Ark primitive. There is no Ark `separator` primitive.
 *
 * The native `<hr>` already carries the implicit ARIA `separator` role, so it is
 * announced as a separator without any extra wiring (WCAG 1.3.1 / 4.1.2). For a
 * vertical divider we set `aria-orientation="vertical"` so assistive tech
 * conveys the direction (the implicit value is `horizontal`).
 *
 * Styling targets our own `[data-part='separator']` attribute (the plain-HTML
 * styling convention from the ADR — no class names), keyed by `data-orientation`
 * and `data-spacing`. Every visual value resolves to a Helios `--token-*`
 * custom property; the only bare value is the 24px spacing, which Helios itself
 * hardcodes as a px margin (not a design token), replicated here as a local
 * custom property.
 */
export const Separator = forwardRef<HTMLHRElement, SeparatorProps>(function Separator(
  { orientation = 'horizontal', spacing = '24', ...rest },
  ref,
) {
  return (
    <hr
      ref={ref}
      data-part="separator"
      data-orientation={orientation}
      data-spacing={spacing}
      aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
      {...rest}
    />
  );
});
