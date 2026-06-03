import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { openLintPanel } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';

import { CodeEditor } from './CodeEditor';
import { expectCopyControlCarries, waitForCmContent } from './codeMirrorTestUtils';

/**
 * Interaction / accessibility tests for CodeEditor.
 *
 * Separate from the visual stories per the `*.spec.stories.tsx` convention. Each
 * `play` asserts, is behavior-named, and uses `step()`. CodeMirror mounts in a
 * `useEffect`, so each test first waits for `.cm-content` before asserting. The
 * editor is controlled, so the stories wrap it with local state to round-trip
 * edits.
 */
const jsSample = `function add(a, b) {
  return a + b;
}`;

const meta: Meta<typeof CodeEditor> = {
  title: 'Components/Editor/CodeEditor/Tests',
  component: CodeEditor,
  args: {
    value: jsSample,
    ariaLabel: 'JavaScript editor',
    language: 'javascript',
  },
  tags: ['test'],
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <CodeEditor {...args} value={value} onChange={setValue} />;
  },
};

export default meta;
type Story = StoryObj<typeof CodeEditor>;

const getContent = waitForCmContent;

/** The editor exposes its required accessible name (WCAG 4.1.2). */
export const AccessibleNamePresent: Story = {
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the contenteditable surface carries the aria-label', async () => {
      await expect(content).toHaveAttribute('aria-label', 'JavaScript editor');
      await expect(content).toHaveAttribute('contenteditable', 'true');
    });
  },
};

/** Typing edits the document (and fires onChange via the controlled wrapper). */
export const TypingUpdatesValue: Story = {
  args: { value: '', ariaLabel: 'Empty editor', language: 'plaintext' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('typing inserts text into the document', async () => {
      content.focus();
      await userEvent.type(content, 'hello');
      await waitFor(async () => {
        await expect(content.textContent).toContain('hello');
      });
    });
  },
};

/** Tab does not trap: focus leaves the editor surface (WCAG 2.1.2). */
export const TabDoesNotTrap: Story = {
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('Tab from the focused editor moves focus out of .cm-content', async () => {
      content.focus();
      await expect(content).toHaveFocus();
      await userEvent.tab();
      await expect(content).not.toHaveFocus();
    });
  },
};

/** The caret line gets the active-line highlight. */
export const ActiveLineHighlighted: Story = {
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('an active line is present once the editor has focus', async () => {
      content.focus();
      await userEvent.click(content);
      const active = await waitFor(() => {
        const el = canvasElement.querySelector<HTMLElement>('.cm-activeLine');
        if (!el) throw new Error('no active line yet');
        return el;
      });
      await expect(active).not.toBeNull();
    });
  },
};

/** Auto-close inserts the matching closing bracket. */
export const AutoCloseBrackets: Story = {
  args: { value: '', ariaLabel: 'Bracket editor', language: 'javascript' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('typing "(" inserts a closing ")"', async () => {
      content.focus();
      await userEvent.click(content);
      await userEvent.type(content, '(');
      await waitFor(async () => {
        await expect(content.textContent).toContain('()');
      });
    });
  },
};

/** Invalid JSON raises a lint marker, and Ctrl/Cmd-Shift-m opens the lint panel. */
export const JsonLintingAndPanel: Story = {
  args: {
    value: '{ "a": 1 ',
    language: 'json',
    lintLanguage: 'json',
    ariaLabel: 'JSON editor',
  },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);

    await step('a lint marker appears for invalid JSON', async () => {
      // CodeMirror's linter runs on a debounce after a document change, so make
      // an edit (which keeps the JSON invalid) to trigger a lint pass.
      content.focus();
      await userEvent.click(content);
      await userEvent.keyboard('{End} ');
      await waitFor(
        () => {
          const marker = canvasElement.querySelector(
            '.cm-lint-marker, .cm-lint-marker-error, .cm-lintRange, .cm-lintRange-error',
          );
          if (!marker) throw new Error('no lint marker yet');
          return marker;
        },
        { timeout: 6000 },
      );
    });

    await step('opening the lint panel renders the diagnostics dialog', async () => {
      // The Ctrl/Cmd-Shift-m shortcut is wired via CodeMirror's `lintKeymap`
      // (which binds that chord to `openLintPanel`) — see useCodeEditorExtensions.
      // Synthetic keyboard chords don't reliably reach CM's keymap under the
      // browser test runner, so we invoke the SAME command CM's binding runs,
      // against the real view, and assert the panel renders. This verifies the
      // panel-open behavior deterministically without depending on the runner's
      // modifier-key translation.
      const view = EditorView.findFromDOM(content);
      await expect(view).not.toBeNull();
      openLintPanel(view!);
      await waitFor(async () => {
        const panel = canvasElement.querySelector('.cm-panel.cm-panel-lint, .cm-panel-lint');
        await expect(panel).not.toBeNull();
      });
    });
  },
};

