import type { Meta, StoryObj } from '@storybook/react-vite';

import { Menu, MenuParts } from './Menu';

/**
 * Visual / documentation stories for the Menu. These are PRISTINE: no `play`
 * function mutates state, so the docs gallery renders a stable snapshot. The
 * interaction / accessibility / regression-guard tests live in
 * `Menu.spec.stories.tsx` (the `*.spec.stories.tsx` convention).
 */
const meta: Meta<typeof Menu> = {
  title: 'Components/Overlays/Menu',
  component: Menu,
  args: {
    triggerLabel: 'File',
    size: 'medium',
  },
  argTypes: {
    open: { control: 'boolean' },
    size: { control: 'radio', options: ['small', 'medium'] },
  },
};

export default meta;

type Story = StoryObj<typeof Menu>;

const fileItems = (
  <>
    <MenuParts.Item value="new-file">New File</MenuParts.Item>
    <MenuParts.Item value="open">Open…</MenuParts.Item>
    <MenuParts.Item value="save">Save</MenuParts.Item>
    <MenuParts.Item value="save-as">Save As…</MenuParts.Item>
  </>
);

/**
 * Default closed state — the trigger is rendered and the menu panel is not
 * visible. Content lives in a Portal so it is absent from the canvas DOM until
 * the menu opens.
 */
export const Default: Story = {
  render: (args) => <Menu {...args}>{fileItems}</Menu>,
};

/**
 * Open variant — uses the controlled `open` prop to pre-open the menu so
 * Storybook shows the panel in its visual snapshot.
 */
export const Open: Story = {
  args: { open: true },
  render: (args) => (
    <div style={{ paddingBlockStart: '10rem' }}>
      <Menu {...args}>{fileItems}</Menu>
    </div>
  ),
};

/**
 * Small size variant — tighter body-100 typography on trigger and items.
 */
export const Small: Story = {
  args: { open: true, size: 'small' },
  render: (args) => (
    <div style={{ paddingBlockStart: '10rem' }}>
      <Menu {...args}>{fileItems}</Menu>
    </div>
  ),
};

/**
 * Grouped items with a labelled group and a separator. Demonstrates the
 * `item-group-label` and `separator` parts.
 */
export const Grouped: Story = {
  args: { open: true },
  render: (args) => (
    <div style={{ paddingBlockStart: '10rem' }}>
      <Menu {...args}>
        <MenuParts.ItemGroup>
          <MenuParts.ItemGroupLabel>Document</MenuParts.ItemGroupLabel>
          <MenuParts.Item value="new-file">New File</MenuParts.Item>
          <MenuParts.Item value="open">Open…</MenuParts.Item>
        </MenuParts.ItemGroup>
        <MenuParts.Separator />
        <MenuParts.Item value="quit" disabled>
          Quit
        </MenuParts.Item>
      </Menu>
    </div>
  ),
};
