import type { Meta, StoryObj } from '@storybook/react-vite';

import { CopySnippet } from './CopySnippet';

const meta: Meta<typeof CopySnippet> = {
  title: 'Components/Actions/CopySnippet',
  component: CopySnippet,
  args: {
    text: 'npm install @notebook-app/core',
    color: 'primary',
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
    isFullWidth: { control: 'boolean' },
    isTruncated: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CopySnippet>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { color: 'secondary', text: 'cluster-id-7f3a9c2e' },
};

export const FullWidth: Story = {
  args: { isFullWidth: true, text: 'https://example.com/share/abc123def456' },
};

export const Truncated: Story = {
  args: {
    isTruncated: true,
    text: 'sk-proj-aVeryLongSecretTokenThatShouldBeClampedToOneEllipsizedLine0123456789',
  },
};
