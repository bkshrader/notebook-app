import { forwardRef } from 'react';

import {
  NavigationMenu as ArkNavigationMenu,
  type NavigationMenuRootProps,
} from '@ark-ui/react/navigation-menu';

import './NavigationMenu.css';

export interface NavigationMenuItemConfig {
  /** Unique value that identifies this item (required by Ark). */
  value: string;
  /** Visible label rendered inside the trigger button. */
  label: string;
  /** Links shown in the dropdown content panel. */
  links?: Array<{ href: string; label: string }>;
  /** When true, renders a plain link instead of a trigger+content pair. */
  isLink?: boolean;
  /** href when isLink is true. */
  href?: string;
}

export interface NavigationMenuProps extends Omit<NavigationMenuRootProps, 'children'> {
  /**
   * Navigation items to render. Required for an accessible navigation landmark
   * (WCAG 4.1.2 Name, Role, Value): each trigger carries its item label and
   * the nav element itself is labelled via `aria-label`.
   */
  items: NavigationMenuItemConfig[];
  /**
   * Accessible name for the `<nav>` landmark. Required when the page has
   * multiple navigation regions so screen-reader users can distinguish them.
   * Defaults to "Main navigation".
   */
  'aria-label'?: string;
}

/**
 * Token-styled wrapper over Ark UI's NavigationMenu.
 *
 * Anatomy (Ark v5): Root > List > Item > Trigger + Content | Link.
 * Content renders in a portal and is positioned absolutely relative to the
 * item (Tier B overlay). The Content/Viewport exit/enter is animated and
 * suppressed under reduced-motion.
 *
 * Styling uses `data-scope`/`data-part` attribute selectors (per the
 * unstyled-primitives-ark ADR) — no custom class names.
 */
export const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(function NavigationMenu(
  { items, 'aria-label': ariaLabel = 'Main navigation', ...rootProps },
  ref,
) {
  return (
    <ArkNavigationMenu.Root ref={ref} aria-label={ariaLabel} {...rootProps}>
      <ArkNavigationMenu.List>
        {items.map((item) =>
          item.isLink ? (
            <ArkNavigationMenu.Item key={item.value} value={item.value}>
              <ArkNavigationMenu.Link href={item.href ?? '#'}>{item.label}</ArkNavigationMenu.Link>
            </ArkNavigationMenu.Item>
          ) : (
            <ArkNavigationMenu.Item key={item.value} value={item.value}>
              <ArkNavigationMenu.Trigger>{item.label}</ArkNavigationMenu.Trigger>
              <ArkNavigationMenu.Content>
                {item.links?.map((link) => (
                  <ArkNavigationMenu.Link key={link.href} href={link.href}>
                    {link.label}
                  </ArkNavigationMenu.Link>
                ))}
              </ArkNavigationMenu.Content>
            </ArkNavigationMenu.Item>
          ),
        )}
      </ArkNavigationMenu.List>
    </ArkNavigationMenu.Root>
  );
});
