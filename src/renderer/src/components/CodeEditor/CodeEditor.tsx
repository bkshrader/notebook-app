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

function HeaderTitle({ title }: { title?: ReactNode }) {
  if (!title) return null;
  return (
    <div data-scope={SCOPE} data-part="title">
      {title}
    </div>
  );
}

function HeaderDescription({ description }: { description?: ReactNode }) {
  if (!description) return null;
  return (
    <div data-scope={SCOPE} data-part="description">
      {description}
    </div>
  );
}

/** Header text block: title and/or description. Null when both are absent. */
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
      <HeaderTitle title={title} />
      <HeaderDescription description={description} />
    </div>
  );
}

function fullScreenLabel(isFullScreen: boolean) {
  return isFullScreen ? 'Exit full screen' : 'Full screen';
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
        {copyable && <Clipboard label="Copy code" value={value} triggerLabel="Copy" />}
        {fullScreenable && (
          <button
            type="button"
            data-scope={SCOPE}
            data-part="full-screen-toggle"
            aria-pressed={isFullScreen}
            onClick={onToggleFullScreen}
          >
            {fullScreenLabel(isFullScreen)}
          </button>
        )}
      </div>
    </div>
  );
}

interface CodeEditorHeaderProps {
  value: string;
  title?: ReactNode;
  description?: ReactNode;
  copyable: boolean;
  fullScreenable: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
  customActions?: ReactNode;
}

function hasHeaderContent(p: CodeEditorHeaderProps) {
  return [p.title, p.description, p.copyable, p.fullScreenable, p.customActions].some(Boolean);
}

/**
 * The full header: text block + actions. Owns the "is there anything to show?"
 * decision and returns null when nothing would render — i.e. no title,
 * description, or custom actions AND both `copyable` and `fullScreenable` are
 * off — so a fully-suppressed header adds no empty landmark to the a11y tree.
 * (With the default `copyable`/`fullScreenable` of `true` the header always
 * renders; null only happens when a consumer turns both off.) Keeps the main
 * render body branch-free.
 */
function CodeEditorHeader(props: CodeEditorHeaderProps) {
  if (!hasHeaderContent(props)) return null;
  const {
    value,
    title,
    description,
    copyable,
    fullScreenable,
    isFullScreen,
    onToggleFullScreen,
    customActions,
  } = props;
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

/** Root data-attribute set, derived from controlled state. */
function rootAttrs(isStandalone: boolean, isFullScreen: boolean, lintLanguage: string | undefined) {
  return {
    'data-standalone': isStandalone ? '' : undefined,
    'data-full-screen': isFullScreen ? '' : undefined,
    'data-linting': lintLanguage ? '' : undefined,
  };
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
 *
 * The inner function is named `CodeEditorImpl` (not `CodeEditor`) so it doesn't
 * collide with the `const CodeEditor` binding — that collision makes the coverage
 * instrumenter mangle the name to `CodeEditor2`, which fallow's name-keyed
 * coverage matcher can't find, dropping the function to an estimated 0% and
 * inflating its CRAP. Matches the sibling components (Button/CodeBlock/etc.).
 */
export const CodeEditor = forwardRef<HTMLDivElement, CodeEditorProps>(
  function CodeEditorImpl(props, ref) {
    const {
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
    } = props;

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
        {...rootAttrs(isStandalone, isFullScreen, lintLanguage)}
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
  },
);
// The inner function is `CodeEditorImpl` (see above); restore the public name for
// React devtools and error overlays.
CodeEditor.displayName = 'CodeEditor';
