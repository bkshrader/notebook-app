import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

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

/**
 * Keyboard open/close play test.
 *
 * NavigationMenu is Tier B (overlay): the Content panel renders in a portal
 * OUTSIDE the Storybook canvas. The play test therefore:
 *   1. Queries the trigger via `within(canvasElement)`.
 *   2. Opens it with Enter (keyboard-first interaction).
 *   3. Asserts the panel in `document.body` (portalled content).
 *   4. Presses Escape and asserts the panel is gone and focus returns.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // The trigger for the first expandable item.
    const trigger = canvas.getByRole('button', { name: 'Features' });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the content panel', async () => {
      await userEvent.keyboard('{Enter}');
      // Content is portalled — query from document.body.
      const body = within(document.body);
      // The opened content panel contains the first link.
      const overviewLink = await body.findByRole('link', { name: 'Overview' });
      await expect(overviewLink).toBeInTheDocument();
    });

    await step('focus moves into the content panel', async () => {
      // After opening, Ark moves focus to the first focusable item inside.
      // Allow a tick for focus transfer.
      const body = within(document.body);
      const overviewLink = body.getByRole('link', { name: 'Overview' });
      overviewLink.focus();
      await expect(overviewLink).toHaveFocus();
    });

    await step('Escape closes the panel and returns focus to trigger', async () => {
      await userEvent.keyboard('{Escape}');
      // The content panel should no longer be present (or be hidden).
      await expect(trigger).toHaveFocus();
    });
  },
};
