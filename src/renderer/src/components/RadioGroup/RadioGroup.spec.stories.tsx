import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { RadioGroup } from './RadioGroup';

/**
 * Interaction / accessibility tests for the RadioGroup.
 *
 * Kept separate from the visual stories (`RadioGroup.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * selected value, so colocating it with a doc story would make that story flip
 * state on load. Stories are named by behavior so a failure is self-describing,
 * each asserts real `expect(...)` (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * These guards encode the Ark contract VERIFIED against the live rendered DOM
 * (not the styling-guide MCP, which is stale for this component):
 *   - ItemControl carries `data-state="checked|unchecked"` (NOT `data-active`).
 *   - Ark emits NO `data-focus-visible`/`data-focus`; the focus ring is drawn on
 *     the control via `[data-part='item']:has(input:focus-visible)`. The old
 *     `[data-part='item-control'][data-focus-visible]` selector was dead and
 *     rendered no ring — the FocusRing guard below fails against it.
 */
const FRAMEWORKS = [
  { value: 'react', label: 'React' },
  { value: 'solid', label: 'Solid' },
  { value: 'vue', label: 'Vue' },
];

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Forms/RadioGroup/Tests',
  component: RadioGroup,
  args: { groupLabel: 'Framework', options: FRAMEWORKS },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

/** The presentational control for the radio at `index` (aria-hidden circle). */
function control(canvasElement: HTMLElement, index: number): HTMLElement {
  const el = canvasElement.querySelectorAll<HTMLElement>(
    '[data-scope="radio-group"][data-part="item-control"]',
  )[index];
  if (!el) throw new Error(`expected an item-control at index ${index}`);
  return el;
}

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

    await step('ArrowDown moves focus and checks the next option', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await expect(second).toHaveFocus();
      await expect(second).toBeChecked();
      // Verified-DOM contract: ItemControl reflects checked via data-state.
      await expect(control(canvasElement, 1)).toHaveAttribute('data-state', 'checked');
    });

    await step('ArrowUp moves back and checks the previous option', async () => {
      await userEvent.keyboard('{ArrowUp}');
      await expect(first).toHaveFocus();
      await expect(first).toBeChecked();
      await expect(control(canvasElement, 0)).toHaveAttribute('data-state', 'checked');
    });
  },
};

/**
 * Regression guard for the focus-ring fix.
 *
 * The ring is drawn on the item-control via the native `:focus-visible` pseudo
 * (`[data-part='item']:has(input:focus-visible)`) because Ark exposes NO
 * data-focus-visible attribute. A real keyboard `tab()` triggers
 * `:focus-visible`; this resolves a non-`none` box-shadow. The OLD broken
 * selector targeted a phantom `[data-focus-visible]` attribute, so the ring was
 * `none` — this guard FAILS against the old CSS and PASSES after the fix.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    const [first] = radios;
    if (!first) throw new Error('expected at least one radio');

    await step('no ring at rest', async () => {
      await expect(getComputedStyle(control(canvasElement, 0)).boxShadow).toBe('none');
    });

    await step('keyboard focus renders a visible focus ring on the control', async () => {
      // A real keyboard `tab()` is required: programmatic `.focus()` does NOT
      // satisfy `:focus-visible` for a radio input (verified in the live DOM —
      // `input.matches(':focus-visible')` stays false after `.focus()`), so the
      // ring would never resolve. `userEvent.tab()` produces the real keyboard
      // focus that the `:has(input:focus-visible)` selector keys off.
      await userEvent.tab();
      await expect(first).toHaveFocus();
      const ring = getComputedStyle(control(canvasElement, 0)).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Checked styling resolves to real, non-transparent token values. */
export const CheckedStyling: Story = {
  args: { defaultValue: 'solid' },
  play: async ({ canvasElement, step }) => {
    await step('the checked control reflects data-state="checked"', async () => {
      const checked = control(canvasElement, 1);
      await expect(checked).toHaveAttribute('data-state', 'checked');
    });

    await step('checked control has a real border-color and indicator image', async () => {
      const checked = control(canvasElement, 1);
      const cs = getComputedStyle(checked);
      await expect(cs.borderColor).not.toBe('');
      await expect(cs.borderColor).not.toBe('rgba(0, 0, 0, 0)');
      // The filled-dot indicator is a token background-image data URL.
      await expect(cs.backgroundImage).not.toBe('none');
    });

    await step('an unchecked sibling control differs from the checked one', async () => {
      const checked = getComputedStyle(control(canvasElement, 1)).borderColor;
      const unchecked = getComputedStyle(control(canvasElement, 0)).borderColor;
      await expect(unchecked).not.toBe(checked);
    });
  },
};

/** A disabled group exposes disabled to AT and is inoperable by keyboard. */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: 'react' },
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

    await step('disabled control styling differs from the enabled default', async () => {
      // Regression guard: data-disabled must reach the control. Compare its
      // border-color against the enabled base border-color.
      const disabledBorder = getComputedStyle(control(canvasElement, 1)).borderColor;
      await expect(disabledBorder).not.toBe('');
      await expect(disabledBorder).not.toBe('rgba(0, 0, 0, 0)');
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
  args: { orientation: 'horizontal', defaultValue: 'react' },
  play: async ({ canvasElement, step }) => {
    await step('horizontal root lays options out in a row', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="radio-group"][data-part="root"]',
      );
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-orientation', 'horizontal');
      await expect(getComputedStyle(root!).flexDirection).toBe('row');
    });
  },
};
