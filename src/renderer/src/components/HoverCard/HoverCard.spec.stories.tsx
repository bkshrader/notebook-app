import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { HoverCard } from './HoverCard';

/**
 * Interaction / accessibility tests for the HoverCard.
 *
 * Kept separate from the visual stories (`HoverCard.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * open/animate on load. Stories are named by behavior so a failure is
 * self-describing, each asserts with `await`ed `expect(...)` (storybook/test
 * matchers are async — eslint would flag an un-awaited one), and each uses
 * `step()` + `within(canvasElement)` for readable runner output.
 *
 * HoverCard is a Tier-B overlay, but unlike a dialog/drawer it is NON-MODAL:
 * Ark opens it on pointer hover OR keyboard focus of the trigger (not Enter),
 * the content carries NO ARIA role, and focus is NOT moved into the panel.
 * The shared `assertOverlayKeyboardCycle` helper encodes the *modal* contract
 * (Enter-to-open, role='dialog', focus-moves-in) and therefore does not fit
 * this component; these guards assert the real hover-card keyboard contract
 * (focus opens, Esc closes, focus returns) plus the Helios regression guards.
 */
const CONTENT_OPEN = "[data-scope='hover-card'][data-part='content'][data-state='open']";

const meta: Meta<typeof HoverCard> = {
  title: 'Components/Overlays/HoverCard/Tests',
  component: HoverCard,
  args: {
    // A button trigger is reliably keyboard-focusable across runners.
    trigger: <button type="button">Hover or focus me</button>,
    children: (
      <div>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Sarah Chen</p>
        <p style={{ margin: 0 }}>Design Engineer at Acme Inc.</p>
      </div>
    ),
    openDelay: 0,
    closeDelay: 0,
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof HoverCard>;

/** The Ark structural contract: every styled part is emitted under the
 *  hover-card scope (verified against the live DOM during the audit). */
export const StructureContract: Story = {
  args: { open: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('trigger renders the asChild element under the hover-card scope', async () => {
      const trigger = body.getByRole('button', { name: 'Hover or focus me' });
      await expect(trigger).toHaveAttribute('data-scope', 'hover-card');
      await expect(trigger).toHaveAttribute('data-part', 'trigger');
    });

    await step('content, arrow and arrow-tip parts are emitted when open', async () => {
      const content = document.querySelector(CONTENT_OPEN);
      await expect(content).not.toBeNull();
      await expect(
        document.querySelector("[data-scope='hover-card'][data-part='arrow']"),
      ).not.toBeNull();
      await expect(
        document.querySelector("[data-scope='hover-card'][data-part='arrow-tip']"),
      ).not.toBeNull();
    });

    await step('content resolves a real surface, border and elevation', async () => {
      const content = document.querySelector<HTMLElement>(CONTENT_OPEN)!;
      const cs = getComputedStyle(content);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.boxShadow).not.toBe('none');
      await expect(cs.borderTopWidth).not.toBe('0px');
    });
  },
};

/** Regression guard for the focus-ring fix: the trigger drew its ring on a dead
 *  `[data-focus-visible]` selector (Ark emits no such attribute), so the ring
 *  never rendered. It now uses the native `:focus-visible`, which `userEvent.tab()`
 *  (real keyboard focus) triggers — unlike a programmatic `.focus()`. This guard
 *  FAILS against the old selector and PASSES after the fix. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Hover or focus me' });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** The hover-card keyboard contract: focus opens it, Escape closes it and
 *  returns focus to the trigger. (Non-modal: focus stays on the trigger,
 *  it is not pulled into the portalled panel.) */
export const KeyboardOpenAndDismiss: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Hover or focus me' });

    await step('focusing the trigger opens the panel', async () => {
      trigger.focus();
      await expect(trigger).toHaveFocus();
      await waitFor(async () => {
        await expect(document.querySelector(CONTENT_OPEN)).not.toBeNull();
      });
    });

    await step('focus stays on the trigger (non-modal overlay)', async () => {
      await expect(trigger).toHaveFocus();
    });

    await step('Escape closes the panel and focus returns to the trigger', async () => {
      // Re-send Escape inside the retry: a single Escape can land while Ark is
      // still settling the open transition and be missed (overlay open/close
      // race). Retrying until the content unmounts is deterministic.
      await waitFor(async () => {
        await userEvent.keyboard('{Escape}');
        await expect(document.querySelector(CONTENT_OPEN)).toBeNull();
      });
      await expect(trigger).toHaveFocus();
    });
  },
};

/** Pointer hover opens the panel and unhovering closes it. */
export const PointerHoverOpens: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Hover or focus me' });

    await step('hovering the trigger opens the panel', async () => {
      await userEvent.hover(trigger);
      await waitFor(async () => {
        await expect(document.querySelector(CONTENT_OPEN)).not.toBeNull();
      });
    });

    await step('unhovering closes the panel', async () => {
      await userEvent.unhover(trigger);
      await waitFor(async () => {
        await expect(document.querySelector(CONTENT_OPEN)).toBeNull();
      });
    });
  },
};
