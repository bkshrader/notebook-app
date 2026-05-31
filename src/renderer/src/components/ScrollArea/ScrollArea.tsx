import { forwardRef } from 'react';

import { ScrollArea as ArkScrollArea, type ScrollAreaRootProps } from '@ark-ui/react/scroll-area';

import './ScrollArea.css';

export interface ScrollAreaProps extends ScrollAreaRootProps {
  /** Content to render inside the scroll area. */
  children: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's ScrollArea.
 *
 * Anatomy (from @ark-ui/react/scroll-area):
 *   Root > Viewport > Content
 *   Root > Scrollbar (orientation="vertical") > Thumb
 *   Root > Scrollbar (orientation="horizontal") > Thumb
 *   Root > Corner
 *
 * The Viewport is the focusable, scrollable element (tabindex=0 via Ark/Zag).
 * Scrollbars are rendered via custom elements styled with data-scope/data-part
 * per the unstyled-primitives-ark ADR — no custom class names.
 *
 * Both vertical and horizontal scrollbars are rendered; each hides itself via
 * CSS when the content does not overflow in its axis (data-overflow-y /
 * data-overflow-x are absent).
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { children, ...rootProps },
  ref,
) {
  return (
    <ArkScrollArea.Root ref={ref} {...rootProps}>
      <ArkScrollArea.Viewport>
        <ArkScrollArea.Content>{children}</ArkScrollArea.Content>
      </ArkScrollArea.Viewport>
      <ArkScrollArea.Scrollbar orientation="vertical">
        <ArkScrollArea.Thumb />
      </ArkScrollArea.Scrollbar>
      <ArkScrollArea.Scrollbar orientation="horizontal">
        <ArkScrollArea.Thumb />
      </ArkScrollArea.Scrollbar>
      <ArkScrollArea.Corner />
    </ArkScrollArea.Root>
  );
});
