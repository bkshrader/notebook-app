import { forwardRef } from 'react';

import './InlineLink.css';

/**
 * InlineLink — a token-styled, presentational wrapper built to the Helios
 * Inline Link specification (https://helios.hashicorp.design/components/link/inline).
 *
 * Inline Link has no Ark UI primitive: it is a plain anchor used *inside a block
 * of text* to navigate to another destination. Its only interaction state
 * (focus/hover/active/visited) is the browser's native anchor behavior, so per
 * the scope clarification in the unstyled-primitives-ark ADR it is built directly
 * on a semantic `<a>` element rather than an Ark/Zag state machine. It sets its
 * own `data-part` attributes so the CSS keeps the attribute-selector convention
 * (no class names).
 *
 * Anatomy (mirrors Helios `.hds-link-inline`):
 *   a[data-part="root"] > [data-part="icon"]? (leading) + children + [data-part="icon"]? (trailing)
 *
 * The link text (`children`) is the accessible name — it must be descriptive
 * (WCAG 2.4.4); the optional icon is decorative (`aria-hidden`). Native
 * `:focus-visible` drives the keyboard focus ring (an `outline`, per Helios), so
 * no JS focus management is needed. Color is conveyed by the underline + a
 * distinct foreground, never by color alone.
 *
 * For an interactive trigger (form submission, an action) use a Button; for a
 * standalone navigational link outside running text use a Standalone Link.
 */

/** Color variant. `primary` (default) is the action foreground for important
 * links; `secondary` is a quieter strong-foreground treatment for less important
 * ones. Mirrors the Helios Inline Link `primary` / `secondary` colors. */
export type InlineLinkColor = 'primary' | 'secondary';

/** Which side the optional icon sits on. Helios recommends `trailing` in most
 * cases (it breaks up the text less); never render both leading and trailing. */
export type InlineLinkIconPosition = 'leading' | 'trailing';

export interface InlineLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Link text — the accessible name. Required and should be descriptive (WCAG 2.4.4). */
  children: React.ReactNode;
  /** Color variant. Defaults to `primary`. */
  color?: InlineLinkColor;
  /** Optional decorative icon. Rendered in its own `[data-part="icon"]` box. */
  icon?: React.ReactNode;
  /** Which side the icon sits on. Defaults to `trailing` (Helios recommendation). */
  iconPosition?: InlineLinkIconPosition;
}

/** The decorative icon slot. Kept as a tiny sub-component so the root render
 * stays a flat sequence (low cyclomatic complexity — no nested ternaries). */
function InlineLinkIcon({ children }: { children: React.ReactNode }) {
  return (
    <span data-part="icon" aria-hidden="true">
      {children}
    </span>
  );
}

/** Renders the icon in the requested slot, or nothing. Keeps `InlineLink` flat. */
function InlineLinkIconSlot({
  slot,
  icon,
  iconPosition,
}: {
  slot: 'leading' | 'trailing';
  icon: React.ReactNode;
  iconPosition: 'leading' | 'trailing';
}) {
  if (icon == null || iconPosition !== slot) return null;
  return <InlineLinkIcon>{icon}</InlineLinkIcon>;
}

export const InlineLink = forwardRef<HTMLAnchorElement, InlineLinkProps>(function InlineLink(
  { children, color = 'primary', icon, iconPosition = 'trailing', ...rest },
  ref,
) {
  return (
    <a
      ref={ref}
      data-scope="inline-link"
      data-part="root"
      data-color={color}
      data-icon-position={icon != null ? iconPosition : undefined}
      {...rest}
    >
      <InlineLinkIconSlot slot="leading" icon={icon} iconPosition={iconPosition} />
      {children}
      <InlineLinkIconSlot slot="trailing" icon={icon} iconPosition={iconPosition} />
    </a>
  );
});
