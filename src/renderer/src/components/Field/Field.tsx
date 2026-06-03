import { forwardRef } from 'react';

import { Field as ArkField, type FieldRootProps } from '@ark-ui/react/field';

import './Field.css';

/** Size scale for control padding and typography. Defaults to `medium`. */
export type FieldSize = 'small' | 'medium' | 'large';

export interface FieldProps extends FieldRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Optional helper text rendered below the input. */
  helperText?: React.ReactNode;
  /** Error message rendered when `invalid` is true. */
  errorText?: React.ReactNode;
  /** Whether to render a required indicator (*) next to the label. */
  showRequiredIndicator?: boolean;
  /** Size scale for control padding and typography. Defaults to `medium`. */
  size?: FieldSize;
  /**
   * Lay the field out inline (shrink-to-fit) instead of filling its container.
   * Sets our own `data-inline` attribute on the root — Ark's Field machine does
   * NOT emit a `data-inline` attribute (the prop is not in `FieldRootProps`), so
   * the layout switch is owned here, not by Ark.
   */
  inline?: boolean;
  /** The input element to render inside the field. Defaults to a text input. */
  children?: React.ReactNode;
}

/** Label content + the optional required indicator. */
function FieldLabel({
  label,
  showRequiredIndicator,
}: Pick<FieldProps, 'label' | 'showRequiredIndicator'>) {
  return (
    <ArkField.Label>
      {label}
      {showRequiredIndicator ? <ArkField.RequiredIndicator /> : null}
    </ArkField.Label>
  );
}

/** Optional helper / error text rendered below the control. */
function FieldMessages({ helperText, errorText }: Pick<FieldProps, 'helperText' | 'errorText'>) {
  return (
    <>
      {helperText ? <ArkField.HelperText>{helperText}</ArkField.HelperText> : null}
      {errorText ? <ArkField.ErrorText>{errorText}</ArkField.ErrorText> : null}
    </>
  );
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  {
    label,
    helperText,
    errorText,
    showRequiredIndicator,
    size = 'medium',
    inline,
    children,
    ...rootProps
  },
  ref,
) {
  return (
    <ArkField.Root ref={ref} data-size={size} data-inline={inline ? '' : undefined} {...rootProps}>
      <FieldLabel label={label} showRequiredIndicator={showRequiredIndicator} />
      {children ?? <ArkField.Input />}
      <FieldMessages helperText={helperText} errorText={errorText} />
    </ArkField.Root>
  );
});
