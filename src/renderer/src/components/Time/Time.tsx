import { forwardRef, useMemo } from 'react';

import './Time.css';

/**
 * Formatting style for the displayed text. Mirrors the Helios Time `@display`
 * options (https://helios.hashicorp.design/components/time):
 *
 *  - `'date'`      — calendar date only (e.g. "Oct 16, 2024").
 *  - `'time'`      — clock time only (e.g. "9:30:00 AM").
 *  - `'date-time'` — date and time together (e.g. "Oct 16, 2024, 9:30:00 AM").
 *  - `'relative'`  — distance from now (e.g. "594 days ago", "in 2 hours").
 *  - `'friendly'`  — a longer, spelled-out date (e.g. "October 16th, 2024").
 *
 * The `datetime` attribute always carries the unambiguous machine-readable ISO
 * value regardless of `display`, so assistive tech and `<time>` consumers get a
 * precise timestamp even when the visible text is relative. Defaults to `'friendly'`.
 */
export type TimeDisplay = 'date' | 'time' | 'date-time' | 'relative' | 'friendly';

export interface TimeProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** The instant to render. Accepts a `Date`, an ISO string, or epoch milliseconds. */
  date: Date | string | number;
  /**
   * Optional end of an interval. When set, the component renders the Helios
   * `range` variant — two `<time>` elements separated by an en dash — instead of
   * a single timestamp.
   */
  to?: Date | string | number;
  /** Formatting style for the visible text. @default 'friendly' */
  display?: TimeDisplay;
  /**
   * BCP-47 locale for `Intl` formatting. Defaults to the host's locale so the
   * component honours the user's regional preferences.
   */
  locale?: string;
}

/** Coerce the accepted input shapes to a `Date`. */
function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** The unambiguous machine-readable value for the `datetime` attribute (WCAG 1.3.1). */
function machineValue(date: Date): string {
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

const RELATIVE_DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: 'second' },
  { amount: 60, unit: 'minute' },
  { amount: 24, unit: 'hour' },
  { amount: 7, unit: 'day' },
  { amount: 4.34524, unit: 'week' },
  { amount: 12, unit: 'month' },
  { amount: Number.POSITIVE_INFINITY, unit: 'year' },
];

/** Human-readable relative phrasing ("594 days ago", "in 2 hours") via Intl. */
function formatRelative(date: Date, locale: string | undefined): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of RELATIVE_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return rtf.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return rtf.format(Math.round(duration), 'year');
}

const ABSOLUTE_OPTIONS: Record<Exclude<TimeDisplay, 'relative'>, Intl.DateTimeFormatOptions> = {
  date: { year: 'numeric', month: 'short', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  'date-time': {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  },
  friendly: { year: 'numeric', month: 'long', day: 'numeric' },
};

/** The visible, human-formatted text for a single instant. */
function formatDisplay(date: Date, display: TimeDisplay, locale: string | undefined): string {
  if (Number.isNaN(date.getTime())) return '';
  if (display === 'relative') return formatRelative(date, locale);
  return new Intl.DateTimeFormat(locale, ABSOLUTE_OPTIONS[display]).format(date);
}

/**
 * Time — token-styled, presentational wrapper over the native HTML `<time>`
 * element, built to the Helios Time specification
 * (https://helios.hashicorp.design/components/time).
 *
 * Time is purely presentational (a formatted, machine-readable timestamp) with
 * no focus/keyboard/open/selection state, so per the unstyled-primitives-ark ADR
 * scope clarification it is built directly on the semantic `<time>` element
 * rather than on an Ark primitive (Ark ships no `time` primitive). Styling
 * targets our own `[data-part]` attributes on the wrapper elements — no class
 * names — keeping the attribute-selector convention the Ark-backed components use.
 *
 * Anatomy:
 *   single → <time data-part="root" datetime>{formatted}</time>
 *   range  → <span data-part="root" data-range>
 *              <time data-part="time" datetime>{from}</time>
 *              <span data-part="separator">–</span>
 *              <time data-part="time" datetime>{to}</time>
 *            </span>
 *
 * The `datetime` attribute always carries the ISO value so the precise instant
 * is programmatically determinable even when the visible text is relative or
 * abbreviated (WCAG 1.3.1 Info and Relationships).
 */
export const Time = forwardRef<HTMLElement, TimeProps>(function Time(
  { date, to, display = 'friendly', locale, ...rest },
  ref,
) {
  const from = useMemo(() => toDate(date), [date]);
  const end = useMemo(() => (to === undefined ? undefined : toDate(to)), [to]);

  const fromText = formatDisplay(from, display, locale);
  const fromMachine = machineValue(from);

  if (end === undefined) {
    return (
      <time
        ref={ref as React.Ref<HTMLTimeElement>}
        data-part="root"
        dateTime={fromMachine}
        {...rest}
      >
        {fromText}
      </time>
    );
  }

  return (
    <span ref={ref} data-part="root" data-range {...rest}>
      <time data-part="time" dateTime={fromMachine}>
        {fromText}
      </time>
      <span data-part="separator" aria-hidden="true">
        –
      </span>
      <time data-part="time" dateTime={machineValue(end)}>
        {formatDisplay(end, display, locale)}
      </time>
    </span>
  );
});
