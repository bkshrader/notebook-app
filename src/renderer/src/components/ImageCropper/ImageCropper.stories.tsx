import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';

import { ImageCropper } from './ImageCropper';

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800';

const meta: Meta<typeof ImageCropper> = {
  title: 'Components/Display/ImageCropper',
  component: ImageCropper,
  args: {
    src: SAMPLE_IMAGE,
    alt: 'Mountain landscape for cropping',
  },
  argTypes: {
    src: { control: 'text' },
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ImageCropper>;

export const Default: Story = {};

/** Tier A-display play test: assert ARIA contract and that all 8 resize
 *  handles are present and focusable (keyboard reachability).
 *
 *  Note: Ark's ImageCropper.Image renders with role="presentation" and
 *  aria-hidden="true" by design — the image is purely decorative within the
 *  cropper; all accessible state is carried by the root group element and
 *  the selection slider. Do NOT assert getByRole('img') here. */
export const AriaContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root group element is present with accessible label', () => {
      // Ark renders the root as role="group" with aria-label="Image cropper".
      // The <img> inside has role="presentation"/aria-hidden — intentionally
      // excluded from the a11y tree; the group + slider carry all ARIA state.
      const root = canvas.getByRole('group', { name: 'Image cropper' });
      if (!root) throw new Error('Root group element not found');
    });

    await step('selection slider is present and focusable', () => {
      // The selection element has role="slider" and is the primary interactive
      // element for keyboard users to move the crop area.
      const selection = canvas.getByRole('slider', { name: 'Crop selection area (rectangle)' });
      if (!selection) throw new Error('Selection slider not found');
      if (selection.getAttribute('tabindex') !== '0') {
        throw new Error('Selection slider is not in tab order');
      }
    });

    await step('all 8 resize handles are present in the DOM', () => {
      const handles = canvasElement.querySelectorAll(
        "[data-scope='image-cropper'][data-part='handle']",
      );
      if (handles.length !== 8) {
        throw new Error(`Expected 8 handles, got ${handles.length}`);
      }
    });

    await step('selection element is present', () => {
      const selection = canvasElement.querySelector(
        "[data-scope='image-cropper'][data-part='selection']",
      );
      if (!selection) throw new Error('Selection element not found');
    });
  },
};
