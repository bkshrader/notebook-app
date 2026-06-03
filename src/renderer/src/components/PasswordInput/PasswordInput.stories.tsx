import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasswordInput } from './PasswordInput';

/**
 * Visual / documentation stories for the PasswordInput.
 *
 * State-MUTATING interaction tests live in `PasswordInput.spec.stories.tsx`
 * (the `*.spec.stories.tsx` convention): a `play` that toggles visibility or
 * drives focus would make a doc story flash/animate on load, so those are kept
 * out of this pristine gallery.
 */
const meta: Meta<typeof PasswordInput> = {
  title: 'Components/Forms/PasswordInput',
  component: PasswordInput,
  args: {
    label: 'Password',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof PasswordInput>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};
