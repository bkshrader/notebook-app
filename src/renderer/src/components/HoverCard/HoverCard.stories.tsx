import type { Meta, StoryObj } from '@storybook/react-vite';

import { HoverCard } from './HoverCard';

const meta: Meta<typeof HoverCard> = {
  title: 'Components/Overlays/HoverCard',
  component: HoverCard,
  args: {
    trigger: <a href="#profile">@sarah_chen</a>,
    children: (
      <div>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Sarah Chen</p>
        <p style={{ margin: 0 }}>Design Engineer at Acme Inc.</p>
      </div>
    ),
    openDelay: 200,
    closeDelay: 100,
  },
};

export default meta;
type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {};

export const Open: Story = {
  args: { open: true },
};

export const LongDelay: Story = {
  args: { openDelay: 1000, closeDelay: 500 },
};
