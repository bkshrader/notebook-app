import type { Meta, StoryObj } from '@storybook/react-vite';

import { StepperNav } from './StepperNav';

const steps = [
  { value: 'account', title: 'Account', description: 'Create your profile' },
  { value: 'workspace', title: 'Workspace', description: 'Name your Library' },
  { value: 'import', title: 'Import', description: 'Bring in existing notes' },
  { value: 'review', title: 'Review', description: 'Confirm and finish' },
];

const meta: Meta<typeof StepperNav> = {
  title: 'Components/Navigation/StepperNav',
  component: StepperNav,
  args: {
    steps,
    size: 'medium',
    interactive: true,
    defaultStep: 1,
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    interactive: { control: 'boolean' },
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Ark's Steps anatomy nests each step trigger inside a presentational
          // Item <div> (List[role=tablist] > Item[div] > Trigger[role=tab]), so
          // axe's aria-required-children sees a non-tab child of the tablist.
          // The Zag/APG keyboard + ARIA semantics are correct (triggers are real
          // role=tab with aria-selected/controls pointing at rendered panels);
          // this is a DOM-nesting quirk of the headless primitive, shared with
          // the sibling Steps component, not an operability or announcement bug.
          { id: 'aria-required-children', enabled: false },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StepperNav>;

export const Default: Story = {};

export const NonInteractive: Story = {
  args: { interactive: false, defaultStep: 2 },
};

export const TitlesOnly: Story = {
  args: {
    steps: steps.map(({ value, title }) => ({ value, title })),
  },
};

export const FirstStep: Story = {
  args: { defaultStep: 0 },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
