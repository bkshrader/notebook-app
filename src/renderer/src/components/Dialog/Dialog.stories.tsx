import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Dialog } from './Dialog';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog',
  component: Dialog,
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to continue?',
    triggerLabel: 'Open Dialog',
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};

export const WithChildren: Story = {
  args: {
    title: 'Settings',
    description: 'Update your preferences below.',
    triggerLabel: 'Open Settings',
    children: <p style={{ marginBlock: '1rem' }}>Settings content goes here.</p>,
  },
};

/**
 * Tier B overlay play test.
 *
 * The dialog content renders in a Portal OUTSIDE the story canvas, so after
 * opening we query via document.body (not within(canvasElement)).
 *
 * Flow:
 *   1. Trigger is in the canvas — focus it, press Enter to open.
 *   2. Assert panel is in document.body with role="dialog".
 *   3. Assert focus moved into the panel (Ark auto-focuses the content).
 *   4. Press Escape — panel closes, focus returns to the trigger.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open dialog/i });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the dialog', async () => {
      await userEvent.keyboard('{Enter}');
      // Panel is portalled — query from document.body
      const panel = within(document.body).getByRole('dialog');
      await expect(panel).toBeVisible();
    });

    await step('focus moves into the dialog panel', async () => {
      const panel = within(document.body).getByRole('dialog');
      await expect(panel).toContainElement(document.activeElement as HTMLElement);
    });

    await step('Escape closes the dialog', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(within(document.body).queryByRole('dialog')).toBeNull();
    });

    await step('focus returns to the trigger after close', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};
