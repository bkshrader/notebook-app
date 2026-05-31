import { forwardRef } from 'react';

import { Steps as ArkSteps, type StepsRootProps } from '@ark-ui/react/steps';

import './Steps.css';

export interface StepsItem {
  /** Stable identifier for the step. */
  value: string;
  /** Title shown in the step trigger — also its accessible name. */
  title: string;
  /** Content rendered in this step's panel. */
  content: React.ReactNode;
}

export interface StepsProps extends StepsRootProps {
  /**
   * The ordered list of step descriptors rendered as the step list. `count` is
   * derived from this array's length when omitted.
   */
  items: StepsItem[];
  /** Label for the "Back" navigation button. Defaults to "Back". */
  prevLabel?: string;
  /** Label for the "Next" navigation button. Defaults to "Next". */
  nextLabel?: string;
  /** Content rendered inside each step's content panel. */
  children?: React.ReactNode;
  /** Content rendered once all steps are complete. */
  completedContent?: React.ReactNode;
}

/**
 * Token-styled wrapper over Ark UI's Steps.
 *
 * Anatomy (from @ark-ui/react/steps): Root > List > Item > Trigger > Indicator,
 * Separator; Content[]; CompletedContent; PrevTrigger / NextTrigger.
 *
 * We keep Ark/Zag's native ARIA wiring (List = `tablist`, Trigger = `tab`,
 * Content = `tabpanel`) rather than overriding the roles — Zag re-applies
 * `aria-selected`/`aria-orientation` to match those roles, and fighting it only
 * trades one axe finding for another. The one residual axe note,
 * `aria-required-children` (Ark nests a presentational Item `<div>` between the
 * tablist and its tabs), is suppressed per-story in Steps.stories.tsx with a
 * rationale, since the Zag/APG keyboard semantics are correct.
 *
 * Styling targets Ark's data-scope / data-part attributes per the
 * unstyled-primitives-ark ADR — no custom class names.
 */
export const Steps = forwardRef<HTMLDivElement, StepsProps>(function Steps(
  {
    items,
    prevLabel = 'Back',
    nextLabel = 'Next',
    children,
    completedContent,
    count,
    ...rootProps
  },
  ref,
) {
  const resolvedCount = count ?? items.length;

  return (
    <ArkSteps.Root ref={ref} count={resolvedCount} {...rootProps}>
      <ArkSteps.List>
        {items.map((item, index) => (
          <ArkSteps.Item key={item.value} index={index}>
            <ArkSteps.Trigger>
              <ArkSteps.Indicator>{index + 1}</ArkSteps.Indicator>
              <span data-scope="steps" data-part="item-title">
                {item.title}
              </span>
            </ArkSteps.Trigger>
            <ArkSteps.Separator />
          </ArkSteps.Item>
        ))}
      </ArkSteps.List>

      {items.map((item, index) => (
        <ArkSteps.Content key={item.value} index={index}>
          {item.content}
        </ArkSteps.Content>
      ))}
      {children}

      <ArkSteps.CompletedContent>
        {completedContent ?? 'All steps complete!'}
      </ArkSteps.CompletedContent>

      <div data-scope="steps" data-part="actions">
        <ArkSteps.PrevTrigger>{prevLabel}</ArkSteps.PrevTrigger>
        <ArkSteps.NextTrigger>{nextLabel}</ArkSteps.NextTrigger>
      </div>
    </ArkSteps.Root>
  );
});
