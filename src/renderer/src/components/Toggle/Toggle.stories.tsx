import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Toggle } from './Toggle';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Forms/Toggle',
  component: Toggle,
  args: {
    'aria-label': 'Bold',
    children: 'B',
  },
  argTypes: {
    pressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Toggle>;

export const Default: Story = {};

export const Pressed: Story = {
  args: { defaultPressed: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the primary keyboard interaction for a toggle button.
 *
 * Ark v5's Toggle root is a native `<button>` element with `aria-pressed`.
 * The accessible role is 'button'; state is exposed via `aria-pressed` (the
 * aria attribute) and Ark's `data-state` ('on'|'off'). No hidden input exists
 * here — unlike Switch, the button itself is the focusable, operable element.
 *
 * The axe pass runs automatically (preview's `a11y.test: 'error'`), so this
 * play function asserts only the keyboard interaction contract.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await step('starts unpressed', async () => {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAttribute('data-state', 'off');
    });

    await step('the toggle is in the tab order (keyboard-reachable)', async () => {
      // The button element is natively focusable; confirm it is not explicitly
      // removed from the tab order, then drive focus directly.
      await expect(button).not.toHaveAttribute('tabindex', '-1');
      button.focus();
      await expect(button).toHaveFocus();
    });

    await step('Space toggles on', async () => {
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('data-state', 'on');
    });

    await step('Space toggles back off', async () => {
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAttribute('data-state', 'off');
    });

    await step('Enter also toggles on', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('data-state', 'on');
    });

    await step('pressed styling resolves to a real token value', async () => {
      // Backstop for a var(--token-*) that resolves to nothing: read the
      // computed background-color while the toggle is in the 'on' state
      // and assert it is a real, non-transparent color.
      const bg = getComputedStyle(button).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled toggle must not be operable by keyboard. Ark applies the native
 * `disabled` attribute to the button, so it is removed from the tab order and
 * cannot be activated.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('aria-pressed', 'false');

    // Attempting to activate a disabled toggle must not change its state.
    await userEvent.keyboard(' ');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  },
};
