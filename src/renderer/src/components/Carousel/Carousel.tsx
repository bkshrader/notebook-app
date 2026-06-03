import { forwardRef, useEffect, useState } from 'react';

import { Carousel as ArkCarousel, type CarouselRootProps } from '@ark-ui/react/carousel';

import './Carousel.css';

/**
 * One slide's worth of content. `id` is a stable React key; `content` is the
 * rendered slide body (any node — image, card, text).
 */
export interface CarouselSlide {
  /** Stable key for the slide. */
  id: string;
  /** The slide body. */
  content: React.ReactNode;
}

export interface CarouselProps extends Omit<CarouselRootProps, 'slideCount'> {
  /**
   * Accessible label for the carousel `region` landmark. Required (WCAG 4.1.2):
   * Ark sets `role="region"` + `aria-roledescription="carousel"` on the root,
   * which is ambiguous to AT without a name distinguishing it from other
   * regions on the page.
   */
  'aria-label': string;
  /** The slides to render. Their count drives Ark's snap-point computation. */
  slides: CarouselSlide[];
  /**
   * Whether to advance slides automatically. Honored ONLY when the user has not
   * requested reduced motion — under `prefers-reduced-motion: reduce` autoplay
   * is force-disabled (WCAG 2.2.2 Pause, Stop, Hide / 2.3.3 Animation from
   * Interactions). Pass `true` for the 4000ms default, or `{ delay }` in ms.
   * @default false
   */
  autoplay?: boolean | { delay: number };
  /** Whether to show the slide-position indicator dots. @default true */
  showIndicators?: boolean;
}

/**
 * Reads the user's reduced-motion preference and keeps it live. Extracted so the
 * wrapper body stays a flat render with no inline effect/ternary nesting (keeps
 * cyclomatic complexity low — see Field.tsx).
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * The prev/next paging controls. A small presentational sub-component so the
 * Root render reads top-to-bottom without nested JSX branches.
 */
function CarouselControls() {
  return (
    <ArkCarousel.Control>
      <ArkCarousel.PrevTrigger aria-label="Previous slide">&#8249;</ArkCarousel.PrevTrigger>
      <ArkCarousel.NextTrigger aria-label="Next slide">&#8250;</ArkCarousel.NextTrigger>
    </ArkCarousel.Control>
  );
}

/**
 * The slide-position indicator dots. Ark drives `data-current` on the active
 * dot and gives each an accessible name via its translations.
 */
function CarouselIndicators({ count }: { count: number }) {
  return (
    <ArkCarousel.IndicatorGroup>
      {Array.from({ length: count }, (_, index) => (
        <ArkCarousel.Indicator key={index} index={index} />
      ))}
    </ArkCarousel.IndicatorGroup>
  );
}

/**
 * Token-styled wrapper over Ark UI's Carousel, matching the closest Helios
 * visual language (no dedicated Helios Carousel page; tokens and control styling
 * mirror the Helios Pagination/Card surfaces).
 *
 * Anatomy (from @ark-ui/react/carousel):
 *   Root > ItemGroup > Item[] , Control > PrevTrigger + NextTrigger ,
 *   IndicatorGroup > Indicator[]
 *
 * Ark/Zag owns the interaction contract (verified against the live machine):
 *   - Root: role="region", aria-roledescription="carousel".
 *   - ItemGroup: role="group", aria-live toggles "polite"/"off" with autoplay.
 *   - Item: aria-roledescription="slide", data-inview on the visible slide(s).
 *   - Prev/Next/Indicator are native <button>s; arrow/Home/End keyboard paging
 *     and roving focus come from Zag.
 *
 * Reduced motion: Ark does NOT itself suppress autoplay under
 * `prefers-reduced-motion`. We force `autoplay={false}` whenever the user has
 * requested reduced motion so the carousel never auto-advances (WCAG 2.2.2 /
 * 2.3.3). The CSS additionally removes the scroll-snap smooth-scroll behavior.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR), never class names.
 */
export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(function Carousel(
  { slides, autoplay = false, showIndicators = true, children, ...rootProps },
  ref,
) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const effectiveAutoplay = prefersReducedMotion ? false : autoplay;

  return (
    <ArkCarousel.Root
      ref={ref}
      slideCount={slides.length}
      autoplay={effectiveAutoplay}
      data-reduced-motion={prefersReducedMotion ? 'reduce' : undefined}
      {...rootProps}
    >
      <ArkCarousel.ItemGroup>
        {slides.map((slide, index) => (
          <ArkCarousel.Item key={slide.id} index={index}>
            {slide.content}
          </ArkCarousel.Item>
        ))}
      </ArkCarousel.ItemGroup>
      <CarouselControls />
      {showIndicators && <CarouselIndicators count={slides.length} />}
      {children}
    </ArkCarousel.Root>
  );
});
