import type { Meta, StoryObj } from '@storybook/react-vite';

import { InlineLink } from './InlineLink';

const meta: Meta<typeof InlineLink> = {
  title: 'Components/Navigation/InlineLink',
  component: InlineLink,
  args: {
    children: 'read the documentation',
    href: 'https://helios.hashicorp.design/components/link/inline',
    color: 'primary',
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
    iconPosition: {
      control: 'inline-radio',
      options: ['leading', 'trailing'],
    },
  },
  // Render inside running text so the inline-in-text intent is obvious.
  decorators: [
    (Story) => (
      <p style={{ maxWidth: '40ch' }}>
        For the full token reference, <Story /> before filing an issue.
      </p>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InlineLink>;

/** A decorative external-link glyph used to show the icon slots. */
const ExternalIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10" />
    <path d="M10 2h4v4M14 2 7 9" />
  </svg>
);

export const Default: Story = {};

export const Primary: Story = {
  args: { color: 'primary', children: 'the primary variant' },
};

export const Secondary: Story = {
  args: { color: 'secondary', children: 'the secondary variant' },
};

export const TrailingIcon: Story = {
  args: {
    children: 'open the changelog',
    icon: ExternalIcon,
    iconPosition: 'trailing',
  },
};

export const LeadingIcon: Story = {
  args: {
    children: 'open the changelog',
    icon: ExternalIcon,
    iconPosition: 'leading',
  },
};
