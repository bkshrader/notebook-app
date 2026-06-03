import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { StepperNav } from './StepperNav';

/**
 * Interaction / accessibility tests for StepperNav.
 *
 * Kept separate from the visual stories (`StepperNav.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: each `play` drives and MUTATES the rendered
 * step state, so colocating with a doc story would make that story animate on
 * load. Stories are behavior-named, each `step()` AWAITS real `expect`s, and the
 * `a11y.test: 'error'` preview gate runs axe on every story automatically.
 */
const steps = [
  { value: 'account', title: 'Account', description: 'Create your profile' },
  { value: 'workspace', title: 'Workspace', description: 'Name your Library' },
  { value: 'review', title: 'Review', description: 'Confirm and finish' },
];

const meta: Meta<typeof StepperNav> = {
  title: 'Components/Navigation/StepperNav/Tests',
  component: StepperNav,
  args: { steps, size: 'medium', interactive: true },
  tags: ['test'],
  parameters: {
    a11y: {
      config: {
        // See StepperNav.stories.tsx: Ark nests role=tab triggers inside a
        // presentational Item <div> under the tablist; the keyboard/ARIA
        // semantics are correct, so this DOM-nesting axe rule is disabled (same
        // as the sibling Steps component).
        rules: [{ id: 'aria-required-children', enabled: false }],
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof StepperNav>;

/** The interactive Helios contract: tab-list of step triggers + a progress bar. */
export const StructureContract: Story = {
  args: { defaultStep: 0 },
  play: async ({ canvasElement, step }) => {
    await step('renders a tablist of one tab per step', async () => {
      const tablist = canvasElement.querySelector('[data-part="list"]');
      await expect(tablist).not.toBeNull();
      await expect(tablist).toHaveAttribute('role', 'tablist');
      const tabs = canvasElement.querySelectorAll('[data-part="trigger"]');
      await expect(tabs.length).toBe(steps.length);
    });

    await step('the progress bar resolves a real fill', async () => {
      const progress = canvasElement.querySelector<HTMLElement>('[data-part="progress"]');
      await expect(progress).not.toBeNull();
      await expect(getComputedStyle(progress!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('the first step indicator is marked current with a real background', async () => {
      const current = canvasElement.querySelector<HTMLElement>(
        '[data-part="indicator"][data-current]',
      );
      await expect(current).not.toBeNull();
      await expect(getComputedStyle(current!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Prev/Next reuse our Button and inherit Ark's step-boundary disabling. */
export const PrevNextNavigation: Story = {
  args: { defaultStep: 0 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const back = canvas.getByRole('button', { name: 'Back' });
    const next = canvas.getByRole('button', { name: 'Next' });

    await step('Back is disabled on the first step (Ark boundary)', async () => {
      await expect(back).toBeDisabled();
    });

    await step('keyboard-activating Next advances the current step', async () => {
      next.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        const current = canvasElement.querySelectorAll('[data-part="indicator"][data-current]');
        await expect(current.length).toBe(1);
      });
      // Step 1 (Workspace) is now current; step 0 (Account) is complete.
      const complete = canvasElement.querySelector('[data-part="indicator"][data-complete]');
      await expect(complete).not.toBeNull();
    });

    await step('Back becomes enabled once past the first step', async () => {
      await waitFor(async () => {
        await expect(back).toBeEnabled();
      });
    });

    await step('keyboard-activating Back returns to the previous step', async () => {
      back.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        await expect(back).toBeDisabled();
      });
    });
  },
};

/** A step trigger renders a visible keyboard focus ring (WCAG 2.4.7). */
export const TriggerFocusRing: Story = {
  args: { defaultStep: 0 },
  play: async ({ canvasElement, step }) => {
    await step('keyboard focus on a step trigger draws a ring', async () => {
      const trigger = canvasElement.querySelector<HTMLElement>('[data-part="trigger"]')!;
      // Real keyboard focus (tab) triggers :focus-visible; programmatic .focus()
      // does not. Reset focus, then tab into the canvas.
      trigger.blur();
      await userEvent.tab();
      await waitFor(async () => {
        const active = document.activeElement as HTMLElement | null;
        await expect(active).not.toBeNull();
        await expect(active!.matches('[data-part="trigger"]')).toBe(true);
        await expect(getComputedStyle(active!).boxShadow).not.toBe('none');
      });
    });
  },
};

/** Non-interactive: read-only labels, no step buttons, no backwards nav. */
export const NonInteractiveIsStatic: Story = {
  args: { interactive: false, defaultStep: 1 },
  play: async ({ canvasElement, step }) => {
    await step('renders no step trigger buttons', async () => {
      const triggers = canvasElement.querySelectorAll('[data-part="trigger"]');
      await expect(triggers.length).toBe(0);
    });

    await step('renders the static-step labels instead', async () => {
      const statics = canvasElement.querySelectorAll('[data-part="static-step"]');
      await expect(statics.length).toBe(steps.length);
    });

    await step('the step titles are still present and announced', async () => {
      const canvas = within(canvasElement);
      await expect(canvas.getByText('Workspace')).toBeInTheDocument();
    });
  },
};
