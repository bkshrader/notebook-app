import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Toggle } from './Toggle';

/**
 * Interaction / accessibility tests for the Toggle.
 *
 * Kept separate from the visual stories (`Toggle.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * animate/flash on load. Each story is named by behavior so a failure is
 * self-describing, each asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner output.
 *
 * `tags: ['test']` keeps these out of the docs gallery while still running in
 * the test runner (axe a11y pass + the regression guards below).
 */
const meta: Meta<typeof Toggle> = {
  title: 'Components/Forms/Toggle/Tests',
  component: Toggle,
  args: { 'aria-label': 'Bold', children: 'B', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Toggle>;

/**
 * Primary keyboard interaction: Space and Enter toggle the pressed state, and
 * the pressed styling resolves to a real (non-transparent) token value.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await step('starts unpressed', async () => {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAttribute('data-state', 'off');
    });

    await step('is keyboard-reachable (in the tab order)', async () => {
      await expect(button).not.toHaveAttribute('tabindex', '-1');
      button.focus();
      await expect(button).toHaveFocus();
    });

    await step('Space toggles on', async () => {
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('data-state', 'on');
    });

    await step('Space toggles back off', async () => {
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button).toHaveAttribute('data-state', 'off');
    });

    await step('Enter also toggles on', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(button).toHaveAttribute('data-state', 'on');
    });

    await step('pressed styling resolves to a real token value', async () => {
      // Backstop for a var(--token-*) that resolves to nothing: read the
      // computed background-color while the toggle is 'on' and assert it is a
      // real, non-transparent color.
      const bg = getComputedStyle(button).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard for the phantom `[data-focus-visible]` selector that was
 * replaced with the native `:focus-visible` pseudo. `userEvent.tab()` produces
 * a real keyboard focus that triggers `:focus-visible`, so the focus ring
 * (box-shadow) MUST render. Against the old broken selector this resolved to
 * 'none' and would fail.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await step('keyboard focus renders a visible focus ring', async () => {
      button.blur();
      await userEvent.tab();
      await expect(button).toHaveFocus();
      const ring = getComputedStyle(button).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Guard the WCAG 2.4.7 fix: hover must NOT draw the keyboard focus ring. The
 * old CSS grouped `:hover, :focus` so a hovered/mouse-focused toggle wrongly
 * received the ring; now hover only changes the background, and the ring is
 * keyboard-only. A non-focused toggle has no ring.
 */
export const HoverHasNoFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await step('an unfocused toggle has no focus ring', async () => {
      button.blur();
      await expect(getComputedStyle(button).boxShadow).toBe('none');
    });

    await step('hover changes the background but draws no focus ring', async () => {
      await userEvent.hover(button);
      // Hover is the pointer affordance; the keyboard ring stays off.
      await expect(getComputedStyle(button).boxShadow).toBe('none');
      const bg = getComputedStyle(button).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled toggle exposes its state to assistive tech, is removed from the
 * tab order, cannot be activated, and is styled distinctly from the enabled
 * state (regression guard for the `[data-disabled]` styling).
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Bold' });

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('disabled');
      await expect(button).toHaveAttribute('data-disabled');
    });

    await step('disabled toggle cannot be activated by keyboard', async () => {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await userEvent.keyboard(' ');
      await expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    await step('disabled styling differs from the enabled default', async () => {
      const cs = getComputedStyle(button);
      // Disabled uses surface-interactive-disabled / foreground-disabled — both
      // resolve to real, non-transparent token values.
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.cursor).toBe('not-allowed');
    });
  },
};

/**
 * The `size` prop drives the per-size `--toggle-*` scale: each size resolves a
 * distinct, real height (regression guard against the removed borrowed
 * `--token-tabs-*` tokens).
 */
export const SizeScale: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <Toggle {...args} size="small" aria-label="Small" />
      <Toggle {...args} size="medium" aria-label="Medium" />
      <Toggle {...args} size="large" aria-label="Large" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const small = canvas.getByRole('button', { name: 'Small' });
    const medium = canvas.getByRole('button', { name: 'Medium' });
    const large = canvas.getByRole('button', { name: 'Large' });

    await step('each size resolves a real, distinct height', async () => {
      const h = (el: HTMLElement) => parseFloat(getComputedStyle(el).blockSize);
      const [hs, hm, hl] = [h(small), h(medium), h(large)];
      await expect(hs).toBeGreaterThan(0);
      await expect(hm).toBeGreaterThan(hs);
      await expect(hl).toBeGreaterThan(hm);
    });
  },
};
