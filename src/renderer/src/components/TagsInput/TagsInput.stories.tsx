import type { Meta, StoryObj } from '@storybook/react-vite';

import { TagsInput } from './TagsInput';

const meta: Meta<typeof TagsInput> = {
  title: 'Components/Forms/TagsInput',
  component: TagsInput,
  args: {
    label: 'Tags',
    placeholder: 'Add tag…',
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TagsInput>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: ['react', 'typescript'],
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    defaultValue: ['react', 'typescript'],
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    defaultValue: ['react', 'typescript'],
  },
};

export const Invalid: Story = {
  args: {
    invalid: true,
    defaultValue: ['oops'],
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: ['disabled-tag'],
  },
};
