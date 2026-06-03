import type { Meta, StoryObj } from '@storybook/react-vite';

import { BadgeCount } from './BadgeCount';

const meta: Meta<typeof BadgeCount> = {
  title: 'Components/Display/BadgeCount',
  component: BadgeCount,
  args: { children: '3', type: 'filled', size: 'medium' },
  argTypes: {
    type: {
      control: 'inline-radio',
      options: ['filled', 'inverted', 'outlined'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof BadgeCount>;

export const Default: Story = {};

export const Inverted: Story = {
  args: { type: 'inverted' },
};

export const Outlined: Story = {
  args: { type: 'outlined' },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

/** A longer numeric label, e.g. a semantic version string. */
export const VersionNumber: Story = {
  args: { children: 'v1.2.0', type: 'outlined' },
};
