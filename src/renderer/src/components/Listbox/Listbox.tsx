import { forwardRef } from 'react';
import type { CSSProperties } from 'react';

import {
  Listbox as ArkListbox,
  type ListboxRootProps,
  createListCollection,
} from '@ark-ui/react/listbox';

import './Listbox.css';

export interface ListboxItem {
  label: string;
  value: string;
  disabled?: boolean;
}

/** Helios size scale. Drives the `data-size` attribute consumed by Listbox.css. */
export type ListboxSize = 'sm' | 'md' | 'lg';

export interface ListboxProps extends Omit<ListboxRootProps<ListboxItem>, 'collection'> {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * The listbox role is announced by its aria-labelledby reference to this element.
   */
  label: React.ReactNode;
  /** The flat list of items to render. Passed through createListCollection internally. */
  items: ListboxItem[];
  /**
   * Visual density of the list. Scales item height and text. Defaults to `md`.
   * Surfaced as `data-size` on the Root for the CSS size scale.
   */
  size?: ListboxSize;
  /**
   * Max visible height of the scrollable content before it scrolls. Any CSS
   * length (e.g. `'12rem'`, `'240px'`). Defaults to the size-scale value
   * (18rem at `md`). Set as the `--listbox-max-block-size` custom property.
   */
  maxHeight?: string;
}

/**
 * Token-styled wrapper over Ark UI's Listbox.
 *
 * Anatomy (from @ark-ui/react/listbox): Root > Label, Content > Item > ItemText + ItemIndicator.
 * The Listbox.Content carries role="listbox" and tabindex="0" (it is the focusable node);
 * each Listbox.Item carries role="option" with aria-selected. Ark/Zag own focus management,
 * keyboard navigation (arrows, Home, End, type-ahead), and aria-selected state via
 * aria-activedescendant — DOM focus stays on Content while data-highlighted moves.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see Listbox.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Listbox = forwardRef<HTMLDivElement, ListboxProps>(function Listbox(
  { label, items, children, size = 'md', maxHeight, style, ...rootProps },
  ref,
) {
  const collection = createListCollection({ items });

  const rootStyle: CSSProperties | undefined = maxHeight
    ? { ...style, ['--listbox-max-block-size' as string]: maxHeight }
    : style;

  return (
    <ArkListbox.Root
      ref={ref}
      collection={collection}
      data-size={size}
      style={rootStyle}
      {...rootProps}
    >
      <ArkListbox.Label>{label}</ArkListbox.Label>
      <ArkListbox.Content>
        {items.map((item) => (
          <ArkListbox.Item key={item.value} item={item}>
            <ArkListbox.ItemText>{item.label}</ArkListbox.ItemText>
            {/* The checkmark is purely decorative paint; the selection state is
             * already exposed to AT via aria-selected on the option (role).
             * Hide the glyph from the a11y tree so screen readers don't read a
             * stray "✓" / "check mark" alongside the announced selected state. */}
            <ArkListbox.ItemIndicator aria-hidden="true">&#10003;</ArkListbox.ItemIndicator>
          </ArkListbox.Item>
        ))}
      </ArkListbox.Content>
      {children}
    </ArkListbox.Root>
  );
});
