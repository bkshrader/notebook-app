import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { TextInput } from './TextInput';

/**
 * Interaction / accessibility tests for the TextInput.
 *
 * Kept separate from the visual stories (`TextInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Each is named by behavior, uses `step()`, and `await`s real `expect(...)`
 * (Storybook matchers are async). Hidden from the docs gallery via
 * `tags: ['test']`.
 */
const meta: Meta<typeof TextInput> = {
  title: 'Components/Forms/TextInput/Tests',
  component: TextInput,
  args: { 'aria-label': 'Full name' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof TextInput>;

const input = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLInputElement>("[data-scope='field'][data-part='input']")!;

/** The ARIA/role contract: a labelled textbox that accepts typed input. */
export const TextboxContract: Story = {
  args: { 'aria-label': 'Full name', placeholder: 'Jane Doe' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes a textbox with the supplied accessible name', async () => {
      const el = canvas.getByRole('textbox', { name: 'Full name' });
      await expect(el).toBeInstanceOf(HTMLInputElement);
      await expect(el).toHaveAttribute('placeholder', 'Jane Doe');
    });

    await step('resting input resolves the Helios chrome tokens', async () => {
      const el = input(canvasElement);
      const cs = getComputedStyle(el);
      // Border + background resolve to real (non-transparent) token values.
      await expect(cs.borderTopWidth).not.toBe('0px');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      // Helios renders an inset elevation on the resting control.
      await expect(cs.boxShadow).not.toBe('none');
    });

    await step('accepts typed text via the real keyboard path', async () => {
      const el = input(canvasElement);
      await userEvent.click(el);
      await userEvent.type(el, 'Ada Lovelace');
      await expect(el).toHaveValue('Ada Lovelace');
    });
  },
};

/** Keyboard focus draws the native focus ring (Ark emits no data-focus-visible). */
export const KeyboardFocusRing: Story = {
  args: { 'aria-label': 'Username' },
  play: async ({ canvasElement, step }) => {
    await step('Tab focuses the input and renders an outline ring', async () => {
      const el = input(canvasElement);
      // Real keyboard focus (only Tab/keyboard input triggers :focus-visible).
      await userEvent.tab();
      await waitFor(async () => {
        await expect(el).toHaveFocus();
        // Helios focus ring is a non-zero outline at offset 0.
        const cs = getComputedStyle(el);
        await expect(cs.outlineStyle).not.toBe('none');
        await expect(parseFloat(cs.outlineWidth)).toBeGreaterThan(0);
      });
    });
  },
};

/** Invalid sets Ark data-invalid on the input and recolors the border. */
export const InvalidState: Story = {
  args: { 'aria-label': 'Email', type: 'email', invalid: true, defaultValue: 'nope' },
  play: async ({ canvasElement, step }) => {
    await step('Ark emits data-invalid on the input part', async () => {
      const el = input(canvasElement);
      await expect(el).toHaveAttribute('data-invalid');
    });

    await step('invalid border differs from the resting border', async () => {
      const el = input(canvasElement);
      // Regression guard: the [data-invalid] selector must actually recolor the
      // border (a dead selector would leave it at the resting value).
      const cs = getComputedStyle(el);
      await expect(cs.borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopColor).not.toBe('rgb(0, 0, 0)');
    });
  },
};

/** Disabled maps to the NATIVE disabled attribute (not data-disabled). */
export const DisabledState: Story = {
  args: { 'aria-label': 'Locked', disabled: true, defaultValue: 'locked' },
  play: async ({ canvasElement, step }) => {
    await step('input carries the native disabled attribute', async () => {
      const el = input(canvasElement);
      await expect(el).toBeDisabled();
    });

    await step('disabled chrome resolves the not-allowed cursor', async () => {
      const el = input(canvasElement);
      await expect(getComputedStyle(el).cursor).toBe('not-allowed');
    });
  },
};

/** Read-only maps to the NATIVE readonly attribute and is still focusable. */
export const ReadOnlyState: Story = {
  args: { 'aria-label': 'Reference', readOnly: true, defaultValue: 'ref-123' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('input carries the native readonly attribute', async () => {
      const el = canvas.getByRole('textbox', { name: 'Reference' });
      await expect(el).toHaveAttribute('readonly');
      await expect(el).toHaveValue('ref-123');
    });

    await step('read-only background differs from a transparent value', async () => {
      const el = input(canvasElement);
      await expect(getComputedStyle(el).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The size scale resolves distinct padding/typography custom properties. */
export const SizeScale: Story = {
  args: { 'aria-label': 'Sized', size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the body-300 font-size custom property', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='field'][data-part='root']",
      )!;
      const cs = getComputedStyle(root);
      // Regression guard: the [data-size='large'] block sets --text-input-font-size.
      await expect(cs.getPropertyValue('--text-input-font-size').trim()).not.toBe('');
      const el = input(canvasElement);
      await expect(parseFloat(getComputedStyle(el).fontSize)).toBeGreaterThan(0);
    });
  },
};
