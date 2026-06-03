import type { Meta, StoryObj } from '@storybook/react-vite';

import { Slider } from './Slider';

/**
 * Visual / documentation stories for the Slider.
 *
 * These stay pristine: no `play` function mutates the rendered value here, so
 * the docs gallery renders a stable control. Interaction and accessibility
 * regression guards live in `Slider.spec.stories.tsx` per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md).
 */
const meta: Meta<typeof Slider> = {
  title: 'Components/Forms/Slider',
  component: Slider,
  args: {
    label: 'Volume',
    showValueText: true,
    size: 'medium',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
    showValueText: { control: 'boolean' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
};

export default meta;

type Story = StoryObj<typeof Slider>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: [75] },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** Two thumbs — pass a multi-entry value array and a thumb renders per entry. */
export const Range: Story = {
  args: { label: 'Price range', defaultValue: [25, 75] },
};
