import type { Meta, StoryObj } from '@storybook/react-vite';

import { Dropdown, DropdownParts } from './Dropdown';

/**
 * Visual / documentation stories for the Dropdown. These are PRISTINE: no `play`
 * function mutates state, so the docs gallery renders a stable snapshot. The
 * interaction / accessibility / regression-guard tests live in
 * `Dropdown.spec.stories.tsx` (the `*.spec.stories.tsx` convention).
 */
const meta: Meta<typeof Dropdown> = {
  title: 'Components/Overlays/Dropdown',
  component: Dropdown,
  args: {
    triggerLabel: 'Actions',
    color: 'secondary',
    size: 'medium',
  },
  argTypes: {
    open: { control: 'boolean' },
    color: { control: 'radio', options: ['primary', 'secondary', 'tertiary', 'critical'] },
    size: { control: 'radio', options: ['small', 'medium'] },
  },
};

export default meta;

type Story = StoryObj<typeof Dropdown>;

const actionItems = (
  <>
    <DropdownParts.Item value="edit">Edit</DropdownParts.Item>
    <DropdownParts.Item value="duplicate">Duplicate</DropdownParts.Item>
    <DropdownParts.Item value="move">Move to…</DropdownParts.Item>
    <DropdownParts.Separator />
    <DropdownParts.Item value="delete" data-color="critical">
      Delete
    </DropdownParts.Item>
  </>
);

/**
 * Default closed state — the toggle is rendered and the list is not visible. The
 * List lives in a Portal so it is absent from the canvas DOM until the Dropdown
 * opens.
 */
export const Default: Story = {
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
};

/**
 * Open variant — uses the controlled `open` prop to pre-open the list so
 * Storybook shows the panel in its visual snapshot, including the critical
 * (destructive) Delete item.
 */
export const Open: Story = {
  args: { open: true },
  render: (args) => (
    <div style={{ paddingBlockStart: '12rem' }}>
      <Dropdown {...args}>{actionItems}</Dropdown>
    </div>
  ),
};

/**
 * Primary (filled) toggle color — the high-emphasis Button visual language.
 */
export const PrimaryToggle: Story = {
  args: { color: 'primary' },
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
};

/**
 * Small size — tighter body-100 typography and a shorter toggle.
 */
export const Small: Story = {
  args: { open: true, size: 'small' },
  render: (args) => (
    <div style={{ paddingBlockStart: '12rem' }}>
      <Dropdown {...args}>{actionItems}</Dropdown>
    </div>
  ),
};

/**
 * Grouped list with a labelled Header group and a Separator. Demonstrates the
 * `item-group-label` and `separator` parts.
 */
export const Grouped: Story = {
  args: { open: true, triggerLabel: 'File' },
  render: (args) => (
    <div style={{ paddingBlockStart: '12rem' }}>
      <Dropdown {...args}>
        <DropdownParts.ItemGroup>
          <DropdownParts.ItemGroupLabel>Document</DropdownParts.ItemGroupLabel>
          <DropdownParts.Item value="new-file">New File</DropdownParts.Item>
          <DropdownParts.Item value="open">Open…</DropdownParts.Item>
        </DropdownParts.ItemGroup>
        <DropdownParts.Separator />
        <DropdownParts.Item value="quit">Quit</DropdownParts.Item>
      </Dropdown>
    </div>
  ),
};

/**
 * Checkable options — a checkbox item and a radio group, demonstrating the
 * `option-item` / `item-indicator` / `item-text` parts (Helios checkbox /
 * checkmark / radio ListItems). Pre-checked to show the indicators in the
 * snapshot.
 */
export const Checkable: Story = {
  args: { open: true, triggerLabel: 'View' },
  render: (args) => (
    <div style={{ paddingBlockStart: '12rem' }}>
      <Dropdown {...args}>
        <DropdownParts.CheckboxItem value="wrap" checked>
          <DropdownParts.ItemIndicator>
            <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
              <path
                d="M3 8.5l3.5 3.5 6.5-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </DropdownParts.ItemIndicator>
          <DropdownParts.ItemText>Word wrap</DropdownParts.ItemText>
        </DropdownParts.CheckboxItem>
        <DropdownParts.Separator />
        <DropdownParts.RadioItemGroup value="comfortable">
          <DropdownParts.ItemGroupLabel>Density</DropdownParts.ItemGroupLabel>
          <DropdownParts.RadioItem value="comfortable">
            <DropdownParts.ItemIndicator>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <circle cx="8" cy="8" r="3" fill="currentColor" />
              </svg>
            </DropdownParts.ItemIndicator>
            <DropdownParts.ItemText>Comfortable</DropdownParts.ItemText>
          </DropdownParts.RadioItem>
          <DropdownParts.RadioItem value="compact">
            <DropdownParts.ItemIndicator>
              <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
                <circle cx="8" cy="8" r="3" fill="currentColor" />
              </svg>
            </DropdownParts.ItemIndicator>
            <DropdownParts.ItemText>Compact</DropdownParts.ItemText>
          </DropdownParts.RadioItem>
        </DropdownParts.RadioItemGroup>
      </Dropdown>
    </div>
  ),
};
