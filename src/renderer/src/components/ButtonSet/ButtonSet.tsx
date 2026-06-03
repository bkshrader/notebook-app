import { forwardRef } from 'react';

import './ButtonSet.css';

/**
 * Inter-button spacing, matching the two gaps Helios uses for a Button Set:
 *   - `'default'` — 16px gap (`.hds-button-set { gap: 16px }`), the standalone
 *     layout for a row of actions.
 *   - `'compact'` — 8px gap (Helios tightens the gap to 8px when a Button Set
 *     sits in a dropdown header/footer: `.hds-dropdown__footer > .hds-button-set
 *     { gap: 8px }`).
 *
 * Defaults to `'default'`.
 */
type ButtonSetSpacing = 'default' | 'compact';

/**
 * Layout axis. Helios's Button Set lays Buttons out "in a single row"
 * (horizontal); we additionally expose a vertical stack — a common need for
 * narrow surfaces (a dialog on mobile, a side panel) — styled with logical
 * properties so it tracks the writing mode. Defaults to `'horizontal'`.
 */
type ButtonSetOrientation = 'horizontal' | 'vertical';

/**
 * Main-axis distribution of the Buttons, expressed in the `justify-content`
 * values a button row actually needs:
 *   - `'start'`   — pack to the inline-start (default).
 *   - `'end'`     — pack to the inline-end (e.g. a dialog footer's confirm/cancel).
 *   - `'between'` — push the first and last apart (Helios uses `margin-left:auto`
 *     on a tertiary button in a dialog footer to achieve this; `between`
 *     generalises that to the whole set).
 *
 * Defaults to `'start'`.
 */
type ButtonSetAlign = 'start' | 'end' | 'between';

/** Layout-only options, before the required accessible-name constraint. */
interface ButtonSetLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inter-button gap. Defaults to `'default'` (16px, the Helios standalone gap). */
  spacing?: ButtonSetSpacing;
  /** Layout axis. Defaults to `'horizontal'` (Helios's single-row layout). */
  orientation?: ButtonSetOrientation;
  /** Main-axis distribution of the Buttons. Defaults to `'start'`. */
  align?: ButtonSetAlign;
  /** The Buttons (or button-like controls) to lay out. */
  children?: React.ReactNode;
}

/**
 * ButtonSet — a token-styled layout container that arranges multiple Buttons
 * with consistent Helios spacing, built to the Helios Button Set specification
 * (https://helios.hashicorp.design/components/button-set).
 *
 * Presentational/static primitive: it is pure markup + token-driven layout with
 * no focus, keyboard, open, or selection state of its own (each child Button
 * owns its own focus ring and keyboard behaviour), so per the
 * unstyled-primitives-ark ADR's scope clarification it is built on a plain
 * semantic `<div>` rather than an Ark primitive. There is no Ark `button-set`
 * primitive.
 *
 * Semantics: the container carries `role="group"` so assistive tech announces
 * the Buttons as one related set (WCAG 1.3.1). A `role="group"` is only useful
 * when it is named, so an accessible name is REQUIRED — supply either
 * `aria-label` or `aria-labelledby` (enforced by the `ButtonSetProps` union and
 * a runtime warning in development). The grouping element is otherwise inert: it
 * has no `tabindex` and no focus ring; tabbing moves directly through the child
 * Buttons.
 *
 * Styling targets our own `[data-part='button-set']` attribute (the plain-HTML
 * styling convention from the ADR — no class names), keyed by `data-spacing`,
 * `data-orientation`, and `data-align`. Every visual value resolves to a Helios
 * `--token-*` custom property except the inter-button gap, which Helios itself
 * hardcodes as a px value (16px / 8px, not a design token); those are replicated
 * as a local `--button-set-gap` custom property set per `data-spacing`.
 */
type WithAriaLabel = { 'aria-label': string; 'aria-labelledby'?: never };
type WithAriaLabelledBy = { 'aria-labelledby': string; 'aria-label'?: never };

/**
 * The public props: the layout options plus a REQUIRED accessible name supplied
 * via exactly one of `aria-label` / `aria-labelledby`. The union makes omitting
 * both a type error at the call site (the `role="group"` is meaningless unnamed).
 */
export type ButtonSetProps = ButtonSetLayoutProps & (WithAriaLabel | WithAriaLabelledBy);

export const ButtonSet = forwardRef<HTMLDivElement, ButtonSetProps>(function ButtonSet(
  { spacing = 'default', orientation = 'horizontal', align = 'start', children, ...rest },
  ref,
) {
  if (
    process.env.NODE_ENV !== 'production' &&
    rest['aria-label'] == null &&
    rest['aria-labelledby'] == null
  ) {
    console.warn(
      'ButtonSet: a role="group" needs an accessible name. Pass `aria-label` or `aria-labelledby`.',
    );
  }

  return (
    <div
      ref={ref}
      role="group"
      data-part="button-set"
      data-spacing={spacing}
      data-orientation={orientation}
      data-align={align}
      {...rest}
    >
      {children}
    </div>
  );
});
