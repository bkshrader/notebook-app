import type { Meta, StoryObj } from '@storybook/react-vite';

import { Separator } from './Separator';

const meta: Meta<typeof Separator> = {
  title: 'Components/Layout/Separator',
  component: Separator,
  args: { orientation: 'horizontal', spacing: '24' },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    spacing: {
      control: 'inline-radio',
      options: ['24', '0'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

/** A horizontal divider between two blocks of content (the Helios default). */
export const Default: Story = {
  render: (args) => (
    <div style={{ inlineSize: '20rem' }}>
      <p style={{ margin: 0 }}>Section one</p>
      <Separator {...args} />
      <p style={{ margin: 0 }}>Section two</p>
    </div>
  ),
};

/** The tightly-integrated layout option: no margin around the divider. */
export const NoSpacing: Story = {
  args: { spacing: '0' },
  render: (args) => (
    <div style={{ inlineSize: '20rem' }}>
      <p style={{ margin: 0 }}>Section one</p>
      <Separator {...args} />
      <p style={{ margin: 0 }}>Section two</p>
    </div>
  ),
};

/** A vertical divider between two inline items (e.g. a toolbar group). */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div style={{ display: 'flex', alignItems: 'center', blockSize: '2rem' }}>
      <span>Item one</span>
      <Separator {...args} />
      <span>Item two</span>
    </div>
  ),
};
