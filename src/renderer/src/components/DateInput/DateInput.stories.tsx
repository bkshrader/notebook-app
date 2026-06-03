import { parseDate } from '@ark-ui/react/date-picker';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DateInput } from './DateInput';

const meta: Meta<typeof DateInput> = {
  title: 'Components/Forms/DateInput',
  component: DateInput,
  args: {
    label: 'Due date',
    size: 'medium',
    placeholder: 'yyyy-mm-dd',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    clearable: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof DateInput>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: [parseDate('2026-06-02')] },
};

export const Clearable: Story = {
  args: { clearable: true, defaultValue: [parseDate('2026-06-02')] },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: [parseDate('2026-06-02')] },
};
