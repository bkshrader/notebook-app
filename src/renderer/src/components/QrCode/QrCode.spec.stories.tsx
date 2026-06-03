import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { QrCode } from './QrCode';

/**
 * Interaction / accessibility tests for the QrCode.
 *
 * Kept separate from the visual stories (`QrCode.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (focus, disabled), so colocating it with a doc story would
 * make that story flash/mutate on load. Stories are named by behavior so a
 * failure is self-describing, each asserts with awaited `expect`, and each uses
 * `step()` for readable runner / Interactions-panel output.
 *
 * These guards are regression guards for the Helios-parity fixes:
 *   - the download trigger's keyboard focus ring renders via the NATIVE
 *     `:focus-visible` pseudo (the old dead `[data-focus-visible]` selector
 *     drew nothing);
 *   - disabled differs visibly from enabled (native `:disabled`, not the dead
 *     `[data-disabled]`);
 *   - Ark genuinely emits `data-scope='qr-code'` + `data-part` on every part
 *     (Root, Frame, Pattern, DownloadTrigger), so the attribute selectors are
 *     live (verified against the DOM, not the styling-guide's empty dataAttr).
 */
const meta: Meta<typeof QrCode> = {
  title: 'Components/Display/QrCode/Tests',
  component: QrCode,
  args: {
    defaultValue: 'https://example.com',
    label: 'QR code for https://example.com',
    showDownload: true,
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof QrCode>;

/** Ark emits data-scope/data-part on every part; the SVG frame carries the label. */
export const ScopeAndAriaContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Root, Frame, Pattern and DownloadTrigger all carry scope/part', async () => {
      const parts = [...canvasElement.querySelectorAll('[data-scope="qr-code"]')].map((e) =>
        e.getAttribute('data-part'),
      );
      await expect(parts).toContain('root');
      await expect(parts).toContain('frame');
      await expect(parts).toContain('pattern');
      await expect(parts).toContain('download-trigger');
    });

    await step('frame SVG has role="img" + an accessible label', async () => {
      // A plain <div> without a valid role cannot carry aria-label (axe
      // aria-prohibited-attr); the label lives on the SVG which IS the image.
      const frame = canvasElement.querySelector('[data-scope="qr-code"][data-part="frame"]');
      await expect(frame).not.toBeNull();
      await expect(frame).toHaveAttribute('role', 'img');
      await expect(frame).toHaveAttribute('aria-label', 'QR code for https://example.com');
    });

    await step('the download trigger is a native button with a bordered surface', async () => {
      const btn = canvas.getByRole('button', { name: /download/i });
      await expect(btn.tagName).toBe('BUTTON');
      const cs = getComputedStyle(btn);
      // Regression guard: the old CSS set border-color but no style/width, so
      // the border never rendered. It must now be a real, visible border.
      await expect(cs.borderTopStyle).not.toBe('none');
      await expect(cs.borderTopWidth).not.toBe('0px');
    });
  },
};

/** Keyboard focus draws a real focus ring on the download button. */
export const DownloadFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole('button', { name: /download/i });

    await step('download button is keyboard-reachable', async () => {
      await expect(btn).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: the ring is the native :focus-visible box-shadow.
      // The old `[data-focus-visible]` selector was dead (Ark emits no such
      // attr), so the ring drew nothing. userEvent.tab() yields a real keyboard
      // focus that triggers :focus-visible (unlike programmatic .focus()).
      btn.blur();
      await userEvent.tab();
      // The QrCode has no other tabbable element before the button, but be
      // resilient: keep tabbing until the button is focused.
      let guard = 0;
      while (document.activeElement !== btn && guard < 5) {
        await userEvent.tab();
        guard += 1;
      }
      await expect(btn).toHaveFocus();
      const ring = getComputedStyle(btn).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** The disabled download button is visibly and behaviorally distinct from enabled. */
export const DisabledTriggerDiffers: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const btn = canvas.getByRole<HTMLButtonElement>('button', { name: /download/i });

    await step('native :disabled restyles the button distinctly from enabled', async () => {
      // Enabled baseline: an interactive (pointer) cursor.
      await expect(getComputedStyle(btn).cursor).toBe('pointer');

      // Drive the native disabled state directly (this is a test mutation).
      btn.disabled = true;
      // Force a style recalc so getComputedStyle reflects the :disabled rule.
      void btn.offsetHeight;

      await expect(btn).toBeDisabled();
      // Regression guard: the native :disabled rule must apply. The cursor
      // flipping to not-allowed proves the `:disabled` pseudo matches and its
      // declarations win the cascade — behavior the dead `[data-disabled]`
      // selector never produced (it set no cursor and matched no element, since
      // this native button carries `disabled`, not `data-disabled`). The cursor
      // is theme-independent, unlike the recolor tokens.
      await expect(getComputedStyle(btn).cursor).toBe('not-allowed');
    });
  },
};
