import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ToggleGroup } from './ToggleGroup';

/**
 * Interaction / accessibility tests for the ToggleGroup.
 *
 * Kept separate from the visual stories (`ToggleGroup.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` here drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * flash/animate on load. Stories are named by behavior so a failure is
 * self-describing, each asserts with awaited `expect` (Storybook matchers are
 * async — an un-awaited matcher is an eslint failure and a silent test), and
 * each uses `step()` for readable runner / Interactions-panel output.
 *
 * `tags: ['test']` keeps these out of the docs gallery while still running in
 * the test runner.
 */
const alignItems = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const formatItems = [
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'underline', label: 'Underline' },
];

const meta: Meta<typeof ToggleGroup> = {
  title: 'Components/Forms/ToggleGroup/Tests',
  component: ToggleGroup,
  args: { items: alignItems },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ToggleGroup>;

/**
 * REGRESSION GUARD for the phantom-selector fix.
 *
 * Ark's toggle-group Item is a native <button> that emits NO data-focus-visible
 * (DOM-verified). The keyboard focus ring is therefore drawn by the native
 * `:focus-visible` pseudo-class. `userEvent.tab()` produces a real keyboard
 * focus that triggers `:focus-visible` (unlike programmatic `.focus()`), so the
 * box-shadow must resolve to the focus-ring token. This FAILS against the old
 * `[data-focus-visible]` selector (which never matched → ring was `none`).
 */
export const KeyboardFocusRing: Story = {
  args: { defaultValue: ['left'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });

    await step('Tab moves keyboard focus to the only tabbable item', async () => {
      // Reset focus to a known origin (body) so tab order is deterministic
      // regardless of which story ran before this one in the shared tab.
      (document.activeElement as HTMLElement | null)?.blur();
      // Roving tabindex: the checked item is the single tab stop. Tab until it
      // is focused (rides out any intervening focusable chrome).
      for (let i = 0; i < 4 && document.activeElement !== leftBtn; i++) {
        await userEvent.tab();
      }
      await expect(leftBtn).toHaveFocus();
    });

    await step('keyboard focus renders a visible focus ring via :focus-visible', async () => {
      const ring = getComputedStyle(leftBtn).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Roving-tabindex keyboard navigation: ArrowRight moves focus, Space activates.
 * The active item resolves a real (non-transparent) background — a computed
 * style backstop on the [data-state='on'] selector.
 */
export const KeyboardNavigation: Story = {
  args: { defaultValue: ['left'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });
    const centerBtn = canvas.getByRole('radio', { name: 'Center' });
    const rightBtn = canvas.getByRole('radio', { name: 'Right' });

    await step('initial state: Left is on, Center is off', async () => {
      await expect(leftBtn).toHaveAttribute('data-state', 'on');
      await expect(centerBtn).toHaveAttribute('data-state', 'off');
    });

    await step('focus first item directly (roving tabindex)', async () => {
      leftBtn.focus();
      await expect(document.activeElement).toBe(leftBtn);
    });

    await step('ArrowRight moves focus to Center; Space activates it', async () => {
      // focusNextToggle is wrapped in raf(), so waitFor the focus to settle.
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(document.activeElement).toBe(centerBtn));
      await userEvent.keyboard(' ');
      await expect(centerBtn).toHaveAttribute('data-state', 'on');
      await expect(leftBtn).toHaveAttribute('data-state', 'off');
    });

    await step('ArrowRight again moves focus to Right; Space activates it', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(document.activeElement).toBe(rightBtn));
      await userEvent.keyboard(' ');
      await expect(rightBtn).toHaveAttribute('data-state', 'on');
    });

    await step('active item resolves a non-transparent background', async () => {
      // The background-color transition (0.2s) interpolates from transparent, so
      // waitFor rides out the animation until the active surface token resolves.
      // The callback throws (synchronously) until the value settles; the awaited
      // expect afterward is the actual assertion.
      const transparent = new Set(['', 'transparent', 'rgba(0, 0, 0, 0)']);
      await waitFor(() => {
        if (transparent.has(getComputedStyle(rightBtn).backgroundColor)) {
          throw new Error('background still transparent');
        }
      });
      await expect(transparent.has(getComputedStyle(rightBtn).backgroundColor)).toBe(false);
    });
  },
};

/** Multiple mode: more than one item can be pressed at once. */
export const MultiplePressed: Story = {
  args: { items: formatItems, multiple: true, defaultValue: ['bold'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const bold = canvas.getByRole('button', { name: 'Bold' });
    const italic = canvas.getByRole('button', { name: 'Italic' });

    await step('activating a second item leaves the first pressed', async () => {
      await expect(bold).toHaveAttribute('data-state', 'on');
      await userEvent.click(italic);
      await expect(italic).toHaveAttribute('data-state', 'on');
      await expect(bold).toHaveAttribute('data-state', 'on');
    });
  },
};

/**
 * A whole disabled group exposes its disabled state and is inoperable: keyboard
 * navigation does not change the pressed item.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: ['center'], items: alignItems },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });
    const centerBtn = canvas.getByRole('radio', { name: 'Center' });

    await step('items expose the disabled state to assistive technology', async () => {
      await expect(leftBtn).toHaveAttribute('data-disabled');
    });

    await step('disabled group cannot be navigated or activated', async () => {
      leftBtn.focus();
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard(' ');
      await expect(centerBtn).toHaveAttribute('data-state', 'on');
      await expect(leftBtn).toHaveAttribute('data-state', 'off');
    });
  },
};

/**
 * A single disabled item differs visually from its enabled siblings (cursor +
 * dimmed) and cannot be activated by click.
 */
export const DisabledItemDiffersAndIsInert: Story = {
  args: {
    items: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center', disabled: true },
      { value: 'right', label: 'Right' },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });
    const centerBtn = canvas.getByRole('radio', { name: 'Center' });

    await step('disabled item carries data-disabled; enabled item does not', async () => {
      await expect(centerBtn).toHaveAttribute('data-disabled');
      await expect(leftBtn).not.toHaveAttribute('data-disabled');
    });

    await step('disabled item is visually distinct (not-allowed cursor)', async () => {
      await expect(getComputedStyle(centerBtn).cursor).toBe('not-allowed');
      await expect(getComputedStyle(leftBtn).cursor).toBe('pointer');
    });

    await step('disabled item cannot be activated', async () => {
      await userEvent.click(centerBtn, { pointerEventsCheck: 0 });
      await expect(centerBtn).toHaveAttribute('data-state', 'off');
    });
  },
};
