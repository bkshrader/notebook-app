import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tabs } from './Tabs';

const defaultItems = [
  { value: 'account', label: 'Account', content: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', content: 'Change your password here.' },
  { value: 'billing', label: 'Billing', content: 'Manage your billing and payment details.' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Components/Navigation/Tabs',
  component: Tabs,
  args: {
    items: defaultItems,
    defaultValue: 'account',
  },
  argTypes: {
    defaultValue: { control: 'text' },
  },
};

export default meta;

type Story = StoryObj<typeof Tabs>;

/** Default horizontal tabs with three panels. */
export const Default: Story = {};

/** First tab disabled — the trigger is inert and the panel is not reachable. */
export const WithDisabledTab: Story = {
  args: {
    items: [
      { value: 'account', label: 'Account', content: 'Account settings.', disabled: true },
      { value: 'password', label: 'Password', content: 'Change your password here.' },
      { value: 'billing', label: 'Billing', content: 'Manage your billing details.' },
    ],
    defaultValue: 'password',
  },
};

/**
 * Drives the primary keyboard interaction for the ARIA Tabs pattern.
 *
 * APG contract:
 *   - Tab moves focus to the active trigger (or first trigger on initial
 *     entry) then to the active panel.
 *   - ArrowRight/ArrowLeft cycle focus between triggers and activate the
 *     newly focused tab (automatic activation mode, Ark default).
 *   - Home/End jump to the first/last trigger and activate it.
 *
 * Ark v5 Tabs renders triggers as real `<button>` elements in a
 * `role="tablist"` container, each with `role="tab"`. Panels carry
 * `role="tabpanel"`. We query by these native roles and read `data-selected`
 * off the trigger to assert the active state.
 */
export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Ark v5: triggers are <button role="tab"> inside a <div role="tablist">.
    const tabs = canvas.getAllByRole('tab');
    const [tab0, tab1, tab2] = tabs;
    if (!tab0 || !tab1 || !tab2) {
      throw new Error('expected three tabs');
    }

    await step('initial state: first tab is selected', async () => {
      await expect(tab0).toHaveAttribute('data-selected');
      await expect(tab1).not.toHaveAttribute('data-selected');
      await expect(tab2).not.toHaveAttribute('data-selected');
    });

    await step('first trigger is reachable by keyboard (not tabindex -1)', async () => {
      // Ark gives the *active* trigger tabindex=0; others get tabindex=-1.
      // We assert the currently selected trigger is reachable via Tab.
      await expect(tab0).not.toHaveAttribute('tabindex', '-1');
      tab0.focus();
      await expect(tab0).toHaveFocus();
    });

    await step('ArrowRight moves focus and activates the next tab', async () => {
      await userEvent.keyboard('{ArrowRight}');
      // Ark/Zag uses requestAnimationFrame internally for both focusNextTab and
      // selectFocusedTab, so we must waitFor the state to settle before asserting.
      await waitFor(() => expect(tab1).toHaveAttribute('data-selected'));
      await waitFor(() => expect(tab0).not.toHaveAttribute('data-selected'));
    });

    await step('ArrowRight again selects the third tab', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(tab2).toHaveAttribute('data-selected'));
    });

    await step('ArrowRight wraps around to the first tab', async () => {
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(tab0).toHaveAttribute('data-selected'));
    });

    await step('ArrowLeft moves to the last tab', async () => {
      await userEvent.keyboard('{ArrowLeft}');
      await waitFor(() => expect(tab2).toHaveAttribute('data-selected'));
    });

    await step('Home activates the first tab', async () => {
      await userEvent.keyboard('{Home}');
      await waitFor(() => expect(tab0).toHaveAttribute('data-selected'));
    });

    await step('End activates the last tab', async () => {
      await userEvent.keyboard('{End}');
      await waitFor(() => expect(tab2).toHaveAttribute('data-selected'));
    });

    await step('active panel is focusable after tab list exit', async () => {
      // ARIA Tabs pattern: the active panel must be reachable from the tab list.
      // Ark removes `hidden` from the selected panel and sets tabindex=0 when
      // the panel contains no focusable children (plain text here).
      // We query the panel WITHOUT {hidden:true} so it only resolves once
      // the hidden attribute is actually absent (i.e. billing is truly active).
      // Pressing Tab in the Storybook iframe is not deterministic across all
      // environments because other focusable wrappers in the preview document
      // may intercept focus. We therefore verify focusability directly.
      const activePanel = await canvas.findByRole('tabpanel');
      await expect(activePanel).toHaveAttribute('tabindex', '0');
      activePanel.focus();
      await expect(activePanel).toHaveFocus();
    });

    await step('selected trigger background resolves to a real token value', async () => {
      // Backstop: select a trigger, read its computed color and assert it is
      // a real (non-empty, non-transparent) value — guards against misspelled
      // var(--token-*) names that silently resolve to nothing.
      tab0.focus();
      await userEvent.keyboard('{Home}');
      await waitFor(() => expect(tab0).toHaveAttribute('data-selected'));
      const color = getComputedStyle(tab0).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * A disabled trigger must not be activatable. Ark marks the trigger with
 * `data-disabled` and sets `disabled` on the underlying button, removing it
 * from the tab sequence. Pressing ArrowRight from the previous tab must skip
 * the disabled trigger (Ark's Zag state machine skips disabled items).
 */
export const DisabledNotOperable: Story = {
  args: {
    items: [
      { value: 'account', label: 'Account', content: 'Account settings.' },
      { value: 'password', label: 'Password', content: 'Change your password.', disabled: true },
      { value: 'billing', label: 'Billing', content: 'Manage billing.' },
    ],
    defaultValue: 'account',
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    const [tab0, tab1, tab2] = tabs;
    if (!tab0 || !tab1 || !tab2) throw new Error('expected three tabs');

    await step('disabled trigger has data-disabled attribute', async () => {
      await expect(tab1).toHaveAttribute('data-disabled');
    });

    await step('disabled trigger is not activatable', async () => {
      // The disabled button is removed from natural tab order and
      // Ark's arrow-key handler skips it.
      tab0.focus();
      await userEvent.keyboard('{ArrowRight}');
      // Ark skips the disabled item; the third tab should become selected.
      // waitFor is required because Ark/Zag defers focus and selection via
      // requestAnimationFrame — the assertion must poll until the RAF settles.
      await waitFor(() => expect(tab2).toHaveAttribute('data-selected'));
      await waitFor(() => expect(tab1).not.toHaveAttribute('data-selected'));
    });
  },
};
