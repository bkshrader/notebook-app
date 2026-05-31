import { forwardRef } from 'react';

import { Progress as ArkProgress, type ProgressRootProps } from '@ark-ui/react/progress';

import './Progress.css';

export interface ProgressProps extends ProgressRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
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
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(function Progress(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkProgress.Root ref={ref} {...rootProps}>
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
