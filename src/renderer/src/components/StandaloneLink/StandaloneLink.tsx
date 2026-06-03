import { forwardRef } from 'react';

import './StandaloneLink.css';

/**
 * StandaloneLink — a token-styled, presentational wrapper built to the Helios
 * Standalone Link specification
 * (https://helios.hashicorp.design/components/link/standalone).
 *
 * A Standalone Link navigates to a destination (internal or external) as a
 * standalone element, as opposed to an Inline Link inside a body of text or a
 * Button that triggers an action. It has no Ark UI primitive and no interaction
 * STATE machine: it is a native anchor, and all of its interactivity (focus,
 * hover, active) is the browser's own anchor behavior. Per the scope
 * clarification in the unstyled-primitives-ark ADR (2026-06-02),
 * presentational/static components are built on the appropriate semantic HTML
 * element rather than an Ark primitive — here a plain `<a>`.
 *
 * The wrapper sets its own `data-part` attributes (`root`/`icon`/`text`) and
 * `data-color`/`data-size` modifiers so the CSS keeps the project's
 * attribute-selector convention (no class names). The keyboard focus ring is the
 * native `:focus-visible` pseudo on the anchor (no Ark `data-focus`), matching
 * Helios's own `:focus-visible::before` focus ring.
 *
 * Anatomy (mirrors Helios `.hds-link-standalone`):
 *   a[data-part="root"] > [data-part="icon" (leading)]? + span[data-part="text"]
 *                       + [data-part="icon" (trailing)]?
 *
 * Accessibility (WCAG 2.4.4 / 1.1.1 / 4.1.2):
 *   - The visible `text` is the link's accessible name; an icon is decorative
 *     (`aria-hidden`) and never the sole label.
 *   - A real `href` makes the link keyboard-reachable and announced as a link.
 *   - Helios advises against using both a leading AND trailing icon, so the API
 *     accepts a single `icon` plus an `iconPosition`.
 */

/** Semantic color. `primary` is the default action-blue link; `secondary` is a
 * lower-emphasis neutral link. Mirrors the Helios Standalone Link colors. */
export type StandaloneLinkColor = 'primary' | 'secondary';

/** Size scale. Drives the icon box and the text typography via `data-size`
 * (see StandaloneLink.css). Mirrors the Helios Standalone Link sizes. */
export type StandaloneLinkSize = 'small' | 'medium' | 'large';

/** Which side the optional icon sits on. Helios advises a single leading OR
 * trailing icon, not both. */
export type StandaloneLinkIconPosition = 'leading' | 'trailing';

export interface StandaloneLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Visible link text. Required — it is the link's accessible name (WCAG 2.4.4). */
  children: React.ReactNode;
  /** Destination URL. Required — a standalone link always navigates somewhere. */
  href: string;
  /** Optional icon. Decorative; rendered in its own `[data-part="icon"]` box. */
  icon?: React.ReactNode;
  /** Which side the icon sits on. Defaults to `leading`. */
  iconPosition?: StandaloneLinkIconPosition;
  /** Semantic color. Defaults to `primary`. */
  color?: StandaloneLinkColor;
  /** Size scale. Defaults to `medium`. */
  size?: StandaloneLinkSize;
}

/**
 * The decorative icon box. Kept as a tiny sub-component so the main render is a
 * flat, low-complexity expression rather than nested conditionals (cf.
 * Field.tsx / Icon.tsx).
 */
function LinkIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span data-scope="standalone-link" data-part="icon" aria-hidden="true">
      {icon}
    </span>
  );
}

/** Renders the icon in the requested slot, or nothing. Keeps `StandaloneLink` flat. */
function StandaloneLinkIconSlot({
  slot,
  icon,
  iconPosition,
}: {
  slot: 'leading' | 'trailing';
  icon: React.ReactNode;
  iconPosition: 'leading' | 'trailing';
}) {
  if (icon == null || iconPosition !== slot) return null;
  return <LinkIcon icon={icon} />;
}

export const StandaloneLink = forwardRef<HTMLAnchorElement, StandaloneLinkProps>(
  function StandaloneLink(
    { children, href, icon, iconPosition = 'leading', color = 'primary', size = 'medium', ...rest },
    ref,
  ) {
    return (
      <a
        ref={ref}
        href={href}
        data-scope="standalone-link"
        data-part="root"
        data-color={color}
        data-size={size}
        {...rest}
      >
        <StandaloneLinkIconSlot slot="leading" icon={icon} iconPosition={iconPosition} />
        <span data-scope="standalone-link" data-part="text">
          {children}
        </span>
        <StandaloneLinkIconSlot slot="trailing" icon={icon} iconPosition={iconPosition} />
      </a>
    );
  },
);
