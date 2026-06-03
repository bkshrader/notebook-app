import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Components/Display/Text',
  component: Text,
  args: {
    variant: 'body',
    size: '200',
    weight: 'regular',
    color: 'inherit',
    children: 'The quick brown fox jumps over the lazy dog.',
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['display', 'body', 'code'] },
    size: { control: 'inline-radio', options: ['100', '200', '300', '400', '500'] },
    weight: { control: 'inline-radio', options: ['regular', 'medium', 'semibold', 'bold'] },
    color: {
      control: 'select',
      options: [
        'inherit',
        'primary',
        'strong',
        'faint',
        'disabled',
        'action',
        'success',
        'warning',
        'critical',
        'highlight',
      ],
    },
    align: { control: 'inline-radio', options: [undefined, 'start', 'center', 'end'] },
    as: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

/** Default: a body-200, regular-weight `<span>` (the Helios default tag/variant/size). */
export const Default: Story = {};

/** Display variant rendered as a semantic page-title heading. */
export const DisplayHeading: Story = {
  args: {
    as: 'h1',
    variant: 'display',
    size: '500',
    weight: 'bold',
    children: 'Page title',
  },
};

/** Body variant rendered as a paragraph — the common running-text case. */
export const BodyParagraph: Story = {
  args: {
    as: 'p',
    variant: 'body',
    size: '300',
    children:
      'Local-first notes stay as plain Markdown on disk, so the typographic style is the only thing this component owns.',
  },
};

/** Code variant rendered as preformatted text. */
export const CodeSample: Story = {
  args: {
    as: 'pre',
    variant: 'code',
    size: '200',
    children: 'pnpm run typecheck',
  },
};

/** Semantic foreground color tokens applied to body text. */
export const Colored: Story = {
  args: {
    color: 'critical',
    weight: 'medium',
    children: 'This text uses the critical foreground token.',
  },
};

/** Centered alignment via the logical `align` prop. */
export const Centered: Story = {
  args: {
    as: 'p',
    align: 'center',
    children: 'Centered paragraph text.',
  },
};

/** Structured content: the typographic style applies to nested inline markup too. */
export const StructuredContent: Story = {
  args: {
    as: 'p',
    variant: 'body',
    size: '300',
    children: (
      <>
        This paragraph contains <strong>strong</strong> and <em>emphasized</em> text inside the same
        typographic style.
      </>
    ),
  },
};
