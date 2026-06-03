import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';

import { ImageCropper } from './ImageCropper';

/**
 * Interaction / accessibility tests for the ImageCropper.
 *
 * Kept separate from the visual stories (`ImageCropper.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (keyboard focus, disabled toggles), so colocating it with a
 * doc story would make that story flash/move on load. Stories are named by
 * behavior so a failure is self-describing, each asserts with `expect`, and
 * each uses `step()` for readable runner / Interactions-panel output.
 *
 * The Selection element is the single focusable control (role="slider",
 * tabindex="0"). The regression guards below pin the contract fixes:
 *   - the keyboard focus ring is drawn via the NATIVE `:focus-visible`
 *     pseudo-class (Ark emits NO `data-focus-visible` on any part — the old
 *     `&[data-focus-visible]` selector was phantom and drew no ring);
 *   - the circle crop shape resolves a rounded selection.
 *
 * Note: Ark's ImageCropper exposes NO `disabled` prop, so the `data-disabled`
 * state (styled per the styling guide) is not reachable from React props and
 * is therefore not asserted here.
 */
const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

const meta: Meta<typeof ImageCropper> = {
  title: 'Components/Display/ImageCropper/Tests',
  component: ImageCropper,
  args: {
    src: SAMPLE_IMAGE,
    alt: 'Mountain landscape for cropping',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ImageCropper>;

/** Helper: the selection slider element, queried by data-part. */
function getSelection(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    "[data-scope='image-cropper'][data-part='selection']",
  );
}

/** The Helios anatomy: root group, decorative image, focusable slider, 8 handles. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('root is a labelled group (image is decorative)', async () => {
      // Query by data-part (scoped to this story's canvas) rather than the
      // accessible name — the root carries aria-busy while the image loads,
      // which can perturb name-based role queries under the full suite.
      const root = canvasElement.querySelector("[data-scope='image-cropper'][data-part='root']");
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('role', 'group');
      await expect(root).toHaveAttribute('aria-label', 'Image cropper');
    });

    await step('selection is a focusable slider in the tab order', async () => {
      const selection = getSelection(canvasElement);
      await expect(selection).not.toBeNull();
      await expect(selection).toHaveAttribute('role', 'slider');
      await expect(selection).toHaveAttribute('tabindex', '0');
    });

    await step('all 8 resize handles are present', async () => {
      const handles = canvasElement.querySelectorAll(
        "[data-scope='image-cropper'][data-part='handle']",
      );
      await expect(handles).toHaveLength(8);
    });

    await step('the rule-of-thirds grid renders both axes', async () => {
      const h = canvasElement.querySelector("[data-part='grid'][data-axis='horizontal']");
      const v = canvasElement.querySelector("[data-part='grid'][data-axis='vertical']");
      await expect(h).not.toBeNull();
      await expect(v).not.toBeNull();
    });
  },
};

/** Regression guard: keyboard focus draws a visible ring via :focus-visible.
 *  FAILS against the old phantom `&[data-focus-visible]` selector (which never
 *  matched, so the focused slider kept only its inset elevation shadow). */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const selection = getSelection(canvasElement)!;

    await step('selection is keyboard-reachable', async () => {
      await expect(selection).not.toBeNull();
      await expect(selection).not.toHaveAttribute('tabindex', '-1');
    });

    await step('the resting (unfocused) box-shadow is the inset elevation only', async () => {
      selection.blur();
      const resting = getComputedStyle(selection).boxShadow;
      // Stash for the after-focus comparison below.
      (selection as HTMLElement & { _resting?: string })._resting = resting;
      await expect(resting).not.toBe('none');
    });

    await step('keyboard focus renders a focus ring distinct from the resting shadow', async () => {
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike a programmatic .focus(). Under the full suite a
      // prior story can leave focus elsewhere in the shared document, so reset
      // focus to the body first and tab until the selection (the single
      // focusable control) receives focus — deterministic regardless of the
      // ambient starting point.
      (document.activeElement as HTMLElement | null)?.blur();
      await waitFor(async () => {
        await userEvent.tab();
        await expect(selection).toHaveFocus();
      });
      const focused = getComputedStyle(selection).boxShadow;
      const resting = (selection as HTMLElement & { _resting?: string })._resting;
      await expect(focused).not.toBe('none');
      await expect(focused).not.toBe('');
      await expect(focused).not.toBe(resting);
    });
  },
};

/** The circle crop shape resolves a rounded selection (data-shape='circle'). */
export const CircleShape: Story = {
  args: { cropShape: 'circle' },
  play: async ({ canvasElement, step }) => {
    await step('selection reports the circle shape', async () => {
      const selection = canvasElement.querySelector<HTMLElement>(
        "[data-scope='image-cropper'][data-part='selection'][data-shape='circle']",
      );
      await expect(selection).not.toBeNull();
    });

    await step('the circle selection resolves a non-zero border radius', async () => {
      const selection = getSelection(canvasElement)!;
      await expect(getComputedStyle(selection).borderTopLeftRadius).not.toBe('0px');
    });
  },
};
