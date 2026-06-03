import type { Meta, StoryObj } from '@storybook/react-vite';

import { Marquee } from './Marquee';

const meta: Meta<typeof Marquee> = {
  title: 'Components/Display/Marquee',
  component: Marquee,
  args: {
    label: 'Partner logos',
    edges: false,
    children: (
      <>
        <span style={{ paddingInline: '1rem' }}>Helios</span>
        <span style={{ paddingInline: '1rem' }}>CodeMirror</span>
        <span style={{ paddingInline: '1rem' }}>MathJax</span>
        <span style={{ paddingInline: '1rem' }}>Ark UI</span>
        <span style={{ paddingInline: '1rem' }}>Electron</span>
      </>
    ),
  },
  argTypes: {
    label: { control: 'text' },
    edges: { control: 'boolean' },
    side: {
      control: 'inline-radio',
      options: ['start', 'end', 'top', 'bottom'],
    },
    speed: { control: { type: 'number', min: 10, max: 200, step: 10 } },
    pauseOnInteraction: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Marquee>;

export const Default: Story = {};

export const WithEdges: Story = {
  args: { edges: true },
};

export const Reverse: Story = {
  args: { side: 'end', label: 'Latest headlines' },
};

export const Vertical: Story = {
  args: { side: 'top', label: 'Activity feed' },
  decorators: [
    (Story) => (
      <div style={{ blockSize: '12rem' }}>
        <Story />
      </div>
    ),
  ],
};
