import { forwardRef } from 'react';

import {
  SegmentGroup as ArkSegmentGroup,
  type SegmentGroupRootProps,
} from '@ark-ui/react/segment-group';

import './SegmentGroup.css';

export interface SegmentGroupOption {
  /** The value this segment represents. */
  value: string;
  /** Visible label rendered inside the segment. */
  label: React.ReactNode;
  /** When true, this individual segment is non-interactive. */
  disabled?: boolean;
}

/** Size scale for the segment items (height, inline padding, label typography). */
export type SegmentGroupSize = 'small' | 'medium' | 'large';

export interface SegmentGroupProps extends Omit<SegmentGroupRootProps, 'children'> {
  /**
   * Visible, screen-reader-announceable group label. Required (WCAG 4.1.2).
   * Rendered as a `<legend>`-equivalent via `SegmentGroup.Label`.
   */
  label: React.ReactNode;
  /** The segments to display. Each needs a unique value. */
  options: SegmentGroupOption[];
  /**
   * Item sizing. Drives item height, inline padding, and label typography via
   * the `--segment-group-*` custom-property scale in the stylesheet.
   * @default 'medium'
   */
  size?: SegmentGroupSize;
}

/**
 * Token-styled wrapper over Ark UI's SegmentGroup.
 *
 * Anatomy (from \@ark-ui/react/segment-group):
 *   Root > Label, Indicator, Item* > ItemText, ItemControl, ItemHiddenInput
 *
 * The group follows the ARIA radio-group pattern: Tab moves focus into the
 * group, arrow keys cycle selection, and the selected item holds the "checked"
 * state. The hidden native radio inputs are the operable elements; the
 * visible parts are presentational and use data-scope / data-part for styling.
 *
 * Each `Item` is rendered by Ark as a non-focusable `<label>` that exposes no
 * data-focus attribute; the focusable element is the native `<input>` rendered
 * by `ItemHiddenInput`. The keyboard focus ring is therefore drawn on the item
 * via `:has(input:focus-visible)` in the stylesheet (verified against the live
 * Ark DOM), not a (non-existent) `data-focus-visible` attribute.
 *
 * The sliding Indicator is positioned by Zag via CSS custom properties
 * (--left, --top, --width, --height) on the indicator element itself.
 */
export const SegmentGroup = forwardRef<HTMLDivElement, SegmentGroupProps>(function SegmentGroup(
  { label, options, size = 'medium', ...rootProps },
  ref,
) {
  return (
    <ArkSegmentGroup.Root ref={ref} data-size={size} {...rootProps}>
      <ArkSegmentGroup.Label>{label}</ArkSegmentGroup.Label>
      <ArkSegmentGroup.Indicator />
      {options.map((option) => (
        <ArkSegmentGroup.Item key={option.value} value={option.value} disabled={option.disabled}>
          <ArkSegmentGroup.ItemText>{option.label}</ArkSegmentGroup.ItemText>
          <ArkSegmentGroup.ItemControl />
          <ArkSegmentGroup.ItemHiddenInput />
        </ArkSegmentGroup.Item>
      ))}
    </ArkSegmentGroup.Root>
  );
});
