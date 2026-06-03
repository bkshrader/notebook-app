import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Avatar } from './Avatar';

/**
 * Interaction / accessibility tests for the Avatar.
 *
 * Kept separate from the visual stories (`Avatar.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): these
 * `play` functions ASSERT against the rendered DOM / computed styles, so they
 * are test cases, not documentation. They are named by behavior so a failure is
 * self-describing, each uses `step()` for readable runner output, and each
 * `await`s real `expect(...)` (Storybook matchers are async).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof Avatar> = {
  title: 'Components/Display/Avatar/Tests',
  component: Avatar,
  args: { fallback: 'JD' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Avatar>;

/** The Helios/Ark structural contract: root + fallback parts are emitted. */
export const StructureContract: Story = {
  args: { fallback: 'PQ' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root carries the data-part Ark actually emits', async () => {
      // Regression guard: Ark DOES emit data-part="root" on the container
      // (verified live). The root selector in Avatar.css depends on this; a
      // prior audit wrongly flagged it as phantom.
      const root = canvasElement.querySelector("[data-scope='avatar'][data-part='root']");
      await expect(root).not.toBeNull();
    });

    await step('fallback initials render under the fallback part', async () => {
      const fallback = canvas.getByText('PQ');
      await expect(fallback).toBeTruthy();
      await expect(fallback.closest("[data-part='fallback']")).not.toBeNull();
    });

    await step('root resolves a real background (token applied)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The size scale resolves a non-zero, square box and scales the initials. */
export const SizeScale: Story = {
  args: { size: 'large', fallback: 'LG' },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the --avatar-size custom property', async () => {
      // Regression guard: the data-size selector must set --avatar-size, which
      // the root consumes for inline/block-size. Assert the variable resolves to
      // the large value rather than a hardcoded px (the test root font-size is
      // not guaranteed to be 16px).
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.getPropertyValue('--avatar-size').trim()).toBe('3.5rem');
      // The box is square and non-zero (the variable is actually consumed).
      await expect(parseFloat(cs.width)).toBeGreaterThan(0);
      await expect(cs.width).toBe(cs.height);
      // The fallback typography scales with the size: --avatar-font-size
      // resolves to the body-300 token value (1rem).
      const fallback = root.querySelector<HTMLElement>("[data-part='fallback']")!;
      await expect(getComputedStyle(fallback).getPropertyValue('--avatar-font-size').trim()).toBe(
        '1rem',
      );
    });
  },
};

/** A small avatar resolves a smaller box than the large one (sizes differ). */
export const SmallDiffersFromLarge: Story = {
  args: { size: 'small', fallback: 'SM' },
  play: async ({ canvasElement, step }) => {
    await step('small resolves the small --avatar-size and a smaller box', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: small selector applies its own --avatar-size token.
      await expect(cs.getPropertyValue('--avatar-size').trim()).toBe('1.75rem');
      // The rendered small box is strictly smaller than the large box (56px @
      // 16px root). Computed in px so a unit/root mismatch can't hide a bug.
      const smallPx = parseFloat(cs.width);
      const root16 = parseFloat(getComputedStyle(document.documentElement).fontSize);
      await expect(smallPx).toBeGreaterThan(0);
      await expect(smallPx).toBeLessThan(3.5 * root16);
    });
  },
};

/** When an image is supplied, Ark hides the fallback and shows the image. */
export const ImageOverridesFallback: Story = {
  args: {
    src: 'https://i.pravatar.cc/300?u=avatar-spec',
    alt: 'Jane Doe',
    fallback: 'JD',
  },
  play: async ({ canvasElement, step }) => {
    await step('Ark renders the image part with an accessible name', async () => {
      const img = await waitFor(() => {
        const el = canvasElement.querySelector<HTMLImageElement>("[data-part='image']");
        if (!el) throw new Error('image part not yet rendered');
        return el;
      });
      await expect(img).toHaveAttribute('alt', 'Jane Doe');
      await expect(img).toHaveAttribute('src');
    });

    await step('Ark drives the load lifecycle via data-state', async () => {
      // Regression guard: Ark toggles data-state on image/fallback (and hides
      // the inactive one itself). We assert the attribute contract Avatar.css
      // documents but does not need to re-implement.
      const fallback = canvasElement.querySelector<HTMLElement>("[data-part='fallback']")!;
      await expect(fallback).toHaveAttribute('data-state');
    });
  },
};
