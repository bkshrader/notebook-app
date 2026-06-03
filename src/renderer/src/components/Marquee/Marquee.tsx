import { forwardRef } from 'react';

import { Marquee as ArkMarquee, type MarqueeRootProps } from '@ark-ui/react/marquee';

import './Marquee.css';

/**
 * Token-styled wrapper over Ark UI's Marquee, a horizontally- or
 * vertically-scrolling strip of repeating content (partner logos, ticker
 * headlines, etc.).
 *
 * Helios ships no dedicated Marquee page, so the visual language is matched to
 * the closest Helios surfaces: the viewport uses the body typography stack and
 * neutral foreground, and the optional fade edges use the page surface token so
 * content dissolves into the background rather than hard-clipping.
 *
 * Anatomy (from @ark-ui/react/marquee):
 *   Root > Viewport > Content > Item   (+ optional Edge)
 *
 * `Content` is authored once; Ark internally renders `contentCount` copies of it
 * (one authored copy plus aria-hidden clones to fill the viewport), so the
 * wrapper never loops over the copies itself.
 *
 * Ark drives the scroll as a finite-state machine: the Root carries
 * `role="region"`, `aria-roledescription="marquee"`, `aria-live="off"`, a
 * required `aria-label`, and `data-state="idle|paused"` / `data-paused`. The CSS
 * animation itself is the consumer's responsibility — Ark only sets the
 * `--marquee-duration` / `--marquee-translate` custom properties on the Root.
 * Marquee.css defines the `marquee-scroll` keyframe on the Content part and is
 * the layer that MUST stop it under reduced motion.
 *
 * ACCESSIBILITY (WCAG 2.2.2 Pause, Stop, Hide + 2.3.3 Animation from
 * Interactions): the scroll animation is suppressed entirely under both the OS
 * `prefers-reduced-motion: reduce` media query AND the Storybook
 * `[data-reduced-motion='reduce']` toolbar attribute. `pauseOnInteraction`
 * defaults to `true` so the strip also halts on hover/focus, giving pointer and
 * keyboard users a way to stop motion to read the content.
 *
 * `label` is required (WCAG 4.1.2 / 1.3.1): the Root needs an accessible name
 * describing what is scrolling. It is forwarded to Ark's `translations.root`.
 */
export interface MarqueeProps extends Omit<MarqueeRootProps, 'translations'> {
  /**
   * Accessible name for the scrolling region, e.g. "Partner logos" or "Latest
   * headlines". Required (WCAG 4.1.2) — it becomes the Root's `aria-label`.
   */
  label: string;
  /** Show fading gradient edges that dissolve content into the surface. Defaults to `false`. */
  edges?: boolean;
}

/** The optional leading/trailing fade gradients (only the two scroll-axis sides). */
function MarqueeEdges() {
  return (
    <ArkMarquee.Context>
      {(api) => {
        const sides =
          api.orientation === 'vertical'
            ? (['top', 'bottom'] as const)
            : (['start', 'end'] as const);
        return sides.map((side) => <ArkMarquee.Edge key={side} side={side} />);
      }}
    </ArkMarquee.Context>
  );
}

/**
 * Token-styled Marquee. Children are the content of a single copy; Ark handles
 * the duplication, the scroll loop, and the pause-on-interaction wiring.
 */
export const Marquee = forwardRef<HTMLDivElement, MarqueeProps>(function Marquee(
  { label, edges = false, pauseOnInteraction = true, children, ...rootProps },
  ref,
) {
  return (
    <ArkMarquee.Root
      ref={ref}
      pauseOnInteraction={pauseOnInteraction}
      translations={{ root: label }}
      {...rootProps}
    >
      <ArkMarquee.Viewport>
        <ArkMarquee.Content>
          <ArkMarquee.Item>{children}</ArkMarquee.Item>
        </ArkMarquee.Content>
      </ArkMarquee.Viewport>
      {edges && <MarqueeEdges />}
    </ArkMarquee.Root>
  );
});
