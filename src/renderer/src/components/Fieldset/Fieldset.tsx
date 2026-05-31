import { forwardRef } from 'react';

import { Fieldset as ArkFieldset, type FieldsetRootProps } from '@ark-ui/react/fieldset';

import './Fieldset.css';

export interface FieldsetProps extends FieldsetRootProps {
  /**
   * Visible legend text for the fieldset group. Required: a fieldset with no
   * legend fails WCAG 1.3.1 (Info and Relationships) — screen readers announce
   * the legend as the group label for all contained controls.
   */
  legend: React.ReactNode;
  /** Optional helper text rendered below the legend. */
  helperText?: React.ReactNode;
  /** Optional error text rendered when `invalid` is true. */
  errorText?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Fieldset.
 *
 * Anatomy (from @ark-ui/react/fieldset): Root > Legend, HelperText, ErrorText.
 * The Root renders a native `<fieldset>` element; Legend renders `<legend>`;
 * HelperText and ErrorText render `<span>` elements. Ark/Zag wire
 * `data-disabled` / `data-invalid` state attributes on each part for styling.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Fieldset.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Fieldset = forwardRef<HTMLFieldSetElement, FieldsetProps>(function Fieldset(
  { legend, helperText, errorText, children, ...rootProps },
  ref,
) {
  return (
    <ArkFieldset.Root ref={ref} {...rootProps}>
      <ArkFieldset.Legend>{legend}</ArkFieldset.Legend>
      {helperText != null && <ArkFieldset.HelperText>{helperText}</ArkFieldset.HelperText>}
      {children}
      {errorText != null && <ArkFieldset.ErrorText>{errorText}</ArkFieldset.ErrorText>}
    </ArkFieldset.Root>
  );
});
