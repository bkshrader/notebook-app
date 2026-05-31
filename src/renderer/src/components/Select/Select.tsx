import { forwardRef } from 'react';

import {
  Select as ArkSelect,
  createListCollection,
  type SelectRootProps,
} from '@ark-ui/react/select';
import type { CollectionItem } from '@ark-ui/react/select';

import './Select.css';

export interface SelectItem extends CollectionItem {
  label: string;
  value: string;
}

export interface SelectProps extends Omit<SelectRootProps<SelectItem>, 'collection'> {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** The items to display in the listbox. */
  items: SelectItem[];
  /** Placeholder shown when no value is selected. */
  placeholder?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  { label, items, placeholder = 'Select an option', children, ...rootProps },
  ref,
) {
  const collection = createListCollection({ items });

  return (
    <ArkSelect.Root ref={ref} collection={collection} {...rootProps}>
      <ArkSelect.Label>{label}</ArkSelect.Label>
      <ArkSelect.Control>
        <ArkSelect.Trigger>
          <ArkSelect.ValueText placeholder={placeholder} />
          <ArkSelect.Indicator>▾</ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>
      <ArkSelect.Positioner>
        <ArkSelect.Content>
          <ArkSelect.ItemGroup>
            {items.map((item) => (
              <ArkSelect.Item key={item.value} item={item}>
                <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
                <ArkSelect.ItemIndicator>✓</ArkSelect.ItemIndicator>
              </ArkSelect.Item>
            ))}
          </ArkSelect.ItemGroup>
        </ArkSelect.Content>
      </ArkSelect.Positioner>
      <ArkSelect.HiddenSelect />
      {children}
    </ArkSelect.Root>
  );
});
