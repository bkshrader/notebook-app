import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Checkbox } from './Checkbox';

/**
 * Interaction / accessibility tests for the Checkbox.
 *
 * Kept separate from the visual stories (`Checkbox.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * toggle/flash on load. These stories are named by behavior so a failure is
 * self-describing, each asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * Marked `tags: ['test']` so they don't clutter the docs gallery but still run
 * in the test runner and count toward coverage.
 *
 * Each test is a regression guard for a verified part of the Ark contract /
 * Helios token wiring:
 *  - the four Ark parts (root/control/indicator/label) render and carry
 *    `data-state`;
 *  - the checked control resolves a real (token-driven) background;
 *  - keyboard focus draws a visible focus ring. NOTE: Ark's Checkbox emits NO
 *    `data-focus-visible` attribute (verified against the live DOM — focus only
 *    toggles `data-focus`, "focused at all"). The keyboard-only ring is driven
 *    by the native `:focus-visible` on the visually-hidden <input>, projected
 *    onto the Control via `[data-part='root']:has(input:focus-visible)`. This
 *    guard FAILS against the old phantom `[data-part='control'][data-focus-visible]`
 *    selector and PASSES after the fix.
 *  - disabled state is AT-exposed and inoperable;
 *  - the control-to-label gap resolves to a non-zero token value.
 */
const meta: Meta<typeof Checkbox> = {
  title: 'Components/Forms/Checkbox/Tests',
  component: Checkbox,
  args: { label: 'Accept terms' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

/** The Ark structural contract: all four parts render and carry data-state. */
export const StructureContract: Story = {
  args: { defaultChecked: true },
  play: async ({ canvasElement, step }) => {
    await step('all four Ark parts render with the expected element types', async () => {
      const root = canvasElement.querySelector("[data-scope='checkbox'][data-part='root']");
      const control = canvasElement.querySelector("[data-scope='checkbox'][data-part='control']");
      const indicator = canvasElement.querySelector(
        "[data-scope='checkbox'][data-part='indicator']",
      );
      const label = canvasElement.querySelector("[data-scope='checkbox'][data-part='label']");
      await expect(root).not.toBeNull();
      await expect(control).not.toBeNull();
      await expect(indicator).not.toBeNull();
      await expect(label).not.toBeNull();
      await expect(root!.tagName).toBe('LABEL');
    });

    await step('the focusable element is the native input; control is aria-hidden', async () => {
      const root = canvasElement.querySelector("[data-scope='checkbox'][data-part='root']")!;
      const input = root.querySelector('input[type="checkbox"]');
      const control = root.querySelector("[data-scope='checkbox'][data-part='control']");
      await expect(input).not.toBeNull();
      await expect(control).toHaveAttribute('aria-hidden', 'true');
    });

    await step('checked state propagates to control and indicator', async () => {
      const control = canvasElement.querySelector("[data-scope='checkbox'][data-part='control']");
      const indicator = canvasElement.querySelector(
        "[data-scope='checkbox'][data-part='indicator']",
      );
      await expect(control).toHaveAttribute('data-state', 'checked');
      await expect(indicator).toHaveAttribute('data-state', 'checked');
    });

    await step('the control-to-label gap uses the form-control spacing token', async () => {
      // Regression guard for the gap token: the gap resolves to
      // --token-form-control-padding (the form-control spacing token), NOT the
      // 3px --token-form-checkbox-border-radius. Asserting equality to the
      // control-padding token and inequality to the radius token means swapping
      // the token family back regresses here.
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='checkbox'][data-part='root']",
      )!;
      const cs = getComputedStyle(root);
      const gap = cs.gap;
      const controlPadding = cs.getPropertyValue('--token-form-control-padding').trim();
      const borderRadius = cs.getPropertyValue('--token-form-checkbox-border-radius').trim();
      await expect(gap).not.toBe('');
      await expect(gap).not.toBe('0px');
      await expect(gap).toBe(controlPadding);
      await expect(gap).not.toBe(borderRadius);
    });
  },
};

