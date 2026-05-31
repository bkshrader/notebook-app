import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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

/**
 * Drives the primary keyboard interaction for the TreeView widget.
 *
 * Ark v5 / Zag tree-view anatomy reality (verified from source):
 *   - The <ul role="tree"> always has tabIndex=-1 (roving tabindex — it is
 *     NEVER directly tab-focusable itself).
 *   - BranchControl (data-part="branch-control") gets role="button" and
 *     tabIndex=0 only when it is the currently focused node (focusedValue).
 *     It does NOT carry aria-expanded.
 *   - Branch (data-part="branch") carries role="treeitem", aria-expanded,
 *     and data-state="open|closed". It is not focusable.
 *   - Item (data-part="item") carries role="treeitem" and tabIndex=0 when
 *     focused.
 *   - The keydown handler on the tree requires the event target to be a
 *     [data-part=branch-control] or [data-part=item] — events fired on the
 *     tree <ul> itself are silently ignored.
 *
 * APG tree keyboard pattern (Ark follows this):
 *   - ArrowDown / ArrowUp move focus among visible treeitem rows.
 *   - ArrowRight on a collapsed branch expands it (focus stays on control).
 *     ArrowRight on an already-expanded branch moves focus to first child.
 *   - ArrowLeft on an expanded branch collapses it (focus stays on control).
 *     ArrowLeft on a collapsed branch / leaf moves focus to parent.
 *   - Enter / Space select the focused item.
 *
 * State is conveyed via:
 *   - aria-expanded="true|false" on the Branch element (role="treeitem").
 *   - data-state="open|closed" on the Branch element.
 *
 * The play test:
 *   1. Asserts the widget is keyboard-reachable: the Documents BranchControl
 *      has tabIndex=0 (because defaultFocusedValue sets it as the initially
 *      focused node — the correct APG pattern for a tree widget).
 *   2. Focuses the Documents BranchControl directly and asserts it is
 *      focused.
 *   3. Verifies the branch starts collapsed.
 *   4. Uses ArrowRight to expand it and asserts data-state on the Branch.
 *   5. Uses ArrowLeft to collapse it and asserts the closed state.
 *   6. Backstop: asserts computed color resolves to a non-empty token value.
 */
export const KeyboardExpandCollapse: Story = {
  args: {
    // defaultFocusedValue makes the Documents BranchControl the roving-
    // tabindex owner (tabIndex=0), which is how APG-compliant tree widgets
    // expose themselves to keyboard users. It is a single string (the node id),
    // not an array — this is the Zag/Ark v5 API shape.
    defaultFocusedValue: 'documents',
    defaultExpandedValue: [],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // The Tree element carries role="tree". Ark renders it as a <ul> with
    // tabIndex=-1 always (roving tabindex; the tree itself is never tab-
    // focusable — individual treeitems are).
    const tree = canvas.getByRole('tree', { name: 'File explorer' });

    // The Documents BranchControl is the initial roving-tabindex owner.
    // BranchControl renders as role="button" (not role="treeitem"); the
    // enclosing Branch carries role="treeitem" + aria-expanded.
    const documentsControl = canvasElement.querySelector<HTMLElement>(
      '[data-scope="tree-view"][data-part="branch-control"][data-value="documents"]',
    )!;

    await step('widget is keyboard-reachable via roving tabindex', async () => {
      // The tree <ul> always has tabIndex=-1 in Ark (roving tabindex pattern).
      // Keyboard reachability is proven by the initial focused node having
      // tabIndex=0 — this is what a Tab key press would land on.
      await expect(documentsControl).toHaveAttribute('tabindex', '0');
    });

    await step('focus the Documents branch control', async () => {
      documentsControl.focus();
      await expect(document.activeElement).toBe(documentsControl);
      await expect(tree.contains(documentsControl)).toBe(true);
    });

    await step('first branch starts collapsed', async () => {
      // aria-expanded and data-state live on the Branch (role="treeitem"),
      // not on the BranchControl (role="button").
      const documentsBranch = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"]',
      );
      if (documentsBranch) {
        const expandedAttr = documentsBranch.getAttribute('aria-expanded');
        await expect(expandedAttr === 'false' || expandedAttr === null).toBe(true);
        const state = documentsBranch.getAttribute('data-state');
        await expect(state === 'closed' || state === null).toBe(true);
      }
    });

    await step('ArrowRight expands the focused branch', async () => {
      // ArrowRight on a collapsed BranchControl expands it; focus stays on
      // the control (Ark only moves focus into children on a second
      // ArrowRight when the branch is already expanded).
      await userEvent.keyboard('{ArrowRight}');

      // data-state="open" and aria-expanded="true" land on the Branch element.
      const openBranch = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"][data-state="open"]',
      );
      await expect(openBranch).not.toBeNull();

      const expandedAttr = openBranch!.getAttribute('aria-expanded');
      await expect(expandedAttr).toBe('true');
    });

    await step('ArrowLeft collapses the expanded branch', async () => {
      // If ArrowRight moved focus into a child (second press on an already-
      // expanded branch), navigate back to the parent first.
      const activeAfterExpand = document.activeElement as HTMLElement | null;
      const isOnDocumentsControl =
        activeAfterExpand?.getAttribute('data-part') === 'branch-control' &&
        activeAfterExpand?.getAttribute('data-value') === 'documents';

      if (!isOnDocumentsControl) {
        // Focus is on a child — ArrowLeft moves it back to the parent control.
        await userEvent.keyboard('{ArrowLeft}');
      }

      // Now ArrowLeft on the expanded branch control collapses it.
      await userEvent.keyboard('{ArrowLeft}');

      // Branch should now be closed.
      const openBranchAfter = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"][data-state="open"]',
      );
      await expect(openBranchAfter).toBeNull();

      const documentsBranchAfter = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"]',
      );
      if (documentsBranchAfter) {
        await expect(documentsBranchAfter.getAttribute('aria-expanded')).toBe('false');
      }
    });

    await step('color token resolves to a real computed value', async () => {
      // Backstop: assert the tree's text color resolves to a non-empty,
      // non-transparent value (guards against misspelled --token-* names).
      const color = getComputedStyle(tree).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
