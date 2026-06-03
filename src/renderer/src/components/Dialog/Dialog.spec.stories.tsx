import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Dialog } from './Dialog';
import { assertOverlayKeyboardCycle } from '../test-helpers';

/**
 * Interaction / accessibility tests for the Dialog.
 *
 * Kept separate from the visual stories (`Dialog.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (opens/closes the overlay), so colocating it with a doc story
 * would make that story flash open on load. Stories are named by behavior so a
 * failure is self-describing, each `play` AWAITS real `expect(...)` assertions,
 * and each uses `step()` for readable runner / Interactions-panel output.
 *
 * Dialog is a Tier B overlay: its Backdrop/Positioner/Content render in a Portal
 * OUTSIDE the story canvas, so post-open queries go through `within(document.body)`,
 * not `within(canvasElement)`.
 */
const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog/Tests',
  component: Dialog,
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to continue?',
    triggerLabel: 'Open Dialog',
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Dialog>;

/**
 * Full keyboard overlay contract: trigger reachable, Enter opens, focus moves
 * into the portalled panel, Escape closes and returns focus to the trigger.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open dialog/i,
      noun: 'dialog',
    });
  },
};

/**
 * Regression guard for the focus-ring fix: the Trigger is a native <button> with
 * NO Ark data-focus-visible attribute, so the ring must hang off the native
 * :focus-visible pseudo. `userEvent.tab()` produces a real keyboard focus that
 * triggers :focus-visible (unlike programmatic .focus()), so the box-shadow
 * resolves. This FAILS against the old dead `[data-focus-visible]` selector.
 */
export const TriggerFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open dialog/i });

    await step('trigger is keyboard-reachable and not removed from tab order', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring on the trigger', async () => {
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
 * Regression guard for the close-trigger focus-ring fix and its distinct
 * secondary styling. Open the dialog, focus the close button, assert the ring
 * renders (native :focus-visible, not the dead data-focus-visible) and that the
 * close button is visually distinct from the primary open trigger.
 */
export const CloseTriggerStyledAndFocusable: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open dialog/i });

    await step('open the dialog', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const panel = await body.findByRole('dialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('close button has an accessible name and a real background', async () => {
      const close = body.getByRole('button', { name: /close/i });
      const cs = getComputedStyle(close);
      // Secondary styling: resolves a real (non-transparent) background.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopWidth).not.toBe('0px');
    });

    await step('keyboard focus renders a visible focus ring on the close button', async () => {
      const close = body.getByRole('button', { name: /close/i });
      close.focus();
      // :focus-visible requires a keyboard-origin focus; dispatch via tab from
      // the focused close button is unreliable across portals, so assert the
      // computed ring under :focus-visible by forcing keyboard modality with a
      // real tab cycle starting at the close button.
      close.blur();
      close.focus();
      await userEvent.keyboard('{Tab}');
      await userEvent.tab({ shift: true });
      await expect(close).toHaveFocus();
      const ring = getComputedStyle(close).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('Escape closes the dialog', async () => {
      await userEvent.keyboard('{Escape}');
    });
  },
};

/**
 * Structural / a11y contract: Title is a semantic <h2> heading, and Ark wires
 * role="dialog" + aria-labelledby on the Content pointing at that Title.
 */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open dialog/i });

    await step('open the dialog', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await body.findByRole('dialog');
    });

    await step('title renders as a semantic h2 heading', async () => {
      const title = document.querySelector("[data-scope='dialog'][data-part='title']");
      await expect(title).not.toBeNull();
      await expect(title!.tagName).toBe('H2');
    });

    await step('content has role=dialog and is named by the title', async () => {
      const content = document.querySelector<HTMLElement>(
        "[data-scope='dialog'][data-part='content']",
      );
      await expect(content).not.toBeNull();
      await expect(content).toHaveAttribute('role', 'dialog');
      const labelledBy = content!.getAttribute('aria-labelledby');
      await expect(labelledBy).toBeTruthy();
      const title = document.querySelector("[data-scope='dialog'][data-part='title']")!;
      await expect(title.id).toBe(labelledBy);
    });

    await step('Escape closes the dialog', async () => {
      await userEvent.keyboard('{Escape}');
    });
  },
};

/**
 * The `role='alertdialog'` pass-through prop is honored by Ark (regression guard
 * for the documented prop flow-through).
 */
export const AlertDialogRole: Story = {
  args: { role: 'alertdialog' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: /open dialog/i });

    await step('opening yields role=alertdialog on the content', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('Escape closes the dialog', async () => {
      await userEvent.keyboard('{Escape}');
    });
  },
};
