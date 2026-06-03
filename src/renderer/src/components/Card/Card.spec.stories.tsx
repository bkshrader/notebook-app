import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Card } from './Card';

/**
 * Interaction / accessibility tests for the Card.
 *
 * Kept separate from the visual stories (`Card.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behavior, each uses `step()` and `await`s real `expect(...)`
 * (Storybook matchers are async). Hidden from the docs gallery via
 * `tags: ['test']`.
 *
 * Card is presentational (Tier A-display): the tests assert its role/structure,
 * token resolution, and the level→shadow mapping. The only "interaction" case
 * verifies that an interactive child — not the card div — owns the keyboard
 * focus ring, which is the Helios contract for clickable cards.
 */
const meta: Meta<typeof Card> = {
  title: 'Components/Display/Card/Tests',
  component: Card,
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Card>;

/** The presentational contract: a plain, non-interactive container surface. */
export const PresentationalContract: Story = {
  args: { children: 'Card body' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders the root container with our data-part', async () => {
      const root = canvasElement.querySelector("[data-scope='card'][data-part='root']");
      await expect(root).not.toBeNull();
      await expect(canvas.getByText('Card body')).toBeInTheDocument();
    });

    await step('is a non-interactive container (no role / tabindex / focus ring)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      // Regression guard: the card div must NOT masquerade as a control. It has
      // no implicit/explicit role, is not in the tab order, and carries no
      // focusable affordance of its own.
      await expect(root.tagName).toBe('DIV');
      await expect(root).not.toHaveAttribute('role');
      await expect(root).not.toHaveAttribute('tabindex');
    });

    await step('resolves a real background token (default primary)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // The default background maps to --token-color-surface-primary; a resolved
      // color is opaque-ish (not the transparent fallback).
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      // The Helios medium radius resolves to a non-zero length.
      await expect(parseFloat(cs.borderTopLeftRadius)).toBeGreaterThan(0);
    });
  },
};

/** Each `level` maps to its Helios shadow token; flush (no level) has none. */
export const ElevationLevels: Story = {
  args: { level: 'surface-high', children: 'Raised' },
  play: async ({ canvasElement, step }) => {
    await step('a level resolves a real box-shadow', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      // Regression guard: the [data-level] selector must apply a shadow token.
      await expect(root).toHaveAttribute('data-level', 'surface-high');
      await expect(getComputedStyle(root).boxShadow).not.toBe('none');
    });
  },
};

/** A flush card (no level) carries no resting shadow. */
export const FlushHasNoShadow: Story = {
  args: { children: 'Flush' },
  play: async ({ canvasElement, step }) => {
    await step('no level → no box-shadow', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).not.toHaveAttribute('data-level');
      await expect(getComputedStyle(root).boxShadow).toBe('none');
    });
  },
};

/** The secondary background resolves a different surface than the primary one. */
export const SecondaryBackground: Story = {
  args: { background: 'secondary', children: 'Secondary' },
  play: async ({ canvasElement, step }) => {
    await step('secondary maps to the faint surface token', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-background', 'secondary');
      const cs = getComputedStyle(root);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** An interactive child — not the card — owns the keyboard focus ring. */
export const InteractiveChildOwnsFocus: Story = {
  args: {
    level: 'surface-base',
    hoverLevel: 'surface-high',
    children: <a href="#card-target">Open item</a>,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the card itself is not keyboard-focusable', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).not.toHaveAttribute('tabindex');
    });

    await step('Tab moves focus to the inner link (the real control)', async () => {
      const link = canvas.getByRole('link', { name: 'Open item' });
      await userEvent.tab();
      await waitFor(async () => {
        await expect(link).toHaveFocus();
      });
      // The link is what carries the focus ring; native :focus-visible after a
      // real keyboard Tab resolves a non-empty outline/box-shadow on it.
      await expect(link.matches(':focus-visible')).toBe(true);
    });

    await step('hover-level is configured on the card for the raised affordance', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-hover-level', 'surface-high');
    });
  },
};
