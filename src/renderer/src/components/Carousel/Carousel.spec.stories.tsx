import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Carousel, type CarouselSlide } from './Carousel';

/**
 * Interaction / accessibility tests for the Carousel.
 *
 * Kept separate from the visual stories (`Carousel.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles (a `play` without `expect` is a state-setter,
 * not a test). Stories are named by behavior so a failure is self-describing,
 * each uses `step()` for readable runner output, and each `await`s real
 * `expect(...)` (Storybook matchers are async).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const slides: CarouselSlide[] = [
  { id: 'one', content: 'Slide one' },
  { id: 'two', content: 'Slide two' },
  { id: 'three', content: 'Slide three' },
];

const meta: Meta<typeof Carousel> = {
  title: 'Components/Display/Carousel/Tests',
  component: Carousel,
  args: { 'aria-label': 'Feature highlights', slides },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Carousel>;

/**
 * Installs a `window.matchMedia` stub that reports the given
 * `prefers-reduced-motion` state. Returns a restore function. Called
 * synchronously inside a story `render` so the Carousel's mount-time effect
 * reads the stubbed value. Mirrors a real reduced-motion preference without
 * depending on browser emulation flags.
 */
function stubReducedMotion(reduce: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = (query: string): MediaQueryList => {
    const matches = query.includes('prefers-reduced-motion: reduce') ? reduce : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  };
  return () => {
    window.matchMedia = original;
  };
}

/** The Helios/Ark structural + ARIA contract for the carousel region. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root is a labelled carousel region', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='root']",
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('role', 'region');
      await expect(root).toHaveAttribute('aria-roledescription', 'carousel');
      await expect(root).toHaveAttribute('aria-label', 'Feature highlights');
    });

    await step('each slide is exposed as a slide to assistive tech', async () => {
      const items = canvasElement.querySelectorAll("[data-scope='carousel'][data-part='item']");
      await expect(items).toHaveLength(3);
      await expect(items[0]).toHaveAttribute('aria-roledescription', 'slide');
    });

    await step('prev/next controls and indicators are present and named', async () => {
      await expect(canvas.getByRole('button', { name: 'Previous slide' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Next slide' })).toBeInTheDocument();
      const indicators = canvasElement.querySelectorAll(
        "[data-scope='carousel'][data-part='indicator']",
      );
      await expect(indicators).toHaveLength(3);
    });

    await step('the active slide is marked in-view (Ark uses data-inview)', async () => {
      const inView = canvasElement.querySelector(
        "[data-scope='carousel'][data-part='item'][data-inview]",
      );
      await expect(inView).not.toBeNull();
    });
  },
};

/** Keyboard drives paging via the native trigger buttons; the focus ring shows. */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole('button', { name: 'Next slide' });
    const prev = canvas.getByRole('button', { name: 'Previous slide' });

    await step('at the first slide the prev trigger is disabled', async () => {
      // Ark drives the edge state via the native `disabled` attribute (verified
      // against the Zag connect output), which toBeDisabled() asserts as
      // AT-exposed state — not a data-* attribute.
      await expect(prev).toBeDisabled();
    });

    await step('activating Next advances the current indicator', async () => {
      const firstDot = canvasElement.querySelector(
        "[data-scope='carousel'][data-part='indicator'][data-current]",
      );
      next.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        const movedDot = canvasElement.querySelector(
          "[data-scope='carousel'][data-part='indicator'][data-current]",
        );
        await expect(movedDot).not.toBe(firstDot);
      });
    });

    await step(
      'keyboard focus renders a visible focus ring (computed-style backstop)',
      async () => {
        // Real keyboard focus (not programmatic .focus()) is what triggers the
        // native :focus-visible the ring hangs off of. Tab onto the next
        // trigger from the prev trigger so a control inside the carousel holds
        // a keyboard focus.
        prev.focus();
        await userEvent.tab();
        await waitFor(async () => {
          await expect(next).toHaveFocus();
        });
        const ring = getComputedStyle(next).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring).not.toBe('');
      },
    );
  },
};

/** Clicking an indicator scrolls to that slide and marks it current. */
export const IndicatorSelectsSlide: Story = {
  play: async ({ canvasElement, step }) => {
    await step('clicking the third indicator makes it the current dot', async () => {
      const indicators = canvasElement.querySelectorAll<HTMLButtonElement>(
        "[data-scope='carousel'][data-part='indicator']",
      );
      const third = indicators[2]!;
      await userEvent.click(third);
      await waitFor(async () => {
        await expect(third).toHaveAttribute('data-current');
      });
    });
  },
};

/**
 * Under reduced motion the wrapper force-disables autoplay (WCAG 2.2.2 / 2.3.3).
 * Ark reflects "not playing" as aria-live="polite" on the item group (it would
 * be "off" while autoplaying), so a polite live region with autoplay requested
 * proves autoplay never started.
 */
export const ReducedMotionStopsAutoplay: Story = {
  args: { autoplay: { delay: 100 } },
  render: (args) => {
    // Stub synchronously so the Carousel's mount effect reads reduced = true.
    stubReducedMotion(true);
    return <Carousel {...args} />;
  },
  play: async ({ canvasElement, step }) => {
    await step('wrapper flags reduced motion on the root', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='root']",
      );
      await expect(root).toHaveAttribute('data-reduced-motion', 'reduce');
    });

    await step('autoplay is suppressed: item group stays a polite live region', async () => {
      const group = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='item-group']",
      );
      await expect(group).not.toBeNull();
      // Give any (suppressed) autoplay timer a chance to fire; it must not.
      await waitFor(async () => {
        await expect(group).toHaveAttribute('aria-live', 'polite');
      });
      // The first slide has not advanced past the first (still in view). Ark
      // populates data-inview via an IntersectionObserver after layout, so wait
      // for it rather than reading synchronously.
      const items = canvasElement.querySelectorAll("[data-scope='carousel'][data-part='item']");
      await waitFor(async () => {
        await expect(items[0]).toHaveAttribute('data-inview');
      });
    });

    await step('reduced-motion track scroll is non-smooth', async () => {
      const group = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='item-group']",
      )!;
      await expect(getComputedStyle(group).scrollBehavior).toBe('auto');
    });
  },
};

/** With motion allowed, requested autoplay actually starts (the negative control). */
export const MotionAllowsAutoplay: Story = {
  args: { autoplay: { delay: 100 } },
  render: (args) => {
    stubReducedMotion(false);
    return <Carousel {...args} />;
  },
  play: async ({ canvasElement, step }) => {
    await step('root is not flagged reduced-motion', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='root']",
      );
      await expect(root).not.toHaveAttribute('data-reduced-motion', 'reduce');
    });

    await step('autoplaying item group becomes a non-announcing live region', async () => {
      const group = canvasElement.querySelector<HTMLElement>(
        "[data-scope='carousel'][data-part='item-group']",
      );
      await waitFor(async () => {
        await expect(group).toHaveAttribute('aria-live', 'off');
      });
    });
  },
};
