import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Steps } from './Steps';

const defaultItems = [
  {
    value: 'account',
    title: 'Account details',
    content: 'Fill in your account information.',
  },
  {
    value: 'personal',
    title: 'Personal info',
    content: 'Tell us a bit about yourself.',
  },
  {
    value: 'confirm',
    title: 'Confirmation',
    content: 'Review and confirm your details.',
  },
];

const meta: Meta<typeof Steps> = {
  title: 'Components/Navigation/Steps',
  component: Steps,
  args: {
    items: defaultItems,
    completedContent: 'All steps complete!',
  },
  argTypes: {
    defaultStep: { control: { type: 'number', min: 0 } },
    linear: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          // Ark's Steps anatomy nests each step trigger inside a presentational
          // Item <div> (List[role=tablist] > Item[div] > Trigger[role=tab]), so
          // axe's aria-required-children sees a non-tab child of the tablist.
          // The Zag/APG keyboard + ARIA semantics are correct (triggers are real
          // role=tab with aria-selected/controls); this is a DOM-nesting quirk of
          // the headless primitive, not an operability or announcement defect.
          { id: 'aria-required-children', enabled: false },
        ],
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Steps>;

export const Default: Story = {};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const Linear: Story = {
  args: { linear: true },
};

export const StartAtSecondStep: Story = {
  args: { defaultStep: 1 },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // Ark v5 Steps renders step triggers as role="tab" inside a role="tablist".
    // The Back/Next action buttons are plain <button> elements (role="button").
    const tabs = canvas.getAllByRole('tab');
    const firstTab = tabs[0];
    if (!firstTab) throw new Error('expected at least one step tab trigger');

    // The Next action button is identifiable by its accessible name.
    const nextBtn = canvas.getByRole('button', { name: /next/i });

    // Verify the first tab trigger is keyboard-reachable.
    await step('first tab trigger is focusable', async () => {
      await expect(firstTab).not.toHaveAttribute('tabindex', '-1');
    });

    // Navigate to step 2 via the Next button using keyboard activation.
    await step('Enter on Next advances to step 2', async () => {
      nextBtn.focus();
      await userEvent.keyboard('{Enter}');
    });

    // After advancing, the second indicator should carry data-current.
    await step('second indicator shows data-current', async () => {
      const indicators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='indicator']",
      );
      const second = indicators[1];
      if (!second) throw new Error('expected a second indicator');
      await expect(second).toHaveAttribute('data-current');
    });

    // The first separator should now be complete.
    await step('first separator shows data-complete', async () => {
      const separators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='separator']",
      );
      const first = separators[0];
      if (!first) throw new Error('expected a first separator');
      await expect(first).toHaveAttribute('data-complete');
    });

    // getComputedStyle backstop: confirms --token-* CSS custom properties
    // actually resolved to a real, non-transparent color.
    await step('current indicator has a real background color', async () => {
      const indicators = canvasElement.querySelectorAll(
        "[data-scope='steps'][data-part='indicator']",
      );
      const second = indicators[1];
      if (!second) throw new Error('expected a second indicator');
      const style = window.getComputedStyle(second);
      await expect(style.backgroundColor).not.toBe('');
      await expect(style.backgroundColor).not.toBe('transparent');
      await expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  },
};

export const DisabledPrevAtStart: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // On the first step the Back button must be disabled.
    // PrevTrigger renders as a native <button disabled> — toBeDisabled() is safe.
    await step('Prev button is disabled on the first step', async () => {
      const prevBtn = canvas.getByRole('button', { name: /back/i });
      await expect(prevBtn).toBeDisabled();
    });
  },
};
