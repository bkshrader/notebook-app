import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Timer } from './Timer';

/**
 * Interaction / accessibility tests for the Timer (Tier A-Display).
 *
 * Kept separate from the visual stories (`Timer.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): these
 * `play` functions MUTATE timer state (start/pause) and assert computed styles,
 * so colocating them with a doc story would make that story animate on load.
 * Each story is behavior-named, asserts with real (awaited) `expect`, and uses
 * `step()` for readable runner / Interactions-panel output.
 *
 * `tags: ['test']` keeps these out of the docs gallery; they still run in the
 * test runner and count toward coverage.
 */
const meta: Meta<typeof Timer> = {
  title: 'Components/Display/Timer/Tests',
  component: Timer,
  args: { label: 'Elapsed time', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Timer>;

/** The Helios/Ark structural contract: scoped parts, labelled area, digit segments. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('every styled node emits the timer scope + its part', async () => {
      const parts = [...canvasElement.querySelectorAll('[data-scope="timer"]')].map((el) =>
        el.getAttribute('data-part'),
      );
      // Regression guard: the audit flagged root/area/separator/control/
      // action-trigger as "not emitted" — DOM-verified false positives. If Ark
      // ever stops emitting them our scope/part selectors would go dead, so
      // assert each is present.
      for (const part of ['root', 'area', 'item', 'separator', 'control', 'action-trigger']) {
        await expect(parts).toContain(part);
      }
    });

    await step('timer area carries the accessible label', async () => {
      const area = canvasElement.querySelector<HTMLElement>(
        '[data-scope="timer"][data-part="area"]',
      );
      await expect(area).not.toBeNull();
      // Ark/Zag wires translations.areaLabel as aria-label on the area element.
      await expect(area).toHaveAttribute('aria-label', 'Elapsed time');
    });

    await step('three digit segments are present in the area', async () => {
      const items = canvasElement.querySelectorAll('[data-scope="timer"][data-part="item"]');
      await expect(items.length).toBeGreaterThanOrEqual(3);
    });

    await step('size is reflected on the root for the per-size layout vars', async () => {
      const root = canvasElement.querySelector('[data-scope="timer"][data-part="root"]');
      await expect(root).toHaveAttribute('data-size', 'medium');
    });
  },
};

/** Keyboard focus renders a visible ring; mouse hover does NOT draw the ring. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const startBtn = canvas.getByRole('button', { name: /start/i });

    await step('start button is keyboard-reachable in idle state', async () => {
      await expect(startBtn).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus draws a visible focus ring', async () => {
      // Regression guard for the data-focus-visible -> :focus-visible fix. The
      // old `[data-part='action-trigger'][data-focus-visible]` selector never
      // matched (Ark emits no such attribute on the native <button>), so no ring
      // rendered. userEvent.tab() is a real keyboard focus that triggers
      // :focus-visible, unlike programmatic .focus().
      startBtn.blur();
      await userEvent.tab();
      await expect(startBtn).toHaveFocus();
      const ring = getComputedStyle(startBtn).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('at rest there is no focus ring', async () => {
      // The ring is keyed off :focus-visible, not a persistent attribute, so an
      // unfocused trigger must paint no box-shadow. (We blur rather than assert
      // post-click, since the test runner keeps :focus-visible active after a
      // synthetic pointer click.)
      startBtn.blur();
      const ring = getComputedStyle(startBtn).boxShadow;
      await expect(ring).toBe('none');
    });
  },
};

/** The trigger resolves a real interactive surface and an interaction-speed transition. */
export const TriggerSurface: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const startBtn = canvas.getByRole('button', { name: /start/i });

    await step('the trigger sits on a real (non-transparent) interactive surface', async () => {
      const bg = getComputedStyle(startBtn).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('background transition uses the fast form-toggle duration (~0.2s)', async () => {
      // Regression guard for the borrowed-timing finding: a slower borrowed
      // token (e.g. the 0.6s tabs-indicator) would feel sluggish on a button.
      const cs = getComputedStyle(startBtn);
      await expect(cs.transitionProperty).toContain('background-color');
      await expect(cs.transitionDuration).toBe('0.2s');
    });
  },
};

/** Ark's state machine swaps the contextually-correct control as the timer runs. */
export const StateMachineControls: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('idle: Start is exposed and focusable', async () => {
      const startBtn = canvas.getByRole('button', { name: /start/i });
      await expect(startBtn).not.toHaveAttribute('tabindex', '-1');
      startBtn.focus();
      await expect(startBtn).toHaveFocus();
    });

    await step('running: clicking Start reveals Pause', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /start/i }));
      const pauseBtn = canvas.getByRole('button', { name: /pause/i });
      await expect(pauseBtn).not.toHaveAttribute('tabindex', '-1');
    });

    await step('paused: clicking Pause reveals Resume and Reset', async () => {
      await userEvent.click(canvas.getByRole('button', { name: /pause/i }));
      await expect(canvas.getByRole('button', { name: /resume/i })).not.toHaveAttribute(
        'tabindex',
        '-1',
      );
      await expect(canvas.getByRole('button', { name: /reset/i })).not.toHaveAttribute(
        'tabindex',
        '-1',
      );
    });
  },
};
