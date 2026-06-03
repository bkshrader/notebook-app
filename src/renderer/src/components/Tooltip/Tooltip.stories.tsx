import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'This is a tooltip',
    children: <button type="button">Hover or focus me</button>,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    openDelay: { control: { type: 'number' } },
    closeDelay: { control: { type: 'number' } },
  },
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

/** Tooltip closed by default; trigger is visible and keyboard-reachable. */
export const Default: Story = {};

/** Tooltip opened immediately (zero delay) to show the content panel. */
export const Open: Story = {
  args: {
    open: true,
    openDelay: 0,
    closeDelay: 0,
  },
};

/** Tooltip with longer display text to exercise max-inline-size clamping. */
export const LongContent: Story = {
  args: {
    content:
      'This is a longer tooltip description that exercises the max-inline-size token clamping to ensure text wraps gracefully within the overlay panel.',
    openDelay: 0,
    closeDelay: 0,
    open: true,
  },
};
