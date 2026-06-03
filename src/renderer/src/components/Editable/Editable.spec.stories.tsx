import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent } from 'storybook/test';

import { Editable } from './Editable';

/**
 * Interaction / accessibility tests for the Editable.
 *
 * Kept separate from the visual stories (`Editable.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state (entering edit mode, typing,
 * committing), so colocating it with a doc story would make that story flash on
 * load. These stories are named by behavior so a failure is self-describing,
 * each asserts (a `play` without `expect` is a state-setter, not a test), and
 * each uses `step()` for readable runner / Interactions-panel output.
 *
 * Several steps are REGRESSION GUARDS for the Ark-contract fixes: Ark emits NO
 * `data-focus-visible` on any Editable part and the trigger buttons are plain
 * native `<button>`s, so the keyboard focus ring is drawn with the native
 * `:focus-visible` pseudo. The ring guards focus a control with
 * `userEvent.tab()` (real keyboard focus, which engages `:focus-visible`, unlike
 * programmatic `.focus()`) and assert a non-`none` box-shadow — these FAIL
 * against the old phantom `[data-focus-visible]` selectors and PASS after the
 * fix.
 */
const meta: Meta<typeof Editable> = {
  title: 'Components/Forms/Editable/Tests',
  component: Editable,
  args: {
    label: 'Display name',
    defaultValue: 'Jane Smith',
    placeholder: 'Enter a value…',
  },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Editable>;

function previewOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLElement>('[data-scope="editable"][data-part="preview"]');
}

function inputOf(canvasElement: HTMLElement) {
  return canvasElement.querySelector<HTMLInputElement>(
    '[data-scope="editable"][data-part="input"]',
  );
}

/** The label is associated and announced (WCAG 4.1.2). */
export const LabelAssociation: Story = {
  play: async ({ canvasElement, step }) => {
    await step('label element is present and named', async () => {
      const label = canvasElement.querySelector<HTMLElement>(
        '[data-scope="editable"][data-part="label"]',
      );
      await expect(label).not.toBeNull();
      await expect(label).toHaveTextContent('Display name');
    });
  },
};

/**
 * Primary keyboard interaction: focus the preview to enter edit mode, replace
 * the value, commit with Enter (submitMode="enter").
 */
