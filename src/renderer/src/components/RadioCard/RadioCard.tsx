import { forwardRef } from 'react';

import { RadioGroup as ArkRadioGroup, type RadioGroupRootProps } from '@ark-ui/react/radio-group';

import './RadioCard.css';

/**
 * A single selectable card in a {@link RadioCard} group.
 */
export interface RadioCardOption {
  /** Machine value — passed to the group's `onValueChange`. */
  value: string;
  /** Primary label text for the card (the option's accessible name). */
  label: string;
  /** Optional supporting copy rendered beneath the label. */
  description?: React.ReactNode;
  /** Disable this specific card. */
  disabled?: boolean;
  /** Mark this specific card invalid (Ark `Item` supports per-item `invalid`). */
  invalid?: boolean;
}

/**
 * Props for {@link RadioCard}.
 *
 * Extends Ark's `RadioGroupRootProps`, so every Root prop is accepted and
 * forwarded verbatim via `...rootProps` — including `orientation`
 * ('horizontal' | 'vertical'), `value`, `defaultValue`, `disabled`, `invalid`,
 * `required`, `readOnly`, `name`, and `onValueChange`. They are not redeclared
 * here; see `@ark-ui/react/radio-group` for their semantics.
 */
export interface RadioCardProps extends RadioGroupRootProps {
  /**
   * Visible group label rendered as a `<RadioGroup.Label>` (an
   * `aria-labelledby` target for the group). Required: a radio group with no
   * accessible name fails WCAG 4.1.2.
   */
  groupLabel: React.ReactNode;
  /**
   * The set of selectable cards. Each needs a `value` (machine identifier) and
   * a `label`; `description` adds supporting copy under the label.
   */
  options: RadioCardOption[];
}

/** One card: the label/description content plus the radio control. */
function Card({ option }: { option: RadioCardOption }) {
  return (
    <ArkRadioGroup.Item value={option.value} disabled={option.disabled} invalid={option.invalid}>
      <div data-part="card-content">
        <ArkRadioGroup.ItemText>{option.label}</ArkRadioGroup.ItemText>
        {option.description != null && (
          <span data-part="card-description">{option.description}</span>
        )}
      </div>
      <ArkRadioGroup.ItemControl />
      <ArkRadioGroup.ItemHiddenInput />
    </ArkRadioGroup.Item>
  );
}

/**
 * Token-styled wrapper over Ark UI's RadioGroup, presented as selectable
 * cards, built to the Helios Radio Card specification
 * (https://helios.hashicorp.design/components/form/radio-card).
 *
 * Anatomy (from \@ark-ui/react/radio-group):
 *   Root > Label
 *   Root > Item* (the CARD) > ItemText + (description) + ItemControl + ItemHiddenInput
 *
 * Helios renders each option as a bordered, elevated card surface whose whole
 * box is the click/selection target; a native radio control sits inside. The
 * interaction model is therefore a standard radio group — Ark/Zag own the
 * roving arrow-key selection, the native `radio` role, and the real focus
 * target (the clip-hidden `<input type="radio">` rendered by ItemHiddenInput).
 * Because the component has focus / keyboard / selection state, it wraps the
 * Ark primitive rather than a plain element (unstyled-primitives-ark ADR).
 *
 * State comes from Ark's data-attributes, verified against the live RadioGroup
 * DOM in this repo: the Item/ItemControl carry `data-state="checked|unchecked"`,
 * `data-disabled`, and `data-orientation`. Ark emits NO
 * `data-focus-visible`/`data-focus`; the card's keyboard focus ring is drawn via
 * the native `:focus-visible` pseudo on the hidden input
 * (`[data-part='item']:has(input:focus-visible)` — see RadioCard.css).
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes plus the two
 * presentational `data-part` wrappers this component adds (`card-content`,
 * `card-description`) — no class names, per the ADR.
 */
export const RadioCard = forwardRef<HTMLDivElement, RadioCardProps>(function RadioCard(
  { groupLabel, options, children, ...rootProps },
  ref,
) {
  return (
    <ArkRadioGroup.Root ref={ref} {...rootProps}>
      <ArkRadioGroup.Label>{groupLabel}</ArkRadioGroup.Label>
      {options.map((option) => (
        <Card key={option.value} option={option} />
      ))}
      {children}
    </ArkRadioGroup.Root>
  );
});
