import { useEffect } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { createToast, Toast, type ToastColor } from './Toast';

/**
 * Visual stories for the Toast — the Tier-E provider-shaped Component Library
 * primitive (createToaster + a Toaster host), built to the Helios Toast spec.
 *
 * These are PRISTINE: no story drives or mutates state with a `play`. To show a
 * toast on load without an interaction, each story creates its own toaster store
 * and enqueues a single non-expiring toast in a mount effect — purely
 * declarative setup, not a test.
 *
 * Interaction / a11y behavior (live region, role, keyboard dismissal) is covered
 * separately in Toast.spec.stories.tsx.
 */
const meta: Meta<typeof Toast> = {
  title: 'Components/Feedback/Toast',
  component: Toast,
};

export default meta;
type Story = StoryObj<typeof Toast>;

/**
 * Renders a Toast host and enqueues one persistent toast of the given tone on
 * mount. `duration: Infinity` keeps it visible so the docs/visual snapshot is
 * stable (no auto-dismiss race). Placement is overridden to top-start so the
 * toast sits inside the small story canvas rather than the viewport corner.
 */
function ToastDemo({
  color,
  title,
  description,
}: {
  color: ToastColor;
  title: string;
  description?: string;
}) {
  const toaster = createToast({ placement: 'top-start', overlap: false });

  useEffect(() => {
    toaster.create({ title, description, duration: Infinity, meta: { color } });
  }, [toaster, color, title, description]);

  return <Toast toaster={toaster} />;
}

export const Default: Story = {
  render: () => (
    <ToastDemo
      color="neutral"
      title="Creating cluster"
      description="This may take a few minutes."
    />
  ),
};

export const Success: Story = {
  render: () => (
    <ToastDemo
      color="success"
      title="Cluster created"
      description="Your cluster is ready to use."
    />
  ),
};

export const Highlight: Story = {
  render: () => (
    <ToastDemo
      color="highlight"
      title="New version available"
      description="Update to get the latest features."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ToastDemo
      color="warning"
      title="Cluster created with warnings"
      description="One node failed to validate. Review before deploying."
    />
  ),
};

export const Critical: Story = {
  render: () => (
    <ToastDemo
      color="critical"
      title="Cluster creation failed"
      description="Deployment validation did not pass."
    />
  ),
};

export const TitleOnly: Story = {
  render: () => <ToastDemo color="neutral" title="Saved" />,
};
