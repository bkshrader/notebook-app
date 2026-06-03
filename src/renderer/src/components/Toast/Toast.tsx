import { forwardRef, type ReactNode } from 'react';

import {
  createToaster,
  Toast as ArkToast,
  Toaster as ArkToaster,
  type CreateToasterReturn,
  type ToasterProps as ArkToasterProps,
  type ToastOptions,
} from '@ark-ui/react/toast';

import './Toast.css';

/**
 * Toast tone. Mirrors the Helios Toast `color` option
 * (https://helios.hashicorp.design/components/toast), which itself reuses the
 * Helios Alert color language. Drives the surface, border, and icon/title
 * foreground tokens (see Toast.css):
 *   - `neutral`   — general information about an ongoing process.
 *   - `highlight` — interchangeable with neutral when more prominence is needed.
 *   - `success`   — a successful action completed.
 *   - `warning`   — completed, but a related issue may have been triggered.
 *   - `critical`  — an error occurred.
 *
 * Carried through Ark's per-toast `type` field, surfaced on the rendered root as
 * `data-color` so the tone CSS can target it.
 */
export type ToastColor = 'neutral' | 'highlight' | 'success' | 'warning' | 'critical';

/**
 * Per-toast presentation metadata, carried through Ark's `meta` channel (the
 * sanctioned `Record<string, any>` field) and read back in the host's render.
 *
 * NOTE: we deliberately do NOT reuse Ark's `type` field for the Helios tone —
 * Zag's toast store only understands the fixed priority types
 * (`success | error | warning | loading | info`) and throws when handed an
 * unknown one. The Helios color set (neutral/highlight/critical) does not map
 * cleanly onto those, so the tone travels in `meta` instead.
 */
export interface ToastMeta {
  /** Helios tone. Defaults to `neutral` when omitted. */
  color?: ToastColor;
  /** Leading status glyph. Decorative; rendered `aria-hidden`. */
  icon?: ReactNode;
}

/**
 * The toaster store returned by {@link createToast}. Re-exported under our own
 * name so consumers import a stable, app-shaped type rather than Ark's.
 */
export type ToastStore = CreateToasterReturn;

export interface ToastProps extends Omit<ArkToasterProps, 'toaster' | 'children'> {
  /**
   * The toaster store created with {@link createToast}. Holds the queue and the
   * placement/overlap/max configuration; the same store instance is passed to
   * `store.create(...)` to enqueue toasts.
   */
  toaster: ToastStore;
  /**
   * Label for each toast's dismiss button. Used as the button's accessible name
   * (WCAG 4.1.2) since the control renders an icon glyph. Defaults to "Dismiss".
   */
  closeLabel?: string;
}

/**
 * Creates a toaster store. Thin pass-through to Ark's `createToaster` so callers
 * import everything Toast-related from one module. The returned store is handed
 * to the {@link Toast} host and is the object you call `.create(...)` on to
 * enqueue toasts.
 *
 * Helios places toasts in the bottom-right of the viewport; we default
 * `placement` to `bottom-end` to match (overridable per store).
 */
export function createToast(props: Parameters<typeof createToaster>[0] = {}): ToastStore {
  return createToaster({ placement: 'bottom-end', ...props });
}

/**
 * The status glyph, when present. Kept as a tiny sub-component so the render path
 * has no nested conditionals (low cyclomatic complexity — see Field.tsx).
 */
function ToastIcon({ icon }: { icon: ReactNode }) {
  if (icon == null) return null;
  return (
    <span data-part="icon" aria-hidden="true">
      {icon}
    </span>
  );
}

/**
 * The optional description line. Returns null when absent so the title-only toast
 * stays clean.
 */
function ToastDescription({ description }: { description: ReactNode }) {
  if (description == null) return null;
  return <ArkToast.Description>{description}</ArkToast.Description>;
}

/**
 * Token-styled wrapper over Ark UI's Toast — the Tier-E "provider-shaped"
 * Component Library primitive (createToaster + a Toaster host), built to the
 * Helios Toast specification (https://helios.hashicorp.design/components/toast).
 *
 * Toast IS an Ark/Zag interactive primitive: each toast is keyboard-focusable
 * (`tabIndex=0`), dismissible with `Escape`, and auto-times-out — state a
 * finite-state machine owns. Per the unstyled-primitives-ark ADR it therefore
 * wraps Ark rather than hand-rolling interaction.
 *
 * Accessibility (verified against the live Zag connect, not just docs): the
 * Toaster GROUP host renders `role="region"` + `aria-live="polite"` — a real
 * live region (this is exactly the WCAG 4.1.3 defect the ADR flags Radix Toast
 * for: Radix hardcodes `aria-live="off"`; Ark does not). Each toast ROOT renders
 * `role="status"`, `aria-atomic="true"`, with `aria-labelledby`/`aria-describedby`
 * auto-wired to the Title/Description, and an `Escape` keydown handler that
 * dismisses it.
 *
 * Anatomy (from @ark-ui/react/toast): Toaster(group) > Toast.Root > Title +
 * Description + CloseTrigger. We add a leading `data-part="icon"` glyph and a
 * `data-part="text"` wrapper around the title/description, styling everything via
 * `[data-scope='toast'][data-part]` selectors (no class names).
 *
 * Visually a Helios Toast is a Helios Alert (inline tone treatment) lifted off
 * the page with `--token-elevation-higher-box-shadow`; the color tokens match
 * Alert exactly. Per-toast tone + icon travel in Ark's `meta` channel (typed as
 * {@link ToastMeta}); the host reflects the tone onto the root as `data-color`
 * for the tone CSS.
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
  { toaster, closeLabel = 'Dismiss', ...toasterProps },
  ref,
) {
  return (
    <ArkToaster ref={ref} toaster={toaster} {...toasterProps}>
      {(toast: ToastOptions) => {
        const meta = (toast.meta ?? {}) as ToastMeta;
        return (
          <ArkToast.Root data-color={meta.color ?? 'neutral'}>
            <ToastIcon icon={meta.icon} />
            <div data-part="text">
              <ArkToast.Title>{toast.title}</ArkToast.Title>
              <ToastDescription description={toast.description} />
            </div>
            <ArkToast.CloseTrigger aria-label={closeLabel}>{closeLabel}</ArkToast.CloseTrigger>
          </ArkToast.Root>
        );
      }}
    </ArkToaster>
  );
});
