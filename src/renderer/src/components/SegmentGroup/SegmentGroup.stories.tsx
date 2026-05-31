import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { SegmentGroup } from './SegmentGroup';

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const meta: Meta<typeof SegmentGroup> = {
  title: 'Components/Forms/SegmentGroup',
  component: SegmentGroup,
  args: {
    label: 'Calendar view',
    options: VIEW_OPTIONS,
    defaultValue: 'week',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof SegmentGroup>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithDisabledItem: Story = {
  args: {
    options: [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month', disabled: true },
    ],
  },
};

/**
 * Drives the primary keyboard interaction for the segment group (radio-group
 * APG pattern): Tab focuses the selected item, arrow keys move selection.
 *
 * Ark v5 renders a visually-hidden native `<input type="radio">` inside each
 * segment item. The group's accessible role is `radiogroup`; each input has
 * role `radio`. Tab moves focus to the checked radio; arrow keys cycle through
 * the options and update the checked state. `userEvent.tab()` skips clip-hidden
 * inputs, so we focus the checked radio directly and then use keyboard events.
 * The axe pass runs automatically via the preview `a11y.test: 'error'` config.
 */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // The radio group contains multiple radio inputs; the defaultValue is 'week'.
    const radios = canvas.getAllByRole('radio');
    const [dayRadio, weekRadio, monthRadio] = radios;
    if (!dayRadio || !weekRadio || !monthRadio) {
      throw new Error('expected three segment radios');
    }

    await step('starts with the default value checked', async () => {
      await expect(dayRadio).not.toBeChecked();
      await expect(weekRadio).toBeChecked();
      await expect(monthRadio).not.toBeChecked();

      const weekItem = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"][data-state="checked"]',
      );
      await expect(weekItem).not.toBeNull();
      await expect(weekItem).toHaveAttribute('data-state', 'checked');
    });

    await step('the checked radio is keyboard-reachable (not tabindex=-1)', async () => {
      // The checked radio is in the tab order; others are tabindex="-1".
      await expect(weekRadio).not.toHaveAttribute('tabindex', '-1');
      // Drive focus directly since userEvent.tab() skips clip-hidden inputs.
      weekRadio.focus();
      await expect(weekRadio).toHaveFocus();
    });

    await step('ArrowRight moves selection to the next item', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(monthRadio).toBeChecked();

      const monthItem = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"][data-state="checked"]',
      );
      await expect(monthItem).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowLeft moves selection back', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await expect(weekRadio).toBeChecked();
    });

    await step('checked segment styling resolves to a real token value', async () => {
      // Backstop: toggle selection to "day" then verify the indicator's
      // background resolves to a real, non-transparent value.
      dayRadio.focus();
      await userEvent.keyboard('{ArrowLeft}');
      const indicator = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="indicator"]',
      );
      await expect(indicator).not.toBeNull();
      const bg = getComputedStyle(indicator!).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A fully-disabled segment group must not be operable by keyboard. Ark applies
 * `disabled` to all the underlying radio inputs, removing them from the tab
 * order so keyboard users cannot interact with them.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 'week' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');

    for (const radio of radios) {
      await expect(radio).toBeDisabled();
    }

    // Attempting to change a disabled group must not alter state.
    const [dayRadio] = radios;
    await expect(dayRadio).not.toBeChecked();
    await userEvent.keyboard('{ArrowRight}');
    await expect(dayRadio).not.toBeChecked();
  },
};
