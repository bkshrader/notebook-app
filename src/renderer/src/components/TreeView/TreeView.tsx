import { forwardRef } from 'react';

import {
  TreeView as ArkTreeView,
  createTreeCollection,
  type TreeViewRootProps,
  type TreeViewNodeProviderProps,
} from '@ark-ui/react/tree-view';

import './TreeView.css';

/**
 * Shape of a tree node used by the default collection helpers.
 * Consumers may pass a custom generic to createTreeCollection if they need
 * additional fields; this matches the fixture used by stories.
 */
export interface TreeViewNode {
  id: string;
  name: string;
  children?: TreeViewNode[];
}

export interface TreeViewProps extends Omit<TreeViewRootProps<TreeViewNode>, 'collection'> {
  /**
   * Visible, screen-reader-announceable label for the tree widget.
   * Required (WCAG 4.1.2). Rendered via TreeView.Label which maps to
   * role="tree"'s accessible name.
   */
  label: React.ReactNode;
  /**
   * Root-level children of the tree (pre-built with createTreeCollection or
   * the exported helper buildCollection). Accepts the rootNode's children
   * array directly for convenience.
   */
  nodes: TreeViewNode[];
}

/**
 * Build a TreeCollection from a flat array of root children.
 * Re-exported so callers that need fine-grained control can build their own
 * collection and pass it via the underlying RootProps.
 */
export function buildCollection(nodes: TreeViewNode[]) {
  return createTreeCollection<TreeViewNode>({
    nodeToValue: (node) => node.id,
    nodeToString: (node) => node.name,
    rootNode: { id: 'ROOT', name: '', children: nodes },
  });
}

/** Recursive node renderer — handles both branch (folder) and leaf (file) nodes. */
function TreeNode({ node, indexPath }: TreeViewNodeProviderProps<TreeViewNode>) {
  return (
    <ArkTreeView.NodeProvider node={node} indexPath={indexPath}>
      {node.children ? (
        <ArkTreeView.Branch>
          <ArkTreeView.BranchControl>
            <ArkTreeView.BranchIndicator>
              {/* chevron rotated via CSS on data-state="open" */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ArkTreeView.BranchIndicator>
            <ArkTreeView.BranchText>{node.name}</ArkTreeView.BranchText>
          </ArkTreeView.BranchControl>
          <ArkTreeView.BranchContent>
            <ArkTreeView.BranchIndentGuide />
            {node.children.map((child, index) => (
              <TreeNode key={child.id} node={child} indexPath={[...indexPath, index]} />
            ))}
          </ArkTreeView.BranchContent>
        </ArkTreeView.Branch>
      ) : (
        <ArkTreeView.Item>
          <ArkTreeView.ItemText>{node.name}</ArkTreeView.ItemText>
        </ArkTreeView.Item>
      )}
    </ArkTreeView.NodeProvider>
  );
}

/**
 * Token-styled wrapper over Ark UI's TreeView.
 *
 * Anatomy (from @ark-ui/react/tree-view):
 *   Root > Label, Tree > NodeProvider > Branch | Item
 *   Branch = BranchControl (BranchIndicator, BranchText) + BranchContent
 *              (BranchIndentGuide, …nested nodes)
 *   Item = ItemText
 *
 * Styling is attached to Ark's data-scope / data-part attributes (see
 * TreeView.css) per the unstyled-primitives-ark ADR — no custom class names.
 * Depth-based indentation uses the CSS --depth variable Ark sets on each node.
 */
export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  { label, nodes, children, ...rootProps },
  ref,
) {
  const collection = buildCollection(nodes);
  return (
    <ArkTreeView.Root ref={ref} collection={collection} {...rootProps}>
      <ArkTreeView.Label>{label}</ArkTreeView.Label>
      <ArkTreeView.Tree>
        {collection.rootNode.children?.map((node, index) => (
          <TreeNode key={node.id} node={node} indexPath={[index]} />
        ))}
      </ArkTreeView.Tree>
      {children}
    </ArkTreeView.Root>
  );
});
