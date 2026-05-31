import { forwardRef } from 'react';

import { Toggle as ArkToggle, type ToggleRootProps } from '@ark-ui/react/toggle';

import './Toggle.css';

export interface ToggleProps extends ToggleRootProps {
  /**
   * Accessible name for the toggle button. Required when children are
   * icon-only (WCAG 4.1.2 — Name, Role, Value). When children are visible
   * text, pass the same text here so it is also exposed to assistive tech;
   * you can also rely on the text content by omitting this prop only if
   * children is plain text.
   */
  'aria-label': string;
}

/**
 * Token-styled wrapper over Ark UI's Toggle.
 *
 * Anatomy (from @ark-ui/react/toggle): Root (a <button> with aria-pressed)
 * and optionally an Indicator (shows/hides content based on pressed state).
 * Ark/Zag own the wiring: aria-pressed lives on the Root button element
 * itself, exposing data-state="on"|"off" / data-pressed / data-disabled for
 * styling.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see
 * Toggle.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { children, ...rootProps },
  ref,
) {
  return (
    <ArkToggle.Root ref={ref} {...rootProps}>
      {children}
    </ArkToggle.Root>
  );
});
