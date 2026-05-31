import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Select } from './Select';

const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
];

const meta: Meta<typeof Select> = {
  title: 'Components/Forms/Select',
  component: Select,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Select a framework',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: ['react'] },
};

export const KeyboardSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find the trigger button
    const trigger = canvas.getByRole('combobox');
    await expect(trigger).not.toHaveAttribute('aria-disabled', 'true');

    // Focus the trigger directly (userEvent.tab() skips clip-hidden inputs)
    trigger.focus();
    await expect(trigger).toHaveFocus();

    // Open the listbox with Enter
    await userEvent.keyboard('{Enter}');

    // The content portals outside canvasElement — query via document.body
    const listbox = await within(document.body).findByRole('listbox');
    await expect(listbox).toBeInTheDocument();

    // Arrow down to first item, then select with Enter
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Listbox should be closed after selection
    await expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument();

    // The trigger value text should now reflect the selected item
    await expect(trigger).toHaveTextContent('React');
  },
};
