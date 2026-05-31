import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Timer } from './Timer';

const meta: Meta<typeof Timer> = {
  title: 'Components/Display/Timer',
  component: Timer,
  args: {
    label: 'Elapsed time',
  },
  argTypes: {
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

/**
 * ARIA contract for the Timer (Tier A-Display).
 *
 * The timer area is labelled by the `label` prop (via `translations.areaLabel`),
 * which Ark/Zag wires as `aria-label` on the `[data-part="area"]` element.
 *
 * Ark's Timer state machine conditionally hides action-trigger buttons that are
 * not applicable in the current state — only the contextually correct button(s)
 * are visible at any given time. We test each button in the state where it is
 * exposed: Start in idle, Pause while running, Resume while paused.
 *
 * The axe pass runs automatically (preview's `a11y.test: 'error'`), so this
 * play function asserts only the structural ARIA contract and button focusability.
 */
export const AriaContract: Story = {
  args: {
    label: 'Elapsed time',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('timer area has accessible label', async () => {
      const area = canvasElement.querySelector<HTMLElement>(
        '[data-scope="timer"][data-part="area"]',
      );
      await expect(area).not.toBeNull();
      // Ark/Zag wires translations.areaLabel as aria-label on the area element.
      await expect(area).toHaveAttribute('aria-label', 'Elapsed time');
    });

    await step('time item segments are present in the area', async () => {
      // The timer renders three digit segments (hours, minutes, seconds).
      const items = canvasElement.querySelectorAll('[data-scope="timer"][data-part="item"]');
      await expect(items.length).toBeGreaterThanOrEqual(3);
    });

    await step('start button is present and focusable in idle state', async () => {
      // In idle state only the Start button is visible; Pause/Resume/Reset are
      // hidden by Ark's state machine (hidden attribute) until the timer runs.
      const startBtn = canvas.getByRole('button', { name: /start/i });
      await expect(startBtn).not.toHaveAttribute('tabindex', '-1');
      startBtn.focus();
      await expect(startBtn).toHaveFocus();
    });

    await step('clicking start reveals the pause button (running state)', async () => {
      const startBtn = canvas.getByRole('button', { name: /start/i });
      await userEvent.click(startBtn);

      // After starting, Ark shows Pause and hides Start.
      const pauseBtn = canvas.getByRole('button', { name: /pause/i });
      await expect(pauseBtn).not.toHaveAttribute('tabindex', '-1');
    });

    await step('clicking pause reveals the resume button (paused state)', async () => {
      const pauseBtn = canvas.getByRole('button', { name: /pause/i });
      await userEvent.click(pauseBtn);

      // After pausing, Ark shows Resume (and Reset) and hides Pause.
      const resumeBtn = canvas.getByRole('button', { name: /resume/i });
      await expect(resumeBtn).not.toHaveAttribute('tabindex', '-1');

      const resetBtn = canvas.getByRole('button', { name: /reset/i });
      await expect(resetBtn).not.toHaveAttribute('tabindex', '-1');
    });
  },
};
