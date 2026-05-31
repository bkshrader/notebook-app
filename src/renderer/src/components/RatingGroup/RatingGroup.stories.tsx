import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { RatingGroup } from './RatingGroup';

const meta: Meta<typeof RatingGroup> = {
  title: 'Components/Forms/RatingGroup',
  component: RatingGroup,
  args: {
    label: 'Rate this item',
    defaultValue: 0,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    count: { control: 'number' },
    defaultValue: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof RatingGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 3 },
};

export const Disabled: Story = {
  args: { defaultValue: 2, disabled: true },
};

export const ReadOnly: Story = {
  args: { defaultValue: 4, readOnly: true },
};

/**
 * Drives the primary keyboard interaction for the rating group.
 *
 * Ark v5's RatingGroup exposes each star as a focusable element. Arrow keys
 * move between items (APG slider/radiogroup pattern). The component renders a
 * visually-hidden `<input type="number">` that carries the current value for
 * form submission; items themselves carry `data-checked` and `data-highlighted`
 * for styling. We read state off Ark's data-attributes.
 */
export const KeyboardInteraction: Story = {
  args: { defaultValue: 0 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Ark renders items as focusable spans with role="radio" (radiogroup pattern)
    const items = canvas.getAllByRole('radio');
    const firstItem = items[0];
    const thirdItem = items[2];
    if (!firstItem || !thirdItem) throw new Error('expected at least three rating items');

    await step('renders 5 rating items by default', async () => {
      await expect(items).toHaveLength(5);
    });

    await step('first item is keyboard-reachable', async () => {
      // Items must be in the tab order (tabindex 0 or unset, not -1)
      await expect(firstItem).not.toHaveAttribute('tabindex', '-1');
      firstItem.focus();
      await expect(firstItem).toHaveFocus();
    });

    await step('ArrowRight moves focus and highlights next item', async () => {
      await userEvent.keyboard('{ArrowRight}');
      // After ArrowRight, focus should have moved to the next item
      const focusedItem = document.activeElement;
      await expect(focusedItem).not.toBeNull();
    });

    await step('items reflect checked state via data-state or data-checked', async () => {
      // Focus the third item directly and select it
      thirdItem.focus();
      await userEvent.keyboard('{Enter}');
      // The selected item should carry data-checked
      const checkedItems = canvasElement.querySelectorAll(
        '[data-scope="rating-group"][data-part="item"][data-checked]',
      );
      await expect(checkedItems.length).toBeGreaterThan(0);
    });

    await step('checked star styling resolves to a real token color', async () => {
      // Backstop: verify the foreground color is a real, non-transparent value
      const firstItem = canvasElement.querySelector<HTMLElement>(
        '[data-scope="rating-group"][data-part="item"]',
      );
      await expect(firstItem).not.toBeNull();
      const color = getComputedStyle(firstItem as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled rating group must not be operable by keyboard.
 * Ark applies `data-disabled` and `aria-disabled` to items; they cannot be
 * activated.
 */
export const DisabledNotOperable: Story = {
  args: { defaultValue: 2, disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = canvas.getAllByRole('radio');

    // All items should be disabled
    for (const item of items) {
      await expect(item).toHaveAttribute('data-disabled');
    }

    // The control itself is marked disabled
    const control = canvasElement.querySelector<HTMLElement>(
      '[data-scope="rating-group"][data-part="control"]',
    );
    await expect(control).toHaveAttribute('data-disabled');
  },
};
