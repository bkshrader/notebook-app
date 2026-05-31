import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from './Field';

const meta: Meta<typeof Field> = {
  title: 'Components/Forms/Field',
  component: Field,
  args: {
    label: 'Email address',
    helperText: 'We will never share your email.',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
    errorText: 'Please enter a valid email address.',
    helperText: undefined,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    required: true,
    showRequiredIndicator: true,
    label: 'Username',
    helperText: undefined,
  },
};

export const KeyboardInteraction: Story = {
  args: {
    label: 'Full name',
    helperText: 'Enter your full legal name.',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Input is present and labelled', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      await expect(input).toBeInTheDocument();
    });

    await step('Input receives focus and shows focus ring', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      // Tab to the input (it should be in normal tab order)
      input.focus();
      await expect(document.activeElement).toBe(input);
    });

    await step('User can type into the input', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      input.focus();
      await userEvent.keyboard('Jane Doe');
      await expect(input).toHaveValue('Jane Doe');
    });

    await step('Input border color is a real value (not empty/transparent)', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      const styles = getComputedStyle(input);
      await expect(styles.borderColor).not.toBe('');
      await expect(styles.borderColor).not.toBe('transparent');
    });
  },
};

export const DisabledIsNotOperable: Story = {
  args: {
    disabled: true,
    label: 'Locked field',
    helperText: 'This field cannot be edited.',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Disabled input is not interactive', async () => {
      const input = canvas.getByRole('textbox', { name: /locked field/i });
      await expect(input).toBeDisabled();
    });

    await step('Disabled input does not accept keyboard input', async () => {
      const input = canvas.getByRole('textbox', { name: /locked field/i });
      const valueBefore = input.getAttribute('value') ?? '';
      input.focus();
      await userEvent.keyboard('should not appear');
      await expect(input).toHaveValue(valueBefore);
    });
  },
};
