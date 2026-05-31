import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Slider } from './Slider';

const meta: Meta<typeof Slider> = {
  title: 'Components/Forms/Slider',
  component: Slider,
  args: {
    label: 'Volume',
    showValueText: true,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    showValueText: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: [75] },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the primary keyboard interaction path for the slider.
 *
 * Ark v5's slider renders each thumb's HiddenInput as a native
 * `<input type="range">` (role="slider") with `aria-valuenow`,
 * `aria-valuemin`, and `aria-valuemax`. Arrow keys change the value.
 *
 * userEvent.tab() skips clip-hidden inputs by its visibility heuristic, so
 * we assert the input is in the tab order (tabindex !== "-1") and call
 * input.focus() directly, then drive keyboard events.
 *
 * The axe pass runs automatically (preview's `a11y.test: 'error'`), so this
 * play function asserts only the interaction contract.
 */
export const KeyboardInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // The native range input carries the slider role.
    const input = canvas.getByRole('slider');
    const thumb = canvasElement.querySelector<HTMLElement>(
      '[data-scope="slider"][data-part="thumb"]',
    );
    const range = canvasElement.querySelector<HTMLElement>(
      '[data-scope="slider"][data-part="range"]',
    );

    await step('starts at the default value of 50', async () => {
      await expect(input).toHaveAttribute('aria-valuenow', '50');
    });

    await step('slider is in the tab order (keyboard-reachable)', async () => {
      // Ark renders the input with a visually-hidden clip style.
      // It is a real, focusable control: tabindex should not be "-1".
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('ArrowRight increments the value', async () => {
      await userEvent.keyboard('{ArrowRight}');
      const valuenow = Number(input.getAttribute('aria-valuenow'));
      await expect(valuenow).toBeGreaterThan(50);
    });

    await step('ArrowLeft decrements the value', async () => {
      // Bring it back once.
      await userEvent.keyboard('{ArrowLeft}');
      const valuenow = Number(input.getAttribute('aria-valuenow'));
      await expect(valuenow).toBeLessThanOrEqual(50);
    });

    await step('thumb and range are present in the DOM', async () => {
      await expect(thumb).not.toBeNull();
      await expect(range).not.toBeNull();
    });

    await step('range background resolves to a real token value', async () => {
      // Backstop: if a --token-* variable resolves to nothing, background
      // will be transparent. Ensure the token is wired.
      const bg = getComputedStyle(range as HTMLElement).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled slider must not be operable by keyboard. Ark v5 marks the thumb
 * element (role="slider", a div) with data-disabled and aria-disabled, but
 * does NOT add the native `disabled` attribute to non-native elements —
 * toBeDisabled() only works on native <input>/<button>/<select>. Assert
 * data-disabled is present and arrow keys do not move the value instead.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('slider');

    // Ark sets data-disabled on the thumb (div[role="slider"]) not native disabled.
    await expect(input).toHaveAttribute('data-disabled');
    const valueBefore = input.getAttribute('aria-valuenow');

    // Arrow keys on a disabled slider must not change the value.
    input.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(input.getAttribute('aria-valuenow')).toBe(valueBefore);
  },
};
