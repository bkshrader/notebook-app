import { forwardRef } from 'react';

import {
  AngleSlider as ArkAngleSlider,
  type AngleSliderRootProps,
} from '@ark-ui/react/angle-slider';

import './AngleSlider.css';

export interface AngleSliderProps extends AngleSliderRootProps {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   *
   * Rendered via `AngleSlider.Label` which is associated with the thumb via
   * Ark/Zag's wiring. The thumb also accepts an `aria-label` fallback on the
   * root props if you omit a visible label, but a visible label is preferred.
   */
  label: React.ReactNode;
  /**
   * Degree markers to render around the circular track.
   * Defaults to cardinal + intercardinal points: [0, 45, 90, 135, 180, 225, 270, 315].
   */
  markers?: number[];
}

const DEFAULT_MARKERS = [0, 45, 90, 135, 180, 225, 270, 315];

/**
 * Token-styled wrapper over Ark UI's AngleSlider.
 *
 * Anatomy (from @ark-ui/react/angle-slider):
 *   Root > Label, Control > MarkerGroup > Marker*, Thumb, ValueText, HiddenInput
 *
 * The thumb (data-part="thumb") is the focusable interactive element with
 * role="slider"; it responds to Arrow keys for angular adjustment and exposes
 * data-state / data-disabled / data-focus-visible for styling.
 *
 * Styling targets Ark's data-scope/data-part attributes (per the
 * unstyled-primitives-ark ADR). CSS custom props --angle and --value injected
 * by Ark on the Root are used to drive the circular track visual.
 */
export const AngleSlider = forwardRef<HTMLDivElement, AngleSliderProps>(function AngleSlider(
  { label, markers = DEFAULT_MARKERS, children, ...rootProps },
  ref,
) {
  return (
    <ArkAngleSlider.Root ref={ref} {...rootProps}>
      <ArkAngleSlider.Label>{label}</ArkAngleSlider.Label>
      <ArkAngleSlider.Control>
        <ArkAngleSlider.MarkerGroup>
          {markers.map((value) => (
            <ArkAngleSlider.Marker key={value} value={value} />
          ))}
        </ArkAngleSlider.MarkerGroup>
        <ArkAngleSlider.Thumb />
      </ArkAngleSlider.Control>
      <ArkAngleSlider.ValueText data-scope="angle-slider" data-part="value-text" />
      <ArkAngleSlider.HiddenInput />
      {children}
    </ArkAngleSlider.Root>
  );
});
