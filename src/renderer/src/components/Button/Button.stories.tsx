import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';

/**
 * Visual stories for the Button. PRISTINE — no `play` that mutates state, so the
 * docs gallery renders each variant statically. Interaction / a11y assertions
 * live in `Button.spec.stories.tsx`.
 *
 * A simple inline arrow glyph stands in for a real icon set in the icon stories.
 */
const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: 'Components/Actions/Button',
  component: Button,
  args: { children: 'Button', color: 'primary', size: 'medium' },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary', 'critical'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    isLoading: { control: 'boolean' },
    isFullWidth: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {};

export const Primary: Story = {
  args: { color: 'primary', children: 'Save changes' },
};

export const Secondary: Story = {
  args: { color: 'secondary', children: 'Cancel' },
};

export const Tertiary: Story = {
  args: { color: 'tertiary', children: 'Learn more' },
};

export const Critical: Story = {
  args: { color: 'critical', children: 'Delete Project' },
};

export const Small: Story = {
  args: { size: 'small', children: 'Small' },
};

export const Large: Story = {
  args: { size: 'large', children: 'Large' },
};

export const WithLeadingIcon: Story = {
  args: { children: 'Continue', trailingIcon: <Arrow /> },
};

export const IconOnly: Story = {
  args: { children: undefined, leadingIcon: <Arrow />, 'aria-label': 'Next' },
};

export const Loading: Story = {
  args: { isLoading: true, children: 'Saving' },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Unavailable' },
};

export const FullWidth: Story = {
  args: { isFullWidth: true, children: 'Full-width button' },
};
