import { forwardRef } from 'react';

import {
  DownloadTrigger as ArkDownloadTrigger,
  type DownloadTriggerProps,
} from '@ark-ui/react/download-trigger';

import './DownloadTrigger.css';

export type { DownloadTriggerProps };

/**
 * Token-styled wrapper over Ark UI's DownloadTrigger.
 *
 * A single-part button that, when activated, triggers a file download in the
 * browser. The `data`, `fileName`, and `mimeType` props are required — they
 * define what gets downloaded. `data` may be a string, Blob, File, or an async
 * factory function (resolved at click time, enabling lazy fetches).
 *
 * Styling is attached to Ark's `data-scope='download-trigger'` attribute (see
 * DownloadTrigger.css) per the unstyled-primitives-ark ADR — no custom class
 * names.
 *
 * Accessible name is derived from `children` (button content). Always pass
 * visible text or an aria-label to satisfy WCAG 4.1.2 (Name, Role, Value).
 */
export const DownloadTrigger = forwardRef<HTMLButtonElement, DownloadTriggerProps>(
  function DownloadTrigger({ children, ...props }, ref) {
    return (
      <ArkDownloadTrigger ref={ref} {...props}>
        {children}
      </ArkDownloadTrigger>
    );
  },
);
