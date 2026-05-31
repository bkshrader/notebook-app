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

export interface SegmentGroupProps extends Omit<SegmentGroupRootProps, 'children'> {
  /**
   * Visible, screen-reader-announceable group label. Required (WCAG 4.1.2).
   * Rendered as a `<legend>`-equivalent via `SegmentGroup.Label`.
   */
  label: React.ReactNode;
  /** The segments to display. Each needs a unique value. */
  options: SegmentGroupOption[];
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
 * The sliding Indicator is positioned by Zag via CSS custom properties
 * (--left, --top, --width, --height) on the indicator element itself.
 */
export const SegmentGroup = forwardRef<HTMLDivElement, SegmentGroupProps>(function SegmentGroup(
  { label, options, ...rootProps },
  ref,
) {
  return (
    <ArkSegmentGroup.Root ref={ref} {...rootProps}>
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
