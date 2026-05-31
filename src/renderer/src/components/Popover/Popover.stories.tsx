import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { assertOverlayKeyboardCycle } from '../test-helpers';
import { Popover } from './Popover';

const meta: Meta<typeof Popover> = {
  title: 'Components/Overlays/Popover',
  component: Popover,
  args: {
    triggerLabel: 'Open popover',
    title: 'Favorite Frameworks',
    description: 'Manage and organize your favorite web frameworks.',
    content: null,
  },
  argTypes: {
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Popover>;

/** Popover closed by default — the trigger is visible; the panel is absent. */
export const Default: Story = {};

/** Popover open on first render so the panel is immediately visible in docs. */
export const Open: Story = {
  args: { defaultOpen: true },
};

/** Disabled trigger cannot be activated by keyboard or pointer. */

/**
 * Tier B overlay play test — keyboard open / focus-into-panel / Esc close /
 * focus-restore contract.
 *
 * Content is portalled to document.body via `<Portal>`, so the panel lives
 * OUTSIDE canvasElement. Uses the shared assertOverlayKeyboardCycle helper
 * which correctly handles the exit-animation delay via waitFor.
 */
export const KeyboardOpenCloseFocusCycle: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open popover/i,
      panelRole: 'dialog',
      noun: 'popover panel',
    });
  },
};

/**
 * The close-trigger button inside the panel dismisses the popover and
 * returns focus to the original trigger.
 */
export const CloseTriggerButton: Story = {
  args: { defaultOpen: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open popover/i });

    await step('panel is open', async () => {
      const panel = await screen.findByRole('dialog');
      await expect(panel).toBeInTheDocument();
    });

    await step('close button dismisses the panel', async () => {
      const closeBtn = screen.getByRole('button', { name: /close popover/i });
      closeBtn.focus();
      await userEvent.keyboard('{Enter}');
      // Exit animation may delay unmount; waitFor retries until gone.
      await waitFor(async () => {
        await expect(screen.queryByRole('dialog')).toBeNull();
      });
    });

    await step('focus returns to the original trigger', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};
