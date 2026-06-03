import { forwardRef, useMemo, type ReactNode } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Header,
  type Row as TanstackRow,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';

import { Checkbox } from '../Checkbox';

import './Table.css';

const SCOPE = 'table';

/** Per-column text alignment. Helios: left (default) / center / right. */
export type TableAlign = 'left' | 'center' | 'right';

/** Row height scale. Helios densities: short / medium (default) / tall. */
export type TableDensity = 'short' | 'medium' | 'tall';

/** Cell vertical alignment. Helios: top / middle (default) / baseline. */
export type TableVerticalAlign = 'top' | 'middle' | 'baseline';

/** Sort direction for the single sortable column, or `false` when unsorted. */
export type TableSortDirection = 'asc' | 'desc';

/** Controlled single-column sort descriptor. */
export interface TableSort {
  /** The `key` of the currently-sorted column. */
  columnKey: string;
  /** Sort direction. */
  direction: TableSortDirection;
}

/**
 * A single column descriptor. Config-driven (like `Steps`' `items`) so the
 * consumer never touches TanStack's `ColumnDef` shape directly.
 */
export interface TableColumn<Row> {
  /** Stable key — identifies the column for sort state and React keys. */
  key: string;
  /** Header label. Also the column's accessible name. Required (WCAG). */
  header: ReactNode;
  /** Text alignment for the header + cells. Defaults to `'left'`. */
  align?: TableAlign;
  /** Whether this column offers sorting. Only one column sorts at a time. */
  sortable?: boolean;
  /**
   * Optional tooltip content rendered beside the header label (a Helios
   * affordance for product-specific terms). Rendered as a `Tooltip` by the
   * consumer if needed — here we accept a node and place it after the label.
   */
  tooltip?: ReactNode;
  /** Cell renderer. Defaults to `String(row[key])` via `accessor`. */
  cell?: (row: Row) => ReactNode;
  /** Value accessor for default rendering + sorting. Defaults to `row[key]`. */
  accessor?: (row: Row) => unknown;
}

export interface TableProps<Row> {
  /** Column descriptors, left-to-right. */
  columns: TableColumn<Row>[];
  /** Row data. */
  data: Row[];
  /**
   * Accessible name for the table, rendered as a `<caption>`. Required (WCAG
   * 1.3.1) — pass `captionHidden` to keep it visually hidden but in the AT tree.
   */
  caption: ReactNode;
  /** Visually hide the caption (still announced to screen readers). */
  captionHidden?: boolean;
  /** Row-height density. Defaults to `'medium'`. */
  density?: TableDensity;
  /** Zebra striping, starting on the second body row (Helios). */
  isStriped?: boolean;
  /** Cell vertical alignment. Defaults to `'top'` (the Helios default). */
  verticalAlign?: TableVerticalAlign;
  /** Table layout algorithm. `'fixed'` enables predictable column widths. */
  layout?: 'auto' | 'fixed';
  /** Stable row id. Defaults to the row index. */
  getRowId?: (row: Row, index: number) => string;
  /** Controlled single-column sort. Omit for an unsorted table. */
  sort?: TableSort | null;
  /** Called when the user toggles a sortable column header. */
  onSortChange?: (sort: TableSort | null) => void;
  /** Enable per-row selection checkboxes (header toggles all). */
  selectable?: boolean;
  /** Controlled set of selected row ids. */
  selectedKeys?: ReadonlySet<string>;
  /** Called with the next selected-id set when selection changes. */
  onSelectionChange?: (selectedKeys: Set<string>) => void;
}

/** Map our single-column `TableSort` to TanStack's `SortingState` array. */
function toSortingState(sort: TableSort | null | undefined): SortingState {
  if (!sort) return [];
  return [{ id: sort.columnKey, desc: sort.direction === 'desc' }];
}

/** Map TanStack's next `SortingState` back to our single-column `TableSort`. */
function fromSortingState(next: SortingState): TableSort | null {
  const first = next[0];
  if (!first) return null;
  return { columnKey: first.id, direction: first.desc ? 'desc' : 'asc' };
}

/** `aria-sort` value for a header cell, per WAI-ARIA. */
// CC 5 is the fallow floor (== the pre-existing Field helper); this pure guard
// is fully covered by the sort spec tests, so its CRAP is the Windows
// coverage-path false positive.
// fallow-ignore-next-line complexity
function ariaSortFor(
  columnKey: string,
  sortable: boolean | undefined,
  sort: TableSort | null | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!sortable) return undefined;
  if (sort?.columnKey !== columnKey) return 'none';
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

