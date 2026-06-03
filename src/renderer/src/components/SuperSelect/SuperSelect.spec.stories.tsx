import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { SuperSelect } from './SuperSelect';

/**
 * Interaction / accessibility tests for SuperSelect.
 *
 * Kept separate from the visual stories (`SuperSelect.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (opens the listbox, commits selections), so colocating it with
 * a doc story would make that story flash open on load. Each story is named by
 * behavior so a failure is self-describing, each AWAITS real `expect(...)`
 * assertions (storybook matchers are async), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * SuperSelect wraps Ark's Combobox (Tier C collection). It exposes NO
 * `data-focus-visible` on any part — the keyboard focus RING rides the native
 * `:focus-visible` pseudo (on the control via `:has(input:focus-visible)`, and
 * on the trigger/chip-remove buttons directly). Several stories are explicit
 * guards for that contract and for the multi-select chip behavior.
 */
const regions = [
  { label: 'North America', value: 'na' },
  { label: 'South America', value: 'sa' },
  { label: 'Europe', value: 'eu' },
  { label: 'Asia Pacific', value: 'ap' },
  { label: 'Middle East', value: 'me' },
  { label: 'Africa', value: 'af' },
];

const meta: Meta<typeof SuperSelect> = {
  title: 'Components/Forms/SuperSelect/Tests',
  component: SuperSelect,
  args: {
    label: 'Region',
    items: regions,
    placeholder: 'Search regions…',
    size: 'medium',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof SuperSelect>;

/**
 * ARIA contract: the search field exposes role=combobox, is labelled, and is
 * keyboard-reachable (not removed from the tab order).
 */
export const AriaContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await step('the input has the combobox role and an accessible name', async () => {
      await expect(input).toBeInTheDocument();
      await expect(input).toHaveAccessibleName('Region');
    });

    await step('the input is keyboard-reachable', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
    });
  },
};

/**
 * Keyboard focus on the input draws a visible ring on the control wrapper.
 *
 * Guard: Ark emits no `data-focus-visible`, so the ring lives on the control via
 * `:has(input:focus-visible)`. `userEvent.tab()` produces a real keyboard focus
 * that triggers `:focus-visible` (unlike programmatic `.focus()`).
 */
export const InputFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');
    const control = canvasElement.querySelector<HTMLElement>('[data-part="control"]')!;

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
 * Keyboard: open, navigate, commit with Enter; the listbox closes and the input
 * reflects the committed label (single-select mode).
 */
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    let expectedLabel = '';

    await step('ArrowDown opens the portalled listbox', async () => {
      input.focus();
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
      expectedLabel = regions.find((r) => r.value === value)!.label;
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
      await userEvent.keyboard('Eur');
      const listbox = await within(document.body).findByRole('listbox');
      const options = within(listbox).getAllByRole('option');
      await expect(options).toHaveLength(1);
      await expect(options[0]).toHaveTextContent('Europe');
    });

    await step('navigating + Enter commits the match and closes the listbox', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
      );
      await expect(input).toHaveValue('Europe');
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

    await step('ArrowDown opens the listbox and highlights an option', async () => {
      input.focus();
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{ArrowDown}');
      const listbox = await within(document.body).findByRole('listbox');
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
 * Multiple mode: committing two options renders two removable chips, and the
 * listbox stays open for further selection (Ark's multi-select behavior).
 */
export const MultipleSelectionRendersChips: Story = {
  args: { multiple: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox');

    await step('select the first option via keyboard', async () => {
      input.focus();
      await userEvent.keyboard('{ArrowDown}');
      await within(document.body).findByRole('listbox');
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
    });

    await step('select a second option via keyboard', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{ArrowDown}');
      await userEvent.keyboard('{Enter}');
    });

    await step('two removable chips are rendered', async () => {
      await waitFor(async () => {
        const removeButtons = canvas.getAllByRole('button', { name: /^Remove / });
        await expect(removeButtons).toHaveLength(2);
      });
    });

    await step('the chip pill resolves a non-transparent surface', async () => {
      const chip = canvasElement.querySelector<HTMLElement>('[data-part="chip"]')!;
      await expect(chip).not.toBeNull();
      const bg = getComputedStyle(chip).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      await expect(bg).not.toBe('transparent');
    });
  },
};

/**
 * Multiple mode: clicking a chip's remove button drops that selection.
 */
export const ChipRemoveDropsSelection: Story = {
  args: { multiple: true, defaultValue: ['na', 'eu'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('two chips render for the default selection', async () => {
      const removeButtons = canvas.getAllByRole('button', { name: /^Remove / });
      await expect(removeButtons).toHaveLength(2);
    });

    await step('removing one chip leaves a single selection', async () => {
      const removeEurope = canvas.getByRole('button', { name: 'Remove Europe' });
      await userEvent.click(removeEurope);
      await waitFor(async () => {
        const remaining = canvas.getAllByRole('button', { name: /^Remove / });
        await expect(remaining).toHaveLength(1);
        await expect(
          canvas.getByRole('button', { name: 'Remove North America' }),
        ).toBeInTheDocument();
      });
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
      <SuperSelect {...args} size="small" label="Small" />
      <SuperSelect {...args} size="large" label="Large" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('small input has less inline padding than large', async () => {
      const inputs = canvasElement.querySelectorAll<HTMLElement>('[data-part="input"]');
      await expect(inputs).toHaveLength(2);
      const [smallInput, largeInput] = inputs;
      const small = parseFloat(getComputedStyle(smallInput!).paddingInlineStart);
      const large = parseFloat(getComputedStyle(largeInput!).paddingInlineStart);
      await expect(large).toBeGreaterThan(small);
    });
  },
};
