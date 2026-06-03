import { forwardRef } from 'react';

import { Dialog as ArkDialog, type DialogRootProps } from '@ark-ui/react/dialog';
import { Portal } from '@ark-ui/react/portal';

import './Dialog.css';

export interface DialogProps extends DialogRootProps {
  /**
   * Visible title rendered inside the dialog panel. Required: a dialog without
   * an accessible name fails WCAG 4.1.2 (Name, Role, Value). Pass a string for
   * the common case; pass a node when you need richer title markup.
   */
  title: React.ReactNode;
  /**
   * Optional description rendered below the title. Provides additional context
   * for screen reader users (aria-describedby is wired automatically by Ark).
   */
  description?: React.ReactNode;
  /**
   * Label for the trigger button. Defaults to "Open".
   */
  triggerLabel?: React.ReactNode;
  /**
   * Visible label for the close button. Defaults to "Close". The same string is
   * used as the button's accessible name.
   */
  closeLabel?: string;
  /**
   * Content rendered inside the dialog panel (form fields, body text, actions).
   */
  children?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Dialog.
 *
 * Anatomy (from @ark-ui/react/dialog): Root > Trigger; Portal > Backdrop,
 * Positioner > Content > Title, Description, CloseTrigger. Ark/Zag own the
 * wiring (verified against the live DOM): the Content (an HTMLDivElement)
 * receives role="dialog" with aria-labelledby pointing at the Title — which Ark
 * renders as a semantic <h2> heading — and aria-describedby pointing at the
 * Description.
 *
 * Behavioral props (role 'dialog' | 'alertdialog', trapFocus, closeOnEscape,
 * closeOnInteractOutside, initialFocusEl, modal, open/defaultOpen, …) flow
 * straight through from Ark's DialogRootProps via the {...rootProps} spread, so
 * the wrapper does not redeclare them.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see
 * Dialog.css) per the unstyled-primitives-ark ADR — no custom class names.
 *
 * This is a Tier B overlay component: content renders in a Portal outside the
 * story canvas. Play tests must query via document.body, not canvasElement.
 */
export const Dialog = forwardRef<HTMLButtonElement, DialogProps>(function Dialog(
  { title, description, triggerLabel = 'Open', closeLabel = 'Close', children, ...rootProps },
  ref,
) {
  return (
    <ArkDialog.Root {...rootProps}>
      <ArkDialog.Trigger ref={ref}>{triggerLabel}</ArkDialog.Trigger>
      <Portal>
        <ArkDialog.Backdrop />
        <ArkDialog.Positioner>
          <ArkDialog.Content>
            <ArkDialog.Title>{title}</ArkDialog.Title>
            {description != null && <ArkDialog.Description>{description}</ArkDialog.Description>}
            {children}
            <ArkDialog.CloseTrigger aria-label={closeLabel}>{closeLabel}</ArkDialog.CloseTrigger>
          </ArkDialog.Content>
        </ArkDialog.Positioner>
      </Portal>
    </ArkDialog.Root>
  );
});
