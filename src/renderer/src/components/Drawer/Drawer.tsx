import { forwardRef } from 'react';

import { Drawer as ArkDrawer, type DrawerRootProps } from '@ark-ui/react/drawer';

import './Drawer.css';

export interface DrawerProps extends DrawerRootProps {
  /**
   * Visible title rendered inside the drawer panel. Required: a drawer without
   * an accessible name fails WCAG 4.1.2 (Name, Role, Value). Pass a string for
   * the common case; pass a node when you need richer title markup.
   */
  title: React.ReactNode;
  /**
   * Label for the trigger button. Defaults to "Open".
   */
  triggerLabel?: React.ReactNode;
  /**
   * Content rendered inside the drawer panel (body text, actions, etc.).
   */
  children?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Drawer.
 *
 * Anatomy (from @ark-ui/react/drawer): Root > Trigger; Backdrop, Positioner >
 * Content > Grabber > GrabberIndicator, Title, CloseTrigger. Ark/Zag own the
 * wiring: the Content receives role="dialog" with aria-labelledby wired to the
 * Title automatically.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see
 * Drawer.css) per the unstyled-primitives-ark ADR — no custom class names.
 *
 * This is a Tier B overlay component: content renders in a Portal outside the
 * story canvas. Play tests must query via document.body, not canvasElement.
 */
export const Drawer = forwardRef<HTMLButtonElement, DrawerProps>(function Drawer(
  { title, triggerLabel = 'Open', children, ...rootProps },
  ref,
) {
  return (
    <ArkDrawer.Root {...rootProps}>
      <ArkDrawer.Trigger ref={ref}>{triggerLabel}</ArkDrawer.Trigger>
      <ArkDrawer.Backdrop />
      <ArkDrawer.Positioner>
        <ArkDrawer.Content>
          <ArkDrawer.Grabber>
            <ArkDrawer.GrabberIndicator />
          </ArkDrawer.Grabber>
          <ArkDrawer.Title>{title}</ArkDrawer.Title>
          {children}
          <ArkDrawer.CloseTrigger>Close</ArkDrawer.CloseTrigger>
        </ArkDrawer.Content>
      </ArkDrawer.Positioner>
    </ArkDrawer.Root>
  );
});
