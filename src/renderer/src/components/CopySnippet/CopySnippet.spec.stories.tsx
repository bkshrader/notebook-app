import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CopySnippet } from './CopySnippet';

/**
 * Interaction / accessibility tests for the CopySnippet.
 *
 * Kept separate from the visual stories (`CopySnippet.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: the `play` functions drive focus and activate
 * the copy action (state-mutating), so colocating them with the doc stories would
 * make those stories flash/animate on load. Stories are named by behavior so a
 * failure is self-describing, each one asserts real `expect(...)` (a `play`
 * without `expect` is a state-setter, not a test), and each uses `step()` for
 * readable runner output.
 *
 * Hidden from the docs gallery via `tags: ['test']`. They still run in the test
 * runner and count toward coverage (incl. the axe a11y pass).
 */
const meta: Meta<typeof CopySnippet> = {
  title: 'Components/Actions/CopySnippet/Tests',
  component: CopySnippet,
  args: {
    text: 'npm install @notebook-app/core',
    color: 'primary',
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof CopySnippet>;

/**
 * The Helios/Ark structural contract: the whole snippet is one native button
 * whose accessible name is the visible text (WCAG 4.1.2), and Ark emits the
 * scoped parts the CSS targets.
 */
export const StructureContract: Story = {
  args: { text: 'cluster-id-7f3a9c2e' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the trigger is a native button with an accessible name', async () => {
      // Ark's Clipboard.Trigger applies aria-label="Copy to clipboard", so the
      // button announces the ACTION (not the raw snippet text) to a screen
      // reader — the WCAG 4.1.2 name is the action, and the snippet text is the
      // visible content. Assert the button exists, is a native <button>, and
      // carries a non-empty accessible name.
      const trigger = canvas.getByRole('button');
      await expect(trigger.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAccessibleName();
    });

    await step('the visible text renders under the text part', async () => {
      const text = canvas.getByText('cluster-id-7f3a9c2e');
      await expect(text.closest("[data-part='text']")).not.toBeNull();
    });

    await step('Ark emits the scoped parts the CSS targets', async () => {
      const parts = [...canvasElement.querySelectorAll('[data-scope="clipboard"]')].map((el) =>
        el.getAttribute('data-part'),
      );
      // Regression guard for the "scope/part not emitted" false-positive class:
      // confirm every Ark selector the CSS targets actually exists in the DOM.
      for (const part of ['root', 'trigger', 'indicator']) {
        await expect(parts).toContain(part);
      }
    });

    await step('our own text wrapper part is rendered', async () => {
      await expect(canvasElement.querySelector("[data-part='text']")).not.toBeNull();
    });
  },
};

/**
 * Keyboard focus renders a visible focus ring on the trigger.
 *
 * Regression guard: the ring is drawn on the trigger's `::before` via the native
 * `:focus-visible` pseudo (Ark emits NO `data-focus-visible` on the Trigger
 * button). `userEvent.tab()` produces a real keyboard focus that arms
 * `:focus-visible` (unlike programmatic `.focus()`), so the ring resolves.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('Tab moves keyboard focus to the trigger', async () => {
      // The snippet button is the only tab-stop in the canvas, so Tab from the
      // document body lands on it via a real keyboard focus (which arms
      // :focus-visible).
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
    });

    await step('keyboard focus renders a focus-ring box-shadow', async () => {
      // Regression guard: resolves only because the ring uses the native
      // :focus-visible pseudo on the trigger <button> (Ark emits no
      // data-focus-visible). The action focus-ring token is an inset+outset
      // box-shadow applied directly to the button.
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Primary keyboard interaction: activate the copy action from the keyboard.
 *
 * Do NOT await clipboard write resolution: in the headless test environment
 * `navigator.clipboard.writeText` rejects with NotAllowedError. We stub it with
 * a resolving spy so the rejection does not surface as an unhandled rejection,
 * then verify the activation path fires without a JS exception, and that the
 * trigger color resolves to a real token (not an empty/unset value).
 */
export const KeyboardActivation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await step('Space activates the focused trigger without throwing', async () => {
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

    await step('the trigger text resolves a real (token) color', async () => {
      // primary text uses --token-color-foreground-action; assert it is a real
      // resolved color, not an empty/unset value.
      const color = getComputedStyle(trigger).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * The secondary color resolves a body-foreground text but keeps the icon
 * action-colored — a distinct treatment from primary.
 */
export const SecondaryColor: Story = {
  args: { color: 'secondary', text: 'secondary-token' },
  play: async ({ canvasElement, step }) => {
    await step('data-color is reflected on the root for the variant selector', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-color', 'secondary');
    });

    await step('the indicator (icon) resolves the action foreground token', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>("[data-part='indicator']")!;
      const iconColor = getComputedStyle(indicator).color;
      await expect(iconColor).not.toBe('');
      await expect(iconColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Truncation clamps the text to a single ellipsized line (Helios
 * `--is-truncated`): the text part computes `text-overflow: ellipsis` and
 * `white-space: nowrap`.
 */
export const TruncatedClampsText: Story = {
  args: {
    isTruncated: true,
    text: 'sk-proj-aVeryLongSecretTokenThatShouldBeClampedToOneEllipsizedLine0123456789',
  },
  play: async ({ canvasElement, step }) => {
    await step('the root carries the truncated flag', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-truncated');
    });

    await step('the text part is single-line with an ellipsis overflow', async () => {
      const text = canvasElement.querySelector<HTMLElement>("[data-part='text']")!;
      const cs = getComputedStyle(text);
      await expect(cs.whiteSpace).toBe('nowrap');
      await expect(cs.textOverflow).toBe('ellipsis');
      await expect(cs.overflow).toBe('hidden');
    });
  },
};
