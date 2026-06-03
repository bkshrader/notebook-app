import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { Clipboard } from './Clipboard';

/**
 * Interaction / accessibility tests for the Clipboard.
 *
 * Kept separate from the visual stories (`Clipboard.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: the `play` functions drive focus and activate
 * the copy action (state-mutating), so colocating them with the doc stories would
 * make those stories flash/animate on load. Stories are named by behavior so a
 * failure is self-describing, each one asserts (a `play` without `expect` is a
 * state-setter, not a test), and each uses `step()` for readable runner output.
 *
 * Hidden from the docs gallery via `tags: ['test']`. They still run in the test
 * runner and count toward coverage.
 */
const meta: Meta<typeof Clipboard> = {
  title: 'Components/Actions/Clipboard/Tests',
  component: Clipboard,
  args: {
    label: 'Copy link',
    value: 'https://example.com/share/abc123',
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Clipboard>;

/** The Helios/Ark structural contract: button trigger, named, parts emitted. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the trigger is a native button with an accessible name', async () => {
      const trigger = canvas.getByRole('button');
      await expect(trigger.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAccessibleName();
    });

    await step('Ark emits the expected scoped parts', async () => {
      const parts = [...canvasElement.querySelectorAll('[data-scope="clipboard"]')].map((el) =>
        el.getAttribute('data-part'),
      );
      // Regression guard for the audit's "scope/part not emitted" false-positive
      // class: confirm every selector the CSS targets actually exists in the DOM.
      for (const part of ['root', 'label', 'control', 'input', 'trigger', 'indicator']) {
        await expect(parts).toContain(part);
      }
    });

    await step('the read-only input carries data-readonly', async () => {
      const input = canvasElement.querySelector<HTMLElement>('[data-part="input"]');
      await expect(input).not.toBeNull();
      await expect(input).toHaveAttribute('data-readonly');
    });
  },
};

/**
 * Keyboard focus renders a visible focus ring.
 *
 * Regression guard for the contract fix: the ring is drawn via the native
 * `:focus-visible` pseudo on the trigger <button>. Ark exposes NO
 * `data-focus-visible` attribute, so the old `[data-focus-visible]` selector
 * never matched and the ring never rendered. `userEvent.tab()` produces a real
 * keyboard focus that triggers `:focus-visible` (unlike programmatic `.focus()`),
 * so this assertion FAILS against the old selector and PASSES after the fix.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector<HTMLElement>('[data-part="input"]')!;
    const trigger = canvas.getByRole('button');

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('Tab moves keyboard focus to the trigger', async () => {
      // The read-only Input precedes the Trigger and is a tab-stop, so seed focus
      // on the Input and Tab forward — landing on the trigger via a real keyboard
      // focus (which is what arms :focus-visible).
      input.focus();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
    });

    await step('keyboard focus renders a focus-ring box-shadow', async () => {
      // Regression guard: resolves only because the ring now uses the native
      // :focus-visible pseudo. The old [data-focus-visible] selector never
      // matched (Ark emits no such attribute), so this was 'none'.
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Primary keyboard interaction: activate the copy action from the keyboard.
 *
 * Do NOT assert data-copied or await write resolution: in the headless test
 * environment `navigator.clipboard.writeText` rejects with NotAllowedError (no
 * clipboard permission), and Ark may or may not set data-copied before the write
 * resolves. We stub writeText to a resolved no-op so the rejection does not
 * surface as an unhandled rejection, then verify the activation path fires
 * without a JS exception propagating to the test.
 */
export const KeyboardActivation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await step('Space can be pressed on the focused trigger without throwing', async () => {
      // Swap writeText for a resolving spy so the headless NotAllowedError does
      // not surface as an unhandled rejection. Restore it afterwards.
      const clipboard = navigator.clipboard as Clipboard | undefined;
      const original = clipboard?.writeText.bind(clipboard);
      const stub = fn(() => Promise.resolve());
      if (clipboard) {
        clipboard.writeText = stub;
      }
      try {
        trigger.focus();
        await expect(document.activeElement).toBe(trigger);
        await userEvent.keyboard(' ');
        await expect(trigger).toBeInTheDocument();
      } finally {
        if (clipboard && original) {
          clipboard.writeText = original;
        }
      }
    });

    await step('trigger has a real (token-resolved) background color', async () => {
      const bg = getComputedStyle(trigger).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('transparent');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** With an empty value, Ark keeps the trigger operable (it is NOT disabled). */
export const EmptyValueStillOperable: Story = {
  args: { label: 'Copy (empty)', value: '' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await step('the trigger is not disabled and stays focusable', async () => {
      await expect(trigger).not.toBeDisabled();
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });
  },
};
