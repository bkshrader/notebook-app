import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

import { heliosSyntaxHighlighting } from './heliosHighlightStyle';

/**
 * Shared, a11y-critical extensions for both the Code Block and the Code Editor.
 *
 * These encode the three accessibility requirements the CodeMirror research doc
 * (`docs/research/codemirror.md` §4) flags as MUST-DOs, plus the Helios
 * syntax-color theme:
 *
 *  1. **Accessible name (WCAG 4.1.2).** CM6's contenteditable surface has no
 *     accessible name by default; screen readers announce "blank". We set
 *     `aria-label` on `.cm-content` via `EditorView.contentAttributes`. Helios
 *     makes this mandatory ("accessible name required") — `ariaLabel` is a
 *     required prop on both components.
 *
 *  2. **Tab does not trap (WCAG 2.1.2).** CM6's default Tab inserts a tab
 *     character, trapping keyboard users. We enable tab-focus mode so Tab /
 *     Shift-Tab fall through to the browser's normal focus order. This is done
 *     *after* the view is constructed (see `useCodeMirror`) — calling
 *     `view.setTabFocusMode(true)` from a ViewPlugin constructor crashes because
 *     the view's input state isn't initialized yet. Preferred over the
 *     Esc-toggles approach for a forms-grade component where Tab should move on.
 *
 *  3. **Reduced motion.** CM6 has no animations except the CSS caret blink; the
 *     component CSS suppresses it under `prefers-reduced-motion` /
 *     `[data-reduced-motion='reduce']` (see CodeEditor.css / CodeBlock.css). No
 *     JS is needed here, but the requirement is noted so it isn't lost.
 *
 * Returning a small factory (rather than a constant) keeps the per-component
 * extension arrays flat and low-complexity: each component spreads
 * `codeMirrorBase({ ariaLabel })` and appends only its distinctive extensions.
 */
export interface CodeMirrorBaseOptions {
  /** The editor's accessible name. Applied to `.cm-content` as `aria-label`. */
  ariaLabel: string;
}

export function codeMirrorBase({ ariaLabel }: CodeMirrorBaseOptions): Extension[] {
  return [EditorView.contentAttributes.of({ 'aria-label': ariaLabel }), heliosSyntaxHighlighting];
}
