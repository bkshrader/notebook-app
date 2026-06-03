import { forwardRef } from 'react';

import { Steps as ArkSteps, type StepsRootProps } from '@ark-ui/react/steps';

import { Button } from '../Button';

import './StepperNav.css';

/**
 * A single step descriptor rendered in the navigation list.
 */
export interface StepperNavStep {
  /** Stable identifier for the step. */
  value: string;
  /** Step title — the step trigger's accessible name. Required (WCAG 4.1.2). */
  title: string;
  /** Optional secondary description shown under the title. */
  description?: React.ReactNode;
  /**
   * Optional panel content for the interactive variant. Each interactive step
   * trigger is a `role="tab"` that Ark wires to a `role="tabpanel"` via
   * `aria-controls`; the panel must exist for that reference to be valid, so the
   * matching `Steps.Content` is always rendered (empty when no `content` given).
   */
  content?: React.ReactNode;
}

/** Visual size scale. Drives the per-size `--stepper-nav-*` custom properties. */
export type StepperNavSize = 'small' | 'medium' | 'large';

export interface StepperNavProps extends StepsRootProps {
  /**
   * The ordered steps rendered in the navigation list. Ark's `count` is derived
   * from this array's length when `count` is not passed explicitly.
   */
  steps: StepperNavStep[];
  /**
   * Interactive (default) lets the user click a step trigger to jump to it;
   * non-interactive renders the same step list as a read-only ordered list with
   * no step buttons and no backwards navigation, per the Helios Stepper Nav spec.
   */
  interactive?: boolean;
  /**
   * Size scale — sets `data-size` on the root, which selects the indicator
   * diameter, label typography, and spacing. Defaults to `'medium'`.
   */
  size?: StepperNavSize;
  /** Label for the previous/back navigation Button. Defaults to `'Back'`. */
  prevLabel?: string;
  /** Label for the next navigation Button. Defaults to `'Next'`. */
  nextLabel?: string;
  /** Accessible label for the step list. Defaults to `'Progress'`. */
  'aria-label'?: string;
}

/** The title + optional description shown beside the indicator. */
function StepLabel({ step }: { step: StepperNavStep }) {
  return (
    <span data-scope="steps" data-part="step-label">
      <span data-scope="steps" data-part="step-title">
        {step.title}
      </span>
      {step.description != null ? (
        <span data-scope="steps" data-part="step-description">
          {step.description}
        </span>
      ) : null}
    </span>
  );
}

/** The read-only step state, derived from the resolved current index. */
function stepState(index: number, current: number): 'complete' | 'current' | 'incomplete' {
  if (index < current) return 'complete';
  if (index === current) return 'current';
  return 'incomplete';
}

/** A read-only step: indicator + label, no button, state from a data-attribute. */
function StaticStep({
  step,
  index,
  current,
  isLast,
}: {
  step: StepperNavStep;
  index: number;
  current: number;
  isLast: boolean;
}) {
  const state = stepState(index, current);
  return (
    <li data-scope="steps" data-part="item">
      <span data-scope="steps" data-part="static-step">
        <span data-scope="steps" data-part="indicator" data-state={state}>
          {index + 1}
        </span>
        <StepLabel step={step} />
      </span>
      {isLast ? null : (
        <span data-scope="steps" data-part="separator" data-state={state} aria-hidden="true" />
      )}
    </li>
  );
}

/**
 * The read-only variant: a semantic ordered list of static steps. It owns no
 * tab/tabpanel machine (it is presentational), so it sidesteps the tablist ARIA
 * entirely. Step state is derived from the resolved current index, and the
 * progress fill width is set inline.
 */
function StaticStepper({
  steps,
  current,
  ariaLabel,
}: {
  steps: StepperNavStep[];
  current: number;
  ariaLabel: string;
}) {
  const percent = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  return (
    <>
      <div
        data-scope="steps"
        data-part="progress"
        role="progressbar"
        aria-label={`${ariaLabel} progress`}
        aria-valuenow={current + 1}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        style={{ '--percent': percent } as React.CSSProperties}
      />
      <ol data-scope="steps" data-part="list" aria-label={ariaLabel}>
        {steps.map((step, index) => (
          <StaticStep
            key={step.value}
            step={step}
            index={index}
            current={current}
            isLast={index === steps.length - 1}
          />
        ))}
      </ol>
    </>
  );
}

/** An interactive step: an Ark trigger (role=tab) with indicator + label. */
function InteractiveStep({ step, index }: { step: StepperNavStep; index: number }) {
  return (
    <ArkSteps.Item index={index}>
      <ArkSteps.Trigger>
        <ArkSteps.Indicator>{index + 1}</ArkSteps.Indicator>
        <StepLabel step={step} />
      </ArkSteps.Trigger>
      <ArkSteps.Separator />
    </ArkSteps.Item>
  );
}

