import type { Meta, StoryObj } from '@storybook/react-vite';

import { Combobox } from './Combobox';

const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Angular', value: 'angular' },
];

const meta: Meta<typeof Combobox> = {
  title: 'Components/Forms/Combobox',
  component: Combobox,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Search frameworks…',
    size: 'medium',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

/* Pristine visual stories only — no state-mutating `play`. Interaction and
   regression-guard tests live in Combobox.spec.stories.tsx so these stories
   render statically (they do not animate/open on load). */

export const Default: Story = {};

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
  args: { readOnly: true, defaultValue: ['react'] },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['react'] },
};
