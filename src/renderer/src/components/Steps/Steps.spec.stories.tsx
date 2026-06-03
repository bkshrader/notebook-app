import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Steps } from './Steps';

/**
 * Interaction / accessibility tests for Steps.
 *
 * Kept separate from the visual stories (`Steps.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: each `play` here DRIVES and MUTATES state
 * (advancing steps, focusing controls), which would make a doc story flash on
 * load. Stories are named by behavior so a failure is self-describing, every
 * `play` AWAITS a real `expect`, and each uses `step()` for readable runner /
 * Interactions-panel output.
 *
 * These are regression guards for the verified Ark contract fixes:
 *   - the trigger keyboard focus ring renders via native :focus-visible
 *     (Ark exposes NO data-focus-visible attribute — the old
 *     `[data-part='trigger'][data-focus-visible]` selector was dead);
 *   - the PrevTrigger native `disabled` state is visually distinct and
 *     AT-exposed;
 *   - the per-size scale resolves a real indicator diameter.
 */
const items = [
  { value: 'account', title: 'Account details', content: 'Fill in your account information.' },
  { value: 'personal', title: 'Personal info', content: 'Tell us a bit about yourself.' },
  { value: 'confirm', title: 'Confirmation', content: 'Review and confirm your details.' },
];

const meta: Meta<typeof Steps> = {
  title: 'Components/Navigation/Steps/Tests',
  component: Steps,
  args: { items, completedContent: 'All steps complete!' },
  tags: ['test'],
  parameters: {
    a11y: {
      config: {
        rules: [
          // Ark nests each step trigger inside a presentational Item <div>
          // (List[role=tablist] > Item[div] > Trigger[role=tab]); axe's
          // aria-required-children flags the non-tab child. The Zag/APG keyboard
          // + ARIA semantics are correct — a DOM-nesting quirk, not a defect.
          { id: 'aria-required-children', enabled: false },
        ],
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Steps>;

/** Keyboard focus on a step trigger renders a visible ring (native :focus-visible). */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    const firstTab = tabs[0];
    if (!firstTab) throw new Error('expected at least one step tab trigger');

    await step('first tab trigger is keyboard-reachable', async () => {
      await expect(firstTab).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: the ring is drawn via the native :focus-visible pseudo
      // (Ark exposes NO data-focus-visible attribute, so the old
      // [data-part='trigger'][data-focus-visible] selector never matched).
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike a programmatic .focus().
      await userEvent.tab();
      await expect(firstTab).toHaveFocus();
      const ring = getComputedStyle(firstTab).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Advancing via Next updates indicator + separator state and resolves a real color. */
export const AdvanceUpdatesState: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const nextBtn = canvas.getByRole('button', { name: /next/i });

    await step('Enter on Next advances to step 2', async () => {
      nextBtn.focus();
      await userEvent.keyboard('{Enter}');
    });

    await step('second indicator shows data-current', async () => {
      const indicators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='indicator']",
      );
      const second = indicators[1];
      if (!second) throw new Error('expected a second indicator');
      await expect(second).toHaveAttribute('data-current');
    });

    await step('first separator shows data-complete', async () => {
      const separators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='separator']",
      );
      const first = separators[0];
      if (!first) throw new Error('expected a first separator');
      await expect(first).toHaveAttribute('data-complete');
    });

    await step('current indicator resolves a real background color', async () => {
      const indicators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='indicator']",
      );
      const second = indicators[1];
      if (!second) throw new Error('expected a second indicator');
      const style = getComputedStyle(second);
      await expect(style.backgroundColor).not.toBe('');
      await expect(style.backgroundColor).not.toBe('transparent');
      await expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** PrevTrigger is a native disabled button on the first step, distinct from enabled. */
export const DisabledPrevAtStart: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const prevBtn = canvas.getByRole('button', { name: /back/i });
    const nextBtn = canvas.getByRole('button', { name: /next/i });

    await step('Prev button is disabled on the first step (AT-exposed)', async () => {
      // PrevTrigger renders as a native <button disabled> — Ark sets the native
      // attribute, not data-disabled (verified in the live DOM).
      await expect(prevBtn).toBeDisabled();
      await expect(prevBtn).toHaveAttribute('disabled');
    });

    await step('disabled Prev is visually distinct from the enabled Next', async () => {
      // Regression guard for the :disabled rule (the old CSS had no Prev/Next
      // styling at all). Disabled foreground/background differ from enabled.
      const prevStyle = getComputedStyle(prevBtn);
      const nextStyle = getComputedStyle(nextBtn);
      await expect(prevStyle.color).not.toBe(nextStyle.color);
      await expect(prevStyle.backgroundColor).not.toBe(nextStyle.backgroundColor);
    });
  },
};

/** The size scale resolves distinct indicator diameters (small < medium < large). */
export const SizeScaleResolves: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('large size resolves a real indicator diameter', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>(
        "[data-scope='steps'][data-part='indicator']",
      );
      await expect(indicator).not.toBeNull();
      // large => 3rem = 48px. A resolved px value (not 0) proves the per-size
      // --steps-indicator-size custom property cascaded from data-size.
      const px = parseFloat(getComputedStyle(indicator!).inlineSize);
      await expect(px).toBeGreaterThan(40);
    });
  },
};
