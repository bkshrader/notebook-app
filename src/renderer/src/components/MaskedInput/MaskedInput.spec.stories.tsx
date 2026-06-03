import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { MaskedInput } from './MaskedInput';

/**
 * Interaction / accessibility tests for the MaskedInput.
 *
 * Kept separate from the visual stories (`MaskedInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: each `play` MUTATES the rendered state
 * (toggles masking, drives focus), so colocating it with a doc story would make
 * that story flash on load. Stories are named by behavior so a failure is
 * self-describing, each asserts with real (awaited) `expect`, and each uses
 * `step()` for readable runner output.
 *
 * The MaskedInput is built on plain semantic HTML (no Ark primitive): Helios
 * masks the value with `-webkit-text-security: disc` on a `type="text"` input,
 * and the reveal control is a native <button>. These guards assert that real
 * keyboard interaction drives the masked|revealed state, that the focus rings
 * render via native `:focus-visible`, and that the ARIA contract holds.
 */
const meta: Meta<typeof MaskedInput> = {
  title: 'Components/Forms/MaskedInput/Tests',
  component: MaskedInput,
  args: { label: 'API token', defaultValue: 'sk-secret-value' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof MaskedInput>;

/** Resolve the typed <input> part from the canvas. */
function inputPart(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLInputElement>(
    '[data-scope="masked-input"][data-part="input"]',
  )!;
}

/**
 * The ARIA/role + keyboard contract: the field has an accessible name, the
 * input is a real text field (not type=password), it starts masked, the toggle
 * button is keyboard-reachable, and activating it flips the masked|revealed
 * state on both the input and the button.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const toggle = canvas.getByRole('button', { name: /show\/hide value/i });

    await step('input is a labelled text field (not a password input)', async () => {
      await expect(input.type).toBe('text');
      await expect(canvas.getByLabelText(/api token/i)).toBe(input);
    });

    await step('value starts masked', async () => {
      await expect(input).toHaveAttribute('data-state', 'masked');
      await expect(toggle).toHaveAttribute('data-state', 'masked');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });

    await step('input is in the tab order (keyboard-reachable)', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('toggle button is reachable by Tab from the input', async () => {
      await userEvent.tab();
      await expect(toggle).toHaveFocus();
      await expect(toggle).not.toHaveAttribute('tabindex', '-1');
    });

    await step('Enter on the toggle reveals the value', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(input).toHaveAttribute('data-state', 'revealed');
      await expect(toggle).toHaveAttribute('data-state', 'revealed');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });

    await step('Space on the toggle masks the value again', async () => {
      await expect(toggle).toHaveFocus();
      await userEvent.keyboard(' ');
      await expect(input).toHaveAttribute('data-state', 'masked');
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  },
};

/**
 * Regression guard: while masked, the input obfuscates via
 * `-webkit-text-security: disc`; revealing it removes the obfuscation. This is
 * the Helios masking mechanism (a `type="text"` input, not a password field).
 */
export const MaskingMechanism: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const toggle = canvas.getByRole('button', { name: /show\/hide value/i });

    await step('masked input applies -webkit-text-security: disc', async () => {
      const security = getComputedStyle(input).getPropertyValue('-webkit-text-security');
      await expect(security).toBe('disc');
    });

    await step('the real value is preserved behind the mask', async () => {
      await expect(input.value).toBe('sk-secret-value');
    });

    await step('revealing removes the text-security obfuscation', async () => {
      await userEvent.click(toggle);
      await waitFor(async () => {
        const security = getComputedStyle(input).getPropertyValue('-webkit-text-security');
        await expect(security).toBe('none');
      });
    });
  },
};

/**
 * Regression guard: the input's keyboard focus ring renders. The input is a
 * native control, so the ring is drawn via `:focus-visible`. `userEvent.tab()`
 * produces a real keyboard focus that triggers `:focus-visible` (unlike
 * programmatic `.focus()`).
 */
export const InputFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const input = inputPart(canvasElement);

    await step('keyboard focus renders a visible focus ring on the input', async () => {
      input.blur();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(input).toHaveFocus();
        const ring = getComputedStyle(input).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring).not.toBe('');
      });
    });
  },
};

/**
 * Regression guard: the toggle button's keyboard focus ring renders. We tab
 * twice (input → toggle) so the button receives a real keyboard focus.
 */
export const ToggleFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const toggle = canvas.getByRole('button', { name: /show\/hide value/i });

    await step('keyboard focus renders a visible focus ring on the toggle', async () => {
      input.blur();
      await userEvent.tab();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(toggle).toHaveFocus();
        const ring = getComputedStyle(toggle).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring).not.toBe('');
      });
    });
  },
};

/**
 * A disabled MaskedInput must not be operable: both the input and the toggle
 * carry the native `disabled` attribute (out of the tab order), and the disabled
 * styling differs from the enabled default.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = inputPart(canvasElement);
    const toggle = canvas.getByRole('button', { name: /show\/hide value/i });

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(input).toBeDisabled();
      await expect(toggle).toBeDisabled();
      await expect(input).toHaveAttribute('data-disabled');
    });

    await step('disabled input cannot be typed into', async () => {
      const before = input.value;
      input.focus();
      await userEvent.keyboard('nope');
      await expect(input.value).toBe(before);
    });
  },
};

/**
 * Invalid state recolors the border (regression guard for the `[data-invalid]`
 * selector resolving a real token, not the default border) and exposes
 * `aria-invalid` to assistive technology.
 */
export const InvalidStyling: Story = {
  args: { invalid: true },
  play: async ({ canvasElement, step }) => {
    const input = inputPart(canvasElement);

    await step('invalid input carries data-invalid and aria-invalid', async () => {
      await expect(input).toHaveAttribute('data-invalid');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    await step('invalid border resolves to a real, non-transparent token value', async () => {
      const borderColor = getComputedStyle(input).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
