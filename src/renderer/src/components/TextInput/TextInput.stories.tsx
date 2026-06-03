import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextInput } from './TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'Components/Forms/TextInput',
  component: TextInput,
  args: {
    'aria-label': 'Full name',
    placeholder: 'Jane Doe',
    size: 'medium',
    type: 'text',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'tel', 'url'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextInput>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'small', 'aria-label': 'Search', type: 'search', placeholder: 'Search' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Invalid: Story = {
  args: { 'aria-label': 'Email', type: 'email', invalid: true, defaultValue: 'not-an-email' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Read-only to you' },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 'Cannot edit this' },
};
