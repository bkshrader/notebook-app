import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AdvancedTable, type AdvancedTableColumn } from './AdvancedTable';

/**
 * Interaction / accessibility tests for the Advanced Table.
 *
 * Separate from the visual stories (`AdvancedTable.stories.tsx`) per the
 * `*.spec.stories.tsx` convention — the `play` functions MUTATE focus/state.
 * The grid-keyboard cases lean on the `.storybook/preview.tsx` focus-reset
 * `beforeEach` + the `vitest.config.ts` retry budget for determinism under the
 * shared browser context.
 */

interface Row {
  id: string;
  name: string;
  owner: string;
  hits: number;
  children?: Row[];
}

const flat: Row[] = [
  { id: 'a', name: 'alpha', owner: 'x', hits: 3 },
  { id: 'b', name: 'bravo', owner: 'y', hits: 9 },
  { id: 'c', name: 'charlie', owner: 'z', hits: 1 },
];

const nested: Row[] = [
  {
    id: 'p',
    name: 'parent',
    owner: 'x',
    hits: 5,
    children: [{ id: 'k', name: 'kid', owner: 'x', hits: 2 }],
  },
  { id: 'q', name: 'quiet', owner: 'y', hits: 4 },
];

const columns: AdvancedTableColumn<Row>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'owner', header: 'Owner' },
  { key: 'hits', header: 'Hits', align: 'right', sortable: true },
];

const meta: Meta<typeof AdvancedTable<Row>> = {
  title: 'Components/Data/AdvancedTable/Tests',
  component: AdvancedTable,
  args: { columns, data: flat, caption: 'Grid data' },
  tags: ['test'],
};

export default meta;
type Story = StoryObj<typeof AdvancedTable<Row>>;

/** Exposes the grid ARIA contract: role=grid, gridcell, roving tabindex. */
export const GridRoleContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the table exposes role="grid" named by the caption', async () => {
      const grid = canvas.getByRole('grid', { name: 'Grid data' });
      await expect(grid).toBeInTheDocument();
    });

    await step('data cells are role="gridcell"', async () => {
      const cells = canvas.getAllByRole('gridcell');
      await expect(cells.length).toBe(flat.length * columns.length);
    });

    await step('exactly one gridcell is in the tab order (roving tabindex)', async () => {
      const focusable = canvasElement.querySelectorAll(
        '[data-part="td"][role="gridcell"][tabindex="0"]',
      );
      await expect(focusable.length).toBe(1);
    });
  },
};

/** The menu item with `label` inside the single currently-open Ark menu.
 *  Every column header renders its own context menu (all portalled to
 *  document.body), so scoping to the open menu disambiguates the duplicate
 *  "Resize column" / "Move column" labels. */
async function openMenuItem(label: string): Promise<HTMLElement> {
  const openMenu = await waitFor(() => {
    const menus = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));
    const open = menus.find((m) => m.getAttribute('data-state') === 'open');
    if (!open) throw new Error('no open menu');
    return open;
  });
  return within(openMenu).getByRole('menuitem', { name: label });
}

/** Tab the active cell (one roving tab stop, reached after the header's own
 *  interactive controls). Helios: tabbing into the grid focuses the first cell. */
async function tabIntoGrid(firstCell: HTMLElement) {
  // The grid's gridcells share ONE roving tab stop; in DOM order it follows the
  // header's sort buttons, so Tab a few times until the active cell is focused.
  for (let i = 0; i < 10; i += 1) {
    if (document.activeElement === firstCell) return;
    await userEvent.tab();
  }
}

/** Tab enters the grid onto the first cell; arrows move the focused cell. */
export const KeyboardNavigationMode: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const cells = canvas.getAllByRole('gridcell');
    const firstCell = cells[0]!;

    await step('tabbing into the grid focuses the first cell (after header controls)', async () => {
      await tabIntoGrid(firstCell);
      await expect(firstCell).toHaveFocus();
    });

    await step('ArrowRight moves focus one column to the right', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(cells[1]).toHaveFocus();
    });

    await step('ArrowDown moves focus one row down (same column)', async () => {
      await userEvent.keyboard('{ArrowDown}');
      // row 1, col 1 → index = columns.length * 1 + 1
      await expect(cells[columns.length + 1]).toHaveFocus();
    });

    await step('End jumps to the last cell of the row', async () => {
      await userEvent.keyboard('{End}');
      await expect(cells[columns.length + (columns.length - 1)]).toHaveFocus();
    });

    await step('Ctrl+Home jumps to the very first cell', async () => {
      await userEvent.keyboard('{Control>}{Home}{/Control}');
      await expect(firstCell).toHaveFocus();
    });

    await step('Ctrl+End jumps to the very last cell of the grid', async () => {
      await userEvent.keyboard('{Control>}{End}{/Control}');
      await expect(cells[cells.length - 1]).toHaveFocus();
    });

    await step('the focused cell carries a keyboard focus ring', async () => {
      const ring = getComputedStyle(cells[cells.length - 1]!).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** A cell with an interactive child: Enter enters Action Mode, Escape exits. */
export const ActionModeEnterEscape: Story = {
  args: { data: nested, getSubRows: (row) => row.children },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    // With expandable rows, col 0 is the expand cell; its expand button is the
    // first interactive element of the focused cell.
    const cells = canvas.getAllByRole('gridcell');
    const expandCell = cells[0]!;

    await step('focus the first (expand) cell', async () => {
      await tabIntoGrid(expandCell);
      await expect(expandCell).toHaveFocus();
    });

    await step('Enter enters Action Mode — focus moves to the in-cell control', async () => {
      await userEvent.keyboard('{Enter}');
      const expandButton = within(expandCell).getByRole('button');
      await expect(expandButton).toHaveFocus();
    });

    await step('Escape returns to Navigation Mode — focus back on the cell', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(expandCell).toHaveFocus();
    });
  },
};

