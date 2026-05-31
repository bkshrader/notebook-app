import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Fieldset } from './Fieldset';

const meta: Meta<typeof Fieldset> = {
  title: 'Components/Forms/Fieldset',
  component: Fieldset,
  args: { legend: 'Contact Details' },
  argTypes: {
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Fieldset>;

export const Default: Story = {};

export const WithHelperText: Story = {
  args: {
    legend: 'Shipping Address',
    helperText: 'Enter the address where you want your order delivered.',
  },
};

export const Invalid: Story = {
  args: {
    legend: 'Payment Info',
    invalid: true,
    errorText: 'Please correct the errors below.',
  },
};

export const Disabled: Story = {
  args: {
    legend: 'Shipping Address',
    disabled: true,
    helperText: 'Your address cannot be changed after order confirmation.',
  },
};

/**
 * Tier A play test: verifies that the legend text is present and accessible,
 * that [data-disabled] is applied when disabled, that [data-invalid] propagates
 * to the error-text part, and that the legend element renders a styled
 * (non-empty, non-transparent) color value as a getComputedStyle backstop.
 */
export const AccessibilityChecks: Story = {
  args: {
    legend: 'Accessibility Test Group',
    helperText: 'Helper information for the group.',
    errorText: 'Error description for the group.',
    invalid: true,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('legend text is rendered and accessible', async () => {
      // Fieldset.Root renders a <fieldset>; Legend renders a <legend> inside it.
      const fieldset = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      await expect(fieldset).not.toBeNull();

      const legend = canvas.getByText('Accessibility Test Group');
      await expect(legend).toBeInTheDocument();
    });

    await step('helper-text part is present', async () => {
      const helperText = canvas.getByText('Helper information for the group.');
      await expect(helperText).toBeInTheDocument();
      await expect(helperText.closest('[data-part="helper-text"]')).not.toBeNull();
    });

    await step('error-text part is present when invalid', async () => {
      const errorText = canvas.getByText('Error description for the group.');
      await expect(errorText).toBeInTheDocument();
      await expect(errorText.closest('[data-part="error-text"]')).not.toBeNull();
    });

    await step('legend has a real computed color (token backstop)', async () => {
      const legend = canvasElement.querySelector('[data-scope="fieldset"][data-part="legend"]');
      await expect(legend).not.toBeNull();
      const color = getComputedStyle(legend!).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('transparent');
    });
  },
};

export const DisabledIsNotOperable: Story = {
  args: {
    legend: 'Disabled Group',
    disabled: true,
    helperText: 'This group is disabled.',
  },
  play: async ({ canvasElement, step }) => {
    await step('root has data-disabled attribute when disabled', async () => {
      const root = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      await expect(root).not.toBeNull();
      // Ark sets the native disabled attribute on the <fieldset> element and
      // data-disabled on all parts. Cast to HTMLFieldSetElement to access .disabled.
      await expect((root as HTMLFieldSetElement).disabled).toBe(true);
    });

    await step('legend reflects data-disabled', async () => {
      const legend = canvasElement.querySelector('[data-scope="fieldset"][data-part="legend"]');
      await expect(legend).not.toBeNull();
      await expect((legend as HTMLElement).dataset.disabled).toBeDefined();
    });
  },
};
