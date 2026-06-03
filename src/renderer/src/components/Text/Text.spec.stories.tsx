import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Text } from './Text';

/**
 * Interaction / accessibility tests for the Text typographic primitive.
 *
 * Kept separate from the visual stories (`Text.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior, use `step()` for readable runner output, and
 * `await` real `expect(...)` (Storybook matchers are async).
 *
 * Text is presentational (no focus / keyboard / open / selection state), so per
 * the Component Library Tier A-display contract these tests assert the rendered
 * element / semantics / token resolution — there is no keyboard path to drive.
 * The `a11y.test: 'error'` preview gate runs axe on every story automatically.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof Text> = {
  title: 'Components/Display/Text/Tests',
  component: Text,
  args: { children: 'Sample text' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Text>;

/** Default render: a `<span>` carrying the data-part contract and body-200 tokens. */
export const DefaultRendersSpan: Story = {
  args: { children: 'Default body text' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders a <span> by default (Helios default tag)', async () => {
      const el = canvas.getByText('Default body text');
      await expect(el.tagName).toBe('SPAN');
      await expect(el).toHaveAttribute('data-part', 'text');
      await expect(el).toHaveAttribute('data-variant', 'body');
      await expect(el).toHaveAttribute('data-size', '200');
    });

    await step('body-200 font-size token resolves to a non-zero size', async () => {
      const el = canvas.getByText<HTMLElement>('Default body text');
      const cs = getComputedStyle(el);
      // Regression guard: the variant base local feeds font-size; 14px @ default
      // body-200. Assert it resolved to a real value rather than 0 / unset.
      await expect(parseFloat(cs.fontSize)).toBeGreaterThan(0);
      await expect(cs.fontWeight).toBe('400');
    });
  },
};

/** The `as` prop is polymorphic: it changes the rendered element, not the style contract. */
export const PolymorphicAsProp: Story = {
  args: { as: 'h1', variant: 'display', size: '500', weight: 'bold', children: 'Page title' },
  play: async ({ canvasElement, step }) => {
    await step('renders the requested element with the heading role', async () => {
      const canvas = within(canvasElement);
      // Queried by role — proves the polymorphic tag yields real heading semantics
      // (the Helios a11y guidance: pick the semantically correct tag).
      const heading = canvas.getByRole('heading', { level: 1, name: 'Page title' });
      await expect(heading.tagName).toBe('H1');
      await expect(heading).toHaveAttribute('data-variant', 'display');
    });

    await step('display-500 resolves a larger font-size than body default', async () => {
      const el = within(canvasElement).getByText<HTMLElement>('Page title');
      const cs = getComputedStyle(el);
      // 30px @ display-500 (vs 14px body-200) and bold (700). Compare in px so a
      // unit/root mismatch cannot hide a regression.
      await expect(parseFloat(cs.fontSize)).toBeGreaterThan(20);
      await expect(cs.fontWeight).toBe('700');
      await expect(cs.fontFamily.length).toBeGreaterThan(0);
    });
  },
};

/** Size is scoped per variant: display steps resolve distinct, increasing sizes. */
export const SizeScalePerVariant: Story = {
  render: () => (
    <div>
      <Text as="p" variant="display" size="100" data-testid="d100">
        Display 100
      </Text>
      <Text as="p" variant="display" size="500" data-testid="d500">
        Display 500
      </Text>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('display-500 is strictly larger than display-100', async () => {
      const small = canvasElement.querySelector<HTMLElement>('[data-testid="d100"]')!;
      const large = canvasElement.querySelector<HTMLElement>('[data-testid="d500"]')!;
      const smallPx = parseFloat(getComputedStyle(small).fontSize);
      const largePx = parseFloat(getComputedStyle(large).fontSize);
      // Regression guard: the per-(variant,size) rule must override the variant
      // base local. If the size selector were dead, both would equal the base.
      await expect(smallPx).toBeGreaterThan(0);
      await expect(largePx).toBeGreaterThan(smallPx);
    });
  },
};

/** The color prop resolves a semantic foreground token (not the inherited color). */
export const SemanticColorToken: Story = {
  args: { color: 'critical', children: 'Critical text' },
  play: async ({ canvasElement, step }) => {
    await step('--text-color resolves the critical foreground token', async () => {
      const el = within(canvasElement).getByText<HTMLElement>('Critical text');
      const cs = getComputedStyle(el);
      // Regression guard: the data-color rule sets --text-color, which the base
      // `color` consumes. Assert the custom property resolved to a real color and
      // the computed color is not transparent / unset.
      await expect(cs.getPropertyValue('--text-color').trim().length).toBeGreaterThan(0);
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Logical alignment applies via the data-align selector. */
export const LogicalAlignment: Story = {
  args: { as: 'p', align: 'center', children: 'Centered text' },
  play: async ({ canvasElement, step }) => {
    await step('center alignment resolves text-align: center', async () => {
      const el = within(canvasElement).getByText<HTMLElement>('Centered text');
      await expect(el).toHaveAttribute('data-align', 'center');
      await expect(getComputedStyle(el).textAlign).toBe('center');
    });
  },
};

/** Structured content keeps its semantic child markup under the typographic style. */
export const StructuredContentSemantics: Story = {
  args: {
    as: 'p',
    children: (
      <>
        Text with <strong>strong</strong> emphasis
      </>
    ),
  },
  play: async ({ canvasElement, step }) => {
    await step('nested strong element is preserved inside the styled paragraph', async () => {
      const canvas = within(canvasElement);
      const strong = canvas.getByText('strong');
      await expect(strong.tagName).toBe('STRONG');
      await expect(strong.closest("[data-part='text']")).not.toBeNull();
    });
  },
};
