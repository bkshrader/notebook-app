import { forwardRef, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row as TanstackRow,
  type SortingState,
} from '@tanstack/react-table';

import { MenuParts as Menu } from '../Menu';

import { useColumnContextMenu } from './useColumnContextMenu';
import { useGridNavigation } from './useGridNavigation';

import './AdvancedTable.css';

const SCOPE = 'advanced-table';

export type AdvancedTableAlign = 'left' | 'center' | 'right';
export type AdvancedTableSortDirection = 'asc' | 'desc';

export interface AdvancedTableSort {
  columnKey: string;
  direction: AdvancedTableSortDirection;
}

/** A column descriptor for the Advanced Table. */
export interface AdvancedTableColumn<Row> {
  key: string;
  header: ReactNode;
  align?: AdvancedTableAlign;
  sortable?: boolean;
  cell?: (row: Row) => ReactNode;
  accessor?: (row: Row) => unknown;
}

export interface AdvancedTableProps<Row> {
  columns: AdvancedTableColumn<Row>[];
  data: Row[];
  /** Accessible name for the grid. Required (WCAG 1.3.1 / 4.1.2). */
  caption: ReactNode;
  /** Visually hide the caption (still announced). */
  captionHidden?: boolean;
  /** Stable row id. Defaults to the row index. */
  getRowId?: (row: Row, index: number) => string;
  /** Returns a row's children for expandable/nested rows. */
  getSubRows?: (row: Row) => Row[] | undefined;
  /** Controlled single-column sort. */
  sort?: AdvancedTableSort | null;
  onSortChange?: (sort: AdvancedTableSort | null) => void;
  /** Allow the user to resize/reorder columns via the per-column context menu. */
  hasResizableColumns?: boolean;
  /** Max block size of the scroll container (enables Y overflow + sticky head). */
  maxBlockSize?: string;
}

/** Map our single-column sort to TanStack's array shape. */
function toSortingState(sort: AdvancedTableSort | null | undefined) {
  if (!sort) return [];
  return [{ id: sort.columnKey, desc: sort.direction === 'desc' }];
}

/** Map TanStack's next sorting state back to our single-column sort. */
function fromSortingState(next: SortingState): AdvancedTableSort | null {
  const first = next[0];
  if (!first) return null;
  return { columnKey: first.id, direction: first.desc ? 'desc' : 'asc' };
}

/**
 * Safe default cell stringifier — renders primitives, renders nothing for
 * object-shaped accessor values (supply a `cell` renderer for those).
 */
function stringifyCellValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  // null / undefined / object / symbol / function → supply a `cell` renderer.
  return '';
}

/** `aria-sort` value for a header cell. */
function ariaSortFor(
  columnKey: string,
  sortable: boolean | undefined,
  sort: AdvancedTableSort | null | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortable) return undefined;
  if (sort?.columnKey !== columnKey) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

/** The per-column resize/reorder context menu, composed from Ark's Menu. */
function ColumnContextMenu({
  columnId,
  onResize,
  onReorder,
}: {
  columnId: string;
  onResize: () => void;
  onReorder: () => void;
}) {
  return (
    <Menu.Root
      onSelect={({ value }) => {
        if (value === 'resize') onResize();
        else if (value === 'reorder') onReorder();
      }}
    >
      <Menu.Trigger
        data-scope={SCOPE}
        data-part="context-trigger"
        aria-label={`Column options for ${columnId}`}
      >
        <span data-scope={SCOPE} data-part="context-icon" aria-hidden="true">
          ⋮
        </span>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content data-scope={SCOPE} data-part="context-content">
          <Menu.Item data-scope={SCOPE} data-part="context-item" value="resize">
            Resize column
          </Menu.Item>
          <Menu.Item data-scope={SCOPE} data-part="context-item" value="reorder">
            Move column
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}

/** The header label — a sort button when sortable, otherwise the plain label. */
function HeaderLabel({
  header,
  sortable,
  direction,
  onToggleSort,
}: {
  header: ReactNode;
  sortable: boolean | undefined;
  direction: AdvancedTableSortDirection | false;
  onToggleSort: () => void;
}) {
  if (!sortable) return <>{header ?? null}</>;
  return (
    <button
      type="button"
      data-scope={SCOPE}
      data-part="sort-button"
      data-sorted={direction || undefined}
      onClick={onToggleSort}
    >
      {header}
    </button>
  );
}

/** The keyboard resize/reorder handle, focusable only while its sub-mode is on. */
// The cyclomatic count is the conditional attributes (data-part / data-active /
// aria-label / tabIndex, all keyed off the active adjust sub-mode) on a flat
// button render; the keydown logic is extracted to handleKeyDown and the state
// machine to useColumnContextMenu.
function ColumnAdjustHandle({
  columnId,
  adjust,
}: {
  columnId: string;
  adjust: ReturnType<typeof useColumnContextMenu>;
}) {
  const isAdjusting = adjust.activeColumn === columnId && adjust.mode !== 'idle';
  const reordering = adjust.mode === 'reorder';
  const part = reordering && isAdjusting ? 'reorder-handle' : 'resize-border';
  const label = `${reordering ? 'Move' : 'Resize'} ${columnId} column`;
  // Consume arrow keys here so they don't also bubble to the grid's cell-nav.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (adjust.onAdjustKeyDown(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  return (
    <button
      type="button"
      data-scope={SCOPE}
      data-part={part}
      data-active={isAdjusting ? '' : undefined}
      aria-label={label}
      // Only a tab stop while its adjust sub-mode is engaged (reached from the
      // context menu); otherwise it stays out of the tab order.
      tabIndex={isAdjusting ? 0 : -1}
      onKeyDown={handleKeyDown}
    />
  );
}

