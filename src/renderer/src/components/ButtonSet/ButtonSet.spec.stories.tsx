import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ButtonSet } from './ButtonSet';

/**
 * Interaction / accessibility tests for the ButtonSet.
 *
 * Kept separate from the visual stories (`ButtonSet.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behaviour, each uses `step()` and `await`s real `expect(...)`
 * (Storybook matchers are async). Hidden from the docs gallery via
 * `tags: ['test']`.
 *
 * ButtonSet is presentational (Tier A-display): the tests assert its ARIA group
 * contract, structure, and the spacing/orientation/alignment layout tokens. The
 * one "interaction" case proves the container is inert — Tab moves focus through
 * the child Buttons, not onto the group div.
 */
const meta: Meta<typeof ButtonSet> = {
  title: 'Components/Actions/ButtonSet/Tests',
  component: ButtonSet,
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ButtonSet>;

/** The Helios/ARIA contract: a named role="group" wrapping the Buttons. */
export const GroupContract: Story = {
  args: {
    'aria-label': 'Form actions',
    children: (
      <>
        <button type="button">Save</button>
        <button type="button">Cancel</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('exposes a named group to assistive tech', async () => {
      // A role="group" is only useful named; getByRole with `name` asserts both
      // the role and the accessible name resolve (WCAG 1.3.1 / 4.1.2).
      const group = canvas.getByRole('group', { name: 'Form actions' });
      await expect(group).toBeInTheDocument();
      await expect(group.tagName).toBe('DIV');
      await expect(group).toHaveAttribute('data-part', 'button-set');
    });

    await step('the group is inert (no tabindex / focus ring of its own)', async () => {
      const group = canvas.getByRole('group', { name: 'Form actions' });
      // Regression guard: the container must NOT masquerade as a control.
      await expect(group).not.toHaveAttribute('tabindex');
    });

    await step('renders the Buttons it was given', async () => {
      await expect(canvas.getByRole('button', { name: 'Save' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  },
};

/** The default spacing resolves the Helios 16px gap in a row layout. */
export const DefaultSpacingAndLayout: Story = {
  args: {
    'aria-label': 'Default actions',
    children: (
      <>
        <button type="button">One</button>
        <button type="button">Two</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('lays out as a flex row with the 16px Helios gap', async () => {
      const group = canvas.getByRole('group', { name: 'Default actions' });
      const cs = getComputedStyle(group);
      // Regression guard: the [data-spacing=default] selector sets
      // --button-set-gap: 16px, consumed by the gap property.
      await expect(cs.getPropertyValue('--button-set-gap').trim()).toBe('16px');
      await expect(cs.display).toBe('flex');
      await expect(cs.flexDirection).toBe('row');
      // The resolved gap is a real, non-zero length.
      await expect(parseFloat(cs.columnGap)).toBeGreaterThan(0);
    });
  },
};

/** Compact spacing resolves the tighter 8px Helios gap. */
export const CompactSpacing: Story = {
  args: {
    spacing: 'compact',
    'aria-label': 'Compact actions',
    children: (
      <>
        <button type="button">One</button>
        <button type="button">Two</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('compact maps to the 8px gap and is smaller than default', async () => {
      const group = canvas.getByRole('group', { name: 'Compact actions' });
      await expect(group).toHaveAttribute('data-spacing', 'compact');
      const cs = getComputedStyle(group);
      // Regression guard: the compact selector applies its own gap token.
      await expect(cs.getPropertyValue('--button-set-gap').trim()).toBe('8px');
      // The compact gap is strictly smaller than the 16px default.
      await expect(parseFloat(cs.columnGap)).toBeLessThan(16);
    });
  },
};

/** Vertical orientation stacks the Buttons in a column. */
export const VerticalOrientation: Story = {
  args: {
    orientation: 'vertical',
    'aria-label': 'Stacked actions',
    children: (
      <>
        <button type="button">Top</button>
        <button type="button">Bottom</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('orientation=vertical resolves a column flex-direction', async () => {
      const group = canvas.getByRole('group', { name: 'Stacked actions' });
      await expect(group).toHaveAttribute('data-orientation', 'vertical');
      // Regression guard: the vertical selector flips flex-direction to column.
      await expect(getComputedStyle(group).flexDirection).toBe('column');
    });
  },
};

/** align=between distributes the Buttons with space-between. */
export const SpaceBetweenAlignment: Story = {
  args: {
    align: 'between',
    'aria-label': 'Wizard navigation',
    children: (
      <>
        <button type="button">Back</button>
        <button type="button">Continue</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('align=between resolves justify-content: space-between', async () => {
      const group = canvas.getByRole('group', { name: 'Wizard navigation' });
      await expect(group).toHaveAttribute('data-align', 'between');
      // Regression guard: the between selector applies space-between.
      await expect(getComputedStyle(group).justifyContent).toBe('space-between');
    });
  },
};

/** The container is inert: Tab moves focus through the child Buttons, not the div. */
export const KeyboardFlowsThroughButtons: Story = {
  args: {
    'aria-label': 'Sequential actions',
    children: (
      <>
        <button type="button">First</button>
        <button type="button">Second</button>
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Tab lands on the first Button (not the group)', async () => {
      const first = canvas.getByRole('button', { name: 'First' });
      await userEvent.tab();
      await waitFor(async () => {
        await expect(first).toHaveFocus();
      });
      // The control — not the group — carries the keyboard focus ring.
      await expect(first.matches(':focus-visible')).toBe(true);
    });

    await step('a second Tab advances to the next Button', async () => {
      const second = canvas.getByRole('button', { name: 'Second' });
      await userEvent.tab();
      await waitFor(async () => {
        await expect(second).toHaveFocus();
      });
    });
  },
};
