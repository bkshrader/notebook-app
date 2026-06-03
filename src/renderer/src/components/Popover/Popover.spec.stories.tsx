import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { assertOverlayKeyboardCycle } from '../test-helpers';
import { Popover } from './Popover';

/**
 * Interaction / accessibility tests for the Popover.
 *
 * Kept separate from the visual stories (`Popover.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * animate/flash on load. These stories are named by behavior so a failure is
 * self-describing, and each asserts (a `play` without `expect` is a state-setter,
 * not a test) via `step()` for readable runner / Interactions-panel output.
 *
 * The panel is portalled to document.body via `<Portal>`, so it lives OUTSIDE
 * canvasElement — queries that target the panel use `within(document.body)`.
 *
 * Several guards are regression guards for the Ark-contract fixes: Ark's Trigger
 * and CloseTrigger are native <button> elements that emit NO data-focus-visible,
 * so the keyboard focus ring is drawn via the native :focus-visible pseudo.
 * `userEvent.tab()` produces a real keyboard focus that triggers :focus-visible
 * (unlike programmatic .focus()). These guards FAIL against the old dead
 * `[data-focus-visible]` selectors and PASS after the fix.
 */
const meta: Meta<typeof Popover> = {
  title: 'Components/Overlays/Popover/Tests',
  component: Popover,
  args: {
    triggerLabel: 'Open popover',
    title: 'Favorite Frameworks',
    description: 'Manage and organize your favorite web frameworks.',
    content: null,
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Popover>;

/**
 * Tier-B overlay keyboard contract: trigger is reachable; Enter opens; focus
 * moves into the portalled panel; Esc closes and restores focus to the trigger.
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
 * Regression guard: keyboard focus renders a visible focus ring on the trigger.
 * The ring is the trigger's own box-shadow via the native :focus-visible pseudo
 * (Ark exposes NO data-focus-visible attribute — the old `[data-focus-visible]`
 * selector was dead and drew nothing).
 */
export const TriggerFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open popover/i });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus draws a real focus ring', async () => {
      // A real keyboard tab triggers :focus-visible; programmatic focus may not.
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
 * Regression guard: the close button inside the panel also draws a real focus
 * ring on keyboard focus (native :focus-visible, not a dead data attribute),
 * dismisses the popover, and returns focus to the trigger.
 */
export const CloseTriggerFocusRingAndDismiss: Story = {
  args: { defaultOpen: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open popover/i });

    await step('panel is open', async () => {
      const panel = await body.findByRole('dialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('close button draws a real focus ring on keyboard focus', async () => {
      const closeBtn = body.getByRole('button', { name: /close popover/i });
      closeBtn.focus();
      // Re-enter via keyboard so :focus-visible matches.
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await userEvent.tab();
      const focused = document.activeElement;
      await expect(focused).not.toBeNull();
      const ring = getComputedStyle(focused as HTMLElement).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('close button dismisses the panel', async () => {
      const closeBtn = body.getByRole('button', { name: /close popover/i });
      await userEvent.click(closeBtn);
      await waitFor(async () => {
        await expect(body.queryByRole('dialog')).toBeNull();
      });
    });

    await step('focus returns to the original trigger', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};

/**
 * The trigger reflects the open/closed state via `data-state` (which Popover.css
 * keys the open-state border + active surface off — NOT a label-color recolor,
 * mirroring the Accordion "no action-color recolor" deviation), and the panel
 * mounts on open / unmounts on close. Guards that open↔closed state contract.
 *
 * NOTE: we assert the `data-state` contract (deterministic) rather than diffing
 * computed border/background — after close, Ark restores focus to the trigger,
 * so its focused resting style legitimately overlaps the open-state colors in
 * some themes; a pixel diff would test focus-overlap, not the open contract.
 */
export const OpenStateRestylesTrigger: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open popover/i });

    await step('starts closed with no panel', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      await expect(body.queryByRole('dialog')).toBeNull();
    });

    await step('opening flips the trigger to data-state=open and mounts the panel', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const panel = await body.findByRole('dialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
      await expect(trigger).toHaveAttribute('data-state', 'open');
      // The open-state rule resolves a real (non-empty) border color.
      await expect(getComputedStyle(trigger).borderColor).not.toBe('');
    });

    await step(
      'closing flips the trigger back to data-state=closed and unmounts the panel',
      async () => {
        // Dismiss via the close button (deterministic) rather than racing the
        // Escape handler against the open transition.
        const closeBtn = body.getByRole('button', { name: /close popover/i });
        await userEvent.click(closeBtn);
        await waitFor(async () => {
          await expect(body.queryByRole('dialog')).toBeNull();
          await expect(trigger).toHaveAttribute('data-state', 'closed');
        });
      },
    );
  },
};

/**
 * The open panel resolves a real surface: an elevation box-shadow and a
 * non-transparent background. Guards the content panel surface tokens.
 */
export const ContentResolvesSurface: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('panel paints a real elevated surface', async () => {
      const panel = await body.findByRole('dialog');
      const cs = getComputedStyle(panel);
      await expect(cs.boxShadow).not.toBe('none');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('title and description wire the accessible name/description', async () => {
      const panel = body.getByRole('dialog');
      await expect(panel).toHaveAttribute('aria-labelledby');
      await expect(panel).toHaveAttribute('aria-describedby');
    });
  },
};
