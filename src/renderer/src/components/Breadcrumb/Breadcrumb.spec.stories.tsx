import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Breadcrumb } from './Breadcrumb';

/**
 * Interaction / accessibility tests for the Breadcrumb.
 *
 * Kept separate from the visual stories (`Breadcrumb.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior so a failure is self-describing, each uses
 * `step()`, and each `await`s a real `expect(...)` (Storybook matchers are
 * async).
 *
 * Breadcrumb is presentational/structural (a `<nav> > <ol> > <li>` trail) whose
 * only interactive elements are plain anchors. The tests therefore assert the
 * WAI-ARIA Breadcrumb contract (landmark name, ordered list, `aria-current` on
 * the non-interactive current page, decorative separators) AND drive the real
 * keyboard path to prove the native `:focus-visible` ring resolves a token.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const items = [
  { text: 'Library', href: '#library' },
  { text: 'Projects', href: '#projects' },
  { text: 'Methodology' },
];

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Navigation/Breadcrumb/Tests',
  component: Breadcrumb,
  args: { items },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Breadcrumb>;

/** The landmark + ordered-list + current-page ARIA contract. */
export const AriaContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes a named navigation landmark (<nav aria-label>)', async () => {
      const nav = canvas.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(nav).toBeInTheDocument();
      await expect(nav.tagName).toBe('NAV');
    });

    await step('the trail is an ordered list (hierarchy/sequence)', async () => {
      const list = canvas.getByRole('list');
      await expect(list.tagName).toBe('OL');
      await expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    });

    await step('non-final entries are real links with hrefs', async () => {
      const links = canvas.getAllByRole('link');
      await expect(links).toHaveLength(2);
      await expect(links[0]).toHaveAttribute('href', '#library');
      await expect(links[1]).toHaveAttribute('href', '#projects');
    });

    await step('the last entry is the current page: aria-current, not a link', async () => {
      // The current page must be announced as the location (WCAG 2.4.8) and must
      // NOT be interactive (the Helios contract: last item is non-interactive).
      const current = canvasElement.querySelector("[data-part='current']")!;
      await expect(current).toHaveAttribute('aria-current', 'page');
      await expect(current.tagName).not.toBe('A');
      await expect(current).toHaveTextContent('Methodology');
      // It is not in the link set.
      const links = canvas.getAllByRole('link');
      await expect(links.some((l) => l.textContent?.includes('Methodology'))).toBe(false);
    });
  },
};

/** Separators are decorative generated content — never focusable or announced. */
export const SeparatorsAreDecorative: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the "/" separator is CSS ::after content, not a DOM node', async () => {
      // Regression guard: the separator must not appear as real text/elements
      // (which a screen reader could announce). It lives only in generated
      // content, so it is absent from the accessible structure.
      const items = canvas.getAllByRole('listitem');
      const firstItem = items[0]!;
      const sep = getComputedStyle(firstItem, '::after').content;
      // The non-last item carries the "/" generated content.
      await expect(sep).toContain('/');
      await expect(parseFloat(getComputedStyle(firstItem, '::after').paddingLeft)).toBeGreaterThan(
        0,
      );
    });

    await step('the separator resolves a real (token) color', async () => {
      const firstItem = canvas.getAllByRole('listitem')[0]!;
      const cs = getComputedStyle(firstItem, '::after');
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('the last item has no trailing separator', async () => {
      const items = canvas.getAllByRole('listitem');
      const last = items[items.length - 1]!;
      const sep = getComputedStyle(last, '::after').content;
      // `:not(:last-child)` excludes the current page, so no "/" is generated.
      await expect(sep === 'none' || sep === '' || sep === 'normal').toBe(true);
    });
  },
};

/** Links resolve the muted token and brighten/underline on hover. */
export const LinkTokensResolve: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('a link resolves the faint foreground token (non-transparent)', async () => {
      const link = canvas.getAllByRole('link')[0]!;
      const cs = getComputedStyle(link);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
      // Helios rounds the link corners with the small radius token.
      await expect(parseFloat(cs.borderTopLeftRadius)).toBeGreaterThan(0);
    });

    await step('the current page resolves the strong foreground token', async () => {
      const current = canvasElement.querySelector<HTMLElement>("[data-part='current']")!;
      const cs = getComputedStyle(current);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Keyboard focus reaches the links and renders the native :focus-visible ring. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Tab moves keyboard focus to the first link', async () => {
      const firstLink = canvas.getAllByRole('link')[0]!;
      firstLink.blur();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(firstLink).toHaveFocus();
      });
    });

    await step('the focused link renders a box-shadow focus ring (token)', async () => {
      // Regression guard: the keyboard focus ring uses the native
      // :focus-visible pseudo (no Ark attribute exists for a plain anchor) and
      // resolves the Helios focus-ring token. Real keyboard input (userEvent.tab)
      // is required — programmatic .focus() does not trigger :focus-visible.
      const firstLink = canvas.getAllByRole('link')[0]!;
      await waitFor(async () => {
        const ring = getComputedStyle(firstLink).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring.length).toBeGreaterThan(0);
      });
    });
  },
};

/** A custom landmark name is exposed so multiple navs stay distinguishable. */
export const CustomLabel: Story = {
  args: { label: 'You are here' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the nav landmark uses the supplied accessible name', async () => {
      const nav = canvas.getByRole('navigation', { name: 'You are here' });
      await expect(nav).toBeInTheDocument();
    });
  },
};
