import React from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Swap } from './Swap';

/**
 * Interaction / accessibility tests for the Swap.
 *
 * Kept separate from the visual stories (`Swap.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): the
 * `play` functions drive and MUTATE the wrapping toggle's state, so colocating
 * them with a doc story would make that story flash/animate on load. Each story
 * is named by behavior, each asserts (a `play` without `expect` is a
 * state-setter, not a test), and each uses `step()` for readable runner /
 * Interactions-panel output.
 *
 * Marked `tags: ['test']` so these don't clutter the docs gallery; they still
 * run in the test runner and count toward coverage.
 */
const meta: Meta<typeof Swap> = {
  title: 'Components/Actions/Swap/Tests',
  component: Swap,
  args: { onIndicator: '✓', offIndicator: '✕' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Swap>;

/** Controlled toggle button wrapping a Swap — the canonical interactive shell. */
function ToggleButton({ size }: { size?: 'small' | 'medium' | 'large' }) {
  const [swapped, setSwapped] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={swapped ? 'Mute' : 'Unmute'}
      aria-pressed={swapped}
      onClick={() => setSwapped((prev) => !prev)}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}
    >
      <Swap onIndicator="✓" offIndicator="✕" size={size} swap={swapped} />
    </button>
  );
}

/** The display-only contract: Swap emits no ARIA; the container owns semantics. */
export const SemanticsLiveOnContainer: Story = {
  render: () => <ToggleButton />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /mute|unmute/i });

    await step('the interactive container exposes the state, not the Swap', async () => {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      const root = canvasElement.querySelector('[data-scope="swap"][data-part="root"]')!;
      // Regression guard for the display-only contract: the Swap primitive must
      // not invent its own role/ARIA — that lives on the wrapping control.
      await expect(root).not.toBeNull();
      await expect(root.getAttribute('role')).toBeNull();
      await expect(root.getAttribute('aria-pressed')).toBeNull();
    });
  },
};

/** Click and keyboard flip the wrapping button's pressed state. */
export const ToggleInteraction: Story = {
  render: () => <ToggleButton />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /mute|unmute/i });

    await step('click toggles to on state', async () => {
      await userEvent.click(button);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAccessibleName('Mute');
    });

    await step('click again toggles back to off state', async () => {
      await userEvent.click(button);
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAccessibleName('Unmute');
    });

    await step('Space key toggles when the button is focused', async () => {
      button.focus();
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  },
};

/**
 * The on/off indicators reflect the verified Ark contract as `swap` flips.
 *
 * Verified contract (NOT data-state — that was a dead selector class): the root
 * carries `data-swap="on|off"` and the INACTIVE indicator carries the native
 * `hidden` attribute. The active indicator runs the `swap-fade-in` animation.
 */
export const IndicatorStateReflectsSwap: Story = {
  render: () => <ToggleButton />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /mute|unmute/i });
    const root = () =>
      canvasElement.querySelector<HTMLElement>('[data-scope="swap"][data-part="root"]')!;
    const indicatorOf = (type: 'on' | 'off') =>
      canvasElement.querySelector<HTMLElement>(
        `[data-scope="swap"][data-part="indicator"][data-type="${type}"]`,
      )!;

    await step('both indicators render with a resolved color and font-size', async () => {
      const on = indicatorOf('on');
      const off = indicatorOf('off');
      await expect(on).not.toBeNull();
      await expect(off).not.toBeNull();
      for (const el of [on, off]) {
        const cs = getComputedStyle(el);
        await expect(cs.color).not.toBe('');
        await expect(cs.color).not.toBe('transparent');
        // Regression guard: --swap-indicator-font-size resolves to a real length.
        await expect(cs.fontSize).not.toBe('');
        await expect(parseFloat(cs.fontSize)).toBeGreaterThan(0);
      }
    });

    await step('off state: root is data-swap=off and the on indicator is hidden', async () => {
      await waitFor(async () => {
        await expect(root()).toHaveAttribute('data-swap', 'off');
        await expect(indicatorOf('on')).toHaveAttribute('hidden');
        await expect(indicatorOf('off')).not.toHaveAttribute('hidden');
      });
    });

    await step('the visible indicator runs the fade-in animation (not none)', async () => {
      // Regression guard: the animation block previously targeted a dead
      // `[data-state='open']` selector, so it NEVER matched and the cross-fade
      // was silently broken. Assert the visible indicator resolves a real
      // animation-name so the selector contract can't silently rot again.
      const visible = indicatorOf('off');
      const cs = getComputedStyle(visible);
      await expect(cs.animationName).toBe('swap-fade-in');
      await expect(cs.animationDuration).not.toBe('0s');
      await expect(cs.animationDuration).not.toBe('');
    });

    await step('toggling flips the hidden indicator and the root data-swap', async () => {
      await userEvent.click(button);
      await waitFor(async () => {
        await expect(root()).toHaveAttribute('data-swap', 'on');
        await expect(indicatorOf('off')).toHaveAttribute('hidden');
        await expect(indicatorOf('on')).not.toHaveAttribute('hidden');
      });
    });
  },
};

/** The `size` prop scales the indicator font-size (small < large). */
export const SizeScalesIndicator: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <span data-testid="small-shell">
        <ToggleButton size="small" />
      </span>
      <span data-testid="large-shell">
        <ToggleButton size="large" />
      </span>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('large indicator renders a larger font-size than small', async () => {
      const fontSizeIn = (testid: string) => {
        const shell = canvasElement.querySelector(`[data-testid="${testid}"]`)!;
        const indicator = shell.querySelector<HTMLElement>(
          '[data-scope="swap"][data-part="indicator"][data-type="off"]',
        )!;
        return parseFloat(getComputedStyle(indicator).fontSize);
      };
      const small = fontSizeIn('small-shell');
      const large = fontSizeIn('large-shell');
      await expect(small).toBeGreaterThan(0);
      await expect(large).toBeGreaterThan(0);
      await expect(large).toBeGreaterThan(small);
    });
  },
};
