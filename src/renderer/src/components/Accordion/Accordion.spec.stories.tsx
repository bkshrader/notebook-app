import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { Accordion } from './Accordion';

/**
 * Interaction / accessibility tests for the Accordion.
 *
 * Kept separate from the visual stories (`Accordion.stories.tsx`) per the
 * `*.spec.stories.tsx` convention (docs/research/storybook-testing.md): a `play`
 * function drives and MUTATES the rendered state, so colocating it with a doc
 * story would make that story animate/flash on load. These stories are named by
 * behavior so a failure is self-describing, each asserts (a `play` without
 * `expect` is a state-setter, not a test), and each uses `step()` for readable
 * runner / Interactions-panel output.
 *
 * Hidden from the docs sidebar via `tags: ['!autodocs']`-style intent: they are
 * test cases, not documentation. (They still run in the test runner and count
 * toward coverage.)
 */
const items = [
  {
    value: 'what',
    title: 'What is this app?',
    content: 'An accessibility-first, local-first note-taking app for academics.',
  },
  {
    value: 'how',
    title: 'How do I get started?',
    content: 'Open a Library folder, create a Project, and start writing Notes.',
  },
  {
    value: 'why',
    title: 'Why local-first?',
    content: 'Your notes live as plain Markdown files on disk. No cloud account required.',
  },
];

const meta: Meta<typeof Accordion> = {
  title: 'Components/Disclosure/Accordion/Tests',
  component: Accordion,
  args: { items, type: 'card', size: 'medium' },
  // Mark as test-only so these don't clutter the docs gallery.
  tags: ['test'],
};

export default meta;

type Story = StoryObj<typeof Accordion>;

/** The first two item triggers, by accessible name — used across open/close tests. */
function firstTwoTriggers(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  return {
    first: canvas.getByRole('button', { name: 'What is this app?' }),
    second: canvas.getByRole('button', { name: 'How do I get started?' }),
  };
}

/** The Helios structural contract: chevron-first, heading-wrapped, card-styled. */
export const StructureContract: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: 'What is this app?' });

    await step('chevron precedes the label in DOM order', async () => {
      const indicator = first.querySelector('[data-part="item-indicator"]');
      const label = first.querySelector('[data-part="toggle-content"]');
      await expect(indicator).not.toBeNull();
      await expect(label).not.toBeNull();
      await expect(
        indicator!.compareDocumentPosition(label!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    await step('each toggle is wrapped in the configured heading element', async () => {
      const heading = canvasElement.querySelector('h3[data-part="item-heading"]');
      await expect(heading).not.toBeNull();
      await expect(heading!.contains(first)).toBe(true);
    });

    await step('card item resolves a real background and a box-shadow', async () => {
      const item = canvasElement.querySelector<HTMLElement>('[data-part="item"][data-type="card"]');
      await expect(item).not.toBeNull();
      const cs = getComputedStyle(item!);
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(cs.boxShadow).not.toBe('none');
    });
  },
};

/** Keyboard opens and closes a panel; opening does not recolor the label. */
export const KeyboardNavigation: Story = {
  args: { defaultValue: [] },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole('button', { name: 'What is this app?' });

    await step('starts collapsed and is keyboard-reachable', async () => {
      await expect(first).toHaveAttribute('aria-expanded', 'false');
      await expect(first).not.toHaveAttribute('tabindex', '-1');
    });

    await step('Enter opens the panel without recoloring the label', async () => {
      const label = first.querySelector<HTMLElement>('[data-part="toggle-content"]')!;
      const colorClosed = getComputedStyle(label).color;
      first.focus();
      await userEvent.keyboard('{Enter}');
      await expect(first).toHaveAttribute('aria-expanded', 'true');
      await expect(getComputedStyle(label).color).toBe(colorClosed);
    });

    await step('Enter again closes the panel (collapsible default)', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(first).toHaveAttribute('aria-expanded', 'false');
    });

    await step('keyboard focus renders a visible focus ring', async () => {
      // Regression guard: the ring is drawn on the trigger's ::before via the
      // native :focus-visible pseudo (Ark exposes NO data-focus-visible attr).
      // userEvent.tab() produces a real keyboard focus that triggers
      // :focus-visible, unlike programmatic .focus().
      first.blur();
      await userEvent.tab();
      await expect(first).toHaveFocus();
      const ring = getComputedStyle(first, '::before').boxShadow;
      await expect(ring).not.toBe('none');
      await expect(ring).not.toBe('');
    });
  },
};

