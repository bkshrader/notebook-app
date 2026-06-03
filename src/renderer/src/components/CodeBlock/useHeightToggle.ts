import { useLayoutEffect, useRef, useState } from 'react';

import type { EditorView } from '@codemirror/view';

/**
 * Drives the Code Block "Show more / Show less code" height toggle.
 *
 * When `maxHeight` is set, the scroll container is clamped and this hook measures
 * whether the content actually overflows that cap — so the toggle is shown only
 * when there is hidden content (the Helios behavior). CodeMirror mounts its
 * content asynchronously (after layout effects), so the measurement re-runs when
 * the `view` appears and watches for later size changes via a `ResizeObserver`.
 *
 * Extracting this keeps the component's render body low-complexity: the two
 * pieces of state, the measurement effect, and the derived `capped` flag all live
 * here instead of inflating the component's cyclomatic count.
 */
export interface UseHeightToggle {
  /** Attach to the scrollable container. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the container is currently height-capped (scrollable). */
  capped: boolean;
  /** Whether the toggle button should be rendered (overflowing or expanded). */
  showToggle: boolean;
  /** Whether the content is currently expanded. */
  expanded: boolean;
  /** Toggle expanded/collapsed. */
  toggle: () => void;
}

export function useHeightToggle(
  maxHeight: string | undefined,
  value: string,
  view: EditorView | null,
): UseHeightToggle {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !maxHeight) {
      setOverflows(false);
      return;
    }
    const measure = () => {
      // The cap is applied via the data-capped attribute's max-block-size, so
      // compare the full scrollHeight against that cap (clientHeight would
      // already reflect the clamp). Fall back to clientHeight if the cap parses
      // to a non-pixel value.
      const capPx = parseFloat(getComputedStyle(el).maxBlockSize);
      const limit = Number.isFinite(capPx) ? capPx : el.clientHeight;
      setOverflows(el.scrollHeight > limit + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxHeight, value, expanded, view]);

  return {
    scrollRef,
    capped: Boolean(maxHeight) && !expanded,
    showToggle: Boolean(maxHeight) && (overflows || expanded),
    expanded,
    toggle: () => setExpanded((prev) => !prev),
  };
}
