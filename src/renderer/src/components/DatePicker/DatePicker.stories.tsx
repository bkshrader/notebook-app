import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker> = {
  title: 'Components/Forms/DatePicker',
  component: DatePicker,
  args: {
    label: 'Date',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: 'Appointment',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Date (disabled)',
  },
};

/**
 * Tier D play test — keyboard open + grid/gridcell assertion.
 *
 * The calendar content renders in a Portal OUTSIDE the story canvas, so after
 * opening we query via within(document.body) — NOT within(canvasElement).
 *
 * Flow:
 *   1. Focus the calendar trigger button directly (deterministic over tab).
 *   2. Press Enter — calendar opens.
 *   3. Assert the day grid (role="grid") is present in document.body.
 *   4. Assert at least one gridcell is present inside the grid.
 *   5. Press Escape — calendar closes.
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
      // findByRole('grid') proves the calendar table is mounted.
      // Ark puts data-state on the content div (role="application"), not the
      // table element, so we assert data-state on the closest content ancestor.
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
