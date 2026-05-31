import type { Meta, StoryObj } from '@storybook/react-vite';

import { Dialog } from './Dialog';
import { assertOverlayKeyboardCycle } from '../test-helpers';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog',
  component: Dialog,
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to continue?',
    triggerLabel: 'Open Dialog',
  },
  argTypes: {
    open: { control: 'boolean' },
    modal: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: {
    title: 'Delete Note',
    description: 'This action cannot be undone. The note will be permanently removed.',
    triggerLabel: 'Delete',
  },
};

export const WithChildren: Story = {
  args: {
    title: 'Settings',
    description: 'Update your preferences below.',
    triggerLabel: 'Open Settings',
    children: <p>Settings content goes here.</p>,
  },
};

/**
 * Tier B overlay play test.
 *
 * The dialog content renders in a Portal OUTSIDE the story canvas, so after
 * opening we query via within(document.body) — NOT within(canvasElement).
 *
 * Flow:
 *   1. Trigger is in the canvas — assert keyboard-reachable, focus directly,
 *      press Enter (userEvent.tab() skips clip-hidden elements by heuristic,
 *      but the trigger here is a plain button, so tab would work too; we focus
 *      directly for determinism).
 *   2. Assert panel appears in document.body with role="dialog" and data-state="open".
 *   3. Assert focus has moved into the panel (Ark auto-focuses the content or
 *      the first focusable child inside).
 *   4. Press Escape — panel closes, focus returns to the trigger.
 */
export const KeyboardOpenClose: Story = {
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: /open dialog/i,
      noun: 'dialog',
    });
  },
};
