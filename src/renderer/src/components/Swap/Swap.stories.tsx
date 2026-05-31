import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Swap } from './Swap';

const meta: Meta<typeof Swap> = {
  title: 'Components/Actions/Swap',
  component: Swap,
  args: {
    onIndicator: '✓',
    offIndicator: '✕',
    swap: false,
  },
  argTypes: {
    swap: { control: 'boolean' },
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

/** Swap is a display-only primitive; the interactive container is a button.
 *  This story renders a controlled toggle button wrapping the Swap to exercise
 *  the full keyboard / click interaction. */
export const ToggleButton: Story = {
  render: (args) => {
    // Inline stateful wrapper — using React.useState via a local component
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
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    const button = canvas.getByRole('button', { name: /mute|unmute/i });

    await step('initial state — aria-pressed=false, off indicator visible', async () => {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    await step('click toggles to on state', async () => {
      await userEvent.click(button);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAccessibleName('Mute');
    });

    await step('click again toggles back to off state', async () => {
      await userEvent.click(button);
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAccessibleName('Unmute');
    });

    await step('Space key toggles when button is focused', async () => {
      button.focus();
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    await step('on-indicator element has non-empty color', async () => {
      // Confirm the root indicator span is in the DOM and styled
      const indicators = canvasElement.querySelectorAll(
        '[data-scope="swap"][data-part="indicator"]',
      );
      await expect(indicators.length).toBeGreaterThan(0);
      const onIndicator = Array.from(indicators).find(
        (el) => el.getAttribute('data-type') === 'on',
      );
      if (onIndicator) {
        const color = getComputedStyle(onIndicator).color;
        await expect(color).not.toBe('');
        await expect(color).not.toBe('transparent');
      }
    });
  },
};
