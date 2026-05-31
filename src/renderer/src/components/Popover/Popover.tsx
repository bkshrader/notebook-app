import { forwardRef } from 'react';

import { Popover as ArkPopover, type PopoverRootProps } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';

import './Popover.css';

export interface PopoverProps extends PopoverRootProps {
  /**
   * Content rendered inside the popover panel. Required — a Popover with no
   * content is useless, and at minimum a title or description must be present
   * for `aria-labelledby` / `aria-describedby` wiring (WCAG 4.1.2).
   */
  content: React.ReactNode;
  /**
   * The element that opens the popover on activation. Rendered as the
   * `Popover.Trigger` child. Typically a `<button>` label string.
   * Required: every interactive control needs an accessible name.
   */
  triggerLabel: React.ReactNode;
  /**
   * Optional title shown at the top of the popover panel. When present,
   * Ark's `Popover.Title` wires `aria-labelledby` automatically.
   */
  title?: React.ReactNode;
  /**
   * Optional description shown beneath the title. When present, Ark's
   * `Popover.Description` wires `aria-describedby` automatically.
   */
  description?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Popover.
 *
 * Anatomy (from @ark-ui/react/popover):
 *   Root > Trigger
 *   Root > Portal > Positioner > Content > Title, Description, CloseTrigger
 *
 * Content is portalled to document.body via `<Portal>` so it paints above
 * all stacking contexts. Play tests MUST query the panel via
 * `within(document.body)` or `screen`, NOT `within(canvasElement)`.
 *
 * Styling attaches to Ark's `data-scope` / `data-part` attributes per the
 * unstyled-primitives-ark ADR — no custom class names.
 */
export const Popover = forwardRef<HTMLButtonElement, PopoverProps>(function Popover(
  { triggerLabel, title, description, content, children, ...rootProps },
  ref,
) {
  return (
    <ArkPopover.Root {...rootProps}>
      <ArkPopover.Trigger ref={ref}>{triggerLabel}</ArkPopover.Trigger>
      <Portal>
        <ArkPopover.Positioner>
          <ArkPopover.Content>
            {title != null && <ArkPopover.Title>{title}</ArkPopover.Title>}
            {description != null && <ArkPopover.Description>{description}</ArkPopover.Description>}
            {content}
            <ArkPopover.CloseTrigger aria-label="Close popover">✕</ArkPopover.CloseTrigger>
            {children}
          </ArkPopover.Content>
        </ArkPopover.Positioner>
      </Portal>
    </ArkPopover.Root>
  );
});
