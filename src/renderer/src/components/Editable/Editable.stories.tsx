import type { Meta, StoryObj } from '@storybook/react-vite';

import { Editable } from './Editable';

/**
 * Visual / documentation stories for the Editable.
 *
 * These are pristine: no `play` mutates the rendered state, so the docs gallery
 * renders them at rest. The interaction / accessibility tests (which DRIVE and
 * mutate state) live in `Editable.spec.stories.tsx` per the `*.spec.stories.tsx`
 * convention.
 */
const meta: Meta<typeof Editable> = {
  title: 'Components/Forms/Editable',
  component: Editable,
  args: {
    label: 'Display name',
    defaultValue: 'Jane Smith',
    placeholder: 'Enter a value…',
    size: 'medium',
    variant: 'default',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
    variant: {
      control: 'inline-radio',
      options: ['default', 'ghost'],
    },
    activationMode: {
      control: 'select',
      options: ['focus', 'dblclick', 'click', 'none'],
    },
    submitMode: {
      control: 'select',
      options: ['enter', 'blur', 'both', 'none'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Editable>;

export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: undefined },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

export const Invalid: Story = {
  args: { invalid: true },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};
