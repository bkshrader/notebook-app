import { forwardRef } from 'react';

import { Slider as ArkSlider, type SliderRootProps } from '@ark-ui/react/slider';

import './Slider.css';

export interface SliderProps extends SliderRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2). A slider
   * with no accessible name fails the Name, Role, Value success criterion.
   */
  label: React.ReactNode;
  /** When true, renders a text display of the current value beside the label. */
  showValueText?: boolean;
}

/**
 * Token-styled wrapper over Ark UI's Slider.
 *
 * Anatomy (from @ark-ui/react/slider): Root > Label + ValueText + Control >
 * Track > Range, plus one or more Thumbs (each containing HiddenInput). Ark/Zag
 * own the wiring: each HiddenInput becomes a native `<input type="range">` with
 * `role="slider"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and
 * `aria-label` from the Slider.Label. The Control and Track are purely
 * presentational, carrying `data-state` / `data-disabled` / `data-focus-visible`
 * for styling.
 *
 * Styling attaches to Ark's `data-scope` / `data-part` attributes (see
 * Slider.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { label, showValueText = true, children, ...rootProps },
  ref,
) {
  return (
    <ArkSlider.Root ref={ref} defaultValue={[50]} {...rootProps}>
      <div data-scope="slider" data-part="header">
        <ArkSlider.Label>{label}</ArkSlider.Label>
        {showValueText && <ArkSlider.ValueText />}
      </div>
      <ArkSlider.Control>
        <ArkSlider.Track>
          <ArkSlider.Range />
        </ArkSlider.Track>
        <ArkSlider.Thumb index={0}>
          <ArkSlider.HiddenInput />
        </ArkSlider.Thumb>
      </ArkSlider.Control>
      {children}
    </ArkSlider.Root>
  );
});
