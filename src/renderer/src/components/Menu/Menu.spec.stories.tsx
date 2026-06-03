import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Menu, MenuParts } from './Menu';
import { assertOverlayKeyboardCycle } from '../test-helpers';

/**
 * Interaction / accessibility / regression tests for the Menu.
 *
 * Kept separate from the visual stories (`Menu.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state, so colocating it with a doc
 * story would make that story animate/flash on load. Stories are named by
 * behavior so a failure is self-describing; each `play` AWAITS real `expect`
 * assertions (storybook/test matchers are async — eslint would fail on an
 * un-awaited one), and each uses `step()` for readable runner output.
 *
 * The Menu is a Tier-B overlay: Content renders in an Ark Portal OUTSIDE the
 * story canvas element, so the panel is queried via `screen` (document.body
 * scope), not `within(canvasElement)`.
 *
 * Regression guards encode the Ark selector-contract fixes (Menu.css):
 *  - the trigger focus ring is drawn via the NATIVE `:focus-visible` pseudo
 *    (Ark emits no `data-focus-visible`); a real `userEvent.tab()` must resolve
 *    a non-`none` box-shadow on the focused trigger.
 *  - a disabled menu item renders visibly distinct from an enabled item
 *    (the `[data-disabled]` Ark Item attribute drives the dimmed treatment).
 *  - open vs closed toggles the Content `data-state`.
 */
const meta: Meta<typeof Menu> = {
  title: 'Components/Overlays/Menu/Tests',
  component: Menu,
  args: { triggerLabel: 'File', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Menu>;

const fileItems = (
  <>
    <MenuParts.Item value="new-file">New File</MenuParts.Item>
    <MenuParts.Item value="open">Open…</MenuParts.Item>
    <MenuParts.Item value="save">Save</MenuParts.Item>
  </>
);

/**
 * The Tier-B overlay keyboard contract: trigger reachable, Enter opens, focus
 * moves into the portalled panel, Escape closes and returns focus to trigger.
 * Reuses the shared `assertOverlayKeyboardCycle` (panel role = `menu`).
 */
export const KeyboardOpenClose: Story = {
  render: (args) => <Menu {...args}>{fileItems}</Menu>,
  play: async ({ canvasElement, step }) => {
    await assertOverlayKeyboardCycle(canvasElement, step, {
      triggerName: 'File',
      panelRole: 'menu',
      noun: 'menu',
    });
  },
};

/**
 * Regression guard: the keyboard focus ring renders on the trigger.
 *
 * Before the fix the ring hung off `[data-focus-visible]`, an attribute Ark
 * never emits on the trigger — so the ring never rendered (WCAG 2.4.7 fail).
 * The ring now uses the native `:focus-visible` pseudo. `userEvent.tab()`
 * produces a REAL keyboard focus that triggers `:focus-visible` (programmatic
 * `.focus()` does not), so the box-shadow must resolve to a non-`none` value.
 */
export const TriggerFocusRing: Story = {
  render: (args) => <Menu {...args}>{fileItems}</Menu>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'File' });

    await step('keyboard focus draws a visible focus ring', async () => {
      trigger.blur();
      await userEvent.tab();
      await expect(trigger).toHaveFocus();
      const ring = getComputedStyle(trigger).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });

    await step('the trigger is a native button (carries native focus state)', async () => {
      await expect(trigger.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAttribute('aria-haspopup');
    });
  },
};

/**
 * Regression guard: a disabled item is exposed to AT and rendered distinctly.
 *
 * Ark sets `data-disabled` on the Item element. The dimmed treatment (faint
 * color + 0.6 opacity) must produce a computed style that differs from an
 * enabled sibling, and the item must be marked aria-disabled for AT.
 */
