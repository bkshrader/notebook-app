import { forwardRef } from 'react';

import { Timer as ArkTimer, type TimerRootProps } from '@ark-ui/react/timer';

import './Timer.css';

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
}

/**
 * Token-styled wrapper over Ark UI's Timer.
 *
 * Anatomy (from @ark-ui/react/timer): Root > Area > Item (per TimePart) +
 * Separator, plus a Control > ActionTrigger group for start/pause/resume/reset.
 * Ark/Zag own the wiring and ARIA attributes; we style via data-scope/data-part.
 *
 * The timer area is a live region announcing elapsed/remaining time — see the
 * `translations.areaLabel` prop above.
 *
 * Styling is attached to Ark's `data-scope`/`data-part` attributes (see
 * Timer.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Timer = forwardRef<HTMLDivElement, TimerProps>(function Timer(
  { label, translations, children, ...rootProps },
  ref,
) {
  return (
    <ArkTimer.Root
      ref={ref}
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
