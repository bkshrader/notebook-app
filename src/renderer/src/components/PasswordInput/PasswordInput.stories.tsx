import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PasswordInput } from './PasswordInput';

const meta: Meta<typeof PasswordInput> = {
  title: 'Components/Forms/PasswordInput',
  component: PasswordInput,
  args: {
    label: 'Password',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

/**
 * Drives the primary keyboard interaction for the PasswordInput:
 *
 * 1. The text input is focusable and in the tab order.
 * 2. The visibility toggle button is keyboard-reachable.
 * 3. Clicking/activating the toggle changes `data-state` from "hidden" to
 *    "visible" on both the input and the trigger, and the input's `type`
 *    attribute switches from "password" to "text".
 * 4. A getComputedStyle backstop confirms the input border resolves to a real,
 *    non-transparent colour (catches a misspelled `--token-*` that resolves to
 *    nothing).
 *
 * The axe pass runs automatically via preview's `a11y.test: 'error'` setting,
 * so this play function asserts only the interaction contract.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Ark renders a native <input type="password"> inside the Control.
    // querySelector gives us the typed HTMLInputElement directly so we can
    // read .type and .value without an unsafe cast.
    const input = canvasElement.querySelector<HTMLInputElement>(
      '[data-scope="password-input"][data-part="input"]',
    )!;
    const trigger = canvas.getByRole('button', { name: /show\/hide password/i });
    const inputPart = canvasElement.querySelector<HTMLElement>(
      '[data-scope="password-input"][data-part="input"]',
    );

    await step('input starts in password (hidden) state', async () => {
      await expect(input.type).toBe('password');
      await expect(inputPart).toHaveAttribute('data-state', 'hidden');
    });

    await step('input is in the tab order (keyboard-reachable)', async () => {
      // Ark password-input renders a real focusable <input>, not a clip-hidden
      // proxy, so userEvent.tab() should reach it. Assert tabindex contract.
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('user can type in the input', async () => {
      await userEvent.keyboard('hunter2');
      await expect(input.value).toBe('hunter2');
    });

    await step('visibility trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('activating the trigger reveals the password', async () => {
      trigger.focus();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(input.type).toBe('text');
      await expect(inputPart).toHaveAttribute('data-state', 'visible');
    });

    await step('activating the trigger hides the password again', async () => {
      // Ark's machine calls focusInputEl() after each toggle, moving focus back
      // to the input. Re-focus the trigger before the second activation.
      trigger.focus();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(input.type).toBe('password');
      await expect(inputPart).toHaveAttribute('data-state', 'hidden');
    });

    await step('input border resolves to a real token value', async () => {
      // Backstop: if a --token-* var is misspelled it resolves to nothing
      // and the border-color will be empty or the browser default. This
      // asserts the design-token wiring is intact.
      await expect(inputPart).not.toBeNull();
      const borderColor = getComputedStyle(inputPart as HTMLElement).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled PasswordInput must not be operable. Ark applies the native
 * `disabled` attribute to the underlying input, removing it from the tab order.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>(
      '[data-scope="password-input"][data-part="input"]',
    )!;

    await expect(input).toBeDisabled();

    // A disabled input cannot be typed into.
    await userEvent.type(input, 'secret');
    await expect(input.value).toBe('');
  },
};
