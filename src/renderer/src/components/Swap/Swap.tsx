import { forwardRef } from 'react';

import { Swap as ArkSwap, type SwapRootProps } from '@ark-ui/react/swap';

import './Swap.css';

/**
 * Indicator size scale. Drives the local `--swap-indicator-font-size` custom
 * property on the root (see Swap.css `[data-size]`), so icon/text indicators
 * scale as one unit. Defaults to `medium`.
 */
export type SwapSize = 'small' | 'medium' | 'large';

export interface SwapProps extends SwapRootProps {
  /**
   * Content rendered when the swap is in the "on" state. Purely visual — the
   * accessible name/state must come from the interactive container that wraps
   * the Swap (e.g. a `<button aria-pressed>`), not from the indicator content.
   */
  onIndicator: React.ReactNode;
  /**
   * Content rendered when the swap is in the "off" state. Purely visual — see
   * `onIndicator`. Decorative glyph indicators should be wrapped/marked
   * `aria-hidden` by the consumer where appropriate.
   */
  offIndicator: React.ReactNode;
  /** Indicator size scale. Defaults to `medium`. */
  size?: SwapSize;
}

/**
 * Token-styled wrapper over Ark UI's Swap, a display-only primitive that
 * cross-fades between an "on" and an "off" indicator driven by its `swap`
 * prop.
 *
 * Anatomy (from @ark-ui/react/swap):
 *   Root > Indicator[type="on"] + Indicator[type="off"]
 *
 * Accessibility: the Swap is NOT interactive and exposes no ARIA of its own.
 * The visible state and accessible name come from the interactive container the
 * consumer wraps around it (the `ToggleButton` story shows the canonical
 * `<button aria-pressed>` pattern). Styling targets Ark's `data-scope`/
 * `data-part` attributes (per the unstyled-primitives-ark ADR) — no custom
 * class names.
 */
export const Swap = forwardRef<HTMLSpanElement, SwapProps>(function Swap(
  { onIndicator, offIndicator, size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkSwap.Root ref={ref} data-size={size} {...rootProps}>
      <ArkSwap.Indicator type="on">{onIndicator}</ArkSwap.Indicator>
      <ArkSwap.Indicator type="off">{offIndicator}</ArkSwap.Indicator>
      {children}
    </ArkSwap.Root>
  );
});
