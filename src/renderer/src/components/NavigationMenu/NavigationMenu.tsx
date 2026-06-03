import { forwardRef } from 'react';

import {
  NavigationMenu as ArkNavigationMenu,
  type NavigationMenuRootProps,
} from '@ark-ui/react/navigation-menu';

import './NavigationMenu.css';

/** Size scale for trigger/link padding, typography, and chevron size. */
export type NavigationMenuSize = 'small' | 'medium' | 'large';

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
  /** Disables the item — its trigger becomes inert and is dimmed. */
  disabled?: boolean;
}

export interface NavigationMenuProps extends Omit<NavigationMenuRootProps, 'children'> {
  /**
   * Navigation items to render. Required for an accessible navigation landmark
   * (WCAG 4.1.2 Name, Role, Value): each trigger carries its item label and
   * the nav element itself is labelled via `aria-label`.
   */
  items: NavigationMenuItemConfig[];
  /**
   * Size scale. Drives the per-size `--nav-*` custom properties (padding,
   * font size, chevron size) consumed by the trigger and link parts.
   * Defaults to `medium`.
   */
  size?: NavigationMenuSize;
  /**
   * Accessible name for the `<nav>` landmark. Required when the page has
   * multiple navigation regions so screen-reader users can distinguish them.
   * Defaults to "Main navigation".
   */
  'aria-label'?: string;
}

/**
 * Persistent downward chevron rendered as a direct child of each expandable
 * Trigger. It rotates 180° while the item is open, keyed off the Trigger's own
 * `data-state` (see NavigationMenu.css).
 *
 * It is deliberately NOT wrapped in Ark's `ItemIndicator`: in Ark v5's
 * NavigationMenu the ItemIndicator part carries the native `hidden` attribute
 * whenever its item is closed (zag `getItemIndicatorProps` →
 * `hidden: !itemState.selected`), so wrapping the chevron in it would make the
 * chevron vanish when collapsed instead of staying visible and rotating. A
 * plain `aria-hidden` SVG inside the button is the always-visible affordance —
 * the trigger's text label already names the control.
 */
function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/**
 * Token-styled wrapper over Ark UI's NavigationMenu.
 *
 * Anatomy (Ark v5): Root > List > Item > Trigger (+ a persistent chevron SVG) +
 * Content | Link. Content is positioned absolutely relative to the item (Tier B
 * overlay) and its enter/exit is animated, suppressed under reduced-motion.
 *
 * Styling uses `data-scope`/`data-part` attribute selectors (per the
 * unstyled-primitives-ark ADR) — no custom class names. Disabled triggers carry
 * the native `disabled` attribute AND Ark's `data-disabled`; the CSS matches
 * both. The keyboard focus ring uses the native `:focus-visible` pseudo — Ark
 * does NOT emit `data-focus-visible`.
 */
export const NavigationMenu = forwardRef<HTMLElement, NavigationMenuProps>(function NavigationMenu(
  { items, size = 'medium', 'aria-label': ariaLabel = 'Main navigation', ...rootProps },
  ref,
) {
  return (
    <ArkNavigationMenu.Root ref={ref} aria-label={ariaLabel} data-size={size} {...rootProps}>
      <ArkNavigationMenu.List>
        {items.map((item) =>
          item.isLink ? (
            <ArkNavigationMenu.Item key={item.value} value={item.value} disabled={item.disabled}>
              <ArkNavigationMenu.Link href={item.href ?? '#'}>{item.label}</ArkNavigationMenu.Link>
            </ArkNavigationMenu.Item>
          ) : (
            <ArkNavigationMenu.Item key={item.value} value={item.value} disabled={item.disabled}>
              <ArkNavigationMenu.Trigger>
                {item.label}
                <ChevronIcon />
              </ArkNavigationMenu.Trigger>
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
