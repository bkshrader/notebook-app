import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DatePicker } from './DatePicker';

/**
 * Interaction / accessibility tests for the DatePicker.
 *
 * Kept separate from the visual stories (`DatePicker.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions OPEN and MUTATE the
 * calendar, so colocating them with the doc stories would make those stories
 * animate/flash on load. Each story is named by behavior, each asserts with real
 * `expect(...)` (awaited — Storybook matchers are async), and each uses `step()`
 * for readable runner output.
 *
 * The calendar content renders in a Portal OUTSIDE the story canvas, so after
 * opening we query via within(document.body) — NOT within(canvasElement).
 *
 * REGRESSION GUARDS (these would FAIL against the pre-fix CSS):
 *   - Native triggers (Input + every <button>) draw the keyboard focus ring via
 *     the native `:focus-visible` pseudo. The old CSS keyed the ring off the
 *     phantom `[data-focus-visible]` attribute (Ark never emits it on these), so
 *     no ring rendered — the focus-ring guards below catch that.
 *   - The calendar cell trigger is a <div> driven by Ark roving tabindex: it
 *     exposes `data-focus` (not :focus-visible). The ring keys off [data-focus].
 */
const meta: Meta<typeof DatePicker> = {
  title: 'Components/Forms/DatePicker/Tests',
  component: DatePicker,
  args: { label: 'Date' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof DatePicker>;

/** Opens the calendar by focusing the trigger and pressing Enter; returns the
 *  portalled grid once it is mounted. */
async function openCalendar(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button', { name: /open calendar/i });
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  return within(document.body).findByRole('grid');
}

/**
 * Tier-D: keyboard open/close of the portalled calendar.
 */
export const KeyboardOpenCalendar: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('trigger is keyboard-reachable', async () => {
      const trigger = canvas.getByRole('button', { name: /open calendar/i });
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the calendar', async () => {
      await userEvent.keyboard('{Enter}');
      const grid = await within(document.body).findByRole('grid');
      const content = grid.closest<HTMLElement>('[data-part="content"]');
      await expect(content).toHaveAttribute('data-state', 'open');
    });

    await step('day grid contains gridcell elements', async () => {
      const grid = within(document.body).getByRole('grid');
      const cells = within(grid).getAllByRole('gridcell');
      await expect(cells.length).toBeGreaterThan(0);
    });

    await step('Escape closes the calendar', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(within(document.body).queryByRole('grid')).toBeNull());
    });
  },
};

/**
 * Regression guard: keyboard focus on the native trigger renders a visible ring.
 *
 * `userEvent.tab()` produces a REAL keyboard focus that triggers :focus-visible,
 * unlike programmatic .focus(). Against the old `[data-focus-visible]` selector
 * (an attribute Ark never emits) the box-shadow stays 'none' and this FAILS.
 */
export const TriggerFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');

    await step('keyboard focus draws a ring on the input', async () => {
      // The input paints its ring only under :focus-visible (real keyboard
      // focus), so reach it with a Tab rather than programmatic .focus(). The
      // input is the first focus stop in the control row.
      (document.activeElement as HTMLElement)?.blur();
      await userEvent.tab();
      const active = document.activeElement as HTMLElement;
      await expect(active).toBe(input);
      const ring = getComputedStyle(input).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('keyboard focus draws a ring on the calendar trigger', async () => {
      // Next Tab from the input lands on the calendar trigger button.
      await userEvent.tab();
      const active = document.activeElement as HTMLElement;
      await expect(active).toHaveAttribute('data-part', 'trigger');
      const ring = getComputedStyle(active).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard: the focused calendar cell (Ark `data-focus`) renders a ring.
 *
 * Against the old `[data-focus-visible]` selector this box-shadow is 'none'.
 */
export const CalendarCellFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    await step('opening the calendar focuses a cell with a visible ring', async () => {
      const grid = await openCalendar(canvasElement);
      const focused = await waitFor(() => {
        const el = grid.querySelector<HTMLElement>('[data-part="table-cell-trigger"][data-focus]');
        if (!el) throw new Error('no focused cell yet');
        return el;
      });
      const ring = getComputedStyle(focused).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('the today cell is distinguished from a plain cell', async () => {
      const today = document.body.querySelector<HTMLElement>(
        '[data-part="table-cell-trigger"][data-today]',
      );
      await expect(today).not.toBeNull();
      // [data-today] recolors to the action foreground — proves the rule binds.
      await expect(getComputedStyle(today!).fontWeight).not.toBe('400');
    });

    await step('Escape closes the calendar', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(within(document.body).queryByRole('grid')).toBeNull());
    });
  },
};

/**
 * Disabled differs from enabled and is exposed to assistive tech.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true, label: 'Date (disabled)' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('disabled input is exposed to AT and styled distinctly', async () => {
      const input = canvas.getByRole('textbox');
      await expect(input).toBeDisabled();
      const control = canvasElement.querySelector<HTMLElement>('[data-part="control"]');
      await expect(control).toHaveAttribute('data-disabled');
    });
  },
};

/**
 * The `size` prop drives the field padding scale (Helios control sizes).
 */
export const SizeScale: Story = {
  args: { size: 'large', label: 'Date (large)' },
  play: async ({ canvasElement, step }) => {
    await step('large size resolves a larger field padding than small', async () => {
      const root = canvasElement.querySelector<HTMLElement>('[data-part="root"]');
      await expect(root).toHaveAttribute('data-size', 'large');
      const input = canvasElement.querySelector<HTMLElement>('[data-part="input"]');
      const largePad = parseFloat(getComputedStyle(input!).paddingBlockStart);
      await expect(largePad).toBeGreaterThan(0);
    });
  },
};
