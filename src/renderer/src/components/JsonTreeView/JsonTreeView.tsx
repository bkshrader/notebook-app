import { forwardRef } from 'react';

import {
  JsonTreeView as ArkJsonTreeView,
  type JsonTreeViewRootProps,
} from '@ark-ui/react/json-tree-view';

import './JsonTreeView.css';

/** Inline chevron SVG — no external icon dependency required. */
const ChevronRight = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 3l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

export interface JsonTreeViewProps extends JsonTreeViewRootProps {
  /**
   * Accessible label for the tree widget (WCAG 4.1.2 — Name, Role, Value).
   * Rendered as a visually-hidden `aria-label` on the root tree element so
   * screen readers announce it when the user enters the widget.
   */
  label: string;

  /*
   * NOTE: no `indentGuide` prop. Ark's `Tree` accepts one, but it delegates to
   * @zag-js/tree-view's `getBranchIndentGuideProps`, which does not exist in the
   * pinned zag-js version — so no indent-guide element is ever emitted and the
   * prop would be a confusing no-op. Nesting depth is conveyed by padding driven
   * by the `--depth` custom property in JsonTreeView.css instead. All other Ark
   * Root/Tree options (`data`, `defaultExpandedDepth`, `quotesOnKeys`,
   * `selectionMode`, `expandOnClick`, …) are inherited via JsonTreeViewRootProps.
   */
}

/**
 * Token-styled wrapper over Ark UI's JsonTreeView.
 *
 * Anatomy (from \@ark-ui/react/json-tree-view): Root > Tree.
 * The Tree renders the full recursive JSON structure using Ark's tree-view
 * primitives internally: branch, branch-control, branch-indicator, branch-text,
 * branch-content, item, item-text (verified against the live DOM).
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * JsonTreeView.css) per the unstyled-primitives-ark ADR — no custom class names.
 *
 * The widget carries `role="tree"` on the outermost interactive element;
 * individual nodes carry `role="treeitem"`. The `label` prop is forwarded as
 * `aria-label` on the Tree so the entire widget has an accessible name.
 */
export const JsonTreeView = forwardRef<HTMLDivElement, JsonTreeViewProps>(function JsonTreeView(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkJsonTreeView.Root ref={ref} {...rootProps}>
      <ArkJsonTreeView.Tree aria-label={label} arrow={<ChevronRight />} />
      {children}
    </ArkJsonTreeView.Root>
  );
});