/**
 * The interactive variant: Ark's Steps state machine drives a roving tablist of
 * step triggers plus the prev/next action pair. Forward navigation is gated in
 * `linear` mode (the Helios default) and Ark disables Prev/Next at the
 * boundaries.
 */
function InteractiveStepper({
  steps,
  size,
  prevLabel,
  nextLabel,
  ariaLabel,
}: {
  steps: StepperNavStep[];
  size: StepperNavSize;
  prevLabel: string;
  nextLabel: string;
  ariaLabel: string;
}) {
  return (
    <>
      <ArkSteps.Progress aria-label={`${ariaLabel} progress`} />

      <ArkSteps.List aria-label={ariaLabel}>
        {steps.map((step, index) => (
          <InteractiveStep key={step.value} step={step} index={index} />
        ))}
      </ArkSteps.List>

      {/* Each role="tab" trigger is wired to a tabpanel via aria-controls; render
          the matching Content so that reference is valid (axe
          aria-valid-attr-value). Panels are empty unless a step supplies content. */}
      {steps.map((step, index) => (
        <ArkSteps.Content key={step.value} index={index}>
          {step.content}
        </ArkSteps.Content>
      ))}

      <div data-scope="steps" data-part="actions">
        <ArkSteps.PrevTrigger asChild>
          <Button color="secondary" size={size}>
            {prevLabel}
          </Button>
        </ArkSteps.PrevTrigger>
        <ArkSteps.NextTrigger asChild>
          <Button color="primary" size={size}>
            {nextLabel}
          </Button>
        </ArkSteps.NextTrigger>
      </div>
    </>
  );
}

/**
 * Token-styled wrapper over Ark UI's Steps, built to the Helios Stepper Nav
 * specification (https://helios.hashicorp.design/components/stepper/nav).
 *
 * Stepper Nav is the navigation pattern for a single-page multi-step flow: a
 * horizontal step list (indicators + titles) with a progress bar, plus a
 * previous/next action pair.
 *
 * Two variants, split into focused sub-components to keep this wrapper's
 * cyclomatic complexity low:
 *   - Interactive (default): Ark's Steps state machine drives a roving
 *     `role="tablist"` of step triggers; the user jumps backwards by activating
 *     a trigger and forwards once the current step is complete (`linear` mode).
 *     The prev/next controls are Ark's `Steps.PrevTrigger`/`NextTrigger`
 *     rendered `asChild` onto our `Button` (per the task hint), reusing the
 *     Helios Button visuals and inheriting Ark's boundary disabling.
 *   - Non-interactive (`interactive={false}`): a read-only semantic `<ol>` with
 *     no buttons and no tab machine, deriving step state from the resolved
 *     current index. Being presentational it carries no tablist ARIA.
 *
 * Styling targets Ark's data-scope / data-part attributes (and, for the static
 * variant, our own matching data-part attributes) per the unstyled-primitives-ark
 * ADR — no custom class names.
 */
// Cyclomatic 6 is the irreducible prop-defaulting surface (count/linear/step/
// defaultStep/ariaLabel fallbacks) plus the single interactive-vs-static mode
// branch; the two render bodies are already extracted to StaticStepper /
// InteractiveStepper. The inner function is named `StepperNavImpl` (not
// `StepperNav`) so it doesn't collide with the `const StepperNav` binding — that
// collision makes the coverage instrumenter mangle the name to `StepperNav2`,
// which fallow's name-keyed coverage matcher can't find, dropping the function to
// an estimated 0% and inflating its CRAP.
export const StepperNav = forwardRef<HTMLDivElement, StepperNavProps>(function StepperNavImpl(
  {
    steps,
    interactive = true,
    size = 'medium',
    prevLabel = 'Back',
    nextLabel = 'Next',
    count,
    linear,
    step,
    defaultStep,
    'aria-label': ariaLabel = 'Progress',
    ...rootProps
  },
  ref,
) {
  if (!interactive) {
    return (
      <div ref={ref} data-scope="steps" data-part="root" data-size={size} {...rootProps}>
        <StaticStepper steps={steps} current={step ?? defaultStep ?? 0} ariaLabel={ariaLabel} />
      </div>
    );
  }

  return (
    <ArkSteps.Root
      ref={ref}
      count={count ?? steps.length}
      // Interactive steppers default to linear gating (forward only when the
      // current step is complete) per the Helios spec; override via the prop.
      linear={linear ?? true}
      step={step}
      defaultStep={defaultStep}
      data-size={size}
      data-interactive=""
      {...rootProps}
    >
      <InteractiveStepper
        steps={steps}
        size={size}
        prevLabel={prevLabel}
        nextLabel={nextLabel}
        ariaLabel={ariaLabel}
      />
    </ArkSteps.Root>
  );
});
// The inner function is `StepperNavImpl` (see above); restore the public name for
// React devtools and error overlays.
StepperNav.displayName = 'StepperNav';
