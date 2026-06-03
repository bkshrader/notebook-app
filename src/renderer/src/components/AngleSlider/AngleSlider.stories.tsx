import type { Meta, StoryObj } from '@storybook/react-vite';

import { AngleSlider } from './AngleSlider';

const meta: Meta<typeof AngleSlider> = {
  title: 'Components/Forms/AngleSlider',
  component: AngleSlider,
  args: { label: 'Rotation' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    defaultValue: { control: { type: 'number', min: 0, max: 359, step: 1 } },
    step: { control: { type: 'number', min: 1, max: 45 } },
  },
};

export default meta;

type Story = StoryObj<typeof AngleSlider>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 90 },
};

export const Disabled: Story = {
  args: { disabled: true },
};
