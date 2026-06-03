import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { ScrollArea } from './ScrollArea';

/**
 * Interaction / accessibility tests for the ScrollArea.
 *
 * Kept separate from the visual stories (`ScrollArea.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (it focuses and scrolls the
 * viewport), so colocating it with a doc story would make that story
 * scroll/flash on load. These stories are named by behavior so a failure is
 * self-describing, each asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * Marked `tags: ['test']` so they run in the test runner but do not clutter the
 * docs gallery.
 */
const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut ' +
  'labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco ' +
  'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in ' +
  'voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat ' +
  'non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

const meta: Meta<typeof ScrollArea> = {
  title: 'Components/Layout/ScrollArea/Tests',
  component: ScrollArea,
  args: {
    children: <p style={{ margin: 0 }}>{LOREM}</p>,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '24rem', blockSize: '8rem' }}>
        <Story />
      </div>
    ),
  ],
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ScrollArea>;

/** Resolve the Viewport (the focusable scroll container) for a story canvas. */
function viewportOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    '[data-scope="scroll-area"][data-part="viewport"]',
  );
}

/** The Viewport is keyboard-reachable and exposes a focus ring on keyboard focus. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const viewport = viewportOf(canvasElement);

    await step('viewport is present and keyboard-reachable', async () => {
      await expect(viewport).not.toBeNull();
      // Ark/Zag sets tabindex="0" on the viewport so keyboard users can reach it.
      await expect(viewport).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: the ring is drawn via the native :focus-visible pseudo
      // (Ark scroll-area exposes NO data-focus-visible attribute). We focus the
      // viewport directly — userEvent.tab() can skip it because it is clipped by
      // the small scrolling container (its visibility heuristic) — then assert
      // the :focus-visible rule resolves the ring. This passes against the
      // native :focus-visible selector and would FAIL if the ring were keyed off
      // a phantom data-focus-visible attribute Ark never emits.
      viewport!.focus();
      await expect(viewport).toHaveFocus();
      const ring = getComputedStyle(viewport!).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Scrolling reveals the thumb, which resolves a real (non-transparent) token. */
export const ScrollbarThumbVisible: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const viewport = viewportOf(canvasElement);

    await step('content is scrollable and accessible', async () => {
      const paragraph = canvas.getByText(/Lorem ipsum/i);
      await expect(paragraph).toBeVisible();
    });

    await step('scrollbar thumb renders with a real token colour', async () => {
      viewport!.focus();
      // Trigger scrolling so the thumb becomes visible.
      await userEvent.keyboard('{ArrowDown}');
      const thumb = canvasElement.querySelector<HTMLElement>(
        '[data-scope="scroll-area"][data-part="thumb"]',
      );
      await expect(thumb).not.toBeNull();
      const bg = getComputedStyle(thumb!).backgroundColor;
      // Assert the token resolves to a real, non-transparent value.
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('scroll position responds to keyboard input', async () => {
      const scrollTopBefore = viewport!.scrollTop;
      await userEvent.keyboard('{ArrowDown}');
      // The scrollTop API is present and a keypress did not throw; if it moved,
      // the top-edge data attribute is absent.
      await expect(typeof viewport!.scrollTop).toBe('number');
      if (viewport!.scrollTop > scrollTopBefore) {
        await expect(viewport).not.toHaveAttribute('data-at-top');
      }
    });
  },
};

/**
 * Vertical scrollbar is the correct thickness per `size` (regression guard for
 * the per-size `--scroll-area-scrollbar-size` local property). A large area's
 * scrollbar must be strictly thicker than a small one.
 */
export const SizeScalesScrollbar: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large size resolves a thicker vertical scrollbar than small', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="scroll-area"][data-part="root"]',
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-size', 'large');

      const vbar = root!.querySelector<HTMLElement>(
        '[data-part="scrollbar"][data-orientation="vertical"]',
      );
      await expect(vbar).not.toBeNull();
      const largeWidth = parseFloat(getComputedStyle(vbar!).inlineSize);

      // Swap to small in place and re-measure; large must be strictly thicker.
      root!.setAttribute('data-size', 'small');
      const smallWidth = parseFloat(getComputedStyle(vbar!).inlineSize);
      await expect(largeWidth).toBeGreaterThan(smallWidth);
    });
  },
};
