import { useEffect, useRef, useState } from 'react';

import { EditorState, StateEffect, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Mount a CodeMirror 6 `EditorView` into a React-owned host element and keep it
 * alive across the component's lifetime. Shared by both `CodeBlock` (read-only)
 * and `CodeEditor` (editable) — the only difference between them is the
 * `extensions` array each passes in.
 *
 * Lifecycle contract:
 *  - On mount: build an `EditorState` from `{ doc, extensions }` and attach an
 *    `EditorView` to the host `ref`. The view is created exactly once.
 *  - When `extensions` change: reconfigure the live view in place
 *    (`view.dispatch({ effects: StateEffect.reconfigure })` via
 *    `setState`-free reconfiguration) rather than tearing it down, so focus,
 *    selection, and scroll position survive prop changes.
 *  - When `doc` changes from OUTSIDE (controlled value differs from the view's
 *    current text): dispatch a replace transaction. Edits the user makes inside
 *    the editor do not loop back through here — the owner reads them via an
 *    update listener supplied in `extensions`.
 *  - On unmount: `view.destroy()`.
 *
 * The hook deliberately exposes the `view` so components can run imperative
 * actions against it (open the lint panel, toggle full screen, read the doc for
 * copy). Keeping the mount logic here — and out of each component's render body —
 * is also what keeps those render bodies low-complexity (one fallow concern).
 */
export interface UseCodeMirrorOptions {
  /** Initial / controlled document text. */
  value: string;
  /** The composed extension array. Rebuild it with `useMemo` in the caller. */
  extensions: Extension;
}

export interface UseCodeMirror {
  /** Attach this to the host element that should contain the editor. */
  hostRef: React.RefObject<HTMLDivElement | null>;
  /** The live view, or `null` before mount / after unmount. */
  view: EditorView | null;
}

export function useCodeMirror({ value, extensions }: UseCodeMirrorOptions): UseCodeMirror {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [view, setView] = useState<EditorView | null>(null);

  // Create the view once, on mount. `value` is read only for the initial doc;
  // subsequent external value changes are handled by the sync effect below so we
  // never recreate the view (which would drop focus and selection).
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const startState = EditorState.create({ doc: value, extensions });
    const editorView = new EditorView({ state: startState, parent: host });
    // Enable tab-focus mode AFTER construction (WCAG 2.1.2 — Tab / Shift-Tab fall
    // through to the browser's focus order instead of inserting a tab and
    // trapping keyboard users). This must run post-construction: calling it from
    // a ViewPlugin constructor crashes because the view's input state isn't set
    // up yet.
    editorView.setTabFocusMode(true);
    viewRef.current = editorView;
    setView(editorView);

    return () => {
      editorView.destroy();
      viewRef.current = null;
      setView(null);
    };
    // Intentionally mount-once: `value`/`extensions` updates are reconciled by
    // the two effects below, not by re-running this one (re-running would drop
    // focus, selection, and scroll position).
  }, []);

  // Reconfigure extensions in place when they change.
  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;
    // `StateEffect.reconfigure` swaps the entire top-level extension set on a
    // live view — the documented way to apply new extensions without recreating
    // the editor (which would drop focus, selection, and scroll position).
    editorView.dispatch({ effects: StateEffect.reconfigure.of(extensions) });
  }, [extensions]);

  // Sync external value changes into the view without clobbering in-editor edits.
  //
  // The user's own keystrokes flow OUT via the update listener and come back as
  // the same `value` (the controlled-component echo). Replacing the document on
  // that echo races against rapid typing and drops characters, so we skip the
  // sync entirely while the editor has focus: a focused editor is being driven by
  // the user, and the only `value` changes arriving then are echoes of their own
  // edits. When the editor is NOT focused, a differing `value` is a genuine
  // external/programmatic change, which we apply — clamping the prior caret into
  // the new doc rather than letting it jump to the end.
  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;
    const current = editorView.state.doc.toString();
    if (current === value) return;
    if (editorView.hasFocus) return;
    const prevAnchor = editorView.state.selection.main.anchor;
    const anchor = Math.min(prevAnchor, value.length);
    editorView.dispatch({
      changes: { from: 0, to: current.length, insert: value },
      selection: { anchor },
    });
  }, [value]);

  return { hostRef, view };
}
