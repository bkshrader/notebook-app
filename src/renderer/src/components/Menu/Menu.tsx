import { forwardRef } from 'react';

import { Menu as ArkMenu, type MenuRootProps } from '@ark-ui/react/menu';

import './Menu.css';

export interface MenuProps extends MenuRootProps {
  /**
   * Visible, screen-reader-announceable label for the trigger button.
   * Required: a button with no accessible name fails WCAG 4.1.2
   * (Name, Role, Value).
   */
  triggerLabel: React.ReactNode;
  /** Menu items to render inside Menu.Content. */
  children: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Menu.
 *
 * Anatomy: Root > Trigger, Positioner > Content > Item(s).
 * Content renders in a Portal (Tier B overlay) — it lives outside the story
 * canvas element. Play tests must query it via `document.body` or `screen`,
 * not `within(canvasElement)`.
 *
 * Styling attaches to Ark's `data-scope` / `data-part` attributes per the
 * unstyled-primitives-ark ADR — no custom class names.
 */
export const Menu = forwardRef<HTMLButtonElement, MenuProps>(function Menu(
  { triggerLabel, children, ...rootProps },
  ref,
) {
  return (
    <ArkMenu.Root {...rootProps}>
      <ArkMenu.Trigger ref={ref}>{triggerLabel}</ArkMenu.Trigger>
      <ArkMenu.Positioner>
        <ArkMenu.Content>{children}</ArkMenu.Content>
      </ArkMenu.Positioner>
    </ArkMenu.Root>
  );
});

// Re-export Ark's item parts so consumers can build menus without importing Ark directly.
export { ArkMenu as MenuParts };