/** One header cell: label, optional sort button, optional context menu + handle. */
// The cyclomatic count is JSX branching (sortable label / context menu / resize
// handle, all conditional on hasResizableColumns) plus the width-seed helper;
// the label, menu, and handle are already extracted to HeaderLabel /
// ColumnContextMenu / ColumnAdjustHandle.
function HeaderCell<Row>({
  column,
  config,
  sort,
  onToggleSort,
  hasResizableColumns,
  adjust,
  width,
  onSeedWidth,
}: {
  column: { id: string; columnDef: ColumnDef<Row> };
  config: AdvancedTableColumn<Row> | undefined;
  sort: AdvancedTableSort | null | undefined;
  onToggleSort: () => void;
  hasResizableColumns: boolean | undefined;
  adjust: ReturnType<typeof useColumnContextMenu>;
  width: number | undefined;
  /** Seed a column's width from its current rendered px (resize baseline). */
  onSeedWidth: (columnId: string, px: number) => void;
}) {
  const align = config?.align ?? 'left';
  const sortable = config?.sortable;
  const direction = sort?.columnKey === column.id ? sort.direction : false;
  const thRef = useRef<HTMLTableCellElement>(null);

  // Seed the resize baseline from the actual rendered width so the first
  // arrow-key step nudges from the real column width (not from min-width).
  const startResize = () => {
    if (width == null && thRef.current) {
      onSeedWidth(column.id, Math.round(thRef.current.getBoundingClientRect().width));
    }
    adjust.startResize(column.id);
  };

  return (
    <th
      ref={thRef}
      data-scope={SCOPE}
      data-part="th"
      data-align={align}
      scope="col"
      role="columnheader"
      aria-sort={ariaSortFor(column.id, sortable, sort)}
      style={width ? { inlineSize: `${width}px` } : undefined}
    >
      <span data-scope={SCOPE} data-part="th-content">
        <HeaderLabel
          header={config?.header}
          sortable={sortable}
          direction={direction}
          onToggleSort={onToggleSort}
        />
        {hasResizableColumns ? (
          <ColumnContextMenu
            columnId={column.id}
            onResize={startResize}
            onReorder={() => adjust.startReorder(column.id)}
          />
        ) : null}
      </span>
      {hasResizableColumns ? <ColumnAdjustHandle columnId={column.id} adjust={adjust} /> : null}
    </th>
  );
}

