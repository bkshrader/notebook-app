import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Combobox } from './Combobox';

const frameworks = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
  { label: 'Svelte', value: 'svelte' },
  { label: 'Angular', value: 'angular' },
];

const meta: Meta<typeof Combobox> = {
  title: 'Components/Forms/Combobox',
  component: Combobox,
  args: {
    label: 'Framework',
    items: frameworks,
    placeholder: 'Search frameworks…',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Combobox>;

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

    // The Ark Combobox input carries role="combobox"
    const input = canvas.getByRole('combobox');
    await expect(input).not.toHaveAttribute('aria-disabled', 'true');

    // Focus the input directly — userEvent.tab() may skip clip-hidden elements
    input.focus();
    await expect(input).toHaveFocus();

    // Open the listbox with ArrowDown (Ark opens on arrow key)
    await userEvent.keyboard('{ArrowDown}');

    // Content renders in a Portal outside canvasElement — query via document.body
    const listbox = await within(document.body).findByRole('listbox');
    await expect(listbox).toBeInTheDocument();

    // Move the highlight and commit with Enter. We read whichever option Ark
    // has highlighted rather than assuming a fixed index, keeping the test
    // stable across Ark's initial-highlight behaviour.
    await userEvent.keyboard('{ArrowDown}');
    const highlighted = within(listbox)
      .getAllByRole('option')
      .find((opt) => opt.hasAttribute('data-highlighted'));
    await expect(highlighted).toBeTruthy();
    const expected = frameworks.find((f) => f.value === highlighted?.getAttribute('data-value'));
    await expect(expected).toBeTruthy();

    await userEvent.keyboard('{Enter}');

    // Listbox should close after selection
    await waitFor(() =>
      expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
    );

    // The input value reflects the committed item label
    await expect(input).toHaveValue(expected!.label);
  },
};

export const FilterAndSelect: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = canvas.getByRole('combobox');
    input.focus();
    await expect(input).toHaveFocus();

    // Type a query to filter the list
    await userEvent.keyboard('Sol');

    // The filtered listbox should appear with only the matching option
    const listbox = await within(document.body).findByRole('listbox');
    await expect(listbox).toBeInTheDocument();

    const options = within(listbox).getAllByRole('option');
    await expect(options).toHaveLength(1);
    await expect(options[0]).toHaveTextContent('Solid');

    // Navigate to highlight the single match, then commit with Enter.
    // Ark does not auto-highlight on filter; ArrowDown is required to move
    // the highlight before Enter can select.
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    await waitFor(() =>
      expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
    );

    await expect(input).toHaveValue('Solid');
  },
};
