import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { PinInput } from './PinInput';

/**
 * Interaction / accessibility tests for the PinInput.
 *
 * Kept separate from the visual stories (`PinInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story fill
 * in / advance focus on load. These stories are named by behavior so a failure
 * is self-describing, each asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * Marked `tags: ['test']` so they run in the test runner but stay out of the
 * docs gallery.
 */
const meta: Meta<typeof PinInput> = {
  title: 'Components/Forms/PinInput/Tests',
  component: PinInput,
  args: {
    label: 'Verification code',
    length: 4,
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof PinInput>;

/** Keyboard entry: typing fills slots, advances focus, completes the value. */
export const KeyboardEntry: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');
    const [firstInput, secondInput] = inputs;
    if (!firstInput || !secondInput) throw new Error('expected at least two pin inputs');

    await step('renders 4 input slots', async () => {
      await expect(inputs).toHaveLength(4);
    });

    await step('first input is in the tab order (keyboard-reachable)', async () => {
      await expect(firstInput).not.toHaveAttribute('tabindex', '-1');
      firstInput.focus();
      await expect(firstInput).toHaveFocus();
    });

    await step('typing a digit fills the first slot and advances focus', async () => {
      await userEvent.keyboard('1');
      await expect(firstInput).toHaveAttribute('data-filled');
      // Ark auto-advances focus to the next input after a character is entered.
      await expect(secondInput).toHaveFocus();
    });

    await step('typing more digits fills subsequent slots', async () => {
      await userEvent.keyboard('234');
      await expect(inputs[1]).toHaveAttribute('data-filled');
      await expect(inputs[2]).toHaveAttribute('data-filled');
      await expect(inputs[3]).toHaveAttribute('data-filled');
    });

    await step('all slots complete — root carries data-complete', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="root"]',
      );
      await expect(root).toHaveAttribute('data-complete');
    });
  },
};

/**
 * Regression guard for the phantom `data-focus-visible` fix.
 *
 * Ark's pin-input Input part emits NO `data-focus-visible` attribute, so the
 * old `[data-part='input'][data-focus-visible]` selector never matched and the
 * keyboard focus ring never rendered. The ring is now drawn via the native
 * `:focus-visible` pseudo. `userEvent.tab()` produces a real keyboard focus
 * that triggers `:focus-visible` (unlike programmatic `.focus()`), so this
 * assertion FAILS against the old selector and PASSES after the fix.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const [firstInput] = canvas.getAllByRole('textbox');
    if (!firstInput) throw new Error('expected at least one pin input');

    await step('keyboard focus renders a visible focus ring', async () => {
      await userEvent.tab();
      await expect(firstInput).toHaveFocus();
      const ring = getComputedStyle(firstInput).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('filled input border resolves to a real token color', async () => {
      const borderColor = getComputedStyle(firstInput).borderColor;
      await expect(borderColor).not.toBe('');
      await expect(borderColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** A disabled PinInput is exposed to AT and is not operable by keyboard. */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');
    const [firstInput] = inputs;
    if (!firstInput) throw new Error('expected at least one pin input');

    await step('every input is exposed as disabled to assistive technology', async () => {
      for (const input of inputs) {
        await expect(input).toBeDisabled();
      }
    });

    await step('a disabled input differs visually from an enabled one', async () => {
      // Regression guard: the disabled state must resolve a real (different)
      // surface token, not fall through to the base styling.
      const cs = getComputedStyle(firstInput);
      await expect(cs.cursor).toBe('not-allowed');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('typing into a disabled pin-input does not change state', async () => {
      await userEvent.keyboard('1234');
      for (const input of inputs) {
        await expect(input).toHaveValue('');
      }
    });
  },
};

/**
 * Regression guard for the readonly state. Ark emits `data-readonly` on the
 * Root (and Label) parts — NOT the Input part — so the input styling is scoped
 * through the Root's data-readonly. This guard fails against a phantom
 * `[data-part='input'][data-readonly]` selector and passes after the fix.
 */
export const ReadOnlyStyled: Story = {
  args: { readOnly: true, defaultValue: ['1', '2', '3', '4'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const [firstInput] = canvas.getAllByRole('textbox');
    if (!firstInput) throw new Error('expected at least one pin input');

    await step('the Root carries the Ark data-readonly attribute', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="root"]',
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-readonly');
    });

    await step('readonly input resolves the readonly surface token', async () => {
      const cs = getComputedStyle(firstInput);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.backgroundColor).not.toBe('');
    });
  },
};

/**
 * Regression guard for the required indicator: Ark emits `data-required` on the
 * Label, and the component renders a real `required-indicator` element (the
 * Helios pattern — not CSS-injected text) that resolves a real color token.
 */
export const RequiredIndicator: Story = {
  args: { required: true },
  play: async ({ canvasElement, step }) => {
    await step('label carries the Ark data-required attribute', async () => {
      const label = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="label"]',
      );
      await expect(label).not.toBeNull();
      await expect(label).toHaveAttribute('data-required');
    });

    await step('a required-indicator element is rendered with a real color', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pin-input"][data-part="required-indicator"]',
      );
      await expect(indicator).not.toBeNull();
      const color = getComputedStyle(indicator!).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard for the invalid keyboard focus ring. The old code drew the
 * critical ring on the phantom `[data-invalid][data-focus-visible]` selector
 * (never matched). It is now on the native `:focus-visible`.
 */
export const InvalidFocusRing: Story = {
  args: { invalid: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const [firstInput] = canvas.getAllByRole('textbox');
    if (!firstInput) throw new Error('expected at least one pin input');

    await step('invalid input carries data-invalid', async () => {
      await expect(firstInput).toHaveAttribute('data-invalid');
    });

    await step('keyboard focus on an invalid input renders a focus ring', async () => {
      await userEvent.tab();
      await expect(firstInput).toHaveFocus();
      const ring = getComputedStyle(firstInput).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};
