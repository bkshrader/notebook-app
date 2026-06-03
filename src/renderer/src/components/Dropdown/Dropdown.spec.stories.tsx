import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Dropdown, DropdownParts } from './Dropdown';
import { assertOverlayKeyboardCycle } from '../test-helpers';

/**
 * Interaction / accessibility / regression tests for the Dropdown.
 *
 * Kept separate from the visual stories (`Dropdown.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state, so colocating it with a doc story would make that story
 * animate/flash on load. Stories are named by behavior so a failure is
 * self-describing; each `play` AWAITS real `expect` assertions (storybook/test
 * matchers are async — eslint would fail on an un-awaited one) and uses `step()`
 * for readable runner output.
 *
 * The Dropdown is a Tier-B overlay built on Ark `menu`: Content renders in an
 * Ark Portal OUTSIDE the story canvas, so the List is queried via `screen`
 * (document.body scope), not `within(canvasElement)`.
 *
 * Regression guards encode the Ark selector-contract assumptions in Dropdown.css:
 *  - the toggle focus ring is drawn via the NATIVE `:focus-visible` pseudo (Ark
 *    emits no `data-focus-visible` on the trigger); a real `userEvent.tab()`
 *    must resolve a non-`none` box-shadow on the focused toggle.
 *  - the chevron indicator rotates on `data-state='open'`.
 *  - a checkable option-item exposes its checked state to AT (role +
 *    aria-checked) and renders its item-indicator only when checked.
 */
const meta: Meta<typeof Dropdown> = {
  title: 'Components/Overlays/Dropdown/Tests',
  component: Dropdown,
  args: { triggerLabel: 'Actions', color: 'secondary', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Dropdown>;

const actionItems = (
  <>
    <DropdownParts.Item value="edit">Edit</DropdownParts.Item>
    <DropdownParts.Item value="duplicate">Duplicate</DropdownParts.Item>
    <DropdownParts.Item value="delete" data-color="critical">
      Delete
    </DropdownParts.Item>
  </>
);

/**
 * The Tier-B overlay keyboard contract: toggle reachable, Enter opens, focus
 * moves into the portalled List, Escape closes and returns focus to the toggle.
 * Reuses the shared `assertOverlayKeyboardCycle` (panel role = `menu`).
 */
export const KeyboardOpenClose: Story = {
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: 'Actions',
      panelRole: 'menu',
      noun: 'dropdown',
    });
  },
};

/**
 * Regression guard: the keyboard focus ring renders on the toggle.
 *
 * Ark never emits `data-focus-visible` on the trigger, so the ring uses the
 * native `:focus-visible` pseudo. `userEvent.tab()` produces a REAL keyboard
 * focus that triggers `:focus-visible` (programmatic `.focus()` does not), so
 * the box-shadow must resolve to a non-`none` value (WCAG 2.4.7).
 */
export const ToggleFocusRing: Story = {
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Actions' });

    await step('keyboard focus draws a visible focus ring', async () => {
      trigger.blur();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('the toggle is a native button with menu-button semantics', async () => {
      await expect(trigger.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAttribute('aria-haspopup');
    });
  },
};

/**
 * Regression guard: opening rotates the chevron indicator. The indicator carries
 * Ark's `data-state`; the CSS rotates it 180deg when open. Asserts both the
 * attribute and the resolved transform (so a dead selector would be caught).
 */
export const ChevronRotatesOnOpen: Story = {
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Actions' });

    await step('chevron is upright while closed', async () => {
      const indicator = trigger.querySelector<HTMLElement>('[data-part="indicator"]');
      await expect(indicator).not.toBeNull();
      await expect(indicator).toHaveAttribute('data-state', 'closed');
    });

    await step('opening flips the chevron via a non-identity transform', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await screen.findByRole('menu');
      const indicator = trigger.querySelector<HTMLElement>('[data-part="indicator"]');
      await waitFor(async () => {
        await expect(indicator).toHaveAttribute('data-state', 'open');
      });
      const transform = getComputedStyle(indicator!).transform;
      // 180deg rotation => matrix(-1, 0, 0, -1, 0, 0); must not be the identity.
      await expect(transform).not.toBe('none');
    });

    await step('Escape dismisses', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).toBeNull();
      });
    });
  },
};

/**
 * Regression guard: a checkable option exposes its state to AT and renders its
 * indicator only when checked. Ark CheckboxItem maps to
 * `role="menuitemcheckbox"` with `aria-checked`, and `data-part="option-item"`
 * carries `data-state="checked|unchecked"`.
 */
export const CheckableOptionState: Story = {
  args: { open: true, triggerLabel: 'View' },
  render: (args) => (
    <Dropdown {...args}>
      <DropdownParts.CheckboxItem value="wrap" checked>
        <DropdownParts.ItemIndicator>
          <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
            <path d="M3 8.5l3.5 3.5 6.5-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </DropdownParts.ItemIndicator>
        <DropdownParts.ItemText>Word wrap</DropdownParts.ItemText>
      </DropdownParts.CheckboxItem>
      <DropdownParts.CheckboxItem value="minimap" checked={false}>
        <DropdownParts.ItemIndicator>
          <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
            <path d="M3 8.5l3.5 3.5 6.5-7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </DropdownParts.ItemIndicator>
        <DropdownParts.ItemText>Minimap</DropdownParts.ItemText>
      </DropdownParts.CheckboxItem>
    </Dropdown>
  ),
  play: async ({ step }) => {
    await step('the checked option is AT-exposed as a checked menuitemcheckbox', async () => {
      const checked = await screen.findByRole('menuitemcheckbox', { name: /Word wrap/ });
      await expect(checked).toHaveAttribute('aria-checked', 'true');
      await expect(checked).toHaveAttribute('data-state', 'checked');
    });

    await step('the unchecked option reports aria-checked=false', async () => {
      const unchecked = screen.getByRole('menuitemcheckbox', { name: /Minimap/ });
      await expect(unchecked).toHaveAttribute('aria-checked', 'false');
      await expect(unchecked).toHaveAttribute('data-state', 'unchecked');
    });

    await step('the checked option renders its item-indicator', async () => {
      const checked = screen.getByRole('menuitemcheckbox', { name: /Word wrap/ });
      const indicator = checked.querySelector<HTMLElement>('[data-part="item-indicator"]');
      await expect(indicator).not.toBeNull();
      await expect(getComputedStyle(indicator!).color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard: open/closed toggles the Content `data-state` and the
 * toggle's `aria-expanded`; the List leaves the DOM after the exit animation.
 */
export const OpenStateToggles: Story = {
  render: (args) => <Dropdown {...args}>{actionItems}</Dropdown>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Actions' });

    await step('opening sets the content data-state to open', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const content = await screen.findByRole('menu');
      await expect(content).toHaveAttribute('data-state', 'open');
      // Wait for focus to settle inside the content before driving Escape — Ark
      // moves DOM focus to the [role="menu"] element after open; sending Escape
      // before that lands can race the open transition.
      await waitFor(async () => {
        await expect(screen.getByRole('menu')).toContainElement(
          document.activeElement as HTMLElement,
        );
      });
    });

    await step('the toggle reflects the open state', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'open');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    await step('closing removes the list', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).toBeNull();
      });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  },
};
