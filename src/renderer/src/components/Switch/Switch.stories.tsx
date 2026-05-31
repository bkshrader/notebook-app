import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Switch } from './Switch';

const meta: Meta<typeof Switch> = {
  title: 'Components/Forms/Switch',
  component: Switch,
  args: {
    label: 'Wi-Fi',
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the keyboard interaction path for the switch.
 *
 * Ark v5's switch is a styled native checkbox: the operable element is a
 * visually-hidden `<input type="checkbox">` (so its accessible role is
 * `checkbox`, with `aria-checked`, focus, and the native `disabled` state),
 * while the presentational Control is `aria-hidden` and only carries
 * `data-state` for styling. So `getByRole('checkbox')` returns the input, and
 * we read `data-state` off the `[data-part="control"]` element. The axe pass
 * runs automatically (preview's `a11y.test: 'error'`), so this play function
 * asserts only the interaction contract.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');
    const control = canvasElement.querySelector<HTMLElement>(
      '[data-scope="switch"][data-part="control"]',
    );

    await step('starts unchecked', async () => {
      // State is conveyed by the native checkbox's checked property and Ark's
      // `data-state` on the presentational control — not `aria-checked`.
      await expect(input).not.toBeChecked();
      await expect(control).toHaveAttribute('data-state', 'unchecked');
    });

    await step('the switch is in the tab order (keyboard-reachable)', async () => {
      // Ark renders the input with a visually-hidden style (offscreen clip).
      // It is a real, focusable control (tabindex is unset, i.e. 0 — not -1),
      // so keyboard users reach it. userEvent.tab() skips clip-hidden elements
      // by its own visibility heuristic, so we assert reachability via the
      // tabindex contract and drive focus directly for the interaction steps.
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('Space toggles on', async () => {
      await userEvent.keyboard(' ');
      await expect(input).toBeChecked();
      await expect(control).toHaveAttribute('data-state', 'checked');
    });

    await step('Space toggles back off', async () => {
      await userEvent.keyboard(' ');
      await expect(input).not.toBeChecked();
      await expect(control).toHaveAttribute('data-state', 'unchecked');
    });

    await step('checked styling resolves to a real token value', async () => {
      // Backstop for a `var(--token-*)` that resolves to nothing: toggle on,
      // then read the computed background of the styled track and assert it is
      // a real, non-transparent color.
      await userEvent.keyboard(' ');
      await expect(control).not.toBeNull();
      const bg = getComputedStyle(control as HTMLElement).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled switch must not be operable by keyboard. Ark applies the native
 * `disabled` attribute to the underlying checkbox input, so it is removed from
 * the tab order and cannot be toggled.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');

    await expect(input).toBeDisabled();
    await expect(input).not.toBeChecked();

    // Attempting to activate a disabled switch must not change its state.
    await userEvent.keyboard(' ');
    await expect(input).not.toBeChecked();
  },
};
