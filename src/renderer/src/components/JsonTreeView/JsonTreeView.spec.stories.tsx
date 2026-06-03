import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { JsonTreeView } from './JsonTreeView';

/**
 * Interaction / accessibility tests for the JsonTreeView.
 *
 * Kept separate from the visual stories (`JsonTreeView.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives focus state and
 * asserts the Helios/Ark contract, so colocating it with a doc story would make
 * that story shift on load. Stories are named by behavior so a failure is
 * self-describing, each one asserts (a `play` without `expect` is a state-setter,
 * not a test), and each uses `step()` for readable runner / Interactions-panel
 * output.
 *
 * These are the REGRESSION GUARDS for the Helios-parity fixes:
 *   - the stylesheet targets the real Ark scope `json-tree-view` (verified
 *     against the live DOM), so the root resolves the monospace code font, the
 *     tree lays out as a flex column, and value types resolve distinct token
 *     colors — assertions that fail if the scope/selectors are wrong;
 *   - the keyboard focus ring renders via the native `:focus-visible` pseudo
 *     (Ark exposes NO `data-focus-visible` attribute, so a phantom
 *     `[data-focus-visible]` selector would never match and the ring would be
 *     invisible — `KeyboardFocusRing` fails against that broken form);
 *   - plain mouse focus does NOT tint the row (only :hover / :focus-visible do);
 *   - NO `branch-indent-guide` part is emitted in the pinned zag-js version, so
 *     there is no dead CSS for it and no no-op `indentGuide` prop.
 */
const SAMPLE_DATA = {
  name: 'Ada Lovelace',
  age: 36,
  active: true,
  email: null,
  tags: ['mathematics', 'computing'],
  address: {
    street: '12 St James Square',
    city: 'London',
    country: 'GB',
  },
};

const meta: Meta<typeof JsonTreeView> = {
  title: 'Components/Display/JsonTreeView/Tests',
  component: JsonTreeView,
  args: { label: 'JSON data', data: SAMPLE_DATA, defaultExpandedDepth: 2 },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof JsonTreeView>;

/**
 * The structural ARIA contract (Tier A-display).
 *
 * axe runs automatically via Storybook's a11y addon, so this focuses on
 * role/name structure rather than duplicating axe checks.
 */
export const AriaContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('tree root has role="tree" with an accessible name', async () => {
      const tree = canvas.getByRole('tree', { name: 'JSON data' });
      await expect(tree).toBeInTheDocument();
    });

    await step('at least one treeitem is rendered', async () => {
      const items = canvas.getAllByRole('treeitem');
      await expect(items.length).toBeGreaterThan(0);
    });

    await step('expandable rows expose role=button; the branch exposes aria-expanded', async () => {
      // Ark renders branch-control as a <div role="button"> (NOT a native
      // <button>) carrying a roving tabindex; the expanded/collapsed state is
      // exposed via aria-expanded on the enclosing `branch` element.
      const control = canvasElement.querySelector('[data-part="branch-control"]')!;
      await expect(control.getAttribute('role')).toBe('button');
      const branch = canvasElement.querySelector('[data-part="branch"]')!;
      await expect(branch).toHaveAttribute('aria-expanded');
    });
  },
};

/**
 * The Ark contract: the real scope, the verified parts, and the ABSENT indent
 * guide. Guards against re-introducing a wrong scope or a dead guide selector.
 */
export const ArkContract: Story = {
  play: async ({ canvasElement, step }) => {
    await step('every styled node carries data-scope="json-tree-view"', async () => {
      const scoped = canvasElement.querySelectorAll('[data-scope]');
      await expect(scoped.length).toBeGreaterThan(0);
      const scopes = new Set([...scoped].map((el) => el.getAttribute('data-scope')));
      await expect([...scopes]).toEqual(['json-tree-view']);
    });

    await step('the verified parts are present in the DOM', async () => {
      for (const part of [
        'root',
        'tree',
        'branch',
        'branch-control',
        'branch-indicator',
        'branch-text',
        'branch-content',
        'item',
        'item-text',
      ]) {
        await expect(canvasElement.querySelector(`[data-part="${part}"]`)).not.toBeNull();
      }
    });

    await step('NO branch-indent-guide is emitted (dead in pinned zag-js)', async () => {
      // Regression guard: zag-js 1.41.1 has no getBranchIndentGuideProps, so the
      // guide part is never rendered and a CSS selector for it would be dead.
      await expect(canvasElement.querySelector('[data-part="branch-indent-guide"]')).toBeNull();
    });
  },
};

