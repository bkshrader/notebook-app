import { forwardRef } from 'react';

import { Checkbox as ArkCheckbox, type CheckboxRootProps } from '@ark-ui/react/checkbox';

import './Checkbox.css';

export interface CheckboxProps extends Omit<CheckboxRootProps, 'label'> {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Checkbox.
 *
 * Anatomy (from @ark-ui/react/checkbox): Root > Control > Indicator, plus Label
 * and the visually-hidden native input. Ark/Zag own the wiring: `role="checkbox"`
 * lives on the hidden `<input type="checkbox">` (the focusable element that carries
 * `aria-checked`); the Control is presentational, exposing `data-state` /
 * `data-disabled` / `data-focus-visible` for styling.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Checkbox.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Checkbox = forwardRef<HTMLLabelElement, CheckboxProps>(function Checkbox(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkCheckbox.Root ref={ref} {...rootProps}>
      <ArkCheckbox.Control>
        <ArkCheckbox.Indicator />
      </ArkCheckbox.Control>
      <ArkCheckbox.Label>{label}</ArkCheckbox.Label>
      <ArkCheckbox.HiddenInput />
      {children}
    </ArkCheckbox.Root>
  );
});