/** The full-screen toggle sets the data-full-screen flag and Escape exits it. */
export const FullScreenToggleAndEscape: Story = {
  args: { title: 'editor.js' },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    const canvas = within(canvasElement);
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-scope='code-editor'][data-part='root']",
    )!;

    await step('activating full screen sets the data-full-screen flag', async () => {
      const toggle = canvas.getByRole('button', { name: /full screen/i });
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(toggle);
      await expect(root).toHaveAttribute('data-full-screen');
      await expect(canvas.getByRole('button', { name: /exit full screen/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    await step('Escape exits full screen', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(root).not.toHaveAttribute('data-full-screen');
      });
    });
  },
};

/**
 * The copy secondary action is present and carries the editor content as its
 * value. (The headless test browser denies `clipboard.writeText`, so we assert
 * the value wiring rather than the OS clipboard — see CodeBlock's copy test.)
 */
export const CopyButtonCarriesValue: Story = {
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    await step('the copy control carries the editor value', async () => {
      await expectCopyControlCarries(canvasElement, 'function add');
    });
  },
};

/** jsx language resolves without error (editor mounts and renders the surface). */
export const JsxLanguage: Story = {
  args: { value: 'const El = () => <div />;', language: 'jsx', ariaLabel: 'JSX editor' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor surface is present with content', async () => {
      await expect(content).not.toBeNull();
      await expect(content.textContent).toContain('El');
    });
  },
};

/** typescript language resolves without error. */
export const TypeScriptLanguage: Story = {
  args: { value: 'const x: number = 1;', language: 'typescript', ariaLabel: 'TS editor' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor surface is present', async () => {
      await expect(content.textContent).toContain('number');
    });
  },
};

/** tsx language resolves without error. */
export const TsxLanguage: Story = {
  args: {
    value: 'const El = (): JSX.Element => <span />;',
    language: 'tsx',
    ariaLabel: 'TSX editor',
  },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor surface is present', async () => {
      await expect(content.textContent).toContain('JSX');
    });
  },
};

/** plaintext language emits no syntax token spans. */
export const PlaintextLanguage: Story = {
  args: { value: 'no highlighting here', language: 'plaintext', ariaLabel: 'plain editor' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('no highlighted token spans are emitted', async () => {
      const tokens = content.querySelectorAll('.cm-line span[class]');
      await expect(tokens.length).toBe(0);
    });
  },
};

/** Without onChange the editor is uncontrolled — mounts without errors. */
export const NoOnChange: Story = {
  args: { value: jsSample, ariaLabel: 'Uncontrolled editor' },
  render: (args) => <CodeEditor {...args} onChange={undefined} />,
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor mounts without an onChange handler', async () => {
      await expect(content).toHaveAttribute('contenteditable', 'true');
    });
  },
};

/** Read-only mode prevents edits but keeps the surface labeled and focusable. */
export const ReadOnlyIsNotEditable: Story = {
  args: { readOnly: true },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the surface is not editable but is labeled', async () => {
      await expect(content).toHaveAttribute('contenteditable', 'false');
      await expect(content).toHaveAttribute('aria-label', 'JavaScript editor');
      const before = content.textContent;
      content.focus();
      await userEvent.keyboard('ZZZ');
      await expect(content.textContent).toBe(before);
    });
  },
};
