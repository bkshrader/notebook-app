import type { Meta, StoryObj } from '@storybook/react-vite';

import { FileInput } from './FileInput';

const meta: Meta<typeof FileInput> = {
  title: 'Components/Forms/FileInput',
  component: FileInput,
  args: {
    label: 'Attachment',
    triggerLabel: 'Choose file',
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    showDropzone: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {};

export const Required: Story = {
  args: { label: 'Resume', required: true },
};

export const Multiple: Story = {
  args: { label: 'Supporting documents', maxFiles: 5, triggerLabel: 'Choose files' },
};

export const WithDropzone: Story = {
  args: {
    label: 'Upload files',
    showDropzone: true,
    maxFiles: 5,
    triggerLabel: 'Browse',
  },
};

export const Disabled: Story = {
  args: { label: 'Attachment', disabled: true },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};
