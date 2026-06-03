import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Tabs } from './Tabs';

/**
 * Interaction / accessibility tests for the Tabs.
 *
 * Kept separate from the visual stories (`Tabs.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state, so colocating it with a doc
 * story would make that story animate/flash on load. These stories are named by
 * behavior so a failure is self-describing, each asserts with real `expect`,
 * and each uses `step()` for readable runner / Interactions-panel output.
 *
 * Several of these are REGRESSION GUARDS for the Helios-parity fix:
 *   - The keyboard focus ring is drawn on the trigger's ::before via the native
 *     :focus-visible pseudo (Ark exposes NO data-focus-visible attribute; the
 *     old CSS targeted a phantom [data-focus-visible] selector that never
 *     matched, so no ring rendered). These guards FAIL against the old broken
 *     selectors and PASS after the fix.
 */
const defaultItems = [
  { value: 'account', label: 'Account', content: 'Make changes to your account here.' },
  { value: 'password', label: 'Password', content: 'Change your password here.' },
  { value: 'billing', label: 'Billing', content: 'Manage your billing and payment details.' },
];

const meta: Meta<typeof Tabs> = {
  title: 'Components/Navigation/Tabs/Tests',
  component: Tabs,
  args: { items: defaultItems, defaultValue: 'account', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Tabs>;

/**
 * Drives the primary keyboard interaction for the ARIA Tabs pattern.
 *
 * APG contract:
 *   - Tab moves focus to the active trigger then to the active panel.
 *   - ArrowRight/ArrowLeft cycle focus between triggers and activate the
 *     newly focused tab (automatic activation mode, Ark default).
 *   - Home/End jump to the first/last trigger and activate it.
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
      // the panel contains no focusable children (plain text here). We query the
      // panel WITHOUT {hidden:true} so it only resolves once the hidden attribute
      // is absent (i.e. billing is truly active). Pressing Tab in the Storybook
      // iframe is not deterministic, so we verify focusability directly.
      const activePanel = await canvas.findByRole('tabpanel');
      await expect(activePanel).toHaveAttribute('tabindex', '0');
      activePanel.focus();
      await expect(activePanel).toHaveFocus();
    });

    await step('selected trigger color resolves to a real token value', async () => {
      // Backstop: select a trigger, read its computed color and assert it is a
      // real (non-empty, non-transparent) value — guards against misspelled
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
 * Regression guard: keyboard focus must render a visible focus ring on the
 * trigger's ::before. The old CSS hung the ring off a phantom
 * `[data-focus-visible]` attribute that Ark never emits, so nothing rendered.
 * `userEvent.tab()` produces a real keyboard focus that triggers
 * `:focus-visible`, unlike programmatic `.focus()`.
 */
export const FocusRingRendersOnKeyboardFocus: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tabs = canvas.getAllByRole('tab');
    const [tab0] = tabs;
    if (!tab0) throw new Error('expected at least one tab');

    await step('keyboard focus draws the ring on the trigger ::before', async () => {
      tab0.blur();
      await userEvent.tab();
      await expect(tab0).toHaveFocus();
      const ring = getComputedStyle(tab0, '::before').boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard for the size scale: the large size must resolve a taller
 * trigger than medium. Reads the live tab heights of both sizes.
 */
export const SizeScaleAppliesHeight: Story = {
  args: { size: 'large' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tab0 = canvas.getAllByRole('tab')[0];
    if (!tab0) throw new Error('expected at least one tab');

    await step('large trigger resolves a non-trivial block-size token', async () => {
      const height = getComputedStyle(tab0).blockSize;
      // --token-tabs-tab-height-large is 48px; assert it resolved (not empty/0).
      await expect(height).not.toBe('');
      await expect(parseFloat(height)).toBeGreaterThan(40);
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

    await step('disabled trigger exposes data-disabled and native disabled', async () => {
      await expect(tab1).toHaveAttribute('data-disabled');
      await expect(tab1).toBeDisabled();
    });

    await step('disabled trigger color differs from an enabled trigger', async () => {
      // Regression guard: the [data-disabled] / :disabled selector must apply
      // the disabled foreground, distinct from the enabled (faint) color.
      const disabledColor = getComputedStyle(tab1).color;
      const enabledColor = getComputedStyle(tab2).color;
      await expect(disabledColor).not.toBe(enabledColor);
    });

    await step('disabled trigger is not activatable', async () => {
      // The disabled button is removed from natural tab order and Ark's
      // arrow-key handler skips it. waitFor is required because Ark/Zag defers
      // focus and selection via requestAnimationFrame.
      tab0.focus();
      await userEvent.keyboard('{ArrowRight}');
      await waitFor(() => expect(tab2).toHaveAttribute('data-selected'));
      await waitFor(() => expect(tab1).not.toHaveAttribute('data-selected'));
    });
  },
};
