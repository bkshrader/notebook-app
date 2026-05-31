import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ToggleGroup } from './ToggleGroup';

const alignItems = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const formatItems = [
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'underline', label: 'Underline' },
];

const meta: Meta<typeof ToggleGroup> = {
  title: 'Components/Forms/ToggleGroup',
  component: ToggleGroup,
  args: { items: alignItems },
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof ToggleGroup>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['left'] },
};

export const Multiple: Story = {
  args: {
    items: formatItems,
    multiple: true,
    defaultValue: ['bold'],
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: ['left'] },
};

export const DisabledItem: Story = {
  args: {
    items: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center', disabled: true },
      { value: 'right', label: 'Right' },
    ],
  },
};

export const KeyboardNavigation: Story = {
  args: { defaultValue: ['left'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // ToggleGroup uses roving tabindex — only the active/first item is in tab order.
    // Find the item buttons by their visible text.
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });
    const centerBtn = canvas.getByRole('radio', { name: 'Center' });
    const rightBtn = canvas.getByRole('radio', { name: 'Right' });

    await step('initial state: Left is on', async () => {
      await expect(leftBtn).toHaveAttribute('data-state', 'on');
      await expect(centerBtn).toHaveAttribute('data-state', 'off');
    });

    await step('focus first item directly (roving tabindex)', async () => {
      leftBtn.focus();
      await expect(document.activeElement).toBe(leftBtn);
    });

    await step('ArrowRight moves focus to Center; Space activates it', async () => {
      // Ark ToggleGroup uses roving tabindex: ArrowRight moves focus only.
      // focusNextToggle is wrapped in raf(), so we must waitFor the focus to settle.
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(document.activeElement).toBe(centerBtn));
      // Space fires the click handler — activates Center, deactivates Left.
      await userEvent.keyboard(' ');
      await expect(centerBtn).toHaveAttribute('data-state', 'on');
      await expect(leftBtn).toHaveAttribute('data-state', 'off');
    });

    await step('ArrowRight again moves focus to Right; Space activates it', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(document.activeElement).toBe(rightBtn));
      await userEvent.keyboard(' ');
      await expect(rightBtn).toHaveAttribute('data-state', 'on');
    });

    await step('getComputedStyle backstop: active item has non-empty background', async () => {
      const style = window.getComputedStyle(rightBtn);
      await expect(style.backgroundColor).not.toBe('');
      await expect(style.backgroundColor).not.toBe('transparent');
    });
  },
};

export const DisabledNotOperable: Story = {
  args: { disabled: true, defaultValue: ['center'], items: alignItems },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const leftBtn = canvas.getByRole('radio', { name: 'Left' });

    await step('disabled item cannot be focused or activated', async () => {
      leftBtn.focus();
      await userEvent.keyboard('{ArrowRight}');
      // All items disabled — state should remain unchanged
      const centerBtn = canvas.getByRole('radio', { name: 'Center' });
      await expect(centerBtn).toHaveAttribute('data-state', 'on');
      await expect(leftBtn).toHaveAttribute('data-state', 'off');
    });
  },
};
