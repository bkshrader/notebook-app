import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeBlock } from './CodeBlock';

const sample = `function greet(name) {
  // A friendly greeting
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

greet("world");`;

const jsonSample = `{
  "name": "notebook-app",
  "private": true,
  "version": "0.0.0",
  "engines": { "node": ">=24" }
}`;

const longSample = Array.from({ length: 40 }, (_, i) => `const line${i + 1} = ${i + 1};`).join(
  '\n',
);

const meta: Meta<typeof CodeBlock> = {
  title: 'Components/Editor/CodeBlock',
  component: CodeBlock,
  args: {
    value: sample,
    ariaLabel: 'Example greet function',
    language: 'javascript',
  },
  argTypes: {
    language: {
      control: 'select',
      options: ['javascript', 'jsx', 'typescript', 'tsx', 'json', 'plaintext'],
    },
    showLineNumbers: { control: 'boolean' },
    copyable: { control: 'boolean' },
    isStandalone: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const Default: Story = {};

export const WithLineNumbers: Story = {
  args: { showLineNumbers: true },
};

/** Header with a title and description. */
export const WithHeader: Story = {
  args: {
    title: 'greet.js',
    description: 'A small example function with a comment and a string.',
    showLineNumbers: true,
  },
};

/** Single line, a range, and individual lines all highlighted. */
export const LineHighlighting: Story = {
  args: {
    showLineNumbers: true,
    highlightLines: [2, [3, 4]],
  },
};

export const Json: Story = {
  args: {
    value: jsonSample,
    language: 'json',
    ariaLabel: 'Example package manifest',
    title: 'package.json',
  },
};

/** Capped height shows a "Show more code" toggle when content overflows. */
export const HeightToggle: Story = {
  args: {
    value: longSample,
    ariaLabel: 'A long code sample',
    language: 'javascript',
    showLineNumbers: true,
    maxHeight: '200px',
  },
};

/** Embedded (non-standalone): no border radius, for nesting against a surface. */
export const Embedded: Story = {
  args: { isStandalone: false },
};

/** No copy button. */
export const NotCopyable: Story = {
  args: { copyable: false },
};
