import { forwardRef } from 'react';

import { Avatar as ArkAvatar, type AvatarRootProps } from '@ark-ui/react/avatar';

import './Avatar.css';

/**
 * Size scale. Drives the avatar's box and the fallback-initials typography via
 * `data-size` (see Avatar.css). Mirrors the Helios Avatar size options.
 */
export type AvatarSize = 'small' | 'medium' | 'large';

export interface AvatarProps extends AvatarRootProps {
  /** Fallback text shown while the image loads or if it fails (e.g. initials). Required (WCAG 4.1.2). */
  fallback: React.ReactNode;
  /** Image source URL. */
  src?: string;
  /** Accessible alt text for the image. Required when src is provided (WCAG 1.1.1). */
  alt?: string;
  /** Size scale for the box dimensions and fallback typography. Defaults to `medium`. */
  size?: AvatarSize;
}

/**
 * Token-styled wrapper over Ark UI's Avatar, built to the Helios Avatar
 * specification (https://helios.hashicorp.design/components/avatar).
 *
 * Anatomy (from @ark-ui/react/avatar):
 *   Root > Fallback + Image
 *
 * Ark manages the image-load lifecycle: it toggles `data-state` between
 * `"visible"` and `"hidden"` on Image and Fallback (verified against the live
 * DOM, not just the styling guide) and hides the inactive one itself — so the
 * fallback shows while the image loads or on error, and is replaced once the
 * image is available. No state-specific CSS is required for that swap.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR) rather than class names. NOTE: Ark DOES emit
 * `data-part="root"` on the Root div (confirmed live), so the root selector is
 * valid — an earlier audit flagged it as phantom; that was a false positive.
 *
 * Avatar is non-interactive (no focusable control, no disabled/open state), so
 * it carries no focus-ring or state-toggle styling.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { fallback, src, alt, size = 'medium', children, ...rootProps },
  ref,
) {
  return (
    <ArkAvatar.Root ref={ref} data-size={size} {...rootProps}>
      <ArkAvatar.Fallback>{fallback}</ArkAvatar.Fallback>
      {src && <ArkAvatar.Image src={src} alt={alt ?? ''} />}
      {children}
    </ArkAvatar.Root>
  );
});
