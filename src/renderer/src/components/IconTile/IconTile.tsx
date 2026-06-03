import { forwardRef } from 'react';

import './IconTile.css';

/**
 * Size scale. Drives the tile box, icon glyph, corner radius, and the optional
 * secondary-icon badge via `data-size` (see IconTile.css). Mirrors the Helios
 * Icon Tile size options (small / medium / large).
 */
export type IconTileSize = 'small' | 'medium' | 'large';

/**
 * Color (tone) scale. Sets the tile background + icon foreground pair.
 *
 * Helios offers a `neutral` tone plus per-product brand colors (Consul, Vault,
 * …) sourced from `--token-color-<product>-*`. Those product palettes are NOT
 * part of our semantic token set (and `--token-color-palette-*` is forbidden by
 * the project's token rule), so this wrapper exposes the SEMANTIC tone families
 * we do ship instead — each a real surface/foreground token pair that satisfies
 * WCAG 1.4.11 non-text contrast. `neutral` matches Helios's neutral exactly.
 */
export type IconTileColor = 'neutral' | 'action' | 'highlight' | 'critical' | 'warning' | 'success';

export interface IconTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The primary icon glyph (e.g. an SVG element). Rendered centered in the tile. */
  icon: React.ReactNode;
  /** Size scale for the tile box and icon. Defaults to `medium`. */
  size?: IconTileSize;
  /** Tone (background + icon color) scale. Defaults to `neutral`. */
  color?: IconTileColor;
  /**
   * Optional secondary icon, shown as a small badge in the bottom-right corner
   * (the Helios "extra" / secondary-icon slot).
   */
  secondaryIcon?: React.ReactNode;
  /**
   * Accessible name. Icon Tiles are decorative by default and hidden from
   * assistive tech (Helios: "purely decorative, hidden from screen readers").
   * Pass a `label` only when the tile conveys information not available in
   * adjacent text — it then becomes `role="img"` with this `aria-label`.
   */
  label?: string;
}

/** Bottom-right secondary-icon badge. Extracted to keep the wrapper flat. */
function SecondaryIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span data-component="icon-tile" data-part="extra" aria-hidden="true">
      <span data-component="icon-tile" data-part="extra-icon">
        {icon}
      </span>
    </span>
  );
}

/**
 * IconTile — a token-styled presentational tile that frames an icon in a
 * colored container, built to the Helios Icon Tile specification
 * (https://helios.hashicorp.design/components/icon-tile).
 *
 * Anatomy (Helios): Container (required) > Icon (required) + Secondary icon
 * (optional). There is no Ark UI primitive for this — it is purely presentational
 * (no focus / keyboard / open / selection state) — so per the unstyled-primitives
 * ADR's "presentational → plain HTML" clarification it is built on a semantic
 * `<div>` with our own `data-part` attributes, styled via attribute selectors
 * (no class names).
 *
 * Accessibility: the tile is decorative by default and carries `aria-hidden`
 * (Helios). When `label` is supplied it instead exposes `role="img"` +
 * `aria-label` so the meaning reaches assistive tech (WCAG 1.1.1 / 4.1.2). Tone
 * pairs satisfy WCAG 1.4.11 non-text contrast (≥3:1).
 */
export const IconTile = forwardRef<HTMLDivElement, IconTileProps>(function IconTile(
  { icon, size = 'medium', color = 'neutral', secondaryIcon, label, ...rest },
  ref,
) {
  const semantics = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <div
      ref={ref}
      data-component="icon-tile"
      data-part="root"
      data-size={size}
      data-color={color}
      {...semantics}
      {...rest}
    >
      <span data-component="icon-tile" data-part="icon">
        {icon}
      </span>
      {secondaryIcon != null && <SecondaryIcon icon={secondaryIcon} />}
    </div>
  );
});
