import { forwardRef } from 'react';

import { PinInput as ArkPinInput, type PinInputRootProps } from '@ark-ui/react/pin-input';

import './PinInput.css';

export interface PinInputProps extends PinInputRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * Identifies what the PIN/OTP field is for (e.g. "Verification code").
   */
  label: React.ReactNode;
  /**
   * Number of input slots to render. Defaults to 4.
   */
  length?: number;
}

/**
 * Token-styled wrapper over Ark UI's PinInput.
 *
 * Anatomy (from @ark-ui/react/pin-input): Root > Label, Control > Input[],
 * HiddenInput. Each Input slot is a native <input> identified by its `index`
 * prop. Ark/Zag handle auto-advance, backspace-delete, clipboard paste, and
 * OTP autocomplete.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * PinInput.css) per the unstyled-primitives-ark ADR — no custom class names.
 * Ark exposes NO `data-focus-visible` attribute on the Input part, so the
 * keyboard focus ring is drawn with the native `:focus-visible` pseudo.
 *
 * Ark Root props pass through, including `invalid`, `disabled`, `readOnly`, and
 * `required` — Ark reflects each onto its parts (e.g. `data-readonly` on the
 * Root + Label, `data-required` on the Label, `data-invalid`/`data-disabled` on
 * the Input) and PinInput.css styles them.
 */
export const PinInput = forwardRef<HTMLDivElement, PinInputProps>(function PinInput(
  { label, length = 4, children, ...rootProps },
  ref,
) {
  return (
    <ArkPinInput.Root ref={ref} {...rootProps}>
      <ArkPinInput.Label>
        {label}
        {rootProps.required ? (
          <span data-scope="pin-input" data-part="required-indicator" aria-hidden="true">
            {' *'}
          </span>
        ) : null}
      </ArkPinInput.Label>
      <ArkPinInput.Control>
        {Array.from({ length }, (_, index) => (
          <ArkPinInput.Input key={index} index={index} />
        ))}
      </ArkPinInput.Control>
      <ArkPinInput.HiddenInput />
      {children}
    </ArkPinInput.Root>
  );
});
