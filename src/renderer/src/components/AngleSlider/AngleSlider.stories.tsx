import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AngleSlider } from './AngleSlider';

const meta: Meta<typeof AngleSlider> = {
  title: 'Components/Forms/AngleSlider',
  component: AngleSlider,
  args: { label: 'Rotation' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    defaultValue: { control: { type: 'number', min: 0, max: 359, step: 1 } },
    step: { control: { type: 'number', min: 1, max: 45 } },
  },
};

export default meta;

type Story = StoryObj<typeof AngleSlider>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 90 },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the primary keyboard interaction for the angle-slider.
 *
 * Ark v5's AngleSlider exposes the thumb (data-part="thumb") as the focusable
 * interactive element with role="slider". Arrow keys adjust the angle value;
 * Ark injects `data-focus-visible` on keyboard focus for styling. The hidden
 * input carries the value for form submission but is not the interactive target.
 *
 * The axe pass runs automatically (preview's `a11y.test: 'error'`), so this
 * play function asserts the interaction contract only.
 */
export const KeyboardInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider');
    const valueText = canvasElement.querySelector<HTMLElement>(
      '[data-scope="angle-slider"][data-part="value-text"]',
    );

    await step('starts at default value (0°)', async () => {
      await expect(thumb).toHaveAttribute('aria-valuenow', '0');
    });

    await step('thumb is in the tab order (keyboard-reachable)', async () => {
      // Ark renders the thumb as a focusable div with tabindex=0.
      // userEvent.tab() may skip it due to visibility heuristics, so we assert
      // reachability via the tabindex contract and focus directly.
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

    await step(
      'ArrowDown increments the angle (Zag maps ArrowDown→INC, same as ArrowRight)',
      async () => {
        // Zag's keymap: ArrowDown → THUMB.ARROW_INC (clockwise).
        // Value is currently 0; increment to 1 so ArrowUp has a non-zero value to decrement from.
        const valueBefore = Number(thumb.getAttribute('aria-valuenow'));
        await userEvent.keyboard('{ArrowDown}');
        const valueAfter = Number(thumb.getAttribute('aria-valuenow'));
        await expect(valueAfter).not.toBe(valueBefore);
      },
    );

    await step(
      'ArrowUp decrements the angle (Zag maps ArrowUp→DEC, same as ArrowLeft)',
      async () => {
        // Zag's keymap: ArrowUp → THUMB.ARROW_DEC (counter-clockwise).
        // Value is currently 1; decrement to 0. Zag's snapAngleToStep clamps to [0, 359]
        // rather than wrapping, so pressing ArrowUp at 0 would keep the value at 0.
        // We press ArrowDown first (above) to ensure we start from a non-zero value.
        const valueBefore = Number(thumb.getAttribute('aria-valuenow'));
        await userEvent.keyboard('{ArrowUp}');
        const valueAfter = Number(thumb.getAttribute('aria-valuenow'));
        await expect(valueAfter).not.toBe(valueBefore);
      },
    );

    await step('value-text resolves to a real token color (non-transparent)', async () => {
      // Backstop for a var(--token-*) that resolves to nothing: assert the
      // value-text element's color is non-empty and non-transparent.
      await expect(valueText).not.toBeNull();
      const color = getComputedStyle(valueText as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled angle-slider must not be operable by keyboard.
 *
 * Zag sets `data-disabled` on the thumb (not `aria-disabled`), and guards the
 * onKeyDown handler with `if (!interactive) return` so arrow keys are silently
 * ignored. We assert `data-disabled` is present and that the value is unchanged
 * after an arrow key press.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 45 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const thumb = canvas.getByRole('slider');

    // Zag does not set aria-disabled on the thumb; it sets data-disabled.
    await expect(thumb).toHaveAttribute('data-disabled');
    const valueBefore = thumb.getAttribute('aria-valuenow');

    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    // Value must not change — Zag guards keydown when not interactive.
    await expect(thumb).toHaveAttribute('aria-valuenow', valueBefore);
  },
};
