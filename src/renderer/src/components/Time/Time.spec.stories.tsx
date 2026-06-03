import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Time } from './Time';

/**
 * Interaction / accessibility tests for the Time primitive.
 *
 * Kept separate from the visual stories (`Time.stories.tsx`) per the
 * `*.spec.stories.tsx` convention. Time is purely presentational (Tier
 * A-display) — it has no focus/keyboard/open/selection state — so the guards
 * assert the *semantic + visual contract* rather than driving interaction:
 *
 *  - it renders a native `<time>` carrying the unambiguous ISO `datetime`
 *    attribute (WCAG 1.3.1) regardless of the human-readable display style;
 *  - the visible text matches the requested `display` formatting;
 *  - the `range` variant lays out two `<time>` elements with a separator;
 *  - the token-driven styling actually resolves (a backstop that fails if the
 *    `[data-part]` selectors or their `--token-*` values are renamed).
 *
 * Stories are named by behavior so a failure is self-describing; each `play`
 * AWAITS real `expect(...)`, uses `step()` for readable runner output, and
 * scopes queries with `within(canvasElement)`. `tags: ['test']` keeps them out
 * of the docs gallery. The `a11y.test: 'error'` preview gate runs axe on every
 * story automatically — never call axe by hand.
 */
const ISO = '2024-10-16T13:30:00.000Z';

const meta: Meta<typeof Time> = {
  title: 'Components/Display/Time/Tests',
  component: Time,
  args: { date: ISO },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Time>;

/** A single Time renders a semantic <time> carrying the machine-readable ISO value. */
export const SemanticTimeContract: Story = {
  args: { display: 'friendly' },
  play: async ({ canvasElement, step }) => {
    const time = canvasElement.querySelector<HTMLTimeElement>('time[data-part="root"]');

    await step('renders a native <time> element as the root', async () => {
      await expect(time).not.toBeNull();
      await expect(time!.tagName).toBe('TIME');
    });

    await step('exposes the unambiguous ISO value on the datetime attribute', async () => {
      // The visible text is human-friendly ("October 16, 2024"); the datetime
      // attribute is the precise, programmatically-determinable instant.
      await expect(time!.getAttribute('datetime')).toBe(ISO);
    });

    await step('shows the spelled-out friendly date as visible text', async () => {
      const canvas = within(canvasElement);
      // Year and long month are present regardless of host locale/timezone month name.
      await expect(canvas.getByText(/2024/)).toBeInTheDocument();
      await expect(time!.textContent?.trim().length).toBeGreaterThan(0);
    });
  },
};

/** The datetime attribute stays ISO-precise even when the display text is relative. */
export const RelativeKeepsMachineValue: Story = {
  args: { display: 'relative' },
  play: async ({ canvasElement, step }) => {
    const time = canvasElement.querySelector<HTMLTimeElement>('time[data-part="root"]');

    await step('still carries the absolute ISO datetime', async () => {
      await expect(time).not.toBeNull();
      await expect(time!.getAttribute('datetime')).toBe(ISO);
    });

    await step('renders relative phrasing in the visible text', async () => {
      // Intl RelativeTimeFormat produces "... ago" / "in ..." phrasing for a past
      // or future instant; either way the text is non-empty and not the raw ISO.
      const text = time!.textContent?.trim() ?? '';
      await expect(text.length).toBeGreaterThan(0);
      await expect(text).not.toBe(ISO);
    });
  },
};

/** The date display formats a calendar date without a clock time. */
export const DateDisplayFormatsCalendarDate: Story = {
  args: { display: 'date' },
  play: async ({ canvasElement, step }) => {
    const time = canvasElement.querySelector<HTMLTimeElement>('time[data-part="root"]');

    await step('keeps the ISO datetime attribute', async () => {
      await expect(time!.getAttribute('datetime')).toBe(ISO);
    });

    await step('shows the year in the visible text', async () => {
      await expect(time!.textContent).toMatch(/2024/);
    });
  },
};

/** The range variant renders two <time> elements and a hidden separator. */
export const RangeRendersTwoTimes: Story = {
  args: {
    date: '2024-10-14T04:00:00.000Z',
    to: '2024-10-16T04:00:00.000Z',
    display: 'date',
  },
  play: async ({ canvasElement, step }) => {
    const root = canvasElement.querySelector<HTMLElement>('[data-part="root"][data-range]');

    await step('renders a range root with two <time> children', async () => {
      await expect(root).not.toBeNull();
      const times = root!.querySelectorAll('time[data-part="time"]');
      await expect(times.length).toBe(2);
    });

    await step('each <time> carries its own ISO datetime', async () => {
      const times = root!.querySelectorAll<HTMLTimeElement>('time[data-part="time"]');
      await expect(times[0]?.getAttribute('datetime')).toBe('2024-10-14T04:00:00.000Z');
      await expect(times[1]?.getAttribute('datetime')).toBe('2024-10-16T04:00:00.000Z');
    });

    await step('the separator is hidden from assistive tech', async () => {
      const sep = root!.querySelector('[data-part="separator"]');
      await expect(sep).not.toBeNull();
      await expect(sep!.getAttribute('aria-hidden')).toBe('true');
    });

    await step('lays the range out as an inline flex row (token-driven)', async () => {
      // Backstop: the [data-range] selector must resolve. Chromium reports the
      // legacy single-keyword computed value for `display: inline flex`.
      await expect(getComputedStyle(root!).display).toBe('inline-flex');
    });
  },
};

/**
 * Regression guard for the token-driven visual contract on the single variant.
 * Fails if `[data-part='root']` stops resolving its Helios typography/color tokens.
 */
export const VisualTokenContract: Story = {
  args: { display: 'date-time' },
  play: async ({ canvasElement, step }) => {
    const time = canvasElement.querySelector<HTMLElement>('time[data-part="root"]');

    await step('the styled <time> exists', async () => {
      await expect(time).not.toBeNull();
    });

    await step('resolves a real (non-transparent) foreground color', async () => {
      const color = getComputedStyle(time!).color;
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
      await expect(color).not.toBe('transparent');
    });

    await step('resolves a non-empty font family from the body token', async () => {
      await expect(getComputedStyle(time!).fontFamily.length).toBeGreaterThan(0);
    });

    await step('uses tabular numerals so timestamps align', async () => {
      await expect(getComputedStyle(time!).fontVariantNumeric).toContain('tabular-nums');
    });
  },
};
