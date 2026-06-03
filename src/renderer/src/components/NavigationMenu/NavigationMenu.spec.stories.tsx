import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NavigationMenu } from './NavigationMenu';

/**
 * Interaction / accessibility tests for the NavigationMenu.
 *
 * Kept separate from the visual stories (`NavigationMenu.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (opening panels, moving focus), so colocating it with a doc
 * story would make that story animate/flash on load. Stories are named by
 * behavior so a failure is self-describing, each asserts (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Several stories are regression guards for the Helios-parity fixes:
 *   - keyboard focus renders a ring via the native `:focus-visible` (Ark emits
 *     NO `data-focus-visible`; the old phantom selector never matched);
 *   - the chevron is a persistent `<svg>` child of the trigger that rotates on
 *     open — NOT wrapped in Ark's ItemIndicator, which carries the native
 *     `hidden` attribute while closed (zag `hidden: !itemState.selected`) and
 *     would hide the chevron when collapsed;
 *   - the disabled trigger is dimmed and inert;
 *   - `data-size` reaches the nav root so the per-size `--nav-*` props apply;
 *   - Content renders INLINE (this wrapper renders no Viewport, so Ark does not
 *     portal it) and the list lays out as a flex row.
 */
const ITEMS = [
  {
    value: 'features',
    label: 'Features',
    links: [
      { href: '#overview', label: 'Overview' },
      { href: '#highlights', label: 'Highlights' },
    ],
  },
  {
    value: 'docs',
    label: 'Documentation',
    links: [
      { href: '#introduction', label: 'Introduction' },
      { href: '#installation', label: 'Installation' },
    ],
  },
  {
    value: 'about',
    label: 'About',
    isLink: true,
    href: '#about',
  },
];

const meta: Meta<typeof NavigationMenu> = {
  title: 'Components/Navigation/NavigationMenu/Tests',
  component: NavigationMenu,
  args: { items: ITEMS, 'aria-label': 'Main navigation', size: 'medium' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof NavigationMenu>;

/** The list is a flex row (regression guard: a broken `display` would collapse
 *  the row to a block; the project's `block flex` notation computes to flex). */
export const ListLaysOutAsFlexRow: Story = {
  play: async ({ canvasElement, step }) => {
    await step('the nav landmark is named for assistive technology', async () => {
      const nav = canvasElement.querySelector('nav[data-part="root"]');
      await expect(nav).not.toBeNull();
      await expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    await step('the list resolves to a real flex layout', async () => {
      const list = canvasElement.querySelector<HTMLElement>(
        '[data-scope="navigation-menu"][data-part="list"]',
      );
      await expect(list).not.toBeNull();
      await expect(getComputedStyle(list!).display).toBe('flex');
    });
  },
};

/** Each expandable trigger renders a persistent chevron SVG directly inside it,
 *  NOT wrapped in Ark's `hidden`-when-closed ItemIndicator part. */
export const PersistentChevronRendered: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /Features/ });

    await step('the chevron is a direct <svg> child of the closed trigger', async () => {
      // Regression guard: wrapping the chevron in Ark's ItemIndicator would hide
      // it while collapsed (ItemIndicator gets the native `hidden` attribute).
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      const chevron = trigger.querySelector(':scope > svg');
      await expect(chevron).not.toBeNull();
      await expect(trigger.querySelector('[data-part="item-indicator"]')).toBeNull();
    });

    await step('the chevron is visible while the item is collapsed', async () => {
      const chevron = trigger.querySelector<SVGElement>(':scope > svg')!;
      const cs = getComputedStyle(chevron);
      await expect(cs.display).not.toBe('none');
      await expect(cs.visibility).not.toBe('hidden');
    });

    await step('the chevron is aria-hidden (the label names the control)', async () => {
      const chevron = trigger.querySelector(':scope > svg')!;
      await expect(chevron).toHaveAttribute('aria-hidden', 'true');
    });

    await step('the chevron resolves a non-zero size from the size scale', async () => {
      const chevron = trigger.querySelector<SVGElement>(':scope > svg')!;
      const cs = getComputedStyle(chevron);
      await expect(cs.width).not.toBe('0px');
      await expect(cs.width).not.toBe('auto');
    });
  },
};

