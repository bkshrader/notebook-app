import type { Meta, StoryObj } from '@storybook/react-vite';

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
    size: {
      control: 'inline-radio',
      options: ['small', 'medium', 'large'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof DownloadTrigger>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Small: Story = {
  args: { size: 'small' },
};

export const Large: Story = {
  args: { size: 'large' },
};

export const LongFileName: Story = {
  args: {
    data: SAMPLE_CONTENT,
    fileName: 'my-very-long-exported-notes-document-2026.txt',
    children: 'Download Notes',
  },
};
