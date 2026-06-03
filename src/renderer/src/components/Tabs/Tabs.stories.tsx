import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tabs } from './Tabs';

const defaultItems = [
  { value: 'account', label: 'Account', content: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', content: 'Change your password here.' },
  { value: 'billing', label: 'Billing', content: 'Manage your billing and payment details.' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  args: {
    items: defaultItems,
    defaultValue: 'account',
    size: 'medium',
  },
  argTypes: {
    defaultValue: { control: 'text' },
    size: { control: 'inline-radio', options: ['medium', 'large'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    activationMode: { control: 'inline-radio', options: ['automatic', 'manual'] },
  },
};

export default meta;

type Story = StoryObj<typeof Tabs>;

/** Default horizontal tabs with three panels. */
export const Default: Story = {};

/** Large size — taller triggers with wider horizontal padding. */
export const Large: Story = {
  args: { size: 'large' },
};

/** Vertical orientation — triggers stack and the divider moves to the side. */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

/** First tab disabled — the trigger is inert and the panel is not reachable. */
export const WithDisabledTab: Story = {
  args: {
    items: [
      { value: 'account', label: 'Account', content: 'Account settings.', disabled: true },
      { value: 'password', label: 'Password', content: 'Change your password here.' },
      { value: 'billing', label: 'Billing', content: 'Manage your billing details.' },
    ],
    defaultValue: 'password',
  },
};
