import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { ColorPicker } from './ColorPicker';

/**
 * Interaction / accessibility tests for the ColorPicker.
 *
 * Kept separate from the visual stories (`ColorPicker.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions ASSERT against the
 * rendered DOM / computed styles, so they are test cases, not documentation.
 * They are named by behavior, use `step()` for readable runner output, and each
 * `await`s real `expect(...)` (Storybook matchers are async).
 *
 * Tier D (color-picker): the popover Content is portalled OUTSIDE the story
 * canvas, so the panel and its sliders/swatches are queried via `document.body`
 * and awaited with `findBy*`/`waitFor` to ride out the open/close animation.
 *
 * Hidden from the docs gallery via `tags: ['test']`.
 */
const meta: Meta<typeof ColorPicker> = {
  title: 'Components/Forms/ColorPicker/Tests',
  component: ColorPicker,
  args: { label: 'Brand color' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof ColorPicker>;

/** The Helios/Ark structural + ARIA contract for the closed control. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('label renders and is associated', async () => {
      await expect(canvas.getByText('Brand color')).toBeTruthy();
    });

    await step('trigger is a keyboard-reachable button', async () => {
      const trigger = canvas.getByRole('button');
      await expect(trigger).not.toHaveAttribute('tabindex', '-1');
      await expect(
        canvasElement.querySelector("[data-scope='color-picker'][data-part='trigger']"),
      ).not.toBeNull();
    });

    await step('a hidden native input is present for form submission', async () => {
      // Ark's HiddenInput is a bare native <input> (no data-part); it lives
      // inside the color-picker root and is hidden from the a11y tree.
      const root = canvasElement.querySelector("[data-scope='color-picker'][data-part='root']")!;
      const hidden = root.querySelector('input');
      await expect(hidden).not.toBeNull();
    });

    await step('trigger resolves a real border token (Helios form-control style)', async () => {
      const trigger = canvasElement.querySelector<HTMLElement>(
        "[data-scope='color-picker'][data-part='trigger']",
      )!;
      const cs = getComputedStyle(trigger);
      // The form-control border token resolves to a non-zero width.
      await expect(parseFloat(cs.borderTopWidth)).toBeGreaterThan(0);
    });
  },
};

/** Keyboard opens the popover, focus enters it, Esc closes + restores focus. */
export const KeyboardOpensPopover: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const trigger = canvas.getByRole('button');

    await step('Enter opens the portalled popover', async () => {
      trigger.focus();
      await expect(trigger).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      const content = await waitFor(() => {
        const el = document.querySelector<HTMLElement>(
          "[data-scope='color-picker'][data-part='content']",
        );
        if (!el) throw new Error('popover content not yet rendered');
        return el;
      });
      await expect(content).toHaveAttribute('data-state', 'open');
    });

    await step('the area + channel sliders expose role="slider"', async () => {
      // Ark gives the area thumb and each channel-slider thumb the slider role
      // with the arrow-key contract. They render inside the portalled content.
      const sliders = body.getAllByRole('slider');
      await expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    await step('Escape closes the popover and restores focus to the trigger', async () => {
      await userEvent.keyboard('{Escape}');
      // Ark keeps the Content mounted and toggles data-state to "closed" (it is
      // hidden, not unmounted), so assert the state transition rather than removal.
      await waitFor(async () => {
        const content = document.querySelector("[data-scope='color-picker'][data-part='content']");
        await expect(content).toHaveAttribute('data-state', 'closed');
      });
      await waitFor(async () => {
        await expect(trigger).toHaveFocus();
      });
    });
  },
};

/** Preset swatches render as keyboard-focusable buttons inside the popover. */
export const SwatchesAreReachable: Story = {
  args: {
    label: 'Highlight color',
    swatches: ['#2872f5', '#08875d', '#c00005'],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button');

    await step('opening the popover reveals the swatch group', async () => {
      trigger.focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => {
        const group = document.querySelector(
          "[data-scope='color-picker'][data-part='swatch-group']",
        );
        if (!group) throw new Error('swatch group not yet rendered');
      });
    });

    await step('each preset is a keyboard-focusable swatch trigger', async () => {
      const triggers = document.querySelectorAll<HTMLButtonElement>(
        "[data-scope='color-picker'][data-part='swatch-trigger']",
      );
      await expect(triggers.length).toBe(3);
      for (const t of triggers) {
        await expect(t).not.toHaveAttribute('tabindex', '-1');
      }
    });

    await step('close the popover to leave a clean state', async () => {
      await userEvent.keyboard('{Escape}');
      // Content stays mounted and toggles data-state to "closed".
      await waitFor(async () => {
        const content = document.querySelector("[data-scope='color-picker'][data-part='content']");
        await expect(content).toHaveAttribute('data-state', 'closed');
      });
    });
  },
};

/** The disabled control reports its disabled state on the trigger. */
export const DisabledState: Story = {
  args: { label: 'Disabled', disabled: true },
  play: async ({ canvasElement, step }) => {
    await step('the trigger carries the disabled contract', async () => {
      const trigger = canvasElement.querySelector<HTMLButtonElement>(
        "[data-scope='color-picker'][data-part='trigger']",
      )!;
      await expect(trigger).toBeDisabled();
    });
  },
};
