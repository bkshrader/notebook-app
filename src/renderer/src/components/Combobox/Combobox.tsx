import { useState } from 'react';

import {
  Combobox as ArkCombobox,
  createListCollection,
  type ComboboxRootProps,
  type CollectionItem,
} from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';

import './Combobox.css';

export interface ComboboxItem extends CollectionItem {
  label: string;
  value: string;
}

export interface ComboboxProps extends Omit<
  ComboboxRootProps<ComboboxItem>,
  'collection' | 'children'
> {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: string;
  /** Static list of items. Each item must have a `label` and `value` string. */
  items: ComboboxItem[];
  /** Placeholder text for the text input. */
  placeholder?: string;
}

/**
 * Token-styled wrapper over Ark UI's Combobox.
 *
 * Anatomy (from @ark-ui/react/combobox): Root > Label, Control (Input +
 * Trigger + ClearTrigger) > Positioner > Content > Item (ItemText +
 * ItemIndicator). The content panel renders in a Portal so it layers correctly
 * above other UI. Keyboard navigation (arrows, Enter, Escape, type-ahead) is
 * handled entirely by Ark/Zag.
 *
 * Filtering is client-side substring match on `label`. The `items` prop is the
 * full source of truth; this component owns the filtered collection state.
 *
 * Styling targets Ark's data-scope/data-part attributes (see Combobox.css) per
 * the unstyled-primitives-ark ADR — no custom class names.
 */
export function Combobox({ label, items, placeholder, ...rootProps }: ComboboxProps) {
  const [inputValue, setInputValue] = useState('');

  const filtered = inputValue
    ? items.filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
    : items;

  const collection = createListCollection({ items: filtered });

  return (
    <ArkCombobox.Root
      collection={collection}
      onInputValueChange={({ inputValue: val }) => setInputValue(val)}
      openOnClick
      {...rootProps}
    >
      <ArkCombobox.Label>{label}</ArkCombobox.Label>
      <ArkCombobox.Control>
        <ArkCombobox.Input placeholder={placeholder} />
        <ArkCombobox.ClearTrigger aria-label="Clear selection">✕</ArkCombobox.ClearTrigger>
        <ArkCombobox.Trigger aria-label="Toggle options">▾</ArkCombobox.Trigger>
      </ArkCombobox.Control>
      <Portal>
        <ArkCombobox.Positioner>
          <ArkCombobox.Content>
            {filtered.length === 0 ? (
              <ArkCombobox.Empty>No results found</ArkCombobox.Empty>
            ) : (
              filtered.map((item) => (
                <ArkCombobox.Item key={item.value} item={item}>
                  <ArkCombobox.ItemText>{item.label}</ArkCombobox.ItemText>
                  <ArkCombobox.ItemIndicator>✓</ArkCombobox.ItemIndicator>
                </ArkCombobox.Item>
              ))
            )}
          </ArkCombobox.Content>
        </ArkCombobox.Positioner>
      </Portal>
    </ArkCombobox.Root>
  );
}
