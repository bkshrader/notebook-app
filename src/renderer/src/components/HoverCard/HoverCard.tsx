import { forwardRef } from 'react';

import { HoverCard as ArkHoverCard, type HoverCardRootProps } from '@ark-ui/react/hover-card';
import { Portal } from '@ark-ui/react/portal';

import './HoverCard.css';

export interface HoverCardProps extends HoverCardRootProps {
  /** Trigger element. Must be a focusable element for keyboard/screen-reader access. */
  trigger: React.ReactNode;
  /** Content rendered inside the hover card panel. */
  children: React.ReactNode;
}

export const HoverCard = forwardRef<HTMLDivElement, HoverCardProps>(function HoverCard(
  { trigger, children, ...rootProps },
  ref,
) {
  return (
    <ArkHoverCard.Root {...rootProps}>
      <ArkHoverCard.Trigger asChild>{trigger}</ArkHoverCard.Trigger>
      <Portal>
        <ArkHoverCard.Positioner>
          <ArkHoverCard.Content ref={ref}>
            <ArkHoverCard.Arrow>
              <ArkHoverCard.ArrowTip />
            </ArkHoverCard.Arrow>
            {children}
          </ArkHoverCard.Content>
        </ArkHoverCard.Positioner>
      </Portal>
    </ArkHoverCard.Root>
  );
});