/** Multiple items can be open at once (the Helios-matching default). */
export const MultipleOpen: Story = {
  args: { defaultValue: [] },
  play: async ({ canvasElement, step }) => {
    const { first, second } = firstTwoTriggers(canvasElement);

    await step('opening a second item leaves the first open', async () => {
      first.focus();
      await userEvent.keyboard('{Enter}');
      second.focus();
      await userEvent.keyboard('{Enter}');
      await expect(first).toHaveAttribute('aria-expanded', 'true');
      await expect(second).toHaveAttribute('aria-expanded', 'true');
    });
  },
};

/** Single-open mode (`multiple={false}`): opening one closes the other. */
export const SingleOpen: Story = {
  args: { multiple: false, defaultValue: ['what'] },
  play: async ({ canvasElement, step }) => {
    const { first, second } = firstTwoTriggers(canvasElement);

    await step('opening a second item closes the first', async () => {
      await expect(first).toHaveAttribute('aria-expanded', 'true');
      second.focus();
      await userEvent.keyboard('{Enter}');
      await expect(second).toHaveAttribute('aria-expanded', 'true');
      await expect(first).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

/** A disabled item exposes its disabled state to AT and is inoperable. */
export const DisabledIsInert: Story = {
  args: {
    items: [
      { value: 'enabled', title: 'Available section', content: 'This section can be opened.' },
      {
        value: 'disabled',
        title: 'Unavailable section',
        content: 'This content is not reachable.',
        disabled: true,
      },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const disabled = canvas.getByRole('button', { name: 'Unavailable section' });

    await step('disabled state is exposed to assistive technology', async () => {
      // Native `disabled` is in the accessibility tree (announced as
      // "dimmed"/"unavailable"); toBeDisabled() asserts that AT-exposed state.
      await expect(disabled).toBeDisabled();
      await expect(disabled).toHaveAttribute('disabled');
    });

    await step('disabled trigger cannot be activated', async () => {
      await expect(disabled).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(disabled, { pointerEventsCheck: 0 });
      await expect(disabled).toHaveAttribute('aria-expanded', 'false');
    });
  },
};

/** A static item is non-interactive: no button, chevron hidden. */
export const StaticIsInert: Story = {
  args: {
    items: [
      {
        value: 'static',
        title: 'Always-visible heading',
        content: 'A static item cannot be collapsed and shows no chevron.',
        isStatic: true,
      },
      { value: 'normal', title: 'A normal toggle', content: 'This one still expands.' },
    ],
  },
  play: async ({ canvasElement, step }) => {
    await step('static item exposes no toggle button and hides its chevron', async () => {
      const staticItem = canvasElement.querySelector<HTMLElement>(
        '[data-part="item"][data-static]',
      );
      await expect(staticItem).not.toBeNull();
      await expect(staticItem!.querySelector('button')).toBeNull();
      const chevron = staticItem!.querySelector<HTMLElement>('[data-part="item-indicator"]');
      await expect(chevron).not.toBeNull();
      await expect(getComputedStyle(chevron!).visibility).toBe('hidden');
    });
  },
};

/** Contains-interactive: chevron is a bordered icon button that toggles; the
 *  in-header link stays independently reachable. */
export const ContainsInteractiveToggles: Story = {
  args: {
    items: [
      {
        value: 'ci',
        title: (
          <span>
            Section with a <a href="https://example.com">link</a> in the header
          </span>
        ),
        content: 'Only the chevron expands this section; the link is independently clickable.',
        containsInteractive: true,
        toggleLabel: 'Toggle section',
      },
    ],
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole('button', { name: 'Toggle section' });

    await step('the chevron toggle is a bordered icon button (Helios)', async () => {
      const cs = getComputedStyle(toggle);
      await expect(cs.borderTopWidth).not.toBe('0px');
      await expect(cs.boxShadow).not.toBe('none');
      await expect(cs.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    await step('chevron precedes the label (Helios order)', async () => {
      const label = canvasElement.querySelector('[data-part="toggle-content"]')!;
      await expect(
        toggle.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    await step('the section opens and closes via the chevron', async () => {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    await step('the in-header link remains independently reachable', async () => {
      const link = canvas.getByRole('link', { name: 'link' });
      await expect(link).toBeInTheDocument();
    });
  },
};

/** The configurable heading wrapper renders the chosen element. */
export const HeadingTagApplied: Story = {
  args: { titleTag: 'h2', defaultValue: ['what'] },
  play: async ({ canvasElement }) => {
    const heading = canvasElement.querySelector('h2[data-part="item-heading"]');
    await expect(heading).not.toBeNull();
  },
};
