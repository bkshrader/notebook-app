import type { Meta, StoryObj } from '@storybook/react-vite';

import { Toggle } from './Toggle';

/**
 * Pristine visual stories for the Toggle. State-MUTATING interaction/a11y
 * tests live in `Toggle.spec.stories.tsx` (the `*.spec.stories.tsx`
 * convention) so these doc stories never animate/flash on load.
 */
const meta: Meta<typeof Toggle> = {
  title: 'Components/Forms/Toggle',
  component: Toggle,
  args: {
    'aria-label': 'Bold',
    children: 'B',
    size: 'medium',
  },
  argTypes: {
    pressed: { control: 'boolean' },
    disabled: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Toggle>;

export const Default: Story = {};

export const Pressed: Story = {
  args: { defaultPressed: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledPressed: Story = {
  args: { disabled: true, defaultPressed: true },
};

/** The three sizes side by side. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Toggle {...args} size="small" aria-label="Bold (small)" />
      <Toggle {...args} size="medium" aria-label="Bold (medium)" />
      <Toggle {...args} size="large" aria-label="Bold (large)" />
    </div>
  ),
};
