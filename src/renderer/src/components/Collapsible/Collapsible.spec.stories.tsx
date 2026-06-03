import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Collapsible } from './Collapsible';

/**
 * Interaction / accessibility tests for the Collapsible.
 *
 * Kept separate from the visual stories (`Collapsible.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state, so colocating it with a doc
 * story would make that story animate/flash on load. These stories are named by
 * behavior so a failure is self-describing, each asserts (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 */
const meta: Meta<typeof Collapsible> = {
  title: 'Components/Disclosure/Collapsible/Tests',
  component: Collapsible,
  args: {
    label: 'What is Ark UI?',
    children:
      'Ark UI is a headless component library for building accessible, high-quality UI components.',
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Collapsible>;

/** The trigger button, by accessible name — used across the open/close tests. */
function getTrigger(canvasElement: HTMLElement) {
  return within(canvasElement).getByRole('button', { name: /what is ark ui/i });
}

/**
 * Drives the primary keyboard interaction and guards the keyboard focus ring.
 *
 * Ark's Collapsible.Trigger renders as a native `<button>`, keyboard-reachable
 * via Tab and operable via Space/Enter. State is conveyed by
 * `data-state="open|closed"` on the Trigger and Content. The axe pass runs
 * automatically via the preview's `a11y.test: 'error'` config.
 */
export const KeyboardToggle: Story = {
  play: async ({ canvasElement, step }) => {
    const trigger = getTrigger(canvasElement);
    const content = canvasElement.querySelector<HTMLElement>(
      '[data-scope="collapsible"][data-part="content"]',
    );

    await step('starts closed', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      await expect(content).toHaveAttribute('data-state', 'closed');
    });

    await step('trigger is in the tab order (keyboard-reachable)', async () => {
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: Ark exposes NO data-focus-visible on the trigger, so
      // the ring is drawn via the native :focus-visible pseudo. userEvent.tab()
      // produces a real keyboard focus that triggers :focus-visible, unlike a
      // programmatic .focus(). This FAILS against the old [data-focus-visible]
      // selector (which never matched) and PASSES after the :focus-visible fix.
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('Enter opens the collapsible', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('data-state', 'open');
      await expect(content).toHaveAttribute('data-state', 'open');
    });

    await step('open styling resolves to a real token value', async () => {
      // Backstop: the trigger background resolves to a real, non-transparent
      // color when open (guards against misspelled tokens).
      const bg = getComputedStyle(trigger).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('Space closes the collapsible', async () => {
      await userEvent.keyboard(' ');
      await expect(trigger).toHaveAttribute('data-state', 'closed');
      await expect(content).toHaveAttribute('data-state', 'closed');
    });
  },
};

/**
 * The indicator chevron rotates only when open (transform toggled by
 * `data-state`). Guards the data-state-driven transform fix.
 */
export const IndicatorRotates: Story = {
  play: async ({ canvasElement, step }) => {
    const trigger = getTrigger(canvasElement);
    const indicator = canvasElement.querySelector<HTMLElement>(
      '[data-scope="collapsible"][data-part="indicator"]',
    );

    await step('closed indicator is not rotated', async () => {
      await expect(indicator).not.toBeNull();
      const closed = getComputedStyle(indicator!).transform;
      // matrix(1, 0, 0, 1, 0, 0) or 'none' — no rotation applied.
      await expect(closed === 'none' || closed === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    });

    await step('open indicator settles to a rotation transform', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await expect(indicator).toHaveAttribute('data-state', 'open');
      // The transform animates in (rotate transition), so poll until it settles
      // to a non-identity matrix rather than reading mid-animation.
      await waitFor(async () => {
        const open = getComputedStyle(indicator!).transform;
        await expect(open).not.toBe('none');
        await expect(open).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
      });
    });
  },
};

/**
 * A disabled collapsible must not be operable by keyboard. Ark sets
 * `data-disabled` on the trigger but does NOT set the native `disabled`
 * attribute — the button remains enabled from the browser's perspective. We
 * assert `data-disabled` presence, that the disabled styling differs from the
 * enabled trigger, and that activation does not change state.
 */
export const DisabledNotOperable: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, step }) => {
    const trigger = getTrigger(canvasElement);

    await step('disabled state is exposed via data-disabled', async () => {
      // Ark expresses disabled via data-disabled, not the native disabled attr.
      await expect(trigger).toHaveAttribute('data-disabled');
      await expect(trigger).toHaveAttribute('data-state', 'closed');
    });

    await step('disabled styling differs from the enabled trigger', async () => {
      // Regression guard for the [data-disabled] selector: the disabled bg must
      // resolve to a real, non-transparent token (surface-interactive-disabled).
      const cs = getComputedStyle(trigger);
      await expect(cs.cursor).toBe('not-allowed');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('disabled trigger cannot be activated', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await expect(trigger).toHaveAttribute('data-state', 'closed');
    });
  },
};

/** The card variant draws a real border; the ghost variant does not. */
export const VariantBorder: Story = {
  render: (args) => (
    <div>
      <Collapsible {...args} variant="card" label="Card variant">
        Card content.
      </Collapsible>
      <Collapsible {...args} variant="ghost" label="Ghost variant">
        Ghost content.
      </Collapsible>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    await step('card root has a visible border, ghost does not', async () => {
      const roots = canvasElement.querySelectorAll<HTMLElement>(
        '[data-scope="collapsible"][data-part="root"]',
      );
      await expect(roots.length).toBe(2);
      const card = [...roots].find((r) => r.getAttribute('data-variant') === 'card')!;
      const ghost = [...roots].find((r) => r.getAttribute('data-variant') === 'ghost')!;
      await expect(getComputedStyle(card).borderTopWidth).not.toBe('0px');
      await expect(getComputedStyle(ghost).borderTopWidth).toBe('0px');
    });
  },
};

/** The size prop drives the per-size local custom properties on the Root. */
export const SizeScale: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    await step('size is forwarded to the Root as data-size', async () => {
      const root = canvasElement.querySelector<HTMLElement>(
        '[data-scope="collapsible"][data-part="root"]',
      );
      await expect(root).toHaveAttribute('data-size', 'large');
    });
  },
};
