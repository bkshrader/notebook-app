import type { Meta, StoryObj } from '@storybook/react-vite';

import { IconTile } from './IconTile';

/**
 * A simple inline glyph for the stories. `fill="currentColor"` lets the tile's
 * tone color flow into the icon (the icon inherits `color` from the tile).
 */
function FolderGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z" />
    </svg>
  );
}

/** A small badge glyph for the secondary-icon slot. */
function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}

const meta: Meta<typeof IconTile> = {
  title: 'Components/Display/IconTile',
  component: IconTile,
  args: { icon: <FolderGlyph />, size: 'medium', color: 'neutral' },
  argTypes: {
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
    color: {
      control: 'inline-radio',
      options: ['neutral', 'action', 'highlight', 'critical', 'warning', 'success'],
    },
    icon: { control: false },
    secondaryIcon: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof IconTile>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const Action: Story = {
  args: { color: 'action' },
};

export const Highlight: Story = {
  args: { color: 'highlight' },
};

export const WithSecondaryIcon: Story = {
  args: { secondaryIcon: <PlusGlyph /> },
};

export const Labeled: Story = {
  args: { label: 'Project folder', color: 'action' },
};
