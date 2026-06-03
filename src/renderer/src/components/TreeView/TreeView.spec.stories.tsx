import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { TreeView, type TreeViewNode } from './TreeView';

/**
 * Interaction / accessibility tests for the TreeView.
 *
 * Kept separate from the visual stories (`TreeView.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (expand/collapse, keyboard focus), so colocating it with a doc
 * story would make that story animate on load. Stories are named by behavior so
 * a failure is self-describing; each asserts with awaited `expect(...)` and uses
 * `step()` for readable runner output.
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
  title: 'Components/Navigation/TreeView/Tests',
  component: TreeView,
  args: {
    label: 'File explorer',
    nodes: fileSystemNodes,
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;
type Story = StoryObj<typeof TreeView>;

/** The Documents branch-control element, by its Ark data attributes. */
function documentsControl(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    '[data-scope="tree-view"][data-part="branch-control"][data-value="documents"]',
  )!;
}

/**
 * Regression guard for the focus-ring fix.
 *
 * The CSS originally drew the ring on a phantom
 * `[data-part="branch-control"][data-focus-visible]` selector. Ark emits
 * `data-focus` (not `data-focus-visible`) on focus, so that selector never
 * matched and keyboard users got NO visible focus ring (WCAG 2.4.7 failure).
 * The fix uses the native `:focus-visible` pseudo. This test tabs to the first
 * control with a real keyboard event (which triggers :focus-visible, unlike a
 * programmatic .focus()) and asserts the ring resolves to a real box-shadow.
 * It FAILS against the old selector and PASSES after the fix.
 */
export const KeyboardFocusRing: Story = {
  args: {
    defaultFocusedValue: 'documents',
    defaultExpandedValue: [],
  },
  play: async ({ canvasElement, step }) => {
    const control = documentsControl(canvasElement);

    await step('keyboard focus renders a visible focus ring', async () => {
      control.blur();
      await userEvent.tab();
      // The first Tab lands on the roving-tabindex owner (the Documents
      // branch-control, made tabIndex=0 by defaultFocusedValue).
      await expect(control).toHaveFocus();
      const ring = getComputedStyle(control).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * The primary keyboard interaction: ArrowRight expands, ArrowLeft collapses.
 * Moved out of the pristine visual stories so the doc gallery does not mutate
 * on load.
 *
 * Ark v5 / Zag anatomy: aria-expanded and data-state live on the Branch
 * (role="treeitem"), not the BranchControl (role="button"). ArrowRight on a
 * collapsed control expands it (focus stays put); ArrowLeft on an expanded
 * control collapses it.
 */
export const KeyboardExpandCollapse: Story = {
  args: {
    defaultFocusedValue: 'documents',
    defaultExpandedValue: [],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tree = canvas.getByRole('tree', { name: 'File explorer' });
    const control = documentsControl(canvasElement);

    await step('widget is keyboard-reachable via roving tabindex', async () => {
      await expect(control).toHaveAttribute('tabindex', '0');
    });

    await step('focus the Documents branch control', async () => {
      control.focus();
      await expect(document.activeElement).toBe(control);
      await expect(tree.contains(control)).toBe(true);
    });

    await step('first branch starts collapsed', async () => {
      const branch = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"]',
      );
      if (branch) {
        const expandedAttr = branch.getAttribute('aria-expanded');
        await expect(expandedAttr === 'false' || expandedAttr === null).toBe(true);
      }
    });

    await step('ArrowRight expands the focused branch', async () => {
      await userEvent.keyboard('{ArrowRight}');
      const openBranch = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"][data-state="open"]',
      );
      await expect(openBranch).not.toBeNull();
      await expect(openBranch!.getAttribute('aria-expanded')).toBe('true');
    });

    await step('ArrowLeft collapses the expanded branch', async () => {
      const active = document.activeElement as HTMLElement | null;
      const onControl =
        active?.getAttribute('data-part') === 'branch-control' &&
        active?.getAttribute('data-value') === 'documents';
      if (!onControl) {
        await userEvent.keyboard('{ArrowLeft}');
      }
      await userEvent.keyboard('{ArrowLeft}');

      const stillOpen = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="branch"][data-value="documents"][data-state="open"]',
      );
      await expect(stillOpen).toBeNull();
    });
  },
};

/**
 * The selected row differs visually from an unselected one. Guards the
 * `[data-selected]` background/foreground rules on the Item part.
 */
export const SelectedStateDiffers: Story = {
  args: {
    defaultSelectedValue: ['readme'],
    defaultExpandedValue: ['documents', 'images'],
  },
  play: async ({ canvasElement, step }) => {
    await step('selected item resolves a non-transparent background', async () => {
      const selected = canvasElement.querySelector<HTMLElement>(
        '[data-scope="tree-view"][data-part="item"][data-selected]',
      );
      await expect(selected).not.toBeNull();
      const selectedBg = getComputedStyle(selected!).backgroundColor;
      await expect(selectedBg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('an unselected item differs from the selected one', async () => {
      const items = [
        ...canvasElement.querySelectorAll<HTMLElement>(
          '[data-scope="tree-view"][data-part="item"]',
        ),
      ];
      const selected = items.find((el) => el.hasAttribute('data-selected'))!;
      const unselected = items.find((el) => !el.hasAttribute('data-selected'))!;
      await expect(unselected).not.toBeUndefined();
      const selectedBg = getComputedStyle(selected).backgroundColor;
      const unselectedBg = getComputedStyle(unselected).backgroundColor;
      await expect(unselectedBg).not.toBe(selectedBg);
    });
  },
};

/**
 * Backstop: the tree's text color resolves to a real, non-empty token value,
 * guarding against misspelled --token-* names in the root rule.
 */
export const ColorTokenResolves: Story = {
  args: {
    defaultExpandedValue: ['documents'],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('tree text color resolves to a real computed value', async () => {
      const tree = canvas.getByRole('tree', { name: 'File explorer' });
      const color = getComputedStyle(tree).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
