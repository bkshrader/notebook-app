import type { Meta, StoryObj } from '@storybook/react-vite';

import { Field } from './Field';

const meta: Meta<typeof Field> = {
  title: 'Components/Forms/Field',
  component: Field,
  args: {
    label: 'Email address',
    helperText: 'We will never share your email.',
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    inline: { control: 'boolean' },
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

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    helperText: 'This value cannot be changed.',
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

export const Small: Story = {
  args: { size: 'small' },
};

export const Medium: Story = {
  args: { size: 'medium' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Inline: Story = {
  args: {
    inline: true,
    label: 'Coupon code',
    helperText: undefined,
  },
};
