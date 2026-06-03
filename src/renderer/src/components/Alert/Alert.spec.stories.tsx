import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Alert } from './Alert';

/**
 * Interaction / accessibility tests for the Alert.
 *
 * Kept separate from the visual stories (`Alert.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior so a failure is self-describing, each uses `step()`
 * for readable runner output, and each `await`s real `expect(...)` (Storybook
 * matchers are async).
 *
 * Alert is presentational (no Ark primitive, no focus/keyboard/open state), so
 * this is a Tier A-display suite: it asserts the ARIA live-region contract, the
 * Helios structural anatomy, compact-title hiding, and that the per-tone /
 * per-type design tokens actually resolve (the regression guard that catches a
 * borrowed/typo'd token rendering as transparent or unbordered).
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof Alert> = {
  title: 'Components/Feedback/Alert/Tests',
  component: Alert,
  args: { title: 'Heads up', description: 'A message.' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Alert>;

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

/** The default ARIA + structural contract: assertive live region with the Helios parts. */
export const LiveRegionAndStructure: Story = {
  args: { description: 'Saved locally.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root is an assertive live region by default (role=alert)', async () => {
      const root = await canvas.findByRole('alert');
      await expect(root).toHaveAttribute('data-scope', 'alert');
      await expect(root).toHaveAttribute('data-part', 'root');
      await expect(root).toHaveAttribute('data-type', 'inline');
      await expect(root).toHaveAttribute('data-color', 'neutral');
    });

    await step('the message text renders under the description part', async () => {
      const desc = canvas.getByText('Saved locally.');
      await expect(desc.closest("[data-part='description']")).not.toBeNull();
    });

    await step('title renders under the title part', async () => {
      const title = canvas.getByText('Heads up');
      await expect(title.closest("[data-part='title']")).not.toBeNull();
    });
  },
};

/** `role="status"` opts into a polite live region (e.g. success confirmations). */
export const PoliteStatusRole: Story = {
  args: { role: 'status', color: 'success', description: 'Done.' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    await step('root exposes role=status when requested', async () => {
      const root = await canvas.findByRole('status');
      await expect(root).toHaveAttribute('data-color', 'success');
    });
  },
};

/** The icon is decorative: rendered, but aria-hidden so it is not announced. */
export const IconIsDecorative: Story = {
  args: {
    icon: <svg data-testid="glyph" viewBox="0 0 16 16" />,
    description: 'With an icon.',
  },
  play: async ({ canvasElement, step }) => {
    await step('icon part is present and aria-hidden', async () => {
      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']");
      await expect(icon).not.toBeNull();
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** Compact alerts omit the title from the DOM (Helios) and still show the description. */
export const CompactOmitsTitle: Story = {
  args: {
    type: 'compact',
    icon: <svg viewBox="0 0 16 16" />,
    title: 'Hidden heading',
    description: 'Only the description shows.',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('compact type is applied', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      await expect(root).toHaveAttribute('data-type', 'compact');
    });

    await step('title is omitted from the DOM, description remains', async () => {
      // Regression guard: compact must drop the title entirely (kept out of the
      // a11y tree rather than display:none'd). The description still renders.
      await expect(canvasElement.querySelector("[data-part='title']")).toBeNull();
      await expect(canvas.getByText('Only the description shows.')).toBeTruthy();
    });
  },
};

/** The critical inline tone resolves a real surface AND a real border (tokens applied). */
export const CriticalInlineTokensResolve: Story = {
  args: {
    type: 'inline',
    color: 'critical',
    icon: <svg viewBox="0 0 16 16" />,
    title: 'Sync failed',
    description: 'Could not reach the folder.',
  },
  play: async ({ canvasElement, step }) => {
    await step('inline critical resolves surface, border, and icon foreground', async () => {
      // Regression guard: a borrowed/typo'd token would compute to transparent
      // or a 0px border, leaving the alert visually toneless. Assert each
      // styled property resolves to a non-transparent, non-zero value.
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(cs.backgroundColor).not.toBe(TRANSPARENT);
      await expect(parseFloat(cs.borderTopWidth)).toBeGreaterThan(0);
      await expect(cs.borderTopStyle).toBe('solid');
      await expect(cs.borderTopColor).not.toBe(TRANSPARENT);

      const icon = canvasElement.querySelector<HTMLElement>("[data-part='icon']")!;
      await expect(getComputedStyle(icon).color).not.toBe(TRANSPARENT);
    });
  },
};

/** The page type draws a bottom divider (no surrounding border, no radius) and pads wider. */
export const PageTypeDividerAndPadding: Story = {
  args: {
    type: 'page',
    color: 'highlight',
    icon: <svg viewBox="0 0 16 16" />,
    title: 'Update available',
    description: 'Restart to apply.',
  },
  play: async ({ canvasElement, step }) => {
    await step('page resolves a bottom divider, no top border, and a surface', async () => {
      // Regression guard: the page divider is a real bottom border (token-clean),
      // the top/side borders stay absent, and there is no card radius.
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(root).toHaveAttribute('data-type', 'page');
      await expect(parseFloat(cs.borderBottomWidth)).toBeGreaterThan(0);
      await expect(cs.borderBottomColor).not.toBe(TRANSPARENT);
      await expect(parseFloat(cs.borderTopWidth)).toBe(0);
      await expect(parseFloat(cs.borderTopLeftRadius)).toBe(0);
      await expect(cs.backgroundColor).not.toBe(TRANSPARENT);
    });

    await step('page pads wider on the inline axis than the block axis', async () => {
      const root = canvasElement.querySelector<HTMLElement>("[data-part='root']")!;
      const cs = getComputedStyle(root);
      await expect(parseFloat(cs.paddingLeft)).toBeGreaterThan(parseFloat(cs.paddingTop));
    });
  },
};