/** Expandable rows: toggling reveals nested rows + flips aria-expanded. */
export const ExpandableRows: Story = {
  args: { data: nested, getSubRows: (row) => row.children },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('a parent row advertises aria-expanded=false initially', async () => {
      const parentRow = canvasElement.querySelector('tbody tr[aria-expanded="false"]');
      await expect(parentRow).not.toBeNull();
    });

    await step('activating the expand control reveals the nested row', async () => {
      const expandButton = canvas.getAllByRole('button', { name: 'Expand row' })[0]!;
      await userEvent.click(expandButton);
      await waitFor(async () => {
        await expect(canvas.getByText('kid')).toBeInTheDocument();
      });
      const parentRow = canvasElement.querySelector('tbody tr[aria-expanded="true"]');
      await expect(parentRow).not.toBeNull();
    });
  },
};

/** Resizable columns: choosing "Resize column" then arrowing changes width. */
export const ResizeViaContextMenu: Story = {
  args: { hasResizableColumns: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const nameHeader = canvas.getByRole('columnheader', { name: /name/i });

    await step('open the column context menu', async () => {
      const trigger = within(nameHeader).getByRole('button', { name: /column options/i });
      await userEvent.click(trigger);
      const resizeItem = await openMenuItem('Resize column');
      await userEvent.click(resizeItem);
    });

    await step('ArrowRight on the resize border widens the column by 10px', async () => {
      const border = nameHeader.querySelector<HTMLElement>(
        '[data-part="resize-border"][data-active]',
      );
      await expect(border).not.toBeNull();
      const before = nameHeader.getBoundingClientRect().width;
      border!.focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(async () => {
        const after = nameHeader.getBoundingClientRect().width;
        await expect(after).toBeGreaterThan(before);
      });
    });
  },
};

/** Reorderable columns: choosing "Move column" then arrowing changes order. */
export const ReorderViaContextMenu: Story = {
  args: { hasResizableColumns: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const nameHeader = canvas.getByRole('columnheader', { name: /name/i });

    const headerOrder = () =>
      Array.from(canvasElement.querySelectorAll('thead th[role="columnheader"]'))
        .map((th) => th.textContent?.trim())
        .join('|');

    await step('open the menu and choose Move column', async () => {
      const before = headerOrder();
      await expect(before.startsWith('Name')).toBe(true);
      const trigger = within(nameHeader).getByRole('button', { name: /column options/i });
      await userEvent.click(trigger);
      const moveItem = await openMenuItem('Move column');
      await userEvent.click(moveItem);
    });

    await step('ArrowRight moves the Name column one position right', async () => {
      const handle = nameHeader.querySelector<HTMLElement>(
        '[data-part="reorder-handle"][data-active]',
      );
      await expect(handle).not.toBeNull();
      handle!.focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(async () => {
        await expect(headerOrder().startsWith('Name')).toBe(false);
      });
    });
  },
};

/** The sticky header stays inside the scroll container under Y overflow. */
export const StickyHeader: Story = {
  args: {
    maxBlockSize: '6rem',
    data: [...flat, { id: 'd', name: 'delta', owner: 'w', hits: 7 }],
  },
  play: async ({ canvasElement, step }) => {
    await step('the thead is position: sticky within the scroll container', async () => {
      const thead = canvasElement.querySelector<HTMLElement>('[data-part="thead"]');
      await expect(thead).not.toBeNull();
      await expect(getComputedStyle(thead!).position).toBe('sticky');
    });

    await step('the scroll container actually overflows on Y', async () => {
      const scroll = canvasElement.querySelector<HTMLElement>('[data-part="scroll"]');
      await expect(scroll).not.toBeNull();
      await expect(scroll!.scrollHeight).toBeGreaterThan(scroll!.clientHeight);
    });
  },
};
