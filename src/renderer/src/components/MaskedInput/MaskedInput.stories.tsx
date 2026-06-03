import type { Meta, StoryObj } from '@storybook/react-vite';

import { MaskedInput } from './MaskedInput';

/**
 * Visual / documentation stories for the MaskedInput.
 *
 * State-MUTATING interaction tests live in `MaskedInput.spec.stories.tsx`
 * (the `*.spec.stories.tsx` convention): a `play` that toggles masking or drives
 * focus would make a doc story flash on load, so those are kept out of this
 * pristine gallery.
 */
const meta: Meta<typeof MaskedInput> = {
  title: 'Components/Forms/MaskedInput',
  component: MaskedInput,
  args: {
    label: 'API token',
    defaultValue: 'sk-1234567890abcdef',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    defaultMasked: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof MaskedInput>;

export const Default: Story = {};

export const Revealed: Story = {
  args: { defaultMasked: false },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};
