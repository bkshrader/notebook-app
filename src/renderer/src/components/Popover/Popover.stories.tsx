import type { Meta, StoryObj } from '@storybook/react-vite';

import { Popover } from './Popover';

/**
 * Visual / documentation stories for the Popover. These are PRISTINE: no `play`
 * mutates state, so the docs gallery renders them statically. The
 * interaction/accessibility tests live in `Popover.spec.stories.tsx`.
 */
const meta: Meta<typeof Popover> = {
  title: 'Components/Overlays/Popover',
  component: Popover,
  args: {
    triggerLabel: 'Open popover',
    title: 'Favorite Frameworks',
    description: 'Manage and organize your favorite web frameworks.',
    content: null,
  },
  argTypes: {
    // Controlled / uncontrolled open state.
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    // Behavioral props forwarded to Ark's Popover.Root (see Popover.tsx).
    modal: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
    closeOnInteractOutside: { control: 'boolean' },
    autoFocus: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Popover>;

/** Popover closed by default — the trigger is visible; the panel is absent. */
export const Default: Story = {};

/** Popover open on first render so the panel is immediately visible in docs. */
export const Open: Story = {
  args: { defaultOpen: true },
};

/** Modal popover: focus is trapped and outside content is hidden from AT. */
export const Modal: Story = {
  args: { defaultOpen: true, modal: true },
};
