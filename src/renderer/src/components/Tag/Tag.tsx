import { forwardRef } from 'react';

import './Tag.css';

/**
 * Color scale for the Tag's interactive **link** label. Mirrors the Helios Tag
 * `@color` argument (`primary` | `secondary`). It only affects the link
 * variant's text color; a non-link Tag renders its label in the neutral
 * foreground regardless of `color` (Helios behaves the same — the color
 * modifier styles `.hds-tag__link` only).
 */
export type TagColor = 'primary' | 'secondary';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The Tag's label. Required — a Tag with no accessible text is meaningless (WCAG 1.3.1). */
  children: React.ReactNode;
  /**
   * Color of the link label. Only applies when `href` is set (Helios styles the
   * link part only). Defaults to `primary`.
   */
  color?: TagColor;
  /**
   * Render the label as a link to this URL. When set, the label becomes an
   * `<a data-part="link">` (interactive, keyboard-focusable). When omitted, the
   * label is a static `<span data-part="text">`.
   */
  href?: string;
  /**
   * Dismiss handler. When provided, a leading dismiss `<button>` is rendered
   * (Helios places the dismiss control first so pointer users can clear several
   * Tags without moving the cursor). Omit for a non-dismissible Tag.
   */
  onDismiss?: () => void;
  /**
   * Accessible name for the dismiss button (WCAG 4.1.2 — the button has only an
   * icon). Defaults to `Dismiss`. Set a label that names the Tag, e.g.
   * `Remove "Design" tag`.
   */
  dismissLabel?: string;
}

/** Leading dismiss control — a native `<button>` with an inline cross icon. */
function TagDismiss({ label, onDismiss }: { label: string; onDismiss: () => void }) {
  return (
    <button type="button" data-part="dismiss" aria-label={label} onClick={onDismiss}>
      <svg
        data-part="dismiss-icon"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  );
}

/** The label, rendered as a link when `href` is set, else as static text. */
function TagLabel({ href, children }: { href?: string; children: React.ReactNode }) {
  if (href) {
    return (
      <a data-part="link" href={href}>
        <span data-part="text-container">{children}</span>
      </a>
    );
  }
  return (
    <span data-part="text">
      <span data-part="text-container">{children}</span>
    </span>
  );
}

/**
 * Tag — token-styled plain-HTML primitive, built to the Helios Tag
 * specification (https://helios.hashicorp.design/components/tag).
 *
 * Used to indicate an object's categorization (e.g. for filtering). Helios has
 * NO Ark/Zag primitive for it, and a Tag is presentational (a label, optionally
 * a link and/or a dismiss button) with no open/selection/roving state — so per
 * the unstyled-primitives-ark ADR's scope clarification it is built directly on
 * semantic HTML (a `<span>` wrapper, a native `<a>` for the link form, a native
 * `<button>` for the dismiss control). The interactive sub-parts inherit native
 * keyboard and focus behavior; no hand-rolled interaction logic is needed.
 *
 * Styling targets the wrapper's own `data-part` attributes (no class names) per
 * the ADR's plain-HTML styling convention. Every value resolves to a Helios
 * `--token-*` custom property.
 *
 * Anatomy:
 *   root (span) > [dismiss (button)] + (link (a) | text (span)) > text-container (span)
 */
export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  { children, color = 'primary', href, onDismiss, dismissLabel = 'Dismiss', ...rest },
  ref,
) {
  return (
    <span ref={ref} data-component="tag" data-part="root" data-color={color} {...rest}>
      {onDismiss && <TagDismiss label={dismissLabel} onDismiss={onDismiss} />}
      <TagLabel href={href}>{children}</TagLabel>
    </span>
  );
});
