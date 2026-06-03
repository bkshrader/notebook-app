import type { Meta, StoryObj } from '@storybook/react-vite';

import { Dialog } from './Dialog';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog',
  component: Dialog,
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to continue?',
    triggerLabel: 'Open Dialog',
  },
  argTypes: {
    open: { control: 'boolean' },
    modal: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: {
    title: 'Delete Note',
    description: 'This action cannot be undone. The note will be permanently removed.',
    triggerLabel: 'Delete',
  },
};

export const WithChildren: Story = {
  args: {
    title: 'Settings',
    description: 'Update your preferences below.',
    triggerLabel: 'Open Settings',
    children: <p>Settings content goes here.</p>,
  },
};
