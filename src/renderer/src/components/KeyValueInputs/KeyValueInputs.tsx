import { forwardRef, useCallback, useId, useRef, useState } from 'react';

import { Button } from '../Button';
import { TextInput } from '../TextInput';

import './KeyValueInputs.css';

/**
 * KeyValueInputs — a token-styled composite built to the Helios Key Value Inputs
 * specification (https://helios.hashicorp.design/components/form/key-value-inputs).
 *
 * Helios Key Value Inputs is a dynamic list of key+value text-input row pairs
 * with per-row delete buttons and a footer add button. There is NO single Ark
 * UI primitive for it (Ark has no key-value-inputs / repeatable-row machine), so
 * per the scope clarification in the unstyled-primitives-ark ADR this is a
 * presentational composite built on a plain semantic `<fieldset>` and composed
 * from the existing token-styled `TextInput` + `Button` components (each of
 * which carries its own Ark/native a11y contract). The wrapper sets its own
 * `data-part` attributes so the CSS keeps the project's attribute-selector
 * convention (no class names).
 *
 * Anatomy (mirrors Helios `.hds-form-key-value-inputs`):
 *   fieldset[data-part="root"]
 *     > legend[data-part="legend"]              (required — names the group)
 *     + [data-part="helper-text"]?              (optional group-level helper)
 *     + [data-part="rows"]                      (the live region announcing rows)
 *       > [data-part="row"]*                    (one per key/value pair)
 *         > [data-part="field"][data-field="key"]
 *           > label[data-part="field-label"] + TextInput
 *         + [data-part="field"][data-field="value"]
 *           > label[data-part="field-label"] + TextInput
 *         + [data-part="delete-row-button-container"]
 *           > Button (icon/critical, aria-label "Delete row N")
 *     + [data-part="footer"]
 *       > Button (add row)
 *
 * Accessibility:
 *   - The `<legend>` is REQUIRED (WCAG 1.3.1 / 4.1.2): it names the fieldset and
 *     is the only way the grouped rows have context. `legend` is a required prop.
 *   - Each input is labelled by a per-row `<label htmlFor>` (the key/value
 *     labels). The labels are visually present on the first row and visually
 *     hidden (but still announced) on subsequent rows so the columns are not
 *     re-labelled on every line — matching Helios.
 *   - The rows container is an `aria-live="polite"` region so adding/removing a
 *     row is announced to assistive tech (WCAG 4.1.3 Status Messages).
 *   - Add and every Delete button are native `<button>`s (via `Button`), so they
 *     are keyboard-operable (Enter/Space) and focus-ring-bearing for free.
 *   - After deleting a row, focus is moved to the add button (or the previous
 *     row's delete button) so keyboard focus is never orphaned on a removed node.
 *
 * State model: uncontrolled by default (`defaultRows`, internal state) so stories
 * stay pristine and the component is drop-in; pass `rows` + `onRowsChange` to
 * drive it as a controlled component.
 */

/** A single key/value row. `id` is a stable React key owned by the component. */
export interface KeyValueRow {
  /** Stable identity for the row (React key + label association). */
  id: string;
  /** The key-column input value. */
  key: string;
  /** The value-column input value. */
  value: string;
}

export interface KeyValueInputsProps {
  /**
   * Accessible name for the whole fieldset, rendered in the `<legend>`.
   * REQUIRED (WCAG 1.3.1 / 4.1.2) — a Key Value Inputs group is not conformant
   * without a legend naming its purpose.
   */
  legend: React.ReactNode;
  /** Optional group-level helper text rendered below the legend. */
  helperText?: React.ReactNode;
  /** Visible label for the key column. Defaults to `Key`. */
  keyLabel?: React.ReactNode;
  /** Visible label for the value column. Defaults to `Value`. */
  valueLabel?: React.ReactNode;
  /** Placeholder for key inputs. */
  keyPlaceholder?: string;
  /** Placeholder for value inputs. */
  valuePlaceholder?: string;
  /** Label for the footer add button. Defaults to `Add row`. */
  addButtonText?: React.ReactNode;
  /** Controlled rows. When provided, pair with `onRowsChange`. */
  rows?: KeyValueRow[];
  /** Initial rows for the uncontrolled mode. Defaults to one empty row. */
  defaultRows?: KeyValueRow[];
  /** Change handler. Required for controlled mode; also fires when uncontrolled. */
  onRowsChange?: (rows: KeyValueRow[]) => void;
  /** Disable every control in the group. */
  disabled?: boolean;
  /** Size scale forwarded to the row inputs. Defaults to `medium`. */
  size?: 'small' | 'medium' | 'large';
}

