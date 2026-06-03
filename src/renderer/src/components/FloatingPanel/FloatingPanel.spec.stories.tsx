import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { FloatingPanel } from './FloatingPanel';
import { assertOverlayKeyboardCycle } from '../test-helpers';

/**
 * Interaction / accessibility tests for the FloatingPanel.
 *
 * Kept separate from the visual stories (`FloatingPanel.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` here drives and MUTATES state, so
 * colocating it with a doc story would make that story pop open / animate on
 * load. Each story is named by behavior, each `await`s a real `expect` (a `play`
 * without `expect` is a state-setter, not a test), and each uses `step()` for
 * readable runner output.
 *
 * This is a Tier B OVERLAY: the panel content renders in a Portal OUTSIDE the
 * story canvas, so post-open assertions query via `document.body`, not
 * `within(canvasElement)`. The shared `assertOverlayKeyboardCycle` covers the
 * trigger→open→focus-moves-in→Escape-closes→focus-returns contract; the
 * component-specific guards below cover the regression-prone state styling
 * (focus rings on the three native <button> parts, which Ark exposes via the
 * native :focus-visible pseudo — NOT a data-focus-visible attribute).
 */
const meta: Meta<typeof FloatingPanel> = {
  title: 'Components/Overlays/FloatingPanel/Tests',
  component: FloatingPanel,
  args: {
    title: 'Floating Panel',
    triggerLabel: 'Open Panel',
    children: <p>Panel body content.</p>,
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof FloatingPanel>;

/** The portalled panel content (role="dialog"), once it is open. */
function getContent() {
  return within(document.body).getByRole('dialog');
}

/**
 * Full keyboard contract for the portalled overlay: trigger is reachable, Enter
 * opens, focus moves into the panel, Escape closes and returns focus.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open panel/i,
      panelRole: 'dialog',
      noun: 'floating panel',
    });
  },
};

/**
 * Regression guard for the phantom `[data-part='trigger'][data-focus-visible]`
 * selector (Ark emits NO data-focus-visible; the Trigger is a native <button>).
 * `userEvent.tab()` produces a real keyboard focus that triggers :focus-visible,
 * unlike programmatic `.focus()` — so the ring resolves only with the corrected
 * native :focus-visible selector, and this assertion would FAIL against the old
 * dead [data-focus-visible] selector.
 */
export const TriggerFocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open panel/i });

    await step('keyboard focus draws a visible focus ring on the trigger', async () => {
      trigger.blur();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard for the phantom data-focus-visible selectors on the in-panel
 * control buttons (StageTrigger / CloseTrigger — both native <button>s). Opens
 * the panel, then Tabs to the close trigger and asserts its keyboard focus ring
 * resolves via native :focus-visible.
 */
export const ControlButtonsFocusRingRenders: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('panel is open and its control buttons are reachable', async () => {
      const close = await body.findByRole('button', { name: /close panel/i });
      await expect(close).toBeInTheDocument();
    });

    await step('keyboard focus draws a visible focus ring on the close trigger', async () => {
      const close = body.getByRole('button', { name: /close panel/i });
      close.focus();
      // Re-enter focus via keyboard so :focus-visible engages (matching the
      // real keyboard path; programmatic .focus() alone may not).
      close.blur();
      await userEvent.tab();
      // Walk focus to the close trigger if Tab didn't land there directly.
      let guard = 0;
      while (document.activeElement !== close && guard < 12) {
        await userEvent.tab();
        guard += 1;
      }
      await expect(close).toHaveFocus();
      const ring = getComputedStyle(close).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('a stage trigger also resolves a keyboard focus ring', async () => {
      const minimize = body.getByRole('button', { name: /minimize panel/i });
      minimize.focus();
      minimize.blur();
      await userEvent.tab();
      let guard = 0;
      while (document.activeElement !== minimize && guard < 12) {
        await userEvent.tab();
        guard += 1;
      }
      await expect(minimize).toHaveFocus();
      const ring = getComputedStyle(minimize).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * The content surface lays out as a flex column (regression guard for the
 * invalid `display: block flex` syntax, which browsers drop entirely — the
 * panel would have collapsed to its default block layout).
 */
export const ContentIsFlexColumn: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('content resolves a real flex column layout', async () => {
      const content = await body.findByRole('dialog');
      const cs = getComputedStyle(content);
      await expect(cs.display).toBe('flex');
      await expect(cs.flexDirection).toBe('column');
    });

    await step('the header lays out as a flex row', async () => {
      const header = document.body.querySelector<HTMLElement>(
        '[data-scope="floating-panel"][data-part="header"]',
      );
      await expect(header).not.toBeNull();
      await expect(getComputedStyle(header!).display).toBe('flex');
    });
  },
};

/**
 * Each icon-only control button exposes an accessible name (WCAG 4.1.2). Guards
 * against a regression that drops the aria-labels from the glyph-only buttons.
 */
export const ControlButtonsAreLabelled: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('the default-stage control buttons expose accessible names', async () => {
      // In the default stage Ark renders the Restore trigger with the `hidden`
      // attribute, so it is (correctly) absent from the accessibility tree;
      // minimize / maximize / close are the visible, name-accessible controls.
      await expect(
        await body.findByRole('button', { name: /minimize panel/i }),
      ).toBeInTheDocument();
      await expect(body.getByRole('button', { name: /maximize panel/i })).toBeInTheDocument();
      await expect(body.getByRole('button', { name: /close panel/i })).toBeInTheDocument();
    });

    await step('minimizing reveals the labelled Restore trigger', async () => {
      // Restore (stage="default") un-hides once the panel leaves the default
      // stage; it carries its own aria-label for WCAG 4.1.2.
      await userEvent.click(body.getByRole('button', { name: /minimize panel/i }));
      await expect(await body.findByRole('button', { name: /restore panel/i })).toBeInTheDocument();
    });
  },
};

/**
 * The minimize StageTrigger collapses the body (Ark sets data-minimized on the
 * Body; our CSS hides it). Guards the data-minimized → display:none rule.
 */
export const MinimizeHidesBody: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('clicking minimize hides the panel body', async () => {
      const minimize = await body.findByRole('button', { name: /minimize panel/i });
      await userEvent.click(minimize);
      await waitFor(async () => {
        const panelBody = document.body.querySelector<HTMLElement>(
          '[data-scope="floating-panel"][data-part="body"]',
        );
        await expect(panelBody).not.toBeNull();
        await expect(getComputedStyle(panelBody!).display).toBe('none');
      });
    });
  },
};

/**
 * The close trigger closes the panel and the content unmounts (unmountOnExit).
 */
export const CloseTriggerCloses: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('clicking close removes the panel content', async () => {
      const close = await body.findByRole('button', { name: /close panel/i });
      await userEvent.click(close);
      await waitFor(() =>
        expect(
          document.body.querySelector('[data-scope="floating-panel"][data-part="content"]'),
        ).toBeNull(),
      );
    });
  },
};

/** Sanity: when open, the dialog carries the open data-state Ark wires up. */
export const OpenStateAttribute: Story = {
  args: { defaultOpen: true },
  play: async ({ step }) => {
    await step('the open panel exposes data-state="open"', async () => {
      const content = await within(document.body).findByRole('dialog');
      await expect(content).toHaveAttribute('data-state', 'open');
      await expect(getContent()).toBe(content);
    });
  },
};
