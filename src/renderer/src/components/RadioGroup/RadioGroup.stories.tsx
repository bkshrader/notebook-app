import type { Meta, StoryObj } from '@storybook/react-vite';

import { RadioGroup } from './RadioGroup';

const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'solid', label: 'Solid' },
  { value: 'vue', label: 'Vue' },
];

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Forms/RadioGroup',
  component: RadioGroup,
  args: {
    groupLabel: 'Framework',
    options: FRAMEWORKS,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
  },
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'solid' },
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal', defaultValue: 'react' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** A single option disabled while the rest of the group stays operable. */
export const OptionDisabled: Story = {
  args: {
    defaultValue: 'react',
    options: [
      { value: 'react', label: 'React' },
      { value: 'solid', label: 'Solid', disabled: true },
      { value: 'vue', label: 'Vue' },
    ],
  },
};
