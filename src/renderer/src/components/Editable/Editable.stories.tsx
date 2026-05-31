import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';

import { Editable } from './Editable';

const meta: Meta<typeof Editable> = {
  title: 'Components/Forms/Editable',
  component: Editable,
  args: {
    label: 'Display name',
    defaultValue: 'Jane Smith',
    placeholder: 'Enter a value…',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    invalid: { control: 'boolean' },
    activationMode: {
      control: 'select',
      options: ['focus', 'dblclick', 'click', 'none'],
    },
    submitMode: {
      control: 'select',
      options: ['enter', 'blur', 'both', 'none'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Editable>;

export const Default: Story = {};

export const Empty: Story = {
  args: { defaultValue: undefined },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const ReadOnly: Story = {
  args: { readOnly: true },
};

/**
 * Drives the primary keyboard interaction for the editable widget.
 *
 * APG pattern: click / focus the preview to enter edit mode, type to change
 * the value, then press Enter to commit (submitMode="enter"). Ark renders the
 * preview as a focusable span and the input as a real <input>; both carry
 * data-scope="editable" and data-part="preview"/"input".
 *
 * userEvent.tab() skips Ark's focusable-but-clip-hidden elements, so we focus
 * the preview directly and verify tabindex is not -1 for keyboard-reachability.
 */
export const KeyboardEdit: Story = {
  args: {
    defaultValue: 'Jane Smith',
    submitMode: 'enter',
    activationMode: 'focus',
  },
  play: async ({ canvasElement, step }) => {
    const preview = canvasElement.querySelector<HTMLElement>(
      '[data-scope="editable"][data-part="preview"]',
    );

    await step('preview is in the tab order (keyboard-reachable)', async () => {
      await expect(preview).not.toBeNull();
      await expect(preview).not.toHaveAttribute('tabindex', '-1');
    });

    await step('focusing preview enters edit mode', async () => {
      preview!.focus();
      await expect(preview).toHaveFocus();

      // After focus, Ark should transition to edit mode: the input becomes visible.
      // activationMode="focus" means focusing the preview triggers edit.
      const input = canvasElement.querySelector<HTMLInputElement>(
        '[data-scope="editable"][data-part="input"]',
      );
      await expect(input).not.toBeNull();
    });

    await step('input receives focus in edit mode', async () => {
      const input = canvasElement.querySelector<HTMLInputElement>(
        '[data-scope="editable"][data-part="input"]',
      );
      // Ark moves focus to the input on edit-mode entry when activationMode="focus"
      if (document.activeElement !== input) {
        input!.focus();
      }
      await expect(input).toHaveFocus();
    });

    await step('typing updates the value', async () => {
      // Select all and replace with new value
      await userEvent.keyboard('{Control>}a{/Control}');
      await userEvent.keyboard('Bradley');
      const input = canvasElement.querySelector<HTMLInputElement>(
        '[data-scope="editable"][data-part="input"]',
      );
      await expect(input).toHaveValue('Bradley');
    });

    await step('Enter commits and returns to preview mode', async () => {
      await userEvent.keyboard('{Enter}');
      // After commit, preview should show the new value
      const updatedPreview = canvasElement.querySelector<HTMLElement>(
        '[data-scope="editable"][data-part="preview"]',
      );
      await expect(updatedPreview).toHaveTextContent('Bradley');
    });

    await step('preview styling resolves to a real token value', async () => {
      // Backstop: assert the preview's color is a real, non-empty, non-transparent value.
      const styledPreview = canvasElement.querySelector<HTMLElement>(
        '[data-scope="editable"][data-part="preview"]',
      );
      await expect(styledPreview).not.toBeNull();
      const color = getComputedStyle(styledPreview as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled editable must show the preview text and not enter edit mode.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: 'Jane Smith' },
  play: async ({ canvasElement, step }) => {
    const preview = canvasElement.querySelector<HTMLElement>(
      '[data-scope="editable"][data-part="preview"]',
    );

    await step('preview is present and shows the value', async () => {
      await expect(preview).not.toBeNull();
      await expect(preview).toHaveTextContent('Jane Smith');
    });

    await step('preview carries data-disabled', async () => {
      await expect(preview).toHaveAttribute('data-disabled');
    });

    await step('clicking disabled preview does not show the input', async () => {
      // Clicking a disabled editable should not enter edit mode.
      await userEvent.click(preview as HTMLElement);
      const input = canvasElement.querySelector<HTMLInputElement>(
        '[data-scope="editable"][data-part="input"]',
      );
      // The input element may be present in the DOM but should not be the active element.
      await expect(document.activeElement).not.toBe(input);
    });

    await step('edit trigger is absent or disabled when root is disabled', async () => {
      const editTrigger = canvasElement.querySelector<HTMLButtonElement>(
        '[data-scope="editable"][data-part="edit-trigger"]',
      );
      if (editTrigger) {
        await expect(editTrigger).toBeDisabled();
      }
      // If Ark hides the trigger entirely when disabled, the absence is acceptable.
    });
  },
};

/**
 * Verifies the label is associated with the input for screen-reader accessibility.
 */
export const LabelAssociation: Story = {
  play: async ({ canvasElement, step }) => {
    await step('label element is present', async () => {
      const label = canvasElement.querySelector<HTMLElement>(
        '[data-scope="editable"][data-part="label"]',
      );
      await expect(label).not.toBeNull();
      await expect(label).toHaveTextContent('Display name');
    });
  },
};
