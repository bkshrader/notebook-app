import { forwardRef } from 'react';

import { FileUpload as ArkFileUpload, type FileUploadRootProps } from '@ark-ui/react/file-upload';

import './FileInput.css';

/**
 * Size scale for the trigger button. Mirrors the Helios form-control sizing
 * (the File Input trigger is a medium control by default). Drives padding,
 * typography, and the leading upload-icon gap via `data-size` (see
 * FileInput.css).
 */
export type FileInputSize = 'small' | 'medium' | 'large';

export interface FileInputProps extends FileUploadRootProps {
  /**
   * Visible, screen-reader-announceable label for the field. Required
   * (WCAG 4.1.2 Name, Role, Value / 1.3.1 Info and Relationships): Ark wires it
   * to the control via the hidden input's labelling.
   */
  label: React.ReactNode;
  /**
   * Text rendered inside the trigger button (e.g. "Choose file"). Defaults to
   * `'Choose file'`. The trigger is always keyboard-reachable.
   */
  triggerLabel?: React.ReactNode;
  /**
   * Render the larger drag-and-drop affordance (a focusable dropzone) above the
   * trigger. When false (default) the component is a compact label + trigger +
   * selected-file list, matching the Helios File Input. Defaults to `false`.
   */
  showDropzone?: boolean;
  /**
   * Prompt shown inside the dropzone. Defaults to a generic drag-and-drop hint.
   * Only rendered when `showDropzone` is true.
   */
  dropzoneLabel?: React.ReactNode;
  /** Size scale for the trigger control. Defaults to `medium`. */
  size?: FileInputSize;
}

/**
 * The list of accepted files. Rendered as its own sub-component to keep
 * FileInput's cyclomatic complexity low (no nested ternaries in the root). Ark's
 * `FileUpload.Context` render-prop exposes the live accepted-files array, so the
 * list re-renders as files are added or deleted.
 */
function FileInputItemList() {
  return (
    <ArkFileUpload.ItemGroup>
      <ArkFileUpload.Context>
        {({ acceptedFiles }) =>
          acceptedFiles.map((file) => (
            <ArkFileUpload.Item key={`${file.name}-${file.lastModified}`} file={file}>
              <ArkFileUpload.ItemName />
              <ArkFileUpload.ItemSizeText />
              <ArkFileUpload.ItemDeleteTrigger aria-label={`Remove ${file.name}`}>
                {'×'}
              </ArkFileUpload.ItemDeleteTrigger>
            </ArkFileUpload.Item>
          ))
        }
      </ArkFileUpload.Context>
    </ArkFileUpload.ItemGroup>
  );
}

/**
 * The drag-and-drop dropzone, rendered only when `showDropzone` is set. Ark's
 * Dropzone is itself a focusable `role="button"` (tabIndex 0) that opens the
 * file picker on Enter/Space and accepts dropped files; it carries
 * `data-dragging` while a drag is over it and `data-disabled`/`data-invalid`
 * from the Root.
 *
 * The Trigger button is rendered as a SIBLING after the dropzone, never nested
 * inside it: nesting a focusable <button> inside the focusable `role="button"`
 * dropzone is a WCAG "nested interactive" violation (axe `nested-interactive`).
 * As siblings, both are independently keyboard-reachable and the structure is
 * flat. Extracted so the root render stays low-complexity.
 */
function FileInputDropzone({
  prompt,
  triggerLabel,
  size,
}: {
  prompt: React.ReactNode;
  triggerLabel: React.ReactNode;
  size: FileInputSize;
}) {
  return (
    <>
      <ArkFileUpload.Dropzone>
        <span data-scope="file-upload" data-part="dropzone-prompt">
          {prompt}
        </span>
      </ArkFileUpload.Dropzone>
      <ArkFileUpload.Trigger data-size={size}>{triggerLabel}</ArkFileUpload.Trigger>
    </>
  );
}

/**
 * Token-styled wrapper over Ark UI's FileUpload, built to the Helios File Input
 * specification (https://helios.hashicorp.design/components/form/file-input).
 *
 * Anatomy (from @ark-ui/react/file-upload):
 *   Root > Label, Dropzone? (Trigger), Trigger, ItemGroup > Item[] (ItemName,
 *   ItemSizeText, ItemDeleteTrigger), HiddenInput
 *
 * Helios renders a native `<input type="file">` whose `::file-selector-button`
 * is the styled trigger. Ark splits that into a real `<button>` Trigger plus a
 * visually-hidden native input (HiddenInput) — a strictly more accessible shape
 * (the button is a genuine, labelled, keyboard-reachable control) while keeping
 * the same Helios visual language: a low-elevation, border-strong button with a
 * leading upload glyph. The optional Dropzone adds the drag-and-drop affordance
 * Helios documents in code (the `multiple`/drop path).
 *
 * Contract (verified against the live Zag connect, not just comments):
 *   - Trigger renders a native `<button>` carrying the native `disabled`
 *     attribute (set when the Root is disabled OR readOnly) plus `data-disabled`
 *     when disabled. So its disabled + keyboard-focus styling uses the native
 *     `:disabled` / `:focus-visible` pseudo-classes (Ark emits no
 *     `data-focus-visible`), mirroring the DownloadTrigger decision.
 *   - Dropzone is a focusable `role="button"`; Ark sets `data-dragging` on it
 *     (and the Root) while a drag is over it, and `data-disabled`/`data-invalid`
 *     from the Root.
 *
 * Styling targets Ark's `data-scope`/`data-part` attributes (per the
 * unstyled-primitives-ark ADR) — no class names. The two presentational spans we
 * add (`required-indicator`, `dropzone-prompt`) carry our own `data-part` so the
 * attribute-selector convention holds end to end.
 */
export const FileInput = forwardRef<HTMLDivElement, FileInputProps>(function FileInput(
  {
    label,
    triggerLabel = 'Choose file',
    showDropzone = false,
    dropzoneLabel = 'Drag and drop a file here, or',
    size = 'medium',
    children,
    ...rootProps
  },
  ref,
) {
  return (
    <ArkFileUpload.Root ref={ref} {...rootProps}>
      <ArkFileUpload.Label>
        {label}
        {rootProps.required ? (
          <span data-scope="file-upload" data-part="required-indicator" aria-hidden="true">
            {' *'}
          </span>
        ) : null}
      </ArkFileUpload.Label>

      {showDropzone ? (
        <FileInputDropzone prompt={dropzoneLabel} triggerLabel={triggerLabel} size={size} />
      ) : (
        <ArkFileUpload.Trigger data-size={size}>{triggerLabel}</ArkFileUpload.Trigger>
      )}

      <FileInputItemList />
      <ArkFileUpload.HiddenInput />
      {children}
    </ArkFileUpload.Root>
  );
});
