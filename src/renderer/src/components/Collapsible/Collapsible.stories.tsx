import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Collapsible } from './Collapsible';

const meta: Meta<typeof Collapsible> = {
  title: 'Components/Disclosure/Collapsible',
  component: Collapsible,
  args: {
    label: 'What is Ark UI?',
    children:
      'Ark UI is a headless component library for building accessible, high-quality UI components.',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    open: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

export const Default: Story = {};

export const InitialOpen: Story = {
  args: { defaultOpen: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/**
 * Drives the primary keyboard interaction for the Collapsible widget.
 *
 * Ark v5's Collapsible.Trigger renders as a native `<button>` element, so it
 * is keyboard-reachable via Tab and operable via Space/Enter. State is conveyed
 * by `data-state="open|closed"` on both the Root and the Content part.
 *
 * The axe pass runs automatically via the preview's `a11y.test: 'error'`
 * config, so this play function asserts only the interaction contract.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /what is ark ui/i });
    const content = canvasElement.querySelector<HTMLElement>(
      '[data-scope="collapsible"][data-part="content"]',
    );

    await step('starts closed', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      await expect(content).toHaveAttribute('data-state', 'closed');
    });

    await step('trigger is in the tab order (keyboard-reachable)', async () => {
      // The trigger is a native <button>, always in the tab order unless
      // explicitly disabled. Assert it is NOT tabindex='-1', then drive focus
      // directly (userEvent.tab() can skip elements in some environments).
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      trigger.focus();
      await expect(trigger).toHaveFocus();
    });

    await step('Enter opens the collapsible', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('data-state', 'open');
      await expect(content).toHaveAttribute('data-state', 'open');
    });

    await step('open styling resolves to a real token value', async () => {
      // Backstop: assert the trigger's background resolves to a real,
      // non-transparent color when open (guards against misspelled tokens).
      const bg = getComputedStyle(trigger).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('Space closes the collapsible', async () => {
      await userEvent.keyboard(' ');
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      await expect(content).toHaveAttribute('data-state', 'closed');
    });
  },
};

/**
 * A disabled collapsible must not be operable by keyboard. Ark v5 sets
 * `data-disabled` on the trigger but does NOT set the native `disabled`
 * attribute — the button remains in the DOM as an enabled element from the
 * browser's perspective. We assert `data-disabled` presence and verify that
 * attempting to activate the trigger does not change the collapsible's state.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /what is ark ui/i });

    // Ark v5 expresses disabled via data-disabled, not the native disabled attr.
    await expect(trigger).toHaveAttribute('data-disabled');
    await expect(trigger).toHaveAttribute('data-state', 'closed');

    // Focus then attempt Enter — Ark's disabled handler must swallow the event.
    trigger.focus();
    await userEvent.keyboard('{Enter}');
    await expect(trigger).toHaveAttribute('data-state', 'closed');
  },
};
