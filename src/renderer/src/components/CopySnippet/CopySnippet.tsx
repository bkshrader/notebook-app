import { forwardRef } from 'react';

import { Clipboard as ArkClipboard, type ClipboardRootProps } from '@ark-ui/react/clipboard';

import './CopySnippet.css';

/**
 * Color scale. Drives the foreground/hover treatment of the snippet via
 * `data-color` (see CopySnippet.css). Mirrors the Helios Copy Snippet colors:
 *   primary   — action-colored text, the prominent default
 *   secondary — primary-colored text with an action-colored icon, for when
 *               many snippets share a page (e.g. a table) and each should be
 *               less prominent.
 */
export type CopySnippetColor = 'primary' | 'secondary';

export interface CopySnippetProps extends Omit<ClipboardRootProps, 'children'> {
  /**
   * The text shown in the snippet AND copied to the clipboard. Required — the
   * snippet has no separate label, so this is its accessible content. Passed to
   * Ark's `value` so the rendered text and the copied value never drift.
   */
  text: string;
  /**
   * Color treatment. Defaults to `primary`. See {@link CopySnippetColor}.
   */
  color?: CopySnippetColor;
  /**
   * When true, the snippet fills its container's inline size (Helios
   * `--width-full`). Defaults to false (the snippet hugs its content).
   */
  isFullWidth?: boolean;
  /**
   * When true, the text is clamped to a single line with an ellipsis instead of
   * wrapping (Helios `--is-truncated`). Implies full width. Defaults to false.
   */
  isTruncated?: boolean;
}

/** Copy glyph shown in the resting state (Helios uses the `clipboard-copy` icon). */
function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5.75" y="5.75" width="8.5" height="8.5" rx="1.25" />
      <path d="M10.25 3.75v-.5a1.5 1.5 0 0 0-1.5-1.5h-5a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 1.5 1.5h.5" />
    </svg>
  );
}

/** Check glyph shown once the value has been copied (the success indicator). */
function CopiedIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2.75 8.75 3.5 3.5 7-9" />
    </svg>
  );
}

/**
 * Token-styled wrapper over Ark UI's Clipboard, built to the Helios Copy Snippet
 * specification (https://helios.hashicorp.design/components/copy/snippet).
 *
 * Anatomy (Helios): a single interactive control = Text + Icon. We map it onto
 * Ark's clipboard machine so the copy + copied-state behavior is inherited
 * rather than hand-rolled:
 *
 *   Clipboard.Root[value] > Clipboard.Trigger > Text part + Clipboard.Indicator(icon)
 *
 * The Trigger is the whole snippet (a native <button>), matching Helios where
 * the entire row is clickable. Ark's `Indicator` swaps its children on the
 * copied state (copy glyph → check glyph) and Ark sets `data-copied` on every
 * part for the success styling. Keyboard focus uses the native :focus-visible
 * pseudo (Ark emits NO data-focus-visible on the Trigger; verified via the Ark
 * clipboard styling guide). The visible text doubles as the button's accessible
 * name, so no separate label is needed (WCAG 4.1.2).
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR) rather than class names; `data-color` and the
 * `data-full-width`/`data-truncated` flags select the Helios variants.
 */
export const CopySnippet = forwardRef<HTMLDivElement, CopySnippetProps>(function CopySnippet(
  { text, color = 'primary', isFullWidth = false, isTruncated = false, ...rootProps },
  ref,
) {
  return (
    <ArkClipboard.Root
      ref={ref}
      value={text}
      data-color={color}
      data-full-width={isFullWidth || undefined}
      data-truncated={isTruncated || undefined}
      {...rootProps}
    >
      <ArkClipboard.Trigger>
        <span data-part="text">{text}</span>
        <ArkClipboard.Indicator copied={<CopiedIcon />}>
          <CopyIcon />
        </ArkClipboard.Indicator>
      </ArkClipboard.Trigger>
    </ArkClipboard.Root>
  );
});
