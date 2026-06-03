import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { StepperIndicator } from './StepperIndicator';

/**
 * Interaction / accessibility tests for StepperIndicator.
 *
 * Kept separate from the visual stories (`StepperIndicator.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 *
 * StepperIndicator is PRESENTATIONAL (a static visual decorator — no focus,
 * keyboard, or selection state of its own; per Helios it is not WCAG-conformant
 * in isolation), so per the Component Library Tier A-display contract these
 * assert the ARIA/role + structure + token-resolution contract, NOT a keyboard
 * path. Named by behavior so a failure is self-describing; each `step()` awaits a
 * real async `expect(...)`.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof StepperIndicator> = {
  title: 'Components/Navigation/StepperIndicator/Tests',
  component: StepperIndicator,
  args: { label: 'Step 1 of 4', type: 'step', status: 'incomplete', step: 1 },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof StepperIndicator>;

/** The accessible-name + role contract: an image with the supplied label. */
export const AccessibleNameContract: Story = {
  args: { label: 'Step 2 of 4: in progress', status: 'progress', step: 2 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes role=img with the supplied accessible name', async () => {
      // WCAG 4.1.2: the decorator is named via aria-label since it carries
      // meaning on its own. getByRole resolves the accessible name.
      const indicator = canvas.getByRole('img', { name: 'Step 2 of 4: in progress' });
      await expect(indicator).toBeInTheDocument();
      await expect(indicator).toHaveAttribute('data-part', 'root');
    });

    await step('the decorative hexagon SVG is hidden from assistive tech', async () => {
      const hexagon = canvasElement.querySelector("[data-part='hexagon']");
      await expect(hexagon).not.toBeNull();
      await expect(hexagon).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** A numbered step renders its step number text inside the status overlay. */
export const StepShowsNumber: Story = {
  args: { label: 'Step 3 of 5', type: 'step', status: 'incomplete', step: 3 },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the step number text is rendered', async () => {
      const text = canvas.getByText('3');
      await expect(text).toBeInTheDocument();
      await expect(text.closest("[data-part='text']")).not.toBeNull();
    });
  },
};

/** The complete status swaps the number for a check icon (no step text). */
export const CompleteShowsCheckIcon: Story = {
  args: { label: 'Step 1 of 4: complete', status: 'complete', step: 1 },
  play: async ({ canvasElement, step }) => {
    await step('a check icon replaces the step number when complete', async () => {
      const icon = canvasElement.querySelector("[data-part='icon']");
      await expect(icon).not.toBeNull();
      // The numbered text part is NOT rendered for a complete indicator.
      const text = canvasElement.querySelector("[data-part='text']");
      await expect(text).toBeNull();
    });
  },
};

/**
 * Each status resolves a distinct, real hexagon fill — proving the
 * data-status token selectors actually apply (a dead selector would leave the
 * fill unchanged across statuses).
 */
export const StatusFillsResolve: Story = {
  args: { label: 'Step 2 of 4: in progress', status: 'progress', step: 2 },
  render: (args) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <StepperIndicator label="incomplete" status="incomplete" step={1} />
      <StepperIndicator {...args} />
      <StepperIndicator label="complete" status="complete" step={3} />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const paths = Array.from(
      canvasElement.querySelectorAll<SVGPathElement>("[data-part='hexagon'] path"),
    );

    await step('all three indicators render a hexagon path', async () => {
      await expect(paths.length).toBe(3);
    });

    await step('each status resolves a non-empty fill', async () => {
      // Regression guard: a fill computing to '' / fully-transparent would mean
      // the data-status fill selector is dead.
      for (const path of paths) {
        const fill = getComputedStyle(path).fill;
        await expect(fill).not.toBe('');
        await expect(fill).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    await step('incomplete and progress fills differ (selectors are live)', async () => {
      const [incomplete, progress] = paths;
      if (!incomplete || !progress) throw new Error('expected incomplete + progress paths');
      await expect(getComputedStyle(incomplete).fill).not.toBe(getComputedStyle(progress).fill);
    });
  },
};

/** A processing indicator renders the animated spinner glyph. */
export const ProcessingShowsSpinner: Story = {
  args: { label: 'Step 2 of 4: processing', status: 'processing', step: 2 },
  play: async ({ canvasElement, step }) => {
    await step('the spinner glyph is present for the processing status', async () => {
      const spinner = canvasElement.querySelector("[data-part='icon'][data-spinner]");
      await expect(spinner).not.toBeNull();
    });
  },
};
