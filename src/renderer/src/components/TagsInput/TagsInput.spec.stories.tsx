import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { TagsInput } from './TagsInput';

/**
 * Interaction / accessibility tests for the TagsInput.
 *
 * Kept separate from the visual stories (`TagsInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state, so colocating it with a doc
 * story would make that story animate/flash on load. Each story is named by
 * behavior so a failure is self-describing, each asserts (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Several tests are regression guards for the Helios-parity fixes:
 *   - Focus ring renders via the genuine `[data-focus]` on the control — Ark's
 *     tags-input never emits `data-focus-visible`, so the old
 *     `[data-focus][data-focus-visible]` selector never matched and drew no ring.
 *   - Disabled state visibly differs from the enabled state and is AT-exposed.
 *   - `data-size` resolves a different font-size per size.
 */
const meta: Meta<typeof TagsInput> = {
  title: 'Components/Forms/TagsInput/Tests',
  component: TagsInput,
  args: { label: 'Tags', placeholder: 'Add tag…', size: 'medium' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof TagsInput>;

function controlOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>(
    "[data-scope='tags-input'][data-part='control']",
  )!;
}

/**
 * Primary keyboard interaction: type + Enter adds a tag, Backspace highlights
 * then removes the last tag.
 *
 * UIValue sync note: Ark/Zag clears the input via a RAF-deferred
 * setElementValue() call (native IDL setter + setAttribute). This correctly
 * sets el.value = "" but does NOT reset @testing-library/user-event's internal
 * UIValue Symbol, which records the last value user-event itself set. If UIValue
 * is stale ("react") when the next userEvent.keyboard() runs, calculateNewValue
 * appends to the stale string. userEvent.clear() drives a proper select-all +
 * delete sequence that resets both the DOM value and the UIValue Symbol.
 */
export const KeyboardAddAndRemove: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');

    await step('input is keyboard-reachable and focusable', async () => {
      await expect(input).not.toHaveAttribute('tabindex', '-1');
      await userEvent.click(input);
      await expect(input).toHaveFocus();
    });

    await step('type + Enter adds a tag and clears the field', async () => {
      await userEvent.keyboard('react');
      await userEvent.keyboard('{Enter}');

      await waitFor(async () => {
        await expect(canvas.queryByText('react')).toBeInTheDocument();
      });
      const tagText = canvasElement.querySelector(
        "[data-scope='tags-input'][data-part='item-text']",
      );
      await expect(tagText).toBeInTheDocument();
      await expect(tagText).toHaveTextContent('react');

      // Ark/Zag defers clearInputValue via requestAnimationFrame, so the DOM
      // value lags one frame behind the React render. waitFor rides it out.
      await waitFor(async () => {
        await expect(input).toHaveValue('');
      });
    });

    await step('Backspace highlights then removes the last tag', async () => {
      // userEvent.clear() resets user-event's internal UIValue Symbol to "" so
      // the next keyboard events calculate relative to an empty string. Without
      // it, getUIValue() returns the stale "react" and Backspace mis-routes.
      await userEvent.clear(input);

      // First Backspace on an empty input: Ark transitions to "navigating:tag"
      // and highlights the last tag (data-highlighted on item-preview).
      await userEvent.keyboard('{Backspace}');
      await waitFor(async () => {
        const highlighted = canvasElement.querySelector(
          "[data-scope='tags-input'][data-part='item-preview'][data-highlighted]",
        );
        await expect(highlighted).toBeInTheDocument();
      });

      // Second Backspace removes the highlighted tag.
      await userEvent.keyboard('{Backspace}');
      await waitFor(async () => {
        await expect(canvas.queryByText('react')).not.toBeInTheDocument();
      });
    });
  },
};

/**
 * Accumulates several tags via the keyboard.
 *
 * UIValue sync note: see KeyboardAddAndRemove — userEvent.clear() between
 * iterations resets the per-input UIValue Symbol that Zag's setElementValue()
 * leaves stale, preventing "alpha" + "beta" = "alphabeta".
 */
export const MultipleTagsViaKeyboard: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    const tagNames = ['alpha', 'beta', 'gamma'];

    await step('each tag is added in sequence', async () => {
      await userEvent.click(input);
      await expect(input).toHaveFocus();

      for (const tag of tagNames) {
        await userEvent.keyboard(tag);
        await userEvent.keyboard('{Enter}');
        await waitFor(async () => {
          await expect(canvas.getByText(tag)).toBeInTheDocument();
        });
        await waitFor(async () => {
          await expect(input).toHaveValue('');
        });
        await userEvent.clear(input);
      }
    });

    await step('all three tags are present simultaneously', async () => {
      for (const tag of tagNames) {
        await expect(canvas.getByText(tag)).toBeInTheDocument();
      }
    });
  },
};

