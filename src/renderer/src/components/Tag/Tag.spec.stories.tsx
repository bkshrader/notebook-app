import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tag } from './Tag';

/**
 * Interaction / accessibility tests for the Tag primitive.
 *
 * Kept separate from the visual stories (`Tag.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 *
 * Tag is presentational HTML (a `<span>` label, optionally a native `<a>` link
 * and/or a native `<button>` dismiss). The guards assert (a) the role/structure
 * contract for each form, (b) the token-driven visual contract resolves, and
 * (c) the real keyboard path for the interactive sub-parts (Enter/Space activate
 * the dismiss button; the link is reachable by Tab and exposes the action color).
 *
 * Named by behavior so a failure is self-describing; each uses `step()` and
 * `await`s real `expect(...)`. `tags: ['test']` hides them from the docs gallery.
 */
const meta: Meta<typeof Tag> = {
  title: 'Components/Display/Tag/Tests',
  component: Tag,
  args: { children: 'Design' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Tag>;

/** The static form renders a labeled root with no interactive controls. */
export const StaticLabelContract: Story = {
  args: { children: 'Design' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders the root with its data-part and the label text', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-component='tag'][data-part='root']",
      );
      await expect(root).not.toBeNull();
      await expect(canvas.getByText('Design')).toBeInTheDocument();
    });

    await step('the static form exposes no button or link', async () => {
      await expect(canvas.queryByRole('button')).toBeNull();
      await expect(canvas.queryByRole('link')).toBeNull();
    });

    await step(
      'the root resolves a real (non-transparent) pill background and border',
      async () => {
        const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
        const cs = getComputedStyle(root);
        await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        // The 50px pill radius resolves to a non-zero corner.
        await expect(cs.borderTopLeftRadius).not.toBe('0px');
        await expect(parseFloat(cs.borderTopWidth)).toBeGreaterThan(0);
      },
    );
  },
};

/** The link form is a keyboard-reachable anchor exposing the action color. */
export const LinkContract: Story = {
  args: { href: '#design', children: 'Design' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the label is exposed as a link with the right href', async () => {
      const link = canvas.getByRole('link', { name: 'Design' });
      await expect(link).toHaveAttribute('href', '#design');
    });

    await step('the link is reachable by keyboard (Tab focuses it)', async () => {
      const link = canvas.getByRole('link', { name: 'Design' });
      await userEvent.tab();
      await waitFor(() => expect(link).toHaveFocus());
    });

    await step('primary color resolves a non-transparent link foreground', async () => {
      const link = canvas.getByRole('link', { name: 'Design' });
      const color = getComputedStyle(link).color;
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The dismiss button has an accessible name and fires onDismiss via the keyboard. */
export const DismissKeyboardContract: Story = {
  args: {
    children: 'Accessibility',
    dismissLabel: 'Remove Accessibility tag',
    onDismiss: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the dismiss control is a button with its accessible name', async () => {
      const btn = canvas.getByRole('button', { name: 'Remove Accessibility tag' });
      await expect(btn).toBeInTheDocument();
    });

    await step('Enter on the focused dismiss button invokes onDismiss', async () => {
      const btn = canvas.getByRole('button', { name: 'Remove Accessibility tag' });
      btn.focus();
      await waitFor(() => expect(btn).toHaveFocus());
      await userEvent.keyboard('{Enter}');
      await expect(args.onDismiss).toHaveBeenCalled();
    });

    await step('the keyboard focus ring resolves to a box-shadow on :focus-visible', async () => {
      const btn = canvas.getByRole('button', { name: 'Remove Accessibility tag' });
      // Reset focus to the body, then Tab so :focus-visible matches (it is the
      // only focusable element in the canvas; programmatic focus() alone would
      // not satisfy :focus-visible in Chromium).
      btn.blur();
      await userEvent.tab();
      await waitFor(() => expect(btn).toHaveFocus());
      const shadow = getComputedStyle(btn).boxShadow;
      await expect(shadow).not.toBe('none');
    });
  },
};

/** A dismissible link exposes both interactive parts, each its own control. */
export const DismissibleLinkStructure: Story = {
  args: {
    children: 'Electron',
    href: '#electron',
    dismissLabel: 'Remove Electron tag',
    onDismiss: fn(),
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('both a dismiss button and a link are present', async () => {
      await expect(canvas.getByRole('button', { name: 'Remove Electron tag' })).toBeInTheDocument();
      await expect(canvas.getByRole('link', { name: 'Electron' })).toHaveAttribute(
        'href',
        '#electron',
      );
    });

    await step('the dismiss button precedes the label in the DOM (leading control)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const btn = canvas.getByRole('button', { name: 'Remove Electron tag' });
      const link = canvas.getByRole('link', { name: 'Electron' });
      // The dismiss button is the first child; Helios puts it first.
      await expect(root.firstElementChild).toBe(btn);
      await expect(
        btn.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  },
};
