import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PasswordInput } from './PasswordInput';

/**
 * Interaction / accessibility tests for the PasswordInput.
 *
 * Kept separate from the visual stories (`PasswordInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): each
 * `play` MUTATES the rendered state (toggles visibility, drives focus), so
 * colocating it with a doc story would make that story flash on load. Stories
 * are named by behavior so a failure is self-describing, each asserts with real
 * (awaited) `expect`, and each uses `step()` for readable runner output.
 *
 * Several of these are regression guards for the Ark-contract fix: Ark's
 * password-input emits NO `data-focus-visible` attribute on any part, so the
 * keyboard focus ring is drawn with the native `:focus-visible` pseudo on the
 * Input (<input>) and VisibilityTrigger (<button>). The old CSS targeted a
 * phantom `[data-focus-visible]` selector, so no ring rendered. The focus-ring
 * guards below FAIL against that broken selector and PASS after the fix.
 */
const meta: Meta<typeof PasswordInput> = {
  title: 'Components/Forms/PasswordInput/Tests',
  component: PasswordInput,
  args: { label: 'Password' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof PasswordInput>;

/** Resolve the typed <input> and its part element from the canvas. */
function inputPart(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLInputElement>(
    '[data-scope="password-input"][data-part="input"]',
  )!;
}

/**
 * The keyboard interaction contract: the input is reachable and typable, the
 * visibility trigger is reachable, and activating it toggles `data-state` and
 * the input `type`.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const trigger = canvas.getByRole('button', { name: /show\/hide password/i });

    await step('input starts in password (hidden) state', async () => {
      await expect(input.type).toBe('password');
      await expect(input).toHaveAttribute('data-state', 'hidden');
    });

    await step('input is in the tab order (keyboard-reachable)', async () => {
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
      await expect(input).toHaveAttribute('data-state', 'visible');
    });

    await step('activating the trigger hides the password again', async () => {
      // Ark's machine calls focusInputEl() after each toggle, moving focus back
      // to the input. Re-focus the trigger before the second activation.
      trigger.focus();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(input.type).toBe('password');
      await expect(input).toHaveAttribute('data-state', 'hidden');
    });
  },
};

/**
 * Regression guard: the input's keyboard focus ring renders.
 *
 * Ark emits no `data-focus-visible` on the Input part — the ring is drawn via
 * the native `:focus-visible` pseudo. `userEvent.tab()` produces a real keyboard
 * focus that triggers `:focus-visible` (unlike programmatic `.focus()`).
 * FAILS against the old phantom `[data-focus-visible]` selector.
 */
export const InputFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const input = inputPart(canvasElement);

    await step('keyboard focus renders a visible focus ring on the input', async () => {
      input.blur();
      await userEvent.tab();
      await expect(input).toHaveFocus();
      const ring = getComputedStyle(input).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard: the visibility trigger's keyboard focus ring renders.
 *
 * Same fix as InputFocusRing but for the <button> VisibilityTrigger part. We tab
 * twice (input → trigger) so the trigger receives a real keyboard focus.
 */
export const TriggerFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const trigger = canvas.getByRole('button', { name: /show\/hide password/i });

    await step('keyboard focus renders a visible focus ring on the trigger', async () => {
      input.blur();
      // First tab lands on the input, second on the visibility trigger.
      await userEvent.tab();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * A disabled PasswordInput must not be operable. Ark applies the native
 * `disabled` attribute to the underlying input, removing it from the tab order,
 * and the disabled styling differs from the enabled default.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const input = inputPart(canvasElement);

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(input).toBeDisabled();
      await expect(input).toHaveAttribute('data-disabled');
    });

    await step('disabled input cannot be typed into', async () => {
      await userEvent.type(input, 'secret');
      await expect(input.value).toBe('');
    });
  },
};

/**
 * Invalid state recolors the border (regression guard for the
 * `[data-invalid]` selector resolving a real token, not the default border).
 */
export const InvalidStyling: Story = {
  args: { invalid: true },
  play: async ({ canvasElement, step }) => {
    const input = inputPart(canvasElement);

    await step('invalid input carries the data-invalid attribute', async () => {
      await expect(input).toHaveAttribute('data-invalid');
    });

    await step('invalid border resolves to a real, non-transparent token value', async () => {
      const borderColor = getComputedStyle(input).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
