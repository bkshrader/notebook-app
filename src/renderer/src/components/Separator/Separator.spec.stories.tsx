import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Separator } from './Separator';

/**
 * Interaction / accessibility tests for the Separator.
 *
 * Kept separate from the visual stories (`Separator.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior so a failure is self-describing, each uses
 * `step()`, and each `await`s a real `expect(...)` (Storybook matchers are
 * async).
 *
 * Separator is presentational (a styled `<hr>`), so per the Tier A-display
 * contract these assert the ARIA/role contract, the structural element, and
 * that the Helios tokens actually resolve — there is no keyboard path to drive.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof Separator> = {
  title: 'Components/Layout/Separator/Tests',
  component: Separator,
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Separator>;

/** The native `<hr>` exposes the implicit `separator` role and our data-parts. */
export const SeparatorRoleContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders an <hr> with the implicit separator role', async () => {
      const sep = canvas.getByRole('separator');
      await expect(sep).toBeInTheDocument();
      await expect(sep.tagName).toBe('HR');
    });

    await step('carries the wrapper data-part the CSS targets', async () => {
      const sep = canvas.getByRole('separator');
      await expect(sep).toHaveAttribute('data-part', 'separator');
    });

    await step('horizontal is the default and is not announced as vertical', async () => {
      const sep = canvas.getByRole('separator');
      await expect(sep).toHaveAttribute('data-orientation', 'horizontal');
      // Implicit ARIA orientation for separator is horizontal; we omit the attr.
      await expect(sep).not.toHaveAttribute('aria-orientation');
    });
  },
};

/** The horizontal divider resolves the Helios 1px border token on its block edge. */
export const HorizontalResolvesBorderToken: Story = {
  args: { orientation: 'horizontal' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the block-start border is a real 1px solid rule', async () => {
      const sep = canvas.getByRole('separator');
      const cs = getComputedStyle(sep);
      // Regression guard: the visible rule lives on the block-start edge and
      // resolves to a non-zero width with a real (non-transparent) color token.
      await expect(parseFloat(cs.borderBlockStartWidth)).toBeGreaterThan(0);
      await expect(cs.borderBlockStartStyle).toBe('solid');
      await expect(cs.borderBlockStartColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('the default 24px spacing resolves as block margin', async () => {
      const sep = canvas.getByRole('separator');
      const cs = getComputedStyle(sep);
      // --separator-spacing must resolve to the 24px (1.5rem) value, applied as
      // block margin for a horizontal divider, with no inline margin.
      await expect(cs.getPropertyValue('--separator-spacing').trim()).toBe('1.5rem');
      await expect(parseFloat(cs.marginBlockStart)).toBeGreaterThan(0);
      await expect(parseFloat(cs.marginInlineStart)).toBe(0);
    });
  },
};

/** The vertical divider sets aria-orientation and draws on the inline edge. */
export const VerticalOrientationContract: Story = {
  args: { orientation: 'vertical' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('announces vertical orientation to assistive tech', async () => {
      const sep = canvas.getByRole('separator');
      await expect(sep).toHaveAttribute('aria-orientation', 'vertical');
      await expect(sep).toHaveAttribute('data-orientation', 'vertical');
    });

    await step('draws the 1px rule on the inline-start edge', async () => {
      const sep = canvas.getByRole('separator');
      const cs = getComputedStyle(sep);
      // Regression guard: the vertical variant moves the visible rule to the
      // inline edge (a column divider) and resolves the spacing as inline margin.
      await expect(parseFloat(cs.borderInlineStartWidth)).toBeGreaterThan(0);
      await expect(cs.borderInlineStartColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(parseFloat(cs.marginInlineStart)).toBeGreaterThan(0);
      await expect(parseFloat(cs.marginBlockStart)).toBe(0);
    });
  },
};

/** The zero-spacing option collapses the cross-axis margin to nothing. */
export const ZeroSpacingHasNoMargin: Story = {
  args: { orientation: 'horizontal', spacing: '0' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('spacing="0" resolves --separator-spacing to 0 and no margin', async () => {
      const sep = canvas.getByRole('separator');
      const cs = getComputedStyle(sep);
      // Regression guard: the spacing-0 selector must override the default token.
      await expect(cs.getPropertyValue('--separator-spacing').trim()).toBe('0');
      await expect(parseFloat(cs.marginBlockStart)).toBe(0);
      await expect(parseFloat(cs.marginBlockEnd)).toBe(0);
    });
  },
};
