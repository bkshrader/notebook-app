import type { Meta, StoryObj } from '@storybook/react-vite';

import { Checkbox } from './Checkbox';

/**
 * Pristine visual stories for the Checkbox. These render a single static state
 * each and carry NO `play` function — the interaction / a11y regression guards
 * (which MUTATE state) live in `Checkbox.spec.stories.tsx` so these doc stories
 * don't toggle or flash on load.
 */
const meta: Meta<typeof Checkbox> = {
  title: 'Components/Forms/Checkbox',
  component: Checkbox,
  args: { label: 'Accept terms' },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Indeterminate: Story = { args: { checked: 'indeterminate' } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };
