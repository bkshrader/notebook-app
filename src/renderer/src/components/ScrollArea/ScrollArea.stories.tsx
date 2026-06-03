import type { Meta, StoryObj } from '@storybook/react-vite';

import { ScrollArea } from './ScrollArea';

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut ' +
  'labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco ' +
  'laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in ' +
  'voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat ' +
  'non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

const meta: Meta<typeof ScrollArea> = {
  title: 'Components/Layout/ScrollArea',
  component: ScrollArea,
  args: {
    children: <p style={{ margin: 0 }}>{LOREM}</p>,
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '24rem', blockSize: '8rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ScrollArea>;

/** Vertical overflow — the default case. */
export const Default: Story = {};

/** Both axes overflow when given a wide, long content block. */
export const BothDirections: Story = {
  args: {
    children: (
      <p style={{ margin: 0, whiteSpace: 'nowrap' }}>
        {LOREM} {LOREM}
      </p>
    ),
  },
};

/** Small scrollbar thickness. */
export const Small: Story = {
  args: { size: 'small' },
};

/** Large scrollbar thickness. */
export const Large: Story = {
  args: { size: 'large' },
};
