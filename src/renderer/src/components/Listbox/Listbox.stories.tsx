import type { Meta, StoryObj } from '@storybook/react-vite';

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
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
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

export const Small: Story = {
  args: { size: 'sm' },
};

export const Large: Story = {
  args: { size: 'lg' },
};
