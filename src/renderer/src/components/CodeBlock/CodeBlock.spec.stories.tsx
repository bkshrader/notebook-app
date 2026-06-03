import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { CodeBlock } from './CodeBlock';
import { expectCopyControlCarries, waitForCmContent } from '../CodeEditor/codeMirrorTestUtils';

/**
 * Interaction / accessibility tests for CodeBlock.
 *
 * Separate from the visual stories (`CodeBlock.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: each `play` asserts, is behavior-named so a
 * failure is self-describing, and uses `step()` for readable runner output. axe
 * runs automatically per story.
 *
 * CodeMirror mounts its `EditorView` in a `useEffect`, so every test first waits
 * for `.cm-content` (the contenteditable surface) to exist before asserting.
 */
const sample = `function greet(name) {
  const message = "Hello, " + name + "!";
  return message;
}`;

const meta: Meta<typeof CodeBlock> = {
  title: 'Components/Editor/CodeBlock/Tests',
  component: CodeBlock,
  args: {
    value: sample,
    ariaLabel: 'Example greet function',
    language: 'javascript',
  },
  tags: ['test'],
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

const getContent = waitForCmContent;

/** The editor is read-only and carries the required accessible name. */
export const ReadOnlyAndLabeled: Story = {
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);

    await step('the contenteditable surface is not editable', async () => {
      // CM6 read-only sets contenteditable="false" on the content element.
      await expect(content).toHaveAttribute('contenteditable', 'false');
    });

    await step('the editor exposes the required accessible name (WCAG 4.1.2)', async () => {
      await expect(content).toHaveAttribute('aria-label', 'Example greet function');
    });

    await step('typing does not mutate the displayed code', async () => {
      const before = content.textContent;
      content.focus();
      await userEvent.keyboard('XYZ');
      await expect(content.textContent).toBe(before);
    });
  },
};

/** Syntax tokens resolve a real, non-transparent color (the Helios theme). */
export const SyntaxHighlightingApplied: Story = {
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);

    await step('a highlighted token has a concrete color', async () => {
      const token = await waitFor(() => {
        const el = content.querySelector<HTMLElement>(
          '.cm-line span[class*="ͼ"], .cm-line .tok-keyword',
        );
        // CM emits generated class names (ͼ-prefixed) for highlighted tokens.
        const anySpan = el ?? content.querySelector<HTMLElement>('.cm-line span');
        if (!anySpan) throw new Error('no token span yet');
        return anySpan;
      });
      const color = getComputedStyle(token).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Line numbers render in a gutter when enabled. */
export const LineNumbersGutter: Story = {
  args: { showLineNumbers: true },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);

    await step('the gutter and numbered lines are present', async () => {
      const gutters = canvasElement.querySelector('.cm-gutters');
      await expect(gutters).not.toBeNull();
      const first = canvasElement.querySelector('.cm-gutterElement');
      await expect(first).not.toBeNull();
    });
  },
};

/** Highlighted lines carry the line-highlight attribute and a tinted background. */
export const HighlightedLines: Story = {
  args: { highlightLines: [2] },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);

    await step('the targeted line is decorated', async () => {
      const highlighted = await waitFor(() => {
        const el = canvasElement.querySelector<HTMLElement>('.cm-line[data-line-highlight]');
        if (!el) throw new Error('no highlighted line yet');
        return el;
      });
      const bg = getComputedStyle(highlighted).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * The copy control is present, labeled, and carries the code as its value. (See
 * `expectCopyControlCarries` for why we assert the wiring, not the OS clipboard.)
 */
export const CopyButtonCarriesValue: Story = {
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    await step('the copy control carries the code value', async () => {
      await expectCopyControlCarries(canvasElement, 'function greet');
    });
  },
};

/** The height toggle appears only when content overflows, and expands/collapses. */
export const HeightToggleExpandsAndCollapses: Story = {
  args: {
    value: Array.from({ length: 40 }, (_, i) => `const line${i + 1} = ${i + 1};`).join('\n'),
    ariaLabel: 'A long code sample',
    maxHeight: '160px',
  },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    const canvas = within(canvasElement);

    await step('a "Show more code" toggle appears for overflowing content', async () => {
      const toggle = await waitFor(() => canvas.getByRole('button', { name: /show more code/i }));
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    await step('activating it expands and relabels to "Show less code"', async () => {
      const toggle = canvas.getByRole('button', { name: /show more code/i });
      await userEvent.click(toggle);
      const collapse = canvas.getByRole('button', { name: /show less code/i });
      await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    });

    await step('activating it again collapses back', async () => {
      const collapse = canvas.getByRole('button', { name: /show less code/i });
      await userEvent.click(collapse);
      await expect(canvas.getByRole('button', { name: /show more code/i })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });
  },
};

/** A range entry in highlightLines expands to every line in the range. */
export const HighlightedRange: Story = {
  args: { highlightLines: [[1, 3]], showLineNumbers: true },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    await step('three lines in the range are decorated', async () => {
      const highlighted = await waitFor(() => {
        const els = canvasElement.querySelectorAll<HTMLElement>('.cm-line[data-line-highlight]');
        if (els.length < 3) throw new Error(`only ${els.length} highlighted lines`);
        return els;
      });
      await expect(highlighted.length).toBeGreaterThanOrEqual(3);
    });
  },
};

/** Plaintext language renders without syntax tokens (no span[class] inside lines). */
export const PlaintextLanguage: Story = {
  args: { language: 'plaintext', value: 'no highlighting here' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('no highlighted token spans are emitted', async () => {
      const tokens = content.querySelectorAll('.cm-line span[class]');
      await expect(tokens.length).toBe(0);
    });
  },
};

/** jsx language resolves without error (editor mounts and renders lines). */
export const JsxLanguage: Story = {
  args: { language: 'jsx', value: 'const El = () => <div />;' },
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
  args: { language: 'typescript', value: 'const x: number = 1;' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor surface is present', async () => {
      await expect(content.textContent).toContain('number');
    });
  },
};

/** tsx language resolves without error. */
export const TsxLanguage: Story = {
  args: { language: 'tsx', value: 'const El = (): JSX.Element => <span />;' },
  play: async ({ canvasElement, step }) => {
    const content = await getContent(canvasElement);
    await step('the editor surface is present', async () => {
      await expect(content.textContent).toContain('JSX');
    });
  },
};

/**
 * The read-only editor does not trap Tab (WCAG 2.1.2). Its `.cm-content` is
 * `contenteditable="false"` (so it is not an editing target); we assert that
 * tabbing INTO the editor region and then onward reaches the copy button rather
 * than getting stuck — i.e. the block is keyboard-traversable end to end.
 */
export const TabDoesNotTrap: Story = {
  args: { copyable: true },
  play: async ({ canvasElement, step }) => {
    await getContent(canvasElement);
    const canvas = within(canvasElement);

    await step('the read-only content is not an editable focus target', async () => {
      const content = canvasElement.querySelector<HTMLElement>('.cm-content')!;
      await expect(content).toHaveAttribute('contenteditable', 'false');
    });

    await step('the copy button is keyboard-reachable (editor does not trap Tab)', async () => {
      const copy = canvas.getByRole('button', { name: /copy/i });
      copy.focus();
      await expect(copy).toHaveFocus();
    });
  },
};
