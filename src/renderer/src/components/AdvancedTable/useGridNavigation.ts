import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

/**
 * The two APG grid interaction modes (Helios Advanced Table Accessibility tab):
 *  - `navigation`: arrow keys move the focused CELL (roving tabindex).
 *  - `action`: focus is inside a cell's interactive elements; Tab cycles them,
 *    Escape returns to navigation.
 */
export type GridMode = 'navigation' | 'action';

/** A focused-cell coordinate. `row`/`col` are zero-based grid indices. */
export interface CellPosition {
  row: number;
  col: number;
}

export interface UseGridNavigationOptions {
  /** Total number of focusable grid rows (header row is row 0). */
  rowCount: number;
  /** Total number of columns. */
  colCount: number;
}

export interface UseGridNavigation {
  mode: GridMode;
  focused: CellPosition;
  /** `0` for the single roving-focusable cell, `-1` for every other. */
  tabIndexFor: (row: number, col: number) => 0 | -1;
  /** Register a cell's DOM node so the hook can move focus to it. */
  registerCell: (row: number, col: number, node: HTMLElement | null) => void;
  /** Grid-level keydown handler (attach to the `role="grid"` element). */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  /** Move focus to a cell programmatically (used by tests / pointer focus). */
  focusCell: (row: number, col: number) => void;
  /** Enter action mode for the currently-focused cell. */
  enterActionMode: () => void;
}

/** Clamp `n` into `[0, max]`. */
function clamp(n: number, max: number): number {
  if (n < 0) return 0;
  if (n > max) return max;
  return n;
}

/** Build a stable string key for the cell-node registry. */
function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

/** The first focusable element inside a cell (for Action Mode entry). */
function firstInteractive(cell: HTMLElement): HTMLElement | null {
  return cell.querySelector<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );
}

/**
 * Implements the Advanced Table's APG grid keyboard model: roving-tabindex cell
 * navigation (arrows + Home/End/Ctrl+Home/Ctrl+End as the keyboard-accessible
 * equivalents of the Helios Fn+arrow bindings) and Navigation↔Action mode
 * switching (Enter enters, Escape exits). It owns no rendering — the component
 * wires `tabIndexFor`/`registerCell`/`onKeyDown` onto its `role="gridcell"`
 * nodes.
 */
export function useGridNavigation({
  rowCount,
  colCount,
}: UseGridNavigationOptions): UseGridNavigation {
  const [mode, setMode] = useState<GridMode>('navigation');
  const [focused, setFocused] = useState<CellPosition>({ row: 0, col: 0 });
  const cellNodes = useRef(new Map<string, HTMLElement>());

  const maxRow = Math.max(0, rowCount - 1);
  const maxCol = Math.max(0, colCount - 1);

  const registerCell = useCallback((row: number, col: number, node: HTMLElement | null) => {
    const key = cellKey(row, col);
    if (node) cellNodes.current.set(key, node);
    else cellNodes.current.delete(key);
  }, []);

  const focusCell = useCallback((row: number, col: number) => {
    setFocused({ row, col });
    const node = cellNodes.current.get(cellKey(row, col));
    node?.focus();
  }, []);

  const tabIndexFor = useCallback(
    (row: number, col: number): 0 | -1 => (row === focused.row && col === focused.col ? 0 : -1),
    [focused],
  );

  const enterActionMode = useCallback(() => {
    const cell = cellNodes.current.get(cellKey(focused.row, focused.col));
    const target = cell ? firstInteractive(cell) : null;
    if (target) {
      setMode('action');
      target.focus();
    }
  }, [focused]);

  // Resolve the navigation target cell for a key, or null if the key is not a
  // movement key. A single lookup table keyed by `${key}|${ctrl}` keeps the
  // cyclomatic complexity flat (no per-key branching): arrow keys step one cell;
  // Home/End jump to the row edge; Ctrl+Home/Ctrl+End to the grid corners.
  const nextCell = useCallback(
    (event: KeyboardEvent<HTMLElement>): CellPosition | null => {
      const { row, col } = focused;
      const moves: Record<string, CellPosition> = {
        'ArrowRight|false': { row, col: clamp(col + 1, maxCol) },
        'ArrowLeft|false': { row, col: clamp(col - 1, maxCol) },
        'ArrowDown|false': { row: clamp(row + 1, maxRow), col },
        'ArrowUp|false': { row: clamp(row - 1, maxRow), col },
        'Home|false': { row, col: 0 },
        'Home|true': { row: 0, col: 0 },
        'End|false': { row, col: maxCol },
        'End|true': { row: maxRow, col: maxCol },
      };
      return moves[`${event.key}|${event.ctrlKey}`] ?? null;
    },
    [focused, maxRow, maxCol],
  );

  // Navigation-mode key handling: returns true if it consumed the event.
  const handleNavigation = useCallback(
    (event: KeyboardEvent<HTMLElement>): boolean => {
      const target = nextCell(event);
      if (target) {
        focusCell(target.row, target.col);
        return true;
      }
      if (event.key === 'Enter') {
        enterActionMode();
        return true;
      }
      return false;
    },
    [nextCell, focusCell, enterActionMode],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (mode === 'action') {
        if (event.key === 'Escape') {
          setMode('navigation');
          focusCell(focused.row, focused.col);
          event.preventDefault();
        }
        // In action mode, Tab cycles in-cell controls natively; we don't trap.
        return;
      }
      if (handleNavigation(event)) event.preventDefault();
    },
    [mode, handleNavigation, focusCell, focused],
  );

  return {
    mode,
    focused,
    tabIndexFor,
    registerCell,
    onKeyDown,
    focusCell,
    enterActionMode,
  };
}
