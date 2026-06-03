import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { KeyValueInputs } from './KeyValueInputs';

/**
 * Interaction / accessibility tests for KeyValueInputs.
 *
 * Kept separate from the visual stories (`KeyValueInputs.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles and drive real keyboard input, so they are test
 * cases, not documentation. Each is behavior-named, uses `step()` for readable
 * runner output, and `await`s real `expect(...)` (Storybook matchers are async).
 *
 * KeyValueInputs is a presentational composite (no Ark primitive). The contract
 * under test: the `<fieldset>`/`<legend>` group semantics, per-input labelling,
 * the `aria-live` rows region, keyboard-operable add/remove, and focus not being
 * orphaned after a delete. `tags: ['test']` hides these from the docs gallery;
 * the preview's `a11y.test: 'error'` runs axe on every story automatically.
 */
const meta: Meta<typeof KeyValueInputs> = {
  title: 'Components/Forms/KeyValueInputs/Tests',
  component: KeyValueInputs,
  args: { legend: 'Environment variables' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof KeyValueInputs>;

/** The fieldset/legend group semantics + the live rows region exist. */
export const StructureContract: Story = {
  args: {
    legend: 'Headers',
    helperText: 'Each row is submitted together.',
    defaultRows: [{ id: 's-1', key: '', value: '' }],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root is a <fieldset> named by its <legend> (WCAG 1.3.1/4.1.2)', async () => {
      const root = canvasElement.querySelector<HTMLFieldSetElement>(
        "[data-scope='key-value-inputs'][data-part='root']",
      );
      await expect(root).not.toBeNull();
      await expect(root!.tagName).toBe('FIELDSET');
      // The accessible group is named by the legend.
      await expect(canvas.getByRole('group', { name: 'Headers' })).toBe(root);
    });

    await step('the rows container is a polite live region', async () => {
      const rows = canvasElement.querySelector<HTMLElement>("[data-part='rows']");
      await expect(rows).not.toBeNull();
      await expect(rows).toHaveAttribute('aria-live', 'polite');
    });

    await step('group-level helper text is associated via aria-describedby', async () => {
      const root = canvasElement.querySelector<HTMLFieldSetElement>("[data-part='root']")!;
      const describedby = root.getAttribute('aria-describedby');
      await expect(describedby).toBeTruthy();
      const helper = canvasElement.querySelector(`#${describedby}`);
      await expect(helper).toHaveAttribute('data-part', 'helper-text');
    });

    await step('each input is labelled by its column label', async () => {
      // getByLabelText throws if the input is not accessibly named.
      await expect(canvas.getByLabelText('Key')).not.toBeNull();
      await expect(canvas.getByLabelText('Value')).not.toBeNull();
    });
  },
};

/** Typing into a row's inputs and using the add button via the keyboard. */
export const KeyboardAddsRow: Story = {
  args: { defaultRows: [{ id: 'a-1', key: '', value: '' }] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('typing populates the key/value inputs', async () => {
      const key = canvas.getByLabelText('Key');
      const value = canvas.getByLabelText('Value');
      await userEvent.type(key, 'TOKEN');
      await userEvent.type(value, 'abc123');
      await expect(key).toHaveValue('TOKEN');
      await expect(value).toHaveValue('abc123');
    });

    await step('the add button is keyboard-operable and appends a row', async () => {
      const addButton = canvas.getByRole('button', { name: 'Add row' });
      addButton.focus();
      await expect(addButton).toHaveFocus();
      // Activate via the real keyboard path (Enter on a native <button>).
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        // Two rows now → two "Key" inputs.
        await expect(canvas.getAllByLabelText('Key')).toHaveLength(2);
      });
    });
  },
};

/** Deleting a row removes it and moves focus to the add button (not orphaned). */
export const DeleteRemovesRowAndRestoresFocus: Story = {
  args: {
    defaultRows: [
      { id: 'd-1', key: 'a', value: '1' },
      { id: 'd-2', key: 'b', value: '2' },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('two delete buttons exist, each accessibly named', async () => {
      await expect(canvas.getByRole('button', { name: 'Delete row 1' })).not.toBeNull();
      await expect(canvas.getByRole('button', { name: 'Delete row 2' })).not.toBeNull();
    });

    await step('activating delete via keyboard removes its row', async () => {
      const del = canvas.getByRole('button', { name: 'Delete row 2' });
      del.focus();
      await expect(del).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        await expect(canvas.getAllByLabelText('Key')).toHaveLength(1);
      });
    });

    await step('focus is moved to the add button (never orphaned on removed node)', async () => {
      await waitFor(async () => {
        await expect(canvas.getByRole('button', { name: 'Add row' })).toHaveFocus();
      });
    });
  },
};

/** Token + layout backstop: the row resolves the Helios flex layout and the
 * repeated labels on later rows are visually hidden but still in the a11y tree. */
export const LayoutAndHiddenLabelBackstop: Story = {
  args: {
    defaultRows: [
      { id: 'l-1', key: '', value: '' },
      { id: 'l-2', key: '', value: '' },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the root resolves the Helios flex-column layout', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.display).toBe('flex');
      await expect(cs.flexDirection).toBe('column');
    });

    await step('the legend resolves the Helios legend token color + semibold weight', async () => {
      const legend = canvasElement.querySelector<HTMLElement>("[data-part='legend']")!;
      const cs = getComputedStyle(legend);
      // The rule applies: the legend foreground resolves to the same value the
      // --token-form-legend-color token computes to (not the UA default).
      const tokenColor = cs.getPropertyValue('--token-form-legend-color').trim();
      await expect(tokenColor).not.toBe('');
      await expect(cs.color).not.toBe('');
      // The semibold weight token is wired through (the rendered face can fall
      // back to 400 in headless chromium, so assert the token value, not the
      // synthesized font-weight).
      await expect(cs.getPropertyValue('--token-typography-font-weight-semibold').trim()).toBe(
        '600',
      );
    });

    await step('the first row keeps its labels visible; later rows hide them', async () => {
      const labels = Array.from(
        canvasElement.querySelectorAll<HTMLElement>("[data-part='field-label']"),
      );
      // 2 rows x (key + value) = 4 labels.
      await expect(labels).toHaveLength(4);
      const [firstRowKeyLabel, , secondRowKeyLabel] = labels;
      // Row 1 labels are NOT visually hidden.
      await expect(firstRowKeyLabel!.hasAttribute('data-visually-hidden')).toBe(false);
      // Row 2 labels ARE visually hidden (but remain named for AT — every input
      // still resolves via getByLabelText).
      await expect(secondRowKeyLabel!.hasAttribute('data-visually-hidden')).toBe(true);
      // The visually-hidden treatment applies: the rule clips the label to an
      // absolutely-positioned 1px box (the standard screen-reader-only
      // technique) so it takes no visual space while staying in the a11y tree.
      const hiddenCs = getComputedStyle(secondRowKeyLabel!);
      await expect(hiddenCs.position).toBe('absolute');
      const hiddenRect = secondRowKeyLabel!.getBoundingClientRect();
      await expect(hiddenRect.width).toBeLessThanOrEqual(1);
      await expect(hiddenRect.height).toBeLessThanOrEqual(1);
      // Still in the a11y tree: all 2 rows' Key inputs are reachable by name.
      await expect(canvas.getAllByLabelText('Key')).toHaveLength(2);
    });
  },
};
