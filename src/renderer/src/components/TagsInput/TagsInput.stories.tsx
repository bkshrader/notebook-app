import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { TagsInput } from './TagsInput';

const meta: Meta<typeof TagsInput> = {
  title: 'Components/Forms/TagsInput',
  component: TagsInput,
  args: {
    label: 'Tags',
    placeholder: 'Add tag…',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof TagsInput>;

export const Default: Story = {};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: ['react', 'typescript'],
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: ['disabled-tag'],
  },
};

/**
 * Tier C play test — drives the primary keyboard interaction for TagsInput:
 * type text and press Enter to add a tag, then press Backspace/Delete to
 * remove the most-recently-added tag. Asserts the tag appears in the DOM after
 * Enter and disappears after the delete key sequence.
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The tag input field has role="textbox" (native <input type="text">).
    const input = canvas.getByRole('textbox');
    await expect(input).not.toHaveAttribute('tabindex', '-1');

    await userEvent.click(input);
    await expect(input).toHaveFocus();

    // Type a tag value and press Enter to add it.
    await userEvent.keyboard('react');
    await userEvent.keyboard('{Enter}');

    // The tag pill should now appear in the control area.
    await waitFor(async () => {
      const tagText = canvas.queryByText('react');
      await expect(tagText).toBeInTheDocument();
    });

    // Verify the item-text part is present (Ark's anatomy).
    const tagItem = canvasElement.querySelector("[data-scope='tags-input'][data-part='item-text']");
    await expect(tagItem).toBeInTheDocument();
    await expect(tagItem).toHaveTextContent('react');

    // Input should be cleared after adding the tag.
    // Ark/Zag defers clearInputValue via requestAnimationFrame so the DOM
    // element value may lag one frame behind the React render. waitFor polls
    // until the frame has run and the value is truly empty.
    await waitFor(async () => {
      await expect(input).toHaveValue('');
    });

    // userEvent.clear() resets user-event's internal UIValue Symbol to "" so
    // that subsequent keyboard events calculate the new value relative to an
    // empty string. Without this, getUIValue() returns the stale "react" value
    // (set by the previous userEvent.keyboard() call) and Backspace mis-routes.
    await userEvent.clear(input);

    // First Backspace on an empty input: Ark transitions to "navigating:tag"
    // state and highlights the last tag (data-highlighted on item-preview).
    await userEvent.keyboard('{Backspace}');

    // After the first Backspace the last item-preview should be highlighted.
    await waitFor(async () => {
      const highlighted = canvasElement.querySelector(
        "[data-scope='tags-input'][data-part='item-preview'][data-highlighted]",
      );
      await expect(highlighted).toBeInTheDocument();
    });

    // Second Backspace removes the highlighted tag.
    await userEvent.keyboard('{Backspace}');

    // The tag text should no longer appear in the canvas.
    await waitFor(async () => {
      const tagText = canvas.queryByText('react');
      await expect(tagText).not.toBeInTheDocument();
    });
  },
};

/**
 * Demonstrates adding multiple tags in sequence to verify the pill rendering
 * accumulates correctly.
 *
 * UIValue sync note: @testing-library/user-event maintains an internal
 * UIValue Symbol property on each input element to track the value it last
 * set. Ark/Zag's RAF-deferred setElementValue() resets the DOM value (el.value)
 * but does NOT reset this Symbol. Without explicit userEvent.clear() between
 * iterations, getUIValue() returns the previous tag name and appends the next
 * tag to it (e.g. "alpha" + "beta" = "alphabeta"). userEvent.clear() drives a
 * select-all + delete input event that resets the Symbol to "".
 */
export const MultipleTagsViaKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const input = canvas.getByRole('textbox');
    await userEvent.click(input);
    await expect(input).toHaveFocus();

    const tagNames = ['alpha', 'beta', 'gamma'];

    for (const tag of tagNames) {
      await userEvent.keyboard(tag);
      await userEvent.keyboard('{Enter}');

      await waitFor(async () => {
        await expect(canvas.getByText(tag)).toBeInTheDocument();
      });

      // Ark/Zag clears the input value via a requestAnimationFrame-deferred
      // setElementValue() call. waitFor polls until el.value is truly empty.
      await waitFor(async () => {
        await expect(input).toHaveValue('');
      });

      // Reset user-event's internal UIValue Symbol. Zag's setElementValue()
      // does not call setUIValue(), so the Symbol is stale (still set to the
      // just-submitted tag name). userEvent.clear() fires select-all + delete,
      // which calls setUIValue(el, "") and resets the Symbol before the next
      // iteration's typing begins.
      await userEvent.clear(input);
    }

    // All three tags should be present simultaneously.
    for (const tag of tagNames) {
      await expect(canvas.getByText(tag)).toBeInTheDocument();
    }
  },
};
