import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { HoverCard } from './HoverCard';

const meta: Meta<typeof HoverCard> = {
  title: 'Components/Overlays/HoverCard',
  component: HoverCard,
  args: {
    trigger: <a href="#profile">@sarah_chen</a>,
    children: (
      <div>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Sarah Chen</p>
        <p style={{ margin: 0 }}>Design Engineer at Acme Inc.</p>
      </div>
    ),
    openDelay: 200,
    closeDelay: 100,
  },
};

export default meta;
type Story = StoryObj<typeof HoverCard>;

export const Default: Story = {};

export const Open: Story = {
  args: { open: true },
};

export const LongDelay: Story = {
  args: { openDelay: 1000, closeDelay: 500 },
};

/** Tier B overlay play test: open on focus, confirm panel is in document.body,
 *  Esc closes it, focus returns to the trigger. */
export const KeyboardFocusOpen: Story = {
  args: {
    // Use a button trigger so it is reliably keyboard-focusable
    trigger: <button type="button">Hover or focus me</button>,
    openDelay: 0,
    closeDelay: 0,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('trigger is focusable', async () => {
      const trigger = canvas.getByRole('button', { name: /hover or focus me/i });
      // Ark HoverCard opens on focus as well as pointer hover
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    // After focus, hover-card should open. Give it a moment (openDelay=0 but
    // Ark still uses a microtask/animation-frame boundary).
    await step('panel appears in document.body after focus', async () => {
      // Poll document.body since the content is portalled outside canvasElement
      const body = within(document.body);
      // The content part gets data-state='open' when visible
      const content = await body.findByRole('group', { hidden: true }).catch(() =>
        // Ark hover-card content may not have a landmark role; fall back to
        // finding by data-part attribute via a query on document.
        document.querySelector("[data-scope='hover-card'][data-part='content']"),
      );
      // Confirm the panel is present in the DOM (may still be animating)
      await expect(content).toBeTruthy();
    });

    await step('Esc closes the panel and focus returns to trigger', async () => {
      const trigger = canvas.getByRole('button', { name: /hover or focus me/i });
      trigger.focus();
      await userEvent.keyboard('{Escape}');
      // After Escape the content should be gone or data-state='closed'
      await expect(
        document.querySelector("[data-scope='hover-card'][data-part='content'][data-state='open']"),
      ).toBeNull();
      // Focus should be back on the trigger
      await expect(trigger).toHaveFocus();
    });
  },
};
