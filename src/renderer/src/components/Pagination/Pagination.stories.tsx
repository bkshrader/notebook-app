import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  args: {
    count: 100,
    pageSize: 10,
    siblingCount: 1,
    'aria-label': 'Results pagination',
  },
  argTypes: {
    count: { control: { type: 'number', min: 0 } },
    pageSize: { control: { type: 'number', min: 1 } },
    siblingCount: { control: { type: 'number', min: 0 } },
  },
};

export default meta;

type Story = StoryObj<typeof Pagination>;

/** Default state: page 1 of 10. First/prev triggers are disabled. */
export const Default: Story = {};

/** Mid-range page so that both prev and next triggers are enabled. */
export const MidPage: Story = {
  args: { defaultPage: 5 },
};

/** Large result set with siblingCount=2 — exercises ellipsis rendering. */
export const ManyPages: Story = {
  args: {
    count: 5000,
    pageSize: 20,
    siblingCount: 2,
    defaultPage: 50,
    'aria-label': 'Large dataset pagination',
  },
};

/**
 * Drives the keyboard interaction path for pagination.
 *
 * Pagination items are native `<button>` elements (role="button"), so keyboard
 * users Tab between them and activate with Space or Enter. Ark exposes
 * `data-selected` on the currently active page item and `data-disabled` on
 * prev/next triggers when at the boundary.
 *
 * userEvent.tab() can skip clip-hidden elements; page buttons are visible, so
 * Tab works normally here. We also assert the getComputedStyle backstop:
 * after activating page 2, the selected item must carry a real (non-transparent)
 * background color — confirming the `var(--token-*)` chain resolves in test.
 */
export const KeyboardNavigation: Story = {
  args: {
    count: 50,
    pageSize: 10,
    siblingCount: 1,
    defaultPage: 1,
    'aria-label': 'Keyboard navigation test',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Find buttons by role; the "1" button is the selected page on load.
    const allButtons = canvas.getAllByRole('button');

    // FirstTrigger and PrevTrigger are first in DOM order and disabled on page 1.
    const firstTrigger = allButtons[0];
    const prevTrigger = allButtons[1];

    await step('first and prev triggers disabled on page 1', async () => {
      await expect(firstTrigger).toBeDisabled();
      await expect(prevTrigger).toBeDisabled();
    });

    // Ark renders page items with aria-label="page N" — use the full accessible name.
    const pageOneBtn = canvas.getByRole('button', { name: 'page 1' });

    await step('page 1 is selected on initial render', async () => {
      await expect(pageOneBtn).toHaveAttribute('data-selected');
    });

    await step('page 2 button is focusable and in the tab order', async () => {
      const pageTwoBtn = canvas.getByRole('button', { name: 'page 2' });
      await expect(pageTwoBtn).not.toHaveAttribute('tabindex', '-1');
      pageTwoBtn.focus();
      await expect(pageTwoBtn).toHaveFocus();
    });

    await step('Enter activates page 2 and deselects page 1', async () => {
      // pageTwoBtn already has focus from the step above.
      await userEvent.keyboard('{Enter}');
      const pageTwoBtn = canvas.getByRole('button', { name: 'page 2' });
      await expect(pageTwoBtn).toHaveAttribute('data-selected');
      await expect(pageOneBtn).not.toHaveAttribute('data-selected');
    });

    await step('selected page background resolves to a real token value', async () => {
      // Backstop: after selecting page 2, the item's background must not be
      // empty or transparent — confirms the --token-color-surface-action chain.
      const pageTwoBtn = canvas.getByRole('button', { name: 'page 2' });
      const bg = getComputedStyle(pageTwoBtn).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('next trigger is enabled and can advance to page 3', async () => {
      const allBtns = canvas.getAllByRole('button');
      // NextTrigger is second-to-last in DOM order (last is LastTrigger).
      const nextTrigger = allBtns[allBtns.length - 2];
      if (!nextTrigger) throw new Error('expected a next-page trigger');
      await expect(nextTrigger).not.toBeDisabled();
      nextTrigger.focus();
      await userEvent.keyboard('{Enter}');
      const pageThreeBtn = canvas.getByRole('button', { name: 'page 3' });
      await expect(pageThreeBtn).toHaveAttribute('data-selected');
    });
  },
};
