import type { Meta, StoryObj } from '@storybook/react-vite';

import { JsonTreeView } from './JsonTreeView';

/** Shared fixture used across stories. */
const SAMPLE_DATA = {
  name: 'Ada Lovelace',
  age: 36,
  active: true,
  email: null,
  tags: ['mathematics', 'computing'],
  address: {
    street: '12 St James Square',
    city: 'London',
    country: 'GB',
  },
};

const meta: Meta<typeof JsonTreeView> = {
  title: 'Components/Display/JsonTreeView',
  component: JsonTreeView,
  args: {
    label: 'JSON data',
    data: SAMPLE_DATA,
    defaultExpandedDepth: 1,
  },
  argTypes: {
    defaultExpandedDepth: { control: { type: 'number', min: 0, max: 5 } },
    quotesOnKeys: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof JsonTreeView>;

/** Default view with the top level expanded. */
export const Default: Story = {};

/** Expand two levels deep so nested objects are immediately visible. */
export const ExpandedTwoLevels: Story = {
  args: { defaultExpandedDepth: 2 },
};

/** Collapsed root — all nodes start closed. */
export const FullyCollapsed: Story = {
  args: { defaultExpandedDepth: 0 },
};

/** Keys rendered with surrounding quotes (JSON-literal style). */
export const QuotedKeys: Story = {
  args: { defaultExpandedDepth: 2, quotesOnKeys: true },
};
