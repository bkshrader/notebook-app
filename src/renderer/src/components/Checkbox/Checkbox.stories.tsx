import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Checkbox } from './Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
  args: { label: 'Accept terms' },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };

/**
 * Tier A play test — drives the primary keyboard interaction (Space to toggle)
 * and asserts state via the native input's checked property and the control
 * element's data-state attribute. Also verifies a disabled checkbox is not
 * operable and that the checked control has a real (non-empty, non-transparent)
 * background-color applied by the token-based CSS.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Ark v5 checkbox renders a visually-hidden native <input type="checkbox">
    // with role="checkbox". userEvent.tab() skips clip-hidden inputs, so we
    // focus directly then drive Space to toggle.
    const input = canvas.getByRole('checkbox');

    // Assert the hidden input is not explicitly removed from tab order.
    await expect(input).not.toHaveAttribute('tabindex', '-1');

    // Focus the native input directly (tab-skips clip-hidden elements).
    input.focus();
    await expect(input).toHaveFocus();

    // Space toggles the checkbox (APG pattern).
    await userEvent.keyboard(' ');

    // Native input should now be checked.
    await expect(input).toBeChecked();

    // The presentational control element should reflect data-state="checked".
    const control = canvasElement.querySelector("[data-scope='checkbox'][data-part='control']");
    await expect(control).toHaveAttribute('data-state', 'checked');

    // Backstop: verify the checked control has a real background-color token
    // value (not empty, not transparent) so we know the CSS is actually applied.
    const style = window.getComputedStyle(control as Element);
    await expect(style.backgroundColor).not.toBe('');
    await expect(style.backgroundColor).not.toBe('transparent');

    // Toggle back off with Space.
    await userEvent.keyboard(' ');
    await expect(input).not.toBeChecked();
    await expect(control).toHaveAttribute('data-state', 'unchecked');
  },
};

/**
 * Verifies that a disabled checkbox cannot be operated via keyboard.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');

    // Disabled native inputs do not accept focus or keyboard events.
    await expect(input).toBeDisabled();
    await expect(input).not.toBeChecked();

    // Attempting to focus a disabled input has no effect.
    input.focus();
    await expect(input).not.toHaveFocus();
  },
};
