import { forwardRef } from 'react';

import { Toggle as ArkToggle, type ToggleRootProps } from '@ark-ui/react/toggle';

import './Toggle.css';

/** Size scale for height, horizontal padding, and typography. */
export type ToggleSize = 'small' | 'medium' | 'large';

export interface ToggleProps extends ToggleRootProps {
  /**
   * Size scale. Drives height, horizontal padding, and font size via
   * `data-size` (see Toggle.css). Defaults to `medium`.
   */
  size?: ToggleSize;
  /**
   * Accessible name for the toggle button.
   *
   * REQUIRED when `children` is icon-only (an icon has no text the
   * accessibility tree can use — WCAG 4.1.2, Name, Role, Value). When
   * `children` is visible text, that text already names the button, so this is
   * optional; pass it only to override the computed name.
   */
  'aria-label'?: string;
}

/**
 * Token-styled wrapper over Ark UI's Toggle — a press-to-toggle button (e.g. a
 * Bold control in a formatting toolbar), distinct from the form Switch.
 *
 * Anatomy (from @ark-ui/react/toggle): the Root IS a native `<button>` that
 * carries `aria-pressed`. Ark/Zag own the wiring and expose, on the root
 * (verified against the live Storybook DOM):
 *   data-state="on"|"off"   pressed state
 *   data-disabled           present when disabled (alongside the native
 *                           `disabled` attribute that removes it from the tab
 *                           order)
 * Ark does NOT emit `data-focus-visible`; keyboard-focus styling uses the
 * native `:focus-visible` pseudo (see Toggle.css).
 *
 * Styling is attached to Ark's `data-scope`/`data-part` attributes (see
 * Toggle.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  { children, size = 'medium', ...rootProps },
  ref,
) {
  return (
    <ArkToggle.Root ref={ref} data-size={size} {...rootProps}>
      {children}
    </ArkToggle.Root>
  );
});
