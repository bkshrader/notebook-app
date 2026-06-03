import { forwardRef, type ReactNode } from 'react';

import './Alert.css';

/**
 * Alert layout type. Mirrors the Helios Alert `type` option
 * (https://helios.hashicorp.design/components/alert):
 *   - `page`    — full-bleed banner with a tinted box-shadow border, sits at the
 *                 top of a page between nav and breadcrumb.
 *   - `inline`  — contextual, bordered + rounded card scoped to a section.
 *   - `compact` — a single-line, less-prominent variant (icon + description; the
 *                 title is hidden).
 */
export type AlertType = 'page' | 'inline' | 'compact';

/**
 * Alert tone. Mirrors the Helios Alert `color` option. Drives the surface,
 * border/box-shadow, and icon/title foreground tokens (see Alert.css).
 */
export type AlertColor = 'neutral' | 'highlight' | 'success' | 'warning' | 'critical';

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Layout type. Defaults to `inline`. */
  type?: AlertType;
  /** Tone / status color. Defaults to `neutral`. */
  color?: AlertColor;
  /**
   * Leading status icon. Optional for `page`/`inline`, required for `compact`.
   * Decorative when paired with text — the consumer should mark glyph icons
   * `aria-hidden` so the live-region announcement is not duplicated.
   */
  icon?: ReactNode;
  /**
   * Short heading. Required if there is no `description` (and vice-versa). Hidden
   * for `compact` alerts per the Helios spec, but still rendered so a single
   * source provides the message for both layouts.
   */
  title?: ReactNode;
  /** Body copy. Required if there is no `title`. */
  description?: ReactNode;
  /** Optional action controls (e.g. buttons/links) rendered below the text. */
  actions?: ReactNode;
  /** Optional dismiss control (e.g. an icon button) rendered top-end. */
  dismiss?: ReactNode;
  /**
   * The live-region role. Defaults to `alert` (assertive — interrupts the
   * screen reader for time-sensitive messages). Pass `status` for a polite,
   * non-interrupting announcement (e.g. success confirmations).
   */
  role?: 'alert' | 'status';
}

/**
 * Title — omitted on compact alerts (Helios), keeping the a11y tree clean rather
 * than hiding it with `display:none`. Returns null when there is nothing to show.
 */
function AlertTitle({ type, title }: Pick<AlertProps, 'type' | 'title'>) {
  if (type === 'compact' || title == null) return null;
  return <div data-part="title">{title}</div>;
}

/** Description — rendered when present. */
function AlertDescription({ description }: Pick<AlertProps, 'description'>) {
  if (description == null) return null;
  return <div data-part="description">{description}</div>;
}

/**
 * Text block: title (heading) + description. Each child decides its own
 * visibility, so this composer stays trivial. Renders nothing when both are absent.
 */
function AlertText({
  type,
  title,
  description,
}: Pick<AlertProps, 'type' | 'title' | 'description'>) {
  const hasTitle = type !== 'compact' && title != null;
  if (!hasTitle && description == null) return null;
  return (
    <div data-part="text">
      <AlertTitle type={type} title={title} />
      <AlertDescription description={description} />
    </div>
  );
}

/**
 * Token-styled presentational status banner, built to the Helios Alert
 * specification (https://helios.hashicorp.design/components/alert).
 *
 * Alert is **not** an Ark primitive: it has no focus/keyboard/open/selection
 * state machine, so per the unstyled-primitives-ark ADR (scope clarification,
 * 2026-06-02) it is built on a plain semantic `<div>` and styles its own
 * `data-part` attributes (no class names), rather than wrapping Ark.
 *
 * Anatomy (Helios): Container > Icon? + Content > { Text > Title? + Description? }
 *   + Actions? + Dismiss?
 *
 * Accessibility: the container is an ARIA live region (`role="alert"` assertive
 * by default, `role="status"` polite). Helios rates Alert "conditionally
 * conformant" — conformant when no interactive elements are nested inside the
 * live region; consumers placing `actions`/`dismiss` controls own that caveat.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  {
    type = 'inline',
    color = 'neutral',
    icon,
    title,
    description,
    actions,
    dismiss,
    role = 'alert',
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      role={role}
      data-scope="alert"
      data-part="root"
      data-type={type}
      data-color={color}
      {...rest}
    >
      {icon != null && (
        <span data-part="icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div data-part="content">
        <AlertText type={type} title={title} description={description} />
        {actions != null && <div data-part="actions">{actions}</div>}
      </div>
      {dismiss != null && <div data-part="dismiss">{dismiss}</div>}
    </div>
  );
});
