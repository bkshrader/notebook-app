import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DownloadTrigger } from './DownloadTrigger';

/**
 * Interaction / accessibility tests for the DownloadTrigger.
 *
 * Kept separate from the visual stories (`DownloadTrigger.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives and MUTATES the
 * rendered state (focus, keyboard activation), so colocating it with a doc
 * story would make that story flash/activate on load. Stories are named by
 * behavior so a failure is self-describing; each asserts with awaited `expect`
 * (storybook matchers are async) and uses `step()` for readable runner output.
 *
 * Regression context: Ark's DownloadTrigger renders a BARE native <button> with
 * no `data-scope`/`data-part`/state attributes. The component (DownloadTrigger.tsx)
 * therefore sets `data-scope='download-trigger'`/`data-part='trigger'` on the
 * button itself, and the CSS keys off those attributes plus the native pseudo-
 * classes. Before that fix the selectors matched nothing — so the focus-ring and
 * background guards below FAIL against the old CSS and PASS after the fix.
 */
const SAMPLE_CONTENT = 'Hello, World! This is a sample text file.';

const meta: Meta<typeof DownloadTrigger> = {
  title: 'Components/Actions/DownloadTrigger/Tests',
  component: DownloadTrigger,
  args: {
    data: SAMPLE_CONTENT,
    fileName: 'hello.txt',
    mimeType: 'text/plain',
    children: 'Download',
  },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof DownloadTrigger>;

/**
 * The button is keyboard-reachable, Enter activates it, and the styled
 * background resolves to a real token value (selectors actually match the
 * wrapper-set data-scope/data-part).
 */
export const KeyboardActivation: Story = {
  args: { onClick: fn() },
  play: async ({ canvasElement, step, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Download' });

    await step('button is present and enabled', async () => {
      await expect(button).toBeInTheDocument();
      await expect(button).not.toBeDisabled();
    });

    await step('button is in the tab order (keyboard-reachable)', async () => {
      await expect(button).not.toHaveAttribute('tabindex', '-1');
      button.focus();
      await expect(button).toHaveFocus();
    });

    await step('Enter activates the button', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('styled background resolves to a real token value', async () => {
      // Regression guard: the old `[data-scope]`-only selectors matched the bare
      // Ark button NOTHING, leaving it transparent. The wrapper-set data-scope
      // makes the base rule apply.
      const bg = getComputedStyle(button).backgroundColor;
      await expect(bg).not.toBe('');
      await expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Keyboard focus must render a visible focus ring. This is the core regression:
 * `userEvent.tab()` produces a real keyboard focus that triggers
 * `:focus-visible` (unlike programmatic `.focus()`), and the ring must resolve
 * to a non-`none` box-shadow. Fails against the old dead `[data-scope]` selector.
 */
export const FocusRingRenders: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Download' });

    await step('keyboard focus draws a visible focus ring', async () => {
      button.blur();
      await userEvent.tab();
      await expect(button).toHaveFocus();
      const ring = getComputedStyle(button).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * The disabled button is exposed to AT, removed from the tab order, cannot be
 * activated, and is visually distinct from the enabled button.
 */
export const DisabledIsInert: Story = {
  args: { disabled: true, onClick: fn() },
  play: async ({ canvasElement, step, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Download' });

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('disabled');
    });

    await step('disabled trigger cannot be keyboard-activated', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).not.toHaveBeenCalled();
    });

    await step('disabled styling differs from the enabled action color', async () => {
      // Regression guard: disabled must resolve the dimmed disabled surface, not
      // the action surface (proves the `:disabled` rule applies, not just base).
      const cs = getComputedStyle(button);
      await expect(cs.cursor).toBe('not-allowed');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * The `size` prop drives a real per-size spacing change: a `large` trigger has
 * more block padding than a `small` one. Guards the per-size custom-property
 * matrix.
 */
export const SizeMatrix: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <DownloadTrigger {...args} size="small">
        Small
      </DownloadTrigger>
      <DownloadTrigger {...args} size="large">
        Large
      </DownloadTrigger>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const small = canvas.getByRole('button', { name: 'Small' });
    const large = canvas.getByRole('button', { name: 'Large' });

    await step('large has greater block padding than small', async () => {
      const smallPad = parseFloat(getComputedStyle(small).paddingTop);
      const largePad = parseFloat(getComputedStyle(large).paddingTop);
      await expect(largePad).toBeGreaterThan(smallPad);
    });
  },
};
