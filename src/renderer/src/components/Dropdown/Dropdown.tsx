import { forwardRef } from 'react';

import { Menu as ArkMenu, type MenuRootProps } from '@ark-ui/react/menu';

import './Dropdown.css';

/**
 * Dropdown — token-styled wrapper over Ark UI's Menu, built to the Helios
 * Dropdown specification (https://helios.hashicorp.design/components/dropdown).
 *
 * A Helios Dropdown is a menu-button: a single toggle that opens a popover list
 * of actions, links, and checkable (checkbox / radio) options. It is distinct
 * from the Select (a form control); a Dropdown surfaces actions / context
 * switches OUTSIDE a form. Ark's `menu` primitive is the matching headless
 * widget (focus management, roving highlight via aria-activedescendant, Esc to
 * close, typeahead) so this is built on Ark per the unstyled-primitives-ark ADR
 * — NOT hand-rolled. It shares the Ark `menu` scope/part contract with the
 * sibling `Menu` component and reuses its visual language; the Button visual
 * language drives the toggle (filled / bordered / ghost / critical colors).
 *
 * Anatomy (mirrors the Helios spec: Toggle + List, with optional Header/Footer):
 *   Root
 *     > Trigger[data-part="trigger"]            (the Helios "Toggle")
 *         > {triggerLabel}
 *         + Indicator[data-part="indicator"]    (the Helios "Chevron")
 *     > Positioner > Content[data-part="content"]   (the Helios "List", portalled)
 *         > {children}  — DropdownParts.Item / CheckboxItem / RadioItem / …
 *
 * Tier B overlay: Content renders in a Portal OUTSIDE the story canvas. Play
 * tests query it via `document.body` / `screen`, not `within(canvasElement)`.
 *
 * The Trigger is a native `<button>` (Ark `Trigger → HTMLButtonElement`): it
 * carries `aria-haspopup` / `aria-expanded` / `aria-controls` managed by Ark and
 * draws its keyboard focus ring via the native `:focus-visible` pseudo (Ark
 * emits NO `data-focus-visible`). Helios deliberately omits a disabled state for
 * the Dropdown (it prefers enable-or-hide over disable, to avoid leaving users
 * stuck on an inert control) — so this wrapper exposes no `disabled` toggle prop.
 *
 * `color` and `size` are reflected onto the trigger as `data-color` / `data-size`
 * so the CSS color/size matrices resolve; `size` also lands on the content so its
 * typography scale matches the toggle.
 */

/** Visual color/intent of the toggle. Mirrors the Helios Dropdown toggle and
 * the Button color options. Defaults to `secondary`. */
export type DropdownColor = 'primary' | 'secondary' | 'tertiary' | 'critical';

/** Toggle size scale. Mirrors the Helios ToggleButton sizes. Defaults to
 * `medium`. */
export type DropdownSize = 'small' | 'medium';

export interface DropdownProps extends MenuRootProps {
  /**
   * Visible, screen-reader-announceable label for the toggle button.
   * Required: a button with no accessible name fails WCAG 4.1.2
   * (Name, Role, Value).
   */
  triggerLabel: React.ReactNode;
  /** Toggle color/intent. Defaults to `secondary`. */
  color?: DropdownColor;
  /** Toggle + list typography scale. Defaults to `medium`. */
  size?: DropdownSize;
  /** List content: DropdownParts.Item / CheckboxItem / RadioItem / Separator. */
  children: React.ReactNode;
}

/** The chevron indicator on the toggle. Decorative (`aria-hidden`); the label is
 * the accessible name. Ark rotates it via the trigger's `data-state`. */
function DropdownChevron() {
  return (
    <ArkMenu.Indicator aria-hidden="true">
      <svg viewBox="0 0 16 16" focusable="false">
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </ArkMenu.Indicator>
  );
}

export const Dropdown = forwardRef<HTMLButtonElement, DropdownProps>(function Dropdown(
  { triggerLabel, color = 'secondary', size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkMenu.Root {...rootProps}>
      <ArkMenu.Trigger ref={ref} data-color={color} data-size={size}>
        <span data-part="trigger-label">{triggerLabel}</span>
        <DropdownChevron />
      </ArkMenu.Trigger>
      <ArkMenu.Positioner>
        <ArkMenu.Content data-size={size}>{children}</ArkMenu.Content>
      </ArkMenu.Positioner>
    </ArkMenu.Root>
  );
});

// Re-export Ark's menu parts so consumers can build the list (Item, ItemGroup,
// ItemGroupLabel, Separator, CheckboxItem, RadioItemGroup, RadioItem,
// ItemIndicator, ItemText) without importing Ark directly.
export { ArkMenu as DropdownParts };
