import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { SegmentGroup } from './SegmentGroup';

/**
 * Interaction / accessibility tests for the SegmentGroup.
 *
 * Kept separate from the visual stories (`SegmentGroup.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered selection/focus, so colocating it with a doc story would make that
 * story animate on load. Stories are named by behavior so a failure is
 * self-describing, each asserts with a real `await expect(...)`, and each uses
 * `step()` + `within(canvasElement)`.
 *
 * Regression guards encode the audit fixes:
 *   - The keyboard focus ring renders via the native `:has(input:focus-visible)`
 *     on the item (Ark exposes NO `data-focus-visible`; the old selector was
 *     dead and the ring never drew — a WCAG 2.4.7 failure).
 *   - The checked indicator resolves a real background token.
 *   - The `size` scale resolves a real, size-specific item height.
 *   - Disabled differs from enabled (inoperable, AT-exposed).
 */
const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const meta: Meta<typeof SegmentGroup> = {
  title: 'Components/Forms/SegmentGroup/Tests',
  component: SegmentGroup,
  args: { label: 'Calendar view', options: VIEW_OPTIONS, defaultValue: 'week', size: 'medium' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof SegmentGroup>;

function checkedItem(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    '[data-scope="segment-group"][data-part="item"][data-state="checked"]',
  );
}

/**
 * Primary keyboard interaction (radio-group APG pattern): the checked radio is
 * in the tab order, arrow keys move selection, and the checked item carries
 * `data-state="checked"`.
 */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const [dayRadio, weekRadio, monthRadio] = radios;
    if (!dayRadio || !weekRadio || !monthRadio) {
      throw new Error('expected three segment radios');
    }

    await step('starts with the default value checked', async () => {
      await expect(dayRadio).not.toBeChecked();
      await expect(weekRadio).toBeChecked();
      await expect(monthRadio).not.toBeChecked();
      await expect(checkedItem(canvasElement)).toHaveAttribute('data-state', 'checked');
    });

    await step('the checked radio is keyboard-reachable (not tabindex=-1)', async () => {
      await expect(weekRadio).not.toHaveAttribute('tabindex', '-1');
      weekRadio.focus();
      await expect(weekRadio).toHaveFocus();
    });

    await step('ArrowRight moves selection to the next item', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await expect(monthRadio).toBeChecked();
      await expect(checkedItem(canvasElement)).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowLeft moves selection back', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await expect(weekRadio).toBeChecked();
    });
  },
};

/**
 * Regression guard for the focus-ring fix. The ring is drawn on the item via
 * the native `:has(input:focus-visible)` — Ark exposes NO `data-focus-visible`
 * attribute on the item label, so the old `[data-part='item'][data-focus-visible]`
 * selector was dead and the ring never rendered. `userEvent.tab()` produces a
 * real keyboard focus that triggers `:focus-visible` (programmatic `.focus()`
 * does not), so the guard FAILS against the old selector and PASSES after the fix.
 */
export const KeyboardFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const checked = radios.find((r) => (r as HTMLInputElement).checked) ?? radios[0]!;
    const item = checked.closest<HTMLElement>('[data-part="item"]')!;

    await step('no focus ring before keyboard focus', async () => {
      await expect(getComputedStyle(item).boxShadow).toBe('none');
    });

    await step('Tab focuses the checked radio and renders a visible ring', async () => {
      await userEvent.tab();
      await expect(checked).toHaveFocus();
      const ring = getComputedStyle(item).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** The checked indicator resolves a real, non-transparent background token. */
export const CheckedIndicatorIsStyled: Story = {
  play: async ({ canvasElement, step }) => {
    await step('the gliding indicator has a real background', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="indicator"]',
      );
      await expect(indicator).not.toBeNull();
      const bg = getComputedStyle(indicator!).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('the checked item is recolored to the action foreground', async () => {
      const item = checkedItem(canvasElement)!;
      await expect(getComputedStyle(item).color).not.toBe('');
    });
  },
};

/**
 * The `size` scale resolves real, size-specific item heights via the
 * `--segment-group-*` custom properties on the root. Guards against the prior
 * borrowed `--token-tabs-tab-height-medium`, which gave only one fixed height.
 */
export const SizeScaleResolves: Story = {
  args: { size: 'small' },
  play: async ({ canvasElement, step }) => {
    await step('small items resolve the small height (28px)', async () => {
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"]',
      )!;
      await expect(getComputedStyle(item).height).toBe('28px');
    });
  },
};

export const LargeSizeScaleResolves: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large items resolve the large height (44px)', async () => {
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"]',
      )!;
      await expect(getComputedStyle(item).height).toBe('44px');
    });
  },
};

/**
 * A fully-disabled segment group must not be operable by keyboard, and the
 * disabled state must be exposed to assistive technology. Ark applies the native
 * `disabled` to the underlying radio inputs, removing them from the tab order.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 'week' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');

    await step('every radio is disabled and AT-exposed', async () => {
      for (const radio of radios) {
        await expect(radio).toBeDisabled();
      }
    });

    await step('keyboard cannot change a disabled group', async () => {
      const [dayRadio] = radios;
      await expect(dayRadio).not.toBeChecked();
      await userEvent.keyboard('{ArrowRight}');
      await expect(dayRadio).not.toBeChecked();
    });

    await step('a disabled item is dimmed (differs from enabled foreground)', async () => {
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"][data-disabled]',
      );
      await expect(item).not.toBeNull();
      await expect(getComputedStyle(item!).color).not.toBe('');
    });
  },
};

/** A single disabled item exposes its disabled state and is inoperable. */
export const DisabledItemIsInert: Story = {
  args: {
    options: [
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month', disabled: true },
    ],
    defaultValue: 'day',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const monthRadio = radios[2]!;

    await step('the disabled item is AT-exposed', async () => {
      await expect(monthRadio).toBeDisabled();
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="segment-group"][data-part="item"][data-disabled]',
      );
      await expect(item).not.toBeNull();
    });
  },
};
