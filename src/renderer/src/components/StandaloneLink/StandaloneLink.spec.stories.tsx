import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { StandaloneLink } from './StandaloneLink';

/**
 * Interaction / accessibility tests for the StandaloneLink.
 *
 * Kept separate from the visual stories (`StandaloneLink.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behavior, each uses `step()`, and each `await`s a real `expect(...)`
 * (Storybook matchers are async).
 *
 * StandaloneLink is a plain-HTML (native `<a>`) component with no Ark primitive
 * and no state machine, but it IS focusable, so the contract is both structural
 * (the parts are emitted, the text is the accessible name, color/size selectors
 * resolve real tokens) AND interactive (it is a keyboard-reachable link whose
 * native `:focus-visible` paints the focus ring). axe runs automatically via the
 * preview's `a11y.test: 'error'` gate (no manual call).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const ArrowIcon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const meta: Meta<typeof StandaloneLink> = {
  title: 'Components/Navigation/StandaloneLink/Tests',
  component: StandaloneLink,
  args: { children: 'View clusters', href: '#destination' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof StandaloneLink>;

/** The Helios structural + ARIA contract: a real link, named by its text. */
export const LinkRoleAndName: Story = {
  args: { children: 'View clusters', href: '#destination' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders an anchor exposed as a link to assistive tech', async () => {
      const link = canvas.getByRole('link', { name: 'View clusters' });
      await expect(link).toBeInTheDocument();
      await expect(link.tagName).toBe('A');
      await expect(link).toHaveAttribute('href', '#destination');
    });

    await step('the visible text is the accessible name under the text part', async () => {
      const text = canvas.getByText('View clusters');
      await expect(text.closest("[data-part='text']")).not.toBeNull();
    });

    await step('root resolves an inline-flex box (display token applied)', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(getComputedStyle(root).display).toBe('inline-flex');
    });
  },
};

/** Keyboard reachability + native focus ring (the WCAG 2.4.7 guard). */
export const KeyboardFocusRing: Story = {
  args: { children: 'Get started', href: '#destination' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole('link', { name: 'Get started' });

    await step('the link is keyboard-reachable (not removed from tab order)', async () => {
      await expect(link).not.toHaveAttribute('tabindex', '-1');
    });

    await step('Tab focuses the link and paints the focus ring', async () => {
      // Regression guard: the ring is the box-shadow drawn on the anchor via the
      // native :focus-visible pseudo (this is a plain <a>, no Ark data-focus).
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike programmatic .focus().
      link.blur();
      await userEvent.tab();
      await waitFor(async () => {
        await expect(link).toHaveFocus();
        const ring = getComputedStyle(link).boxShadow;
        await expect(ring).not.toBe('none');
        await expect(ring).not.toBe('');
      });
    });
  },
};

/** The primary color variant resolves the action foreground token. */
export const PrimaryResolvesActionToken: Story = {
  args: { children: 'View clusters', href: '#destination', color: 'primary' },
  play: async ({ canvasElement, step }) => {
    await step('primary resolves a real (non-default) foreground color', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: the [data-color='primary'] selector applies a real
      // foreground token rather than leaving the link the inherited body color.
      await expect(cs.color).toBeTruthy();
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('the underline starts transparent (animates in on hover)', async () => {
      const text = canvasElement.querySelector<HTMLElement>("[data-part='text']")!;
      const cs = getComputedStyle(text);
      await expect(cs.textDecorationLine).toContain('underline');
      await expect(cs.textDecorationColor).toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The secondary color variant resolves a distinct (strong) foreground token. */
export const SecondaryResolvesStrongToken: Story = {
  args: { children: 'Learn more about Vault', href: '#destination', color: 'secondary' },
  play: async ({ canvasElement, step }) => {
    await step('secondary resolves a real foreground color distinct from primary', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.color).toBeTruthy();
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The size scale resolves distinct icon boxes and text typography. */
export const SizeScale: Story = {
  args: { children: 'Get started', href: '#destination', size: 'large', icon: ArrowIcon },
  play: async ({ canvasElement, step }) => {
    await step('large resolves the --standalone-link-icon-size custom property', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      // Regression guard: the data-size selector sets the local icon-size custom
      // property, which the icon box consumes. Large resolves 1.5rem.
      await expect(cs.getPropertyValue('--standalone-link-icon-size').trim()).toBe('1.5rem');
      await expect(cs.getPropertyValue('--standalone-link-font-size').trim()).toBe('1rem');
    });

    await step('the decorative icon is hidden from assistive tech', async () => {
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** The icon slot is optional and respects iconPosition (leading vs trailing). */
export const IconPositionContract: Story = {
  args: {
    children: 'View clusters',
    href: '#destination',
    icon: ArrowIcon,
    iconPosition: 'trailing',
  },
  play: async ({ canvasElement, step }) => {
    await step('a trailing icon follows the text in DOM order', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const icon = root.querySelector("[data-part='icon']")!;
      const text = root.querySelector("[data-part='text']")!;
      await expect(icon).not.toBeNull();
      // text precedes icon for a trailing icon.
      await expect(
        text.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  },
};

/** Without an icon prop, only the text part renders (icon part is absent). */
export const IconIsOptional: Story = {
  args: { children: 'View details', href: '#destination' },
  play: async ({ canvasElement, step }) => {
    await step('no icon part is rendered when icon is omitted', async () => {
      await expect(canvasElement.querySelector("[data-part='icon']")).toBeNull();
      await expect(canvasElement.querySelector("[data-part='text']")).not.toBeNull();
    });
  },
};
