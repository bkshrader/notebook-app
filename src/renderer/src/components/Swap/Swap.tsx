import { forwardRef } from 'react';

import { Swap as ArkSwap, type SwapRootProps } from '@ark-ui/react/swap';

import './Swap.css';

export interface SwapProps extends SwapRootProps {
  /** Content rendered when the swap is in the "on" state. Required for screen-reader clarity. */
  onIndicator: React.ReactNode;
  /** Content rendered when the swap is in the "off" state. Required for screen-reader clarity. */
  offIndicator: React.ReactNode;
}

export const Swap = forwardRef<HTMLSpanElement, SwapProps>(function Swap(
  { onIndicator, offIndicator, children, ...rootProps },
  ref,
) {
  return (
    <ArkSwap.Root ref={ref} {...rootProps}>
      <ArkSwap.Indicator type="on">{onIndicator}</ArkSwap.Indicator>
      <ArkSwap.Indicator type="off">{offIndicator}</ArkSwap.Indicator>
      {children}
    </ArkSwap.Root>
  );
});
