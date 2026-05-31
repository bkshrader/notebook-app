import { forwardRef } from 'react';

import { Pagination as ArkPagination, type PaginationRootProps } from '@ark-ui/react/pagination';

import './Pagination.css';

export interface PaginationProps extends PaginationRootProps {
  /**
   * Accessible label for the `<nav>` landmark. Required (WCAG 4.1.2): a
   * pagination nav with no accessible name is ambiguous when multiple
   * landmarks exist on the same page.
   */
  'aria-label'?: string;
}

/**
 * Token-styled wrapper over Ark UI's Pagination.
 *
 * Anatomy (from @ark-ui/react/pagination): Root (nav) > PrevTrigger, [Items |
 * Ellipsis via Context], NextTrigger. FirstTrigger and LastTrigger are included
 * for full keyboard reachability to first/last pages.
 *
 * Ark exposes the page list via Pagination.Context, which yields the `pages`
 * array — each entry is either `{ type: 'page', value: number }` or
 * `{ type: 'ellipsis' }`. We render page buttons via Pagination.Item and
 * ellipsis spans via Pagination.Ellipsis.
 *
 * Styling is attached to Ark's `data-scope` / `data-part` attributes (see
 * Pagination.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { children, 'aria-label': ariaLabel = 'Pagination', ...rootProps },
  ref,
) {
  return (
    <ArkPagination.Root ref={ref} aria-label={ariaLabel} {...rootProps}>
      <ArkPagination.FirstTrigger>&#171;</ArkPagination.FirstTrigger>
      <ArkPagination.PrevTrigger>&#8249;</ArkPagination.PrevTrigger>
      <ArkPagination.Context>
        {(pagination) =>
          pagination.pages.map((page, index) =>
            page.type === 'page' ? (
              <ArkPagination.Item key={index} {...page}>
                {page.value}
              </ArkPagination.Item>
            ) : (
              <ArkPagination.Ellipsis key={index} index={index}>
                &#8230;
              </ArkPagination.Ellipsis>
            ),
          )
        }
      </ArkPagination.Context>
      <ArkPagination.NextTrigger>&#8250;</ArkPagination.NextTrigger>
      <ArkPagination.LastTrigger>&#187;</ArkPagination.LastTrigger>
      {children}
    </ArkPagination.Root>
  );
});
