import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NumberInput } from './NumberInput';

const meta: Meta<typeof NumberInput> = {
  title: 'Components/Forms/NumberInput',
  component: NumberInput,
  args: { label: 'Quantity' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof NumberInput>;

export const Default: Story = {};

export const WithMinMax: Story = {
  args: { min: 0, max: 100, defaultValue: '50' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: '10' },
};

/**
 * Drives the primary keyboard interaction for a spinbutton.
 *
 * Ark v5 NumberInput renders a native `<input type="text">` with
 * role="spinbutton" (aria-valuenow/min/max). Arrow keys increment/decrement
 * the value. The input is the directly-focusable element; trigger buttons
 * are also keyboard-operable but the spinbutton APG pattern is the primary path.
 */
export const KeyboardIncrement: Story = {
  args: { min: 0, max: 10, defaultValue: '5' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');
    const control = canvasElement.querySelector<HTMLElement>(
      '[data-scope="number-input"][data-part="control"]',
    );

    await step('starts at default value', async () => {
      await expect(input).toHaveValue('5');
    });

    await step('the input is in the tab order (keyboard-reachable)', async () => {
      // Assert not explicitly removed from tab order, then focus directly so
      // subsequent userEvent.keyboard calls land on the active element.
      // Ark/Zag hooks focus via the React onFocus handler on the <input>, which
      // fires for both raw .focus() and userEvent.click(). Either approach works
      // for establishing focus; raw .focus() is used here to match the Slider
      // story pattern and avoid triggering any click-specific side effects.
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('ArrowUp increments value', async () => {
      // Ark/Zag's increment action calls syncInputElement, which schedules the
      // actual DOM update via requestAnimationFrame. waitFor retries the
      // assertion across the RAF boundary so the test does not read stale state.
      await userEvent.keyboard('{ArrowUp}');
      await waitFor(() => expect(input).toHaveValue('6'));
    });

    await step('ArrowDown decrements value', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await waitFor(() => expect(input).toHaveValue('5'));
    });

    await step('styled control resolves to a real surface color', async () => {
      // Backstop: assert the control's background-color is a real, non-transparent value.
      await expect(control).not.toBeNull();
      const bg = getComputedStyle(control as HTMLElement).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled number input must not be operable by keyboard.
 * Ark applies [data-disabled] and the native `disabled` attribute so the
 * input is removed from the tab order and cannot be changed.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: '5' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');

    await expect(input).toBeDisabled();

    // Attempting to activate a disabled input must not change its value.
    await userEvent.keyboard('{ArrowUp}');
    await expect(input).toHaveValue('5');
  },
};
