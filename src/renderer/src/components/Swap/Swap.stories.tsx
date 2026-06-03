import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Swap } from './Swap';

const meta: Meta<typeof Swap> = {
  title: 'Components/Actions/Swap',
  component: Swap,
  args: {
    onIndicator: '✓',
    offIndicator: '✕',
    swap: false,
    size: 'medium',
  },
  argTypes: {
    swap: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  decorators: [
    (Story) => (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Swap>;

export const Default: Story = {};

export const SwappedOn: Story = {
  args: { swap: true },
};

export const Small: Story = {
  args: { size: 'small', swap: true },
};

export const Large: Story = {
  args: { size: 'large', swap: true },
};

/** Swap is a display-only primitive; the interactive container is a button.
 *  This story renders a controlled toggle button wrapping the Swap to show the
 *  full keyboard / click interaction pattern. Interaction is exercised by the
 *  matching test story (`Swap.spec.stories.tsx`), so this visual story stays
 *  pristine (no state-mutating `play`). */
export const ToggleButton: Story = {
  render: (args) => {
    const ToggleWrapper = () => {
      const [swapped, setSwapped] = React.useState(false);
      return (
        <button
          type="button"
          aria-label={swapped ? 'Mute' : 'Unmute'}
          aria-pressed={swapped}
          onClick={() => setSwapped((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
          }}
        >
          <Swap {...args} swap={swapped} />
        </button>
      );
    };
    return <ToggleWrapper />;
  },
};
