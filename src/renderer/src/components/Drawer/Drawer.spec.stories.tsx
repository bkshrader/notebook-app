import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Drawer } from './Drawer';
import { assertOverlayKeyboardCycle } from '../test-helpers';

/**
 * Interaction / accessibility tests for the Drawer.
 *
 * Kept separate from the visual stories (`Drawer.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (opening the drawer, moving
 * focus), so colocating it with a doc story would make that story animate/flash
 * on load. Stories are named by behavior so a failure is self-describing, each
 * asserts (a `play` without `expect` is a state-setter, not a test), and each
 * uses `step()` for readable runner / Interactions-panel output.
 *
 * This is a Tier B overlay: the Content/CloseTrigger render in a Portal outside
 * the story canvas, so they are queried through `document.body`, not
 * `canvasElement`.
 */
const meta: Meta<typeof Drawer> = {
  title: 'Components/Overlays/Drawer/Tests',
  component: Drawer,
  args: {
    title: 'Drawer Panel',
    triggerLabel: 'Open Drawer',
    children: <p style={{ marginBlock: '1rem' }}>Drawer body content goes here.</p>,
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Drawer>;

/**
 * The full portalled-overlay keyboard contract: trigger reachable, Enter opens,
 * focus moves into the panel, Esc closes, focus restores. Driven by the shared
 * `assertOverlayKeyboardCycle` helper (queries the portalled panel via
 * `document.body`).
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open drawer/i,
      noun: 'drawer',
    });
  },
};

/**
 * Regression guard for the trigger focus ring. The old CSS targeted a phantom
 * `[data-focus-visible]` attribute Ark never emits on this native <button>, so
 * the keyboard ring never rendered. The fix uses the native `:focus-visible`
 * pseudo. `userEvent.tab()` produces a real keyboard focus (triggers
 * `:focus-visible`); a programmatic `.focus()` would not.
 */
export const TriggerFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open drawer/i });

    await step('keyboard focus draws a visible ring on the trigger', async () => {
      trigger.blur();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard for the close-trigger focus ring — same phantom-attribute
 * fix as the trigger, but on the portalled CloseTrigger. Open the drawer, walk
 * focus to the Close button, and assert the native `:focus-visible` ring
 * resolves.
 */
export const CloseTriggerFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open drawer/i });

    await step('open the drawer from the keyboard', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const dialog = await body.findByRole('dialog');
      await expect(dialog).toHaveAttribute('data-state', 'open');
    });

    await step('keyboard focus draws a visible ring on the close trigger', async () => {
      const close = body.getByRole('button', { name: /close/i });
      close.focus();
      // Move focus away and tab back so :focus-visible is keyboard-driven.
      close.blur();
      close.focus();
      await userEvent.keyboard('{Tab}');
      // Land focus back on Close via keyboard, regardless of intervening order.
      let guard = 0;
      while (document.activeElement !== close && guard < 6) {
        await userEvent.keyboard('{Tab}');
        guard += 1;
      }
      await expect(close).toHaveFocus();
      const ring = getComputedStyle(close).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('Escape closes the drawer', async () => {
      await userEvent.keyboard('{Escape}');
    });
  },
};

/**
 * Regression guard for the animation timing token. The old CSS borrowed
 * `--token-tabs-indicator-transition-duration` (0.6s — too slow for an overlay
 * interaction); the fix uses `--token-form-toggle-transition-duration` (0.2s).
 * Assert the content's open animation resolves to the fast duration, not the
 * slow tabs value. (Reduced-motion is off in this story's default toolbar
 * state, so the animation is present.)
 */
export const ContentAnimationIsFast: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open drawer/i });

    await step('open the drawer', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const dialog = await body.findByRole('dialog');
      await expect(dialog).toHaveAttribute('data-state', 'open');
    });

    await step('content open animation uses the fast form-toggle duration', async () => {
      const content = body.getByRole('dialog');
      const duration = getComputedStyle(content).animationDuration;
      // 0.2s (form-toggle), explicitly NOT 0.6s (the old borrowed tabs token).
      await expect(duration).toBe('0.2s');
    });

    await step('Escape closes the drawer', async () => {
      await userEvent.keyboard('{Escape}');
    });
  },
};