/** A single data/grid cell. Focusable (roving tabindex), role="gridcell". */
function GridCell({
  rowIndex,
  colIndex,
  align,
  tabIndex,
  registerCell,
  children,
}: {
  rowIndex: number;
  colIndex: number;
  align: AdvancedTableAlign;
  tabIndex: 0 | -1;
  registerCell: (row: number, col: number, node: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <td
      ref={(node) => registerCell(rowIndex, colIndex, node)}
      data-scope={SCOPE}
      data-part="td"
      data-align={align}
      role="gridcell"
      tabIndex={tabIndex}
    >
      {children}
    </td>
  );
}

/** The expand/collapse control for a row with sub-rows. A native button. */
function ExpandToggle<Row>({ row }: { row: TanstackRow<Row> }) {
  return (
    <button
      type="button"
      data-scope={SCOPE}
      data-part="expand-toggle"
      data-expanded={row.getIsExpanded() ? '' : undefined}
      aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
      onClick={() => row.toggleExpanded()}
    >
      <span data-scope={SCOPE} data-part="expand-icon" aria-hidden="true" />
    </button>
  );
}

/** One data row: an optional leading expand cell + one gridcell per column. */
// CC is the expand-cell conditional + the per-cell map on a flat row render; the
// cell and toggle are extracted to GridCell / ExpandToggle.
function GridRow<Row>({
  row,
  gridRow,
  hasExpandable,
  grid,
  alignFor,
}: {
  row: TanstackRow<Row>;
  gridRow: number;
  hasExpandable: boolean;
  grid: ReturnType<typeof useGridNavigation>;
  alignFor: (id: string) => AdvancedTableAlign;
}) {
  const colOffset = hasExpandable ? 1 : 0;
  return (
    <tr
      data-scope={SCOPE}
      data-part="row"
      role="row"
      aria-level={hasExpandable ? row.depth + 1 : undefined}
      aria-expanded={row.getCanExpand() ? row.getIsExpanded() : undefined}
    >
      {hasExpandable ? (
        <GridCell
          rowIndex={gridRow}
          colIndex={0}
          align="left"
          tabIndex={grid.tabIndexFor(gridRow, 0)}
          registerCell={grid.registerCell}
        >
          {row.getCanExpand() ? <ExpandToggle row={row} /> : null}
        </GridCell>
      ) : null}
      {row.getVisibleCells().map((cell, visIndex) => {
        const colIndex = visIndex + colOffset;
        return (
          <GridCell
            key={cell.id}
            rowIndex={gridRow}
            colIndex={colIndex}
            align={alignFor(cell.column.id)}
            tabIndex={grid.tabIndexFor(gridRow, colIndex)}
            registerCell={grid.registerCell}
          >
            <span
              data-scope={SCOPE}
              data-part="cell-content"
              style={{ paddingInlineStart: `${row.depth * 16}px` }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </GridCell>
        );
      })}
    </tr>
  );
}

// The AdvancedTable render body wires the TanStack table (sort/expand/order/
// sizing state) to the grid markup; its cyclomatic count is prop-defaulting +
// JSX branching (expand column, grid vs treegrid role, header/body maps), with
// the header cell, grid row, and grid cell already extracted to HeaderCell /
// GridRow / GridCell and the keyboard model to useGridNavigation /
// useColumnContextMenu. The inner function is named `AdvancedTableImpl` and the
// `forwardRef` result is bound to `AdvancedTableBase` — two distinct names so
// neither collides with anything. A name collision (inner fn name == its
// binding) makes the coverage instrumenter mangle the name (e.g.
// `AdvancedTable2`), which fallow's name-keyed coverage matcher can't find,
// dropping the function to an estimated 0% and inflating its CRAP.
const AdvancedTableBase = forwardRef(function AdvancedTableImpl<Row>(
  {
    columns,
    data,
    caption,
    captionHidden,
    getRowId,
    getSubRows,
    sort,
    onSortChange,
    hasResizableColumns,
    maxBlockSize = '24rem',
  }: AdvancedTableProps<Row>,
  ref: React.Ref<HTMLDivElement>,
) {
  const columnDefs = useMemo<ColumnDef<Row>[]>(
    () =>
      columns.map((col) => ({
        id: col.key,
        accessorFn: (row) =>
          col.accessor ? col.accessor(row) : (row as Record<string, unknown>)[col.key],
        header: () => col.header,
        cell: (ctx) => (col.cell ? col.cell(ctx.row.original) : stringifyCellValue(ctx.getValue())),
        enableSorting: Boolean(col.sortable),
      })),
    [columns],
  );

  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((c) => c.key));

  const sorting = toSortingState(sort);

  const table = useReactTable<Row>({
    data,
    columns: columnDefs,
    state: { sorting, expanded, columnOrder },
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    getSubRows: getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpanded,
    onColumnOrderChange: setColumnOrder,
    enableSortingRemoval: true,
    // First activation sorts ascending (numeric columns default desc-first).
    sortDescFirst: false,
    onSortingChange: (updater) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange(fromSortingState(next));
    },
  });

  const rows = table.getRowModel().rows;
  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const hasExpandable = Boolean(getSubRows);
  // Grid geometry: header cells are NOT gridcells (focus moves only through the
  // interactive controls inside them), so the navigable grid is the DATA rows
  // only — grid row index === data row index (0-based). The leading expand
  // column counts as col 0 when expandable rows are present.
  const colCount = headers.length + (hasExpandable ? 1 : 0);
  const grid = useGridNavigation({ rowCount: rows.length, colCount });

  const adjust = useColumnContextMenu({
    widths: columnWidths,
    onResize: (id, px) => setColumnWidths((prev) => ({ ...prev, [id]: px })),
    order: columnOrder,
    onReorder: setColumnOrder,
  });

  const configFor = (id: string) => columns.find((c) => c.key === id);
  const alignFor = (id: string): AdvancedTableAlign => configFor(id)?.align ?? 'left';

  // A data grid is `role="grid"` on the semantic <table> per the WAI-ARIA APG
  // grid pattern — that role is what enables the arrow-key cell navigation
  // Helios's Advanced Table specifies. When rows are hierarchically expandable
  // the correct role is `treegrid` (a grid whose rows expand/collapse): only
  // treegrid rows may carry `aria-expanded`/`aria-level` (axe aria-conditional-
  // attr). The arrow-key handler lives on this role-bearing grid element (not a
  // wrapping div) — see the targeted lint suppression on `onKeyDown` below.
  const gridRole = hasExpandable ? 'treegrid' : 'grid';
  return (
    <div ref={ref} data-scope={SCOPE} data-part="scroll" style={{ maxBlockSize }}>
      {/* eslint-disable jsx-a11y/no-noninteractive-element-interactions --
          Handling arrow keys on the <table role="grid"/"treegrid"> IS the
          WAI-ARIA APG grid pattern: the role + keydown together are the
          interactive grid. jsx-a11y won't recognise a keydown on a table whose
          interactivity comes from a dynamically-computed role. */}
      <table
        data-scope={SCOPE}
        data-part="root"
        role={gridRole}
        aria-label={typeof caption === 'string' ? caption : undefined}
        onKeyDown={grid.onKeyDown}
      >
        {/* eslint-enable jsx-a11y/no-noninteractive-element-interactions */}
        <caption
          data-scope={SCOPE}
          data-part="caption"
          data-hidden={captionHidden ? '' : undefined}
        >
          {caption}
        </caption>
        <thead data-scope={SCOPE} data-part="thead">
          <tr data-scope={SCOPE} data-part="row" role="row">
            {hasExpandable ? (
              <th data-scope={SCOPE} data-part="th" data-expand="" scope="col" role="columnheader">
                <span data-scope={SCOPE} data-part="visually-hidden">
                  Expand
                </span>
              </th>
            ) : null}
            {headers.map((headerCell) => (
              <HeaderCell<Row>
                key={headerCell.id}
                column={headerCell.column}
                config={configFor(headerCell.column.id)}
                sort={sort}
                onToggleSort={() => headerCell.column.toggleSorting()}
                hasResizableColumns={hasResizableColumns}
                adjust={adjust}
                width={columnWidths[headerCell.column.id]}
                onSeedWidth={(id, px) => setColumnWidths((prev) => ({ ...prev, [id]: px }))}
              />
            ))}
          </tr>
        </thead>
        <tbody data-scope={SCOPE} data-part="tbody">
          {rows.map((row, dataRowIndex) => (
            <GridRow<Row>
              key={row.id}
              row={row}
              gridRow={dataRowIndex} // data rows only; header is not a grid row
              hasExpandable={hasExpandable}
              grid={grid}
              alignFor={alignFor}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});
// Set the public name on the typed forwardRef result before the generic cast
// (the cast erases the `displayName` property), so React devtools shows
// `AdvancedTable`.
AdvancedTableBase.displayName = 'AdvancedTable';
// The `forwardRef` over a generic render function widens `Row` to `unknown`; the
// cast restores the generic call signature for consumers.
export const AdvancedTable = AdvancedTableBase as <Row>(
  props: AdvancedTableProps<Row> & { ref?: React.Ref<HTMLDivElement> },
) => ReactNode;
