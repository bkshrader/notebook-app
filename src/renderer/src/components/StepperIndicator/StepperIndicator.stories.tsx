import type { Meta, StoryObj } from '@storybook/react-vite';

import { StepperIndicator } from './StepperIndicator';

const meta: Meta<typeof StepperIndicator> = {
  title: 'Components/Navigation/StepperIndicator',
  component: StepperIndicator,
  args: {
    label: 'Step 1 of 4',
    type: 'step',
    status: 'incomplete',
    step: 1,
  },
  argTypes: {
    type: { control: 'inline-radio', options: ['step', 'task'] },
    status: {
      control: 'inline-radio',
      options: ['incomplete', 'progress', 'processing', 'complete'],
    },
    step: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof StepperIndicator>;

export const Default: Story = {};

export const Progress: Story = {
  args: { label: 'Step 2 of 4: in progress', status: 'progress', step: 2 },
};

export const Processing: Story = {
  args: { label: 'Step 2 of 4: processing', status: 'processing', step: 2 },
};

export const Complete: Story = {
  args: { label: 'Step 1 of 4: complete', status: 'complete', step: 1 },
};

export const TaskIncomplete: Story = {
  args: { label: 'Task: not started', type: 'task', status: 'incomplete' },
};

export const TaskComplete: Story = {
  args: { label: 'Task: complete', type: 'task', status: 'complete' },
};
