import { forwardRef } from 'react';

import {
  RatingGroup as ArkRatingGroup,
  type RatingGroupRootProps,
} from '@ark-ui/react/rating-group';

import './RatingGroup.css';

export interface RatingGroupProps extends RatingGroupRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   *
   * Ark's RatingGroup renders a `<label>` element via `RatingGroup.Label`;
   * providing this prop ensures the group is always named.
   */
  label: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's RatingGroup.
 *
 * Anatomy (from @ark-ui/react/rating-group):
 *   Root > Label, Control > Item (× count) > [star icon], HiddenInput
 *
 * Each Item is keyboard-navigable via arrow keys (APG "Slider" pattern).
 * The HiddenInput carries the numeric value for form submission. Styling
 * is attached to Ark's `data-scope`/`data-part` attributes (see
 * RatingGroup.css) per the unstyled-primitives-ark ADR — no custom class
 * names.
 */
export const RatingGroup = forwardRef<HTMLDivElement, RatingGroupProps>(function RatingGroup(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkRatingGroup.Root ref={ref} {...rootProps}>
      <ArkRatingGroup.Label>{label}</ArkRatingGroup.Label>
      <ArkRatingGroup.Control>
        <ArkRatingGroup.Context>
          {({ items }) =>
            items.map((item) => (
              <ArkRatingGroup.Item key={item} index={item}>
                <ArkRatingGroup.ItemContext>
                  {({ highlighted }) => (
                    <span
                      data-part="item-indicator"
                      data-highlighted={highlighted ? '' : undefined}
                    >
                      {/* Background (unfilled) star */}
                      <svg
                        data-bg=""
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      {/* Foreground (filled) star — clipped by highlight state via CSS */}
                      <svg
                        data-fg=""
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </span>
                  )}
                </ArkRatingGroup.ItemContext>
              </ArkRatingGroup.Item>
            ))
          }
        </ArkRatingGroup.Context>
        <ArkRatingGroup.HiddenInput />
      </ArkRatingGroup.Control>
      {children}
    </ArkRatingGroup.Root>
  );
});
