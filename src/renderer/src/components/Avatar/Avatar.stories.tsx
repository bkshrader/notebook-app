import type { Meta, StoryObj } from '@storybook/react-vite';

import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Display/Avatar',
  component: Avatar,
  args: { fallback: 'JD', size: 'medium' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/300?u=storybook',
    alt: 'Jane Doe',
    fallback: 'JD',
  },
};

export const Initials: Story = {
  args: { fallback: 'AB' },
};

export const Small: Story = {
  args: { size: 'small', fallback: 'SM' },
};

export const Large: Story = {
  args: { size: 'large', fallback: 'LG' },
};
