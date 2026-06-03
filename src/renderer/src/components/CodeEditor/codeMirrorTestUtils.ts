import { expect, waitFor, within } from 'storybook/test';

/**
 * Shared spec-story helpers for the CodeMirror-backed components (CodeBlock and
 * CodeEditor). Factored out so the two `*.spec.stories.tsx` files don't duplicate
 * the CM-mount wait or the copy-control assertion.
 */

/**
 * CodeMirror mounts its `EditorView` in a `useEffect`, so `.cm-content` (the
 * contenteditable surface) does not exist on first paint. Both components' tests
 * must wait for it before asserting.
 */
export async function waitForCmContent(canvasElement: HTMLElement): Promise<HTMLElement> {
  return waitFor(() => {
    const content = canvasElement.querySelector<HTMLElement>('.cm-content');
    if (!content) throw new Error('CodeMirror content not mounted yet');
    return content;
  });
}

/**
 * Assert the copy control is present and labeled, and that the Ark Clipboard's
 * value-carrying input holds the expected code. We check the wiring rather than
 * the OS clipboard: the headless test browser denies `clipboard.writeText`, so
 * the real write (and Ark's "Copied" indicator flip) can't run deterministically.
 * `expectedSubstring` is what proves the right text would be copied.
 */
export async function expectCopyControlCarries(
  canvasElement: HTMLElement,
  expectedSubstring: string,
): Promise<void> {
  const canvas = within(canvasElement);
  const copy = canvas.getByRole('button', { name: /copy/i });
  await expect(copy).toBeInTheDocument();

  const input = canvasElement.querySelector<HTMLInputElement>(
    "[data-scope='clipboard'][data-part='input']",
  );
  await expect(input).not.toBeNull();
  await expect(input!.value).toContain(expectedSubstring);
}
