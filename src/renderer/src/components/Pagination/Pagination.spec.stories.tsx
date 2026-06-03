import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Pagination } from './Pagination';

/**
 * Interaction / accessibility tests for the Pagination.
 *
 * Kept separate from the visual stories (`Pagination.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (advancing pages, moving focus),
 * so colocating it with a doc story would make that story flash/jump on load.
 * These stories are named by behavior so a failure is self-describing, each
 * asserts (a `play` without `expect` is a state-setter, not a test), and each
 * uses `step()` for readable runner / Interactions-panel output.
 *
 * Several stories are regression guards for the Helios-parity contract fixes:
 *   - the keyboard focus ring renders via the native `:focus-visible` pseudo
 *     (Ark exposes NO `data-focus-visible` for any pagination part — the prior
 *     `[data-focus-visible]` selectors were dead and drew no ring);
 *   - the boundary triggers expose their disabled state to AT;
 *   - the selected page resolves a real (token-backed) background.
 */
const meta: Meta<typeof Pagination> = {
  title: 'Components/Navigation/Pagination/Tests',
  component: Pagination,
  args: {
    count: 100,
    pageSize: 10,
    siblingCount: 1,
    'aria-label': 'Results pagination',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Pagination>;

/** The root nav landmark is named and laid out as a flex row. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('root is a named <nav> landmark', async () => {
      const nav = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pagination"][data-part="root"]',
      );
      await expect(nav).not.toBeNull();
      await expect(nav!.tagName).toBe('NAV');
      await expect(nav!.getAttribute('aria-label')).toBe('Results pagination');
    });

    await step('root resolves a real flex layout (not the invalid two-value form)', async () => {
      const nav = canvasElement.querySelector<HTMLElement>(
        '[data-scope="pagination"][data-part="root"]',
      )!;
      // Regression guard: the prior `display: block flex` was a non-standard
      // two-value form; computed display must resolve to a flex container.
      await expect(getComputedStyle(nav).display).toBe('flex');
    });
  },
};

/** Keyboard reaches and activates page items; the active page tracks selection. */
export const KeyboardNavigation: Story = {
  args: {
    count: 50,
    pageSize: 10,
    siblingCount: 1,
    defaultPage: 1,
    'aria-label': 'Keyboard navigation test',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const pageOne = canvas.getByRole('button', { name: 'page 1' });

    await step('page 1 is selected on initial render', async () => {
      await expect(pageOne).toHaveAttribute('data-selected');
    });

    await step('page 2 is keyboard-reachable', async () => {
      const pageTwo = canvas.getByRole('button', { name: 'page 2' });
      await expect(pageTwo).not.toHaveAttribute('tabindex', '-1');
      pageTwo.focus();
      await expect(pageTwo).toHaveFocus();
    });

    await step('Enter activates page 2 and deselects page 1', async () => {
      await userEvent.keyboard('{Enter}');
      const pageTwo = canvas.getByRole('button', { name: 'page 2' });
      await expect(pageTwo).toHaveAttribute('data-selected');
      await expect(pageOne).not.toHaveAttribute('data-selected');
    });

    await step('next trigger advances to page 3', async () => {
      const next = canvas.getByRole('button', { name: 'next page' });
      await expect(next).not.toBeDisabled();
      next.focus();
      await userEvent.keyboard('{Enter}');
      await expect(canvas.getByRole('button', { name: 'page 3' })).toHaveAttribute('data-selected');
    });
  },
};

/**
 * Keyboard focus renders a visible focus ring on the focused control.
 *
 * Regression guard for the contract fix: Ark exposes NO `data-focus-visible`
 * attribute on any pagination part, so the ring is drawn by the native
 * `:focus-visible` pseudo-class. `userEvent.tab()` produces a real keyboard
 * focus that triggers `:focus-visible`, unlike a programmatic `.focus()` — this
 * test FAILS against the old dead `[data-focus-visible]` selectors.
 */
export const FocusRingRenders: Story = {
  args: { count: 50, pageSize: 10, defaultPage: 3, 'aria-label': 'Focus ring test' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('tabbing to a page item draws the keyboard focus ring', async () => {
      // Tab from the document body into the pagination controls. The first
      // focusable control receives a keyboard focus that triggers :focus-visible.
      const first = canvas.getByRole('button', { name: 'first page' });
      first.focus();
      first.blur();
      await userEvent.tab();
      const active = document.activeElement as HTMLElement;
      await expect(active).not.toBeNull();
      await expect(active.getAttribute('data-scope')).toBe('pagination');
      const ring = getComputedStyle(active).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Boundary triggers expose their disabled state to assistive technology. */
export const BoundaryTriggersDisabled: Story = {
  args: { count: 50, pageSize: 10, defaultPage: 1, 'aria-label': 'Boundary test' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: 'first page' });
    const prev = canvas.getByRole('button', { name: 'previous page' });
    const next = canvas.getByRole('button', { name: 'next page' });

    await step('first/prev are disabled on page 1 and exposed to AT', async () => {
      await expect(first).toBeDisabled();
      await expect(prev).toBeDisabled();
      // Ark carries BOTH the native `disabled` and `data-disabled`; the disabled
      // styling hangs off `[data-disabled]`.
      await expect(first).toHaveAttribute('data-disabled');
      await expect(prev).toHaveAttribute('data-disabled');
    });

    await step('a disabled trigger renders a distinct (dimmed) appearance', async () => {
      // Regression guard: disabled styling must differ from the enabled control.
      const disabledColor = getComputedStyle(prev).color;
      const enabledColor = getComputedStyle(next).color;
      await expect(disabledColor).not.toBe(enabledColor);
    });

    await step('next is enabled on page 1', async () => {
      await expect(next).not.toBeDisabled();
    });
  },
};

/** The selected page is visually distinguished by a real, token-backed surface. */
export const SelectedPageStyled: Story = {
  args: { count: 50, pageSize: 10, defaultPage: 2, 'aria-label': 'Selected styling test' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('selected page background resolves to a real token value', async () => {
      const selected = canvas.getByRole('button', { name: 'page 2' });
      await expect(selected).toHaveAttribute('data-selected');
      const bg = getComputedStyle(selected).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('selected differs from a non-selected sibling', async () => {
      const selected = canvas.getByRole('button', { name: 'page 2' });
      const other = canvas.getByRole('button', { name: 'page 1' });
      await expect(getComputedStyle(selected).backgroundColor).not.toBe(
        getComputedStyle(other).backgroundColor,
      );
    });
  },
};
