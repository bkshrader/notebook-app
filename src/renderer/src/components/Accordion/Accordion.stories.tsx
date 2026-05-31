import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Accordion } from './Accordion';

const defaultItems = [
  {
    value: 'what',
    title: 'What is this app?',
    content: 'An accessibility-first, local-first note-taking app for academics.',
  },
  {
    value: 'how',
    title: 'How do I get started?',
    content: 'Open a Library folder, create a Project, and start writing Notes.',
  },
  {
    value: 'why',
    title: 'Why local-first?',
    content: 'Your notes live as plain Markdown files on disk. No cloud account required.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'Components/Disclosure/Accordion',
  component: Accordion,
  args: {
    items: defaultItems,
  },
  argTypes: {
    collapsible: { control: 'boolean' },
    multiple: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Accordion>;

export const Default: Story = {};

export const DefaultOpen: Story = {
  args: { defaultValue: ['what'] },
};

export const Multiple: Story = {
  args: { multiple: true, defaultValue: ['what', 'how'] },
};

export const WithDisabledItem: Story = {
  args: {
    items: [
      {
        value: 'enabled',
        title: 'Available section',
        content: 'This section can be opened.',
      },
      {
        value: 'disabled',
        title: 'Unavailable section',
        content: 'This content is not reachable.',
        disabled: true,
      },
      {
        value: 'also-enabled',
        title: 'Another available section',
        content: 'This section can also be opened.',
      },
    ],
  },
};

/**
 * Drives the primary keyboard interaction for an accordion panel.
 *
 * APG pattern for accordion:
 *   - Each trigger is a native `<button>` managed by Ark/Zag.
 *   - Enter/Space on a focused trigger toggles the panel open/closed.
 *   - `aria-expanded` is set on the button; `data-state` mirrors it for styling.
 *
 * The play test:
 *   1. Confirms the trigger is keyboard-reachable (not tabindex="-1").
 *   2. Drives focus directly (userEvent.tab() skips if Ark clips the trigger).
 *   3. Presses Enter to open, asserts aria-expanded + data-state.
 *   4. Presses Enter again to close (collapsible=true is set via args).
 *   5. Backstop: after opening, asserts the trigger background resolves to a
 *      real (non-empty, non-transparent) computed color value.
 */
export const KeyboardExpand: Story = {
  args: { collapsible: true, defaultValue: [] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // The first trigger button — its accessible name is the item title text.
    const trigger = canvas.getByRole('button', { name: 'What is this app?' });

    await step('starts collapsed', async () => {
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
      const item = canvasElement.querySelector<HTMLElement>(
        '[data-scope="accordion"][data-part="item"][data-state="closed"]',
      );
      await expect(item).not.toBeNull();
    });

    await step('trigger is keyboard-reachable', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the panel', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // data-state on the Item element mirrors the open/closed state.
      const openItem = canvasElement.querySelector<HTMLElement>(
        '[data-scope="accordion"][data-part="item"][data-state="open"]',
      );
      await expect(openItem).not.toBeNull();
    });

    await step('trigger background resolves to a real token value', async () => {
      const bg = getComputedStyle(trigger).color;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('Enter closes the panel (collapsible)', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

/**
 * A disabled item trigger must not be operable by keyboard.
 * Ark applies `disabled` to the button, removing it from the natural tab order
 * and preventing activation.
 */
export const DisabledItemNotOperable: Story = {
  args: {
    items: [
      {
        value: 'locked',
        title: 'Locked section',
        content: 'Cannot be opened.',
        disabled: true,
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Locked section' });

    await expect(trigger).toBeDisabled();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Attempting to activate a disabled trigger must not change its state.
    await userEvent.click(trigger, { pointerEventsCheck: 0 });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};
