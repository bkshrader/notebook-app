import { forwardRef } from 'react';

import {
  DownloadTrigger as ArkDownloadTrigger,
  type DownloadTriggerProps as ArkDownloadTriggerProps,
} from '@ark-ui/react/download-trigger';

import './DownloadTrigger.css';

/** Size scale, mirroring the Helios Button size matrix. Defaults to `medium`. */
export type DownloadTriggerSize = 'small' | 'medium' | 'large';

export interface DownloadTriggerProps extends ArkDownloadTriggerProps {
  /** Size scale for padding, typography, and icon gap. Defaults to `medium`. */
  size?: DownloadTriggerSize;
}

/**
 * Token-styled wrapper over Ark UI's DownloadTrigger.
 *
 * A single-part button that, when activated, triggers a file download in the
 * browser. The `data`, `fileName`, and `mimeType` props are required — they
 * define what gets downloaded. `data` may be a string, Blob, File, or an async
 * factory function (resolved at click time, enabling lazy fetches).
 *
 * CONTRACT NOTE (verified against the live DOM + the Ark styling guide, which
 * returns 404 for this component): Ark's DownloadTrigger renders a *bare*
 * native `<button>` with NO `data-scope`/`data-part`/state attributes. So this
 * wrapper sets `data-scope='download-trigger'` and `data-part='trigger'` on the
 * button ITSELF (Ark forwards arbitrary DOM props through). The CSS keys off
 * those attributes — keeping the unstyled-primitives-ark "style the data-scope,
 * not class names" convention — while the interactive *state* styling uses the
 * native pseudo-classes the button genuinely carries (`:disabled`,
 * `:focus-visible`, `:hover`, `:active`), since Ark emits no data-state here.
 *
 * `asChild` is forwarded so consumers can compose the trigger onto their own
 * element (e.g. render as a link); when used that way the consumer is
 * responsible for the rendered element and its data attributes.
 *
 * Accessible name is derived from `children` (button content). Always pass
 * visible text or an `aria-label` to satisfy WCAG 4.1.2 (Name, Role, Value).
 */
export const DownloadTrigger = forwardRef<HTMLButtonElement, DownloadTriggerProps>(
  function DownloadTrigger({ children, size = 'medium', ...props }, ref) {
    return (
      <ArkDownloadTrigger
        ref={ref}
        data-scope="download-trigger"
        data-part="trigger"
        data-size={size}
        {...props}
      >
        {children}
      </ArkDownloadTrigger>
    );
  },
);
