import { forwardRef } from 'react';

import { Portal } from '@ark-ui/react/portal';
import { Tooltip as ArkTooltip, type TooltipRootProps } from '@ark-ui/react/tooltip';

import './Tooltip.css';

export interface TooltipProps extends TooltipRootProps {
  /** The tooltip content text or node. Required for a non-empty tooltip (WCAG 1.3.1). */
  content: React.ReactNode;
  /**
   * The element that triggers the tooltip. Must be a focusable element so
   * keyboard users can access the tooltip (WCAG 2.1.1 + 1.4.13).
   */
  children: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Tooltip.
 *
 * Anatomy (from @ark-ui/react/tooltip): Root > Trigger, then Portal >
 * Positioner > Content > Arrow > ArrowTip. The content renders in a Portal
 * outside the DOM tree of the trigger (TIER B overlay).
 *
 * The trigger is exposed via `children` — it must be a focusable element so
 * keyboard users can access the tooltip (WCAG 2.1.1 + 1.4.13 Non-text
 * Contrast). Tooltip content is available on both hover AND keyboard focus.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (see Tooltip.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(function Tooltip(
  { content, children, ...rootProps },
  ref,
) {
  return (
    <ArkTooltip.Root {...rootProps}>
      <ArkTooltip.Trigger asChild>{children}</ArkTooltip.Trigger>
      <Portal>
        <ArkTooltip.Positioner>
          <ArkTooltip.Content ref={ref}>
            <ArkTooltip.Arrow>
              <ArkTooltip.ArrowTip />
            </ArkTooltip.Arrow>
            {content}
          </ArkTooltip.Content>
        </ArkTooltip.Positioner>
      </Portal>
    </ArkTooltip.Root>
  );
});
