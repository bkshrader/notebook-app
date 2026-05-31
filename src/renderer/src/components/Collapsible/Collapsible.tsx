import { forwardRef } from 'react';

import {
  Collapsible as ArkCollapsible,
  type CollapsibleRootProps,
} from '@ark-ui/react/collapsible';

import './Collapsible.css';

export interface CollapsibleProps extends CollapsibleRootProps {
  /**
   * Visible, screen-reader-announceable label rendered inside the trigger
   * button. Required (WCAG 4.1.2 — Name, Role, Value).
   */
  label: React.ReactNode;
  /** Content revealed when the collapsible is open. */
  children: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Collapsible.
 *
 * Anatomy (from @ark-ui/react/collapsible): Root > Trigger (contains label +
 * optional Indicator) > Content. The Trigger renders as a native `<button>`,
 * which is keyboard-focusable by default. Ark exposes `data-state="open|closed"`
 * on every part, `data-disabled` when disabled, and `data-focus-visible` on the
 * Trigger when focused via keyboard.
 *
 * Styling is attached to Ark's `data-scope`/`data-part` attributes (see
 * Collapsible.css) per the unstyled-primitives-ark ADR — no custom class names.
 *
 * The Indicator chevron is CSS-only (no SVG import dependency) — a pure Unicode
 * glyph whose transform is toggled by `data-state` on the Indicator part.
 */
export const Collapsible = forwardRef<HTMLDivElement, CollapsibleProps>(function Collapsible(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkCollapsible.Root ref={ref} {...rootProps}>
      <ArkCollapsible.Trigger>
        <span>{label}</span>
        <ArkCollapsible.Indicator aria-hidden="true">›</ArkCollapsible.Indicator>
      </ArkCollapsible.Trigger>
      <ArkCollapsible.Content>{children}</ArkCollapsible.Content>
    </ArkCollapsible.Root>
  );
});
