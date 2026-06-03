import type { Meta, StoryObj } from '@storybook/react-vite';

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

/** A circular crop area (e.g. for an avatar). */
export const Circle: Story = {
  args: { cropShape: 'circle', aspectRatio: 1 },
};

/** A fixed 16:9 crop area — the selection cannot be resized away from ratio. */
export const FixedAspectRatio: Story = {
  args: { aspectRatio: 16 / 9 },
};
