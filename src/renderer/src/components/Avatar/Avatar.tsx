import { forwardRef } from 'react';

import { Avatar as ArkAvatar, type AvatarRootProps } from '@ark-ui/react/avatar';

import './Avatar.css';

export interface AvatarProps extends AvatarRootProps {
  /** Fallback text shown while the image loads or if it fails (e.g. initials). Required (WCAG 4.1.2). */
  fallback: React.ReactNode;
  /** Image source URL. */
  src?: string;
  /** Accessible alt text for the image. Required when src is provided (WCAG 1.1.1). */
  alt?: string;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(function Avatar(
  { fallback, src, alt, children, ...rootProps },
  ref,
) {
  return (
    <ArkAvatar.Root ref={ref} {...rootProps}>
      <ArkAvatar.Fallback>{fallback}</ArkAvatar.Fallback>
      {src && <ArkAvatar.Image src={src} alt={alt ?? ''} />}
      {children}
    </ArkAvatar.Root>
  );
});
