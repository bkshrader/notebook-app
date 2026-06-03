import type { Meta, StoryObj } from '@storybook/react-vite';

import { ToggleGroup } from './ToggleGroup';

const alignItems = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const formatItems = [
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'underline', label: 'Underline' },
];

const meta: Meta<typeof ToggleGroup> = {
  title: 'Components/Forms/ToggleGroup',
  component: ToggleGroup,
  args: { items: alignItems },
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['left'] },
};

export const Multiple: Story = {
  args: {
    items: formatItems,
    multiple: true,
    defaultValue: ['bold'],
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: ['left'] },
};

export const DisabledItem: Story = {
  args: {
    items: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center', disabled: true },
      { value: 'right', label: 'Right' },
    ],
  },
};

/**
 * Interaction / a11y regression tests live in `ToggleGroup.spec.stories.tsx`.
 * The visual stories above are pristine (no state-mutating `play`) so they do
 * not flash/animate on load in the docs gallery.
 */
