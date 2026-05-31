import { forwardRef } from 'react';

import {
  NumberInput as ArkNumberInput,
  type NumberInputRootProps,
} from '@ark-ui/react/number-input';

import './NumberInput.css';

export interface NumberInputProps extends NumberInputRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's NumberInput.
 *
 * Anatomy (from @ark-ui/react/number-input): Root > Label, Control > Input +
 * IncrementTrigger + DecrementTrigger. Ark/Zag own the wiring: the Input is the
 * focusable native element with role="spinbutton" (aria-valuenow/min/max),
 * while the trigger buttons carry aria-label="Increment"/"Decrement".
 *
 * The increment/decrement triggers render as plain `▲`/`▼` text glyphs so no
 * icon library is required. Styling is attached to Ark's `data-scope`/`data-part`
 * attributes (see NumberInput.css) per the unstyled-primitives-ark ADR — no
 * custom class names.
 */
export const NumberInput = forwardRef<HTMLDivElement, NumberInputProps>(function NumberInput(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkNumberInput.Root ref={ref} {...rootProps}>
      <ArkNumberInput.Label>{label}</ArkNumberInput.Label>
      <ArkNumberInput.Control>
        <ArkNumberInput.Input />
        <ArkNumberInput.IncrementTrigger aria-label="Increment">▲</ArkNumberInput.IncrementTrigger>
        <ArkNumberInput.DecrementTrigger aria-label="Decrement">▼</ArkNumberInput.DecrementTrigger>
      </ArkNumberInput.Control>
      {children}
    </ArkNumberInput.Root>
  );
});
