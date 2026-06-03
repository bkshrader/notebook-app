import { useEffect } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { createToast, Toast, type ToastColor } from './Toast';

/**
 * Interaction / accessibility tests for the Toast — the Tier-E provider-shaped
 * primitive. Kept separate from the visual stories (Toast.stories.tsx) per the
 * `*.spec.stories.tsx` convention: these `play` functions drive and MUTATE state
 * (enqueue toasts, focus, dismiss), so colocating them with a doc story would
 * make that story flash/animate on load. Each story is behavior-named and each
 * play AWAITS a real `expect`.
 *
 * The Toast contract this guards (verified against the live Zag connect):
 *   - The Toaster GROUP host is a real LIVE REGION: role="region",
 *     aria-live="polite" (the WCAG 4.1.3 fix the ADR flags Radix Toast for).
 *   - Each toast ROOT is role="status", aria-atomic, keyboard-focusable
 *     (tabIndex=0), with aria-labelledby/aria-describedby auto-wired.
 *   - A toast is keyboard-dismissible (Escape) and via its close button.
 *
 * The host renders OUTSIDE the story canvas (Ark appends it to document.body),
 * so assertions query `document.body`, riding out mount/exit with waitFor.
 */

/**
 * Mounts a Toast host with a private store and enqueues one persistent toast on
 * mount (duration Infinity → no auto-dismiss race). placement top-start keeps it
 * deterministic; each story gets a fresh store so toasts never leak across runs.
 */
function ToastHarness({
  color = 'neutral',
  title,
  description,
}: {
  color?: ToastColor;
  title: string;
  description?: string;
}) {
  const toaster = createToast({ placement: 'top-start', overlap: false });

  useEffect(() => {
    toaster.create({ title, description, duration: Infinity, meta: { color } });
  }, [toaster, color, title, description]);

  return <Toast toaster={toaster} />;
}

const meta: Meta<typeof ToastHarness> = {
  title: 'Components/Feedback/Toast/Tests',
  component: ToastHarness,
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ToastHarness>;

/** The toast lands in a polite live region with role="status" (WCAG 4.1.3). */
export const LandsInLiveRegion: Story = {
  args: { title: 'Creating cluster', description: 'This may take a few minutes.' },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('the host is a polite live region', async () => {
      const region = await body.findByRole('region');
      await expect(region).toHaveAttribute('aria-live', 'polite');
    });

    await step('the toast is announced via role="status"', async () => {
      const toast = await body.findByRole('status');
      await expect(toast).toHaveAttribute('aria-atomic', 'true');
      // The live region must contain the toast so AT announces it in place.
      const region = body.getByRole('region');
      await expect(region).toContainElement(toast);
    });

    await step('title + description are wired as the accessible name/description', async () => {
      const toast = body.getByRole('status');
      await expect(toast).toHaveAttribute('aria-labelledby');
      await expect(toast).toHaveAttribute('aria-describedby');
      await expect(toast).toHaveTextContent('Creating cluster');
      await expect(toast).toHaveTextContent('This may take a few minutes.');
    });
  },
};

/** The toast is keyboard-focusable and Escape dismisses it. */
export const KeyboardDismissible: Story = {
  args: { title: 'Saved', description: 'Your changes were saved.' },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('the toast is keyboard-focusable (tabIndex 0)', async () => {
      const toast = await body.findByRole('status');
      await expect(toast).toHaveAttribute('tabindex', '0');
      toast.focus();
      await expect(toast).toHaveFocus();
    });

    await step('Escape dismisses the focused toast', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(body.queryByRole('status')).toBeNull();
      });
    });
  },
};

/** The close button dismisses the toast and exposes an accessible name. */
export const CloseButtonDismisses: Story = {
  args: { title: 'Upload complete', description: 'Your file is ready.' },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('the dismiss button has an accessible name + the styled data-part', async () => {
      await body.findByRole('status');
      const close = body.getByRole('button', { name: 'Dismiss' });
      await expect(close).toBeInTheDocument();
      // Guards the [data-part='close-trigger'] CSS against being a dead selector
      // (Ark's anatomy emits the kebab-cased part name).
      await expect(close).toHaveAttribute('data-part', 'close-trigger');
    });

    await step('activating it removes the toast', async () => {
      const close = body.getByRole('button', { name: 'Dismiss' });
      await userEvent.click(close);
      await waitFor(async () => {
        await expect(body.queryByRole('status')).toBeNull();
      });
    });
  },
};

/** The tone resolves a real tinted surface + tone border (computed-style backstop). */
export const ToneResolvesTokens: Story = {
  args: { color: 'critical', title: 'Cluster creation failed', description: 'Validation failed.' },
  play: async ({ step }) => {
    const body = within(document.body);

    await step('the tone is reflected onto the root as data-color', async () => {
      const toast = await body.findByRole('status');
      await expect(toast).toHaveAttribute('data-color', 'critical');
    });

    await step('critical toast paints a surface, a border, and an elevation shadow', async () => {
      const toast = body.getByRole('status');
      const cs = getComputedStyle(toast);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopWidth).not.toBe('0px');
      await expect(cs.borderTopStyle).toBe('solid');
      await expect(cs.boxShadow).not.toBe('none');
    });
  },
};
