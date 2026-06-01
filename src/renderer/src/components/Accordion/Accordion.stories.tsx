import type { Meta, StoryObj } from '@storybook/react-vite';

import { Accordion } from './Accordion';

/**
 * Visual / documentation stories for the Accordion.
 *
 * These are intentionally play-free: each renders the component in a distinct
 * visual state and serves as a render (smoke) test — it passes if the component
 * renders, fails if it errors. Interaction/assertion tests live alongside in
 * `Accordion.spec.stories.tsx` (the `*.spec.stories.tsx` convention) so that a
 * `play` function mutating state never disturbs these pristine doc views.
 *
 * Visual regression across Helios token modes is the job of a visual-testing
 * tool (e.g. Chromatic `chromatic.modes`), not hand-written computed-style
 * assertions here — see docs/research/storybook-testing.md.
 */
const defaultItems = [
  {
    value: 'what',
    title: 'What is this app?',
    content: 'An accessibility-first, local-first note-taking app for academics.',
  },
  {
    value: 'how',
    title: 'How do I get started?',
    content: 'Open a Library folder, create a Project, and start writing Notes.',
  },
  {
    value: 'why',
    title: 'Why local-first?',
    content: 'Your notes live as plain Markdown files on disk. No cloud account required.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'Components/Disclosure/Accordion',
  component: Accordion,
  args: {
    items: defaultItems,
    type: 'card',
    size: 'medium',
  },
  argTypes: {
    type: { control: 'radio', options: ['card', 'flush'] },
    size: { control: 'radio', options: ['small', 'medium', 'large'] },
    titleTag: { control: 'select', options: ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    collapsible: { control: 'boolean' },
    multiple: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Accordion>;

/** Card is the Helios default & recommended variant: elevated rounded surfaces. */
export const Card: Story = {};

/** Flush variant: bottom-divider rows for space-constrained contexts. */
export const Flush: Story = {
  args: { type: 'flush' },
};

export const SizeSmall: Story = {
  args: { size: 'small', defaultValue: ['what'] },
};

export const SizeMedium: Story = {
  args: { size: 'medium', defaultValue: ['what'] },
};

export const SizeLarge: Story = {
  args: { size: 'large', defaultValue: ['what'] },
};

/** Several items open at once — the default (Helios allows multiple open). */
export const MultipleOpen: Story = {
  args: { defaultValue: ['what', 'how'] },
};

/**
 * Disabled item (extension beyond Helios). Ark applies the native `disabled`
 * attribute to the trigger button, which is exposed to assistive technology.
 */
export const WithDisabledItem: Story = {
  args: {
    items: [
      { value: 'enabled', title: 'Available section', content: 'This section can be opened.' },
      {
        value: 'disabled',
        title: 'Unavailable section',
        content: 'This content is not reachable.',
        disabled: true,
      },
      {
        value: 'also-enabled',
        title: 'Another available section',
        content: 'This section can also be opened.',
      },
    ],
  },
};

/**
 * Static item: non-interactive, chevron hidden. Renders the title as a plain
 * heading rather than an inert button (Helios `@isStatic`).
 */
export const Static: Story = {
  args: {
    items: [
      {
        value: 'static',
        title: 'Always-visible heading',
        content: 'A static item cannot be collapsed and shows no chevron.',
        isStatic: true,
      },
      { value: 'normal', title: 'A normal toggle', content: 'This one still expands.' },
    ],
  },
};

/**
 * Contains-interactive: only the chevron toggles, so the header row can host its
 * own links/buttons (Helios `@containsInteractive`).
 */
export const ContainsInteractive: Story = {
  args: {
    items: [
      {
        value: 'ci',
        title: (
          <span>
            Section with a <a href="https://example.com">link</a> in the header
          </span>
        ),
        content: 'Only the chevron expands this section; the link is independently clickable.',
        containsInteractive: true,
        toggleLabel: 'Toggle section',
      },
    ],
  },
};

// NOTE: there is intentionally no `titleTag` visual story. `titleTag` only
// changes the wrapping heading ELEMENT (e.g. h2 vs h3) for the document outline
// (WCAG 1.3.1); the heading is `font: inherit`, so it has NO visual effect and a
// visual story would look identical to `Card`. Its behavior is verified in
// Accordion.spec.stories.tsx → HeadingTagApplied.
