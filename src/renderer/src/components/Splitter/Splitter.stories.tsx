import type { Meta, StoryObj } from '@storybook/react-vite';

import { Splitter } from './Splitter';

const meta: Meta<typeof Splitter> = {
  title: 'Components/Layout/Splitter',
  component: Splitter,
  args: {
    panels: [
      { id: 'a', minSize: 10 },
      { id: 'b', minSize: 10 },
    ],
    resizeTriggerLabel: 'Resize panels',
    orientation: 'horizontal',
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
    },
    disabled: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ blockSize: '300px', inlineSize: '600px', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Splitter>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

/**
 * The resize trigger is disabled: the handle no longer accepts pointer or
 * keyboard resize and Ark marks it with `data-disabled`, which dims the handle
 * and its indicator pill.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    resizeTriggerLabel: 'Resize panels (disabled)',
  },
};
