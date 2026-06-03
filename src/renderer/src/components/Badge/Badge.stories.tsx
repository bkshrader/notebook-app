import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Display/Badge',
  component: Badge,
  args: { text: 'New', color: 'neutral', variant: 'filled', size: 'medium' },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['neutral', 'highlight', 'success', 'warning', 'critical'],
    },
    variant: {
      control: 'inline-radio',
      options: ['filled', 'outlined'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const Outlined: Story = {
  args: { text: 'Beta', variant: 'outlined' },
};

export const Success: Story = {
  args: { text: 'Applied', color: 'success' },
};

export const Warning: Story = {
  args: { text: 'Degraded', color: 'warning' },
};

export const Critical: Story = {
  args: { text: 'Errored', color: 'critical' },
};

export const Highlight: Story = {
  args: { text: 'In Preview', color: 'highlight' },
};

export const WithIcon: Story = {
  args: {
    text: 'Running',
    color: 'success',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="5" />
      </svg>
    ),
  },
};

export const Small: Story = {
  args: { text: 'Esc', size: 'small' },
};

export const Large: Story = {
  args: { text: 'Enterprise', size: 'large' },
};
