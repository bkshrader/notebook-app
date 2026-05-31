import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { FloatingPanel } from './FloatingPanel';

const meta: Meta<typeof FloatingPanel> = {
  title: 'Components/Overlays/FloatingPanel',
  component: FloatingPanel,
  args: {
    title: 'Floating Panel',
    triggerLabel: 'Open Panel',
    children: <p>Panel body content.</p>,
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof FloatingPanel>;

export const Default: Story = {};

export const DefaultOpen: Story = {
  args: { defaultOpen: true },
};

/**
 * Tier B overlay play test.
 *
 * The floating panel content renders in a Portal OUTSIDE the story canvas, so
 * after opening we query via document.body (not within(canvasElement)).
 *
 * Flow:
 *   1. Trigger is in the canvas — focus it, press Enter to open.
 *   2. Assert panel content is in document.body with data-part="content".
 *   3. Assert focus moved into the panel (Ark auto-focuses the content).
 *   4. Press Escape — panel closes, focus returns to the trigger.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open panel/i });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the floating panel', async () => {
      await userEvent.keyboard('{Enter}');
      // Panel is portalled — query from document.body. findBy retries across
      // the enter animation rather than racing it.
      // Ark's getContentProps sets role="dialog" (not "region").
      const content = await within(document.body).findByRole('dialog');
      await expect(content).toHaveAttribute('data-state', 'open');
    });

    await step('focus moves into the floating panel', async () => {
      const content = within(document.body).getByRole('dialog');
      await expect(content).toContainElement(document.activeElement as HTMLElement);
    });

    await step('Escape closes the floating panel', async () => {
      await userEvent.keyboard('{Escape}');
      // The exit animation unmounts the content; waitFor retries until gone.
      await waitFor(() =>
        expect(
          document.body.querySelector('[data-scope="floating-panel"][data-part="content"]'),
        ).toBeNull(),
      );
    });

    await step('focus returns to the trigger after close', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};
