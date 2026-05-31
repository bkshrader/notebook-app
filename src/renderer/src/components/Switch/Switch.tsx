import { forwardRef } from 'react';

import { Switch as ArkSwitch, type SwitchRootProps } from '@ark-ui/react/switch';

import './Switch.css';

export interface SwitchProps extends Omit<SwitchRootProps, 'label'> {
  /**
   * Visible, screen-reader-announceable label. Required: a switch with no
   * accessible name fails WCAG 4.1.2 (Name, Role, Value). Pass a string for
   * the common case; pass a node when you need richer label markup.
   *
   * (Ark's own `label` prop is a `string`-only convenience; we override it with
   * a `ReactNode` and render it through `Switch.Label`.)
   */
  label: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Switch.
 *
 * Anatomy (from @ark-ui/react/switch): Root > Control > Thumb, plus Label and
 * the visually-hidden native input. Ark/Zag own the wiring: `role="switch"`
 * lives on the hidden `<input type="checkbox">` (the focusable, disable-able
 * element that carries `aria-checked`); the Control is `aria-hidden` and exists
 * purely for presentation, exposing `data-state` / `data-disabled` /
 * `data-focus-visible` for styling.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Switch.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Switch = forwardRef<HTMLLabelElement, SwitchProps>(function Switch(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkSwitch.Root ref={ref} {...rootProps}>
      <ArkSwitch.Control>
        <ArkSwitch.Thumb />
      </ArkSwitch.Control>
      <ArkSwitch.Label>{label}</ArkSwitch.Label>
      <ArkSwitch.HiddenInput />
      {children}
    </ArkSwitch.Root>
  );
});
