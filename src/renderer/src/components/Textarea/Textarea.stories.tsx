import type { Meta, StoryObj } from '@storybook/react-vite';

import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Forms/Textarea',
  component: Textarea,
  args: {
    label: 'Notes',
    helperText: 'Add any additional context.',
    placeholder: 'Type your notes here…',
    rows: 4,
  },
  argTypes: {
    autoresize: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    required: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    rows: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const Invalid: Story = {
  args: {
    invalid: true,
    errorText: 'This field is required.',
    helperText: undefined,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: 'This content cannot be edited.',
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
    defaultValue: 'A fixed, read-only value.',
    helperText: 'This value cannot be changed.',
  },
};

export const Required: Story = {
  args: {
    required: true,
    showRequiredIndicator: true,
    label: 'Description',
    helperText: undefined,
  },
};

export const Autoresize: Story = {
  args: {
    autoresize: true,
    label: 'Auto-growing notes',
    helperText: 'The control grows to fit its content.',
    defaultValue: 'Line one\nLine two\nLine three',
  },
};
