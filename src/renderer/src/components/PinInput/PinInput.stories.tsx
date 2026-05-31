import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PinInput } from './PinInput';

const meta: Meta<typeof PinInput> = {
  title: 'Components/Forms/PinInput',
  component: PinInput,
  args: {
    label: 'Verification code',
    length: 4,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    length: { control: { type: 'number', min: 2, max: 8 } },
  },
};

export default meta;

type Story = StoryObj<typeof PinInput>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const SixDigitOtp: Story = {
  args: {
    label: 'One-time password',
    length: 6,
    otp: true,
  },
};

/**
 * Drives the keyboard interaction path for the PinInput.
 *
 * Ark v5's PinInput renders a sequence of real native <input> elements inside
 * a Control wrapper. Each input is focusable (tabindex is not -1) and accepts
 * typed characters, advancing focus automatically after each entry. We focus
 * the first input directly (userEvent.tab() may skip clip-hidden inputs), type
 * characters, and assert that the inputs fill via data-filled and that focus
 * advances. We also assert the computed border color of a filled input to catch
 * token variables that resolve to nothing.
 */
export const KeyboardEntry: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');
    const [firstInput, secondInput] = inputs;
    if (!firstInput || !secondInput) throw new Error('expected at least two pin inputs');

    await step('renders 4 input slots', async () => {
      await expect(inputs).toHaveLength(4);
    });

    await step('first input is in the tab order (keyboard-reachable)', async () => {
      await expect(firstInput).not.toHaveAttribute('tabindex', '-1');
      firstInput.focus();
      await expect(firstInput).toHaveFocus();
    });

    await step('typing a digit fills the first slot and advances focus', async () => {
      await userEvent.keyboard('1');
      await expect(firstInput).toHaveAttribute('data-filled');
      // Ark auto-advances focus to the next input after a character is entered.
      await expect(secondInput).toHaveFocus();
    });

    await step('typing more digits fills subsequent slots', async () => {
      await userEvent.keyboard('234');
      await expect(inputs[1]).toHaveAttribute('data-filled');
      await expect(inputs[2]).toHaveAttribute('data-filled');
      await expect(inputs[3]).toHaveAttribute('data-filled');
    });

    await step('all slots complete — root carries data-complete', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="root"]',
      );
      await expect(root).toHaveAttribute('data-complete');
    });

    await step('filled input border resolves to a real token color', async () => {
      const firstInput = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="input"]',
      );
      await expect(firstInput).not.toBeNull();
      const borderColor = getComputedStyle(firstInput as HTMLElement).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled PinInput must not be operable by keyboard.
 * Ark applies `disabled` to each underlying input element,
 * removing them from the tab order and preventing entry.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');

    for (const input of inputs) {
      await expect(input).toBeDisabled();
    }

    // Attempting to type into a disabled pin-input must not change state.
    await userEvent.keyboard('1234');
    for (const input of inputs) {
      await expect(input).toHaveValue('');
    }
  },
};
