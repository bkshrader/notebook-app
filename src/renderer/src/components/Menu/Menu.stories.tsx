import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Menu, MenuParts } from './Menu';

const meta: Meta<typeof Menu> = {
  title: 'Components/Overlays/Menu',
  component: Menu,
  args: {
    triggerLabel: 'File',
  },
  argTypes: {
    open: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Menu>;

/**
 * Default closed state — the trigger is rendered and the menu panel is not
 * visible. Content lives in a Portal so it is absent from the canvas DOM until
 * the menu opens.
 */
export const Default: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuParts.Item value="new-file">New File</MenuParts.Item>
      <MenuParts.Item value="open">Open…</MenuParts.Item>
      <MenuParts.Item value="save">Save</MenuParts.Item>
      <MenuParts.Item value="save-as">Save As…</MenuParts.Item>
    </Menu>
  ),
};

/**
 * Open variant — uses controlled `open` prop to pre-open the menu so
 * Storybook shows the panel in its visual snapshot.
 */
export const Open: Story = {
  args: { open: true },
  render: (args) => (
    <div style={{ paddingBlockStart: '10rem' }}>
      <Menu {...args}>
        <MenuParts.Item value="new-file">New File</MenuParts.Item>
        <MenuParts.Item value="open">Open…</MenuParts.Item>
        <MenuParts.Item value="save">Save</MenuParts.Item>
        <MenuParts.Item value="save-as">Save As…</MenuParts.Item>
      </Menu>
    </div>
  ),
};

/**
 * Keyboard interaction play test — Tier B overlay contract.
 *
 * Because the menu panel renders in an Ark Portal OUTSIDE the story canvas
 * element, the panel content is queried via `screen` (document.body scope),
 * not `within(canvasElement)`.
 *
 * Contract verified:
 *  1. Trigger is keyboard-reachable (not tabindex="-1").
 *  2. Enter/Space on the trigger opens the panel.
 *  3. Focus moves into the panel (first item receives focus).
 *  4. Escape closes the panel.
 *  5. Focus returns to the trigger after close.
 */
export const KeyboardOpenClose: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuParts.Item value="new-file">New File</MenuParts.Item>
      <MenuParts.Item value="open">Open…</MenuParts.Item>
      <MenuParts.Item value="save">Save</MenuParts.Item>
    </Menu>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'File' });

    await step('trigger is in the tab order', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('focus trigger directly (userEvent.tab skips clip-hidden inputs)', async () => {
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the menu panel', async () => {
      await userEvent.keyboard('{Enter}');
      // Panel is portalled — query via screen, not within(canvasElement)
      const content = await screen.findByRole('menu');
      await expect(content).toBeInTheDocument();
    });

    await step('focus moves into the panel', async () => {
      // Ark Menu uses aria-activedescendant compositing: DOM focus goes to the
      // [role="menu"] content element (tabindex=0); items are highlighted via
      // aria-activedescendant, not native focus. waitFor rides out any async
      // focus transfer that happens after the enter animation settles.
      await waitFor(async () => {
        const content = screen.getByRole('menu');
        await expect(content).toContainElement(document.activeElement as HTMLElement);
      });
    });

    await step('Escape closes the menu', async () => {
      await userEvent.keyboard('{Escape}');
      // Exit animation keeps the element in DOM with data-state="closed" until
      // Ark unmounts it. waitFor retries until the element is gone.
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).toBeNull();
      });
    });

    await step('focus returns to the trigger', async () => {
      await expect(trigger).toHaveFocus();
    });
  },
};

/**
 * Arrow-key navigation within the open panel.
 */
export const ArrowNavigation: Story = {
  render: (args) => (
    <Menu {...args}>
      <MenuParts.Item value="new-file">New File</MenuParts.Item>
      <MenuParts.Item value="open">Open…</MenuParts.Item>
      <MenuParts.Item value="save">Save</MenuParts.Item>
    </Menu>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'File' });

    await step('open via Enter', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      // Wait for menu to appear AND for focus to settle on the content element
      // (aria-activedescendant compositing — DOM focus goes to [role="menu"]).
      await waitFor(async () => {
        const content = screen.queryByRole('menu');
        await expect(content).not.toBeNull();
        await expect(content).toContainElement(document.activeElement as HTMLElement);
      });
    });

    await step('ArrowDown moves highlight to second item', async () => {
      await userEvent.keyboard('{ArrowDown}');
      // The second item should now be highlighted (data-highlighted)
      const items = screen.getAllByRole('menuitem');
      await expect(items[1]).toHaveAttribute('data-highlighted');
    });

    await step('Escape dismisses', async () => {
      await userEvent.keyboard('{Escape}');
      // Exit animation keeps the element in DOM with data-state="closed".
      // waitFor retries until Ark unmounts it.
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).toBeNull();
      });
    });
  },
};
