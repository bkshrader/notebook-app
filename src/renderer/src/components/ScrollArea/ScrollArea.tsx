import { forwardRef } from 'react';

import { ScrollArea as ArkScrollArea, type ScrollAreaRootProps } from '@ark-ui/react/scroll-area';

import './ScrollArea.css';

/**
 * Size scale, set once at the group level. Drives the custom scrollbar/thumb
 * thickness via the `--scroll-area-scrollbar-size` local property (see
 * ScrollArea.css). Defaults to `medium`.
 */
export type ScrollAreaSize = 'small' | 'medium' | 'large';

export interface ScrollAreaProps extends ScrollAreaRootProps {
  /** Content to render inside the scroll area. */
  children: React.ReactNode;
  /** Scrollbar thickness scale. Defaults to `medium`. */
  size?: ScrollAreaSize;
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
 * The Viewport is the scrollable element. Ark/Zag does NOT set a tabindex on it,
 * so we add `tabIndex={0}` explicitly: a scrollable region must be keyboard-
 * focusable or it fails WCAG 2.1.1 (axe `scrollable-region-focusable`) — users
 * who can't use a pointer otherwise can't scroll the overflow.
 * Scrollbars are rendered via custom elements styled with data-scope/data-part
 * per the unstyled-primitives-ark ADR — no custom class names.
 *
 * Both vertical and horizontal scrollbars are rendered; each hides itself via
 * CSS when the content does not overflow in its axis (data-overflow-y /
 * data-overflow-x are absent).
 *
 * The keyboard focus ring renders on the Viewport via the native
 * `:focus-visible` pseudo — Ark scroll-area exposes no data-focus-visible
 * attribute (verified against the Ark scroll-area styling guide).
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(function ScrollArea(
  { children, size = 'medium', ...rootProps },
  ref,
) {
  return (
    <ArkScrollArea.Root ref={ref} data-size={size} {...rootProps}>
      <ArkScrollArea.Viewport tabIndex={0}>
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