let rowSeq = 0;
const newRow = (): KeyValueRow => ({ id: `kv-${++rowSeq}`, key: '', value: '' });

/** One key-or-value labelled input cell. The label is visually hidden on rows
 * after the first (it still names the input for assistive tech). */
function FieldCell({
  field,
  label,
  hideLabel,
  inputId,
  value,
  placeholder,
  disabled,
  size,
  onValueChange,
}: {
  field: 'key' | 'value';
  label: React.ReactNode;
  hideLabel: boolean;
  inputId: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  size: 'small' | 'medium' | 'large';
  onValueChange: (next: string) => void;
}) {
  return (
    <div data-scope="key-value-inputs" data-part="field" data-field={field}>
      <label
        data-scope="key-value-inputs"
        data-part="field-label"
        data-visually-hidden={hideLabel ? '' : undefined}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div data-scope="key-value-inputs" data-part="field-control">
        <TextInput
          id={inputId}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          size={size}
          onChange={(e) => onValueChange(e.currentTarget.value)}
        />
      </div>
    </div>
  );
}

export const KeyValueInputs = forwardRef<HTMLFieldSetElement, KeyValueInputsProps>(
  function KeyValueInputs(
    {
      legend,
      helperText,
      keyLabel = 'Key',
      valueLabel = 'Value',
      keyPlaceholder,
      valuePlaceholder,
      addButtonText = 'Add row',
      rows: controlledRows,
      defaultRows,
      onRowsChange,
      disabled,
      size = 'medium',
    },
    ref,
  ) {
    const baseId = useId();
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const [internalRows, setInternalRows] = useState<KeyValueRow[]>(
      () => defaultRows ?? [newRow()],
    );
    const isControlled = controlledRows != null;
    const rows = isControlled ? controlledRows : internalRows;

    const commit = useCallback(
      (next: KeyValueRow[]) => {
        if (!isControlled) setInternalRows(next);
        onRowsChange?.(next);
      },
      [isControlled, onRowsChange],
    );

    const updateRow = useCallback(
      (id: string, patch: Partial<Pick<KeyValueRow, 'key' | 'value'>>) => {
        commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      },
      [commit, rows],
    );

    const addRow = useCallback(() => commit([...rows, newRow()]), [commit, rows]);

    const removeRow = useCallback(
      (id: string) => {
        commit(rows.filter((r) => r.id !== id));
        // Move focus off the removed node so keyboard focus is never orphaned.
        addButtonRef.current?.focus();
      },
      [commit, rows],
    );

    const helperId = helperText ? `${baseId}-helper` : undefined;

    return (
      <fieldset
        ref={ref}
        data-scope="key-value-inputs"
        data-part="root"
        data-size={size}
        disabled={disabled}
        aria-describedby={helperId}
      >
        <legend data-scope="key-value-inputs" data-part="legend">
          {legend}
        </legend>
        {helperText ? (
          <p data-scope="key-value-inputs" data-part="helper-text" id={helperId}>
            {helperText}
          </p>
        ) : null}

        <div data-scope="key-value-inputs" data-part="rows" role="group" aria-live="polite">
          {rows.map((row, index) => {
            const keyId = `${baseId}-${row.id}-key`;
            const valueId = `${baseId}-${row.id}-value`;
            return (
              <div data-scope="key-value-inputs" data-part="row" key={row.id}>
                <FieldCell
                  field="key"
                  label={keyLabel}
                  hideLabel={index > 0}
                  inputId={keyId}
                  value={row.key}
                  placeholder={keyPlaceholder}
                  disabled={disabled}
                  size={size}
                  onValueChange={(next) => updateRow(row.id, { key: next })}
                />
                <FieldCell
                  field="value"
                  label={valueLabel}
                  hideLabel={index > 0}
                  inputId={valueId}
                  value={row.value}
                  placeholder={valuePlaceholder}
                  disabled={disabled}
                  size={size}
                  onValueChange={(next) => updateRow(row.id, { value: next })}
                />
                <div data-scope="key-value-inputs" data-part="delete-row-button-container">
                  <Button
                    color="critical"
                    size={size}
                    disabled={disabled}
                    aria-label={`Delete row ${index + 1}`}
                    onClick={() => removeRow(row.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div data-scope="key-value-inputs" data-part="footer">
          <Button
            ref={addButtonRef}
            color="secondary"
            size={size}
            disabled={disabled}
            onClick={addRow}
          >
            {addButtonText}
          </Button>
        </div>
      </fieldset>
    );
  },
);
