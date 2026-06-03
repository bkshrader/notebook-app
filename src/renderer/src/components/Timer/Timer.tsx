import { forwardRef } from 'react';

import { Timer as ArkTimer, type TimerRootProps } from '@ark-ui/react/timer';

import './Timer.css';

/** Visual scale of the timer. Drives the per-size `--timer-*` layout vars in Timer.css. */
export type TimerSize = 'small' | 'medium' | 'large';

export interface TimerProps extends TimerRootProps {
  /**
   * Human-readable label describing the timer's purpose.
   *
   * Forwarded to Ark's `translations.areaLabel` so the timer area receives an
   * accessible name (WCAG 4.1.2, Name/Role/Value). The Ark/Zag machine renders
   * this as the `aria-label` on the `[data-part="area"]` element.
   *
   * When `countdown` is true the default formatted time is read aloud on each
   * tick by live-region aware ATs; this label provides persistent context.
   */
  label: string;

  /**
   * Visual scale. Surfaced on the root as `data-size`, which selects a set of
   * `--timer-*` layout custom properties in Timer.css (segment padding, gaps).
   *
   * @default 'medium'
   */
  size?: TimerSize;
}

/**
 * Token-styled wrapper over Ark UI's Timer.
 *
 * Anatomy (DOM-verified against @ark-ui/react/timer): Root > Area > Item (per
 * TimePart) + Separator, plus a Control > ActionTrigger group for
 * start/pause/resume/reset. Every node emits `data-scope='timer'` with its
 * `data-part`; Ark/Zag own the wiring and ARIA attributes, and we style via
 * those data attributes (see Timer.css) per the unstyled-primitives-ark ADR —
 * no custom class names.
 *
 * The timer area is a live region announcing elapsed/remaining time — see the
 * `translations.areaLabel` prop above.
 */
export const Timer = forwardRef<HTMLDivElement, TimerProps>(function Timer(
  { label, size = 'medium', translations, children, ...rootProps },
  ref,
) {
  return (
    <ArkTimer.Root
      ref={ref}
      data-size={size}
      translations={{
        ...translations,
        areaLabel: translations?.areaLabel ?? (() => label),
      }}
      {...rootProps}
    >
      <ArkTimer.Area>
        <ArkTimer.Item type="hours" />
        <ArkTimer.Separator>:</ArkTimer.Separator>
        <ArkTimer.Item type="minutes" />
        <ArkTimer.Separator>:</ArkTimer.Separator>
        <ArkTimer.Item type="seconds" />
      </ArkTimer.Area>
      <ArkTimer.Control>
        <ArkTimer.ActionTrigger action="start">Start</ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="pause">Pause</ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="resume">Resume</ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="reset">Reset</ArkTimer.ActionTrigger>
      </ArkTimer.Control>
      {children}
    </ArkTimer.Root>
  );
});
