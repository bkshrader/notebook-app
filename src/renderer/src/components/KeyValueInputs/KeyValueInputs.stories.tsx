import type { Meta, StoryObj } from '@storybook/react-vite';

import { KeyValueInputs } from './KeyValueInputs';

const meta: Meta<typeof KeyValueInputs> = {
  title: 'Components/Forms/KeyValueInputs',
  component: KeyValueInputs,
  args: {
    legend: 'Environment variables',
    keyPlaceholder: 'KEY',
    valuePlaceholder: 'value',
    size: 'medium',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof KeyValueInputs>;

export const Default: Story = {};

export const WithHelperText: Story = {
  args: {
    legend: 'Tags',
    helperText: 'Add as many key/value pairs as you need. Each row is submitted together.',
    keyLabel: 'Name',
    valueLabel: 'Value',
  },
};

export const Prefilled: Story = {
  args: {
    legend: 'Request headers',
    defaultRows: [
      { id: 'h-1', key: 'Content-Type', value: 'application/json' },
      { id: 'h-2', key: 'Accept', value: 'application/json' },
    ],
  },
};

export const Small: Story = {
  args: { size: 'small', legend: 'Labels' },
};

export const Large: Story = {
  args: { size: 'large', legend: 'Metadata' },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultRows: [{ id: 'd-1', key: 'region', value: 'us-east-1' }],
  },
};
