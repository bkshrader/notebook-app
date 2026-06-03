import { forwardRef, useState } from 'react';

import {
  Combobox as ArkCombobox,
  createListCollection,
  type ComboboxRootProps,
  type CollectionItem,
} from '@ark-ui/react/combobox';
import { Portal } from '@ark-ui/react/portal';

import './SuperSelect.css';

export interface SuperSelectItem extends CollectionItem {
  label: string;
  value: string;
  disabled?: boolean;
}

/** Size scale for control padding, typography, and toggle-icon size. */
export type SuperSelectSize = 'small' | 'medium' | 'large';

export interface SuperSelectProps extends Omit<
  ComboboxRootProps<SuperSelectItem>,
  'collection' | 'children'
> {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: string;
  /** Static list of options. Each item must have a `label` and `value` string. */
  items: SuperSelectItem[];
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Size scale for padding, typography, and icon size. Defaults to `medium`. */
  size?: SuperSelectSize;
}

/**
 * Selected-chip row — only rendered in `multiple` mode. Reads the live
 * selection off Ark's Combobox.Context so the chips stay in sync with the
 * machine without lifting state. Each chip exposes a delete button so the
 * selection is removable by keyboard and pointer (the button is part of Ark's
 * combobox keyboard surface — it does not steal the input's roving focus).
 */
function SelectedChips() {
  return (
    <ArkCombobox.Context>
      {(combobox) => {
        // Ark's Context render-prop is not generically typed, so selectedItems
        // is unknown[] here — narrow it to our item shape once.
        const selected = combobox.selectedItems as SuperSelectItem[];
        if (selected.length === 0) return null;
        return (
          <div data-part="chips" data-scope="super-select">
            {selected.map((item) => (
              <span key={item.value} data-part="chip" data-scope="super-select">
                <span data-part="chip-text" data-scope="super-select">
                  {item.label}
                </span>
                <button
                  type="button"
                  data-part="chip-remove"
                  data-scope="super-select"
                  aria-label={`Remove ${item.label}`}
                  onClick={() => combobox.setValue(combobox.value.filter((v) => v !== item.value))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        );
      }}
    </ArkCombobox.Context>
  );
}

/**
 * Token-styled wrapper over Ark UI's Combobox, built to the Helios Super Select
 * specification (https://helios.hashicorp.design/components/form/super-select):
 * an enhanced, searchable/filterable Select that supports single OR multiple
 * selection. In `multiple` mode, committed options surface as removable pill
 * chips above the control.
 *
 * Anatomy (from @ark-ui/react/combobox): Root > Label, [Chips], Control (Input +
 * Trigger) > Positioner > Content > Item (ItemText + ItemIndicator) / Empty. The
 * content panel renders in a Portal so it layers above other UI. Keyboard
 * navigation (arrows, Enter, Escape, type-ahead) is handled entirely by Ark/Zag.
 *
 * Filtering is client-side substring match on `label`; `items` is the full
 * source of truth and this component owns the filtered collection state.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR) — no custom class names. The chip row is our own
 * presentational markup (Ark has no chip part), so it carries explicit
 * `data-scope="super-select"` / `data-part` attributes styled the same way.
 */
export const SuperSelect = forwardRef<HTMLDivElement, SuperSelectProps>(function SuperSelect(
  { label, items, placeholder, size = 'medium', multiple, ...rootProps },
  ref,
) {
  const [inputValue, setInputValue] = useState('');

  const filtered = inputValue
    ? items.filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
    : items;

  const collection = createListCollection({
    items: filtered,
    isItemDisabled: (item) => Boolean(item.disabled),
  });

  return (
    <ArkCombobox.Root
      ref={ref}
      collection={collection}
      onInputValueChange={({ inputValue: val }) => setInputValue(val)}
      multiple={multiple}
      openOnClick
      data-size={size}
      {...rootProps}
    >
      <ArkCombobox.Label>{label}</ArkCombobox.Label>
      {multiple ? <SelectedChips /> : null}
      <ArkCombobox.Control>
        <ArkCombobox.Input placeholder={placeholder} />
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
});
