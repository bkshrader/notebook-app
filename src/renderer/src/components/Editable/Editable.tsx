import { forwardRef } from 'react';

import { Editable as ArkEditable, type EditableRootProps } from '@ark-ui/react/editable';

import './Editable.css';

/** Size scale for padding and typography. Defaults to `medium`. */
export type EditableSize = 'small' | 'medium' | 'large';

/**
 * Visual variant.
 * - `default` — the input/preview carry the standard form-control chrome.
 * - `ghost` — the input chrome is transparent at rest (the field reads as
 *   plain text) and only the keyboard focus ring appears; suited to dense
 *   inline edit-in-place rows.
 */
export type EditableVariant = 'default' | 'ghost';

export interface EditableProps extends EditableRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * Rendered as a `<label>` via Ark's EditableLabel, associated with the input.
   */
  label: React.ReactNode;
  /** Size scale for padding and typography. Defaults to `medium`. */
  size?: EditableSize;
  /** Visual variant. Defaults to `default`. */
  variant?: EditableVariant;
}

/**
 * Token-styled wrapper over Ark UI's Editable.
 *
 * Anatomy (from @ark-ui/react/editable):
 *   Root > Label, Area > (Input, Preview), Control > (EditTrigger, SubmitTrigger, CancelTrigger)
 *
 * The component surfaces the full edit-in-place pattern:
 * - Preview displays the current value (or placeholder); clicking/focusing it
 *   enters edit mode (configurable via `activationMode`).
 * - Input receives focus in edit mode; Enter/blur commits (configurable via `submitMode`).
 * - Control holds the optional trigger buttons for edit/submit/cancel.
 *
 * Styling is attached exclusively to Ark's `data-scope`/`data-part` attributes
 * (per the unstyled-primitives-ark ADR) — no custom class names.
 */
export const Editable = forwardRef<HTMLDivElement, EditableProps>(function Editable(
  { label, children, size = 'medium', variant = 'default', ...rootProps },
  ref,
) {
  return (
    <ArkEditable.Root ref={ref} data-size={size} data-variant={variant} {...rootProps}>
      <ArkEditable.Label>{label}</ArkEditable.Label>
      <ArkEditable.Area>
        <ArkEditable.Input />
        {/*
         * Ark/Zag sets aria-readonly="true" on the preview <span> when readOnly
         * is true, but <span> has implicit role="generic" which does not support
         * aria-readonly (axe rule: aria-allowed-attr). The readonly state is
         * correctly conveyed by aria-readonly on the <input> itself. Pass null
         * to strip the invalid attribute from this presentational span.
         */}
        <ArkEditable.Preview aria-readonly={null as unknown as boolean | undefined} />
      </ArkEditable.Area>
      <ArkEditable.Control>
        <ArkEditable.EditTrigger>Edit</ArkEditable.EditTrigger>
        <ArkEditable.SubmitTrigger>Save</ArkEditable.SubmitTrigger>
        <ArkEditable.CancelTrigger>Cancel</ArkEditable.CancelTrigger>
      </ArkEditable.Control>
      {children}
    </ArkEditable.Root>
  );
});
