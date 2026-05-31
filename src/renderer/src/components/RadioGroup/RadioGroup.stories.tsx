import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { RadioGroup } from './RadioGroup';

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'solid', label: 'Solid' },
  { value: 'vue', label: 'Vue' },
];

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Forms/RadioGroup',
  component: RadioGroup,
  args: {
    groupLabel: 'Framework',
    options: FRAMEWORKS,
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'solid' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the keyboard interaction path for the radio group.
 *
 * Ark v5's radio group renders each option as a visually-hidden
 * `<input type="radio">` (role `radio`). The group follows the APG radio-group
 * pattern: Tab focuses the selected radio (or the first one if nothing is
 * selected), and arrow keys move between options. The presentational
 * ItemControl is aria-hidden and carries `data-state` for CSS styling.
 *
 * The axe pass runs automatically (preview's `a11y.test: 'error'`), so this
 * play function asserts only the interaction contract.
 */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // All three radio inputs
    const radios = canvas.getAllByRole('radio');
    const [first, second, third] = radios;
    if (!first || !second || !third) throw new Error('expected at least three radios');

    const getControl = (index: number) =>
      canvasElement.querySelectorAll<HTMLElement>(
        '[data-scope="radio-group"][data-part="item-control"]',
      )[index];

    await step('starts with no value selected', async () => {
      await expect(first).not.toBeChecked();
      await expect(second).not.toBeChecked();
      await expect(third).not.toBeChecked();
    });

    await step('radio inputs are in the tab order (keyboard-reachable)', async () => {
      // Ark renders inputs as real focusable controls (tabindex not -1).
      // userEvent.tab() skips clip-hidden elements, so we focus directly.
      await expect(first).not.toHaveAttribute('tabindex', '-1');
      first.focus();
      await expect(first).toHaveFocus();
    });

    await step('ArrowDown moves focus and checks the next option', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await expect(second).toHaveFocus();
      await expect(second).toBeChecked();
      await expect(getControl(1)).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowDown again advances to the third option', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await expect(third).toHaveFocus();
      await expect(third).toBeChecked();
      await expect(getControl(2)).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowUp moves back to the second option', async () => {
      await userEvent.keyboard('{ArrowUp}');
      await expect(second).toHaveFocus();
      await expect(second).toBeChecked();
      await expect(getControl(1)).toHaveAttribute('data-state', 'checked');
    });

    await step('checked styling resolves to a real token value', async () => {
      // Backstop: assert the checked item-control has a real, non-transparent
      // border-color so a var(--token-*) that resolves to nothing is caught.
      const checkedControl = getControl(1);
      if (!checkedControl) throw new Error('expected a checked radio control');
      const borderColor = getComputedStyle(checkedControl).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled radio group must not be operable by keyboard.
 * Ark applies the native `disabled` attribute to each underlying radio input,
 * removing them from the tab order and preventing state changes.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 'react' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');

    // All inputs must be disabled
    for (const radio of radios) {
      await expect(radio).toBeDisabled();
    }

    // The first option is pre-selected; keyboard interaction must not change it
    const [first] = radios;
    if (!first) throw new Error('expected at least one radio');
    first.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(first).toBeChecked();
  },
};
