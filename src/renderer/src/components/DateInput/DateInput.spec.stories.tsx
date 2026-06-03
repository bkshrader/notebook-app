import { parseDate } from '@ark-ui/react/date-picker';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DateInput } from './DateInput';

/**
 * Interaction / accessibility tests for the DateInput.
 *
 * Kept separate from the visual stories (`DateInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles (and some mutate the field value), so they are
 * test cases, not documentation. Named by behavior so a failure is
 * self-describing; each `await`s real `expect(...)` (Storybook matchers are
 * async) and uses `step()` for readable runner output. Hidden from the docs
 * gallery via `tags: ['test']`.
 */
const meta: Meta<typeof DateInput> = {
  title: 'Components/Forms/DateInput/Tests',
  component: DateInput,
  args: { label: 'Due date', placeholder: 'yyyy-mm-dd' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof DateInput>;

/** The Helios/Ark structural + ARIA contract: a labelled textbox, no calendar. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders a textbox with the label as its accessible name', async () => {
      const input = canvas.getByRole('textbox', { name: 'Due date' });
      await expect(input).toBeInTheDocument();
      await expect(input.tagName).toBe('INPUT');
      await expect(input.closest("[data-part='control']")).not.toBeNull();
    });

    await step('is a text field only — no calendar dropdown is mounted', async () => {
      // The distinguishing contract vs. DatePicker: DateInput never renders the
      // overlay parts, so there is no grid/dialog and no open trigger.
      await expect(canvasElement.querySelector("[data-part='content']")).toBeNull();
      await expect(canvasElement.querySelector("[data-part='table']")).toBeNull();
      await expect(canvas.queryByRole('grid')).toBeNull();
    });

    await step('input resolves a real border + background (tokens applied)', async () => {
      const input = canvas.getByRole('textbox', { name: 'Due date' });
      const cs = getComputedStyle(input);
      await expect(cs.borderTopWidth).not.toBe('0px');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The field is keyboard-reachable and shows a visible focus ring on tab. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Due date' });

    await step('field is reachable and not removed from the tab order', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // userEvent.tab() produces real keyboard focus that triggers
      // :focus-visible (unlike programmatic .focus()), which the input draws as
      // a box-shadow ring.
      input.blur();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(input).toHaveFocus();
      });
      const ring = getComputedStyle(input).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** A controlled value parsed via @internationalized/date renders into the field. */
export const ParsedValueRendersInField: Story = {
  args: { defaultValue: [parseDate('2026-06-02')] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: 'Due date' });

    await step('Ark formats the parsed DateValue into the visible field text', async () => {
      // Proves the @internationalized/date parsing path: a DateValue passed via
      // defaultValue is rendered back into the <input> as a formatted string
      // containing the year.
      await expect(input.value).not.toBe('');
      await expect(input.value).toContain('2026');
    });
  },
};

/** Typing into the field exercises the real keyboard path on the text input. */
export const AcceptsKeyboardInput: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: 'Due date' });

    await step('typed digits land in the editable field', async () => {
      input.focus();
      await userEvent.clear(input);
      await userEvent.type(input, '01/15/2026');
      // The field is a real, editable text input (not read-only): the typed
      // characters are reflected before any commit/normalization.
      await waitFor(async () => {
        await expect(input.value).not.toBe('');
      });
    });
  },
};

/** The clear button is an accessible button that empties the field. */
export const ClearEmptiesTheField: Story = {
  args: { clearable: true, defaultValue: [parseDate('2026-06-02')] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: 'Due date' });

    await step('field starts populated from defaultValue', async () => {
      await expect(input.value).not.toBe('');
    });

    await step('the clear control is a button with an accessible name', async () => {
      const clear = canvas.getByRole('button', { name: 'Clear date' });
      await expect(clear).toBeInTheDocument();
    });

    await step('activating clear empties the field', async () => {
      const clear = canvas.getByRole('button', { name: 'Clear date' });
      await userEvent.click(clear);
      await waitFor(async () => {
        await expect(input.value).toBe('');
      });
    });
  },
};

/** A disabled DateInput exposes disabled state to AT and is inoperable. */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: [parseDate('2026-06-02')] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Due date' });

    await step('disabled state is exposed to assistive technology', async () => {
      // Native `disabled` on the input is in the accessibility tree; Ark mirrors
      // data-disabled onto the control part.
      await expect(input).toBeDisabled();
      const control = canvasElement.querySelector('[data-part="control"]');
      await expect(control).toHaveAttribute('data-disabled');
    });

    await step('the disabled field is styled distinctly (not-allowed cursor)', async () => {
      const cs = getComputedStyle(input);
      await expect(cs.cursor).toBe('not-allowed');
    });
  },
};
