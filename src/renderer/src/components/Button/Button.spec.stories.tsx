import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Button } from './Button';

/**
 * Interaction / accessibility tests for the Button.
 *
 * Kept separate from the visual stories (`Button.stories.tsx`) per the
 * `*.spec.stories.tsx` convention: these `play` functions drive the keyboard
 * path and assert the native button contract. Each story is behavior-named so a
 * failure is self-describing, each `await`s real `expect`s, and each uses
 * `step()` for readable runner / Interactions-panel output. `tags: ['test']`
 * keeps them out of the docs gallery.
 *
 * Button has no Ark primitive — it is a native `<button>`. The contract under
 * test is therefore the native one: `role="button"`, keyboard activation,
 * native `disabled`, and the keyboard-only `:focus-visible` ring. The axe gate
 * (`a11y.test: 'error'` in preview) runs on every story automatically.
 */

const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M3 8h10M9 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const meta: Meta<typeof Button> = {
  title: 'Components/Actions/Button/Tests',
  component: Button,
  args: { children: 'Button', color: 'primary', size: 'medium' },
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Button>;

/** Exposes a native button with its text as the accessible name (WCAG 4.1.2),
 * and defaults to type="button" so it never submits a surrounding form. */
export const ExposesButtonRoleAndName: Story = {
  args: { children: 'Save changes' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('renders a button exposing its text as the accessible name', async () => {
      const button = canvas.getByRole('button', { name: 'Save changes' });
      await expect(button).toBeInTheDocument();
      await expect(button.tagName).toBe('BUTTON');
    });

    await step('defaults to type="button" (does not submit forms)', async () => {
      const button = canvas.getByRole('button', { name: 'Save changes' });
      await expect(button).toHaveAttribute('type', 'button');
    });
  },
};

/** A click fires the native onClick once. */
export const ClickActivates: Story = {
  args: { children: 'Activate' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    let clicks = 0;
    const button = canvas.getByRole('button', { name: 'Activate' });
    button.addEventListener('click', () => {
      clicks += 1;
    });

    await step('pointer click activates the button once', async () => {
      await userEvent.click(button);
      await expect(clicks).toBe(1);
    });
  },
};

/** The button is keyboard-reachable and activates on Enter and Space. */
export const KeyboardActivation: Story = {
  args: { children: 'Submit' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    let activations = 0;
    const button = canvas.getByRole('button', { name: 'Submit' });
    button.addEventListener('click', () => {
      activations += 1;
    });

    await step('Tab moves focus to the button', async () => {
      button.blur();
      await userEvent.tab();
      await waitFor(() => expect(button).toHaveFocus());
    });

    await step('Enter activates the focused button', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(activations).toBe(1);
    });

    await step('Space activates the focused button', async () => {
      await userEvent.keyboard(' ');
      await expect(activations).toBe(2);
    });
  },
};

/** Keyboard focus draws the native :focus-visible ring; a programmatic focus
 *  alone must not (the ring is keyboard-only — WCAG 2.4.7). */
export const FocusVisibleRing: Story = {
  args: { children: 'Focus me' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Focus me' });

    await step('keyboard focus renders a visible focus ring (box-shadow)', async () => {
      button.blur();
      await userEvent.tab();
      await waitFor(() => expect(button).toHaveFocus());
      const ring = getComputedStyle(button).boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** A disabled button is exposed to AT and is inoperable. */
export const DisabledIsInert: Story = {
  args: { children: 'Unavailable', disabled: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Unavailable' });
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks += 1;
    });

    await step('disabled state is exposed to assistive technology', async () => {
      await expect(button).toBeDisabled();
      await expect(button).toHaveAttribute('disabled');
    });

    await step('disabled button cannot be activated', async () => {
      await userEvent.click(button, { pointerEventsCheck: 0 });
      await expect(clicks).toBe(0);
    });
  },
};

/** The loading state disables the button, marks it busy, and shows a spinner
 *  while preserving the original label text in the (hidden) DOM. */
export const LoadingIsBusyAndInert: Story = {
  args: { children: 'Saving', isLoading: true },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Saving' });

    await step('loading marks the button busy and disabled', async () => {
      await expect(button).toHaveAttribute('aria-busy', 'true');
      await expect(button).toBeDisabled();
    });

    await step('a spinner is rendered and the label is preserved', async () => {
      const spinner = button.querySelector('[data-part="spinner"]');
      await expect(spinner).not.toBeNull();
      const text = button.querySelector('[data-part="text"]');
      await expect(text).not.toBeNull();
    });
  },
};

/** An icon-only button names itself via aria-label; its icon is decorative. */
export const IconOnlyHasAccessibleName: Story = {
  args: { children: undefined, leadingIcon: <Arrow />, 'aria-label': 'Next page' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('the button is named by its aria-label', async () => {
      const button = canvas.getByRole('button', { name: 'Next page' });
      await expect(button).toBeInTheDocument();
      await expect(button).toHaveAttribute('data-icon-only');
    });

    await step('the icon is hidden from assistive technology', async () => {
      const button = canvas.getByRole('button', { name: 'Next page' });
      const icon = button.querySelector('[data-part="icon"]');
      await expect(icon).not.toBeNull();
      await expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  },
};

/** Each color resolves a real (non-transparent) foreground; the primary fill
 *  resolves a real background — a computed-style backstop against a dropped
 *  token (a property computing to the initial value would mean a wrong token). */
export const ColorTokensResolve: Story = {
  args: { color: 'primary', children: 'Primary' },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: 'Primary' });

    await step('primary resolves a real fill and foreground', async () => {
      const cs = getComputedStyle(button);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.color).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.borderTopWidth).toBe('1px');
    });
  },
};
