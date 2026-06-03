import { fn } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tag } from './Tag';

const meta: Meta<typeof Tag> = {
  title: 'Components/Display/Tag',
  component: Tag,
  args: { children: 'Design' },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

/** A static, non-interactive labeled Tag. */
export const Default: Story = {};

/** A linked Tag — the label navigates (e.g. to a filtered view). */
export const AsLink: Story = {
  args: { href: '#design', children: 'Design' },
};

/** The secondary color tints the link label with the strong neutral foreground. */
export const SecondaryLink: Story = {
  args: { href: '#research', color: 'secondary', children: 'Research' },
};

/** A dismissible Tag — the leading button clears it. */
export const Dismissible: Story = {
  args: {
    children: 'Accessibility',
    dismissLabel: 'Remove Accessibility tag',
    onDismiss: fn(),
  },
};

/** A dismissible linked Tag combines both interactive parts. */
export const DismissibleLink: Story = {
  args: {
    children: 'Electron',
    href: '#electron',
    dismissLabel: 'Remove Electron tag',
    onDismiss: fn(),
  },
};

/** A group of Tags wraps within its container (the common Helios layout). */
export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxWidth: '20rem' }}>
      <Tag href="#a11y">Accessibility</Tag>
      <Tag href="#electron">Electron</Tag>
      <Tag href="#codemirror">CodeMirror</Tag>
      <Tag href="#mathjax">MathJax</Tag>
    </div>
  ),
};
