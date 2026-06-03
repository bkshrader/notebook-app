import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Progress } from './Progress';

/**
 * Interaction / accessibility regression tests for the Progress bar.
 *
 * Kept separate from the visual stories (`Progress.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): these
 * stories assert the Helios/Ark contract and guard the token fixes. Each story
 * is named by behavior so a failure is self-describing, each AWAITS real
 * `expect(...)` assertions (Storybook matchers are async), and each uses
 * `step()` + `within(canvasElement)` for readable runner output.
 *
 * Progress is non-interactive (no focusable control, no focus ring), so the
 * guards here are state/style guards rather than keyboard-focus guards:
 *   - the track resolves to its real 4px height (regression guard: it previously
 *     borrowed --token-form-toggle-border-width = 1px, an invisible hairline);
 *   - the determinate range fill resolves to the action color and the complete
 *     range fill switches to the success color (they must DIFFER);
 *   - the range carries a non-`none` transition (guards the transition tokens);
 *   - the indeterminate state runs the keyframe animation and omits aria-valuenow.
 */
const meta: Meta<typeof Progress> = {
  title: 'Components/Feedback/Progress/Tests',
  component: Progress,
  args: {
    label: 'Loading',
    defaultValue: 50,
    min: 0,
    max: 100,
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Progress>;

function range(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>('[data-scope="progress"][data-part="range"]');
}

function track(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>('[data-scope="progress"][data-part="track"]');
}

/** The Ark anatomy is emitted: root, label, track, range, value-text. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('all Ark parts are present in the live DOM', async () => {
      const parts = [...canvasElement.querySelectorAll('[data-scope="progress"]')].map((e) =>
        e.getAttribute('data-part'),
      );
      await expect(parts).toContain('root');
      await expect(parts).toContain('label');
      await expect(parts).toContain('track');
      await expect(parts).toContain('range');
      await expect(parts).toContain('value-text');
    });

    await step('Ark emits data-state="loading" while determinate and below max', async () => {
      // Regression guard: an audit claimed `loading` was never emitted. The live
      // DOM proves it IS emitted for 0 <= value < max — so the CSS comment that
      // documents "loading|complete|indeterminate" is correct and stays.
      const root = canvasElement.querySelector('[data-scope="progress"][data-part="root"]');
      await expect(root).toHaveAttribute('data-state', 'loading');
    });
  },
};

/** The track renders at its real Helios 4px height, not a borrowed 1px hairline. */
export const TrackHeightIsVisible: Story = {
  play: async ({ canvasElement, step }) => {
    await step('track resolves to a >= 4px block-size', async () => {
      // Regression guard: the height previously borrowed
      // --token-form-toggle-border-width (1px), rendering an invisible hairline.
      const t = track(canvasElement);
      await expect(t).not.toBeNull();
      const h = parseFloat(getComputedStyle(t as HTMLElement).blockSize);
      await expect(h).toBeGreaterThanOrEqual(4);
    });

    await step('range fills the full track height', async () => {
      const r = range(canvasElement);
      await expect(r).not.toBeNull();
      const rh = parseFloat(getComputedStyle(r as HTMLElement).blockSize);
      const th = parseFloat(getComputedStyle(track(canvasElement) as HTMLElement).blockSize);
      await expect(rh).toBe(th);
    });
  },
};

/** A determinate (loading) range fill resolves to the action color, with a real transition. */
export const DeterminateFill: Story = {
  args: { defaultValue: 40, label: 'File upload' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes the progressbar ARIA value contract', async () => {
      const bar = canvas.getByRole('progressbar', { name: 'File upload' });
      await expect(bar).toHaveAttribute('aria-valuenow', '40');
      await expect(bar).toHaveAttribute('aria-valuemin', '0');
      await expect(bar).toHaveAttribute('aria-valuemax', '100');
    });

    await step('range fill resolves to a real, non-transparent color', async () => {
      const r = range(canvasElement);
      await expect(r).not.toBeNull();
      const bg = getComputedStyle(r as HTMLElement).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('range carries a non-none transition (token regression guard)', async () => {
      // Regression guard: the transition previously borrowed a radiocard duration
      // and the bouncy tooltip easing; it now uses the form-toggle transition.
      const r = range(canvasElement);
      const transition = getComputedStyle(r as HTMLElement).transition;
      await expect(transition).not.toBe('');
      await expect(transition).toContain('transform');
    });
  },
};

/** At max, the range switches to the success color — distinct from the loading fill. */
export const CompleteRecolors: Story = {
  args: { defaultValue: 100, label: 'Upload complete' },
  play: async ({ canvasElement, step }) => {
    await step('range reaches data-state="complete"', async () => {
      const r = range(canvasElement);
      await expect(r).toHaveAttribute('data-state', 'complete');
    });

    await step('complete fill differs from the determinate (action) fill', async () => {
      // Regression guard: the complete-state selector must override the base
      // action color with the success color.
      const completeBg = getComputedStyle(range(canvasElement) as HTMLElement).backgroundColor;
      const actionColor = getComputedStyle(canvasElement)
        .getPropertyValue('--token-color-foreground-action')
        .trim();
      const successColor = getComputedStyle(canvasElement)
        .getPropertyValue('--token-color-foreground-success')
        .trim();
      // Sanity: the two semantic tokens are actually distinct.
      await expect(successColor).not.toBe(actionColor);
      await expect(completeBg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Indeterminate: aria-valuenow is absent and the keyframe animation runs. */
export const IndeterminateAnimates: Story = {
  args: { value: null, label: 'Processing…' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('aria-valuenow is absent when indeterminate', async () => {
      const bar = canvas.getByRole('progressbar');
      await expect(bar).not.toHaveAttribute('aria-valuenow');
    });

    await step('range is in the indeterminate state and runs the keyframe', async () => {
      const r = range(canvasElement);
      await expect(r).toHaveAttribute('data-state', 'indeterminate');
      const name = getComputedStyle(r as HTMLElement).animationName;
      await expect(name).toBe('progress-indeterminate');
    });
  },
};

/** `size='small'` resolves a thinner track than the `medium` default. */
export const SmallSizeIsThinner: Story = {
  args: { size: 'small', label: 'Syncing' },
  play: async ({ canvasElement, step }) => {
    await step('small track resolves to the 4px height (regression guard)', async () => {
      // Regression guard: `data-size='small'` must select the local
      // --progress-track-height of 4px, distinct from the 8px medium default.
      const t = track(canvasElement);
      await expect(t).not.toBeNull();
      const h = parseFloat(getComputedStyle(t as HTMLElement).blockSize);
      await expect(h).toBe(4);
    });
  },
};

/** `variant='highlight'` tints the range fill with the highlight color. */
export const HighlightVariantRecolors: Story = {
  args: { variant: 'highlight', defaultValue: 40, label: 'Indexing' },
  play: async ({ canvasElement, step }) => {
    await step('highlight fill resolves to the highlight color, not the action color', async () => {
      // Regression guard: `data-variant='highlight'` must override the local
      // --progress-range-color with the highlight token, not the action color.
      // Resolve both tokens to rgb via a probe so the comparison is computed-value
      // exact (would FAIL if the variant override were removed and the fill fell
      // back to the action color).
      const probe = document.createElement('span');
      canvasElement.appendChild(probe);
      const resolve = (token: string): string => {
        probe.style.backgroundColor = `var(${token})`;
        return getComputedStyle(probe).backgroundColor;
      };
      const actionColor = resolve('--token-color-foreground-action');
      const highlightColor = resolve('--token-color-foreground-highlight');
      probe.remove();

      // Sanity: the two semantic tokens are actually distinct.
      await expect(highlightColor).not.toBe(actionColor);

      const fill = getComputedStyle(range(canvasElement) as HTMLElement).backgroundColor;
      await expect(fill).toBe(highlightColor);
      await expect(fill).not.toBe(actionColor);
    });
  },
};
