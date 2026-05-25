import type { Meta, StoryObj } from '@storybook/react-vite';

const Welcome = () => (
  <main>
    <h1>Notebook</h1>
    <p>Storybook is wired up. Real component stories will replace this placeholder.</p>
  </main>
);

const meta: Meta<typeof Welcome> = {
  title: 'Welcome',
  component: Welcome,
};

export default meta;

export const Default: StoryObj<typeof Welcome> = {};
