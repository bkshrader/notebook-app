import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { FileInput } from './FileInput';

/**
 * Interaction / accessibility tests for the FileInput.
 *
 * Kept separate from the visual stories (`FileInput.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles (and some mutate selection state), so they are
 * test cases, not documentation. Behavior-named so a failure is self-describing;
 * each uses `step()` + `within(canvasElement)` and `await`s real `expect(...)`
 * (Storybook matchers are async). Hidden from the docs gallery via
 * `tags: ['test']`.
 */
const meta: Meta<typeof FileInput> = {
  title: 'Components/Forms/FileInput/Tests',
  component: FileInput,
  args: { label: 'Attachment', triggerLabel: 'Choose file' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof FileInput>;

/** The Helios/Ark structural + ARIA contract: label, trigger button, input. */
export const StructureContract: Story = {
  args: { label: 'Resume' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('root emits the data-part Ark renders', async () => {
      const root = canvasElement.querySelector("[data-scope='file-upload'][data-part='root']");
      await expect(root).not.toBeNull();
    });

    await step('the visible label renders under the label part', async () => {
      const label = canvas.getByText('Resume');
      await expect(label.closest("[data-part='label']")).not.toBeNull();
    });

    await step('the trigger is a real, named <button> (WCAG 4.1.2)', async () => {
      const trigger = canvas.getByRole('button', { name: 'Choose file' });
      await expect(trigger.tagName).toBe('BUTTON');
      await expect(trigger).toHaveAttribute('data-part', 'trigger');
    });

    await step('a native file input backs the control', async () => {
      const input = canvasElement.querySelector<HTMLInputElement>("input[type='file']");
      await expect(input).not.toBeNull();
    });

    await step('trigger resolves a real (token) background', async () => {
      const trigger = canvas.getByRole('button', { name: 'Choose file' });
      const cs = getComputedStyle(trigger);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** The required asterisk renders and resolves the error token color. */
export const RequiredIndicator: Story = {
  args: { label: 'Resume', required: true },
  play: async ({ canvasElement, step }) => {
    await step('an aria-hidden asterisk is appended to the label', async () => {
      const indicator = canvasElement.querySelector<HTMLElement>(
        "[data-part='required-indicator']",
      )!;
      await expect(indicator).not.toBeNull();
      await expect(indicator).toHaveAttribute('aria-hidden', 'true');
      await expect(getComputedStyle(indicator).color).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

/** Keyboard reaches the trigger and a real `:focus-visible` ring renders. */
export const KeyboardFocusRing: Story = {
  args: { label: 'Attachment' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Choose file' });

    await step('tabbing moves focus onto the trigger', async () => {
      trigger.blur();
      await userEvent.tab();
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    await step('keyboard focus paints the action focus ring (not none)', async () => {
      // Regression guard: Ark emits no data-focus-visible, so the ring rides on
      // the native :focus-visible pseudo. Real keyboard focus (userEvent.tab)
      // triggers it; a programmatic .focus() would not.
      await waitFor(async () => {
        await expect(trigger.matches(':focus-visible')).toBe(true);
        await expect(getComputedStyle(trigger).boxShadow).not.toBe('none');
      });
    });
  },
};

/** Disabled forwards the native attribute and styles the not-allowed look. */
export const DisabledTrigger: Story = {
  args: { label: 'Attachment', disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the trigger carries the native disabled attribute', async () => {
      const trigger = canvas.getByRole('button', { name: 'Choose file' });
      await expect(trigger).toBeDisabled();
    });

    await step('disabled paints the not-allowed cursor (style resolves)', async () => {
      const trigger = canvas.getByRole('button', { name: 'Choose file' });
      await expect(getComputedStyle(trigger).cursor).toBe('not-allowed');
    });
  },
};

/** The dropzone is a focusable role=button and paints its own focus ring. */
export const DropzoneIsFocusableButton: Story = {
  args: { label: 'Upload files', showDropzone: true, triggerLabel: 'Browse' },
  play: async ({ canvasElement, step }) => {
    await step('the dropzone exposes role=button and is tabbable', async () => {
      const dropzone = canvasElement.querySelector<HTMLElement>("[data-part='dropzone']")!;
      await expect(dropzone).not.toBeNull();
      await expect(dropzone).toHaveAttribute('role', 'button');
      await expect(dropzone.getAttribute('tabindex')).toBe('0');
    });

    await step('keyboard focus paints the dropzone focus ring', async () => {
      const dropzone = canvasElement.querySelector<HTMLElement>("[data-part='dropzone']")!;
      dropzone.blur();
      await userEvent.tab();
      await waitFor(async () => {
        if (!dropzone.matches(':focus-visible')) {
          await userEvent.tab();
          throw new Error('dropzone not yet keyboard-focused');
        }
        await expect(getComputedStyle(dropzone).boxShadow).not.toBe('none');
      });
    });
  },
};

/** Selecting a file renders it in the item list with a remove control. */
export const SelectedFileRendersInList: Story = {
  args: { label: 'Attachment' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const file = new File(['hello world'], 'notes.txt', { type: 'text/plain' });

    await step('uploading a file via the native input adds an item row', async () => {
      const input = canvasElement.querySelector<HTMLInputElement>("input[type='file']")!;
      await userEvent.upload(input, file);
      await waitFor(async () => {
        const item = canvasElement.querySelector("[data-part='item']");
        await expect(item).not.toBeNull();
      });
    });

    await step('the item shows the file name and a labelled remove button', async () => {
      await expect(canvas.getByText('notes.txt')).toBeTruthy();
      const remove = canvas.getByRole('button', { name: 'Remove notes.txt' });
      await expect(remove).toHaveAttribute('data-part', 'item-delete-trigger');
    });
  },
};
