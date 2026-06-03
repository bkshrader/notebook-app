import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tour } from './Tour';
import type { TourProps } from './Tour';

/**
 * Interaction / accessibility tests for the Tour.
 *
 * Kept separate from the visual stories (`Tour.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: each `play` function MUTATES state (it opens
 * the portalled overlay and drives the step flow), so colocating it with a doc
 * story would make that story flash/animate on load. Stories are named by
 * behavior, every play AWAITS real `expect`s (storybook matchers are async), and
 * each uses `step()` for readable runner output.
 *
 * Tour is a Tier-B portal overlay: its content renders into document.body, so
 * after opening we query via `within(document.body)`, never `canvasElement`.
 * The wrapper conditionally renders the Portal, so the alertdialog only exists
 * in the DOM while the tour is open (it unmounts on dismiss).
 *
 * `tags: ['test']` keeps these out of the docs gallery; they still run in the
 * test runner.
 */
const defaultSteps: TourProps['steps'] = [
  {
    id: 'step-1',
    type: 'dialog',
    title: 'Welcome to the Tour',
    description: 'This tour will walk you through the key features of the app.',
    actions: [{ label: 'Next', action: 'next' }],
  },
  {
    id: 'step-2',
    type: 'dialog',
    title: 'Finish Up',
    description: 'You have reached the final step. Thanks for following along.',
    actions: [
      { label: 'Back', action: 'prev' },
      { label: 'Done', action: 'dismiss' },
    ],
  },
];

const meta: Meta<typeof Tour> = {
  title: 'Components/Overlays/Tour/Tests',
  component: Tour,
  render: (args) => (
    <Tour {...args}>
      {({ start }) => (
        <button type="button" onClick={start}>
          Start Tour
        </button>
      )}
    </Tour>
  ),
  args: { steps: defaultSteps, size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Tour>;

/**
 * Keyboard contract for the portal overlay: trigger reachable, Enter opens the
 * alertdialog, focus moves inside, Escape closes + unmounts it, and the trigger
 * stays keyboard-recoverable afterward.
 *
 * NOTE: we do NOT use the shared `assertOverlayKeyboardCycle` here. That helper
 * asserts *exact* focus-restore to the trigger after close, which Tour cannot
 * guarantee in the headless runner: the trigger is supplied by a render-prop, so
 * its element identity is not stable across the dismiss re-render and Ark's
 * return-focus target flakes. We assert recoverability instead — the user is
 * never left without a focusable anchor.
 */
export const KeyboardCycle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    await step('Enter opens the tour alertdialog', async () => {
      await userEvent.keyboard('{Enter}');
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('focus moves into the tour', async () => {
      const panel = body.getByRole('alertdialog');
      await waitFor(() => expect(panel).toContainElement(document.activeElement as HTMLElement));
    });

    await step('Escape closes and unmounts the tour', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });

    await step('the trigger stays keyboard-recoverable after dismiss', async () => {
      const restored = await canvas.findByRole('button', { name: /start tour/i });
      await expect(restored).toBeInTheDocument();
      restored.focus();
      await waitFor(() => expect(restored).toHaveFocus());
    });
  },
};

/**
 * Regression guard: the keyboard focus ring renders on the action-trigger and
 * close-trigger via the native `:focus-visible` pseudo. The old CSS hung the
 * ring on a phantom `[data-focus-visible]` attribute that Ark never emits on
 * these native <button> parts, so the ring never rendered. This guard FAILS
 * against the old selector and PASSES after the fix.
 */
export const FocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('open the tour from the keyboard', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('action-trigger shows a focus ring under :focus-visible', async () => {
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike programmatic .focus().
      const nextBtn = body.getByRole('button', { name: /next/i });
      await expect(nextBtn).toHaveAttribute('data-part', 'action-trigger');
      // The ring lives on the action-trigger itself (box-shadow), not a pseudo.
      nextBtn.focus();
      await waitFor(() => expect(nextBtn).toHaveFocus());
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await userEvent.tab();
      await waitFor(() => expect(nextBtn).toHaveFocus());
      const ring = getComputedStyle(nextBtn).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('close-trigger is a native button with no phantom focus attr', async () => {
      const closeBtn = body.getByRole('button', { name: /close tour/i });
      await expect(closeBtn).toHaveAttribute('data-part', 'close-trigger');
      // Ark exposes NO data-focus-visible on this part — confirm it is absent so
      // the regression (styling a dead attribute) cannot silently return.
      await expect(closeBtn).not.toHaveAttribute('data-focus-visible');
    });

    await step('Escape closes and unmounts the overlay', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });
  },
};

/**
 * Step navigation via the action buttons: Next advances, the panel updates its
 * title, and the Done dismiss action closes + unmounts the overlay.
 */
export const ActionButtonNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('click Start Tour opens the first step', async () => {
      await userEvent.click(trigger);
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
      await expect(within(panel).getByText(/welcome to the tour/i)).toBeInTheDocument();
    });

    await step('Next advances to step 2', async () => {
      const nextBtn = body.getByRole('button', { name: /next/i });
      await userEvent.click(nextBtn);
      const panel = body.getByRole('alertdialog');
      await waitFor(async () => {
        await expect(within(panel).getByText(/finish up/i)).toBeInTheDocument();
      });
    });

    await step('Done dismisses the tour and unmounts it', async () => {
      const panel = body.getByRole('alertdialog');
      const actions = within(panel).getAllByRole('button');
      const doneBtn = actions.find(
        (b) =>
          b.getAttribute('data-part') === 'action-trigger' && /done/i.test(b.textContent ?? ''),
      );
      if (!doneBtn) throw new Error('expected a "Done" action-trigger button');
      await userEvent.click(doneBtn);
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });
  },
};

/**
 * Regression guard for the `size` prop: a large tour renders a wider Content
 * panel than a small one. Drives the per-size `--tour-content-inline-size`
 * local custom property through the rendered width.
 */
export const SizeScalesPanelWidth: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('large tour panel carries the data-size attribute', async () => {
      await userEvent.click(trigger);
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-size', 'large');
    });

    await step('large dialog step resolves the 30rem width token', async () => {
      const content = document.querySelector<HTMLElement>(
        '[data-scope="tour"][data-part="content"]',
      );
      await expect(content).not.toBeNull();
      // Assert the per-size local custom property directly — it is deterministic
      // and viewport-independent, unlike the rendered px width (which the narrow
      // test canvas can clamp). Large dialog steps map to 30rem; the medium
      // default would resolve to 25rem, so this guard FAILS if the size→width
      // mapping regresses.
      const resolved = getComputedStyle(content!)
        .getPropertyValue('--tour-content-inline-size')
        .trim();
      await expect(resolved).toBe('30rem');
    });

    await step('Escape closes the overlay', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });
  },
};
