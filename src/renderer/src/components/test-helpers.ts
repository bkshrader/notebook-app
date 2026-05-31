/**
 * Shared Storybook play-test helpers for the Component Library.
 *
 * These factor out the interaction/assertion sequences that are identical across
 * many component stories (overlay open/close cycles, computed-style backstops).
 * Keeping them here — rather than copy-pasting into each `*.stories.tsx` — keeps
 * the per-component play tests focused on what is unique to that component and
 * satisfies the duplication gate.
 *
 * Not a story file (no `.stories.` in the name), so it is excluded from the
 * Storybook glob; it is reachable via the stories that import it.
 */
import { expect, userEvent, waitFor, within } from 'storybook/test';

/**
 * Drives and asserts the full keyboard contract for a Tier-B overlay whose
 * content renders in a Portal (dialog, drawer, popover, …): the trigger is
 * keyboard-reachable; Enter opens it; focus moves into the portalled panel; Esc
 * closes it and returns focus to the trigger.
 *
 * @param canvasElement  the story's `canvasElement`.
 * @param step           the play context's `step`.
 * @param opts.triggerName  accessible name (string or RegExp) of the trigger button.
 * @param opts.panelRole    ARIA role of the portalled panel (default 'dialog').
 * @param opts.noun         human label used in step names (default 'panel').
 */
// Structural type for the play context's `step` — accepts Storybook's
// StepFunction without importing renderer-specific generics. The label and an
// async callback are all this helper needs.
type StepFn = (name: string, fn: () => Promise<void>) => unknown;

export async function assertOverlayKeyboardCycle(
  canvasElement: HTMLElement,
  step: StepFn,
  opts: { triggerName: string | RegExp; panelRole?: string; noun?: string },
): Promise<void> {
  const panelRole = opts.panelRole ?? 'dialog';
  const noun = opts.noun ?? 'panel';
  const canvas = within(canvasElement);
  const body = within(document.body);
  const trigger = canvas.getByRole('button', { name: opts.triggerName });

  await step('trigger is keyboard-reachable', async () => {
    await expect(trigger).not.toHaveAttribute('tabindex', '-1');
    trigger.focus();
    await expect(trigger).toHaveFocus();
  });

  await step(`Enter opens the ${noun}`, async () => {
    await userEvent.keyboard('{Enter}');
    // Portalled — findByRole retries, riding out the enter animation.
    const panel = await body.findByRole(panelRole);
    await expect(panel).toHaveAttribute('data-state', 'open');
  });

  await step(`focus moves into the ${noun}`, async () => {
    const panel = body.getByRole(panelRole);
    await expect(panel).toContainElement(document.activeElement as HTMLElement);
  });

  await step(`Escape closes the ${noun}`, async () => {
    await userEvent.keyboard('{Escape}');
    // Exit animation may delay unmount; waitFor retries until it is gone.
    await waitFor(async () => {
      await expect(body.queryByRole(panelRole)).toBeNull();
    });
  });

  await step('focus returns to the trigger after close', async () => {
    await expect(trigger).toHaveFocus();
  });
}
