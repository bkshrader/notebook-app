import type { Meta, StoryObj } from '@storybook/react-vite';

import { Icon } from './Icon';

/**
 * The glyph paths used across the stories. Authored on Helios's 0 0 24 24 grid.
 * Decorative `<path>` content only — the accessible name (when meaningful) is
 * carried by the Icon wrapper, not the paths.
 */
const checkPath = <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" />;
const loaderPath = (
  <path
    d="M12 3a9 9 0 1 0 9 9"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  />
);

const meta: Meta<typeof Icon> = {
  title: 'Components/Display/Icon',
  component: Icon,
  args: { children: checkPath, size: 24, tone: 'inherit', spin: false },
  argTypes: {
    size: { control: 'inline-radio', options: [16, 24] },
    tone: {
      control: 'inline-radio',
      options: [
        'inherit',
        'primary',
        'faint',
        'disabled',
        'action',
        'highlight',
        'success',
        'warning',
        'critical',
      ],
    },
    spin: { control: 'boolean' },
    label: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

/** Decorative by default: aria-hidden, inherits the surrounding text color. */
export const Default: Story = {};

/** Meaningful icon: a `label` exposes it as role="img" with an accessible name. */
export const Meaningful: Story = {
  args: { label: 'Task complete', tone: 'success' },
};

/** The small (16px) box. */
export const Small: Story = {
  args: { size: 16, label: 'Task complete' },
};

/** Semantic tones resolve to Helios foreground tokens. */
export const Critical: Story = {
  args: { tone: 'critical', label: 'Error' },
};

/** The loading/running state spins (suppressed under reduced motion). */
export const Spinning: Story = {
  args: { children: loaderPath, spin: true, label: 'Loading' },
};
