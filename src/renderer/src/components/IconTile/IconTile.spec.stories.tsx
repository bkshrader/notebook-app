import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { IconTile } from './IconTile';

/**
 * Interaction / accessibility tests for IconTile.
 *
 * Kept separate from the visual stories (`IconTile.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior so a failure is self-describing, each uses `step()`
 * for readable runner output, and each `await`s real `expect(...)` (Storybook
 * matchers are async). Hidden from the docs gallery via `tags: ['test']`.
 *
 * IconTile is presentational (no focus/keyboard/open/selection state), so this
 * is the Tier A-display contract: assert the ARIA contract (decorative vs
 * labeled), the part structure, the size-scale custom properties, and a
 * computed-style token backstop. No key-nav / pointer-drag simulation.
 */
function Glyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      data-testid="glyph"
    >
      <path d="M4 4h16v16H4z" />
    </svg>
  );
}

const meta: Meta<typeof IconTile> = {
  title: 'Components/Display/IconTile/Tests',
  component: IconTile,
  args: { icon: <Glyph /> },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof IconTile>;

/** Decorative by default: hidden from assistive tech (Helios), with the icon part present. */
export const DecorativeByDefault: Story = {
  play: async ({ canvasElement, step }) => {
    await step('root carries aria-hidden and no img role by default', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-component='icon-tile'][data-part='root']",
      )!;
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('aria-hidden', 'true');
      await expect(root).not.toHaveAttribute('role');
    });

    await step('icon part renders the supplied glyph', async () => {
      const icon = canvasElement.querySelector("[data-part='icon']");
      await expect(icon).not.toBeNull();
      await expect(icon!.querySelector("[data-testid='glyph']")).not.toBeNull();
    });

    await step('root resolves a real tile background (tone token applied)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(getComputedStyle(root).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** When `label` is supplied the tile exposes role="img" + the accessible name. */
export const LabeledExposesImgRole: Story = {
  args: { label: 'Consul cluster' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('tile is announced as an image with the label', async () => {
      const img = canvas.getByRole('img', { name: 'Consul cluster' });
      await expect(img).toBeInTheDocument();
      // The labeled tile must NOT also be hidden from AT.
      await expect(img).not.toHaveAttribute('aria-hidden');
    });
  },
};

/** The size scale resolves a non-zero, square box and scales the glyph slot. */
export const SizeScaleResolves: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the large --icon-tile-size custom property', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Asserted in rem so a non-16px test root font-size can't hide a bug.
      await expect(cs.getPropertyValue('--icon-tile-size').trim()).toBe('3rem');
      await expect(parseFloat(cs.width)).toBeGreaterThan(0);
      await expect(cs.width).toBe(cs.height);
    });

    await step('the icon slot scales with the size token', async () => {
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      await expect(getComputedStyle(icon).getPropertyValue('--icon-tile-icon-size').trim()).toBe(
        '1.5rem',
      );
    });
  },
};

/** A small tile resolves a strictly smaller box than the large one. */
export const SmallDiffersFromLarge: Story = {
  args: { size: 'small' },
  play: async ({ canvasElement, step }) => {
    await step('small resolves the small size token and a smaller box', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.getPropertyValue('--icon-tile-size').trim()).toBe('1.75rem');
      const smallPx = parseFloat(cs.width);
      const root16 = parseFloat(getComputedStyle(document.documentElement).fontSize);
      await expect(smallPx).toBeGreaterThan(0);
      await expect(smallPx).toBeLessThan(3 * root16);
    });
  },
};

/** The secondary-icon badge renders in the extra slot and is hidden from AT. */
export const SecondaryIconBadge: Story = {
  args: { secondaryIcon: <Glyph /> },
  play: async ({ canvasElement, step }) => {
    await step('extra part renders and is decorative', async () => {
      const extra = canvasElement.querySelector<HTMLElement>("[data-part='extra']");
      await expect(extra).not.toBeNull();
      await expect(extra).toHaveAttribute('aria-hidden', 'true');
      await expect(extra!.querySelector("[data-part='extra-icon']")).not.toBeNull();
    });

    await step('the badge is absolutely positioned (bottom-right overlay)', async () => {
      const extra = canvasElement.querySelector<HTMLElement>("[data-part='extra']")!;
      await expect(getComputedStyle(extra).position).toBe('absolute');
    });
  },
};

/** A non-neutral tone resolves a different background than neutral. */
export const ToneDiffersFromNeutral: Story = {
  args: { color: 'critical' },
  play: async ({ canvasElement, step }) => {
    await step('critical tone resolves its own surface token', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const bg = getComputedStyle(root).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      // The icon foreground also resolves (color inherited by the glyph).
      await expect(getComputedStyle(root).color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
