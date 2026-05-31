import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DownloadTrigger } from './DownloadTrigger';

const SAMPLE_CONTENT = 'Hello, World! This is a sample text file.';

const meta: Meta<typeof DownloadTrigger> = {
  title: 'Components/Actions/DownloadTrigger',
  component: DownloadTrigger,
  args: {
    data: SAMPLE_CONTENT,
    fileName: 'hello.txt',
    mimeType: 'text/plain',
    children: 'Download',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    mimeType: { control: 'text' },
    fileName: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof DownloadTrigger>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const LongFileName: Story = {
  args: {
    data: SAMPLE_CONTENT,
    fileName: 'my-very-long-exported-notes-document-2026.txt',
    children: 'Download Notes',
  },
};

/**
 * Drives the primary keyboard interaction path for the download trigger.
 *
 * DownloadTrigger renders as a native `<button>` with `data-scope='download-trigger'`.
 * The accessible role is `button`. We intercept the click via a spy so the
 * actual browser download is never triggered during the test.
 *
 * Keyboard contract: Tab reaches the button; Enter activates it (native button
 * behavior). We also assert the computed background resolves to a real, non-
 * transparent color as a backstop for token resolution.
 */
export const KeyboardActivation: Story = {
  args: {
    onClick: fn(),
  },
  play: async ({ canvasElement, step, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Download' });

    await step('button is present and enabled', async () => {
      await expect(button).toBeInTheDocument();
      await expect(button).not.toBeDisabled();
    });

    await step('button is in the tab order (keyboard-reachable)', async () => {
      // Native <button> is focusable by default; assert it is not opt-ed out.
      await expect(button).not.toHaveAttribute('tabindex', '-1');
      button.focus();
      await expect(button).toHaveFocus();
    });

    await step('Enter activates the button', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('styled background resolves to a real token value', async () => {
      const bg = getComputedStyle(button).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled download trigger must not be operable by keyboard. The native
 * `disabled` attribute removes the button from the tab order and prevents
 * activation.
 */
export const DisabledNotOperable: Story = {
  args: {
    disabled: true,
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Download' });

    await expect(button).toBeDisabled();

    // A disabled button cannot receive focus via Tab; direct focus is also
    // rejected by most browsers. Attempting keyboard activation must not call
    // the click handler.
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
