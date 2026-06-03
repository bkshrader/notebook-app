import type { Meta, StoryObj } from '@storybook/react-vite';

import { ColorPicker } from './ColorPicker';

const meta: Meta<typeof ColorPicker> = {
  title: 'Components/Forms/ColorPicker',
  component: ColorPicker,
  args: { label: 'Brand color', size: 'medium' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ColorPicker>;

export const Default: Story = {};

export const WithSwatches: Story = {
  args: {
    label: 'Highlight color',
    swatches: ['#2872f5', '#08875d', '#c00005', '#a07800', '#7b00db'],
  },
};

export const Small: Story = {
  args: { size: 'small', label: 'Accent (small)' },
};

export const Large: Story = {
  args: { size: 'large', label: 'Accent (large)' },
};

export const Disabled: Story = {
  args: { label: 'Disabled', disabled: true },
};