export const DisabledItemIsDistinct: Story = {
  args: { open: true },
  render: (args) => (
    <Menu {...args}>
      <MenuParts.Item value="enabled">Available action</MenuParts.Item>
      <MenuParts.Item value="disabled" disabled>
        Unavailable action
      </MenuParts.Item>
    </Menu>
  ),
  play: async ({ step }) => {
    await step('the disabled item carries Ark data-disabled and is AT-disabled', async () => {
      const enabled = await screen.findByRole('menuitem', { name: 'Available action' });
      const disabled = screen.getByRole('menuitem', { name: 'Unavailable action' });
      await expect(disabled).toHaveAttribute('data-disabled');
      await expect(disabled).toHaveAttribute('aria-disabled', 'true');
      await expect(enabled).not.toHaveAttribute('data-disabled');
    });

    await step('the disabled item is rendered visibly dimmer than an enabled one', async () => {
      const enabled = screen.getByRole('menuitem', { name: 'Available action' });
      const disabled = screen.getByRole('menuitem', { name: 'Unavailable action' });
      const enabledOpacity = Number(getComputedStyle(enabled).opacity);
      const disabledOpacity = Number(getComputedStyle(disabled).opacity);
      await expect(disabledOpacity).toBeLessThan(enabledOpacity);
    });
  },
};

/**
 * Regression guard: highlighting an item (keyboard navigation) applies the
 * `data-highlighted` treatment, changing its background from the resting state.
 */
export const HighlightChangesBackground: Story = {
  render: (args) => <Menu {...args}>{fileItems}</Menu>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'File' });

    await step('open the menu and let focus settle on the content', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(async () => {
        const content = screen.queryByRole('menu');
        await expect(content).not.toBeNull();
        await expect(content).toContainElement(document.activeElement as HTMLElement);
      });
    });

    await step('ArrowDown highlights an item and tints its background', async () => {
      await userEvent.keyboard('{ArrowDown}');
      const highlighted = await waitFor(() => {
        const el = document.querySelector<HTMLElement>('[data-part="item"][data-highlighted]');
        if (!el) throw new Error('no highlighted item yet');
        return el;
      });
      const bg = getComputedStyle(highlighted).backgroundColor;
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
      await expect(bg).not.toBe('transparent');
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
 * Regression guard: open/closed toggles the Content `data-state` (and the
 * panel leaves the DOM after the exit animation).
 */
export const OpenStateToggles: Story = {
  render: (args) => <Menu {...args}>{fileItems}</Menu>,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'File' });

    await step('opening sets the content data-state to open', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      const content = await screen.findByRole('menu');
      await expect(content).toHaveAttribute('data-state', 'open');
      // Wait for focus to settle inside the content before driving Escape —
      // Ark moves DOM focus to the [role="menu"] element after open; sending
      // Escape before that lands can race the open transition.
      await waitFor(async () => {
        await expect(screen.getByRole('menu')).toContainElement(
          document.activeElement as HTMLElement,
        );
      });
    });

    await step('the trigger reflects the open state', async () => {
      await expect(trigger).toHaveAttribute('data-state', 'open');
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    await step('closing removes the panel', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => {
        await expect(screen.queryByRole('menu')).toBeNull();
      });
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

/**
 * Structural guard: a labelled group renders the `item-group-label` part and a
 * `Separator` renders as a native `<hr>` (Ark `Separator → HTMLHRElement`).
 */
export const GroupAndSeparatorStructure: Story = {
  args: { open: true },
  render: (args) => (
    <Menu {...args}>
      <MenuParts.ItemGroup>
        <MenuParts.ItemGroupLabel>Document</MenuParts.ItemGroupLabel>
        <MenuParts.Item value="new-file">New File</MenuParts.Item>
      </MenuParts.ItemGroup>
      <MenuParts.Separator />
      <MenuParts.Item value="quit">Quit</MenuParts.Item>
    </Menu>
  ),
  play: async ({ step }) => {
    await step('the group label part renders with its label text', async () => {
      await screen.findByRole('menu');
      const label = document.querySelector<HTMLElement>('[data-part="item-group-label"]');
      await expect(label).not.toBeNull();
      await expect(label!.textContent).toBe('Document');
    });

    await step('the separator renders as a native hr with a resolved background', async () => {
      const separator = document.querySelector<HTMLElement>('[data-part="separator"]');
      await expect(separator).not.toBeNull();
      await expect(separator!.tagName).toBe('HR');
      await expect(getComputedStyle(separator!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
