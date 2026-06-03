import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, type Extension } from '@codemirror/state';

/**
 * Code Block line highlighting (Helios "line highlighting": single line, multiple
 * lines, or a range).
 *
 * The consumer passes 1-based line numbers — either a flat list (`[2, 5, 6]`) or
 * inclusive ranges (`[[3, 7]]`), or a mix. We normalize to a set of line numbers
 * and decorate each corresponding line with a `Decoration.line` carrying
 * `data-line-highlight`, which the CSS tints. Decorations are built once (the doc
 * is read-only, so positions never move) and provided via a static facet.
 */
export type HighlightLines = ReadonlyArray<number | readonly [number, number]>;

/** Expand ranges and dedupe into a sorted set of 1-based line numbers. */
export function normalizeHighlightLines(input: HighlightLines | undefined): number[] {
  if (!input || input.length === 0) return [];
  const lines = new Set<number>();
  for (const entry of input) {
    if (typeof entry === 'number') {
      if (entry >= 1) lines.add(entry);
    } else {
      const [start, end] = entry;
      const lo = Math.max(1, Math.min(start, end));
      const hi = Math.max(start, end);
      for (let n = lo; n <= hi; n += 1) lines.add(n);
    }
  }
  return [...lines].sort((a, b) => a - b);
}

const lineHighlightDecoration = Decoration.line({ attributes: { 'data-line-highlight': '' } });

/**
 * The line-highlight extension. Computes a `Decoration.line` set from the 1-based
 * `lineNumbers`, recomputing only when the document changes (a read-only block's
 * doc only changes when its controlled `value` is replaced). Out-of-range line
 * numbers are clamped out rather than throwing.
 */
export function lineHighlighting(lineNumbers: number[]): Extension {
  if (lineNumbers.length === 0) return [];
  return EditorView.decorations.compute(['doc'], (state): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const total = state.doc.lines;
    for (const n of lineNumbers) {
      if (n < 1 || n > total) continue;
      const line = state.doc.line(n);
      builder.add(line.from, line.from, lineHighlightDecoration);
    }
    return builder.finish();
  });
}
