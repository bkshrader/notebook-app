import { forwardRef } from 'react';

import { Portal } from '@ark-ui/react/portal';
import {
  Select as ArkSelect,
  createListCollection,
  type SelectRootProps,
  type CollectionItem,
} from '@ark-ui/react/select';

import './Select.css';

export interface SelectItem extends CollectionItem {
  label: string;
  value: string;
}

/** Size scale, set once at the group level (drives padding, typography). */
export type SelectSize = 'small' | 'medium' | 'large';

export interface SelectProps extends Omit<SelectRootProps<SelectItem>, 'collection'> {
  /**
   * Visible, screen-reader-announceable label. Required: a select with no
   * accessible name fails WCAG 4.1.2 (Name, Role, Value). Rendered through
   * Ark's Select.Label, which is associated to the trigger via aria-labelledby.
   */
  label: React.ReactNode;
  /** The items to display in the listbox. */
  items: SelectItem[];
  /** Placeholder shown in the trigger when no value is selected. */
  placeholder?: string;
  /** Size scale for padding and typography. Defaults to `medium`. */
  size?: SelectSize;
  /**
   * Render a clear button inside the control that resets the selection. The
   * button is icon-only, so it gets an explicit accessible name (WCAG 4.1.2).
   */
  clearable?: boolean;
  /** Accessible name for the clear button. Defaults to `"Clear selection"`. */
  clearLabel?: string;
}

/**
 * Token-styled wrapper over Ark UI's Select.
 *
 * Anatomy: Root > Label, Control > Trigger > ValueText + Indicator
 * (+ optional ClearTrigger), Positioner (portalled via Portal) > Content >
 * ItemGroup > Item > ItemText + ItemIndicator, plus the visually-hidden
 * HiddenSelect for native form submission.
 *
 * `size` (small | medium | large) is set on the Root via `data-size`, driving
 * the padding/typography matrix in Select.css. `clearable` renders an
 * icon-only Ark ClearTrigger with an explicit accessible name.
 *
 * The content panel is rendered in a Portal (outside the story canvas) so play
 * tests must query via `within(document.body)` / `screen`, not
 * `within(canvasElement)`.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (see Select.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Select = forwardRef<HTMLDivElement, SelectProps>(function Select(
  {
    label,
    items,
    placeholder = 'Select an option',
    size = 'medium',
    clearable = false,
    clearLabel = 'Clear selection',
    children,
    ...rootProps
  },
  ref,
) {
  const collection = createListCollection({ items });

  return (
    <ArkSelect.Root ref={ref} collection={collection} data-size={size} {...rootProps}>
      <ArkSelect.Label>{label}</ArkSelect.Label>
      <ArkSelect.Control>
        <ArkSelect.Trigger>
          <ArkSelect.ValueText placeholder={placeholder} />
          <ArkSelect.Indicator>▾</ArkSelect.Indicator>
        </ArkSelect.Trigger>
        {clearable && <ArkSelect.ClearTrigger aria-label={clearLabel}>✕</ArkSelect.ClearTrigger>}
      </ArkSelect.Control>
      <Portal>
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
      </Portal>
      <ArkSelect.HiddenSelect />
      {children}
    </ArkSelect.Root>
  );
});