export const KeyboardEdit: Story = {
  args: { defaultValue: 'Jane Smith', submitMode: 'enter', activationMode: 'focus' },
  play: async ({ canvasElement, step }) => {
    await step('preview is in the tab order (keyboard-reachable)', async () => {
      const preview = previewOf(canvasElement);
      await expect(preview).not.toBeNull();
      await expect(preview).not.toHaveAttribute('tabindex', '-1');
    });

    await step('focusing preview enters edit mode', async () => {
      const preview = previewOf(canvasElement)!;
      preview.focus();
      await expect(preview).toHaveFocus();
      await expect(inputOf(canvasElement)).not.toBeNull();
    });

    await step('input receives focus in edit mode', async () => {
      const input = inputOf(canvasElement)!;
      if (document.activeElement !== input) input.focus();
      await expect(input).toHaveFocus();
    });

    await step('typing updates the value', async () => {
      await userEvent.keyboard('{Control>}a{/Control}');
      await userEvent.keyboard('Bradley');
      await expect(inputOf(canvasElement)).toHaveValue('Bradley');
    });

    await step('Enter commits and returns to preview mode', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(previewOf(canvasElement)).toHaveTextContent('Bradley');
    });

    await step('preview color resolves to a real token value', async () => {
      const preview = previewOf(canvasElement)!;
      const color = getComputedStyle(preview).color;
      await expect(color).not.toBe('');
      await expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/**
 * Regression guard: the editing input renders a visible keyboard focus ring via
 * native `:focus-visible` (NOT the phantom `[data-focus-visible]` attribute Ark
 * never emits). `userEvent.tab()` produces a real keyboard focus.
 */
export const InputFocusRing: Story = {
  args: { activationMode: 'focus', submitMode: 'enter' },
  play: async ({ canvasElement, step }) => {
    await step('preview at rest draws no focus ring', async () => {
      const preview = previewOf(canvasElement)!;
      await expect(getComputedStyle(preview).boxShadow).toBe('none');
    });

    await step('tabbing into the field renders a focus ring on the focused control', async () => {
      const preview = previewOf(canvasElement)!;
      preview.blur();
      // userEvent.tab() produces a REAL keyboard focus (engages :focus-visible,
      // unlike programmatic .focus()). With activationMode="focus", focusing the
      // preview opens edit mode and moves focus to the input — so tab until the
      // active element is an editable-scoped control, then assert its ring.
      let guard = 0;
      while (
        guard < 12 &&
        !(document.activeElement as HTMLElement | null)?.matches?.('[data-scope="editable"]')
      ) {
        await userEvent.tab();
        guard += 1;
      }
      const active = document.activeElement as HTMLElement;
      await expect(active.matches('[data-scope="editable"]')).toBe(true);
      const ring = getComputedStyle(active).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/**
 * Regression guard: the trigger buttons (plain native <button>s with no Ark
 * state attrs) render a keyboard focus ring via native `:focus-visible`.
 *
 * Ark hides the edit/submit/cancel triggers until the matching mode is active,
 * so we enter edit mode first (focus the preview with activationMode="focus"),
 * which reveals the submit/cancel triggers, then drive a REAL keyboard focus
 * (userEvent.tab(), which engages :focus-visible — unlike programmatic
 * .focus()) onto the now-visible cancel trigger and assert the ring resolves.
 */
export const TriggerFocusRing: Story = {
  args: { activationMode: 'focus', submitMode: 'both' },
  play: async ({ canvasElement, step }) => {
    let cancelTrigger: HTMLButtonElement | null = null;

    await step('entering edit mode reveals the cancel trigger', async () => {
      const preview = previewOf(canvasElement)!;
      preview.focus();
      cancelTrigger = canvasElement.querySelector<HTMLButtonElement>(
        '[data-scope="editable"][data-part="cancel-trigger"]',
      );
      await expect(cancelTrigger).not.toBeNull();
      await expect(cancelTrigger).not.toHaveAttribute('hidden');
    });

    await step('cancel trigger at rest draws no focus ring', async () => {
      cancelTrigger!.blur();
      await expect(getComputedStyle(cancelTrigger!).boxShadow).toBe('none');
    });

    await step('keyboard focus renders a visible ring on the cancel trigger', async () => {
      let guard = 0;
      while (document.activeElement !== cancelTrigger && guard < 12) {
        await userEvent.tab();
        guard += 1;
      }
      await expect(cancelTrigger).toHaveFocus();
      const ring = getComputedStyle(cancelTrigger!).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Disabled editable shows its value, exposes data-disabled, and is inoperable. */
export const DisabledIsInert: Story = {
  args: { disabled: true, defaultValue: 'Jane Smith' },
  play: async ({ canvasElement, step }) => {
    await step('preview shows the value and carries data-disabled', async () => {
      const preview = previewOf(canvasElement);
      await expect(preview).not.toBeNull();
      await expect(preview).toHaveTextContent('Jane Smith');
      await expect(preview).toHaveAttribute('data-disabled');
    });

    await step('disabled preview is dimmed differently from enabled', async () => {
      // Regression guard: data-disabled on Preview (a real Ark attr) recolors.
      const preview = previewOf(canvasElement)!;
      const cs = getComputedStyle(preview);
      await expect(cs.cursor).toBe('not-allowed');
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('clicking disabled preview does not move focus into an input', async () => {
      const preview = previewOf(canvasElement)!;
      await userEvent.click(preview, { pointerEventsCheck: 0 });
      await expect(document.activeElement).not.toBe(inputOf(canvasElement));
    });
  },
};

/**
 * Read-only editable exposes data-readonly on the INPUT (Ark emits the readonly
 * state on the input element; the preview only gains data-readonly when also
 * disabled). The native input also carries the `readonly` attribute.
 */
export const ReadOnlyState: Story = {
  args: { readOnly: true, defaultValue: 'Jane Smith' },
  play: async ({ canvasElement, step }) => {
    await step('input carries data-readonly and the native readonly attribute', async () => {
      const input = inputOf(canvasElement);
      await expect(input).not.toBeNull();
      await expect(input).toHaveAttribute('data-readonly');
      await expect(input).toHaveAttribute('readonly');
    });

    await step('preview still shows the value at rest', async () => {
      const preview = previewOf(canvasElement);
      await expect(preview).not.toBeNull();
      await expect(preview).toHaveTextContent('Jane Smith');
    });
  },
};

/** Invalid editable recolors the label to the error token. */
export const InvalidState: Story = {
  args: { invalid: true },
  play: async ({ canvasElement, step }) => {
    await step('label carries data-invalid and a distinct error color', async () => {
      const label = canvasElement.querySelector<HTMLElement>(
        '[data-scope="editable"][data-part="label"]',
      );
      await expect(label).not.toBeNull();
      await expect(label).toHaveAttribute('data-invalid');
      await expect(getComputedStyle(label!).color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};