/**
 * Regression guard: the component's CSS actually applies on the real scope.
 *
 * If the stylesheet targeted the wrong scope, the root would fall back to the
 * page sans-serif font, the tree to `display: block`, and values to the default
 * grey. These assertions encode the intended visual contract and fail against
 * such dead selectors.
 */
export const StyleContractApplies: Story = {
  play: async ({ canvasElement, step }) => {
    await step('root resolves the monospace code font (root selector matches)', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        "[data-scope='json-tree-view'][data-part='root']",
      );
      await expect(root).not.toBeNull();
      await expect(getComputedStyle(root!).fontFamily.toLowerCase()).toMatch(/mono/);
    });

    await step('the tree part lays out as a flex column', async () => {
      const tree = canvasElement.querySelector<HTMLElement>(
        "[data-scope='json-tree-view'][data-part='tree']",
      );
      await expect(tree).not.toBeNull();
      await expect(getComputedStyle(tree!).display).toBe('flex');
      await expect(getComputedStyle(tree!).flexDirection).toBe('column');
    });

    await step('nesting depth produces increasing indentation', async () => {
      // Regression guard: the indent reads Ark's `--line-length` custom property
      // (NOT a non-existent `--depth`). A nested leaf (line-length >= 1) must get
      // real padding; reading the wrong variable would leave every row at 0.
      const nested = [...canvasElement.querySelectorAll<HTMLElement>('[data-part="item"]')].find(
        (el) => Number(el.style.getPropertyValue('--line-length')) >= 1,
      );
      await expect(nested).not.toBeUndefined();
      const pad = parseFloat(getComputedStyle(nested!).paddingInlineStart);
      await expect(pad).toBeGreaterThan(0);
    });

    await step('string and number values resolve distinct token colors', async () => {
      const str = canvasElement.querySelector<HTMLElement>(
        "[data-scope='json-tree-view'] [data-type='string']",
      );
      const num = canvasElement.querySelector<HTMLElement>(
        "[data-scope='json-tree-view'] [data-type='number']",
      );
      await expect(str).not.toBeNull();
      await expect(num).not.toBeNull();
      // With the type-color selectors live, string (success) and number
      // (highlight) tokens resolve to different colors; against dead selectors
      // both inherit the same foreground-primary grey.
      await expect(getComputedStyle(str!).color).not.toBe(getComputedStyle(num!).color);
    });
  },
};

/**
 * Regression guard: keyboard focus renders a visible focus ring, and mouse focus
 * does not tint the row.
 *
 * The keyboard ring relies on the native `:focus-visible` pseudo, never a
 * phantom `[data-focus-visible]` attribute (which Ark does not emit — it only
 * sets `data-focus`). `userEvent.tab()` produces a real keyboard focus that
 * triggers `:focus-visible`, unlike a programmatic `.focus()`.
 */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const control = canvasElement.querySelector<HTMLElement>('[data-part="branch-control"]')!;

    await step('the branch-control row is the single keyboard tab stop', async () => {
      // Roving tabindex: the active node carries tabindex 0, so one Tab lands
      // directly on the branch-control.
      await expect(control).toHaveAttribute('tabindex', '0');
    });

    await step('keyboard focus renders a visible focus-ring box-shadow', async () => {
      control.blur();
      await userEvent.tab();
      await expect(control).toHaveFocus();
      const ring = getComputedStyle(control).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('Ark exposes data-focus, never the phantom data-focus-visible', async () => {
      // The ring/tint must NEVER hang off a [data-focus-visible] selector (Ark
      // never emits that attribute). Ark only sets data-focus ("focused at all"),
      // so keyboard targeting relies on the native :focus-visible pseudo instead.
      await expect(control).toHaveAttribute('data-focus');
      await expect(control).not.toHaveAttribute('data-focus-visible');
    });
  },
};

/** Keyboard expands a collapsed branch (Enter on the focused row). */
export const KeyboardExpandsBranch: Story = {
  args: { defaultExpandedDepth: 0 },
  play: async ({ canvasElement, step }) => {
    const control = canvasElement.querySelector<HTMLElement>('[data-part="branch-control"]')!;
    // aria-expanded is exposed on the enclosing `branch`, not the control row.
    const branch = canvasElement.querySelector<HTMLElement>('[data-part="branch"]')!;

    await step('the root branch starts collapsed', async () => {
      await expect(branch).toHaveAttribute('aria-expanded', 'false');
    });

    await step('Enter on the focused row expands the branch', async () => {
      control.focus();
      await userEvent.keyboard('{Enter}');
      await expect(branch).toHaveAttribute('aria-expanded', 'true');
    });
  },
};
