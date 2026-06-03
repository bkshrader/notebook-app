import { useCallback, useEffect, useRef, useState } from 'react';

import type { EditorView } from '@codemirror/view';

/**
 * Full-screen state for the Code Editor (Helios "full-screen" secondary action).
 *
 * When active, the component CSS pins the host with `position: fixed; inset: 0;
 * z-index: 1000` (the Helios full-screen box). This hook owns the boolean and the
 * keyboard/focus affordances around it:
 *  - `Escape` exits full screen (a standard, predictable dismissal — ADHD-first
 *    UX favors a consistent escape hatch).
 *  - On exit, focus returns to the editor surface so keyboard users are not
 *    dropped at the top of the document (WCAG 2.4.3 Focus Order).
 *
 * Returning a tiny API keeps the editor's render body flat; the effect lives here
 * rather than inline so the component function stays low-complexity.
 */
export interface UseFullScreen {
  isFullScreen: boolean;
  toggle: () => void;
  exit: () => void;
}

export function useFullScreen(view: EditorView | null): UseFullScreen {
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Track the most recent view so the Escape handler can refocus it on exit
  // without re-binding the listener every time the view identity changes.
  const viewRef = useRef<EditorView | null>(view);
  viewRef.current = view;

  const exit = useCallback(() => {
    setIsFullScreen((current) => {
      if (current) viewRef.current?.focus();
      return false;
    });
  }, []);

  const toggle = useCallback(() => {
    setIsFullScreen((current) => !current);
  }, []);

  // Escape exits full screen. Bound only while active so it never swallows Escape
  // for the rest of the app.
  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        exit();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isFullScreen, exit]);

  return { isFullScreen, toggle, exit };
}
