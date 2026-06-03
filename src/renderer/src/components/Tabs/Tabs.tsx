import { forwardRef } from 'react';

import { Tabs as ArkTabs, type TabsRootProps } from '@ark-ui/react/tabs';

import './Tabs.css';

/** Size scale, set once at the group level. Helios ships medium and large. */
export type TabsSize = 'medium' | 'large';

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
  /** Size scale for the trigger height and padding. Defaults to `medium`. */
  size?: TabsSize;
  // `orientation` ('horizontal' | 'vertical') and `activationMode`
  // ('automatic' | 'manual') are Ark `TabsRootProps`; they pass through the
  // `...rootProps` spread below. `orientation` is reflected to the list/trigger
  // via Ark's `data-orientation`, which Tabs.css styles for the vertical case.
}

/**
 * Token-styled wrapper over Ark UI's Tabs, built to match the Helios Tabs
 * specification (https://helios.hashicorp.design/components/tabs).
 *
 * Anatomy (from @ark-ui/react/tabs):
 *   Root > List > Trigger (×n), Content (×n)
 *
 * Helios parity:
 *   - `size` (medium | large) drives the trigger height and padding via
 *     `data-size` on the root (consumed by local `--tabs-*` custom properties).
 *   - `orientation` ('horizontal' default | 'vertical') flows through to Ark,
 *     which reflects it as `data-orientation`; Tabs.css restyles the list for
 *     the vertical case.
 *
 * Keyboard contract (ARIA APG Tabs pattern):
 *   - Tab moves focus into the tab list and on to the active panel.
 *   - Arrow Left/Right (or Up/Down when vertical) cycles through triggers
 *     (automatic activation by default; pass `activationMode="manual"` to
 *     require Enter/Space to activate the focused trigger).
 *   - Home/End jump to the first/last trigger.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Tabs.css) per the unstyled-primitives-ark ADR — no custom class names. The
 * keyboard focus ring uses the native `:focus-visible` pseudo-class because Ark
 * exposes `data-focus`, not a `data-focus-visible` attribute.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { items, size = 'medium', ...rootProps },
  ref,
) {
  return (
    <ArkTabs.Root ref={ref} data-size={size} {...rootProps}>
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
