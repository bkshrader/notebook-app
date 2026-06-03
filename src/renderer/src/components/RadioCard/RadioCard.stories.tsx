import type { Meta, StoryObj } from '@storybook/react-vite';

import { RadioCard } from './RadioCard';

const PLANS = [
  { value: 'free', label: 'Free', description: 'For personal projects and evaluation.' },
  { value: 'pro', label: 'Pro', description: 'For small teams shipping to production.' },
  {
    value: 'enterprise',
    label: 'Enterprise',
    description: 'Dedicated support, SSO, and audit logging.',
  },
];

const meta: Meta<typeof RadioCard> = {
  title: 'Components/Forms/RadioCard',
  component: RadioCard,
  args: {
    groupLabel: 'Plan',
    options: PLANS,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
};

export default meta;

type Story = StoryObj<typeof RadioCard>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'pro' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical', defaultValue: 'free' },
};

/** Cards with a label only (no supporting description). */
export const LabelOnly: Story = {
  args: {
    options: [
      { value: 'react', label: 'React' },
      { value: 'solid', label: 'Solid' },
      { value: 'vue', label: 'Vue' },
    ],
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'pro' },
};

/** A single card disabled while the rest of the group stays operable. */
export const OptionDisabled: Story = {
  args: {
    defaultValue: 'free',
    options: [
      { value: 'free', label: 'Free', description: 'For personal projects and evaluation.' },
      {
        value: 'pro',
        label: 'Pro',
        description: 'Currently unavailable in your region.',
        disabled: true,
      },
      { value: 'enterprise', label: 'Enterprise', description: 'Dedicated support and SSO.' },
    ],
  },
};
