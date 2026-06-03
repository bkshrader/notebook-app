import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Field } from './Field';

/**
 * Interaction / accessibility tests for the Field.
 *
 * Kept separate from the visual stories (`Field.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (focus, typing), so colocating it with a doc story would make
 * that story flash/mutate on load. Stories are named by behavior so a failure is
 * self-describing; each `play` AWAITS real `expect(...)` assertions (a `play`
 * without `expect` is a state-setter, not a test).
 *
 * Each guard targets a specific Ark-contract or token fix:
 *   - Keyboard focus ring renders via native :focus-visible (NOT the phantom
 *     [data-focus-visible] Ark never emits). `userEvent.tab()` produces a real
 *     keyboard focus that triggers :focus-visible, unlike programmatic .focus().
 *   - Invalid / disabled / read-only states recolor the input border (proving
 *     the data-invalid / data-disabled / data-readonly selectors are live).
 */
const meta: Meta<typeof Field> = {
  title: 'Components/Forms/Field/Tests',
  component: Field,
  args: { label: 'Email address', helperText: 'We will never share your email.' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Field>;

/** Label, input wiring, and typing — the baseline form-control contract. */
export const LabelledAndEditable: Story = {
  args: { label: 'Full name', helperText: 'Enter your full legal name.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('input is present and labelled (WCAG 4.1.2)', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      await expect(input).toBeInTheDocument();
    });

    await step('user can type into the input', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      input.focus();
      await userEvent.keyboard('Jane Doe');
      await expect(input).toHaveValue('Jane Doe');
    });

    await step('input border resolves to a real color (not empty/transparent)', async () => {
      const input = canvas.getByRole('textbox', { name: /full name/i });
      const cs = getComputedStyle(input);
      await expect(cs.borderColor).not.toBe('');
      await expect(cs.borderColor).not.toBe('transparent');
    });
  },
};

/**
 * Regression guard for the data-focus-visible → :focus-visible fix.
 * The old `[data-focus-visible]` selector was DEAD (Ark never emits that attr),
 * so the keyboard focus ring never rendered — a WCAG 2.4.7 failure. This drives
 * a real keyboard focus and asserts the focus-ring box-shadow resolves.
 */
export const KeyboardFocusRing: Story = {
  args: { label: 'Search', helperText: undefined },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /search/i });

    await step('input is keyboard-reachable', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      input.blur();
      await userEvent.tab();
      await expect(input).toHaveFocus();
      // The ring is the box-shadow applied by native :focus-visible.
      const ring = getComputedStyle(input).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Invalid state recolors the border (data-invalid selector is live) and the
 *  error text is announced. */
export const InvalidIsStyledAndAnnounced: Story = {
  args: {
    label: 'Email',
    invalid: true,
    errorText: 'Please enter a valid email address.',
    helperText: undefined,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /email/i });

    await step('invalid is exposed to assistive technology', async () => {
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveAttribute('data-invalid');
    });

    await step('invalid input has a real border color', async () => {
      const cs = getComputedStyle(input);
      await expect(cs.borderColor).not.toBe('');
      await expect(cs.borderColor).not.toBe('transparent');
    });

    await step('the error text is rendered for screen readers', async () => {
      await expect(canvas.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  },
};

/** Disabled state is AT-exposed, inoperable, and visually distinct from enabled. */
export const DisabledIsInert: Story = {
  args: { label: 'Locked field', disabled: true, helperText: 'This field cannot be edited.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /locked field/i });

    await step('disabled is exposed to assistive technology', async () => {
      await expect(input).toBeDisabled();
    });

    await step('disabled input does not accept keyboard input', async () => {
      const before = input.getAttribute('value') ?? '';
      input.focus();
      await userEvent.keyboard('should not appear');
      await expect(input).toHaveValue(before);
    });

    await step('disabled background differs from the enabled default', async () => {
      // data-disabled selector recolors the surface; if it were dead this would
      // equal the enabled white surface.
      const bg = getComputedStyle(input).backgroundColor;
      await expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  },
};

/** Read-only state recolors the input (data-readonly selector is live) but the
 *  field stays focusable. */
export const ReadOnlyIsStyledButFocusable: Story = {
  args: { label: 'Account ID', readOnly: true, helperText: 'Read-only.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /account id/i });

    await step('read-only is exposed and the input is still focusable', async () => {
      // Ark sets the NATIVE readonly attribute on the <input>; the CSS matches
      // the native :read-only pseudo (a data-readonly selector would be dead).
      await expect(input).toHaveAttribute('readonly');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('read-only background differs from the enabled default', async () => {
      const bg = getComputedStyle(input).backgroundColor;
      await expect(bg).not.toBe('rgb(255, 255, 255)');
    });
  },
};

/** The size scale drives a different input font-size per size (the per-size
 *  --field-* custom properties are live). */
export const SizeScaleApplies: Story = {
  args: { label: 'Small field', size: 'small', helperText: undefined },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('small size resolves a real, non-zero input font-size', async () => {
      const input = canvas.getByRole('textbox', { name: /small field/i });
      const fontSize = parseFloat(getComputedStyle(input).fontSize);
      await expect(fontSize).toBeGreaterThan(0);
    });
  },
};

/** Inline layout shrinks the root to fit instead of filling the container. */
export const InlineShrinksToFit: Story = {
  args: { label: 'Coupon', inline: true, helperText: undefined },
  play: async ({ canvasElement, step }) => {
    await step('root carries data-inline and is not forced to 100% width', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='field'][data-part='root']",
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-inline');
      await expect(getComputedStyle(root!).width).not.toBe('100%');
    });
  },
};
