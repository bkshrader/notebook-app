import { forwardRef } from 'react';

import {
  ImageCropper as ArkImageCropper,
  type ImageCropperRootProps,
} from '@ark-ui/react/image-cropper';

import './ImageCropper.css';

export interface ImageCropperProps extends ImageCropperRootProps {
  /** URL of the image to crop. Required. */
  src: string;
  /** Accessible alt text for the image. Required (WCAG 1.1.1). */
  alt: string;
}

/**
 * Token-styled wrapper over Ark UI's ImageCropper.
 *
 * Anatomy (from @ark-ui/react/image-cropper):
 *   Root > Viewport > Image, Selection > Handle (×8 positions), Grid (horizontal + vertical)
 *
 * The Selection element is the interactive, focusable part — it receives keyboard
 * focus for moving the crop area. Handles are drag targets for resizing.
 * Styling is attached via data-scope/data-part attributes per the
 * unstyled-primitives-ark ADR; no custom class names.
 */
export const ImageCropper = forwardRef<HTMLDivElement, ImageCropperProps>(function ImageCropper(
  { src, alt, children, ...rootProps },
  ref,
) {
  return (
    <ArkImageCropper.Root ref={ref} {...rootProps}>
      <ArkImageCropper.Viewport>
        <ArkImageCropper.Image src={src} alt={alt} />
        <ArkImageCropper.Selection>
          {ArkImageCropper.handles.map((position) => (
            <ArkImageCropper.Handle key={position} position={position}>
              <div />
            </ArkImageCropper.Handle>
          ))}
          <ArkImageCropper.Grid axis="horizontal" />
          <ArkImageCropper.Grid axis="vertical" />
        </ArkImageCropper.Selection>
      </ArkImageCropper.Viewport>
      {children}
    </ArkImageCropper.Root>
  );
});
