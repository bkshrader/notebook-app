import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Progress } from './Progress';

const meta: Meta<typeof Progress> = {
  title: 'Components/Feedback/Progress',
  component: Progress,
  args: {
    label: 'Loading',
    defaultValue: 50,
    min: 0,
    max: 100,
  },
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    defaultValue: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    min: { control: 'number' },
    max: { control: 'number' },
  },
};

export default meta;

type Story = StoryObj<typeof Progress>;

export const Default: Story = {};

export const Complete: Story = {
  args: { defaultValue: 100, label: 'Upload complete' },
};

export const Indeterminate: Story = {
  args: { value: null, label: 'Processing…' },
};

/**
 * Tier A-display play test: asserts the ARIA contract on the progress bar.
 *
 * Ark/Zag render `role="progressbar"` on the root element and wire
 * `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` automatically from the
 * `value`/`min`/`max` props. When `value` is `null` the bar is indeterminate
 * and `aria-valuenow` is absent (the spec requires omitting it in that state).
 *
 * The axe pass runs automatically via the preview's `a11y.test: 'error'`
 * config, so this play function asserts only the structural ARIA contract.
 */
export const AriaContract: Story = {
  args: { defaultValue: 40, min: 0, max: 100, label: 'File upload' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders a progressbar role', async () => {
      const bar = canvas.getByRole('progressbar');
      await expect(bar).toBeTruthy();
    });

    await step('has an accessible name from the label', async () => {
      const bar = canvas.getByRole('progressbar', { name: 'File upload' });
      await expect(bar).toBeTruthy();
    });

    await step('exposes aria-valuenow / aria-valuemin / aria-valuemax', async () => {
      const bar = canvas.getByRole('progressbar', { name: 'File upload' });
      await expect(bar).toHaveAttribute('aria-valuenow', '40');
      await expect(bar).toHaveAttribute('aria-valuemin', '0');
      await expect(bar).toHaveAttribute('aria-valuemax', '100');
    });

    await step('range fill resolves to a real, non-transparent color', async () => {
      const range = canvasElement.querySelector<HTMLElement>(
        '[data-scope="progress"][data-part="range"]',
      );
      await expect(range).not.toBeNull();
      const bg = getComputedStyle(range as HTMLElement).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * When value is null the bar is indeterminate.
 * aria-valuenow must be absent (per the progressbar ARIA spec).
 */
export const IndeterminateAriaContract: Story = {
  args: { value: null, label: 'Indeterminate upload' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders a progressbar role', async () => {
      const bar = canvas.getByRole('progressbar');
      await expect(bar).toBeTruthy();
    });

    await step('aria-valuenow is absent when indeterminate', async () => {
      const bar = canvas.getByRole('progressbar');
      await expect(bar).not.toHaveAttribute('aria-valuenow');
    });
  },
};
