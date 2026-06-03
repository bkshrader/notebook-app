# Helios Table / Advanced Table — implementation audit

The Helios Design System documentation is the **source of truth**; the
`Table` and `AdvancedTable` components are audited against it, not the reverse.
This note records the audit performed when the two components were built, across
the three authoritative sources:

1. the `section[data-tab]` **spec text** (Guidelines / Specifications /
   Accessibility) read from the Helios docs;
2. the **live Helios component CSS** read from the rendered page stylesheets
   (`.hds-table*` / `.hds-advanced-table*`);
3. the **rendered box-model** on the Code-tab examples.

Re-run the audit by driving the Helios docs in a browser (the spec tabs and
stylesheet rules are not reachable via `WebFetch`) and re-checking the rows
below; the live CSS is authoritative for tokens, density pixels, and the
sticky/overflow/sort styling.

Each row is either **Match** (implemented and matching the source) or
**Deviation** (with rationale). Token-only color discipline and the WCAG 2.1 AA
floor are non-negotiable, so a few deviations exist where a strict Helios value
or DOM shape would conflict with those constraints.

## Table (`/components/table/table`)

| Helios source                                                                            | Status    | Notes                                                                                                                                                |
| ---------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renders an HTML `<table>`; `display` must not change                                     | **Match** | Real `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`; CSS only styles `data-part` attributes, never `display` on the table.                       |
| Density: short / medium / tall                                                           | **Match** | Body-cell `padding-block` set to the live Helios pixels — short `6px 5px`, medium `14px 13px`, tall `22px 21px`; inline `16px`.                      |
| Striping starts on the 2nd row                                                           | **Match** | `[data-striped] tbody tr:nth-child(2n)`.                                                                                                             |
| Vertical align: top / middle / baseline                                                  | **Match** | `data-valign` on the root; **default `top`** to match the live `.hds-table__td` box-model.                                                           |
| Per-column align: left (default) / center / right                                        | **Match** | `data-align` on `th`/`td`; left = `text-align: start`, right = `end`.                                                                                |
| Sortable: one column at a time; none/asc/desc                                            | **Match** | Controlled single-column `sort`; TanStack `getSortedRowModel`; `sortDescFirst: false` so the first activation is ascending; `aria-sort` on the `th`. |
| Selection checkboxes (header + per-row)                                                  | **Match** | Reuses the `Checkbox` component; header toggles all (indeterminate when mixed), rows toggle individually; `onSelectionChange` set API.               |
| Optional fixed layout                                                                    | **Match** | `layout='fixed'` → `table-layout: fixed`.                                                                                                            |
| Header tooltip button (optional)                                                         | **Match** | `column.tooltip` node rendered in the header content (consumer supplies a `Tooltip`).                                                                |
| Focus moves only through interactive elements in headers/cells; rows/cells not focusable | **Match** | Only the sort `<button>` (and selection checkbox) are focusable; rows/cells carry no tabindex.                                                       |
| `th-content` gap 8px; sort control geometry                                              | **Match** | `th-content` gap `8px`; sort is a native `<button>` with the action focus-ring token on `:focus-visible`.                                            |
| WCAG 2.1 AA conformant                                                                   | **Match** | `a11y.test:'error'` axe gate passes on every Table story.                                                                                            |

**Deviation — selection mixed state:** Helios shows a mixed header checkbox; we
expose it via Ark's `data-state="indeterminate"` on the control part rather than
`aria-checked="mixed"` on the input (Ark drives the native `indeterminate` DOM
property). Functionally equivalent and AT-announced.

## Advanced Table (`/components/table/advanced-table`)

| Helios source                                                           | Status                              | Notes                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cell padding 14/16/13                                                   | **Match**                           | Applied as the live Helios pixels.                                                                                                                                                                                         |
| Sticky header on Y overflow                                             | **Match**                           | `thead { position: sticky; inset-block-start: 0 }` inside the scroll container; header fill `--token-color-surface-strong` (matches Helios).                                                                               |
| X/Y overflow with subtle edge shadows                                   | **Match**                           | Scroll container `overflow:auto` with a scroll-linked `background-image` shadow (cover + shadow layers); colors are semantic tokens.                                                                                       |
| Expandable / nested rows                                                | **Match**                           | TanStack `getExpandedRowModel`; native expand `<button>`; nested rows indented by depth; `aria-expanded` on expandable rows.                                                                                               |
| Two keyboard modes — Navigation + Action                                | **Match**                           | `useGridNavigation`: roving-tabindex cell focus; Enter → Action Mode (focus first in-cell control), Tab cycles in-cell controls, Escape → Navigation Mode.                                                                 |
| Navigation arrows move the focused cell                                 | **Match**                           | Arrow keys move focus by one cell in-direction (clamped at edges).                                                                                                                                                         |
| Fn + arrows → row/column start/end                                      | **Deviation (keyboard-equivalent)** | Implemented as `Home`/`End` (row start/end) and `Ctrl+Home`/`Ctrl+End` (grid start/end) — the APG-standard keyboard-accessible equivalents of the Helios Fn+arrow chord (`Fn` is not an interceptable key in the browser). |
| Resizable columns, 10px arrow-key increments, via context menu          | **Match**                           | `useColumnContextMenu` + Ark `Menu`: "Resize column" → arrow keys resize ±10px (`RESIZE_STEP_PX`); baseline seeded from the rendered column width.                                                                         |
| Reorderable columns via context menu                                    | **Match**                           | "Move column" → arrow keys shift the column one position (TanStack `columnOrder`).                                                                                                                                         |
| Context menu renders when `hasResizableColumns`                         | **Match**                           | The per-column context trigger + menu render only when `hasResizableColumns`.                                                                                                                                              |
| Interactive content lives inside cells (`role="gridcell"`), not on rows | **Match**                           | All controls are inside `role="gridcell"` cells; rows carry no interaction.                                                                                                                                                |
| Conformant WCAG 2.1 AA                                                  | **Match**                           | axe gate passes on every Advanced Table story.                                                                                                                                                                             |

**Deviation — substrate (`<table>` vs `<div>` grid):** Helios's Advanced Table
is a `<div role="grid">` laid out with CSS `display: grid` / `subgrid`. We render
a **semantic `<table role="grid">`** instead. Rationale: the project mandates real
table semantics for assistive technology, and `role="grid"` on a `<table>` is a
valid WAI-ARIA APG pattern that _adds_ the grid keyboard model while _retaining_
native table semantics as the fallback — a strictly stronger a11y position than a
`<div>` grid. Visual parity (padding, sticky header, shadows, focus ring) is
preserved via tokens.

**Deviation — `treegrid` for hierarchical rows:** when expandable rows are
present we set `role="treegrid"` (not `grid`). `aria-level`/`aria-expanded` are
valid only on treegrid rows (axe `aria-conditional-attr`); a treegrid is by
definition a grid whose rows expand/collapse, so this is the WCAG-correct role
for the hierarchical case. Flat (non-expandable) instances stay `role="grid"`.

**Deviation — Ark `Menu` for the context menu:** Helios renders its own context
menu; we compose Ark UI's `Menu` (the project's mandated unstyled primitive) for
the resize/reorder actions, styling its `data-part`s with Helios tokens. The
menu's anatomy and keyboard contract are Ark/Zag's audited APG menu behavior.