/** Keyboard navigation: trigger is reachable and focus paints a visible ring. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /Features/ });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: the ring is drawn via the native :focus-visible pseudo
      // on the <button> (Ark exposes NO data-focus-visible attribute — the old
      // [data-focus-visible] selector never matched). userEvent.tab() produces a
      // real keyboard focus that triggers :focus-visible, unlike .focus().
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Enter opens the inline content panel and rotates the chevron. */
export const OpenRevealsPanelAndRotatesChevron: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /Features/ });
    const chevron = trigger.querySelector<SVGElement>(':scope > svg')!;

    await step('chevron is upright while closed', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      const rotateClosed = getComputedStyle(chevron).rotate;
      // "none" or "0deg" — either way, not the open rotation.
      await expect(['none', '0deg', '']).toContain(rotateClosed);
    });

    await step('Enter opens the content panel inline (no portal/dialog)', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      // Content renders inside the canvas (this wrapper renders no Viewport).
      await waitFor(async () => {
        const content = canvasElement.querySelector('[data-part="content"][data-state="open"]');
        await expect(content).not.toBeNull();
      });
      await expect(canvas.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    });

    await step('open state rotates the chevron', async () => {
      // The rotation transitions over ~0.2s, so poll until it settles on the
      // open angle (regression guard: the rotation is keyed off the trigger's
      // `data-state='open'`, and the chevron sits inside the trigger).
      await waitFor(async () => {
        const rotateOpen = getComputedStyle(chevron).rotate;
        await expect(rotateOpen).not.toBe('none');
        await expect(rotateOpen).not.toBe('0deg');
        await expect(rotateOpen).not.toBe('');
      });
    });

    await step('Escape closes the panel and returns focus to the trigger', async () => {
      await userEvent.keyboard('{Escape}');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect(trigger).toHaveFocus();
    });
  },
};

/** `data-size` reaches the nav root, driving the per-size custom properties. */
export const SizeScaleApplies: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('data-size lands on the root so the size scale can match', async () => {
      // Regression guard: `data-size` must reach <nav data-part="root">, or the
      // `[data-part="root"][data-size="large"]` block never sets `--nav-*`.
      const root = canvasElement.querySelector<HTMLElement>('nav[data-part="root"]');
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-size', 'large');
      const chevronSize = getComputedStyle(root!).getPropertyValue('--nav-chevron-size');
      await expect(chevronSize.trim()).toBe('1.5rem');
    });
  },
};

/** A disabled trigger is dimmed, exposed to AT, and cannot be opened. */
export const DisabledTriggerIsInert: Story = {
  args: {
    items: [
      {
        value: 'enabled',
        label: 'Available',
        links: [{ href: '#a', label: 'Item A' }],
      },
      {
        value: 'disabled',
        label: 'Unavailable',
        links: [{ href: '#b', label: 'Item B' }],
        disabled: true,
      },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const enabled = canvas.getByRole('button', { name: /Available/ });
    const disabled = canvas.getByRole('button', { name: /Unavailable/ });

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(disabled).toHaveAttribute('data-disabled');
    });

    await step('disabled trigger is dimmed differently from an enabled one', async () => {
      // Regression guard: `:disabled, [data-disabled]` must recolor the label.
      const colorEnabled = getComputedStyle(enabled).color;
      const colorDisabled = getComputedStyle(disabled).color;
      await expect(colorDisabled).not.toBe(colorEnabled);
    });

    await step('disabled trigger cannot be opened', async () => {
      await expect(disabled).toHaveAttribute('data-state', 'closed');
      await userEvent.click(disabled, { pointerEventsCheck: 0 });
      await expect(disabled).toHaveAttribute('data-state', 'closed');
    });
  },
};

/** A plain link item (`isLink`) renders an anchor with a keyboard focus ring. */
export const PlainLinkHasFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const about = canvas.getByRole('link', { name: 'About' });

    await step('the link is a real anchor with an href', async () => {
      await expect(about.tagName).toBe('A');
      await expect(about).toHaveAttribute('href', '#about');
    });

    await step('keyboard focus paints a ring via :focus-visible', async () => {
      // Tab forward until the About link is reached. The exact tab count is not
      // hard-coded — opening a panel en route changes the tab order — so we tab
      // in a bounded loop. A real Tab keypress (unlike .focus()) triggers the
      // native :focus-visible the ring is keyed off of (Ark emits NO
      // data-focus-visible).
      for (let i = 0; i < 12 && document.activeElement !== about; i += 1) {
        await userEvent.tab();
      }
      await expect(about).toHaveFocus();
      const ring = getComputedStyle(about).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Vertical orientation forwards `data-orientation` and stacks the list. */
export const VerticalOrientationStacks: Story = {
  args: { orientation: 'vertical' },
  play: async ({ canvasElement, step }) => {
    await step('the list switches to a column in vertical orientation', async () => {
      const list = canvasElement.querySelector<HTMLElement>(
        '[data-scope="navigation-menu"][data-part="list"]',
      );
      await expect(list).not.toBeNull();
      await expect(list).toHaveAttribute('data-orientation', 'vertical');
      await expect(getComputedStyle(list!).flexDirection).toBe('column');
    });
  },
};
