import { forwardRef } from 'react';

import { Clipboard as ArkClipboard, type ClipboardRootProps } from '@ark-ui/react/clipboard';

import './Clipboard.css';

export interface ClipboardProps extends ClipboardRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2 Name, Role,
   * Value). Rendered via Ark's ClipboardLabel which is associated with the
   * control via the machine's `getLabelProps`.
   */
  label: React.ReactNode;
  /**
   * Content rendered inside the copy trigger button. Defaults to the text
   * "Copy" when omitted. For icon-only triggers, pass an icon element and
   * also supply `aria-label` on the trigger via `triggerProps`.
   */
  triggerLabel?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Clipboard.
 *
 * Anatomy (from @ark-ui/react/clipboard):
 *   Root > Label, Control > Input + Trigger > Indicator
 *
 * Ark/Zag manage the copied state and expose it through data-attributes which
 * the CSS targets (verified against the Ark styling guide for `clipboard`):
 *   data-copied   — present on EVERY part once the value is copied (the "copied"
 *                   state); the resting state has no data attribute.
 *   data-readonly — present on the Input only.
 * `data-scope`/`data-part` are structural anchors, not state. Ark emits NO
 * data-focus-visible; the Trigger is a native <button> styled via :focus-visible.
 * No custom class names — see the unstyled-primitives-ark ADR.
 *
 * The trigger is a <button> with an accessible name derived from either the
 * Indicator's rendered text or an explicit aria-label the caller passes through
 * ClipboardRootProps.
 */
export const Clipboard = forwardRef<HTMLDivElement, ClipboardProps>(function Clipboard(
  { label, triggerLabel = 'Copy', children, ...rootProps },
  ref,
) {
  return (
    <ArkClipboard.Root ref={ref} {...rootProps}>
      <ArkClipboard.Label>{label}</ArkClipboard.Label>
      <ArkClipboard.Control>
        <ArkClipboard.Input />
        <ArkClipboard.Trigger>
          <ArkClipboard.Indicator copied="Copied">{triggerLabel}</ArkClipboard.Indicator>
        </ArkClipboard.Trigger>
      </ArkClipboard.Control>
      {children}
    </ArkClipboard.Root>
  );
});
