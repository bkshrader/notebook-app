import { forwardRef } from 'react';

import './StepperIndicator.css';

/**
 * Indicator type, per the Helios Stepper Indicator spec
 * (https://helios.hashicorp.design/components/stepper/indicator):
 *   - `step` — shows the step number text inside the hexagon (the numbered dot).
 *   - `task` — shows an icon inside the hexagon (no sequence number).
 */
export type StepperIndicatorType = 'step' | 'task';

/**
 * Lifecycle status of the indicator. Drives the hexagon fill/stroke + text color
 * (see StepperIndicator.css), mirroring the Helios status set:
 *   - `incomplete` — not started (outlined hexagon, neutral text).
 *   - `progress`   — the current step (filled action hexagon, contrast text).
 *   - `processing` — current step doing async work (filled, shows a spinner).
 *   - `complete`   — finished (faint action fill, action stroke, check icon).
 */
export type StepperIndicatorStatus = 'incomplete' | 'progress' | 'processing' | 'complete';

export interface StepperIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * Accessible name for the indicator (WCAG 4.1.2). The Stepper Indicator is a
   * visual decorator that is *not* WCAG-conformant in isolation (per Helios), so
   * when it carries meaning on its own it MUST be named — e.g.
   * `"Step 2 of 4: in progress"`. Applied as `aria-label` on the root.
   */
  label: string;
  /** `step` (numbered) or `task` (icon-only). Defaults to `step`. */
  type?: StepperIndicatorType;
  /** Lifecycle status. Defaults to `incomplete`. */
  status?: StepperIndicatorStatus;
  /**
   * The 1-based step number rendered inside a `type="step"` indicator that is
   * not yet `complete`. Ignored for `task` indicators and for the `complete`
   * status (which shows a check icon instead).
   */
  step?: number;
}

/** The hexagon outline/fill — a presentational SVG behind the status overlay. */
function Hexagon() {
  return (
    <svg
      data-part="hexagon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11 1.155a2 2 0 0 1 2 0l7.66 4.423a2 2 0 0 1 1 1.732v8.845a2 2 0 0 1-1 1.732L13 22.845a2 2 0 0 1-2 0l-7.66-4.423a2 2 0 0 1-1-1.732V7.31a2 2 0 0 1 1-1.732z" />
    </svg>
  );
}

/** Check glyph shown for the `complete` status. */
function CheckIcon() {
  return (
    <svg
      data-part="icon"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 4.5 6.5 11 3 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Spinner glyph shown for the `processing` status (animated; motion-suppressed in CSS). */
function SpinnerIcon() {
  return (
    <svg
      data-part="icon"
      data-spinner=""
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.25"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Resolve the glyph rendered inside the hexagon for a given type/status. Kept as
 * a small lookup (not nested ternaries) so the component's cyclomatic complexity
 * stays low.
 */
function StatusContent({
  type,
  status,
  step,
}: {
  type: StepperIndicatorType;
  status: StepperIndicatorStatus;
  step?: number;
}): React.ReactNode {
  if (status === 'complete') return <CheckIcon />;
  if (status === 'processing') return <SpinnerIcon />;
  if (type === 'step') {
    return <span data-part="text">{step}</span>;
  }
  // A `task` indicator that is incomplete/in-progress shows a neutral dot icon.
  return (
    <svg data-part="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * Token-styled presentational wrapper built to the Helios Stepper Indicator
 * specification (https://helios.hashicorp.design/components/stepper/indicator).
 *
 * Per the unstyled-primitives-ark ADR (2026-06-02 scope clarification), this is
 * a PRESENTATIONAL component: a single step/task indicator dot is a visual
 * decorator with no focus/keyboard/selection state of its own (that interaction
 * lives in the parent Steps/Stepper), and Ark exposes no primitive for an
 * indicator in isolation. It is therefore built on a semantic `<span>` with our
 * own `data-part` attributes (no Ark scope/part, no class names).
 *
 * Anatomy (mirrors Helios `hds-stepper-indicator-step`):
 *   root[span] > hexagon[svg] + status[span] > (text | icon)
 *
 * Helios maps statuses to raw `--token-color-palette-blue-*` values; this
 * project forbids palette tokens (semantic only), so the equivalents are mapped
 * to semantic action/surface/border tokens in StepperIndicator.css.
 */
export const StepperIndicator = forwardRef<HTMLSpanElement, StepperIndicatorProps>(
  function StepperIndicator({ label, type = 'step', status = 'incomplete', step, ...rest }, ref) {
    return (
      <span
        ref={ref}
        data-part="root"
        data-type={type}
        data-status={status}
        role="img"
        aria-label={label}
        {...rest}
      >
        <Hexagon />
        <span data-part="status">
          <StatusContent type={type} status={status} step={step} />
        </span>
      </span>
    );
  },
);
