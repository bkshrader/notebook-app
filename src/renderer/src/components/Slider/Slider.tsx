import { forwardRef } from 'react';

import { Slider as ArkSlider, type SliderRootProps } from '@ark-ui/react/slider';

import './Slider.css';

/** Size scale, set once at the root level. Drives the local `--slider-*` matrix. */
export type SliderSize = 'small' | 'medium' | 'large';

export interface SliderProps extends SliderRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2). A slider
   * with no accessible name fails the Name, Role, Value success criterion.
   */
  label: React.ReactNode;
  /** When true, renders a text display of the current value beside the label. */
  showValueText?: boolean;
  /** Size scale for thumb, track, and label typography. Defaults to `medium`. */
  size?: SliderSize;
}

/**
 * Token-styled wrapper over Ark UI's Slider.
 *
 * Anatomy (from @ark-ui/react/slider): Root > Label + ValueText + Control >
 * Track > Range, plus one Thumb per value entry (each containing a HiddenInput).
 * Ark/Zag own the wiring: the Thumb is a `div` with `role="slider"`,
 * `tabindex="0"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax`, and an
 * `aria-label` derived from the Slider.Label — it is the focusable element. The
 * Control, Track, and Range are presentational and carry Ark state attributes
 * (data-disabled, data-orientation, data-dragging, data-invalid, data-focus) for
 * styling. Ark does NOT emit data-focus-visible; the keyboard focus ring uses the
 * native :focus-visible pseudo (see Slider.css).
 *
 * Multi-thumb (range) sliders are supported: pass a `value`/`defaultValue` array
 * with more than one entry and a thumb is rendered for each.
 *
 * Styling attaches to Ark's `data-scope` / `data-part` attributes (see
 * Slider.css) per the unstyled-primitives-ark ADR — no custom class names.
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { label, showValueText = true, size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkSlider.Root ref={ref} data-size={size} defaultValue={[50]} {...rootProps}>
      <div data-scope="slider" data-part="header">
        <ArkSlider.Label>{label}</ArkSlider.Label>
        {showValueText && <ArkSlider.ValueText />}
      </div>
      <ArkSlider.Control>
        <ArkSlider.Track>
          <ArkSlider.Range />
        </ArkSlider.Track>
        {/* One thumb per value entry — single-thumb by default, range when the
            consumer supplies a multi-entry value/defaultValue array. */}
        <ArkSlider.Context>
          {(slider) =>
            slider.value.map((_, index) => (
              <ArkSlider.Thumb key={index} index={index}>
                <ArkSlider.HiddenInput />
              </ArkSlider.Thumb>
            ))
          }
        </ArkSlider.Context>
      </ArkSlider.Control>
      {children}
    </ArkSlider.Root>
  );
});
