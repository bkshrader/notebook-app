import type { Meta, StoryObj } from '@storybook/react-vite';

import { SegmentGroup } from './SegmentGroup';

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const meta: Meta<typeof SegmentGroup> = {
  title: 'Components/Forms/SegmentGroup',
  component: SegmentGroup,
  args: {
    label: 'Calendar view',
    options: VIEW_OPTIONS,
    defaultValue: 'week',
    size: 'medium',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof SegmentGroup>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithDisabledItem: Story = {
  args: {
    options: [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month', disabled: true },
    ],
  },
};
