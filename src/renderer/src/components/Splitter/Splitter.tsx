import { forwardRef } from 'react';

import { Splitter as ArkSplitter, type SplitterRootProps } from '@ark-ui/react/splitter';

import './Splitter.css';

export interface SplitterPanelConfig {
  /** Panel id — must match the `id` prop passed to each `<Splitter.Panel>`. */
  id: string;
  /** Minimum size of the panel as a percentage (0–100). */
  minSize?: number;
  /** Maximum size of the panel as a percentage (0–100). */
  maxSize?: number;
  /** Default size of the panel as a percentage (0–100). */
  defaultSize?: number;
}

export interface SplitterProps extends Omit<SplitterRootProps, 'panels'> {
  /**
   * Panel configuration array. Each entry must have an `id` that matches a
   * corresponding `<Splitter.Panel id="...">`. Required — Ark/Zag uses this to
   * set up the state machine.
   */
  panels: SplitterPanelConfig[];
  /**
   * Accessible label for the resize trigger handle. Required (WCAG 4.1.2).
   * Describes what the handle resizes, e.g. "Resize sidebar".
   */
  resizeTriggerLabel: string;
}

/**
 * Token-styled wrapper over Ark UI's Splitter.
 *
 * Anatomy (from @ark-ui/react/splitter):
 *   Root > Panel[], ResizeTrigger > ResizeTriggerIndicator
 *
 * Two panels and one resize trigger are rendered by this component. For
 * multi-panel layouts, compose ArkSplitter parts directly.
 *
 * Styling attaches to Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR) — no custom class names. The resize trigger is
 * a `<button role="separator">` — zag-js overrides the implicit button role to
 * `separator`. Ark marks it with `data-orientation`, `data-focus`,
 * `data-dragging`, and `data-disabled`.
 */
export const Splitter = forwardRef<HTMLDivElement, SplitterProps>(function Splitter(
  { panels, resizeTriggerLabel, children, ...rootProps },
  ref,
) {
  // `panels` is required and meant to hold (at least) two entries. Under
  // noUncheckedIndexedAccess indexed access widens to `T | undefined`, so guard
  // explicitly and fail loudly rather than render a broken splitter.
  const [panelA, panelB] = panels;
  if (!panelA || !panelB) {
    throw new Error('Splitter requires a `panels` array with at least two entries.');
  }
  const panelAId = panelA.id;
  const panelBId = panelB.id;

  return (
    <ArkSplitter.Root ref={ref} panels={panels} {...rootProps}>
      <ArkSplitter.Panel id={panelAId}>{children}</ArkSplitter.Panel>
      <ArkSplitter.ResizeTrigger id={`${panelAId}:${panelBId}`} aria-label={resizeTriggerLabel}>
        <ArkSplitter.ResizeTriggerIndicator />
      </ArkSplitter.ResizeTrigger>
      <ArkSplitter.Panel id={panelBId} />
    </ArkSplitter.Root>
  );
});
