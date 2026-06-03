import type { Meta, StoryObj } from '@storybook/react-vite';

import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Components/Navigation/Pagination',
  component: Pagination,
  args: {
    count: 100,
    pageSize: 10,
    siblingCount: 1,
    'aria-label': 'Results pagination',
  },
  argTypes: {
    count: { control: { type: 'number', min: 0 } },
    pageSize: { control: { type: 'number', min: 1 } },
    siblingCount: { control: { type: 'number', min: 0 } },
  },
};

export default meta;

type Story = StoryObj<typeof Pagination>;

/** Default state: page 1 of 10. First/prev triggers are disabled. */
export const Default: Story = {};

/** Mid-range page so that both prev and next triggers are enabled. */
export const MidPage: Story = {
  args: { defaultPage: 5 },
};

/** Large result set with siblingCount=2 — exercises ellipsis rendering. */
export const ManyPages: Story = {
  args: {
    count: 5000,
    pageSize: 20,
    siblingCount: 2,
    defaultPage: 50,
    'aria-label': 'Large dataset pagination',
  },
};

// Interaction / a11y tests (which MUTATE page state and move focus) live in
// Pagination.spec.stories.tsx so these doc stories stay pristine on load.
