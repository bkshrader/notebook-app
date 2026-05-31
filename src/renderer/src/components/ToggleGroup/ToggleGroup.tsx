import { forwardRef } from 'react';

import {
  ToggleGroup as ArkToggleGroup,
  type ToggleGroupRootProps,
} from '@ark-ui/react/toggle-group';

import './ToggleGroup.css';

export interface ToggleGroupItemDef {
  /** Unique value for this item. */
  value: string;
  /** Visible content (label, icon, etc.). */
  label: React.ReactNode;
  /** Disable this individual item. */
  disabled?: boolean;
}

export interface ToggleGroupProps extends ToggleGroupRootProps {
  /** The set of items to render. Required — gives every item an accessible text node. */
  items: ToggleGroupItemDef[];
}

export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(function ToggleGroup(
  { items, children, ...rootProps },
  ref,
) {
  return (
    <ArkToggleGroup.Root ref={ref} {...rootProps}>
      {items.map((item) => (
        <ArkToggleGroup.Item key={item.value} value={item.value} disabled={item.disabled}>
          {item.label}
        </ArkToggleGroup.Item>
      ))}
      {children}
    </ArkToggleGroup.Root>
  );
});
