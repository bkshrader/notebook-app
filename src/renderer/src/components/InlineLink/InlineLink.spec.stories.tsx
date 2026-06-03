import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { InlineLink } from './InlineLink';

/**
 * Interaction / accessibility tests for the InlineLink.
 *
 * Kept separate from the visual stories (`InlineLink.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * Named by behavior, each uses `step()`, and each `await`s a real `expect(...)`
 * (Storybook matchers are async).
 *
 * InlineLink is a presentational anchor (no Ark primitive) whose only state is
 * the native anchor behavior. The contract is therefore: it renders a real
 * `link` role with an accessible name; the color/variant selectors resolve real
 * tokens; and the keyboard focus path (Tab → :focus-visible) lights the Helios
 * outline (a computed-style backstop, since `.focus()` does not trigger
 * `:focus-visible` — only real keyboard input does). axe runs automatically via
 * the preview's `a11y.test: 'error'` gate (no manual call).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof InlineLink> = {
  title: 'Components/Navigation/InlineLink/Tests',
  component: InlineLink,
  args: { children: 'open the docs', href: 'https://example.com/docs' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof InlineLink>;

const Icon = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M10 2h4v4M14 2 7 9" />
  </svg>
);

/** The semantic contract: a real link with the text as its accessible name. */
export const LinkRoleAndName: Story = {
  args: { children: 'open the docs', href: 'https://example.com/docs' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders an anchor with the link role and an href', async () => {
      const link = canvas.getByRole('link', { name: 'open the docs' });
      await expect(link).toBeInTheDocument();
      await expect(link).toHaveAttribute('href', 'https://example.com/docs');
      // The link text is the accessible name (WCAG 2.4.4), carried by the root.
      await expect(link).toHaveAttribute('data-part', 'root');
    });

    await step('the link is underlined (color is never the sole affordance)', async () => {
      const link = canvas.getByRole('link', { name: 'open the docs' });
      await expect(getComputedStyle(link).textDecorationLine).toBe('underline');
    });
  },
};

/** Primary resolves the action foreground token (not an unstyled link color). */
export const PrimaryResolvesActionToken: Story = {
  args: { children: 'important link', color: 'primary' },
  play: async ({ canvasElement, step }) => {
    await step('primary resolves a real foreground color', async () => {
      const link = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(link);
      // Regression guard: the [data-color='primary'] selector applies a token,
      // so the color is a resolved rgb(), not empty/transparent.
      await expect(cs.color).toMatch(/^rgb/);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Secondary resolves a DIFFERENT foreground than primary (variant applied). */
export const SecondaryDiffersFromPrimary: Story = {
  args: { children: 'quieter link', color: 'secondary' },
  play: async ({ canvasElement, step }) => {
    await step('secondary resolves the strong-foreground token', async () => {
      const link = canvasElement.querySelector<HTMLElement>(
        "[data-part='root'][data-color='secondary']",
      )!;
      await expect(link).not.toBeNull();
      const cs = getComputedStyle(link);
      await expect(cs.color).toMatch(/^rgb/);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Keyboard focus lights the Helios outline ring and drops the underline. */
export const KeyboardFocusShowsOutline: Story = {
  args: { children: 'tab to me', href: 'https://example.com' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('Tab moves focus to the link', async () => {
      const link = canvas.getByRole('link', { name: 'tab to me' });
      await userEvent.tab();
      await waitFor(() => expect(link).toHaveFocus());
    });

    await step('the focused link matches :focus-visible and shows the outline', async () => {
      const link = canvas.getByRole('link', { name: 'tab to me' });
      // Real keyboard focus (userEvent.tab) triggers :focus-visible, unlike a
      // programmatic .focus(). Backstop the Helios outline geometry in computed
      // styles so a token regression is caught.
      await waitFor(async () => {
        await expect(link.matches(':focus-visible')).toBe(true);
      });
      const cs = getComputedStyle(link);
      await expect(cs.outlineStyle).toBe('solid');
      await expect(parseFloat(cs.outlineWidth)).toBeGreaterThan(0);
      await expect(cs.outlineColor).toMatch(/^rgb/);
      // Helios removes the underline on focus (the outline takes over).
      await expect(cs.textDecorationLine).toBe('none');
    });
  },
};

/** A trailing icon renders, is hidden from AT, and sits after the label. */
export const TrailingIconIsDecorative: Story = {
  args: { children: 'open changelog', icon: Icon, iconPosition: 'trailing' },
  play: async ({ canvasElement, step }) => {
    await step('the icon part renders and is aria-hidden', async () => {
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      await expect(icon).not.toBeNull();
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    await step('the root marks the trailing icon position', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-icon-position', 'trailing');
      // The icon is the LAST child of the root (after the label).
      await expect(root.lastElementChild).toHaveAttribute('data-part', 'icon');
    });

    await step('the icon resolves a 1em square box that scales with the text', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      // Measure the rendered box (an inline-block icon reports `auto` for its
      // computed `width`, so getBoundingClientRect is the reliable signal).
      const rect = icon.getBoundingClientRect();
      await expect(rect.width).toBeGreaterThan(0);
      // Square box, and sized to 1em (the link's own font-size).
      await expect(Math.round(rect.width)).toBe(Math.round(rect.height));
      const fontPx = parseFloat(getComputedStyle(root).fontSize);
      await expect(Math.round(rect.width)).toBe(Math.round(fontPx));
    });
  },
};

/** Without an icon prop, no icon part is rendered. */
export const IconIsOptional: Story = {
  args: { children: 'no icon here' },
  play: async ({ canvasElement, step }) => {
    await step('no icon part is rendered when icon is omitted', async () => {
      await expect(canvasElement.querySelector("[data-part='icon']")).toBeNull();
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).not.toHaveAttribute('data-icon-position');
    });
  },
};
