import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Textarea } from './Textarea';

/**
 * Interaction / accessibility tests for the Textarea.
 *
 * Kept separate from the visual stories (`Textarea.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (focus, typing), so colocating it with a doc story would make
 * that story flash/mutate on load. Stories are named by behavior so a failure is
 * self-describing; each `play` AWAITS real `expect(...)` assertions.
 *
 * Each guard targets a specific Ark-contract or token fix:
 *   - Keyboard focus ring renders via native :focus-visible (NOT a phantom
 *     [data-focus-visible] Ark never emits). `userEvent.tab()` produces a real
 *     keyboard focus that triggers :focus-visible, unlike programmatic .focus().
 *   - Invalid / disabled / read-only states recolor the control (proving the
 *     data-invalid / native :disabled / :read-only selectors are live).
 */
const meta: Meta<typeof Textarea> = {
  title: 'Components/Forms/Textarea/Tests',
  component: Textarea,
  args: { label: 'Notes', helperText: 'Add any additional context.' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Textarea>;

/** Label, control wiring, multi-line typing — the baseline form-control contract. */
export const LabelledAndEditable: Story = {
  args: { label: 'Description', helperText: 'Describe the issue.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('control is a labelled textbox (WCAG 4.1.2)', async () => {
      const textarea = canvas.getByRole('textbox', { name: /description/i });
      await expect(textarea).toBeInTheDocument();
      await expect(textarea.tagName).toBe('TEXTAREA');
    });

    await step('user can type multi-line text', async () => {
      const textarea = canvas.getByRole('textbox', { name: /description/i });
      textarea.focus();
      await userEvent.keyboard('first line{Enter}second line');
      await expect(textarea).toHaveValue('first line\nsecond line');
    });

    await step('control border resolves to a real color (not empty/transparent)', async () => {
      const textarea = canvas.getByRole('textbox', { name: /description/i });
      const cs = getComputedStyle(textarea);
      await expect(cs.borderColor).not.toBe('');
      await expect(cs.borderColor).not.toBe('transparent');
    });

    await step('control allows vertical resize (Helios resize: vertical)', async () => {
      const textarea = canvas.getByRole('textbox', { name: /description/i });
      // CSS `resize: block` is the logical equivalent of `vertical`; Chromium
      // serializes the computed value back as the logical keyword `block`.
      await expect(['block', 'vertical']).toContain(getComputedStyle(textarea).resize);
    });
  },
};

/**
 * Regression guard for the data-focus-visible → :focus-visible fix.
 * A `[data-focus-visible]` selector would be DEAD (Ark never emits that attr on
 * the native <textarea>), so the keyboard focus ring would never render — a WCAG
 * 2.4.7 failure. This drives a real keyboard focus and asserts the outline ring.
 */
export const KeyboardFocusRing: Story = {
  args: { label: 'Search notes', helperText: undefined },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /search notes/i });

    await step('control is keyboard-reachable', async () => {
      await expect(textarea).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus outline', async () => {
      textarea.blur();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(textarea).toHaveFocus();
      });
      // Helios draws a 3px outline on :focus-visible (WCAG 2.4.7).
      const cs = getComputedStyle(textarea);
      await expect(cs.outlineStyle).not.toBe('none');
      await expect(parseFloat(cs.outlineWidth)).toBeGreaterThan(0);
    });
  },
};

/** Invalid state recolors the border (data-invalid selector is live) and the
 *  error text is announced. */
export const InvalidIsStyledAndAnnounced: Story = {
  args: {
    label: 'Comment',
    invalid: true,
    errorText: 'A comment is required.',
    helperText: undefined,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /comment/i });

    await step('invalid is exposed to assistive technology', async () => {
      await expect(textarea).toHaveAttribute('aria-invalid', 'true');
      await expect(textarea).toHaveAttribute('data-invalid');
    });

    await step('invalid control has a real border color', async () => {
      const cs = getComputedStyle(textarea);
      await expect(cs.borderColor).not.toBe('');
      await expect(cs.borderColor).not.toBe('transparent');
    });

    await step('the error text is rendered for screen readers', async () => {
      await expect(canvas.getByText('A comment is required.')).toBeInTheDocument();
    });
  },
};

/** Disabled state is AT-exposed, inoperable, and visually distinct from enabled. */
export const DisabledIsInert: Story = {
  args: { label: 'Locked notes', disabled: true, helperText: 'This field cannot be edited.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /locked notes/i });

    await step('disabled is exposed to assistive technology', async () => {
      await expect(textarea).toBeDisabled();
    });

    await step('disabled control does not accept keyboard input', async () => {
      const before = (textarea as HTMLTextAreaElement).value;
      textarea.focus();
      await userEvent.keyboard('should not appear');
      await expect(textarea).toHaveValue(before);
    });

    await step('disabled background differs from the enabled default', async () => {
      // The native :disabled selector recolors the surface; if it were dead this
      // would equal the enabled white surface.
      const bg = getComputedStyle(textarea).backgroundColor;
      await expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  },
};

/** Read-only state recolors the control (native :read-only selector is live) but
 *  the control stays focusable. */
export const ReadOnlyIsStyledButFocusable: Story = {
  args: { label: 'Audit log', readOnly: true, helperText: 'Read-only.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole('textbox', { name: /audit log/i });

    await step('read-only is exposed and the control is still focusable', async () => {
      // Ark sets the NATIVE readonly attribute; the CSS matches the native
      // :read-only pseudo (a data-readonly selector would be dead).
      await expect(textarea).toHaveAttribute('readonly');
      textarea.focus();
      await waitFor(async () => {
        await expect(textarea).toHaveFocus();
      });
    });

    await step('read-only background differs from the enabled default', async () => {
      const bg = getComputedStyle(textarea).backgroundColor;
      await expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  },
};
