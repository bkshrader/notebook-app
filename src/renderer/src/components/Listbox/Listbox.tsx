import { forwardRef } from 'react';

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

export interface ListboxProps extends Omit<ListboxRootProps<ListboxItem>, 'collection'> {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * The listbox role is announced by its aria-labelledby reference to this element.
   */
  label: React.ReactNode;
  /** The flat list of items to render. Passed through createListCollection internally. */
  items: ListboxItem[];
}

/**
 * Token-styled wrapper over Ark UI's Listbox.
 *
 * Anatomy (from @ark-ui/react/listbox): Root > Label, Content > Item > ItemText + ItemIndicator.
 * The Listbox.Content carries role="listbox"; each Listbox.Item carries role="option".
 * Ark/Zag own focus management, keyboard navigation (arrows, Home, End, type-ahead),
 * and aria-selected state.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see Listbox.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Listbox = forwardRef<HTMLDivElement, ListboxProps>(function Listbox(
  { label, items, children, ...rootProps },
  ref,
) {
  const collection = createListCollection({ items });

  return (
    <ArkListbox.Root ref={ref} collection={collection} {...rootProps}>
      <ArkListbox.Label>{label}</ArkListbox.Label>
      <ArkListbox.Content>
        {items.map((item) => (
          <ArkListbox.Item key={item.value} item={item}>
            <ArkListbox.ItemText>{item.label}</ArkListbox.ItemText>
            <ArkListbox.ItemIndicator>&#10003;</ArkListbox.ItemIndicator>
          </ArkListbox.Item>
        ))}
      </ArkListbox.Content>
      {children}
    </ArkListbox.Root>
  );
});