/**
 * Regression guard for the focus-ring fix. Ark never emits
 * `data-focus-visible`; it emits `data-focus` on the control once the inner
 * input is focused. The ring is keyed off `[data-focus]` — the old
 * `[data-focus][data-focus-visible]` selector never matched, so this guard
 * FAILS against the pre-fix CSS and PASSES after.
 */
export const FocusRingRendersOnControl: Story = {
  args: { defaultValue: ['react'] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    const control = controlOf(canvasElement);

    await step('no focus ring before focus', async () => {
      await expect(control).not.toHaveAttribute('data-focus');
    });

    await step('focusing the field sets data-focus on the control', async () => {
      // userEvent.tab() drives a real keyboard focus into the field.
      await userEvent.tab();
      await expect(input).toHaveFocus();
      // Zag sets data-focus one tick after focusin.
      await waitFor(async () => {
        await expect(control).toHaveAttribute('data-focus');
      });
    });

    await step('a visible focus ring (box-shadow) resolves on the control', async () => {
      const ring = getComputedStyle(control).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Disabled TagsInput is AT-exposed and visually distinct from the enabled one. */
export const DisabledIsInertAndDistinct: Story = {
  args: { disabled: true, defaultValue: ['locked'] },
  play: async ({ canvasElement, step }) => {
    const control = controlOf(canvasElement);
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-scope='tags-input'][data-part='root']",
    )!;

    await step('disabled state is exposed on root + control', async () => {
      await expect(root).toHaveAttribute('data-disabled');
      await expect(control).toHaveAttribute('data-disabled');
    });

    await step('disabled control surface differs from the enabled default', async () => {
      // Enabled control uses the base surface (#ffffff); disabled uses the
      // disabled surface (#fafafa). The two must not be identical.
      const disabledBg = getComputedStyle(control).backgroundColor;
      await expect(disabledBg).not.toBe('rgba(0, 0, 0, 0)');
      await expect(disabledBg).toBe('rgb(250, 250, 250)');
    });

    await step('the delete trigger is a disabled native button', async () => {
      const del = canvasElement.querySelector<HTMLButtonElement>(
        "[data-scope='tags-input'][data-part='item-delete-trigger']",
      )!;
      await expect(del.tagName).toBe('BUTTON');
      await expect(del).toBeDisabled();
    });
  },
};

/** Invalid state recolors the control border (regression guard for data-invalid). */
export const InvalidRecolorsBorder: Story = {
  args: { invalid: true, defaultValue: ['bad'] },
  play: async ({ canvasElement, step }) => {
    const control = controlOf(canvasElement);

    await step('control carries data-invalid', async () => {
      await expect(control).toHaveAttribute('data-invalid');
    });

    await step('invalid border resolves to the critical color', async () => {
      // --token-form-control-invalid-border-color-default = #c00005.
      await expect(getComputedStyle(control).borderTopColor).toBe('rgb(192, 0, 5)');
    });
  },
};

/** `data-size` flows a per-size font-size into the matrix (regression guard).
 *  Asserts the relative ordering small < medium < large rather than absolute
 *  px (the test runner's root font-size is not guaranteed to be 16px). */
export const SizeMatrixApplies: Story = {
  args: { size: 'small', defaultValue: ['react'] },
  play: async ({ canvasElement, step }) => {
    const root = canvasElement.querySelector<HTMLElement>(
      "[data-scope='tags-input'][data-part='root']",
    )!;
    const itemText = canvasElement.querySelector<HTMLElement>(
      "[data-scope='tags-input'][data-part='item-text']",
    )!;
    const px = () => parseFloat(getComputedStyle(itemText).fontSize);

    await step('small reflects the chosen size and its body-100 font-size', async () => {
      await expect(root).toHaveAttribute('data-size', 'small');
      const smallPx = px();

      // Re-target the same node across size flips by toggling the attribute.
      root.setAttribute('data-size', 'medium');
      const mediumPx = px();
      root.setAttribute('data-size', 'large');
      const largePx = px();
      root.setAttribute('data-size', 'small');

      // body-100 (small) < body-200 (medium) < body-300 (large).
      await expect(smallPx).toBeLessThan(mediumPx);
      await expect(mediumPx).toBeLessThan(largePx);
    });
  },
};
