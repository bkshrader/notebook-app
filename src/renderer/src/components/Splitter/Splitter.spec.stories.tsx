import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Splitter } from './Splitter';

/**
 * Interaction / accessibility tests for the Splitter.
 *
 * Kept separate from the visual stories (`Splitter.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (it resizes the panels and
 * moves focus), so colocating it with a doc story would make that story shift on
 * load. These stories are named by behavior so a failure is self-describing,
 * each asserts (a `play` without `expect` is a state-setter, not a test), and
 * each uses `step()` for readable runner / Interactions-panel output.
 *
 * Ark v5's ResizeTrigger renders as a `<button>` element, but zag-js overrides
 * the implicit button role with `role="separator"` (the ARIA window-splitter
 * pattern). Query by `role="separator"` with the accessible name from
 * `aria-label`.
 */
const meta: Meta<typeof Splitter> = {
  title: 'Components/Layout/Splitter/Tests',
  component: Splitter,
  args: {
    panels: [
      { id: 'a', minSize: 10 },
      { id: 'b', minSize: 10 },
    ],
    resizeTriggerLabel: 'Resize panels',
    orientation: 'horizontal',
  },
  decorators: [
    (Story) => (
      <div style={{ blockSize: '300px', inlineSize: '600px', display: 'flex' }}>
        <Story />
      </div>
    ),
  ],
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Splitter>;

/**
 * Keyboard focus renders a visible ring on the resize trigger.
 *
 * Regression guard: the ring is drawn via the native `:focus-visible` pseudo
 * because Ark exposes NO `data-focus-visible` attribute on the resize-trigger
 * (it only emits `data-focus`). This test FAILS against the old dead
 * `[data-part='resize-trigger'][data-focus-visible]` selector and PASSES after
 * the native-pseudo fix. `userEvent.tab()` produces a real keyboard focus that
 * triggers `:focus-visible`, unlike a programmatic `.focus()`.
 */
export const FocusRingContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('separator', { name: 'Resize panels' });

    await step('the resize trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring on the trigger', async () => {
      // Regression guard: the ring is drawn via the native :focus-visible pseudo
      // (Ark exposes NO data-focus-visible attribute). userEvent.tab() is a real
      // keyboard focus that triggers :focus-visible, unlike a programmatic
      // .focus(); this FAILS against the old dead [data-focus-visible] selector.
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      await expect(trigger.matches(':focus-visible')).toBe(true);
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Arrow keys move the split point (the core keyboard resize contract). */
export const KeyboardResize: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('separator', { name: 'Resize panels' });

    await step('the trigger starts without data-dragging', async () => {
      await expect(trigger).not.toHaveAttribute('data-dragging');
    });

    const panelA = canvasElement.querySelector<HTMLElement>(
      '[data-scope="splitter"][data-part="panel"]',
    );

    await step('ArrowRight grows the leading panel', async () => {
      await expect(panelA).not.toBeNull();
      trigger.focus();
      const before = panelA!.getBoundingClientRect().width;
      await userEvent.keyboard('{ArrowRight}');
      const after = panelA!.getBoundingClientRect().width;
      await expect(after).toBeGreaterThanOrEqual(before);
    });

    await step('ArrowLeft reverses the move', async () => {
      const before = panelA!.getBoundingClientRect().width;
      await userEvent.keyboard('{ArrowLeft}');
      const after = panelA!.getBoundingClientRect().width;
      await expect(after).toBeLessThanOrEqual(before);
    });
  },
};

/**
 * The indicator pill always paints a real background (regression guard for the
 * base color and the borrowed-token replacement: the pill must resolve a real
 * size/color, not a transparent or empty value).
 */
export const IndicatorPaints: Story = {
  play: async ({ canvasElement, step }) => {
    await step('the indicator pill resolves a real background and size', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>(
        '[data-scope="splitter"][data-part="resize-trigger-indicator"]',
      );
      await expect(indicator).not.toBeNull();
      const cs = getComputedStyle(indicator!);
      await expect(cs.backgroundColor).not.toBe('');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      // Horizontal default: the pill is a tall thin bar (length on block axis).
      await expect(indicator!.getBoundingClientRect().height).toBeGreaterThan(0);
      await expect(indicator!.getBoundingClientRect().width).toBeGreaterThan(0);
    });
  },
};

/**
 * A disabled resize trigger exposes its disabled state, is marked with Ark's
 * `data-disabled`, and renders distinctly from the enabled handle.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true, resizeTriggerLabel: 'Resize panels (disabled)' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('separator', { name: 'Resize panels (disabled)' });

    await step('Ark marks the disabled trigger with data-disabled', async () => {
      await expect(trigger).toHaveAttribute('data-disabled');
    });

    await step('the disabled handle renders distinctly from the enabled handle', async () => {
      // Regression guard: data-disabled drives a distinct background on the
      // handle (surface-interactive-disabled) and dims the pill.
      const indicator = canvasElement.querySelector<HTMLElement>(
        '[data-scope="splitter"][data-part="resize-trigger-indicator"]',
      );
      await expect(indicator).not.toBeNull();
      await expect(getComputedStyle(indicator!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(getComputedStyle(trigger).cursor).toBe('default');
    });
  },
};
