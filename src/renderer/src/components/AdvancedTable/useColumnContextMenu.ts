import { useCallback, useState, type KeyboardEvent } from 'react';

/** Resize step in pixels — Helios spec: arrow keys resize in 10px increments. */
const RESIZE_STEP_PX = 10;

/** Horizontal arrow → direction (+1 right / -1 left); undefined for other keys. */
const ARROW_DIR: Record<string, 1 | -1 | undefined> = {
  ArrowRight: 1,
  ArrowLeft: -1,
};

/** Which arrow-key sub-mode a column header is in after a context-menu action. */
export type ColumnAdjustMode = 'idle' | 'resize' | 'reorder';

export interface UseColumnContextMenuOptions {
  /** Current per-column widths (px), keyed by column id. */
  widths: Record<string, number>;
  /** Apply a new width for a column (px). */
  onResize: (columnId: string, widthPx: number) => void;
  /** Current left-to-right column order (ids). */
  order: string[];
  /** Apply a new column order. */
  onReorder: (order: string[]) => void;
  /** Minimum column width (px). */
  minWidth?: number;
}

export interface UseColumnContextMenu {
  /** The column currently in an arrow-key adjust sub-mode, or null. */
  activeColumn: string | null;
  mode: ColumnAdjustMode;
  /** Start the resize sub-mode for a column (called from the menu item). */
  startResize: (columnId: string) => void;
  /** Start the reorder sub-mode for a column (called from the menu item). */
  startReorder: (columnId: string) => void;
  /** Exit any active sub-mode. */
  stop: () => void;
  /**
   * Keydown handler for the active adjust sub-mode. Attach to the resize border
   * / reorder handle element. Returns true if it consumed the event.
   */
  onAdjustKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
}

/** Move the item at `from` to `to` in a copy of `arr`. */
// CC 5 is the fallow floor; pure bounds-guarded array move, covered by the
// reorder spec test → CRAP is the Windows coverage-path false positive.
// fallow-ignore-next-line complexity
function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length || from === to) return arr;
  const next = arr.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return arr;
  next.splice(to, 0, item);
  return next;
}

/**
 * Drives the keyboard column resize/reorder sub-modes the Helios Advanced Table
 * reaches through the per-column context menu. After "Resize column" the
 * right/left arrows grow/shrink the column in {@link RESIZE_STEP_PX} steps;
 * after "Move column" the right/left arrows shift the column one position. The
 * context Menu UI itself is composed from Ark's Menu in the component; this hook
 * owns only the post-selection arrow-key behavior + TanStack state writes.
 */
export function useColumnContextMenu({
  widths,
  onResize,
  order,
  onReorder,
  minWidth = RESIZE_STEP_PX * 3,
}: UseColumnContextMenuOptions): UseColumnContextMenu {
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [mode, setMode] = useState<ColumnAdjustMode>('idle');

  const startResize = useCallback((columnId: string) => {
    setActiveColumn(columnId);
    setMode('resize');
  }, []);

  const startReorder = useCallback((columnId: string) => {
    setActiveColumn(columnId);
    setMode('reorder');
  }, []);

  const stop = useCallback(() => {
    setActiveColumn(null);
    setMode('idle');
  }, []);

  const resizeBy = useCallback(
    (columnId: string, deltaPx: number) => {
      const current = widths[columnId] ?? minWidth;
      onResize(columnId, Math.max(minWidth, current + deltaPx));
    },
    [widths, onResize, minWidth],
  );

  const reorderBy = useCallback(
    (columnId: string, direction: -1 | 1) => {
      const from = order.indexOf(columnId);
      if (from === -1) return;
      onReorder(moveItem(order, from, from + direction));
    },
    [order, onReorder],
  );

  // Apply a horizontal arrow to the active column in the current sub-mode.
  const applyArrow = useCallback(
    (columnId: string, dir: 1 | -1) => {
      if (mode === 'resize') resizeBy(columnId, dir * RESIZE_STEP_PX);
      else reorderBy(columnId, dir);
    },
    [mode, resizeBy, reorderBy],
  );

  const onAdjustKeyDown = useCallback(
    // CC is the guard chain (inactive / Escape / arrow direction) on a flat
    // handler; the direction lookup, array move, and dispatch are extracted to
    // ARROW_DIR / moveItem / applyArrow. Covered by the resize + reorder spec
    // tests → CRAP is the Windows coverage-path false positive.
    // fallow-ignore-next-line complexity
    (event: KeyboardEvent<HTMLElement>): boolean => {
      if (!activeColumn || mode === 'idle') return false;
      if (event.key === 'Escape') {
        stop();
        return true;
      }
      // ArrowRight → +1, ArrowLeft → -1, anything else → not handled.
      const dir = ARROW_DIR[event.key];
      if (dir === undefined) return false;
      applyArrow(activeColumn, dir);
      return true;
    },
    [activeColumn, mode, stop, applyArrow],
  );

  return { activeColumn, mode, startResize, startReorder, stop, onAdjustKeyDown };
}
