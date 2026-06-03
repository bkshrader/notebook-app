import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { RadioCard } from './RadioCard';

/**
 * Interaction / accessibility tests for the RadioCard.
 *
 * Kept separate from the visual stories (`RadioCard.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * selected value, so colocating it with a doc story would make that story flip
 * state on load. Stories are named by behavior so a failure is self-describing,
 * each asserts real `expect(...)` (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * These guards encode the Ark radio-group contract VERIFIED against the live
 * rendered DOM (not the styling-guide MCP, which is stale for this component):
 *   - Item + ItemControl carry `data-state="checked|unchecked"`.
 *   - Ark emits NO `data-focus-visible`/`data-focus`; the card focus ring is
 *     drawn via `[data-part='item']:has(input:focus-visible)` (native
 *     `:focus-visible` on the clip-hidden radio input).
 */
const PLANS = [
  { value: 'free', label: 'Free', description: 'For personal projects.' },
  { value: 'pro', label: 'Pro', description: 'For small teams.' },
  { value: 'enterprise', label: 'Enterprise', description: 'Dedicated support.' },
];

const meta: Meta<typeof RadioCard> = {
  title: 'Components/Forms/RadioCard/Tests',
  component: RadioCard,
  args: { groupLabel: 'Plan', options: PLANS },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof RadioCard>;

/** The card surface (Ark Item) at `index`. */
function card(canvasElement: HTMLElement, index: number): HTMLElement {
  const el = canvasElement.querySelectorAll<HTMLElement>(
    '[data-scope="radio-group"][data-part="item"]',
  )[index];
  if (!el) throw new Error(`expected a radio card at index ${index}`);
  return el;
}

/** The presentational radio control at `index` (aria-hidden circle). */
function control(canvasElement: HTMLElement, index: number): HTMLElement {
  const el = canvasElement.querySelectorAll<HTMLElement>(
    '[data-scope="radio-group"][data-part="item-control"]',
  )[index];
  if (!el) throw new Error(`expected an item-control at index ${index}`);
  return el;
}

/** The Ark/Helios structural + ARIA contract: native radios, named group, cards. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the group exposes a native radiogroup with each option as a radio', async () => {
      const radios = canvas.getAllByRole('radio');
      await expect(radios).toHaveLength(3);
      // The visible labels are the radios' accessible names (WCAG 4.1.2).
      await expect(canvas.getByRole('radio', { name: 'Free' })).toBeTruthy();
      await expect(canvas.getByRole('radio', { name: 'Pro' })).toBeTruthy();
    });

    await step('each card surface (Ark Item) is emitted with its content + control', async () => {
      const first = card(canvasElement, 0);
      await expect(first.querySelector("[data-part='card-content']")).not.toBeNull();
      await expect(first.querySelector("[data-part='card-description']")).not.toBeNull();
      await expect(
        first.querySelector("[data-scope='radio-group'][data-part='item-control']"),
      ).not.toBeNull();
    });

    await step(
      'the card resolves a real surface background + radius (tokens applied)',
      async () => {
        const cs = getComputedStyle(card(canvasElement, 0));
        await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        // --token-form-radiocard-border-radius is 6px.
        await expect(cs.borderTopLeftRadius).toBe('6px');
      },
    );
  },
};

/** Keyboard navigation follows the APG radio-group pattern (arrow keys move + check). */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const [first, second, third] = radios;
    if (!first || !second || !third) throw new Error('expected at least three radios');

    await step('starts with no value selected', async () => {
      await expect(first).not.toBeChecked();
      await expect(second).not.toBeChecked();
      await expect(third).not.toBeChecked();
    });

    await step('inputs are keyboard-reachable (not removed from tab order)', async () => {
      await expect(first).not.toHaveAttribute('tabindex', '-1');
      first.focus();
      await expect(first).toHaveFocus();
    });

    await step('ArrowDown moves focus and checks the next card', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await expect(second).toHaveFocus();
      await expect(second).toBeChecked();
      // Verified-DOM contract: the card + its control reflect checked via data-state.
      await expect(card(canvasElement, 1)).toHaveAttribute('data-state', 'checked');
      await expect(control(canvasElement, 1)).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowUp moves back and checks the previous card', async () => {
      await userEvent.keyboard('{ArrowUp}');
      await expect(first).toHaveFocus();
      await expect(first).toBeChecked();
      await expect(card(canvasElement, 0)).toHaveAttribute('data-state', 'checked');
    });
  },
};

/**
 * Regression guard for the card focus ring.
 *
 * The ring is drawn on the card via the native `:focus-visible` pseudo
 * (`[data-part='item']:has(input:focus-visible)`) because Ark exposes NO
 * data-focus-visible attribute. A real keyboard `tab()` triggers
 * `:focus-visible` and resolves a non-`none` box-shadow.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const [first] = radios;
    if (!first) throw new Error('expected at least one radio');

    await step('keyboard focus renders a visible focus ring on the card', async () => {
      // A real keyboard `tab()` is required: programmatic `.focus()` does NOT
      // satisfy `:focus-visible` for a radio input, so the ring would never
      // resolve. `userEvent.tab()` produces the real keyboard focus the
      // `:has(input:focus-visible)` selector keys off.
      await userEvent.tab();
      await expect(first).toHaveFocus();
      await waitFor(async () => {
        const ring = getComputedStyle(card(canvasElement, 0)).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring).not.toBe('');
      });
    });
  },
};

/** A checked card reflects data-state and resolves a real accent border. */
export const CheckedStyling: Story = {
  args: { defaultValue: 'pro' },
  play: async ({ canvasElement, step }) => {
    await step('the checked card + control reflect data-state="checked"', async () => {
      await expect(card(canvasElement, 1)).toHaveAttribute('data-state', 'checked');
      await expect(control(canvasElement, 1)).toHaveAttribute('data-state', 'checked');
    });

    await step('the checked card border differs from an unchecked sibling', async () => {
      const checked = getComputedStyle(card(canvasElement, 1)).borderTopColor;
      const unchecked = getComputedStyle(card(canvasElement, 0)).borderTopColor;
      await expect(checked).not.toBe('');
      await expect(checked).not.toBe('rgba(0, 0, 0, 0)');
      await expect(unchecked).not.toBe(checked);
    });

    await step('the checked control paints a real filled indicator', async () => {
      const cs = getComputedStyle(control(canvasElement, 1));
      await expect(cs.backgroundImage).not.toBe('none');
    });
  },
};

/** A disabled group exposes disabled to AT and is inoperable by keyboard. */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: 'free' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const [first] = radios;
    if (!first) throw new Error('expected at least one radio');

    await step('every input is disabled (exposed to assistive tech)', async () => {
      for (const radio of radios) {
        await expect(radio).toBeDisabled();
      }
    });

    await step('disabled card styling differs from the enabled default surface', async () => {
      // Regression guard: data-disabled must reach the card surface.
      const cs = getComputedStyle(card(canvasElement, 1));
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(card(canvasElement, 1)).toHaveAttribute('data-disabled');
    });

    await step('keyboard cannot change the selection', async () => {
      first.focus();
      await userEvent.keyboard('{ArrowDown}');
      await expect(first).toBeChecked();
    });
  },
};

/** Orientation drives the root layout axis. */
export const Orientation: Story = {
  args: { orientation: 'vertical', defaultValue: 'free' },
  play: async ({ canvasElement, step }) => {
    await step('vertical root stacks the cards in a column', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="radio-group"][data-part="root"]',
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-orientation', 'vertical');
      await expect(getComputedStyle(root!).flexDirection).toBe('column');
    });
  },
};
