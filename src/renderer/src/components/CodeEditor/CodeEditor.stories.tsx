import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodeEditor } from './CodeEditor';

const jsSample = `function fib(n) {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

console.log(fib(10));`;

const jsonSample = `{
  "name": "notebook-app",
  "version": "0.0.0",
  "private": true
}`;

const meta: Meta<typeof CodeEditor> = {
  title: 'Components/Editor/CodeEditor',
  component: CodeEditor,
  args: {
    value: jsSample,
    ariaLabel: 'JavaScript editor',
    language: 'javascript',
  },
  argTypes: {
    language: {
      control: 'select',
      options: ['javascript', 'jsx', 'typescript', 'tsx', 'json', 'plaintext'],
    },
    copyable: { control: 'boolean' },
    fullScreenable: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    isStandalone: { control: 'boolean' },
  },
  // A controlled wrapper so the editable demos round-trip text through React
  // state (the editor is controlled: `value` + `onChange`).
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return <CodeEditor {...args} value={value} onChange={setValue} />;
  },
};

export default meta;
type Story = StoryObj<typeof CodeEditor>;

export const Default: Story = {};

/** Header with a title and description (plus the default secondary actions). */
export const WithHeader: Story = {
  args: {
    title: 'fib.js',
    description: 'Edit the function — copy or expand to full screen from the header.',
  },
};

/** JSON editing with linting: type invalid JSON, then press Ctrl/Cmd-Shift-m. */
export const JsonWithLinting: Story = {
  args: {
    value: jsonSample,
    language: 'json',
    lintLanguage: 'json',
    ariaLabel: 'JSON editor with linting',
    title: 'config.json',
    description:
      'Invalid JSON is underlined; press Ctrl/Cmd-Shift-m to open the diagnostics panel.',
  },
};

/** A custom primary action in the header, beside the secondary actions. */
export const WithCustomActions: Story = {
  args: {
    title: 'script.js',
    customActions: (
      <button type="button" style={{ font: 'inherit' }}>
        Run
      </button>
    ),
  },
};

/** Empty editor with a placeholder. */
export const WithPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'Type some code…',
    ariaLabel: 'Empty editor',
  },
};

/** Read-only: focusable and selectable, but not editable. */
export const ReadOnly: Story = {
  args: { readOnly: true },
};

/** Embedded (non-standalone): no border radius. */
export const Embedded: Story = {
  args: { isStandalone: false },
};

/** No header at all (all actions disabled, no title/description). */
export const NoHeader: Story = {
  args: { copyable: false, fullScreenable: false },
};
