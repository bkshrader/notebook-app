import { forwardRef, useId, useState, type ReactNode } from 'react';

import './MaskedInput.css';

const SCOPE = 'masked-input';

export interface MaskedInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  /**
   * Visible, screen-reader-announceable label. Required (WCAG 4.1.2).
   * Associates a `<label>` with the input so screen readers announce the field
   * name on focus.
   */
  label: ReactNode;
  /**
   * Whether the value starts masked (obfuscated with disc characters).
   * Defaults to `true`. Uncontrolled — toggled internally by the reveal button.
   */
  defaultMasked?: boolean;
  /**
   * Accessible label for the show/hide toggle button. Defaults to
   * 'Show/hide value'.
   */
  toggleButtonLabel?: string;
  /** Marks the field invalid (recolors the border + label). */
  invalid?: boolean;
}

/** Eye icon — shown when the value is revealed (click to mask). */
function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Eye-off icon — shown when the value is masked (click to reveal). */
function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/**
 * Token-styled MaskedInput built on plain semantic HTML.
 *
 * Helios masks the value with CSS `-webkit-text-security: disc` on a
 * `type="text"` input (NOT `type="password"`) — see the live Helios stylesheet
 * (`.hds-form-masked-input--is-masked .hds-form-masked-input__control`). Ark UI
 * has no masked-input primitive; its `password-input` toggles the input `type`
 * between text/password, which is a different mechanism that would not reproduce
 * Helios parity (and hard-codes the trigger to `tabIndex=-1`). The masking is
 * purely a CSS feature on a plain `<input>`, and the reveal control is a plain
 * `<button>` with a single boolean state — there is no focus-trap, roving
 * tabindex, overlay, or selection state that needs a Zag state machine. Per the
 * unstyled-primitives-ark ADR (2026-06-02 scope clarification), this is the
 * "presentational / plain-HTML" branch: built on semantic elements with our own
 * `data-part` attributes (no class names), styled via attribute selectors.
 *
 * Anatomy (matches Helios): Root > Label, Control(group) > Input + ToggleButton.
 * Keyboard contract (Helios Accessibility tab): Tab → input, Tab → toggle
 * button, Space/Enter → toggle masking. All of this is native to `<input>` and
 * `<button>`; no hand-rolled key handling.
 */
/** Optional-attribute flag: `''` when on, `undefined` (omitted) when off. */
const flag = (on: boolean | undefined) => (on ? '' : undefined);

/** The reveal/hide toggle button. Owns its own icon + ARIA pressed state. */
function MaskToggle({
  masked,
  label,
  disabled,
  onToggle,
}: {
  masked: boolean;
  label: string;
  disabled: boolean | undefined;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-scope={SCOPE}
      data-part="toggle-button"
      data-state={masked ? 'masked' : 'revealed'}
      aria-label={label}
      aria-pressed={!masked}
      disabled={disabled}
      onClick={onToggle}
    >
      {masked ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(function MaskedInput(
  {
    label,
    defaultMasked = true,
    toggleButtonLabel = 'Show/hide value',
    invalid,
    id,
    disabled,
    readOnly,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [masked, setMasked] = useState(defaultMasked);

  const stateAttrs = {
    'data-disabled': flag(disabled),
    'data-readonly': flag(readOnly),
    'data-invalid': flag(invalid),
  };

  return (
    <div data-scope={SCOPE} data-part="root" {...stateAttrs}>
      <label data-scope={SCOPE} data-part="label" htmlFor={inputId} {...stateAttrs}>
        {label}
      </label>
      <div data-scope={SCOPE} data-part="control">
        <input
          ref={ref}
          id={inputId}
          type="text"
          data-scope={SCOPE}
          data-part="input"
          data-state={masked ? 'masked' : 'revealed'}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          {...stateAttrs}
          {...inputProps}
        />
        <MaskToggle
          masked={masked}
          label={toggleButtonLabel}
          disabled={disabled}
          onToggle={() => setMasked((prev) => !prev)}
        />
      </div>
    </div>
  );
});
