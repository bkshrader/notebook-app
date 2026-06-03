import { forwardRef } from 'react';

import { Field as ArkField, type FieldRootProps } from '@ark-ui/react/field';

import './Textarea.css';

export interface TextareaProps extends Omit<FieldRootProps, 'onChange'> {
  /** Visible, screen-reader-associated label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Optional helper text rendered below the control. */
  helperText?: React.ReactNode;
  /** Error message rendered when `invalid` is true. */
  errorText?: React.ReactNode;
  /** Whether to render a required indicator (*) next to the label. */
  showRequiredIndicator?: boolean;
  /**
   * Grow the control to fit its content instead of relying on a scrollbar.
   * Forwarded to Ark's `Field.Textarea` autoresize machine. Defaults to false
   * (the Helios default — a manually `resize: vertical` control).
   */
  autoresize?: boolean;
  /** Placeholder text shown while the control is empty. */
  placeholder?: string;
  /** Initial number of visible text rows. Forwarded to the native `<textarea>`. */
  rows?: number;
  /** Current value (controlled). Forwarded to the native `<textarea>`. */
  value?: string;
  /** Default value (uncontrolled). Forwarded to the native `<textarea>`. */
  defaultValue?: string;
  /** Change handler. Forwarded to the native `<textarea>`. */
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

/** Label content + the optional required indicator. */
function TextareaLabel({
  label,
  showRequiredIndicator,
}: Pick<TextareaProps, 'label' | 'showRequiredIndicator'>) {
  return (
    <ArkField.Label>
      {label}
      {showRequiredIndicator ? <ArkField.RequiredIndicator /> : null}
    </ArkField.Label>
  );
}

/** Optional helper / error text rendered below the control. */
function TextareaMessages({
  helperText,
  errorText,
}: Pick<TextareaProps, 'helperText' | 'errorText'>) {
  return (
    <>
      {helperText ? <ArkField.HelperText>{helperText}</ArkField.HelperText> : null}
      {errorText ? <ArkField.ErrorText>{errorText}</ArkField.ErrorText> : null}
    </>
  );
}

/**
 * Token-styled wrapper over Ark UI's Field primitive in its multi-line form,
 * built to the Helios Textarea specification
 * (https://helios.hashicorp.design/components/form/textarea).
 *
 * A Textarea provides the same affordances as a Text Input but accepts
 * multi-line text. It wraps the Ark `field` machine (the interactive/stateful
 * path of the unstyled-primitives-ark ADR): Ark owns label↔control association,
 * the `aria-invalid`/`aria-describedby` wiring, and the native
 * `disabled`/`readonly`/`required` attributes on the rendered `<textarea>`.
 *
 * Anatomy (from @ark-ui/react/field):
 *   Root > Label (+ RequiredIndicator) > Textarea > HelperText + ErrorText
 *
 * Ark contract (verified against @ark-ui/react/field — NOT assumed from
 * comments):
 *   - Field.Textarea renders a native <textarea>. Native form controls expose
 *     the keyboard focus ring via the native :focus-visible pseudo-class — Ark
 *     emits NO data-focus-visible attribute. The focus ring therefore lives on
 *     :focus-visible, not a data-attribute selector.
 *   - data-invalid is emitted on the textarea when `invalid` is set; the
 *     disabled/readonly states arrive as the NATIVE `disabled`/`readonly`
 *     attributes, so the CSS matches :disabled / :read-only (a data-attribute
 *     selector would be dead).
 *
 * Helios has a SINGLE textarea size (no small/medium/large scale — confirmed
 * against the live `hds-form-textarea` stylesheet), so this component
 * intentionally exposes no `size` prop.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    errorText,
    showRequiredIndicator,
    autoresize,
    placeholder,
    rows,
    value,
    defaultValue,
    onChange,
    ...rootProps
  },
  ref,
) {
  return (
    <ArkField.Root {...rootProps}>
      <TextareaLabel label={label} showRequiredIndicator={showRequiredIndicator} />
      <ArkField.Textarea
        ref={ref}
        autoresize={autoresize}
        placeholder={placeholder}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
      />
      <TextareaMessages helperText={helperText} errorText={errorText} />
    </ArkField.Root>
  );
});
