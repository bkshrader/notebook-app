import type { Meta, StoryObj } from '@storybook/react-vite';

import { Switch } from './Switch';

/**
 * Visual / documentation stories for the Switch. State-mutating interaction and
 * a11y tests live in `Switch.spec.stories.tsx` (the `*.spec.stories.tsx`
 * convention) so these doc stories stay pristine and don't flip on load.
 */
const meta: Meta<typeof Switch> = {
  title: 'Components/Forms/Switch',
  component: Switch,
  args: {
    label: 'Wi-Fi',
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};
