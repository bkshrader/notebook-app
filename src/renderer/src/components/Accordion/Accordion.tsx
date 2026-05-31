import { forwardRef } from 'react';

import { Accordion as ArkAccordion, type AccordionRootProps } from '@ark-ui/react/accordion';

import './Accordion.css';

export interface AccordionItem {
  /** Unique identifier for this item. */
  value: string;
  /** Visible header text for the trigger button. Required (WCAG 4.1.2). */
  title: React.ReactNode;
  /** Content revealed when the item is open. */
  content: React.ReactNode;
  /** Whether this individual item is disabled. */
  disabled?: boolean;
}

export interface AccordionProps extends AccordionRootProps {
  /** Items to render. Each item's `title` becomes the trigger's accessible name. */
  items: AccordionItem[];
}

/**
 * Token-styled wrapper over Ark UI's Accordion.
 *
 * Anatomy (from @ark-ui/react/accordion):
 *   Root > Item > ItemTrigger (contains ItemIndicator) + ItemContent
 *
 * The trigger is a native `<button>` with `aria-expanded` and `aria-controls`
 * managed by Ark/Zag — no extra ARIA needed from the consumer. Styling is
 * attached to Ark's `data-scope` / `data-part` attributes (see Accordion.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  { items, children, ...rootProps },
  ref,
) {
  return (
    <ArkAccordion.Root ref={ref} {...rootProps}>
      {items.map((item) => (
        <ArkAccordion.Item key={item.value} value={item.value} disabled={item.disabled}>
          <ArkAccordion.ItemTrigger>
            {item.title}
            <ArkAccordion.ItemIndicator>
              {/* Chevron SVG — aria-hidden because the trigger text is the label */}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </ArkAccordion.ItemIndicator>
          </ArkAccordion.ItemTrigger>
          <ArkAccordion.ItemContent>
            <div data-scope="accordion" data-part="item-body">
              {item.content}
            </div>
          </ArkAccordion.ItemContent>
        </ArkAccordion.Item>
      ))}
      {children}
    </ArkAccordion.Root>
  );
});
