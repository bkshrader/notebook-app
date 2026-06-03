import { forwardRef, useId } from 'react';

import {
  ColorPicker as ArkColorPicker,
  parseColor,
  type ColorPickerRootProps,
} from '@ark-ui/react/color-picker';
import { Portal } from '@ark-ui/react/portal';

import './ColorPicker.css';

/**
 * Helios control-size scale. Drives the per-size local custom properties in
 * ColorPicker.css via the `data-size` attribute on the root (trigger height +
 * swatch box dimension).
 */
export type ColorPickerSize = 'small' | 'medium' | 'large';

export interface ColorPickerProps extends ColorPickerRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Control sizing (trigger height + swatch box). Defaults to `'medium'`. */
  size?: ColorPickerSize;
  /**
   * Optional preset swatches rendered below the sliders. Each is a CSS color
   * string Ark parses internally; selecting one updates the value.
   */
  swatches?: readonly string[];
}

/**
 * The saturation/value picking area: a 2-D background with a draggable thumb.
 * Ark wires the arrow-key contract on the thumb itself.
 */
function ColorArea() {
  return (
    <ArkColorPicker.Area>
      <ArkColorPicker.AreaBackground />
      <ArkColorPicker.AreaThumb />
    </ArkColorPicker.Area>
  );
}

/**
 * A single channel slider (hue / alpha). Ark gives the thumb a `slider` role
 * with `aria-valuenow`/min/max and the arrow-key contract.
 */
function ChannelSlider({ channel }: { channel: 'hue' | 'alpha' }) {
  return (
    <ArkColorPicker.ChannelSlider channel={channel}>
      <ArkColorPicker.ChannelSliderTrack />
      <ArkColorPicker.ChannelSliderThumb />
    </ArkColorPicker.ChannelSlider>
  );
}

/** The preset-swatch grid. Each trigger is a keyboard-focusable button. */
function SwatchGrid({ swatches }: { swatches: readonly string[] }) {
  return (
    <ArkColorPicker.SwatchGroup>
      {swatches.map((value) => (
        <ArkColorPicker.SwatchTrigger key={value} value={value}>
          <ArkColorPicker.Swatch value={value} />
        </ArkColorPicker.SwatchTrigger>
      ))}
    </ArkColorPicker.SwatchGroup>
  );
}

/**
 * Token-styled wrapper over Ark UI's ColorPicker. No exact Helios page exists;
 * this matches the Helios form-control visual language (trigger styled like an
 * input, popover styled like the DatePicker calendar) using semantic
 * `--token-*` variables only.
 *
 * Anatomy (from @ark-ui/react/color-picker):
 *   Root > Label + Control(Trigger > ValueSwatch + ValueText)
 *        + Positioner(portalled) > Content
 *            > Area(AreaBackground + AreaThumb)
 *            + ChannelSlider[hue] + ChannelSlider[alpha]
 *            + SwatchGroup(SwatchTrigger > Swatch)
 *        + HiddenInput (native <input>, for forms)
 *
 * Keyboard contract (owned by Ark/Zag, audited against APG): the trigger is a
 * native <button> (Space/Enter opens the popover, Esc closes + restores focus);
 * the area thumb and channel-slider thumbs are `role="slider"` and move with the
 * arrow keys; swatch triggers are reachable via Tab/arrow and selected with
 * Enter/Space. Styling targets Ark's `data-scope`/`data-part` attributes per the
 * unstyled-primitives-ark ADR (no class names).
 */
export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPicker(
  { label, size = 'medium', swatches, defaultValue, children, ...rootProps },
  ref,
) {
  // Ark's value/defaultValue is a parsed Color object, not a string. Provide a
  // sensible default so the picker always renders with a valid color.
  const initialValue = defaultValue ?? parseColor('#2872f5');

  // The portalled Content has role="dialog" and so needs an accessible name
  // (WCAG 4.1.2 / axe aria-dialog-name). Wire it to the visible Label via
  // aria-labelledby so the popover announces the same name as the control.
  const labelId = useId();

  return (
    <ArkColorPicker.Root ref={ref} data-size={size} defaultValue={initialValue} {...rootProps}>
      <ArkColorPicker.Label id={labelId}>{label}</ArkColorPicker.Label>
      <ArkColorPicker.Control>
        <ArkColorPicker.Trigger>
          <ArkColorPicker.ValueSwatch />
          <ArkColorPicker.ValueText />
        </ArkColorPicker.Trigger>
      </ArkColorPicker.Control>
      <Portal>
        <ArkColorPicker.Positioner>
          <ArkColorPicker.Content aria-labelledby={labelId}>
            <ColorArea />
            <ChannelSlider channel="hue" />
            <ChannelSlider channel="alpha" />
            {swatches && swatches.length > 0 && <SwatchGrid swatches={swatches} />}
            {children}
          </ArkColorPicker.Content>
        </ArkColorPicker.Positioner>
      </Portal>
      <ArkColorPicker.HiddenInput />
    </ArkColorPicker.Root>
  );
});
