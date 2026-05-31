import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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

    // Drive the highlight with ArrowDown, then read whichever option Ark marked
    // active (data-highlighted). Reading the observed highlight — rather than
    // assuming a given arrow-step lands on a specific index — keeps the test
    // deterministic across Ark's initial-highlight behavior. We then commit that
    // option and assert the trigger reflects it, proving the arrow-navigate +
    // Enter-commit keyboard contract end to end.
    await userEvent.keyboard('{ArrowDown}');
    const highlighted = within(listbox)
      .getAllByRole('option')
      .find((opt) => opt.hasAttribute('data-highlighted'));
    await expect(highlighted).toBeTruthy();
    const expected = frameworks.find((f) => f.value === highlighted?.getAttribute('data-value'));
    await expect(expected).toBeTruthy();
    await userEvent.keyboard('{Enter}');

    // Listbox should be closed after selection.
    await waitFor(() =>
      expect(within(document.body).queryByRole('listbox')).not.toBeInTheDocument(),
    );

    // The trigger's value text now reflects the committed option. The trigger
    // also contains the indicator glyph, so assert the label as a substring.
    await expect(trigger).toHaveTextContent(expected!.label);
  },
};
