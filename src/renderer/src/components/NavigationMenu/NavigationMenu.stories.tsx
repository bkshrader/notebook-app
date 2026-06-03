import type { Meta, StoryObj } from '@storybook/react-vite';

import { NavigationMenu } from './NavigationMenu';

const ITEMS = [
  {
    value: 'features',
    label: 'Features',
    links: [
      { href: '#overview', label: 'Overview' },
      { href: '#highlights', label: 'Highlights' },
    ],
  },
  {
    value: 'docs',
    label: 'Documentation',
    links: [
      { href: '#introduction', label: 'Introduction' },
      { href: '#installation', label: 'Installation' },
      { href: '#components', label: 'Components' },
    ],
  },
  {
    value: 'about',
    label: 'About',
    isLink: true,
    href: '#about',
  },
];

const meta: Meta<typeof NavigationMenu> = {
  title: 'Components/Navigation/NavigationMenu',
  component: NavigationMenu,
  args: {
    items: ITEMS,
    'aria-label': 'Main navigation',
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof NavigationMenu>;

/** Default closed state — triggers visible, no panel open. */
export const Default: Story = {};

/** Pre-opens the "features" item so the content panel is visible on load. */
export const WithOpenItem: Story = {
  args: { defaultValue: 'features' },
};

/** The three size variants, smallest to largest. */
export const Small: Story = { args: { size: 'small' } };
export const Large: Story = { args: { size: 'large' } };

/** Vertical orientation — a stacked navigation rail. */
export const Vertical: Story = { args: { orientation: 'vertical' } };
