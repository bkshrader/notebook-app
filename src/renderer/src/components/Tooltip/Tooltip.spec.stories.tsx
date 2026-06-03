import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tooltip } from './Tooltip';

/**
 * Interaction / accessibility tests for the Tooltip.
 *
 * Kept separate from the visual stories (`Tooltip.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (focuses the trigger, opens/closes the panel), so colocating
 * it with a doc story would make that story flash/animate on load. Stories are
 * named by behavior so a failure is self-describing, each asserts (a `play`
 * without `expect` is a state-setter, not a test), and each uses `step()`.
 *
 * NOTE on the shared overlay helper: `assertOverlayKeyboardCycle` models the
 * dialog/drawer/popover contract — Enter opens the panel and focus MOVES INTO
 * it. A tooltip is a different overlay tier: it opens on focus (not Enter), and
 * focus REMAINS on the trigger (the panel is `aria-describedby`, never focused).
 * Reusing that helper would assert a contract Ark's tooltip deliberately does
 * not implement and fail spuriously, so the tooltip keyboard cycle is asserted
 * directly here.
 */
const meta: Meta<typeof Tooltip> = {
  title: 'Components/Overlays/Tooltip/Tests',
  component: Tooltip,
  args: {
    openDelay: 0,
    closeDelay: 0,
    content: 'Keyboard-accessible tooltip content',
    children: <button type="button">Focus target</button>,
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

/**
 * The tooltip keyboard contract for this overlay tier:
 *   1. Trigger is keyboard-reachable (tabindex is not -1).
 *   2. Tooltip opens on focus (NOT Enter) — tooltip tier requirement.
 *   3. Portalled content carries role="tooltip" and data-state="open".
 *   4. Escape closes the tooltip.
 *   5. Focus remains on the trigger throughout (never moves into the panel).
 */
export const KeyboardFocusCycle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Focus target' });

    await step('trigger is in the tab order (keyboard-reachable)', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('tooltip opens on focus, not Enter', async () => {
      // userEvent.tab() fires the real focus-event chain (focusin/focus) Ark's
      // state machine listens to; a raw trigger.focus() stays closed in Playwright.
      await userEvent.tab();
      await expect(trigger).toHaveFocus();

      // Portalled — findByRole retries until the state machine reaches 'open'.
      const panel = await body.findByRole('tooltip');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('focus stays on the trigger while open (panel is not focused)', async () => {
      await expect(trigger).toHaveFocus();
    });

    await step('Escape closes the tooltip', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(body.queryByRole('tooltip', { hidden: false })).toBeNull();
      });
    });

    await step('focus remains on the trigger after close', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};

/**
 * Regression guard for the data-focus-visible → :focus-visible fix.
 *
 * The trigger renders as an HTMLButtonElement and emits NO data-focus-visible
 * attribute (verified against the live DOM), so the old
 * `[data-part='trigger'][data-focus-visible]` selector was phantom and the
 * keyboard focus ring never rendered. The ring now lives on the native
 * `:focus-visible` pseudo. `userEvent.tab()` produces a real keyboard focus
 * that triggers `:focus-visible`; a programmatic `.focus()` would NOT — which
 * is exactly why the old selector silently failed.
 */
export const KeyboardFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Focus target' });

    await step('the trigger exposes no data-focus-visible attribute', async () => {
      // Confirms the old selector was phantom: Ark uses native focus state here.
      await expect(trigger).not.toHaveAttribute('data-focus-visible');
    });

    await step('keyboard focus paints a visible focus ring via :focus-visible', async () => {
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * The portalled content is a styled, token-backed surface — guards that the
 * `--token-tooltip-*` families resolve to real values (not the empty string a
 * typo'd/undefined token would yield, which would leave the panel transparent).
 */
export const ContentSurfaceIsStyled: Story = {
  args: { open: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('content has a real background and elevation shadow', async () => {
      const panel = await body.findByRole('tooltip');
      const cs = getComputedStyle(panel);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.backgroundColor).not.toBe('');
      await expect(cs.boxShadow).not.toBe('none');
    });

    await step('content clamps to the max-inline-size token (not 0/none)', async () => {
      const panel = await body.findByRole('tooltip');
      const maxInline = getComputedStyle(panel).maxInlineSize;
      await expect(maxInline).not.toBe('none');
      await expect(maxInline).not.toBe('0px');
    });
  },
};

/** A disabled tooltip never opens, even on keyboard focus. */
export const DisabledNeverOpens: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button', { name: 'Focus target' });

    await step('focusing a disabled tooltip trigger shows no panel', async () => {
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      // Give the (zero-delay) state machine a tick; the panel must stay absent.
      await waitFor(async () => {
        await expect(body.queryByRole('tooltip', { hidden: false })).toBeNull();
      });
    });
  },
};
