import { forwardRef } from 'react';

import { Progress as ArkProgress, type ProgressRootProps } from '@ark-ui/react/progress';

import './Progress.css';

/** Track thickness. `medium` (8px) is the default; `small` (4px) is the compact bar. */
export type ProgressSize = 'small' | 'medium';

/**
 * Range-fill color. `neutral` (the action color) is the default; `highlight`
 * tints the fill with the highlight color for emphasis. At max, BOTH variants
 * switch to the success color (the `complete` state wins over the variant).
 */
export type ProgressVariant = 'neutral' | 'highlight';

export interface ProgressProps extends ProgressRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Track thickness. Defaults to `medium`. */
  size?: ProgressSize;
  /** Range-fill color before completion. Defaults to `neutral`. */
  variant?: ProgressVariant;
}

/**
 * Token-styled wrapper over Ark UI's Progress (linear).
 *
 * Anatomy (from @ark-ui/react/progress): Root > Label, Track > Range, ValueText.
 * Ark/Zag render `role="progressbar"` on the Track element and auto-populate
 * `aria-label` with the formatted percentage value (e.g. "40%"). The Label
 * part receives its own `id` but Ark does NOT automatically wire that id back
 * to the Track's `aria-labelledby`.
 *
 * To satisfy WCAG 4.1.2 (Name, Role, Value) and give the progressbar a human-
 * readable accessible name, we use `ArkProgress.Context` to read the label's
 * id at runtime and pass it as `aria-labelledby` on the Track. Per the ARIA
 * spec, `aria-labelledby` overrides `aria-label`, so the bar's computed
 * accessible name becomes the Label text (e.g. "File upload") rather than the
 * raw percentage string.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Progress.css) per the unstyled-primitives-ark ADR — no custom class names.
 * The `size` and `variant` props are surfaced as `data-size` / `data-variant`
 * on the Root and resolved to per-mode local `--progress-*` custom properties in
 * CSS (the Accordion size-scale pattern) — no per-variant class names.
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { label, children, size = 'medium', variant = 'neutral', ...rootProps },
  ref,
) {
  return (
    <ArkProgress.Root ref={ref} data-size={size} data-variant={variant} {...rootProps}>
      <ArkProgress.Label>{label}</ArkProgress.Label>
      <ArkProgress.Context>
        {(ctx) => (
          <ArkProgress.Track aria-labelledby={ctx.getLabelProps().id}>
            <ArkProgress.Range />
          </ArkProgress.Track>
        )}
      </ArkProgress.Context>
      <ArkProgress.ValueText />
      {children}
    </ArkProgress.Root>
  );
});
