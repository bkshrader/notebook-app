import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tour } from './Tour';
import type { TourProps } from './Tour';

/** Steps shared across stories — two modal dialog-type steps. */
const defaultSteps: TourProps['steps'] = [
  {
    id: 'step-1',
    type: 'dialog',
    title: 'Welcome to the Tour',
    description: 'This tour will walk you through the key features of the app.',
    actions: [{ label: 'Next', action: 'next' }],
  },
  {
    id: 'step-2',
    type: 'dialog',
    title: 'Finish Up',
    description: 'You have reached the final step. Thanks for following along.',
    actions: [
      { label: 'Back', action: 'prev' },
      { label: 'Done', action: 'dismiss' },
    ],
  },
];

const meta: Meta<typeof Tour> = {
  title: 'Components/Overlays/Tour',
  component: Tour,
  /**
   * Tour uses a render-prop for the trigger (`children({ start })`), so each
   * story supplies a `render` function rather than declarative args for the
   * trigger label.
   */
  render: (args) => (
    <Tour {...args}>
      {({ start }) => (
        <button type="button" onClick={start}>
          Start Tour
        </button>
      )}
    </Tour>
  ),
  args: {
    steps: defaultSteps,
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
      description: 'Step-panel width scale.',
    },
  },
};

export default meta;

type Story = StoryObj<typeof Tour>;

/** Tour is closed — only the trigger button is visible. */
export const Default: Story = {};

/** Two-step tour showing navigation between steps. */
export const MultiStep: Story = {
  args: { steps: defaultSteps },
};

/** Smaller step-panel footprint. */
export const Small: Story = {
  args: { size: 'small' },
};

/** Larger step-panel footprint. */
export const Large: Story = {
  args: { size: 'large' },
};
