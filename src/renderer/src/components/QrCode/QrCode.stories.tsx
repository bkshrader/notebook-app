import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { QrCode } from './QrCode';

const meta: Meta<typeof QrCode> = {
  title: 'Components/Display/QrCode',
  component: QrCode,
  args: {
    defaultValue: 'https://example.com',
    label: 'QR code for https://example.com',
  },
  argTypes: {
    value: { control: 'text' },
    showDownload: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof QrCode>;

export const Default: Story = {};

export const WithDownload: Story = {
  args: {
    showDownload: true,
    downloadFileName: 'example-qr.png',
    downloadMimeType: 'image/png',
    label: 'QR code for https://example.com — with download button',
  },
};

export const CustomSize: Story = {
  args: {
    style: { '--qrcode-pixel-size': '8' } as React.CSSProperties,
    label: 'QR code for https://example.com (large)',
  },
};

/** Tier A-display play test: asserts ARIA contract and download-button focusability. */
export const A11yContract: Story = {
  args: {
    showDownload: true,
    label: 'QR code for https://example.com',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('frame SVG has an accessible label', async () => {
      // The QR code frame SVG carries role="img" + aria-label so screen readers
      // can announce what the code encodes. A plain <div> without a valid ARIA
      // role cannot carry aria-label (axe aria-prohibited-attr), so the label
      // lives on the SVG element which IS the visual image.
      const frame = canvasElement.querySelector('[data-scope="qr-code"][data-part="frame"]');
      await expect(frame).not.toBeNull();
      await expect(frame).toHaveAttribute('role', 'img');
      await expect(frame).toHaveAttribute('aria-label', 'QR code for https://example.com');
    });

    await step('download button is present and focusable', async () => {
      const btn = canvas.getByRole('button', { name: /download/i });
      await expect(btn).toBeInTheDocument();
      // Verify it is not hidden from keyboard (no tabindex='-1')
      await expect(btn).not.toHaveAttribute('tabindex', '-1');
      // Focus directly (userEvent.tab skips clip-hidden elements)
      btn.focus();
      await expect(btn).toHaveFocus();
    });
  },
};
