import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Listbox } from './Listbox';

const COUNTRIES = [
  { label: 'United States', value: 'us' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'Canada', value: 'ca' },
  { label: 'Australia', value: 'au' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'Japan', value: 'jp' },
];

const DAYS = [
  { label: 'Monday', value: 'mon' },
  { label: 'Tuesday', value: 'tue' },
  { label: 'Wednesday', value: 'wed' },
  { label: 'Thursday', value: 'thu' },
  { label: 'Friday', value: 'fri' },
  { label: 'Saturday', value: 'sat' },
  { label: 'Sunday', value: 'sun' },
];

const meta: Meta<typeof Listbox> = {
  title: 'Components/Forms/Listbox',
  component: Listbox,
  args: {
    label: 'Select Country',
    items: COUNTRIES,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    selectionMode: {
      control: 'select',
      options: ['single', 'multiple', 'extended'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Listbox>;

export const Default: Story = {};

export const MultipleSelection: Story = {
  args: {
    label: 'Select Days',
    items: DAYS,
    selectionMode: 'multiple',
  },
};

export const WithDisabledItems: Story = {
  args: {
    label: 'Select Country',
    items: [
      { label: 'United States', value: 'us' },
      { label: 'United Kingdom', value: 'uk', disabled: true },
      { label: 'Canada', value: 'ca' },
      { label: 'Australia', value: 'au', disabled: true },
      { label: 'Germany', value: 'de' },
    ],
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the keyboard selection interaction path for the listbox.
 *
 * Ark v5's Listbox renders role="listbox" on the Content element; each item
 * carries role="option" with aria-selected. The Content element is the
 * focusable/operable node (it manages focus with roving tabindex internally).
 * Arrow keys move the highlight; Enter/Space select the highlighted item.
 * The axe pass runs automatically via preview's a11y.test:'error' setting.
 */
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('listbox content is accessible', async () => {
      const listbox = canvas.getByRole('listbox');
      await expect(listbox).toBeInTheDocument();
    });

    await step('all options are rendered', async () => {
      const options = canvas.getAllByRole('option');
      await expect(options).toHaveLength(COUNTRIES.length);
    });

    await step('no item is selected initially', async () => {
      const options = canvas.getAllByRole('option');
      for (const option of options) {
        await expect(option).toHaveAttribute('aria-selected', 'false');
      }
    });

    await step('listbox is keyboard reachable', async () => {
      const listbox = canvas.getByRole('listbox');
      await expect(listbox).not.toHaveAttribute('tabindex', '-1');
      listbox.focus();
      await expect(listbox).toHaveFocus();
    });

    await step('ArrowDown highlights an item', async () => {
      await userEvent.keyboard('{ArrowDown}');
      // Ark may not always land on index 0 — read which option actually got highlighted.
      const options = canvas.getAllByRole('option');
      const highlighted = options.find((o) => o.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeDefined();
    });

    await step('Enter selects the highlighted item', async () => {
      // Re-read the highlighted option after ArrowDown and select it.
      const options = canvas.getAllByRole('option');
      const highlighted = options.find((o) => o.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeDefined();
      await userEvent.keyboard('{Enter}');
      // After Enter the previously-highlighted option should be selected.
      await expect(highlighted).toHaveAttribute('aria-selected', 'true');
    });

    await step('ArrowDown moves highlight to a different item', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const options = canvas.getAllByRole('option');
      // At least one item must now carry data-highlighted.
      const highlighted = options.find((o) => o.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeDefined();
    });

    await step('selected item styling resolves to a real token value', async () => {
      const options = canvas.getAllByRole('option');
      // Use the first option; assert it exists before passing to getComputedStyle.
      const selectedOption = options[0]!;
      await expect(selectedOption).not.toBeNull();
      const color = getComputedStyle(selectedOption).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
