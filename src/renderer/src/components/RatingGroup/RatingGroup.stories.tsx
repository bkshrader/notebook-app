import type { Meta, StoryObj } from '@storybook/react-vite';

import { RatingGroup } from './RatingGroup';

const meta: Meta<typeof RatingGroup> = {
  title: 'Components/Forms/RatingGroup',
  component: RatingGroup,
  args: {
    label: 'Rate this item',
    defaultValue: 0,
    size: 'medium',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    count: { control: 'number' },
    defaultValue: { control: 'number' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;

type Story = StoryObj<typeof RatingGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 3 },
};

export const Small: Story = {
  args: { defaultValue: 3, size: 'small' },
};

export const Large: Story = {
  args: { defaultValue: 3, size: 'large' },
};

export const Disabled: Story = {
  args: { defaultValue: 2, disabled: true },
};

export const ReadOnly: Story = {
  args: { defaultValue: 4, readOnly: true },
};
