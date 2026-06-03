import type { Meta, StoryObj } from '@storybook/react-vite';

import { Breadcrumb } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Components/Navigation/Breadcrumb',
  component: Breadcrumb,
  args: {
    label: 'Breadcrumb',
    canWrap: false,
    items: [
      { text: 'Library', href: '#library' },
      { text: 'Projects', href: '#projects' },
      { text: 'Research notes', href: '#research-notes' },
      { text: 'Methodology' },
    ],
  },
  argTypes: {
    canWrap: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

/** The default trail: three links and a non-interactive current page. */
export const Default: Story = {};

/** A short, two-level trail (root + current page). */
export const TwoLevels: Story = {
  args: {
    items: [{ text: 'Library', href: '#library' }, { text: 'Inbox' }],
  },
};

/** Each entry carries a small leading icon (Helios "with icon" item type). */
export const WithIcons: Story = {
  args: {
    items: [
      {
        text: 'Library',
        href: '#library',
        icon: (
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M2 3h12v10H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        text: 'Projects',
        href: '#projects',
        icon: (
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M2 4h5l1 2h6v7H2z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
      {
        text: 'Methodology',
        icon: (
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path d="M4 2h6l2 2v10H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        ),
      },
    ],
  },
};

/** A long trail constrained to a narrow container, wrapping onto two rows. */
export const Wrapping: Story = {
  args: {
    canWrap: true,
    items: [
      { text: 'Library', href: '#library' },
      { text: 'Projects', href: '#projects' },
      { text: 'Dissertation', href: '#dissertation' },
      { text: 'Chapter four', href: '#chapter-four' },
      { text: 'Field notes', href: '#field-notes' },
      { text: 'Interview transcripts' },
    ],
  },
  render: (args) => (
    <div style={{ inlineSize: '18rem' }}>
      <Breadcrumb {...args} />
    </div>
  ),
};
