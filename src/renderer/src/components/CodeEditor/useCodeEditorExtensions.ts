import { useMemo } from 'react';

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { json } from '@codemirror/lang-json';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { lintGutter, lintKeymap, linter } from '@codemirror/lint';
import { jsonParseLinter } from '@codemirror/lang-json';
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from '@codemirror/view';

import { codeMirrorBase } from './codeMirrorBase';
import { resolveLanguage, type CodeLanguage } from './languageExtension';

/**
 * Build the editable CodeMirror extension set for the Code Editor, matching the
 * Helios Code Editor feature list:
 *  - line numbers + active-line highlight (line + gutter)
 *  - bracket matching + auto-close brackets
 *  - history (undo/redo), search, and the default editing keymap
 *  - language syntax highlighting (+ the shared Helios highlight theme via base)
 *  - JSON linting when `lintLanguage === 'json'`: the JSON language, a linter
 *    driven by `jsonParseLinter`, a lint gutter, and `lintKeymap` — which already
 *    binds Ctrl/Cmd-Shift-m to open the lint panel (the Helios alert-dialog
 *    shortcut), so no custom binding is needed.
 *  - an update listener that forwards document changes to `onChange`.
 *
 * Kept as a hook returning a memoized array so the editor's render body stays
 * flat and low-complexity (the extension wiring is the natural seam fallow's CRAP
 * score rewards extracting). `useCodeMirror` reconfigures the live view whenever
 * this array's identity changes.
 */
export interface UseCodeEditorExtensionsOptions {
  ariaLabel: string;
  language?: CodeLanguage;
  readOnly?: boolean;
  placeholder?: string;
  /** Enable JSON linting + the lint panel shortcut. */
  lintLanguage?: 'json';
  /** Called with the new document text on every edit. */
  onChange?: (value: string) => void;
}

export function useCodeEditorExtensions({
  ariaLabel,
  language,
  readOnly,
  placeholder,
  lintLanguage,
  onChange,
}: UseCodeEditorExtensionsOptions): Extension {
  return useMemo<Extension>(() => {
    const lintExtensions: Extension =
      lintLanguage === 'json' ? [json(), linter(jsonParseLinter()), lintGutter()] : [];

    const changeListener = onChange
      ? EditorView.updateListener.of((update) => {
          if (update.docChanged) onChange(update.state.doc.toString());
        })
      : [];

    return [
      ...codeMirrorBase({ ariaLabel }),
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      history(),
      search(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        ...lintKeymap,
      ]),
      // The language extension. When linting JSON we add the JSON language via
      // lintExtensions, so skip a duplicate here for the json key.
      lintLanguage === 'json' ? [] : resolveLanguage(language),
      lintExtensions,
      placeholder ? cmPlaceholder(placeholder) : [],
      readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : [],
      changeListener,
    ];
  }, [ariaLabel, language, readOnly, placeholder, lintLanguage, onChange]);
}
