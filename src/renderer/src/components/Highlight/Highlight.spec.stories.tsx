import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Highlight } from './Highlight';

/**
 * Interaction / accessibility tests for the Highlight primitive.
 *
 * Kept separate from the visual stories (`Highlight.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md). Highlight
 * is purely presentational — it has no focus/hover/disabled/toggle states — so the
 * regression guards assert the *visual contract* that the token selectors in
 * `Highlight.css` establish: each <mark> must resolve a real (non-transparent)
 * highlight background, a distinct foreground color, a rounded corner, a medium
 * font-weight, and `box-decoration-break: clone` so a multi-line match wraps as one
 * continuous highlight. These guards FAIL if `[data-component='highlight'] mark`
 * stops matching (e.g. the wrapper attribute or a token is renamed) and PASS once
 * the selector resolves.
 *
 * Stories are named by behavior so a failure is self-describing, each asserts (a
 * `play` without `expect` is a state-setter, not a test), and each uses `step()` for
 * readable runner / Interactions-panel output. `tags: ['test']` keeps them out of
 * the docs gallery while still running in the test runner.
 */
const text = 'Ark UI is a headless component library for building accessible web applications.';

const meta: Meta<typeof Highlight> = {
  title: 'Components/Display/Highlight/Tests',
  component: Highlight,
  args: { text, query: 'accessible' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Highlight>;

/** The matched term renders as a semantic <mark> carrying the highlighted text. */
export const SemanticMarkContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('renders a semantic <mark> for the matched term', async () => {
      // <mark> has no implicit ARIA role, so getByRole('mark') would throw; query
      // the DOM directly. The host wrapper must be present for the CSS to bind.
      const wrapper = canvasElement.querySelector('[data-component="highlight"]');
      await expect(wrapper).not.toBeNull();
      const marks = canvasElement.querySelectorAll('mark');
      await expect(marks.length).toBeGreaterThanOrEqual(1);
    });

    await step('the mark contains the matched text', async () => {
      const marks = canvasElement.querySelectorAll('mark');
      await expect(marks[0]).toHaveTextContent('accessible');
    });

    await step('unmatched text is not wrapped in a mark', async () => {
      const canvas = within(canvasElement);
      // The full sentence is present, but only the query term is a <mark>.
      await expect(canvas.getByText(/Ark UI is a headless/)).toBeInTheDocument();
      await expect(canvasElement.querySelectorAll('mark').length).toBe(1);
    });
  },
};

/**
 * Regression guard for the token-driven visual contract. Each assertion would fail
 * if `[data-component='highlight'] mark` stopped resolving its Helios tokens.
 */
export const VisualTokenContract: Story = {
  play: async ({ canvasElement, step }) => {
    const mark = canvasElement.querySelector<HTMLElement>('[data-component="highlight"] mark');

    await step('the styled mark exists', async () => {
      await expect(mark).not.toBeNull();
    });

    await step('resolves a real (non-transparent) highlight background', async () => {
      const bg = getComputedStyle(mark!).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      await expect(bg).not.toBe('transparent');
    });

    await step('resolves a foreground color distinct from the background', async () => {
      const cs = getComputedStyle(mark!);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.color).not.toBe(cs.backgroundColor);
    });

    await step('applies a non-zero border radius', async () => {
      await expect(getComputedStyle(mark!).borderTopLeftRadius).not.toBe('0px');
    });

    await step('applies the medium font weight (500)', async () => {
      await expect(getComputedStyle(mark!).fontWeight).toBe('500');
    });

    await step('clones the highlight decoration across line breaks', async () => {
      // Chromium (our Electron substrate) reports the standard property; the CSS
      // sets `box-decoration-break: clone` so a wrapped match stays one highlight.
      await expect(getComputedStyle(mark!).boxDecorationBreak).toBe('clone');
    });
  },
};

/** Multiple query terms each produce their own styled mark. */
export const MultipleTermsHighlighted: Story = {
  args: { query: ['headless', 'accessible', 'library'] },
  play: async ({ canvasElement, step }) => {
    await step('every query term is wrapped in a mark', async () => {
      const marks = canvasElement.querySelectorAll('[data-component="highlight"] mark');
      await expect(marks.length).toBe(3);
    });

    await step('each mark resolves the highlight background', async () => {
      const marks = canvasElement.querySelectorAll<HTMLElement>(
        '[data-component="highlight"] mark',
      );
      await expect(marks.length).toBe(3);
      for (const m of marks) {
        await expect(getComputedStyle(m).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });
  },
};

/** Case-sensitive matching (ignoreCase=false) only marks exact-case occurrences. */
export const CaseSensitiveMatching: Story = {
  args: {
    text: 'Ark UI is a headless component library. ark ui rocks.',
    query: 'ark',
    ignoreCase: false,
  },
  play: async ({ canvasElement, step }) => {
    await step('only the lowercase occurrence is highlighted', async () => {
      const marks = canvasElement.querySelectorAll('mark');
      await expect(marks.length).toBe(1);
      const firstMark = marks[0];
      await expect(firstMark).toBeInTheDocument();
      // Only the lowercase occurrence is matched; the capitalized "Ark" is not.
      await expect(firstMark).toHaveTextContent('ark');
      await expect(firstMark?.textContent).toBe('ark');
    });
  },
};
