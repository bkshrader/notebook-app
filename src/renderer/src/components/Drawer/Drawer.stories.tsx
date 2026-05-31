import type { Meta, StoryObj } from '@storybook/react-vite';

import { Drawer } from './Drawer';
import { assertOverlayKeyboardCycle } from '../test-helpers';

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

/**
 * Tier B overlay play test — drives the full portalled-overlay keyboard cycle
 * (trigger reachable, Enter opens, focus trap, Esc closes, focus restore) via the
 * shared `assertOverlayKeyboardCycle` helper. The drawer content renders in a
 * Portal, so the helper queries it through `document.body`.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open drawer/i,
      noun: 'drawer',
    });
  },
};
