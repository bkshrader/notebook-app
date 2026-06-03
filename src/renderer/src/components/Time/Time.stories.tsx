import type { Meta, StoryObj } from '@storybook/react-vite';

import { Time } from './Time';

/**
 * Time renders a formatted, machine-readable timestamp on a native `<time>`
 * element (Helios Time: https://helios.hashicorp.design/components/time). The
 * `datetime` attribute always carries the unambiguous ISO value while the
 * visible text follows the chosen `display` style.
 *
 * These are the pristine visual stories; behavioral/a11y assertions live in
 * `Time.spec.stories.tsx`.
 */
const meta: Meta<typeof Time> = {
  title: 'Components/Display/Time',
  component: Time,
  args: {
    date: '2024-10-16T13:30:00.000Z',
    display: 'friendly',
  },
  argTypes: {
    display: {
      control: 'inline-radio',
      options: ['date', 'time', 'date-time', 'relative', 'friendly'],
    },
    locale: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Time>;

export const Default: Story = {};

export const DateOnly: Story = {
  args: { display: 'date' },
};

export const TimeOnly: Story = {
  args: { display: 'time' },
};

export const DateAndTime: Story = {
  args: { display: 'date-time' },
};

export const Relative: Story = {
  args: { display: 'relative' },
};

export const Range: Story = {
  args: {
    date: '2024-10-14T04:00:00.000Z',
    to: '2024-10-16T04:00:00.000Z',
    display: 'date',
  },
};
