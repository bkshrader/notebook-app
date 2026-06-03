import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Badge } from './Badge';

/**
 * Interaction / accessibility tests for the Badge.
 *
 * Kept separate from the visual stories (`Badge.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behavior, each uses `step()`, and each `await`s a real `expect(...)`
 * (Storybook matchers are async).
 *
 * Badge is a presentational (Tier A-display) component: it has no Ark primitive,
 * no focus/keyboard/open state, so the contract is structural — the parts are
 * emitted, the text is the accessible name, and the color/variant/size selectors
 * resolve real tokens. axe runs automatically via the preview's
 * `a11y.test: 'error'` gate (no manual call).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof Badge> = {
  title: 'Components/Display/Badge/Tests',
  component: Badge,
  args: { text: 'New' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Badge>;

/** The Helios structural contract: root + text parts, text is the visible name. */
export const StructureContract: Story = {
  args: { text: 'Beta' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root carries the badge data-part', async () => {
      const root = canvasElement.querySelector("[data-scope='badge'][data-part='root']");
      await expect(root).not.toBeNull();
    });

    await step('text renders under the text part as the visible label', async () => {
      const text = canvas.getByText('Beta');
      await expect(text).toBeTruthy();
      await expect(text.closest("[data-part='text']")).not.toBeNull();
    });

    await step('root resolves an inline-flex box (display token applied)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.display).toBe('inline-flex');
      // The medium default resolves a real min-height (size selector applied).
      await expect(parseFloat(cs.minHeight)).toBeGreaterThan(0);
    });
  },
};

/** A filled status badge resolves a tinted surface AND a non-default foreground
 * (color is never conveyed by background alone — text carries it too). */
export const FilledResolvesSurfaceToken: Story = {
  args: { text: 'Applied', color: 'success', variant: 'filled' },
  play: async ({ canvasElement, step }) => {
    await step('filled success resolves a real tinted background', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: the [data-color][data-variant] selector applies a real
      // surface token rather than leaving the background transparent.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.backgroundColor).not.toBe('transparent');
      // The text part inherits a non-empty foreground color.
      await expect(cs.color).toBeTruthy();
    });
  },
};

/** An outlined badge is transparent with a resolved semantic border color. */
export const OutlinedResolvesBorderToken: Story = {
  args: { text: 'In Preview', color: 'highlight', variant: 'outlined' },
  play: async ({ canvasElement, step }) => {
    await step('outlined highlight is transparent with a real border color', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: outlined variant keeps a transparent surface but
      // resolves a non-transparent border color from the semantic token.
      await expect(cs.backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(parseFloat(cs.borderTopWidth)).toBeGreaterThan(0);
    });
  },
};

/** The size scale resolves distinct icon boxes and a larger min-height at large. */
export const SizeScale: Story = {
  args: {
    text: 'Running',
    size: 'large',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="5" />
      </svg>
    ),
  },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the --badge-icon-size custom property', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: the data-size selector sets --badge-icon-size, which
      // the icon box consumes. Large resolves 1rem.
      await expect(cs.getPropertyValue('--badge-icon-size').trim()).toBe('1rem');
      // The large min-height (2rem @ root font-size) is strictly taller than the
      // small min-height (1.25rem) — computed in px so a unit mismatch can't hide
      // a regression.
      const root16 = parseFloat(getComputedStyle(document.documentElement).fontSize);
      await expect(parseFloat(cs.minHeight)).toBeGreaterThan(1.25 * root16);
    });

    await step('the decorative icon is hidden from assistive tech', async () => {
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** Without an icon prop, only the text part renders (icon part is absent). */
export const IconIsOptional: Story = {
  args: { text: 'Esc', size: 'small' },
  play: async ({ canvasElement, step }) => {
    await step('no icon part is rendered when icon is omitted', async () => {
      const icon = canvasElement.querySelector("[data-part='icon']");
      await expect(icon).toBeNull();
      const text = canvasElement.querySelector("[data-part='text']");
      await expect(text).not.toBeNull();
    });
  },
};
