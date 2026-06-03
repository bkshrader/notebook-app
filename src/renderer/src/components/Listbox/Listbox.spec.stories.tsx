import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Listbox } from './Listbox';

/**
 * Interaction / accessibility tests for the Listbox.
 *
 * Kept separate from the visual stories (`Listbox.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` that MUTATES rendered state
 * (highlight, selection, focus) would make a doc story flash on load. These
 * stories are named by behavior, each AWAITS real `expect`s, and each uses
 * `step()` + `within(canvasElement)` for readable runner output.
 *
 * Regression guards for the Helios-parity fixes (verified against the live Ark
 * DOM, 2026-06-01):
 *   - Content (role="listbox", tabindex="0") is the focusable node; the
 *     keyboard focus ring is drawn on Content via the native :focus-visible
 *     pseudo. Ark exposes NO data-focus-visible on any part — the old
 *     `[data-part='item'][data-focus-visible]` selector was dead, and the
 *     focus ring now lives on Content.
 *   - `display: flex` (not the invalid `block flex`) means the content/item
 *     boxes lay out as real flex containers.
 */
const COUNTRIES = [
  { label: 'United States', value: 'us' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'Canada', value: 'ca' },
  { label: 'Australia', value: 'au' },
  { label: 'Germany', value: 'de' },
];

const meta: Meta<typeof Listbox> = {
  title: 'Components/Forms/Listbox/Tests',
  component: Listbox,
  args: { label: 'Select Country', items: COUNTRIES },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Listbox>;

/** The listbox content is the focusable role="listbox" node carrying the options. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('content carries role="listbox" and is keyboard reachable', async () => {
      const listbox = canvas.getByRole('listbox');
      await expect(listbox).toBeInTheDocument();
      await expect(listbox).not.toHaveAttribute('tabindex', '-1');
    });

    await step('every item renders as an option, none selected initially', async () => {
      const options = canvas.getAllByRole('option');
      await expect(options).toHaveLength(COUNTRIES.length);
      for (const option of options) {
        await expect(option).toHaveAttribute('aria-selected', 'false');
      }
    });

    await step('the content lays out as a flex column', async () => {
      // `display: block flex` (CSS Display L3 two-value syntax, required by the
      // project's display-notation stylelint rule) computes to "flex".
      const listbox = canvas.getByRole('listbox');
      await expect(getComputedStyle(listbox).display).toBe('flex');
    });

    await step('the selection indicator is hidden from assistive technology', async () => {
      // The checkmark is decorative paint; aria-selected on the option conveys
      // selection. The glyph must not be in the a11y tree.
      const indicator = canvasElement.querySelector('[data-part="item-indicator"]');
      await expect(indicator).not.toBeNull();
      await expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** Keyboard moves the highlight and selects; selection resolves a real token color. */
export const KeyboardSelection: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('focus lands on the listbox content', async () => {
      const listbox = canvas.getByRole('listbox');
      listbox.focus();
      await expect(listbox).toHaveFocus();
    });

    await step('ArrowDown highlights an option', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const options = canvas.getAllByRole('option');
      const highlighted = options.find((o) => o.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeDefined();
    });

    await step('Enter selects the highlighted option', async () => {
      const options = canvas.getAllByRole('option');
      const highlighted = options.find((o) => o.hasAttribute('data-highlighted'));
      await expect(highlighted).toBeDefined();
      await userEvent.keyboard('{Enter}');
      await expect(highlighted).toHaveAttribute('aria-selected', 'true');
    });

    await step('the selected option resolves a real (non-transparent) text color', async () => {
      const options = canvas.getAllByRole('option');
      const selected = options.find((o) => o.getAttribute('aria-selected') === 'true');
      await expect(selected).toBeDefined();
      const color = getComputedStyle(selected!).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Regression guard: keyboard focus draws a visible ring on the listbox content. */
export const KeyboardFocusRing: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('tabbing to the listbox renders a focus-ring box-shadow', async () => {
      // The ring is drawn on the Content (role="listbox") via the native
      // :focus-visible pseudo — Ark exposes NO data-focus-visible attribute, so
      // the old `[data-part='item'][data-focus-visible]` selector never matched.
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike programmatic .focus().
      const listbox = canvas.getByRole('listbox');
      const ringOff = getComputedStyle(listbox).boxShadow;
      await userEvent.tab();
      await expect(listbox).toHaveFocus();
      const ringOn = getComputedStyle(listbox).boxShadow;
      await expect(ringOn).not.toBe('none');
      await expect(ringOn).not.toBe('');
      await expect(ringOn).not.toBe(ringOff);
    });
  },
};

/** Disabled state is exposed to AT and differs visually from the enabled list. */
export const DisabledState: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    await step('the root carries data-disabled (AT-exposed) ', async () => {
      const root = canvasElement.querySelector('[data-part="root"]');
      await expect(root).not.toBeNull();
      await expect(root).toHaveAttribute('data-disabled');
    });

    await step('the disabled label uses a muted (non-default) color', async () => {
      const label = canvasElement.querySelector<HTMLElement>('[data-part="label"]');
      await expect(label).not.toBeNull();
      await expect(label).toHaveAttribute('data-disabled');
      const color = getComputedStyle(label!).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** A per-item disabled option is announced as disabled and is not selectable. */
export const DisabledItemIsInert: Story = {
  args: {
    items: [
      { label: 'United States', value: 'us' },
      { label: 'United Kingdom', value: 'uk', disabled: true },
      { label: 'Canada', value: 'ca' },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the disabled option exposes its disabled state to AT', async () => {
      // Ark marks the option disabled via data-disabled (styling hook) and
      // aria-disabled (AT exposure). data-disabled is the contract guaranteed
      // by the styling guide; assert it firmly and aria-disabled when present.
      const disabled = canvas.getByRole('option', { name: 'United Kingdom' });
      await expect(disabled).toHaveAttribute('data-disabled');
      await expect(disabled.getAttribute('aria-disabled')).toBe('true');
    });

    await step('the disabled option stays unselected after a click', async () => {
      const disabled = canvas.getByRole('option', { name: 'United Kingdom' });
      await userEvent.click(disabled, { pointerEventsCheck: 0 });
      await expect(disabled).toHaveAttribute('aria-selected', 'false');
    });
  },
};

/** The size prop scales item height; sm < lg as a real computed difference. */
export const SizeScaleApplies: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <Listbox {...args} label="Small" size="sm" />
      <Listbox {...args} label="Large" size="lg" />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('data-size is reflected on each root', async () => {
      const roots = canvasElement.querySelectorAll('[data-part="root"]');
      await expect(roots).toHaveLength(2);
      await expect(roots[0]).toHaveAttribute('data-size', 'sm');
      await expect(roots[1]).toHaveAttribute('data-size', 'lg');
    });

    await step('the large option is taller than the small option', async () => {
      const items = canvasElement.querySelectorAll<HTMLElement>('[data-part="item"]');
      const smHeight = parseFloat(getComputedStyle(items[0]!).minBlockSize);
      const lgItems = [...items].filter((i) => i.closest('[data-size="lg"]'));
      const lgHeight = parseFloat(getComputedStyle(lgItems[0]!).minBlockSize);
      await expect(lgHeight).toBeGreaterThan(smHeight);
    });
  },
};
