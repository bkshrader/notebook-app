import { forwardRef, type ReactNode } from 'react';

import { Clipboard } from '../Clipboard';

import { useCodeMirror } from './useCodeMirror';
import { useCodeEditorExtensions } from './useCodeEditorExtensions';
import { useFullScreen } from './useFullScreen';
import { type CodeLanguage } from './languageExtension';

import './CodeEditor.css';

const SCOPE = 'code-editor';

export interface CodeEditorProps {
  /** Controlled document text. Pair with `onChange`. */
  value: string;
  /** Called with the new text on every edit. */
  onChange?: (value: string) => void;
  /**
   * Accessible name for the editor surface (WCAG 4.1.2). Required — Helios
   * mandates an accessible name (the `title`, when present, is shown visually but
   * `ariaLabel` is what labels the contenteditable region for assistive tech).
   */
  ariaLabel: string;
  /** Language for syntax highlighting. A known key or a raw CM `Extension`. */
  language?: CodeLanguage;
  /** Header title (visible). */
  title?: ReactNode;
  /** Header description, under the title. */
  description?: ReactNode;
  /** Show the copy secondary action. Defaults to `true`. */
  copyable?: boolean;
  /** Show the full-screen toggle secondary action. Defaults to `true`. */
  fullScreenable?: boolean;
  /** Custom primary actions rendered in the header (e.g. a Run button). */
  customActions?: ReactNode;
  /** Enable JSON linting + the Ctrl/Cmd-Shift-m lint panel. */
  lintLanguage?: 'json';
  /** Placeholder shown when the document is empty. */
  placeholder?: string;
  /** Render the editor read-only (still focusable / selectable). */
  readOnly?: boolean;
  /** Standalone editors get a border radius (Helios). Defaults to `true`. */
  isStandalone?: boolean;
}

/** Header text block: title and/or description. */
function CodeEditorHeaderText({
  title,
  description,
}: {
  title?: ReactNode;
  description?: ReactNode;
}) {
  if (!title && !description) return null;
  return (
    <div data-scope={SCOPE} data-part="header-text">
      {title ? (
        <div data-scope={SCOPE} data-part="title">
          {title}
        </div>
      ) : null}
      {description ? (
        <div data-scope={SCOPE} data-part="description">
          {description}
        </div>
      ) : null}
    </div>
  );
}

/** Secondary actions: CopyButton + full-screen toggle (Helios). */
function CodeEditorActions({
  value,
  copyable,
  fullScreenable,
  isFullScreen,
  onToggleFullScreen,
  customActions,
}: {
  value: string;
  copyable: boolean;
  fullScreenable: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  customActions?: ReactNode;
}) {
  return (
    <div data-scope={SCOPE} data-part="actions">
      {customActions ? (
        <div data-scope={SCOPE} data-part="custom-actions">
          {customActions}
        </div>
      ) : null}
      <div data-scope={SCOPE} data-part="secondary-actions">
        {copyable ? <Clipboard label="Copy code" value={value} triggerLabel="Copy" /> : null}
        {fullScreenable ? (
          <button
            type="button"
            data-scope={SCOPE}
            data-part="full-screen-toggle"
            aria-pressed={isFullScreen}
            onClick={onToggleFullScreen}
          >
            {isFullScreen ? 'Exit full screen' : 'Full screen'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The full header: text block + actions. Owns the "is there anything to show?"
 * decision and returns null when the header would be empty, so the main render
 * body carries neither the boolean nor the branch (keeping its complexity low).
 */
function CodeEditorHeader({
  value,
  title,
  description,
  copyable,
  fullScreenable,
  isFullScreen,
  onToggleFullScreen,
  customActions,
}: {
  value: string;
  title?: ReactNode;
  description?: ReactNode;
  copyable: boolean;
  fullScreenable: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  customActions?: ReactNode;
}) {
  const hasHeader = Boolean(title || description || copyable || fullScreenable || customActions);
  if (!hasHeader) return null;
  return (
    <div data-scope={SCOPE} data-part="header">
      <CodeEditorHeaderText title={title} description={description} />
      <CodeEditorActions
        value={value}
        copyable={copyable}
        fullScreenable={fullScreenable}
        isFullScreen={isFullScreen}
        onToggleFullScreen={onToggleFullScreen}
        customActions={customActions}
      />
    </div>
  );
}

/**
 * CodeEditor — an editable, syntax-highlighting code editor on CodeMirror 6, at
 * full Helios Code Editor parity: a header (title/description + secondary actions
 * + custom primary actions), CopyButton + full-screen toggle, active-line
 * highlight, bracket matching + auto-close, language highlighting, optional JSON
 * linting with the Ctrl/Cmd-Shift-m lint panel, `isStandalone`, and a mandatory
 * accessible name with non-trapping Tab (tab-focus mode from the shared base).
 *
 * The extension wiring lives in `useCodeEditorExtensions`, the mount lifecycle in
 * `useCodeMirror`, and full-screen behavior in `useFullScreen`, so this render
 * body stays flat (low cyclomatic complexity / CRAP).
 */
export const CodeEditor = forwardRef<HTMLDivElement, CodeEditorProps>(function CodeEditor(
  {
    value,
    onChange,
    ariaLabel,
    language,
    title,
    description,
    copyable = true,
    fullScreenable = true,
    customActions,
    lintLanguage,
    placeholder,
    readOnly,
    isStandalone = true,
  },
  ref,
) {
  const extensions = useCodeEditorExtensions({
    ariaLabel,
    language,
    readOnly,
    placeholder,
    lintLanguage,
    onChange,
  });

  const { hostRef, view } = useCodeMirror({ value, extensions });
  const { isFullScreen, toggle } = useFullScreen(view);

  return (
    <div
      ref={ref}
      data-scope={SCOPE}
      data-part="root"
      data-standalone={isStandalone ? '' : undefined}
      data-full-screen={isFullScreen ? '' : undefined}
      data-linting={lintLanguage ? '' : undefined}
    >
      <CodeEditorHeader
        value={value}
        title={title}
        description={description}
        copyable={copyable}
        fullScreenable={fullScreenable}
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggle}
        customActions={customActions}
      />

      <div ref={hostRef} data-scope={SCOPE} data-part="editor" />
    </div>
  );
});
