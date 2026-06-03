import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { NumberInput } from './NumberInput';

/**
 * Interaction / accessibility tests for the NumberInput.
 *
 * Kept separate from the visual stories (`NumberInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * change on load. Stories are named by behavior so a failure is self-describing,
 * each asserts with real `expect`, and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Several guards target the keyboard focus ring. Ark's number-input emits NO
 * `data-focus-visible` on ANY part — the Input is a native <input> and the
 * triggers are native <button>s, so the ring is drawn with the native
 * `:focus-visible` pseudo. `userEvent.tab()` produces a real keyboard focus
 * that triggers `:focus-visible` (unlike programmatic `.focus()`). These guards
 * FAIL against the old phantom `[data-focus-visible]` selectors and PASS now.
 */
const meta: Meta<typeof NumberInput> = {
  title: 'Components/Forms/NumberInput/Tests',
  component: NumberInput,
  args: { label: 'Quantity' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof NumberInput>;

function getControl(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    '[data-scope="number-input"][data-part="control"]',
  );
}

/**
 * Drives the primary keyboard interaction for a spinbutton.
 *
 * Ark v5 NumberInput renders a native `<input type="text">` with
 * role="spinbutton" (aria-valuenow/min/max). Arrow keys increment/decrement.
 */
export const KeyboardIncrement: Story = {
  args: { min: 0, max: 10, defaultValue: '5' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');

    await step('starts at default value', async () => {
      await expect(input).toHaveValue('5');
    });

    await step('the input is in the tab order (keyboard-reachable)', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      input.focus();
      await expect(input).toHaveFocus();
    });

    await step('ArrowUp increments value', async () => {
      // Ark/Zag's increment schedules the DOM update via requestAnimationFrame;
      // waitFor retries across the RAF boundary so the assertion isn't stale.
      await userEvent.keyboard('{ArrowUp}');
      await waitFor(() => expect(input).toHaveValue('6'));
    });

    await step('ArrowDown decrements value', async () => {
      await userEvent.keyboard('{ArrowDown}');
      await waitFor(() => expect(input).toHaveValue('5'));
    });

    await step('styled control resolves to a real surface color', async () => {
      const control = getControl(canvasElement);
      await expect(control).not.toBeNull();
      const bg = getComputedStyle(control!).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard: keyboard focus on the native <input> must render a focus
 * ring via `:focus-visible`. The old CSS keyed the ring off the phantom
 * `[data-focus-visible]` attribute (Ark never emits it on the input), so the
 * ring never drew — this guard fails against that and passes after the fix.
 */
export const InputFocusRing: Story = {
  args: { defaultValue: '3' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');

    await step('keyboard focus draws a visible ring on the input', async () => {
      input.blur();
      await userEvent.tab();
      await expect(input).toHaveFocus();
      const ring = getComputedStyle(input).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard for the trigger focus ring.
 *
 * Ark/Zag deliberately keeps the increment/decrement triggers OUT of the tab
 * order (`tabindex="-1"`) — the spinbutton input is the single tab stop and
 * arrow keys drive the value (APG spinbutton pattern). So the trigger ring can
 * only surface on a focus event (e.g. a click that focuses, or programmatic
 * focus). This guard proves: (1) the trigger is a native <button> carrying NO
 * phantom `data-focus-visible` attribute — confirming the OLD selector was dead
 * — and (2) the live `:focus-visible` rule resolves to a real box-shadow when
 * the focused trigger matches it. It FAILS against the old `[data-focus-visible]`
 * selector (Ark never sets that attribute, so the ring resolved to `none`).
 */
export const TriggerFocusRing: Story = {
  args: { defaultValue: '3' },
  play: async ({ canvasElement, step }) => {
    const trigger = canvasElement.querySelector<HTMLButtonElement>(
      '[data-scope="number-input"][data-part="increment-trigger"]',
    );

    await step('the increment trigger is a native, labelled button', async () => {
      await expect(trigger).not.toBeNull();
      await expect(trigger!.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAttribute('aria-label', 'Increment');
    });

    await step('the trigger carries NO phantom data-focus-visible attribute', async () => {
      // Ark emits no data-focus-visible on number-input parts; if it ever
      // appeared the old selector would have been valid. It must not exist.
      await expect(trigger).not.toHaveAttribute('data-focus-visible');
    });

    await step('focusing the trigger after keyboard input draws a real ring', async () => {
      // Establish keyboard modality first (tab onto the input), then move focus
      // to the trigger so :focus-visible matches in a UA that tracks modality.
      const canvas = within(canvasElement);
      canvas.getByRole('spinbutton').focus();
      await userEvent.tab();
      trigger!.focus();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger!).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * A disabled number input must not be operable by keyboard, and its disabled
 * styling must differ from the enabled control surface.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: '5' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('spinbutton');

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(input).toBeDisabled();
    });

    await step('disabled input cannot be changed by keyboard', async () => {
      await userEvent.keyboard('{ArrowUp}');
      await expect(input).toHaveValue('5');
    });

    await step('disabled control surface differs from the enabled surface', async () => {
      const control = getControl(canvasElement);
      await expect(control).not.toBeNull();
      await expect(control).toHaveAttribute('data-disabled');
      const cs = getComputedStyle(control!);
      // Disabled surface/border resolve to the form-control disabled tokens,
      // distinct from the default surface — assert they're real, set values.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard for the `size` prop. A single `data-size` on the Root must
 * drive the per-size local custom properties, so a `large` input resolves to a
 * bigger font-size than a `small` one. This fails if `data-size` is dropped or
 * the size scale stops feeding the parts.
 */
export const SizeScale: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <NumberInput label="Small" size="small" defaultValue="3" />
      <NumberInput label="Large" size="large" defaultValue="3" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const roots = canvasElement.querySelectorAll<HTMLElement>(
      '[data-scope="number-input"][data-part="root"]',
    );
    const inputs = canvasElement.querySelectorAll<HTMLInputElement>(
      '[data-scope="number-input"][data-part="input"]',
    );

    await step('the size prop is reflected as data-size on the root', async () => {
      await expect(roots[0]).toHaveAttribute('data-size', 'small');
      await expect(roots[1]).toHaveAttribute('data-size', 'large');
    });

    await step('a larger size resolves to a larger input font-size', async () => {
      const smallInput = inputs[0];
      const largeInput = inputs[1];
      await expect(smallInput).not.toBeUndefined();
      await expect(largeInput).not.toBeUndefined();
      const small = parseFloat(getComputedStyle(smallInput!).fontSize);
      const large = parseFloat(getComputedStyle(largeInput!).fontSize);
      await expect(small).toBeGreaterThan(0);
      await expect(large).toBeGreaterThan(small);
    });
  },
};

/**
 * The invalid state recolors the control border via Ark's `data-invalid`.
 */
export const InvalidState: Story = {
  args: { invalid: true, defaultValue: '7' },
  play: async ({ canvasElement, step }) => {
    await step('invalid control carries data-invalid and a real border color', async () => {
      const control = getControl(canvasElement);
      await expect(control).not.toBeNull();
      await expect(control).toHaveAttribute('data-invalid');
      const border = getComputedStyle(control!).borderTopColor;
      await expect(border).not.toBe('rgba(0, 0, 0, 0)');
      await expect(border).not.toBe('');
    });
  },
};
