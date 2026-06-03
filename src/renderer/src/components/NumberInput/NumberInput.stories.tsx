import type { Meta, StoryObj } from '@storybook/react-vite';

import { NumberInput } from './NumberInput';

const meta: Meta<typeof NumberInput> = {
  title: 'Components/Forms/NumberInput',
  component: NumberInput,
  args: { label: 'Quantity' },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
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

export const Invalid: Story = {
  args: { invalid: true, defaultValue: '7' },
};

export const Small: Story = {
  args: { size: 'small', defaultValue: '3' },
};

export const Large: Story = {
  args: { size: 'large', defaultValue: '3' },
};
