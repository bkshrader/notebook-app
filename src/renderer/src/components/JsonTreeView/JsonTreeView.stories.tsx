import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

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

/**
 * A11y ARIA contract play test (Tier A-display).
 *
 * Asserts:
 * 1. The widget root carries `role="tree"` (structural role).
 * 2. Visible tree items carry `role="treeitem"`.
 * 3. The tree has an accessible name (forwarded `aria-label`).
 * 4. Branch controls are keyboard-reachable (not tabindex="-1").
 *
 * axe runs automatically via Storybook's a11y addon (preview.tsx sets
 * `a11y.test: 'error'`), so this play function focuses on the structural
 * ARIA contract rather than duplicating axe checks.
 */
export const AriaContract: Story = {
  args: { defaultExpandedDepth: 1 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('tree root has role="tree"', async () => {
      const tree = canvas.getByRole('tree');
      await expect(tree).toBeInTheDocument();
    });

    await step('tree has an accessible name via aria-label', async () => {
      const tree = canvas.getByRole('tree', { name: 'JSON data' });
      await expect(tree).toBeInTheDocument();
    });

    await step('at least one treeitem is rendered', async () => {
      const items = canvas.getAllByRole('treeitem');
      await expect(items.length).toBeGreaterThan(0);
    });

    await step('branch controls are keyboard-reachable', async () => {
      // Expanded branches expose their trigger via role="treeitem"; Ark gives
      // them a tabindex that places them in the natural tab order (not -1).
      const items = canvas.getAllByRole('treeitem');
      const firstItem = items[0];
      await expect(firstItem).not.toHaveAttribute('tabindex', '-1');
    });
  },
};
