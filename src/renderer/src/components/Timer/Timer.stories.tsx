import type { Meta, StoryObj } from '@storybook/react-vite';

import { Timer } from './Timer';

/**
 * Visual / documentation stories for the Timer (Tier A-Display).
 *
 * These stories are pristine: none has a `play` that mutates timer state, so the
 * docs gallery never animates or auto-runs on load. Interaction and a11y
 * regression guards live in `Timer.spec.stories.tsx` per the `*.spec.stories.tsx`
 * convention.
 */
const meta: Meta<typeof Timer> = {
  title: 'Components/Display/Timer',
  component: Timer,
  args: {
    label: 'Elapsed time',
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    countdown: { control: 'boolean' },
    autoStart: { control: 'boolean' },
    startMs: { control: 'number' },
    targetMs: { control: 'number' },
    interval: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof Timer>;

/** Default stopwatch — counts up from 00:00:00. Controls: Start, Pause, Resume, Reset. */
export const Default: Story = {};

/** Countdown timer — starts at 5 minutes and counts down to zero. */
export const Countdown: Story = {
  args: {
    label: 'Countdown timer',
    countdown: true,
    startMs: 5 * 60 * 1000,
  },
};

/** Timer that starts automatically on mount. */
export const AutoStart: Story = {
  args: {
    label: 'Auto-started timer',
    autoStart: true,
  },
};

/** The three sizes side by side: segment padding and inter-element gaps scale. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'flex-start' }}>
      <Timer {...args} size="small" label="Small timer" />
      <Timer {...args} size="medium" label="Medium timer" />
      <Timer {...args} size="large" label="Large timer" />
    </div>
  ),
};