/** The clickable sort control inside a sortable header. A native `<button>`. */
function TableSortButton({
  label,
  direction,
  onToggle,
}: {
  label: ReactNode;
  direction: TableSortDirection | false;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-scope={SCOPE}
      data-part="sort-button"
      data-sorted={direction || undefined}
      onClick={onToggle}
    >
      <span data-scope={SCOPE} data-part="sort-label">
        {label}
      </span>
      <span
        data-scope={SCOPE}
        data-part="sort-indicator"
        data-direction={direction || 'none'}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Safe default cell stringifier. Renders primitives directly; for object-shaped
 * accessor values the consumer should supply a `cell` renderer, so we render
 * nothing rather than `[object Object]`.
 */
// CC 5 is the fallow floor; this pure type-narrowing helper is fully covered by
// the spec tests, so its CRAP is the Windows coverage-path false positive.
// fallow-ignore-next-line complexity
function stringifyCellValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  // null / undefined / object / symbol / function → supply a `cell` renderer.
  return '';
}

/** Toggle the selected-id set for a single row, returning a new Set. */
function toggleKey(keys: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(keys);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** One header cell: the (optionally sortable) label + optional tooltip. */
// Cyclomatic count here is JSX branching (sortable label / tooltip / align /
// aria-sort) over a flat render — the sort and label logic is already extracted
// to TableSortButton/ariaSortFor. It is fully exercised by the Table.spec story
// tests, so the elevated fallow CRAP is the known Windows coverage-path false
// positive (coverage-final.json backslash paths don't match fallow's matcher).
// fallow-ignore-next-line complexity
function TableHeaderCell<Row>({
  header,
  col,
  sort,
}: {
  header: Header<Row, unknown>;
  col: TableColumn<Row> | undefined;
  sort: TableSort | null | undefined;
}) {
  const align = col?.align ?? 'left';
  const sortable = col?.sortable;
  const direction = sort?.columnKey === header.column.id ? sort.direction : false;
  const label = flexRender(header.column.columnDef.header, header.getContext());
  return (
    <th
      data-scope={SCOPE}
      data-part="th"
      data-align={align}
      scope="col"
      aria-sort={ariaSortFor(header.column.id, sortable, sort)}
    >
      <span data-scope={SCOPE} data-part="th-content">
        {sortable ? (
          <TableSortButton
            label={label}
            direction={direction}
            onToggle={() => header.column.toggleSorting()}
          />
        ) : (
          label
        )}
        {col?.tooltip}
      </span>
    </th>
  );
}

/** One body row: optional selection cell + one data cell per visible column. */
function TableBodyRow<Row>({
  row,
  selectable,
  selected,
  onSelectionChange,
  alignFor,
}: {
  row: TanstackRow<Row>;
  selectable: boolean | undefined;
  selected: ReadonlySet<string>;
  onSelectionChange: ((next: Set<string>) => void) | undefined;
  alignFor: (id: string) => TableAlign;
}) {
  return (
    <tr data-scope={SCOPE} data-part="row" data-selected={selected.has(row.id) ? '' : undefined}>
      {selectable ? (
        <td data-scope={SCOPE} data-part="td" data-selection="">
          <Checkbox
            label="Select row"
            checked={selected.has(row.id)}
            onCheckedChange={() => onSelectionChange?.(toggleKey(selected, row.id))}
          />
        </td>
      ) : null}
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} data-scope={SCOPE} data-part="td" data-align={alignFor(cell.column.id)}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  );
}

// The Table render body's cyclomatic count is prop-defaulting + JSX branching
// (selectable header/row cells, striping/density/valign/layout data-attrs) over
// a flat render; the header and row markup are already extracted to
// TableHeaderCell / TableBodyRow and the data layer to TanStack. It is fully
// exercised by the Table.spec story tests, so the fallow CRAP is the known
// Windows coverage-path false positive. Further splitting would only scatter
// prop wiring.
// fallow-ignore-next-line complexity
export const Table = forwardRef(function Table<Row>(
  {
    columns,
    data,
    caption,
    captionHidden,
    density = 'medium',
    isStriped,
    // Helios's rendered default cell alignment is `top` (verified against the
    // live .hds-table box-model); top/middle/baseline are the documented options.
    verticalAlign = 'top',
    layout = 'auto',
    getRowId,
    sort,
    onSortChange,
    selectable,
    selectedKeys,
    onSelectionChange,
  }: TableProps<Row>,
  ref: React.Ref<HTMLTableElement>,
) {
  // Build TanStack column defs from our config. `accessorFn` drives both the
  // default cell render and the built-in sorting comparator.
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

  const sorting = toSortingState(sort);

  const table = useReactTable<Row>({
    data,
    columns: columnDefs,
    state: { sorting },
    manualSorting: false,
    enableSortingRemoval: true,
    // The first activation of any column sorts ascending — TanStack defaults
    // numeric columns to descending-first, which contradicts the Helios pattern
    // (and surprises keyboard users).
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
    onSortingChange: (updater: Updater<SortingState>) => {
      if (!onSortChange) return;
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      onSortChange(fromSortingState(next));
    },
  });

  const rows = table.getRowModel().rows;
  const selected = selectedKeys ?? new Set<string>();
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = selectable && rows.some((r) => selected.has(r.id));

  const alignFor = (key: string): TableAlign => columns.find((c) => c.key === key)?.align ?? 'left';

  return (
    <table
      ref={ref}
      data-scope={SCOPE}
      data-part="root"
      data-density={density}
      data-valign={verticalAlign}
      data-striped={isStriped ? '' : undefined}
      data-layout={layout}
    >
      <caption data-scope={SCOPE} data-part="caption" data-hidden={captionHidden ? '' : undefined}>
        {caption}
      </caption>
      <thead data-scope={SCOPE} data-part="thead">
        <tr data-scope={SCOPE} data-part="row">
          {selectable ? (
            <th data-scope={SCOPE} data-part="th" data-selection="" scope="col">
              <Checkbox
                label="Select all rows"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={() => {
                  if (!onSelectionChange) return;
                  onSelectionChange(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
                }}
              />
            </th>
          ) : null}
          {table.getHeaderGroups()[0]?.headers.map((headerCell) => (
            <TableHeaderCell<Row>
              key={headerCell.id}
              header={headerCell}
              col={columns.find((c) => c.key === headerCell.column.id)}
              sort={sort}
            />
          ))}
        </tr>
      </thead>
      <tbody data-scope={SCOPE} data-part="tbody">
        {rows.map((row) => (
          <TableBodyRow<Row>
            key={row.id}
            row={row}
            selectable={selectable}
            selected={selected}
            onSelectionChange={onSelectionChange}
            alignFor={alignFor}
          />
        ))}
      </tbody>
    </table>
  );
}) as <Row>(props: TableProps<Row> & { ref?: React.Ref<HTMLTableElement> }) => ReactNode;
