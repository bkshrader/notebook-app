import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Marquee } from './Marquee';

/**
 * Interaction / accessibility tests for the Marquee.
 *
 * Kept separate from the visual stories (`Marquee.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior, each uses `step()` for readable runner output, and
 * each `await`s real `expect(...)` (Storybook matchers are async).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const CONTENT = (
  <>
    <span>Helios</span>
    <span>CodeMirror</span>
    <span>MathJax</span>
  </>
);

const meta: Meta<typeof Marquee> = {
  title: 'Components/Display/Marquee/Tests',
  component: Marquee,
  args: { label: 'Partner logos', children: CONTENT },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Marquee>;

/** The Ark/ARIA contract: the root is a labelled marquee region with live=off. */
export const RegionContract: Story = {
  args: { label: 'Partner logos' },
  play: async ({ canvasElement, step }) => {
    await step('root exposes the marquee region semantics', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='marquee'][data-part='root']",
      )!;
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('role', 'region');
      await expect(root).toHaveAttribute('aria-roledescription', 'marquee');
      // WCAG 4.1.3: a scrolling ticker must not be an assertive live region.
      await expect(root).toHaveAttribute('aria-live', 'off');
    });

    await step('the required label becomes the accessible name', async () => {
      const canvas = within(canvasElement);
      const region = canvas.getByRole('region', { name: 'Partner logos' });
      await expect(region).toHaveAttribute('aria-label', 'Partner logos');
    });

    await step('root resolves the Helios foreground token', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(getComputedStyle(root).color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Ark duplicates the content; only the authored copy is in the a11y tree. */
export const ClonesAreHidden: Story = {
  args: { label: 'Tickers' },
  play: async ({ canvasElement, step }) => {
    await step('at least one content copy renders', async () => {
      const copies = canvasElement.querySelectorAll("[data-part='content']");
      await expect(copies.length).toBeGreaterThanOrEqual(1);
    });

    await step('clone copies (index > 0) are aria-hidden, the original is not', async () => {
      const original = canvasElement.querySelector<HTMLElement>(
        "[data-part='content'][data-index='0']",
      )!;
      await expect(original).not.toBeNull();
      await expect(original.getAttribute('aria-hidden')).toBeNull();

      const clone = canvasElement.querySelector<HTMLElement>("[data-part='content'][data-clone]");
      if (clone) {
        // Ark marks duplicated copies presentation + aria-hidden so screen
        // readers announce the text once.
        await expect(clone).toHaveAttribute('aria-hidden', 'true');
      }
    });
  },
};

/** The content track runs the scroll keyframe by default (selector is live). */
export const ScrollAnimates: Story = {
  args: { label: 'Scrolling' },
  play: async ({ canvasElement, step }) => {
    await step('the content part runs the horizontal scroll keyframe', async () => {
      const content = canvasElement.querySelector<HTMLElement>(
        "[data-part='content'][data-index='0']",
      )!;
      const cs = getComputedStyle(content);
      // Regression guard: the [data-part=content] selector must bind the
      // keyframe (not a dead selector) and resolve a real duration from the
      // Ark-set --marquee-duration custom property.
      await expect(cs.animationName).toBe('marquee-scroll-x');
      await expect(cs.animationDuration).not.toBe('0s');
      await expect(cs.animationDuration).not.toBe('');
    });
  },
};

/**
 * MOTION CONTRACT (WCAG 2.2.2 / 2.3.3): the scroll keyframe is suppressed under
 * BOTH the `[data-reduced-motion='reduce']` attribute (Storybook toolbar) AND —
 * documented here, asserted via the attribute path the runner can drive — the OS
 * `prefers-reduced-motion` media query, which Marquee.css mirrors selector-for-
 * selector. This is the load-bearing assertion for the component.
 */
export const RespectsReducedMotion: Story = {
  args: { label: 'Scrolling' },
  play: async ({ canvasElement, step }) => {
    const content = canvasElement.querySelector<HTMLElement>(
      "[data-part='content'][data-index='0']",
    )!;
    const root = document.documentElement;
    const previous = root.dataset.reducedMotion;

    await step('by default (no reduced-motion signal) the scroll keyframe runs', async () => {
      // The runner does not set prefers-reduced-motion, so the animation is live.
      await expect(getComputedStyle(content).animationName).toBe('marquee-scroll-x');
    });

    await step('[data-reduced-motion=reduce] resets the animation to none', async () => {
      // Drive the same attribute the Storybook toolbar sets on <html>; the CSS
      // resets `animation: none` under it. Restore afterwards so the global
      // motion state does not leak across stories.
      root.dataset.reducedMotion = 'reduce';
      try {
        await waitFor(async () => {
          await expect(getComputedStyle(content).animationName).toBe('none');
        });
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

/** With `edges`, Ark renders the two scroll-axis fade gradients. */
export const EdgesRender: Story = {
  args: { label: 'With edges', edges: true },
  play: async ({ canvasElement, step }) => {
    await step('both horizontal fade edges render with a gradient background', async () => {
      const start = canvasElement.querySelector<HTMLElement>(
        "[data-part='edge'][data-side='start']",
      )!;
      const end = canvasElement.querySelector<HTMLElement>("[data-part='edge'][data-side='end']")!;
      await expect(start).not.toBeNull();
      await expect(end).not.toBeNull();
      // Regression guard: the per-side selector paints a real linear-gradient
      // (the token resolves; the selector is not dead).
      await expect(getComputedStyle(start).backgroundImage).toContain('gradient');
      await expect(getComputedStyle(end).backgroundImage).toContain('gradient');
    });
  },
};

/** Without `edges`, no fade gradients are rendered (default). */
export const NoEdgesByDefault: Story = {
  args: { label: 'No edges' },
  play: async ({ canvasElement, step }) => {
    await step('no edge parts are present', async () => {
      const edges = canvasElement.querySelectorAll("[data-part='edge']");
      await expect(edges.length).toBe(0);
    });
  },
};
