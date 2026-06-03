import { forwardRef } from 'react';

import { DatePicker as ArkDatePicker, type DatePickerRootProps } from '@ark-ui/react/date-picker';

import './DateInput.css';

/** Helios control-size scale. Drives the per-size local custom properties in
 *  DateInput.css via the `data-size` attribute on the root. */
export type DateInputSize = 'small' | 'medium' | 'large';

export interface DateInputProps extends DatePickerRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Control sizing (vertical padding). Defaults to `'medium'`. */
  size?: DateInputSize;
  /** Placeholder shown in the empty text field (e.g. `'yyyy-mm-dd'`). */
  placeholder?: string;
  /** Render a "Clear" button after the field. Defaults to `false`. */
  clearable?: boolean;
  /** Accessible label for the clear button. Defaults to `'Clear date'`. */
  clearLabel?: string;
}

/**
 * Token-styled date *text input*, built on Ark UI's `date-picker` state machine
 * but presented purely as a typed text field — no calendar dropdown, no
 * popover. It matches the Helios text-input visual language and is the
 * keyboard-/typing-first counterpart to the calendar-based DatePicker.
 *
 * Anatomy (subset of @ark-ui/react/date-picker):
 *   Root > Label + Control(> Input [+ ClearTrigger])
 *
 * Ark still owns parsing and value state via `@internationalized/date`: the
 * Input is a real <input> whose typed value Ark normalizes into a `DateValue`
 * and exposes through the same controlled/uncontrolled `value`/`onValueChange`
 * API as DatePicker. Because there is no `Content`/`Positioner`/`Trigger`, the
 * calendar never mounts — the component is a text field, not an overlay.
 *
 * Styling targets Ark's `data-scope='date-picker'` / `data-part` attributes
 * (per the unstyled-primitives-ark ADR) rather than class names. The scope is
 * Ark's own (`date-picker`); DateInput.css scopes only the parts this subset
 * renders, so it never collides with DatePicker.css.
 */
export const DateInput = forwardRef<HTMLDivElement, DateInputProps>(function DateInput(
  {
    label,
    size = 'medium',
    placeholder,
    clearable = false,
    clearLabel = 'Clear date',
    ...rootProps
  },
  ref,
) {
  return (
    <ArkDatePicker.Root ref={ref} data-size={size} {...rootProps}>
      <ArkDatePicker.Label>{label}</ArkDatePicker.Label>
      <ArkDatePicker.Control>
        <ArkDatePicker.Input placeholder={placeholder} />
        {clearable && (
          <ArkDatePicker.ClearTrigger aria-label={clearLabel}>Clear</ArkDatePicker.ClearTrigger>
        )}
      </ArkDatePicker.Control>
    </ArkDatePicker.Root>
  );
});
