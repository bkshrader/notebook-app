import type { Meta, StoryObj } from '@storybook/react-vite';

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
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
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

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: ['1', '2', '3', '4'] },
};

export const Required: Story = {
  args: { required: true },
};

export const SixDigitOtp: Story = {
  args: {
    label: 'One-time password',
    length: 6,
    otp: true,
  },
};
