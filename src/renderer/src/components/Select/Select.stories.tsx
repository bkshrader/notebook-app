import type { Meta, StoryObj } from '@storybook/react-vite';

import { Select } from './Select';

const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
];

const meta: Meta<typeof Select> = {
  title: 'Components/Forms/Select',
  component: Select,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Select a framework',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['react'] },
};

export const Invalid: Story = {
  args: { invalid: true, defaultValue: ['react'] },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Clearable: Story = {
  args: { clearable: true, defaultValue: ['react'] },
};
