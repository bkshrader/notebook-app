import type { Meta, StoryObj } from '@storybook/react-vite';

import { Card } from './Card';

/**
 * Visual stories for the Card. PRISTINE — no state-mutating `play`; behavior
 * assertions live in `Card.spec.stories.tsx`.
 *
 * Card is a presentational container; the demo content below shows realistic
 * card body markup (a heading + copy) so the surface, radius, and elevation are
 * observable.
 */
const meta: Meta<typeof Card> = {
  title: 'Components/Display/Card',
  component: Card,
  args: {
    background: 'primary',
    overflow: 'visible',
  },
  argTypes: {
    level: {
      control: 'inline-radio',
      options: [
        undefined,
        'surface-base',
        'surface-mid',
        'surface-high',
        'elevation-mid',
        'elevation-high',
      ],
    },
    background: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
    overflow: {
      control: 'inline-radio',
      options: ['hidden', 'visible'],
    },
  },
  render: (args) => (
    <Card {...args} style={{ inlineSize: '20rem', padding: '1.5rem' }}>
      <h3 style={{ margin: 0 }}>Card title</h3>
      <p style={{ marginBlock: '0.5rem 0' }}>
        A container surface for grouping related content, with optional elevation and background.
      </p>
    </Card>
  ),
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {};

export const SurfaceElevation: Story = {
  args: { level: 'surface-mid' },
};

export const RaisedElevation: Story = {
  args: { level: 'elevation-high' },
};

export const SecondaryBackground: Story = {
  args: { background: 'secondary' },
};

export const Interactive: Story = {
  args: { level: 'surface-base', hoverLevel: 'surface-high', activeLevel: 'surface-mid' },
  render: (args) => (
    <Card {...args} style={{ inlineSize: '20rem', overflow: 'hidden' }}>
      <a
        href="#card-link"
        style={{ display: 'block', padding: '1.5rem', color: 'inherit', textDecoration: 'none' }}
      >
        <h3 style={{ margin: 0 }}>Interactive card</h3>
        <p style={{ marginBlock: '0.5rem 0' }}>
          The whole card is a link. The card stays a non-interactive container; the inner anchor
          owns the accessible name and focus ring.
        </p>
      </a>
    </Card>
  ),
};
