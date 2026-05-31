import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'This is a tooltip',
    children: <button type="button">Hover or focus me</button>,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    openDelay: { control: { type: 'number' } },
    closeDelay: { control: { type: 'number' } },
  },
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

/** Tooltip closed by default; trigger is visible and keyboard-reachable. */
export const Default: Story = {};

/** Tooltip opened immediately (zero delay) to show the content panel. */
export const Open: Story = {
  args: {
    open: true,
    openDelay: 0,
    closeDelay: 0,
  },
};

/** Tooltip with longer display text to exercise max-inline-size clamping. */
export const LongContent: Story = {
  args: {
    content:
      'This is a longer tooltip description that exercises the max-inline-size token clamping to ensure text wraps gracefully within the overlay panel.',
    openDelay: 0,
    closeDelay: 0,
    open: true,
  },
};

/**
 * Tier B play test — keyboard + focus interaction for an overlay component.
 *
 * The tooltip content renders in a Portal outside the story canvas, so the
 * panel MUST be queried via `document.body` (NOT `within(canvasElement)`).
 *
 * Contract asserted:
 *   1. Trigger is keyboard-reachable (tabindex is not -1).
 *   2. Tooltip opens on focus (tooltip/hover-card tier requirement).
 *   3. Tooltip content is present in the document when open.
 *   4. Escape closes the tooltip.
 *   5. Focus remains on the trigger after close.
 *
 * axe runs automatically via the preview's `a11y.test: 'error'` config.
 */
export const KeyboardFocusInteraction: Story = {
  args: {
    openDelay: 0,
    closeDelay: 0,
    content: 'Keyboard-accessible tooltip content',
    children: <button type="button">Focus target</button>,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Focus target' });

    await step('trigger is in the tab order (keyboard-reachable)', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('tooltip opens on focus', async () => {
      // userEvent.tab() fires the real browser focus-event chain (focusin/focus)
      // that Ark's state machine listens to. A raw trigger.focus() call bypasses
      // these synthetic events and the tooltip stays closed in Playwright.
      await userEvent.tab();
      await expect(trigger).toHaveFocus();

      // Content renders in a Portal — find via document.body with findByRole so
      // the assertion retries until Ark's state machine transitions to 'open' and
      // the hidden="" attribute is removed. Do NOT call toBeVisible() immediately
      // (animation lag).
      const body = within(document.body);
      const panel = await body.findByRole('tooltip');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('Escape closes the tooltip', async () => {
      await userEvent.keyboard('{Escape}');

      // After close the panel is removed from the DOM or transitions to
      // data-state="closed". Use waitFor to ride out the exit animation.
      const body = within(document.body);
      await waitFor(async () => {
        await expect(body.queryByRole('tooltip', { hidden: false })).toBeNull();
      });
    });

    await step('focus remains on the trigger after close', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};
