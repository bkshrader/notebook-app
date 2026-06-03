import type { Meta, StoryObj } from '@storybook/react-vite';

import { Drawer } from './Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'Components/Overlays/Drawer',
  component: Drawer,
  args: {
    title: 'Drawer Panel',
    triggerLabel: 'Open Drawer',
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Drawer>;

export const Default: Story = {};

export const WithContent: Story = {
  args: {
    title: 'Navigation',
    triggerLabel: 'Open Navigation',
    children: <p style={{ marginBlock: '1rem' }}>Drawer body content goes here.</p>,
  },
};
