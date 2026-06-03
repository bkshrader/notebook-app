import type { Meta, StoryObj } from '@storybook/react-vite';

import { ButtonSet } from './ButtonSet';

/**
 * ButtonSet lays out a row (or column) of Buttons with consistent Helios
 * spacing. These visual stories are PRISTINE — no state-mutating `play`
 * functions — so they double as the docs gallery. Behavioural assertions live
 * in `ButtonSet.spec.stories.tsx`.
 *
 * There is no Button component in the library yet, so the laid-out children are
 * plain `<button>` controls (ButtonSet is layout-only and composes any
 * button-like child).
 */
const meta: Meta<typeof ButtonSet> = {
  title: 'Components/Actions/ButtonSet',
  component: ButtonSet,
  args: {
    'aria-label': 'Form actions',
    spacing: 'default',
    orientation: 'horizontal',
    align: 'start',
    children: (
      <>
        <button type="button">Save</button>
        <button type="button">Cancel</button>
      </>
    ),
  },
  argTypes: {
    spacing: { control: 'inline-radio', options: ['default', 'compact'] },
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    align: { control: 'inline-radio', options: ['start', 'end', 'between'] },
  },
};

export default meta;
type Story = StoryObj<typeof ButtonSet>;

export const Default: Story = {};

export const Compact: Story = {
  args: { spacing: 'compact', 'aria-label': 'Compact actions' },
};

export const Vertical: Story = {
  args: { orientation: 'vertical', 'aria-label': 'Stacked actions' },
};

export const SpaceBetween: Story = {
  args: {
    align: 'between',
    'aria-label': 'Wizard navigation',
    children: (
      <>
        <button type="button">Back</button>
        <button type="button">Continue</button>
      </>
    ),
  },
};

export const ThreeActions: Story = {
  args: {
    align: 'end',
    'aria-label': 'Dialog actions',
    children: (
      <>
        <button type="button">Discard</button>
        <button type="button">Save draft</button>
        <button type="button">Publish</button>
      </>
    ),
  },
};
