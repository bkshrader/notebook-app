import { forwardRef } from 'react';

import {
  Collapsible as ArkCollapsible,
  type CollapsibleRootProps,
} from '@ark-ui/react/collapsible';

import './Collapsible.css';

/** Size scale for padding, typography, and indicator size. */
export type CollapsibleSize = 'small' | 'medium' | 'large';

/** Visual variant. `card` is a bordered surface; `ghost` is borderless/inline. */
export type CollapsibleVariant = 'card' | 'ghost';

export interface CollapsibleProps extends CollapsibleRootProps {
  /**
   * Visible, screen-reader-announceable label rendered inside the trigger
   * button. Required (WCAG 4.1.2 — Name, Role, Value).
   */
  label: React.ReactNode;
  /** Content revealed when the collapsible is open. */
  children: React.ReactNode;
  /** Size scale. Defaults to `medium`. */
  size?: CollapsibleSize;
  /** Visual variant. Defaults to `card`. */
  variant?: CollapsibleVariant;
  /**
   * Custom indicator glyph rendered inside the Ark Indicator part (rotates with
   * `data-state`). Defaults to a Unicode chevron (`›`). Pass `null` to omit the
   * indicator entirely. Decorative — the Indicator is always `aria-hidden`.
   */
  indicator?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Collapsible.
 *
 * Anatomy (from @ark-ui/react/collapsible): Root > Trigger (contains label +
 * optional Indicator) > Content. The Trigger renders as a native `<button>`,
 * which is keyboard-focusable by default.
 *
 * State attributes (verified against the Ark styling guide): Ark emits
 * `data-state="open|closed"` on Root, Trigger, Indicator, and Content;
 * `data-disabled` on Trigger, Indicator, and Content when disabled. Ark does
 * NOT emit `data-focus-visible` — the Trigger is a native `<button>`, so
 * keyboard-focus styling uses the native `:focus-visible` pseudo-class (see
 * Collapsible.css).
 *
 * Styling is attached to Ark's `data-scope`/`data-part` attributes (see
 * Collapsible.css) per the unstyled-primitives-ark ADR — no custom class names.
 * `size` and `variant` are forwarded as `data-size` / `data-variant` on the
 * Root, where the size matrix and variant containers hang off them.
 *
 * The default Indicator chevron is CSS-only (no SVG import dependency) — a pure
 * Unicode glyph whose transform is toggled by `data-state` on the Indicator part.
 */
export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
  { label, children, size = 'medium', variant = 'card', indicator = '›', ...rootProps },
  ref,
) {
  return (
    <ArkCollapsible.Root ref={ref} data-size={size} data-variant={variant} {...rootProps}>
      <ArkCollapsible.Trigger>
        <span>{label}</span>
        {indicator !== null && (
          <ArkCollapsible.Indicator aria-hidden="true">{indicator}</ArkCollapsible.Indicator>
        )}
      </ArkCollapsible.Trigger>
      <ArkCollapsible.Content>{children}</ArkCollapsible.Content>
    </ArkCollapsible.Root>
  );
});
