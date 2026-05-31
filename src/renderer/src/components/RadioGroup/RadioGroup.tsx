import { forwardRef } from 'react';

import { RadioGroup as ArkRadioGroup, type RadioGroupRootProps } from '@ark-ui/react/radio-group';

import './RadioGroup.css';

export interface RadioGroupOption {
  /** Machine value — passed to `onValueChange`. */
  value: string;
  /** Visible label text for this option. */
  label: string;
  /** Disable this specific option. */
  disabled?: boolean;
}

export interface RadioGroupProps extends RadioGroupRootProps {
  /**
   * Visible group label rendered as a `<RadioGroup.Label>` (maps to a
   * `<div role="group" aria-labelledby="...">` in Ark v5). Required:
   * a radio group with no accessible name fails WCAG 4.1.2.
   */
  groupLabel: React.ReactNode;
  /**
   * The set of options to render. Each option needs a `value` (machine
   * identifier) and a `label` (human-readable text).
   */
  options: RadioGroupOption[];
}

/**
 * Token-styled wrapper over Ark UI's RadioGroup.
 *
 * Anatomy (from \@ark-ui/react/radio-group):
 *   Root > Label
 *   Root > Item* > ItemControl, ItemText, ItemHiddenInput
 *
 * Ark/Zag own the wiring: each `ItemHiddenInput` renders a native
 * `<input type="radio">` (role `radio`, keyboard-navigable via arrow keys).
 * `ItemControl` is the visual circle, aria-hidden, carrying `data-state` /
 * `data-disabled` / `data-focus-visible` for CSS styling.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * RadioGroup.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { groupLabel, options, children, ...rootProps },
  ref,
) {
  return (
    <ArkRadioGroup.Root ref={ref} {...rootProps}>
      <ArkRadioGroup.Label>{groupLabel}</ArkRadioGroup.Label>
      {options.map((option) => (
        <ArkRadioGroup.Item key={option.value} value={option.value} disabled={option.disabled}>
          <ArkRadioGroup.ItemControl />
          <ArkRadioGroup.ItemText>{option.label}</ArkRadioGroup.ItemText>
          <ArkRadioGroup.ItemHiddenInput />
        </ArkRadioGroup.Item>
      ))}
      {children}
    </ArkRadioGroup.Root>
  );
});
