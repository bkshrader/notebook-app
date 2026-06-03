import type { Meta, StoryObj } from '@storybook/react-vite';

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
    pixelSize: { control: { type: 'number', min: 2, max: 16, step: 1 } },
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

/** `pixelSize` scales the code: Ark drives `--qrcode-pixel-size` from the prop. */
export const CustomSize: Story = {
  args: {
    pixelSize: 8,
    label: 'QR code for https://example.com (large)',
  },
};
