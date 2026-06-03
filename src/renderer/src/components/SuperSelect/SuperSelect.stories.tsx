import type { Meta, StoryObj } from '@storybook/react-vite';

import { SuperSelect } from './SuperSelect';

const regions = [
  { label: 'North America', value: 'na' },
  { label: 'South America', value: 'sa' },
  { label: 'Europe', value: 'eu' },
  { label: 'Asia Pacific', value: 'ap' },
  { label: 'Middle East', value: 'me' },
  { label: 'Africa', value: 'af' },
];

const meta: Meta<typeof SuperSelect> = {
  title: 'Components/Forms/SuperSelect',
  component: SuperSelect,
  args: {
    label: 'Region',
    items: regions,
    placeholder: 'Search regions…',
    size: 'medium',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    multiple: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;
type Story = StoryObj<typeof SuperSelect>;

/* Pristine visual stories only — no state-mutating `play`. Interaction and
   regression-guard tests live in SuperSelect.spec.stories.tsx so these stories
   render statically (they do not animate/open on load). */

export const Default: Story = {};

export const Multiple: Story = {
  args: { multiple: true, placeholder: 'Search regions…' },
};

export const MultipleWithSelection: Story = {
  args: { multiple: true, defaultValue: ['na', 'eu'] },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: ['eu'] },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['eu'] },
};
