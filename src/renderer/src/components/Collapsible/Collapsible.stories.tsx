import type { Meta, StoryObj } from '@storybook/react-vite';

import { Collapsible } from './Collapsible';

const meta: Meta<typeof Collapsible> = {
  title: 'Components/Disclosure/Collapsible',
  component: Collapsible,
  args: {
    label: 'What is Ark UI?',
    children:
      'Ark UI is a headless component library for building accessible, high-quality UI components.',
    size: 'medium',
    variant: 'card',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    open: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    variant: { control: 'inline-radio', options: ['card', 'ghost'] },
  },
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {};

export const InitialOpen: Story = {
  args: { defaultOpen: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
