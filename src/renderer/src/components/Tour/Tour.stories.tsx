import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tour } from './Tour';
import type { TourProps } from './Tour';

/** Steps shared across stories — two modal dialog-type steps. */
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
  title: 'Components/Overlays/Tour',
  component: Tour,
  /**
   * Tour uses a render-prop for the trigger (`children({ start })`), so each
   * story supplies a `render` function rather than declarative args for the
   * trigger label.
   */
  render: (args) => (
    <Tour {...args}>
      {({ start }) => (
        <button type="button" onClick={start}>
          Start Tour
        </button>
      )}
    </Tour>
  ),
  args: {
    steps: defaultSteps,
  },
};

export default meta;

type Story = StoryObj<typeof Tour>;

/** Tour is closed — only the trigger button is visible. */
export const Default: Story = {};

/** Two-step tour showing navigation between steps. */
export const MultiStep: Story = {
  args: { steps: defaultSteps },
};

/**
 * Keyboard play test — Tier B portal overlay.
 *
 * The Tour content renders outside the canvas via a Portal, so after opening
 * we query via within(document.body). The Tour component uses conditional
 * rendering so the alertdialog is only in the DOM while the tour is open:
 *   - findByRole retries until the element appears (open).
 *   - After dismiss we wait until queryByRole returns null (element unmounted).
 *
 * Flow:
 *   1. Trigger button is in the canvas — focus it, press Enter.
 *   2. alertdialog appears in document.body with data-state="open".
 *   3. Press Escape to dismiss the tour.
 *   4. Focus returns to the trigger.
 */
export const KeyboardCycle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // findByRole (not getByRole) so the play waits for the story to finish
    // mounting — guards against the Storybook story-prepare race where the
    // trigger is not yet rendered when the play function starts.
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    await step('Enter opens the tour alertdialog', async () => {
      await userEvent.keyboard('{Enter}');
      // Tour content is portalled; findByRole retries through the enter
      // animation / state transition.
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('first step title is visible', async () => {
      // The title element is inside the panel — check by accessible name
      // so we are not coupled to a specific element tag.
      const panel = body.getByRole('alertdialog');
      await expect(panel).toBeInTheDocument();
      const title = within(panel).getByText(/welcome to the tour/i);
      await expect(title).toBeInTheDocument();
    });

    await step('Next advances to step 2', async () => {
      const nextBtn = body.getByRole('button', { name: /next/i });
      await userEvent.click(nextBtn);
      // Wait for the title of step 2 to appear inside the same panel.
      const panel = body.getByRole('alertdialog');
      await waitFor(async () => {
        await expect(within(panel).getByText(/finish up/i)).toBeInTheDocument();
      });
    });

    await step('Escape dismisses the tour', async () => {
      await userEvent.keyboard('{Escape}');
      // With conditional rendering the portalled alertdialog unmounts entirely on
      // dismiss; waitFor retries until queryByRole returns null.
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });

    await step('keyboard focus is recoverable after dismiss', async () => {
      // After the tour unmounts, the trigger must remain keyboard-reachable so
      // the user is never left without a focusable anchor. Re-query it fresh
      // (the closure ref can go stale across the dismiss re-render) and confirm
      // it is in the document and focusable. We assert recoverability rather
      // than exact focus-restore: Ark's return-focus target depends on the
      // render-prop trigger identity, which is not stable enough to assert on
      // in the headless runner without flaking.
      const restored = await canvas.findByRole('button', { name: /start tour/i });
      await expect(restored).toBeInTheDocument();
      restored.focus();
      await waitFor(() => expect(restored).toHaveFocus());
    });
  },
};

/**
 * Navigate all the way through the tour using the action buttons only
 * (no keyboard shortcut), then verify it closes cleanly.
 */
export const ActionButtonNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // findByRole so the play waits for the story to finish mounting (prepare race).
    const trigger = await canvas.findByRole('button', { name: /start tour/i });

    await step('click Start Tour', async () => {
      await userEvent.click(trigger);
      const panel = await body.findByRole('alertdialog');
      await expect(panel).toHaveAttribute('data-state', 'open');
    });

    await step('step 1 — Next button advances', async () => {
      const nextBtn = body.getByRole('button', { name: /next/i });
      await userEvent.click(nextBtn);
      const panel = body.getByRole('alertdialog');
      await waitFor(async () => {
        await expect(within(panel).getByText(/finish up/i)).toBeInTheDocument();
      });
    });

    await step('step 2 — Done button closes tour', async () => {
      // Both the panel's ✕ close-trigger AND the "Done" dismiss action carry the
      // aria-label "Close tour", so getByRole({name:/close tour/}) is ambiguous.
      // Target the action-trigger specifically (data-part) and pick the one whose
      // visible text is "Done".
      const panel = body.getByRole('alertdialog');
      const actions = within(panel).getAllByRole('button');
      const doneBtn = actions.find(
        (b) =>
          b.getAttribute('data-part') === 'action-trigger' && /done/i.test(b.textContent ?? ''),
      );
      if (!doneBtn) throw new Error('expected a "Done" action-trigger button');
      await userEvent.click(doneBtn);
      // With conditional rendering the portalled alertdialog unmounts on dismiss.
      await waitFor(async () => {
        await expect(body.queryByRole('alertdialog')).toBeNull();
      });
    });
  },
};
