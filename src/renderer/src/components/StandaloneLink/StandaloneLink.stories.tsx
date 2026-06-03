import type { Meta, StoryObj } from '@storybook/react-vite';

import { StandaloneLink } from './StandaloneLink';

/** A small decorative arrow glyph used to demo the leading/trailing icon slot. */
const ArrowIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const meta: Meta<typeof StandaloneLink> = {
  title: 'Components/Navigation/StandaloneLink',
  component: StandaloneLink,
  args: {
    children: 'View clusters',
    href: '#destination',
    color: 'primary',
    size: 'medium',
    iconPosition: 'leading',
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    iconPosition: {
      control: 'inline-radio',
      options: ['leading', 'trailing'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StandaloneLink>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { children: 'Learn more about Vault', color: 'secondary' },
};

export const WithLeadingIcon: Story = {
  args: { children: 'Back to overview', icon: ArrowIcon, iconPosition: 'leading' },
};

export const WithTrailingIcon: Story = {
  args: { children: 'View clusters', icon: ArrowIcon, iconPosition: 'trailing' },
};

export const Small: Story = {
  args: { children: 'View details', size: 'small' },
};

export const Large: Story = {
  args: { children: 'Get started', size: 'large' },
};
