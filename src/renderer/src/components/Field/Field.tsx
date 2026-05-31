import { forwardRef } from 'react';

import { Field as ArkField, type FieldRootProps } from '@ark-ui/react/field';

import './Field.css';

export interface FieldProps extends FieldRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Optional helper text rendered below the input. */
  helperText?: React.ReactNode;
  /** Error message rendered when `invalid` is true. */
  errorText?: React.ReactNode;
  /** Whether to render a required indicator (*) next to the label. */
  showRequiredIndicator?: boolean;
  /** The input element to render inside the field. Defaults to a text input. */
  children?: React.ReactNode;
}

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, helperText, errorText, showRequiredIndicator, children, ...rootProps },
  ref,
) {
  return (
    <ArkField.Root ref={ref} {...rootProps}>
      <ArkField.Label>
        {label}
        {showRequiredIndicator && <ArkField.RequiredIndicator />}
      </ArkField.Label>
      {children ?? <ArkField.Input />}
      {helperText && <ArkField.HelperText>{helperText}</ArkField.HelperText>}
      {errorText && <ArkField.ErrorText>{errorText}</ArkField.ErrorText>}
    </ArkField.Root>
  );
});