/**
 * Keyboard toggles the checkbox (Space, the APG pattern) and the checked
 * control resolves a real, token-driven background-color.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');
    const control = canvasElement.querySelector("[data-scope='checkbox'][data-part='control']")!;

    await step('the hidden input is keyboard-reachable', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      // Ark renders a clip-hidden native <input>; focus it directly then drive Space.
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('Space toggles the checkbox on', async () => {
      await userEvent.keyboard(' ');
      await expect(input).toBeChecked();
      await expect(control).toHaveAttribute('data-state', 'checked');
    });

    await step('the checked control resolves a real background-color token', async () => {
      const bg = getComputedStyle(control).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('transparent');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('Space toggles the checkbox back off', async () => {
      await userEvent.keyboard(' ');
      await expect(input).not.toBeChecked();
      await expect(control).toHaveAttribute('data-state', 'unchecked');
    });
  },
};

/**
 * Keyboard focus draws a visible focus ring on the control (WCAG 2.4.7).
 *
 * Regression guard for the phantom-selector fix: Ark emits NO
 * `data-focus-visible` attribute, so the ring is keyed off the native input's
 * `:focus-visible` projected onto the control via `:has()`. `userEvent.tab()`
 * produces a real keyboard focus that triggers `:focus-visible`, unlike a
 * programmatic `.focus()`. Against the old `[data-part='control'][data-focus-visible]`
 * selector the box-shadow stayed `none` and this story failed.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');
    const control = canvasElement.querySelector<HTMLElement>(
      "[data-scope='checkbox'][data-part='control']",
    )!;

    await step('no focus ring before keyboard focus', async () => {
      await expect(getComputedStyle(control).boxShadow).toBe('none');
    });

    await step('keyboard focus draws the token focus ring on the control', async () => {
      input.blur();
      await userEvent.tab();
      await expect(input).toHaveFocus();
      const ring = getComputedStyle(control).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** A disabled checkbox exposes its disabled state to AT and is inoperable. */
export const DisabledIsInert: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('checkbox');
    const control = canvasElement.querySelector<HTMLElement>(
      "[data-scope='checkbox'][data-part='control']",
    )!;

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(input).toBeDisabled();
      await expect(input).not.toBeChecked();
    });

    await step('the disabled control is styled distinctly from an enabled one', async () => {
      // Regression guard: the disabled treatment is keyed off Ark's
      // data-disabled on the control. Its surface must resolve to a real paint,
      // or the disabled affordance is invisible.
      await expect(control).toHaveAttribute('data-disabled');
      const disabledBg = getComputedStyle(control).backgroundColor;
      await expect(disabledBg).not.toBe('');
      await expect(disabledBg).not.toBe('transparent');
    });

    await step('a disabled input cannot be focused or toggled', async () => {
      input.focus();
      await expect(input).not.toHaveFocus();
      await expect(input).not.toBeChecked();
    });
  },
};

/** The indeterminate state propagates and shows its own indicator glyph. */
export const IndeterminateStateIsVisible: Story = {
  args: { checked: 'indeterminate' },
  play: async ({ canvasElement, step }) => {
    const control = canvasElement.querySelector<HTMLElement>(
      "[data-scope='checkbox'][data-part='control']",
    )!;
    const indicator = canvasElement.querySelector<HTMLElement>(
      "[data-scope='checkbox'][data-part='indicator']",
    )!;

    await step('control and indicator carry the indeterminate data-state', async () => {
      await expect(control).toHaveAttribute('data-state', 'indeterminate');
      await expect(indicator).toHaveAttribute('data-state', 'indeterminate');
    });

    await step('the indeterminate indicator is shown with its own glyph', async () => {
      const cs = getComputedStyle(indicator);
      await expect(cs.display).not.toBe('none');
      await expect(cs.backgroundImage).not.toBe('none');
    });
  },
};
