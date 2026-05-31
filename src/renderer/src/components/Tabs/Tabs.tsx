import { forwardRef } from 'react';

import { Tabs as ArkTabs, type TabsRootProps } from '@ark-ui/react/tabs';

import './Tabs.css';

export interface TabItem {
  /** Unique value identifying the tab; matched against `TabContent`. */
  value: string;
  /** Visible label for the tab trigger. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Content rendered when this tab is selected. */
  content: React.ReactNode;
  /** When true the trigger is not interactive and cannot receive focus. */
  disabled?: boolean;
}

export interface TabsProps extends Omit<TabsRootProps, 'children'> {
  /**
   * Ordered list of tabs. Each item supplies a `value`, a `label` for the
   * trigger, and the `content` panel. At least one item is required so the
   * component is never rendered with no operable triggers (WCAG 4.1.2).
   */
  items: TabItem[];
}

/**
 * Token-styled wrapper over Ark UI's Tabs.
 *
 * Anatomy (from @ark-ui/react/tabs):
 *   Root > List > Trigger (×n), Content (×n)
 *
 * Keyboard contract (ARIA APG Tabs pattern):
 *   - Tab moves focus into the tab list and on to the active panel.
 *   - Arrow Left/Right cycles through triggers (automatic activation).
 *   - Home/End jump to the first/last trigger.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Tabs.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { items, ...rootProps },
  ref,
) {
  return (
    <ArkTabs.Root ref={ref} {...rootProps}>
      <ArkTabs.List>
        {items.map((item) => (
          <ArkTabs.Trigger key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </ArkTabs.Trigger>
        ))}
      </ArkTabs.List>
      {items.map((item) => (
        <ArkTabs.Content key={item.value} value={item.value}>
          {item.content}
        </ArkTabs.Content>
      ))}
    </ArkTabs.Root>
  );
});
