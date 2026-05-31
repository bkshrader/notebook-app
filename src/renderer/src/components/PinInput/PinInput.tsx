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
 * Focus ring is applied only on `data-focus-visible` (keyboard focus).
 */
export const PinInput = forwardRef<HTMLDivElement, PinInputProps>(function PinInput(
  { label, length = 4, children, ...rootProps },
  ref,
) {
  return (
    <ArkPinInput.Root ref={ref} {...rootProps}>
      <ArkPinInput.Label>{label}</ArkPinInput.Label>
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
