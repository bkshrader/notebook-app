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
  /** Mark this specific option invalid (Ark `Item` supports per-item `invalid`). */
  invalid?: boolean;
}

/**
 * Props for {@link RadioGroup}.
 *
 * Extends Ark's `RadioGroupRootProps`, so every Root prop is accepted and
 * forwarded verbatim via `...rootProps` — including the form-integration props
 * `orientation` ('horizontal' | 'vertical'), `invalid`, `required`, `name`,
 * `readOnly`, `value`, `defaultValue`, `disabled`, and `onValueChange`. They are
 * not redeclared here; see `@ark-ui/react/radio-group` for their semantics.
 *
 * `orientation` is wired through to the layout: the CSS styles
 * `[data-orientation='horizontal' | 'vertical']` on the root (Ark emits the
 * attribute on every part).
 */
export interface RadioGroupProps extends RadioGroupRootProps {
  /**
   * Visible group label rendered as a `<RadioGroup.Label>` (an
   * `aria-labelledby` target for the group). Required: a radio group with no
   * accessible name fails WCAG 4.1.2.
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
 * `<input type="radio">` (role `radio`, keyboard-navigable via arrow keys) — it
 * is the real, clip-hidden focus target. `ItemControl` is the visual circle and
 * carries `data-state="checked|unchecked"`, `data-disabled`, and
 * `data-orientation` (verified against the live DOM — Ark does NOT emit
 * `data-focus-visible`/`data-focus` on any radio-group part). Because the
 * hidden input owns focus, the keyboard focus ring is drawn on the control via
 * `[data-part='item']:has(input:focus-visible)` using the native
 * `:focus-visible` pseudo (see RadioGroup.css).
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
        <ArkRadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          invalid={option.invalid}
        >
          <ArkRadioGroup.ItemControl />
          <ArkRadioGroup.ItemText>{option.label}</ArkRadioGroup.ItemText>
          <ArkRadioGroup.ItemHiddenInput />
        </ArkRadioGroup.Item>
      ))}
      {children}
    </ArkRadioGroup.Root>
  );
});
