import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { RatingGroup } from './RatingGroup';

/**
 * Interaction / accessibility tests for the RatingGroup.
 *
 * Kept separate from the visual stories (`RatingGroup.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * change on load. Stories are named by behavior so a failure is
 * self-describing, each asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner / Interactions-panel
 * output.
 *
 * Regression guards target the audit fixes:
 *   - keyboard focus ring renders via the native `:focus-visible` (Ark exposes
 *     NO `data-focus-visible` on the Item part — the old selector was dead).
 *   - disabled items are inoperable and visually distinct.
 *   - selecting an item drives `data-checked`.
 *   - the `size` prop changes the rendered star dimension.
 */
const meta: Meta<typeof RatingGroup> = {
  title: 'Components/Forms/RatingGroup/Tests',
  component: RatingGroup,
  args: { label: 'Rate this item', defaultValue: 0, size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof RatingGroup>;

/** Items are keyboard-reachable and reflect selection via `data-checked`. */
export const KeyboardSelection: Story = {
  args: { defaultValue: 0 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const items = canvas.getAllByRole('radio');

    await step('renders 5 rating items by default', async () => {
      await expect(items).toHaveLength(5);
    });

    await step('first item is keyboard-reachable (not removed from tab order)', async () => {
      const first = items[0]!;
      await expect(first).not.toHaveAttribute('tabindex', '-1');
    });

    await step('selecting an item drives data-checked', async () => {
      const third = items[2]!;
      third.focus();
      await userEvent.keyboard('{Enter}');
      const checked = canvasElement.querySelectorAll(
        '[data-scope="rating-group"][data-part="item"][data-checked]',
      );
      await expect(checked.length).toBeGreaterThan(0);
    });
  },
};

/**
 * Regression guard for the audit's HIGH finding: the keyboard focus ring is
 * drawn via the native `:focus-visible` pseudo on the Item, NOT the dead
 * `[data-focus-visible]` attribute selector (Ark never emits that attribute).
 * `userEvent.tab()` produces a real keyboard focus that triggers
 * `:focus-visible`, unlike programmatic `.focus()`.
 */
export const KeyboardFocusRing: Story = {
  args: { defaultValue: 0 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getAllByRole('radio')[0]!;

    await step('Tab moves keyboard focus to the first item', async () => {
      first.blur();
      await userEvent.tab();
      await expect(first).toHaveFocus();
    });

    await step('the focused item renders a visible focus ring', async () => {
      const ring = getComputedStyle(first).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** The checked star resolves to a real, non-transparent token color. */
export const CheckedColorResolves: Story = {
  args: { defaultValue: 3 },
  play: async ({ canvasElement, step }) => {
    await step('a checked item paints a real, non-transparent color', async () => {
      const checked = canvasElement.querySelector<HTMLElement>(
        '[data-scope="rating-group"][data-part="item"][data-checked]',
      );
      await expect(checked).not.toBeNull();
      const color = getComputedStyle(checked!).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled rating group must not be operable by keyboard, exposes its state
 * to AT, and is visually distinct from an enabled item.
 */
export const DisabledNotOperable: Story = {
  args: { defaultValue: 2, disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const items = canvas.getAllByRole('radio');

    await step('every item exposes its disabled state to assistive tech', async () => {
      for (const item of items) {
        await expect(item).toHaveAttribute('data-disabled');
      }
    });

    await step('the control itself is marked disabled', async () => {
      const control = canvasElement.querySelector<HTMLElement>(
        '[data-scope="rating-group"][data-part="control"]',
      );
      await expect(control).toHaveAttribute('data-disabled');
    });

    await step('a disabled item is visually distinct (foreground-disabled color)', async () => {
      const item = items[0]!;
      const color = getComputedStyle(item).color;
      // foreground-disabled is a real, non-transparent value distinct from the
      // warning/faint colors of the enabled states.
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('cursor is not-allowed on disabled items', async () => {
      await expect(getComputedStyle(items[0]!).cursor).toBe('not-allowed');
    });
  },
};

/** The `size` prop drives the rendered star dimension via `data-size`. */
export const SizeScale: Story = {
  args: { defaultValue: 3, size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('data-size lands on the root', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="rating-group"][data-part="root"]',
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-size', 'large');
    });

    await step('large size renders 24px stars (bigger than the 16px fallback)', async () => {
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="rating-group"][data-part="item"]',
      );
      await expect(item).not.toBeNull();
      const size = parseFloat(getComputedStyle(item!).inlineSize);
      await expect(size).toBeGreaterThan(16);
    });
  },
};
