import { forwardRef } from 'react';

import {
  Highlight as ArkHighlight,
  type HighlightProps as ArkHighlightProps,
} from '@ark-ui/react/highlight';

import './Highlight.css';

// Highlight forwards Ark's props verbatim; the wrapper exists only to add the
// token-styling host span. Use a type alias rather than an empty interface
// (which @typescript-eslint/no-empty-object-type flags).
export type HighlightProps = ArkHighlightProps;

/**
 * Highlight — token-styled Ark UI text-highlight primitive.
 *
 * Wraps Ark's flat `<Highlight>` component (which renders native `<mark>`
 * elements) in a `<span data-component="highlight">` so that CSS can target
 * the marks via attribute selectors rather than class names.
 *
 * Props forwarded verbatim to Ark:
 *  - `text`        — the full string to render
 *  - `query`       — string or string[] to highlight
 *  - `ignoreCase`  — case-insensitive matching (default: true in Ark)
 *  - `matchAll`    — highlight all occurrences (default: true in Ark)
 *  - `exactMatch`  — whole-word matching
 */
export const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(
  function Highlight(props, ref) {
    return (
      <span ref={ref} data-component="highlight">
        <ArkHighlight {...props} />
      </span>
    );
  },
);
