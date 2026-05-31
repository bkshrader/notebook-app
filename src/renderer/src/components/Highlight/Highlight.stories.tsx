import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Highlight } from './Highlight';

const meta: Meta<typeof Highlight> = {
  title: 'Components/Display/Highlight',
  component: Highlight,
  args: {
    text: 'Ark UI is a headless component library for building accessible web applications.',
    query: 'accessible',
  },
  argTypes: {
    query: { control: 'text' },
    ignoreCase: { control: 'boolean' },
    matchAll: { control: 'boolean' },
    exactMatch: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Highlight>;

export const Default: Story = {};

export const MultipleTerms: Story = {
  args: {
    query: ['headless', 'accessible', 'library'],
    text: 'Ark UI is a headless component library for building accessible web applications.',
  },
};

export const CaseSensitive: Story = {
  args: {
    query: 'ark',
    text: 'Ark UI is a headless component library. ark ui rocks.',
    ignoreCase: false,
  },
};

export const AriaContract: Story = {
  args: {
    query: 'accessible',
    text: 'Ark UI is a headless component library for building accessible web applications.',
  },
  play: async ({ canvasElement, step }) => {
    await step('renders a mark element for the matched term', async () => {
      // <mark> is a semantic HTML element with no corresponding ARIA role;
      // getAllByRole('mark') would throw. Query the DOM directly instead.
      const marks = canvasElement.querySelectorAll('mark');
      await expect(marks.length).toBeGreaterThanOrEqual(1);
    });

    await step('mark contains the matched text', async () => {
      const marks = canvasElement.querySelectorAll('mark');
      await expect(marks[0]).toHaveTextContent('accessible');
    });
  },
};
