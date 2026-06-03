import type { Meta, StoryObj } from '@storybook/react-vite';

import { Highlight } from './Highlight';

const meta: Meta<typeof Highlight> = {
  title: 'Components/Display/Highlight',
  component: Highlight,
  args: {
    text: 'Ark UI is a headless component library for building accessible web applications.',
    query: 'accessible',
  },
  argTypes: {
    query: { control: 'text' },
    ignoreCase: { control: 'boolean' },
    matchAll: { control: 'boolean' },
    exactMatch: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Highlight>;

export const Default: Story = {};

export const MultipleTerms: Story = {
  args: {
    query: ['headless', 'accessible', 'library'],
    text: 'Ark UI is a headless component library for building accessible web applications.',
  },
};

export const CaseSensitive: Story = {
  args: {
    query: 'ark',
    text: 'Ark UI is a headless component library. ark ui rocks.',
    ignoreCase: false,
  },
};
