import type { Meta, StoryObj } from '@storybook/react-vite';

import { Clipboard } from './Clipboard';

const meta: Meta<typeof Clipboard> = {
  title: 'Components/Actions/Clipboard',
  component: Clipboard,
  args: {
    label: 'Copy link',
    value: 'https://example.com/share/abc123',
  },
  argTypes: {
    timeout: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Clipboard>;

export const Default: Story = {};

export const CustomTimeout: Story = {
  args: {
    timeout: 1500,
    label: 'Copy token',
    value: 'eyJhbGciOiJIUzI1NiJ9.payload.signature',
  },
};

/**
 * Empty value: Ark keeps the trigger operable (it does NOT disable it), so this
 * story just exercises the visual rendering with no value present. Interaction
 * coverage lives in Clipboard.spec.stories.tsx.
 */
export const EmptyValue: Story = {
  args: {
    label: 'Copy (empty)',
    value: '',
  },
};
