import type { Meta, StoryObj } from '@storybook/react-vite';

import { Carousel, type CarouselSlide } from './Carousel';

const slides: CarouselSlide[] = [
  { id: 'one', content: 'Slide one — write your notes in plain Markdown.' },
  { id: 'two', content: 'Slide two — your Library lives as files on disk.' },
  { id: 'three', content: 'Slide three — no cloud account required.' },
];

const meta: Meta<typeof Carousel> = {
  title: 'Components/Display/Carousel',
  component: Carousel,
  args: {
    'aria-label': 'Feature highlights',
    slides,
    showIndicators: true,
  },
  argTypes: {
    showIndicators: { control: 'boolean' },
    autoplay: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Carousel>;

export const Default: Story = {};

export const Looping: Story = {
  args: { loop: true },
};

export const WithoutIndicators: Story = {
  args: { showIndicators: false },
};

export const MultipleSlidesPerPage: Story = {
  args: { slidesPerPage: 2, spacing: '16px' },
};
