import { forwardRef } from 'react';

import './Badge.css';

/**
 * Badge — a token-styled, presentational wrapper built to the Helios Badge
 * specification (https://helios.hashicorp.design/components/badge).
 *
 * Badge has no Ark UI primitive and no interaction state (it is a concise,
 * non-interactive label for metadata — status, feature flags, categories,
 * keyboard-shortcut hints). Per the scope clarification in the
 * unstyled-primitives-ark ADR, presentational/static components are built on a
 * plain semantic element rather than an Ark primitive. Badge renders a plain
 * `<span>` (inline, flows with surrounding text) and sets its own `data-part`
 * attributes so the CSS keeps the attribute-selector convention (no class
 * names).
 *
 * Anatomy (mirrors Helios `.hds-badge`):
 *   span[data-part="root"] > [data-part="icon"]? + span[data-part="text"]
 *
 * The leading icon is optional and decorative; the text is the badge's
 * accessible name (it is the visible label, so no extra ARIA is required —
 * WCAG 1.3.1 / 1.1.1). Color is conveyed by both a tinted surface AND the text,
 * never by color alone.
 */

/** Semantic color of the badge. Mirrors the Helios Badge color options (the
 * Helios `neutral-dark-mode` color is omitted: our token set already swaps the
 * neutral palette per color-mode, so a single `neutral` covers both). */
export type BadgeColor = 'neutral' | 'highlight' | 'success' | 'warning' | 'critical';

/** Visual treatment. `filled` is a tinted surface; `outlined` is a bordered,
 * transparent pill. Mirrors the Helios Badge `filled` / `outlined` types. */
export type BadgeVariant = 'filled' | 'outlined';

/** Size scale. Drives gap, min-height, padding, icon box, and text typography
 * via `data-size` (see Badge.css). Mirrors the Helios Badge size options. */
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visible label text. Required — it is the badge's accessible name (WCAG 1.3.1). */
  text: React.ReactNode;
  /** Optional leading icon. Decorative; rendered in its own `[data-part="icon"]` box. */
  icon?: React.ReactNode;
  /** Semantic color. Defaults to `neutral`. */
  color?: BadgeColor;
  /** Visual treatment. Defaults to `filled`. */
  variant?: BadgeVariant;
  /** Size scale. Defaults to `medium`. */
  size?: BadgeSize;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { text, icon, color = 'neutral', variant = 'filled', size = 'medium', ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      data-scope="badge"
      data-part="root"
      data-color={color}
      data-variant={variant}
      data-size={size}
      {...rest}
    >
      {icon != null && (
        <span data-part="icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span data-part="text">{text}</span>
    </span>
  );
});
