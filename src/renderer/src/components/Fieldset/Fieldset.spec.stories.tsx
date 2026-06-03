import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Fieldset } from './Fieldset';

/**
 * Interaction / accessibility tests for the Fieldset.
 *
 * Kept separate from the visual stories (`Fieldset.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: a `play` function drives/queries the
 * rendered state, so colocating it with a doc story would clutter the gallery.
 * Stories are named by behavior so a failure is self-describing, each asserts
 * with real `expect`, and each uses `step()` + `within(canvasElement)`.
 *
 * The guards below were written against the Ark contract VERIFIED in the live
 * DOM (not assumed): Ark emits `data-disabled` / `data-invalid` only on Root and
 * Legend; HelperText and ErrorText carry no state attributes, so their disabled
 * treatment is reached via a descendant selector from the disabled Root. The
 * disabled helper/error guards FAIL against the old dead
 * `[data-part='helper-text'][data-disabled]` selectors and PASS after the fix.
 */
const meta: Meta<typeof Fieldset> = {
  title: 'Components/Forms/Fieldset/Tests',
  component: Fieldset,
  args: { legend: 'Contact Details' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Fieldset>;

/**
 * Resolve a `--token-*` custom property to the same rgb string getComputedStyle
 * reports for a `color`. Reading the token at runtime (rather than hard-coding
 * an rgb literal) keeps the guard theme-agnostic: the resolved foreground-faint
 * value differs between color modes, but the assertion stays correct.
 */
function resolvedTokenColor(el: HTMLElement, token: string): string {
  const probe = document.createElement('span');
  probe.style.color = getComputedStyle(el).getPropertyValue(token).trim();
  el.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb;
}

/** Anatomy: the legend, helper, and error parts render with real token colors. */
export const StructureContract: Story = {
  args: {
    legend: 'Accessibility Test Group',
    helperText: 'Helper information for the group.',
    errorText: 'Error description for the group.',
    invalid: true,
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root is a fieldset, legend renders the accessible group name', async () => {
      const root = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      await expect(root).not.toBeNull();
      await expect((root as HTMLElement).tagName).toBe('FIELDSET');
      await expect(canvas.getByText('Accessibility Test Group')).toBeInTheDocument();
    });

    await step('helper-text and error-text parts are present', async () => {
      const helper = canvas.getByText('Helper information for the group.');
      await expect(helper.closest('[data-part="helper-text"]')).not.toBeNull();
      const error = canvas.getByText('Error description for the group.');
      await expect(error.closest('[data-part="error-text"]')).not.toBeNull();
    });

    await step('legend resolves a real (non-empty, non-transparent) color', async () => {
      const legend = canvasElement.querySelector('[data-scope="fieldset"][data-part="legend"]');
      const color = getComputedStyle(legend as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('transparent');
    });

    await step('root gap resolves to the shared form-control spacing token', async () => {
      // Regression guard for the borrowed hard-coded `gap: 0.75rem` literal: the
      // gap must now resolve to the same --token-form-control-padding the Field
      // wrapper uses (7px), not a one-off pixel value.
      const root = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      const cs = getComputedStyle(root as HTMLElement);
      const token = cs.getPropertyValue('--token-form-control-padding').trim();
      await expect(token).not.toBe('');
      await expect(cs.gap).toBe(token);
    });
  },
};

/** Invalid: Ark emits `data-invalid` on Root and Legend (verified in DOM). */
export const InvalidStateIsWired: Story = {
  args: {
    legend: 'Payment Info',
    invalid: true,
    errorText: 'Please correct the errors below.',
  },
  play: async ({ canvasElement, step }) => {
    await step('root and legend carry data-invalid when invalid', async () => {
      const root = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      const legend = canvasElement.querySelector('[data-scope="fieldset"][data-part="legend"]');
      await expect((root as HTMLElement).dataset.invalid).toBeDefined();
      await expect((legend as HTMLElement).dataset.invalid).toBeDefined();
    });

    await step('error-text renders the error-color token (distinct from helper)', async () => {
      const error = canvasElement.querySelector('[data-scope="fieldset"][data-part="error-text"]');
      const color = getComputedStyle(error as HTMLElement).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('transparent');
    });
  },
};

/** Disabled: the native fieldset is inert and every part is visually muted. */
export const DisabledIsInertAndMuted: Story = {
  args: {
    legend: 'Disabled Group',
    disabled: true,
    helperText: 'This group is disabled.',
    errorText: 'A disabled-state error message.',
    invalid: true,
  },
  play: async ({ canvasElement, step }) => {
    await step('root exposes both the native disabled attr and data-disabled', async () => {
      const root = canvasElement.querySelector('[data-scope="fieldset"][data-part="root"]');
      await expect(root).not.toBeNull();
      await expect((root as HTMLFieldSetElement).disabled).toBe(true);
      await expect((root as HTMLElement).dataset.disabled).toBeDefined();
    });

    await step('legend reflects data-disabled and is muted to foreground-faint', async () => {
      const legend = canvasElement.querySelector(
        '[data-scope="fieldset"][data-part="legend"]',
      ) as HTMLElement;
      await expect(legend.dataset.disabled).toBeDefined();
      const faint = resolvedTokenColor(legend, '--token-color-foreground-faint');
      await expect(getComputedStyle(legend).color).toBe(faint);
    });

    await step('helper-text is muted via the disabled-root descendant rule', async () => {
      // Regression guard: Ark emits NO data-disabled on helper-text, so the old
      // `[data-part='helper-text'][data-disabled]` selector was dead. The fix
      // reaches it from the disabled Root; assert the muted foreground-faint
      // token now resolves. (In light mode foreground-faint and the normal
      // helper-text token happen to share a value, so a "differs from enabled"
      // check is not meaningful here — equality to the faint token is what
      // proves the descendant rule fired.)
      const helper = canvasElement.querySelector(
        '[data-scope="fieldset"][data-part="helper-text"]',
      ) as HTMLElement;
      await expect(helper.dataset.disabled).toBeUndefined();
      const faint = resolvedTokenColor(helper, '--token-color-foreground-faint');
      await expect(getComputedStyle(helper).color).toBe(faint);
    });

    await step('error-text is muted via the disabled-root descendant rule', async () => {
      // The error token (#c00005) differs from foreground-faint, so this guard
      // distinguishes the dead selector (would leave the loud error color) from
      // the fixed descendant rule (mutes to faint).
      const error = canvasElement.querySelector(
        '[data-scope="fieldset"][data-part="error-text"]',
      ) as HTMLElement;
      await expect(error.dataset.disabled).toBeUndefined();
      const faint = resolvedTokenColor(error, '--token-color-foreground-faint');
      const loudError = resolvedTokenColor(error, '--token-form-error-color');
      await expect(getComputedStyle(error).color).toBe(faint);
      await expect(faint).not.toBe(loudError);
    });
  },
};
