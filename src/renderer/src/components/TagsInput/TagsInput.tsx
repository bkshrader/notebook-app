import { forwardRef } from 'react';

import { TagsInput as ArkTagsInput, type TagsInputRootProps } from '@ark-ui/react/tags-input';

import './TagsInput.css';

/** Size scale, set once at the group level (drives padding + typography). */
export type TagsInputSize = 'small' | 'medium' | 'large';

export interface TagsInputProps extends TagsInputRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
  /** Placeholder text shown inside the tag input field. */
  placeholder?: string;
  /** Size scale for padding and typography. Defaults to `medium`. */
  size?: TagsInputSize;
}

/**
 * Token-styled wrapper over Ark UI's TagsInput.
 *
 * Anatomy (from @ark-ui/react/tags-input): Root > Label, Control > Item* >
 * ItemPreview > ItemText + ItemDeleteTrigger, ItemInput, Input, plus a
 * visually-hidden HiddenInput. Ark/Zag own ARIA wiring: the hidden native
 * input carries the value; each tag preview is a labelled group.
 *
 * Helios parity: `size` (small | medium | large) drives the padding +
 * typography matrix via `data-size`. The full set of Ark/Zag root props
 * (`disabled`, `readOnly`, `invalid`, `required`, `max`, `maxLength`,
 * `validate`, `editable`, …) is forwarded unchanged through `...rootProps`;
 * `data-invalid` / `data-disabled` / `data-readonly` are styled in the CSS.
 *
 * Focus ring: Ark emits `data-focus` on the `control` once the inner field is
 * focused (it never emits `data-focus-visible`), so the keyboard focus ring is
 * keyed off `[data-focus]` in TagsInput.css.
 *
 * Styling targets Ark's data-scope/data-part attributes (see TagsInput.css)
 * per the unstyled-primitives-ark ADR — no custom class names.
 */
export const TagsInput = forwardRef<HTMLDivElement, TagsInputProps>(function TagsInput(
  { label, placeholder = 'Add tag…', size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkTagsInput.Root ref={ref} data-size={size} {...rootProps}>
      <ArkTagsInput.Label>{label}</ArkTagsInput.Label>
      <ArkTagsInput.Context>
        {(tagsInput) => (
          <ArkTagsInput.Control>
            {tagsInput.value.map((value, index) => (
              <ArkTagsInput.Item key={index} index={index} value={value}>
                <ArkTagsInput.ItemPreview>
                  <ArkTagsInput.ItemText>{value}</ArkTagsInput.ItemText>
                  <ArkTagsInput.ItemDeleteTrigger aria-label={`Remove ${value}`}>
                    ×
                  </ArkTagsInput.ItemDeleteTrigger>
                </ArkTagsInput.ItemPreview>
                <ArkTagsInput.ItemInput />
              </ArkTagsInput.Item>
            ))}
            <ArkTagsInput.Input placeholder={placeholder} />
          </ArkTagsInput.Control>
        )}
      </ArkTagsInput.Context>
      <ArkTagsInput.HiddenInput />
      {children}
    </ArkTagsInput.Root>
  );
});
