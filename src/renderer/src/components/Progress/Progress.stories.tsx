import type { Meta, StoryObj } from '@storybook/react-vite';

import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Components/Feedback/Progress',
  component: Progress,
  args: {
    label: 'Loading',
    defaultValue: 50,
    min: 0,
    max: 100,
    size: 'medium',
    variant: 'neutral',
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    defaultValue: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    min: { control: 'number' },
    max: { control: 'number' },
    size: { control: 'inline-radio', options: ['small', 'medium'] },
    variant: { control: 'inline-radio', options: ['neutral', 'highlight'] },
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {};

export const Complete: Story = {
  args: { defaultValue: 100, label: 'Upload complete' },
};

export const Indeterminate: Story = {
  args: { value: null, label: 'Processing…' },
};

export const Small: Story = {
  args: { size: 'small', label: 'Syncing' },
};

export const Highlight: Story = {
  args: { variant: 'highlight', label: 'Indexing' },
};
