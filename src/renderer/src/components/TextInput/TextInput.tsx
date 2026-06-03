import { forwardRef } from 'react';

import { Field as ArkField, type FieldInputProps } from '@ark-ui/react/field';

import './TextInput.css';

/**
 * Token-styled wrapper over Ark UI's Field primitive, rendering the bare Helios
 * Text Input control (https://helios.hashicorp.design/components/form/text-input).
 *
 * This is the bare input CONTROL, distinct from `Field` (which composes
 * label + control + helper/error into a full form row). `TextInput` exposes only
 * the input chrome — wire it into a `Field` for label/helper/error, or pass an
 * `aria-label`/`aria-labelledby` to use it standalone. It still wraps
 * `Field.Root` + `Field.Input` so Ark's validation/state plumbing
 * (`invalid` → `data-invalid`, native `disabled`/`readOnly`) drives the chrome.
 *
 * Anatomy (from @ark-ui/react/field): Root > Input. Only the input is styled here.
 *
 * Ark contract (verified against the live Field DOM, NOT assumed):
 *   - Field.Input renders a native <input> (HTMLInputElement). Native form
 *     controls expose the keyboard focus ring via the native :focus-visible
 *     pseudo-class — Ark emits NO data-focus-visible attribute. The focus ring
 *     therefore lives on :focus-visible.
 *   - The native `disabled`/`readOnly` attributes land on the <input> (so the
 *     CSS matches `:disabled`/`:read-only`, not `data-disabled`/`data-readonly`).
 *   - `data-invalid` IS emitted on the input when Root receives `invalid`.
 *
 * Size scale: `data-size` on the Root sets local `--text-input-*` custom
 * properties (padding + typography) consumed by the input part.
 */
export interface TextInputProps extends Omit<FieldInputProps, 'size'> {
  /**
   * Accessible name when used WITHOUT a wrapping `Field`/visible `<label>`.
   * Required for a standalone input (WCAG 4.1.2). Omit it only when the input is
   * composed inside a `Field` that supplies the label.
   */
  'aria-label'?: string;
  /** Native input type. Defaults to `text`. */
  type?: React.HTMLInputTypeAttribute;
  /** Size scale for control padding and typography. Defaults to `medium`. */
  size?: 'small' | 'medium' | 'large';
  /** Marks the control invalid — sets Ark `data-invalid` for the error chrome. */
  invalid?: boolean;
  /** Disables the control (native `disabled`). */
  disabled?: boolean;
  /** Makes the control read-only (native `readonly`). */
  readOnly?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { type = 'text', size = 'medium', invalid, disabled, readOnly, ...inputProps },
  ref,
) {
  return (
    <ArkField.Root data-size={size} invalid={invalid} disabled={disabled} readOnly={readOnly}>
      <ArkField.Input ref={ref} type={type} {...inputProps} />
    </ArkField.Root>
  );
});
