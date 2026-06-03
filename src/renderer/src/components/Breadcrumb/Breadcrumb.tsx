import { forwardRef } from 'react';

import './Breadcrumb.css';

/**
 * A single breadcrumb entry. Either a link (interactive, `href` set) or the
 * current page (the last item — non-interactive per the Helios spec).
 *
 * The last item in the trail is ALWAYS the current page and is rendered as
 * non-interactive text marked `aria-current="page"` (WCAG 2.4.8 Location); the
 * wrapper enforces this regardless of whether an `href` was supplied on it.
 */
export interface BreadcrumbItem {
  /** Visible label for the entry. */
  text: React.ReactNode;
  /** Destination for a link entry. Ignored on the current (last) item. */
  href?: string;
  /**
   * Optional leading icon (e.g. a small glyph). Rendered before the text at the
   * Helios icon box (13px). Provide an already-accessible element or a
   * decorative one; the text remains the entry's accessible name.
   */
  icon?: React.ReactNode;
}

export interface BreadcrumbProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  'children' | 'aria-label'
> {
  /** The trail, root-first. The last item is treated as the current page. */
  items: BreadcrumbItem[];
  /**
   * Accessible name for the landmark `<nav>` (WCAG 2.4.1 / 4.1.2). Distinguishes
   * this navigation region from others on the page. Defaults to `'Breadcrumb'`.
   */
  label?: string;
  /**
   * When the trail is too wide for its container, allow the list to wrap onto
   * multiple rows instead of overflowing. Mirrors Helios `--items-can-wrap`.
   * Defaults to `false` (single row).
   */
  canWrap?: boolean;
}

/** A non-final entry: an anchor link styled as a breadcrumb link. */
function BreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  return (
    <a data-part="link" href={item.href}>
      {item.icon != null && (
        <span data-part="icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span data-part="text">{item.text}</span>
    </a>
  );
}

/** The final entry: the current page. Non-interactive, marked aria-current. */
function BreadcrumbCurrent({ item }: { item: BreadcrumbItem }) {
  return (
    <span data-part="current" aria-current="page">
      {item.icon != null && (
        <span data-part="icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span data-part="text">{item.text}</span>
    </span>
  );
}

/**
 * Breadcrumb — a token-styled secondary-navigation trail built to the Helios
 * Breadcrumb specification (https://helios.hashicorp.design/components/breadcrumb).
 *
 * Presentational/structural primitive: it is semantic markup (`<nav>` landmark
 * wrapping an ordered list of links and the current page) plus token styling,
 * with no focus-machine / open / selection state of its own — the only
 * interactive elements are plain anchors, which carry native keyboard and focus
 * behavior. Per the unstyled-primitives-ark ADR's scope clarification it is
 * therefore built on semantic HTML (`<nav> > <ol> > <li>`), NOT an Ark
 * primitive (there is no Ark `breadcrumb`). The truncation toggle+menu variant
 * Helios offers is the one stateful part; it is out of scope here and would be
 * composed over the Ark `Menu` primitive in a follow-up (see ADR follow-up).
 *
 * Accessibility contract (WAI-ARIA APG Breadcrumb pattern):
 *   - `<nav aria-label>` exposes a navigation landmark with a distinguishing name.
 *   - An ordered `<ol>` conveys the hierarchy/sequence to assistive tech.
 *   - The last item is the current page: non-interactive text with
 *     `aria-current="page"`. Links are real `<a href>` (native focus/keyboard).
 *   - Separators are decorative (CSS `::after` content), never focusable or
 *     announced.
 *
 * Styling targets our own `[data-part]` attributes set on the wrapper elements
 * (the plain-HTML convention from the ADR — no class names).
 */
export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(function Breadcrumb(
  { items, label = 'Breadcrumb', canWrap = false, ...rest },
  ref,
) {
  const lastIndex = items.length - 1;

  return (
    <nav ref={ref} data-part="root" aria-label={label} {...rest}>
      <ol data-part="list" data-can-wrap={canWrap ? 'true' : undefined}>
        {items.map((item, index) => {
          const isCurrent = index === lastIndex;
          return (
            <li data-part="item" key={index}>
              {isCurrent ? <BreadcrumbCurrent item={item} /> : <BreadcrumbLink item={item} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
