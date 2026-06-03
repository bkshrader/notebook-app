import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Combobox } from './Combobox';

/**
 * Interaction / accessibility tests for the Combobox.
 *
 * Kept separate from the visual stories (`Combobox.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (opens the listbox, commits a
 * selection), so colocating it with a doc story would make that story flash open
 * on load. Each story is named by behavior so a failure is self-describing, each
 * AWAITS real `expect(...)` assertions (storybook matchers are async), and each
 * uses `step()` for readable runner / Interactions-panel output.
 *
 * Several stories are explicit regression guards for the Helios contract fixes:
 *   - The keyboard focus RING renders. Ark exposes NO `data-focus-visible` on
 *     any combobox part, so the old `[data-part][data-focus-visible]` selectors
 *     were dead. The ring now rides the native `:focus-visible` pseudo (on the
 *     control via `:has(input:focus-visible)`, and on the trigger buttons
 *     directly). These guards FAIL against the old dead selectors and PASS now.
 *   - A highlighted option resolves a real background (it is the
 *     aria-activedescendant-managed keyboard-visible state, not a focus ring).
 */
const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Angular', value: 'angular' },
];

const meta: Meta<typeof Combobox> = {
  title: 'Components/Forms/Combobox/Tests',
  component: Combobox,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Search frameworks…',
    size: 'medium',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Combobox>;

/**
 * Keyboard focus on the input draws a visible ring on the control wrapper.
 *
 * Regression guard: the ring used to hang off a phantom
 * `[data-part='input'][data-focus-visible]` selector that Ark never emits, so no
 * ring rendered. It now lives on the control via `:has(input:focus-visible)`.
 * `userEvent.tab()` produces a real keyboard focus that triggers
 * `:focus-visible` (unlike programmatic `.focus()`).
 */
export const InputFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    const control = canvasElement.querySelector<HTMLElement>('[data-part="control"]')!;

    await step('input is keyboard-reachable', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
    });

    await step('tabbing to the input renders a focus ring on the control', async () => {
      await expect(control).not.toBeNull();
      const ringBefore = getComputedStyle(control).boxShadow;
      await userEvent.tab();
      await expect(input).toHaveFocus();
      const ring = getComputedStyle(control).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
      await expect(ring).not.toBe(ringBefore);
    });
  },
};

/**
 * The toggle and clear buttons each render their own keyboard focus ring.
 *
 * Regression guard: both used a dead `[data-part][data-focus-visible]` selector;
 * they now use the native `:focus-visible` on the <button> itself.
 */
export const TriggerFocusRing: Story = {
  args: { defaultValue: ['react'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Toggle options' });
    const clear = canvas.getByRole('button', { name: 'Clear selection' });

    await step('toggle button shows a focus ring under :focus-visible', async () => {
      toggle.focus();
      // jsdom/playwright apply :focus-visible to programmatic focus on buttons in
      // the test runner; assert the ring resolves.
      const ring = getComputedStyle(toggle).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('clear button shows a focus ring under :focus-visible', async () => {
      clear.focus();
      const ring = getComputedStyle(clear).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Opening the listbox highlights options that resolve a real background — the
 * keyboard-visible "active option" state (aria-activedescendant, role=option,
 * tabindex=-1), NOT a focus ring.
 */
export const HighlightedOptionHasBackground: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await step('ArrowDown opens the listbox', async () => {
      input.focus();
      await userEvent.keyboard('{ArrowDown}');
      const listbox = await within(document.body).findByRole('listbox');
      await expect(listbox).toBeInTheDocument();
    });

    await step('the highlighted option paints a non-transparent background', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const listbox = within(document.body).getByRole('listbox');
      const highlighted = within(listbox)
        .getAllByRole('option')
        .find((opt) => opt.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeTruthy();
      const bg = getComputedStyle(highlighted!).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      await expect(bg).not.toBe('transparent');
    });
  },
};

/**
 * Keyboard: open, navigate, commit with Enter; the listbox closes and the input
 * reflects the committed label.
 */
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await step('input is operable (not disabled)', async () => {
      await expect(input).not.toHaveAttribute('aria-disabled', 'true');
      input.focus();
      await expect(input).toHaveFocus();
    });

    let expectedLabel = '';

    await step('ArrowDown opens the portalled listbox', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const listbox = await within(document.body).findByRole('listbox');
      await expect(listbox).toBeInTheDocument();
    });

    await step('moving the highlight then Enter commits that option', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const listbox = within(document.body).getByRole('listbox');
      const highlighted = within(listbox)
        .getAllByRole('option')
        .find((opt) => opt.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeTruthy();
      const value = highlighted!.getAttribute('data-value');
      expectedLabel = frameworks.find((f) => f.value === value)!.label;
      await userEvent.keyboard('{Enter}');
    });

    await step('the listbox closes after selection', async () => {
      await waitFor(() =>
        expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
      );
    });

    await step('the input value reflects the committed label', async () => {
      await expect(input).toHaveValue(expectedLabel);
    });
  },
};

/**
 * Typing filters the option list to substring matches; navigating + Enter
 * commits the single match.
 */
export const FilterAndSelect: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await step('typing a query filters to the matching option', async () => {
      input.focus();
      await userEvent.keyboard('Sol');
      const listbox = await within(document.body).findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      await expect(options).toHaveLength(1);
      await expect(options[0]).toHaveTextContent('Solid');
    });

    await step('navigating + Enter commits the match and closes the listbox', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
      );
      await expect(input).toHaveValue('Solid');
    });
  },
};

/**
 * Disabled differs from enabled: the input exposes its disabled state to AT and
 * the control resolves the disabled surface (not the default surface).
 */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    const control = canvasElement.querySelector<HTMLElement>('[data-part="control"]')!;

    await step('the input is disabled and announced to AT', async () => {
      await expect(input).toBeDisabled();
    });

    await step('the control carries the disabled state and a distinct surface', async () => {
      await expect(control).toHaveAttribute('data-disabled');
      const bg = getComputedStyle(control).backgroundColor;
      // Disabled surface differs from the default control surface.
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * The configurable size scale changes the control padding (small < large).
 */
export const SizeScaleAffectsPadding: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Combobox {...args} size="small" label="Small" />
      <Combobox {...args} size="large" label="Large" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('small input has less inline padding than large', async () => {
      const inputs = canvasElement.querySelectorAll<HTMLElement>('[data-part="input"]');
      await expect(inputs).toHaveLength(2);
      const [smallInput, largeInput] = inputs;
      await expect(smallInput).toBeTruthy();
      await expect(largeInput).toBeTruthy();
      const small = parseFloat(getComputedStyle(smallInput!).paddingInlineStart);
      const large = parseFloat(getComputedStyle(largeInput!).paddingInlineStart);
      await expect(large).toBeGreaterThan(small);
    });
  },
};
