import type { Meta, StoryObj } from '@storybook/react-vite';

import { Fieldset } from './Fieldset';

const meta: Meta<typeof Fieldset> = {
  title: 'Components/Forms/Fieldset',
  component: Fieldset,
  args: { legend: 'Contact Details' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Fieldset>;

export const Default: Story = {};

export const WithHelperText: Story = {
  args: {
    legend: 'Shipping Address',
    helperText: 'Enter the address where you want your order delivered.',
  },
};

export const Invalid: Story = {
  args: {
    legend: 'Payment Info',
    invalid: true,
    errorText: 'Please correct the errors below.',
  },
};

export const Disabled: Story = {
  args: {
    legend: 'Shipping Address',
    disabled: true,
    helperText: 'Your address cannot be changed after order confirmation.',
  },
};
