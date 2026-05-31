import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Display/Avatar',
  component: Avatar,
  args: { fallback: 'JD' },
  argTypes: {},
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

export const AriaContract: Story = {
  args: { fallback: 'PQ' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Root renders as a div — confirm it is present in the DOM
    const root = canvasElement.querySelector("[data-scope='avatar'][data-part='root']");
    await expect(root).not.toBeNull();

    // Fallback text is rendered and contains our initials
    const fallback = canvas.getByText('PQ');
    await expect(fallback).toBeTruthy();

    // The fallback element carries the correct data-part
    await expect(fallback.closest("[data-part='fallback']")).not.toBeNull();
  },
};
