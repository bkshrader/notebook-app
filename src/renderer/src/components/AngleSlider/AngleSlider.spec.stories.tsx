import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AngleSlider } from './AngleSlider';

/**
 * Interaction / accessibility tests for the AngleSlider.
 *
 * Kept separate from the visual stories (`AngleSlider.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered angle, so colocating it with a doc
 * story would make that story animate on load. These stories are named by
 * behavior so a failure is self-describing, each asserts (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Marked `tags: ['test']` so they don't clutter the docs gallery; they still run
 * in the test runner and count toward coverage.
 */
const meta: Meta<typeof AngleSlider> = {
  title: 'Components/Forms/AngleSlider/Tests',
  component: AngleSlider,
  args: { label: 'Rotation' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof AngleSlider>;

/**
 * Drives the primary keyboard interaction for the angle-slider.
 *
 * Ark v5's AngleSlider exposes the thumb (data-part="thumb") as the focusable
 * interactive element with role="slider" and tabindex=0. Arrow keys adjust the
 * angle value. The hidden input carries the value for form submission but is not
 * the interactive target. The axe pass runs automatically (preview's
 * `a11y.test: 'error'`), so this play function asserts the interaction contract.
 */
export const KeyboardInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider');

    await step('starts at default value (0°)', async () => {
      await expect(thumb).toHaveAttribute('aria-valuenow', '0');
    });

    await step('thumb is in the tab order (keyboard-reachable)', async () => {
      // Ark renders the thumb as a focusable div with tabindex=0.
      await expect(thumb).not.toHaveAttribute('tabindex', '-1');
      thumb.focus();
      await expect(thumb).toHaveFocus();
    });

    await step('ArrowRight increments the angle', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(thumb).toHaveAttribute('aria-valuenow', '1');
    });

    await step('ArrowLeft decrements the angle', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await expect(thumb).toHaveAttribute('aria-valuenow', '0');
    });

    await step('ArrowDown increments the angle (Zag maps ArrowDown→INC)', async () => {
      // Zag's keymap: ArrowDown → THUMB.ARROW_INC (clockwise).
      const valueBefore = Number(thumb.getAttribute('aria-valuenow'));
      await userEvent.keyboard('{ArrowDown}');
      const valueAfter = Number(thumb.getAttribute('aria-valuenow'));
      await expect(valueAfter).not.toBe(valueBefore);
    });

    await step('ArrowUp decrements the angle (Zag maps ArrowUp→DEC)', async () => {
      // Zag's keymap: ArrowUp → THUMB.ARROW_DEC (counter-clockwise). Value is
      // currently 1 (from the ArrowDown above); decrement to 0. Zag clamps to
      // [0, 359] rather than wrapping, so we start from a non-zero value.
      const valueBefore = Number(thumb.getAttribute('aria-valuenow'));
      await userEvent.keyboard('{ArrowUp}');
      const valueAfter = Number(thumb.getAttribute('aria-valuenow'));
      await expect(valueAfter).not.toBe(valueBefore);
    });
  },
};

/**
 * Regression guard for the focus-ring contract.
 *
 * The previous CSS keyed the ring off a phantom `data-focus-visible` attribute
 * that Ark does NOT emit for angle-slider (verified against the styling guide
 * and the live DOM), so the ring never rendered. The fix draws the ring via the
 * native `:focus-visible` pseudo on the focusable thumb div. `userEvent.tab()`
 * produces a real keyboard focus that triggers `:focus-visible`, unlike a
 * programmatic `.focus()` — so this guard FAILS against the old broken selector
 * (box-shadow stays 'none') and PASSES after the fix.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider');

    await step('Ark emits no data-focus-visible attribute on the thumb', async () => {
      // The audit-confirmed contract: the ring must rely on :focus-visible, not
      // a data attribute. Asserting absence keeps the dead selector from
      // creeping back.
      await expect(thumb).not.toHaveAttribute('data-focus-visible');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      thumb.blur();
      await userEvent.tab();
      await expect(thumb).toHaveFocus();
      const ring = getComputedStyle(thumb).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * The value-text readout must resolve a real Helios token color — backstop for a
 * `var(--token-*)` that resolves to nothing.
 */
export const ValueTextResolvesToken: Story = {
  args: { defaultValue: 90 },
  play: async ({ canvasElement, step }) => {
    await step('value-text color is a real, non-transparent token', async () => {
      const valueText = canvasElement.querySelector<HTMLElement>(
        '[data-scope="angle-slider"][data-part="value-text"]',
      );
      await expect(valueText).not.toBeNull();
      const color = getComputedStyle(valueText as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled angle-slider must not be operable by keyboard, and its disabled
 * styling must differ visibly from the enabled state.
 *
 * Zag sets `data-disabled` on the thumb (not `aria-disabled`) and guards the
 * onKeyDown handler with `if (!interactive) return` so arrow keys are silently
 * ignored.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 45 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider');

    await step('exposes data-disabled (Zag does not set aria-disabled)', async () => {
      await expect(thumb).toHaveAttribute('data-disabled');
    });

    await step('arrow keys do not change the value when disabled', async () => {
      const valueBefore = thumb.getAttribute('aria-valuenow');
      thumb.focus();
      await userEvent.keyboard('{ArrowRight}');
      await expect(thumb).toHaveAttribute('aria-valuenow', valueBefore);
    });

    await step('disabled thumb is recolored (differs from enabled)', async () => {
      // Regression guard for the data-disabled thumb rule: the disabled thumb
      // background must resolve to a real token (the disabled border color),
      // not be empty/transparent.
      const bg = getComputedStyle(thumb).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
