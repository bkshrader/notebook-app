import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Table, type TableColumn, type TableSort } from './Table';

/**
 * Interaction / accessibility tests for the Table.
 *
 * Kept separate from the visual stories (`Table.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES state,
 * so colocating it with a doc story would make that story flash on load. Named
 * by behavior so a failure is self-describing; each asserts; each uses `step()`.
 */

interface Row {
  id: string;
  name: string;
  cpu: number;
}

const data: Row[] = [
  { id: 'a', name: 'alpha', cpu: 30 },
  { id: 'b', name: 'bravo', cpu: 90 },
  { id: 'c', name: 'charlie', cpu: 10 },
];

const columns: TableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'cpu', header: 'CPU %', align: 'right', sortable: true },
];

const meta: Meta<typeof Table<Row>> = {
  title: 'Components/Data/Table/Tests',
  component: Table,
  args: { columns, data, caption: 'Test data' },
  tags: ['test'],
};

export default meta;
type Story = StoryObj<typeof Table<Row>>;

/** Renders real table semantics with an accessible caption. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes the native table role with the caption as its name', async () => {
      const table = canvas.getByRole('table', { name: 'Test data' });
      await expect(table.tagName).toBe('TABLE');
    });

    await step('renders a thead and tbody and one row per datum', async () => {
      await expect(canvasElement.querySelector('thead')).not.toBeNull();
      await expect(canvasElement.querySelector('tbody')).not.toBeNull();
      // 3 data rows (header row lives in thead, so columnheaders are separate).
      const bodyRows = canvasElement.querySelectorAll('tbody tr');
      await expect(bodyRows.length).toBe(3);
    });

    await step('right-aligned column resolves text-align: right (end)', async () => {
      const cpuCell = canvasElement.querySelector<HTMLElement>(
        "tbody td[data-part='td'][data-align='right']",
      );
      await expect(cpuCell).not.toBeNull();
      const ta = getComputedStyle(cpuCell!).textAlign;
      await expect(['right', 'end']).toContain(ta);
    });
  },
};

/** A hidden caption stays in the accessibility tree but is visually collapsed. */
export const HiddenCaptionStillNamesTable: Story = {
  args: { captionHidden: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('table is still named by the (visually hidden) caption', async () => {
      const table = canvas.getByRole('table', { name: 'Test data' });
      await expect(table).toBeInTheDocument();
    });
    await step('caption is clipped to 1px (visually hidden)', async () => {
      const caption = canvasElement.querySelector<HTMLElement>('caption[data-hidden]');
      await expect(caption).not.toBeNull();
      await expect(getComputedStyle(caption!).position).toBe('absolute');
    });
  },
};

/** Controlled sort harness: clicking a sortable header toggles aria-sort and
 *  only one column is sorted at a time. */
export const SortToggles: Story = {
  render: (args) => {
    const [sort, setSort] = useState<TableSort | null>(null);
    return <Table {...args} sort={sort} onSortChange={setSort} />;
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const nameHeader = canvas.getByRole('columnheader', { name: /name/i });
    const cpuHeader = canvas.getByRole('columnheader', { name: /cpu/i });
    const nameButton = within(nameHeader).getByRole('button');

    await step('starts unsorted (aria-sort=none on sortable headers)', async () => {
      await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
      await expect(cpuHeader).toHaveAttribute('aria-sort', 'none');
    });

    await step('first activation sorts ascending', async () => {
      nameButton.focus();
      await userEvent.keyboard('{Enter}');
      await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    });

    await step('second activation flips to descending', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    });

    await step('sorting a second column clears the first (one at a time)', async () => {
      const cpuButton = within(cpuHeader).getByRole('button');
      cpuButton.focus();
      await userEvent.keyboard('{Enter}');
      await expect(cpuHeader).toHaveAttribute('aria-sort', 'ascending');
      await expect(nameHeader).toHaveAttribute('aria-sort', 'none');
    });

    await step('ascending sort actually reorders the rows', async () => {
      // CPU asc → 10, 30, 90 → charlie, alpha, bravo
      const firstCell = canvasElement.querySelector('tbody tr td[data-part="td"]');
      await expect(firstCell?.textContent).toBe('charlie');
    });
  },
};

/** The sort control draws a focus ring only on keyboard focus. */
export const SortButtonFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = within(canvas.getByRole('columnheader', { name: /name/i })).getByRole('button');

    await step('keyboard focus renders a visible ring (:focus-visible)', async () => {
      button.blur();
      await userEvent.tab();
      // Tab order: first focusable is the first sortable header button.
      await expect(button).toHaveFocus();
      const ring = getComputedStyle(button).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Header checkbox toggles all rows; a row checkbox toggles just that row. */
export const SelectionDrivesOnChange: Story = {
  render: (args) => {
    const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());
    return (
      <Table {...args} selectable selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} />
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('header "select all" selects every row', async () => {
      const selectAll = canvas.getByRole('checkbox', { name: 'Select all rows' });
      await userEvent.click(selectAll);
      const rowBoxes = canvas.getAllByRole('checkbox', { name: 'Select row' });
      for (const box of rowBoxes) {
        await expect(box).toBeChecked();
      }
    });

    await step('toggling one row off leaves the others selected', async () => {
      const rowBoxes = canvas.getAllByRole('checkbox', { name: 'Select row' });
      await userEvent.click(rowBoxes[0]!);
      await expect(rowBoxes[0]!).not.toBeChecked();
      await expect(rowBoxes[1]!).toBeChecked();
    });

    await step('header checkbox reflects the indeterminate (mixed) state', async () => {
      // Ark exposes mixed state via the presentational control's
      // data-state="indeterminate" (the native input carries the DOM
      // `indeterminate` property, not an aria-checked="mixed" attribute).
      const control = canvasElement.querySelector(
        "thead [data-scope='checkbox'][data-part='control']",
      );
      await expect(control).not.toBeNull();
      await expect(control).toHaveAttribute('data-state', 'indeterminate');
    });
  },
};

/** Density resolves a real, non-zero cell padding. */
export const DensityResolvesPadding: Story = {
  args: { density: 'tall' },
  play: async ({ canvasElement, step }) => {
    await step('tall density gives body cells real vertical padding', async () => {
      const cell = canvasElement.querySelector<HTMLElement>('tbody td[data-part="td"]');
      await expect(cell).not.toBeNull();
      const pad = getComputedStyle(cell!).paddingBlockStart;
      await expect(pad).not.toBe('');
      await expect(pad).not.toBe('0px');
    });
  },
};
