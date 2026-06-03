import { forwardRef } from 'react';

import { Menu as ArkMenu, type MenuRootProps } from '@ark-ui/react/menu';

import './Menu.css';

/** Size scale for the trigger/content typography. Defaults to `medium`. */
export type MenuSize = 'small' | 'medium';

export interface MenuProps extends MenuRootProps {
  /**
   * Visible, screen-reader-announceable label for the trigger button.
   * Required: a button with no accessible name fails WCAG 4.1.2
   * (Name, Role, Value).
   */
  triggerLabel: React.ReactNode;
  /** Typography scale for the trigger and items. Defaults to `medium`. */
  size?: MenuSize;
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
 * The Trigger is a native `<button>` (Ark `Trigger → HTMLButtonElement`): it
 * carries `aria-haspopup`/`aria-expanded`/`aria-controls` managed by Ark, the
 * native `disabled` attribute when disabled, and triggers the keyboard focus
 * ring via the native `:focus-visible` pseudo (Ark emits NO data-focus-visible).
 *
 * Styling attaches to Ark's `data-scope` / `data-part` attributes per the
 * unstyled-primitives-ark ADR — no custom class names. `size` is reflected onto
 * the trigger and content as `data-size` so the CSS size-matrix can resolve it.
 */
export const Menu = forwardRef<HTMLButtonElement, MenuProps>(function Menu(
  { triggerLabel, size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkMenu.Root {...rootProps}>
      <ArkMenu.Trigger ref={ref} data-size={size}>
        {triggerLabel}
      </ArkMenu.Trigger>
      <ArkMenu.Positioner>
        <ArkMenu.Content data-size={size}>{children}</ArkMenu.Content>
      </ArkMenu.Positioner>
    </ArkMenu.Root>
  );
});

// Re-export Ark's item parts so consumers can build menus without importing Ark directly.
export { ArkMenu as MenuParts };
