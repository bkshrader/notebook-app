import type { Meta, StoryObj } from '@storybook/react-vite';

import { TreeView, type TreeViewNode } from './TreeView';

/**
 * Nested fixture that exercises branch (folder) and leaf (file) nodes at
 * multiple depths. Built inline — no createTreeCollection needed in stories
 * because the TreeView wrapper's buildCollection helper handles it.
 */
const fileSystemNodes: TreeViewNode[] = [
  {
    id: 'documents',
    name: 'Documents',
    children: [
      {
        id: 'research',
        name: 'Research',
        children: [
          { id: 'paper-1', name: 'paper-draft.md' },
          { id: 'paper-2', name: 'bibliography.md' },
        ],
      },
      { id: 'notes-md', name: 'notes.md' },
    ],
  },
  {
    id: 'images',
    name: 'Images',
    children: [
      { id: 'photo-1', name: 'diagram.png' },
      { id: 'photo-2', name: 'screenshot.png' },
    ],
  },
  { id: 'readme', name: 'README.md' },
];

const meta: Meta<typeof TreeView> = {
  title: 'Components/Navigation/TreeView',
  component: TreeView,
  args: {
    label: 'File explorer',
    nodes: fileSystemNodes,
  },
};

export default meta;
type Story = StoryObj<typeof TreeView>;

/** Default render with no pre-expanded branches. */
export const Default: Story = {};

/** All top-level branches pre-expanded via defaultExpandedValue. */
export const PreExpanded: Story = {
  args: {
    defaultExpandedValue: ['documents', 'images'],
  },
};

/** A single item pre-selected. */
export const PreSelected: Story = {
  args: {
    defaultSelectedValue: ['readme'],
    defaultExpandedValue: ['documents', 'images'],
  },
};
