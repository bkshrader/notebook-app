import { forwardRef } from 'react';

import { QrCode as ArkQrCode, type QrCodeRootProps } from '@ark-ui/react/qr-code';

import './QrCode.css';

export interface QrCodeProps extends QrCodeRootProps {
  /**
   * The URI or text string to encode. Maps to the Ark/Zag `value` prop.
   * Use `defaultValue` for uncontrolled usage.
   */
  value?: string;
  /**
   * Accessible label for the QR code image. Required (WCAG 4.1.2).
   * Rendered as `role="img"` + `aria-label` on the Frame SVG so screen
   * readers can announce what the code encodes
   * (e.g. "QR code for https://example.com"). The SVG element with role="img"
   * satisfies axe's aria-prohibited-attr rule (plain divs without a valid
   * ARIA role cannot carry aria-label, but an SVG with role="img" can).
   */
  label: string;
  /**
   * Whether to render a download button below the QR code frame.
   * When true, `downloadFileName` and `downloadMimeType` configure the trigger.
   */
  showDownload?: boolean;
  /**
   * File name used when the user downloads the QR code image.
   * Only relevant when `showDownload` is true.
   * @default 'qr-code.png'
   */
  downloadFileName?: string;
  /**
   * MIME type for the downloaded image.
   * Only relevant when `showDownload` is true.
   * @default 'image/png'
   */
  downloadMimeType?: 'image/png' | 'image/jpeg' | 'image/svg+xml';
}

/**
 * Token-styled wrapper over Ark UI's QrCode.
 *
 * Anatomy (from @ark-ui/react/qr-code): Root > Frame > Pattern, optional
 * Overlay, optional DownloadTrigger.
 *
 * The Frame SVG carries `role="img"` + `aria-label` so screen readers announce
 * what the code encodes (WCAG 4.1.2). Placing aria-label directly on the SVG
 * element with role="img" satisfies axe's aria-prohibited-attr rule — a plain
 * <div> without a valid role cannot carry aria-label, but an SVG with
 * role="img" can. The SVG IS the visual image, so this is semantically correct.
 *
 * Styling is via [data-scope='qr-code'][data-part='...'] attribute selectors
 * (per the unstyled-primitives-ark ADR). Size is controlled by the
 * --qrcode-pixel-size CSS variable set on the root.
 */
export const QrCode = forwardRef<HTMLDivElement, QrCodeProps>(function QrCode(
  {
    label,
    children,
    showDownload = false,
    downloadFileName = 'qr-code.png',
    downloadMimeType = 'image/png',
    ...rootProps
  },
  ref,
) {
  return (
    <ArkQrCode.Root ref={ref} {...rootProps}>
      <ArkQrCode.Frame role="img" aria-label={label}>
        <ArkQrCode.Pattern />
      </ArkQrCode.Frame>
      {showDownload && (
        <ArkQrCode.DownloadTrigger fileName={downloadFileName} mimeType={downloadMimeType}>
          Download
        </ArkQrCode.DownloadTrigger>
      )}
      {children}
    </ArkQrCode.Root>
  );
});
