import type { Meta, StoryObj } from '@storybook/react-vite';

import { Alert } from './Alert';

/** A small inline status glyph stand-in (decorative; the wrapper marks it aria-hidden). */
const Glyph = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" focusable="false">
    <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <rect x="7" y="7" width="2" height="5" rx="1" />
    <rect x="7" y="4" width="2" height="2" rx="1" />
  </svg>
);

const meta: Meta<typeof Alert> = {
  title: 'Components/Feedback/Alert',
  component: Alert,
  args: {
    type: 'inline',
    color: 'neutral',
    title: 'Heads up',
    description: 'Your changes have been saved locally.',
  },
  argTypes: {
    type: { control: 'inline-radio', options: ['page', 'inline', 'compact'] },
    color: {
      control: 'inline-radio',
      options: ['neutral', 'highlight', 'success', 'warning', 'critical'],
    },
    role: { control: 'inline-radio', options: ['alert', 'status'] },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {};

export const WithIcon: Story = {
  args: { icon: <Glyph /> },
};

export const Success: Story = {
  args: {
    color: 'success',
    role: 'status',
    icon: <Glyph />,
    title: 'Saved',
    description: 'The note was written to disk.',
  },
};

export const Warning: Story = {
  args: {
    color: 'warning',
    icon: <Glyph />,
    title: 'Storage almost full',
    description: 'Free up space to keep syncing.',
  },
};

export const Critical: Story = {
  args: {
    color: 'critical',
    icon: <Glyph />,
    title: 'Sync failed',
    description: 'We could not reach the remote folder.',
  },
};

export const Page: Story = {
  args: {
    type: 'page',
    color: 'highlight',
    icon: <Glyph />,
    title: 'New version available',
    description: 'Restart to apply the latest update.',
  },
};

export const Compact: Story = {
  args: {
    type: 'compact',
    color: 'neutral',
    icon: <Glyph />,
    title: 'Hidden in compact',
    description: 'Compact alerts show only the icon and description.',
  },
};

export const DescriptionOnly: Story = {
  args: { title: undefined, description: 'A description with no title is valid.' },
};
