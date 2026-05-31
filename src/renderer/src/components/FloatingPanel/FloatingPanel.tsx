import { forwardRef } from 'react';

import {
  FloatingPanel as ArkFloatingPanel,
  type FloatingPanelRootProps,
} from '@ark-ui/react/floating-panel';
import { Portal } from '@ark-ui/react/portal';

import './FloatingPanel.css';

export interface FloatingPanelProps extends FloatingPanelRootProps {
  /**
   * Accessible title rendered inside the panel header. Required: a floating
   * panel without a visible title fails WCAG 4.1.2 (Name, Role, Value).
   */
  title: React.ReactNode;
  /**
   * Label for the trigger button that opens the panel.
   */
  triggerLabel?: React.ReactNode;
  /**
   * Content rendered inside the panel body.
   */
  children?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's FloatingPanel.
 *
 * Anatomy (from @ark-ui/react/floating-panel): Root > Trigger; Portal >
 * Positioner > Content > DragTrigger > Header > Title, Control (StageTriggers,
 * CloseTrigger); Body; ResizeTriggers. Ark/Zag own the wiring: the Content
 * receives aria-labelledby wired to the Title automatically.
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see
 * FloatingPanel.css) per the unstyled-primitives-ark ADR — no custom class
 * names.
 *
 * This is a Tier B overlay component: content renders in a Portal outside the
 * story canvas. Play tests must query via document.body, not canvasElement.
 */
export const FloatingPanel = forwardRef<HTMLButtonElement, FloatingPanelProps>(
  function FloatingPanel({ title, triggerLabel = 'Open Panel', children, ...rootProps }, ref) {
    return (
      <ArkFloatingPanel.Root closeOnEscape lazyMount unmountOnExit {...rootProps}>
        <ArkFloatingPanel.Trigger ref={ref}>{triggerLabel}</ArkFloatingPanel.Trigger>
        <Portal>
          <ArkFloatingPanel.Positioner>
            <ArkFloatingPanel.Content>
              <ArkFloatingPanel.DragTrigger>
                <ArkFloatingPanel.Header>
                  <ArkFloatingPanel.Title>{title}</ArkFloatingPanel.Title>
                  <ArkFloatingPanel.Control>
                    <ArkFloatingPanel.StageTrigger stage="minimized" aria-label="Minimize panel">
                      &#8722;
                    </ArkFloatingPanel.StageTrigger>
                    <ArkFloatingPanel.StageTrigger stage="maximized" aria-label="Maximize panel">
                      &#9633;
                    </ArkFloatingPanel.StageTrigger>
                    <ArkFloatingPanel.StageTrigger stage="default" aria-label="Restore panel">
                      &#8599;
                    </ArkFloatingPanel.StageTrigger>
                    <ArkFloatingPanel.CloseTrigger aria-label="Close panel">
                      &#10005;
                    </ArkFloatingPanel.CloseTrigger>
                  </ArkFloatingPanel.Control>
                </ArkFloatingPanel.Header>
              </ArkFloatingPanel.DragTrigger>
              <ArkFloatingPanel.Body>{children}</ArkFloatingPanel.Body>
              {/* ResizeTrigger renders a plain div (no ARIA role). aria-label is
               * prohibited on role-less divs (axe aria-prohibited-attr). Resize
               * direction is communicated via cursor style + data-axis; no label
               * is needed for keyboard users because these handles are
               * pointer-only. */}
              <ArkFloatingPanel.ResizeTrigger axis="n" />
              <ArkFloatingPanel.ResizeTrigger axis="e" />
              <ArkFloatingPanel.ResizeTrigger axis="w" />
              <ArkFloatingPanel.ResizeTrigger axis="s" />
              <ArkFloatingPanel.ResizeTrigger axis="ne" />
              <ArkFloatingPanel.ResizeTrigger axis="se" />
              <ArkFloatingPanel.ResizeTrigger axis="sw" />
              <ArkFloatingPanel.ResizeTrigger axis="nw" />
            </ArkFloatingPanel.Content>
          </ArkFloatingPanel.Positioner>
        </Portal>
      </ArkFloatingPanel.Root>
    );
  },
);
