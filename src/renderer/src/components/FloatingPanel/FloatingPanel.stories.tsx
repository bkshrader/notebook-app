import type { Meta, StoryObj } from '@storybook/react-vite';

import { FloatingPanel } from './FloatingPanel';

/**
 * Visual / documentation stories for the FloatingPanel. These are PRISTINE: no
 * `play` mutates state, so the docs gallery renders them statically without the
 * panel animating or popping open on load. The interaction / a11y regression
 * guards live in `FloatingPanel.spec.stories.tsx`.
 *
 * The Root-level Ark props (size/position/draggable/resizable/min/max/default
 * size) flow through `...rootProps` (FloatingPanelProps extends
 * FloatingPanelRootProps); they are surfaced in argTypes here so they are
 * controllable in the docs.
 */
const meta: Meta<typeof FloatingPanel> = {
  title: 'Components/Overlays/FloatingPanel',
  component: FloatingPanel,
  args: {
    title: 'Floating Panel',
    triggerLabel: 'Open Panel',
    children: <p>Panel body content.</p>,
  },
  argTypes: {
    open: { control: 'boolean' },
    defaultOpen: { control: 'boolean' },
    draggable: { control: 'boolean' },
    resizable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof FloatingPanel>;

export const Default: Story = {};

export const DefaultOpen: Story = {
  args: { defaultOpen: true },
};

/** A fixed-size, non-resizable, non-draggable panel (Root props passed through). */
export const FixedSize: Story = {
  args: {
    defaultOpen: true,
    draggable: false,
    resizable: false,
    defaultSize: { width: 360, height: 240 },
  },
};
