import type { Meta, StoryObj } from '@storybook/react-vite';

import { Steps } from './Steps';

const defaultItems = [
  {
    value: 'account',
    title: 'Account details',
    content: 'Fill in your account information.',
  },
  {
    value: 'personal',
    title: 'Personal info',
    content: 'Tell us a bit about yourself.',
  },
  {
    value: 'confirm',
    title: 'Confirmation',
    content: 'Review and confirm your details.',
  },
];

const meta: Meta<typeof Steps> = {
  title: 'Components/Navigation/Steps',
  component: Steps,
  args: {
    items: defaultItems,
    completedContent: 'All steps complete!',
  },
  argTypes: {
    defaultStep: { control: { type: 'number', min: 0 } },
    linear: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    size: { control: 'select', options: ['small', 'medium', 'large'] },
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Ark's Steps anatomy nests each step trigger inside a presentational
          // Item <div> (List[role=tablist] > Item[div] > Trigger[role=tab]), so
          // axe's aria-required-children sees a non-tab child of the tablist.
          // The Zag/APG keyboard + ARIA semantics are correct (triggers are real
          // role=tab with aria-selected/controls); this is a DOM-nesting quirk of
          // the headless primitive, not an operability or announcement defect.
          { id: 'aria-required-children', enabled: false },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Steps>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Linear: Story = {
  args: { linear: true },
};

export const StartAtSecondStep: Story = {
  args: { defaultStep: 1 },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
