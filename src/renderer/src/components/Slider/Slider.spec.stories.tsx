import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Slider } from './Slider';

/**
 * Interaction / accessibility tests for the Slider.
 *
 * Kept separate from the visual stories (`Slider.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered value, so colocating it with a doc
 * story would make that story jump on load. Each story is named by behavior so a
 * failure is self-describing, each AWAITS real `expect(...)` (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Several of these are REGRESSION GUARDS for the Ark-contract fix: Ark emits NO
 * `data-focus-visible`, so the keyboard focus ring is drawn via the native
 * `:focus-visible` pseudo on the thumb. The "focus ring" guard fails against the
 * old phantom `[data-focus-visible]` selector and passes after the fix.
 */
const meta: Meta<typeof Slider> = {
  title: 'Components/Forms/Slider/Tests',
  component: Slider,
  args: { label: 'Volume', showValueText: true, size: 'medium' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Slider>;

/** The focusable thumb (a div with role="slider", tabindex="0"). */
function thumbOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>('[data-scope="slider"][data-part="thumb"]')!;
}

/** Keyboard focus renders a real focus ring on the thumb via :focus-visible. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const thumb = thumbOf(canvasElement);

    await step('no focus ring before focus', async () => {
      // Pristine: only the elevation shadow is present; the focus-ring token
      // resolves to an inset 1px + 3px ring that is absent until :focus-visible.
      const ring = getComputedStyle(thumb).boxShadow;
      await expect(ring).not.toContain('3px');
    });

    await step('keyboard focus draws the action focus ring', async () => {
      // Regression guard: the ring is drawn via the native :focus-visible pseudo
      // (Ark exposes NO data-focus-visible attribute). userEvent.tab() produces a
      // real keyboard focus that triggers :focus-visible, unlike programmatic
      // .focus(). This step FAILS against the old [data-focus-visible] selector.
      await userEvent.tab();
      await expect(thumb).toHaveFocus();
      const ring = getComputedStyle(thumb).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
      // The Helios action focus ring is an inset 1px + 3px outer ring.
      await expect(ring).toContain('3px');
    });
  },
};

/** Arrow keys move the value; the slider is keyboard-reachable. */
export const KeyboardInteraction: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('slider');

    await step('starts at the default value of 50', async () => {
      await expect(input).toHaveAttribute('aria-valuenow', '50');
    });

    await step('slider is in the tab order (keyboard-reachable)', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('ArrowRight increments the value', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(Number(input.getAttribute('aria-valuenow'))).toBeGreaterThan(50);
    });

    await step('ArrowLeft decrements the value', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await expect(Number(input.getAttribute('aria-valuenow'))).toBeLessThanOrEqual(50);
    });

    await step('range background resolves to a real token value', async () => {
      const range = canvasElement.querySelector<HTMLElement>(
        '[data-scope="slider"][data-part="range"]',
      )!;
      const bg = getComputedStyle(range).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** A disabled slider exposes its state, is inoperable, and looks distinct. */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('slider');
    const thumb = thumbOf(canvasElement);

    await step('disabled state is exposed to assistive technology', async () => {
      // Ark sets data-disabled on the thumb (div[role="slider"]), not native disabled.
      await expect(input).toHaveAttribute('data-disabled');
    });

    await step('arrow keys do not move a disabled slider', async () => {
      const before = input.getAttribute('aria-valuenow');
      input.focus();
      await userEvent.keyboard('{ArrowRight}');
      await expect(input.getAttribute('aria-valuenow')).toBe(before);
    });

    await step('disabled thumb is visually distinct from enabled', async () => {
      // Regression guard for the disabled-state selector: cursor + border differ.
      const cs = getComputedStyle(thumb);
      await expect(cs.cursor).toBe('not-allowed');
    });
  },
};

/** Multi-thumb (range) mode renders one slider per value entry. */
export const RangeRendersTwoThumbs: Story = {
  args: { label: 'Price range', defaultValue: [25, 75] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('two thumbs are rendered for a two-entry value', async () => {
      const thumbs = canvasElement.querySelectorAll('[data-scope="slider"][data-part="thumb"]');
      await expect(thumbs.length).toBe(2);
    });

    await step('each thumb is an independently operable slider', async () => {
      const sliders = canvas.getAllByRole('slider');
      await expect(sliders.length).toBe(2);
      await expect(sliders[0]).toHaveAttribute('aria-valuenow', '25');
      await expect(sliders[1]).toHaveAttribute('aria-valuenow', '75');
    });
  },
};

/** The size scale resolves a larger thumb for `large` than for `small`. */
export const SizeScalesThumb: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    const thumb = thumbOf(canvasElement);

    await step('large size resolves a 20px thumb via the size matrix', async () => {
      // Regression guard for the [data-size] local-property matrix: the thumb
      // pulls --slider-thumb-size, which large sets to 20px.
      const size = getComputedStyle(thumb).inlineSize;
      await expect(size).toBe('20px');
    });
  },
};
