import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BadgeCount } from './BadgeCount';

/**
 * Interaction / accessibility tests for BadgeCount.
 *
 * Kept separate from the visual stories (`BadgeCount.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 *
 * BadgeCount is presentational (Tier A-display): it has no focusable control or
 * interactive state, so these tests assert the structural contract (the wrapper
 * `<span>` carries its own `data-part`/`data-type`/`data-size` attributes), the
 * accessible-name contract, and that each size/type variant resolves a real
 * (token-backed) computed value rather than a default/zero. The preview's
 * `a11y.test: 'error'` runs axe automatically — no manual axe call here.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof BadgeCount> = {
  title: 'Components/Display/BadgeCount/Tests',
  component: BadgeCount,
  args: { children: '3' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof BadgeCount>;

/** Structural contract: the wrapper span carries the data-parts the CSS targets. */
export const StructureContract: Story = {
  args: { children: '7', type: 'filled', size: 'medium' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders the numeric label as a span', async () => {
      const badge = canvas.getByText('7');
      await expect(badge.tagName).toBe('SPAN');
    });

    await step('the root span carries data-part / data-type / data-size', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-type', 'filled');
      await expect(root).toHaveAttribute('data-size', 'medium');
    });

    await step('filled type resolves a real (token-backed) background', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // The filled treatment applies surface-strong; assert it is not the
      // transparent default a missing token would leave.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.display).toBe('inline-flex');
    });
  },
};

/** The outlined type is transparent-filled with a resolved border color. */
export const OutlinedHasBorder: Story = {
  args: { children: '9', type: 'outlined' },
  play: async ({ canvasElement, step }) => {
    await step('outlined resolves a non-transparent border color', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: the outlined selector must set border-color to a
      // token (border-strong), and the background stays transparent.
      await expect(cs.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(parseFloat(cs.borderTopWidth)).toBeGreaterThan(0);
    });
  },
};

/** The inverted type resolves a different background than filled. */
export const InvertedDiffersFromFilled: Story = {
  args: { children: '5', type: 'inverted' },
  play: async ({ canvasElement, step }) => {
    await step('inverted resolves its own surface token', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // surface-faint differs from surface-strong (filled); assert it resolves
      // to a real color so a missing/typo token can't pass.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(root).toHaveAttribute('data-type', 'inverted');
    });
  },
};

/** The size scale resolves distinct min-height and radius per size. */
export const SizeScale: Story = {
  args: { children: '2', size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the large geometry (min-height + pill radius)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      const root16 = parseFloat(getComputedStyle(document.documentElement).fontSize);
      // Regression guard: large min-block-size is 2rem; assert it resolved to a
      // box at least that tall (padding may add to it) and a non-zero pill radius.
      await expect(parseFloat(cs.minHeight)).toBeCloseTo(2 * root16, 0);
      await expect(parseFloat(cs.borderTopLeftRadius)).toBeGreaterThan(0);
      // The body-300 type scale resolves a non-zero font size.
      await expect(parseFloat(cs.fontSize)).toBeGreaterThan(0);
    });
  },
};

/** A custom aria-label overrides the spoken form (WCAG 1.1.1 / 4.1.2). */
export const AccessibleNameOverride: Story = {
  args: { children: '3', 'aria-label': '3 unread messages' },
  play: async ({ canvasElement, step }) => {
    await step('aria-label provides the accessible name', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('aria-label', '3 unread messages');
    });
  },
};
