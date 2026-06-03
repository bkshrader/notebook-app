import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Icon } from './Icon';

/**
 * Interaction / accessibility tests for the Icon.
 *
 * Kept separate from the visual stories (`Icon.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behavior so a failure is self-describing; each uses `step()` and
 * `await`s real `expect(...)` (Storybook matchers are async).
 *
 * Icon is presentational (Tier A-display): there is no keyboard/pointer
 * interaction to drive, so the tests assert the ARIA/role contract, the
 * data-part structure, and that the size/tone/spin tokens actually resolve.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */

const path = <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" />;

const meta: Meta<typeof Icon> = {
  title: 'Components/Display/Icon/Tests',
  component: Icon,
  args: { children: path },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Icon>;

const ICON = "[data-scope='icon'][data-part='root']";

/** A decorative icon (no label) is hidden from AT and exposes no role/name. */
export const DecorativeIsHidden: Story = {
  play: async ({ canvasElement, step }) => {
    await step('the svg carries the icon data-part contract', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON);
      await expect(svg).not.toBeNull();
      await expect(svg!.tagName.toLowerCase()).toBe('svg');
    });

    await step('decorative icon is aria-hidden with no role or label', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
      await expect(svg).not.toHaveAttribute('role');
      await expect(svg).not.toHaveAttribute('aria-label');
    });

    await step('it has no accessible name in the a11y tree', async () => {
      // queryByRole('img') must find nothing: aria-hidden removes it from the tree.
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole('img')).toBeNull();
    });
  },
};

/** A meaningful icon (with label) is exposed as role="img" with that name. */
export const MeaningfulHasImgRole: Story = {
  args: { label: 'Task complete' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('label promotes the icon to role="img" with an accessible name', async () => {
      const img = canvas.getByRole('img', { name: 'Task complete' });
      await expect(img).toBeInTheDocument();
    });

    await step('a named icon is NOT aria-hidden', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      await expect(svg).not.toHaveAttribute('aria-hidden');
      await expect(svg).toHaveAttribute('aria-label', 'Task complete');
    });
  },
};

/** The 24px size resolves the 1.5rem square box and the default viewBox. */
export const DefaultSizeIs24: Story = {
  args: { label: 'Default size' },
  play: async ({ canvasElement, step }) => {
    await step('display is block and the box is a square 1.5rem (the 24px size)', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      const cs = getComputedStyle(svg);
      await expect(cs.display).toBe('block');
      // The box is `1.5rem`; compute the px expectation from the real root
      // font-size (the test runner's root is not guaranteed to be 16px), so a
      // unit/root mismatch can't hide a regression.
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      await expect(parseFloat(cs.width)).toBeCloseTo(1.5 * rootPx, 0);
      await expect(cs.width).toBe(cs.height);
      // The SVG attributes carry the absolute Helios px box + default grid.
      await expect(svg).toHaveAttribute('width', '24');
      await expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  },
};

/** The small (16px / 1rem) box resolves strictly smaller than the 24px box. */
export const SmallIsSmaller: Story = {
  args: { size: 16, label: 'Small' },
  play: async ({ canvasElement, step }) => {
    await step('size=16 resolves a 1rem square, strictly smaller than the 24 box', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      const cs = getComputedStyle(svg);
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const px = parseFloat(cs.width);
      // The small box is 1rem and strictly smaller than the 1.5rem (24) box.
      await expect(px).toBeCloseTo(rootPx, 0);
      await expect(px).toBeLessThan(1.5 * rootPx);
      // The width SVG attribute matches the size prop.
      await expect(svg).toHaveAttribute('width', '16');
    });
  },
};

/** A semantic tone resolves a Helios foreground token (not currentColor black). */
export const ToneResolvesToken: Story = {
  args: { tone: 'critical', label: 'Error' },
  play: async ({ canvasElement, step }) => {
    await step('critical tone sets a non-empty color that fill inherits', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      const cs = getComputedStyle(svg);
      // The token resolves to a real color (not empty / not transparent), and
      // fill follows `currentColor`, so fill === color.
      await expect(cs.color).not.toBe('');
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.fill).toBe(cs.color);
    });
  },
};

/** The inherit tone keeps fill bound to the surrounding text color. */
export const InheritFollowsCurrentColor: Story = {
  args: { tone: 'inherit', label: 'Inherits color' },
  decorators: [
    (Story) => (
      <div style={{ color: 'rgb(10, 20, 30)' }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement, step }) => {
    await step('fill resolves to the inherited parent color (currentColor)', async () => {
      const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
      const cs = getComputedStyle(svg);
      await expect(cs.fill).toBe('rgb(10, 20, 30)');
    });
  },
};

/** The spin state runs the rotation animation, which reduced motion suppresses. */
export const SpinRespectsReducedMotion: Story = {
  args: { spin: true, label: 'Loading' },
  play: async ({ canvasElement, step }) => {
    const svg = canvasElement.querySelector<SVGSVGElement>(ICON)!;
    const root = document.documentElement;
    const previous = root.dataset.reducedMotion;

    await step('spin sets the data-spin marker and runs the spin keyframe', async () => {
      await expect(svg).toHaveAttribute('data-spin', 'true');
      // Regression guard: assert the [data-spin] selector actually matches and
      // resolves the keyframe (not a dead selector). The runner does not set
      // prefers-reduced-motion, so by default the animation runs.
      await expect(getComputedStyle(svg).animationName).toBe('icon-spin');
    });

    await step('the [data-reduced-motion=reduce] reset suppresses the spin', async () => {
      // Drive the same attribute the Storybook toolbar sets on <html>; our CSS
      // resets the animation to none under it. Restore it after so the global
      // motion state does not leak across stories.
      root.dataset.reducedMotion = 'reduce';
      try {
        await expect(getComputedStyle(svg).animationName).toBe('none');
      } finally {
        if (previous === undefined) {
          delete root.dataset.reducedMotion;
        } else {
          root.dataset.reducedMotion = previous;
        }
      }
    });
  },
};
