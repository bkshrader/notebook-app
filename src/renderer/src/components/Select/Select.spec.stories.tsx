import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Select } from './Select';

/**
 * Interaction / accessibility tests for the Select.
 *
 * Kept separate from the visual stories (`Select.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (opening the listbox, committing
 * a value), so colocating it with a doc story would make that story flash/open on
 * load. These stories are named by behavior so a failure is self-describing, each
 * asserts with awaited `expect` (a `play` without `expect` is a state-setter, not
 * a test), and each uses `step()` for readable runner / Interactions-panel output.
 *
 * The content panel renders in a Portal (outside `canvasElement`), so the listbox
 * and options are queried via `within(document.body)`.
 */
const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
];

const meta: Meta<typeof Select> = {
  title: 'Components/Forms/Select/Tests',
  component: Select,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Select a framework',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Select>;

/** Keyboard focus draws a visible ring; the ring is keyboard-only (regression
 *  guard for the dead `[data-focus-visible]` selector — Ark emits no such attr,
 *  so the ring is now on the native `:focus-visible` of the <button>). */
export const FocusRingIsKeyboardOnly: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await step('no focus ring at rest', async () => {
      await expect(getComputedStyle(trigger).boxShadow).toBe('none');
    });

    await step('keyboard focus (Tab) renders a visible focus ring', async () => {
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike a programmatic .focus().
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Keyboard opens the listbox, arrow-navigates, and Enter commits the option. */
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('combobox');

    await step('trigger is keyboard-reachable and enabled', async () => {
      await expect(trigger).not.toHaveAttribute('aria-disabled', 'true');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the portalled listbox', async () => {
      await userEvent.keyboard('{Enter}');
      const listbox = await body.findByRole('listbox');
      await expect(listbox).toBeInTheDocument();
    });

    await step('ArrowDown highlights an option and Enter commits it', async () => {
      const listbox = body.getByRole('listbox');
      await userEvent.keyboard('{ArrowDown}');
      const highlighted = within(listbox)
        .getAllByRole('option')
        .find((opt) => opt.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeTruthy();
      const expected = frameworks.find((f) => f.value === highlighted?.getAttribute('data-value'));
      await expect(expected).toBeTruthy();
      await userEvent.keyboard('{Enter}');

      await waitFor(() => expect(body.queryByRole('listbox')).not.toBeInTheDocument());
      // The trigger also contains the indicator glyph, so assert as substring.
      await expect(trigger).toHaveTextContent(expected!.label);
    });
  },
};

/** A committed option exposes its checked state; the placeholder color applies
 *  only while the placeholder is shown (regression guard: data-placeholder-shown
 *  lives on the TRIGGER, not value-text — the old selector was dead). */
export const SelectedStateAndPlaceholderColor: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('combobox');
    const valueText = trigger.querySelector<HTMLElement>('[data-part="value-text"]')!;

    let placeholderColor = '';
    await step('placeholder is shown and dimmed at rest', async () => {
      await expect(trigger).toHaveAttribute('data-placeholder-shown');
      placeholderColor = getComputedStyle(valueText).color;
      // The dim color must actually resolve (not the default text color).
      await expect(placeholderColor).not.toBe('');
    });

    await step('selecting an option clears placeholder-shown and recolors text', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const listbox = await body.findByRole('listbox');
      // Wait for the listbox to actually highlight an option before committing —
      // firing {ArrowDown}{Enter} as one chord can race the just-opened portal.
      await userEvent.keyboard('{ArrowDown}');
      await waitFor(() =>
        expect(
          within(listbox)
            .getAllByRole('option')
            .some((opt) => opt.hasAttribute('data-highlighted')),
        ).toBe(true),
      );
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(trigger).not.toHaveAttribute('data-placeholder-shown'));
      await expect(getComputedStyle(valueText).color).not.toBe(placeholderColor);
    });

    await step('the chosen option is marked checked in the listbox', async () => {
      await userEvent.keyboard('{Enter}');
      const listbox = await body.findByRole('listbox');
      const checked = within(listbox)
        .getAllByRole('option')
        .find((opt) => opt.getAttribute('data-state') === 'checked');
      await expect(checked).toBeTruthy();
      await userEvent.keyboard('{Escape}');
    });
  },
};

/** A disabled select exposes its state to AT, is inoperable, and styles
 *  differently from the enabled trigger. */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('combobox');

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(trigger).toBeDisabled();
      await expect(trigger).toHaveAttribute('data-disabled');
    });

    await step('disabled trigger differs visually from an enabled one', async () => {
      const cs = getComputedStyle(trigger);
      await expect(cs.cursor).toBe('not-allowed');
      // Disabled surface token differs from the default surface.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('disabled trigger cannot open the listbox', async () => {
      await userEvent.click(trigger, { pointerEventsCheck: 0 });
      await expect(body.queryByRole('listbox')).not.toBeInTheDocument();
    });
  },
};

/** Invalid state recolors the trigger border (regression guard for the
 *  data-invalid contract). */
export const InvalidStateBorder: Story = {
  args: { invalid: true, defaultValue: ['react'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');

    await step('invalid is exposed and the border color resolves', async () => {
      await expect(trigger).toHaveAttribute('data-invalid');
      await expect(getComputedStyle(trigger).borderTopColor).not.toBe('');
    });
  },
};

/** The clear button is an accessible icon control that resets the selection. */
export const ClearableResetsSelection: Story = {
  args: { clearable: true, defaultValue: ['react'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox');
    const clear = canvas.getByRole('button', { name: 'Clear selection' });

    await step('clear button has an accessible name (icon-only)', async () => {
      await expect(clear).toBeInTheDocument();
      await expect(trigger).not.toHaveAttribute('data-placeholder-shown');
    });

    await step('activating clear resets to the placeholder', async () => {
      await userEvent.click(clear);
      await waitFor(() => expect(trigger).toHaveAttribute('data-placeholder-shown'));
    });
  },
};
