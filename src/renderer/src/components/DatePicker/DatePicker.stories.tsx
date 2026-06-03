import type { Meta, StoryObj } from '@storybook/react-vite';

import { DatePicker } from './DatePicker';

/**
 * Pristine, visual-only stories. State-MUTATING interaction/a11y play tests live
 * in `DatePicker.spec.stories.tsx` so these doc stories don't open/animate the
 * calendar on load (per the `*.spec.stories.tsx` convention).
 */
const meta: Meta<typeof DatePicker> = {
  title: 'Components/Forms/DatePicker',
  component: DatePicker,
  args: {
    label: 'Date',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: {
    label: 'Appointment',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Date (disabled)',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    label: 'Date (small)',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    label: 'Date (large)',
  },
};
