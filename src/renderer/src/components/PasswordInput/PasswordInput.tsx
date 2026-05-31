import { forwardRef } from 'react';

import {
  PasswordInput as ArkPasswordInput,
  type PasswordInputRootProps,
} from '@ark-ui/react/password-input';

import './PasswordInput.css';

export interface PasswordInputProps extends PasswordInputRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * Associates a `<label>` with the input so screen readers announce the field
   * name on focus.
   */
  label: React.ReactNode;
  /**
   * Accessible label for the show/hide visibility toggle button.
   * Defaults to 'Show/hide password'.
   */
  visibilityTriggerLabel?: string;
}

/**
 * Token-styled wrapper over Ark UI's PasswordInput.
 *
 * Anatomy (from @ark-ui/react/password-input):
 *   Root > Label, Control > Input + VisibilityTrigger > Indicator
 *
 * Ark/Zag own the wiring: the VisibilityTrigger toggles `data-state` between
 * "visible" and "hidden" on the Input and Trigger, and the actual input `type`
 * toggles between "text" and "password".
 *
 * Styling is attached to Ark's `data-scope`/`data-part` attributes (see
 * PasswordInput.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const PasswordInput = forwardRef<HTMLDivElement, PasswordInputProps>(function PasswordInput(
  { label, visibilityTriggerLabel = 'Show/hide password', children, ...rootProps },
  ref,
) {
  return (
    <ArkPasswordInput.Root ref={ref} {...rootProps}>
      <ArkPasswordInput.Label>{label}</ArkPasswordInput.Label>
      <ArkPasswordInput.Control>
        <ArkPasswordInput.Input />
        <ArkPasswordInput.Context>
          {(api) => (
            /*
             * Ark/Zag hard-codes tabIndex=-1 on the VisibilityTrigger and uses
             * onPointerDown (not onClick) to fire the state-machine TRIGGER.CLICK
             * event. WCAG 2.1 AA §2.1.1 requires all interactive controls to be
             * keyboard-reachable. We fix this by:
             *   1. Overriding tabIndex to 0 so the button enters the tab order.
             *   2. Adding an onClick handler that calls api.toggleVisible() so
             *      keyboard Enter/Space (which dispatch a synthetic click event
             *      on a focused button, but NOT a pointerdown) still toggle the
             *      state. Mouse clicks still go through the Ark onPointerDown path
             *      (which calls preventDefault(), suppressing the subsequent click),
             *      so there is no double-fire on mouse interaction.
             */
            <ArkPasswordInput.VisibilityTrigger
              aria-label={visibilityTriggerLabel}
              tabIndex={0}
              onClick={(event) => {
                // Ark's onPointerDown handles mouse clicks and calls
                // event.preventDefault() which does NOT suppress the click in
                // all browsers. Guard against double-firing by only toggling
                // when the click was keyboard-generated (detail === 0).
                // Mouse-generated clicks have detail >= 1.
                if (event.detail === 0) {
                  api.toggleVisible();
                }
              }}
            >
              <ArkPasswordInput.Indicator
                fallback={
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* Eye-off icon (password hidden) */}
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                }
              >
                {/* Eye icon (password visible) */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </ArkPasswordInput.Indicator>
            </ArkPasswordInput.VisibilityTrigger>
          )}
        </ArkPasswordInput.Context>
      </ArkPasswordInput.Control>
      {children}
    </ArkPasswordInput.Root>
  );
});
