import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Syntax-highlighting theme for the Code Block / Code Editor, expressed entirely
 * in Helios semantic color tokens.
 *
 * Helios itself publishes NO syntax-color tokens — only the `code-*` *typography*
 * tokens (font family / size / line-height). Its own Code Block (Prism) and Code
 * Editor (CodeMirror) lean on the highlighter library's bundled theme for token
 * hues. We cannot do that here: stylelint's `declaration-strict-value` forbids
 * raw color literals, and consuming `--token-color-palette-*` is also banned. So
 * we map Lezer's highlight tags onto the SEMANTIC foreground tokens Helios does
 * expose, which keeps the palette legible, theme-aware (light/dark), and
 * contrast-checked by the same tokens the rest of the app uses.
 *
 * `HighlightStyle.define` emits inline `color`/`font-style` on CM's token spans
 * via a generated stylesheet — these are NOT authored CSS declarations, so they
 * are out of stylelint's scope; the token references here are the single source
 * of truth for syntax color and stay token-only by construction.
 *
 * Tag → token rationale (semantic, not literal hue-matching):
 *  - keyword / operator / control flow → `foreground-action` (the app's accent)
 *  - string / inserted content         → `foreground-success`
 *  - number / boolean / atom / constant→ `foreground-highlight`
 *  - comment / meta                    → `foreground-faint` (de-emphasized)
 *  - type / class / namespace          → `foreground-strong`
 *  - invalid / deleted                 → `foreground-critical`
 *  - everything else                   → inherits `foreground-primary` from the
 *    editor surface (no explicit rule needed)
 */
const heliosHighlightStyle = HighlightStyle.define([
  // Keywords and operators — the accent color.
  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword],
    color: 'var(--token-color-foreground-action)',
  },
  { tag: [t.operator, t.derefOperator], color: 'var(--token-color-foreground-action)' },

  // Names: functions, properties, variables, attributes.
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: 'var(--token-color-foreground-strong)',
  },
  { tag: [t.propertyName, t.attributeName], color: 'var(--token-color-foreground-primary)' },
  { tag: [t.variableName, t.labelName], color: 'var(--token-color-foreground-primary)' },

  // Types, classes, namespaces — emphasized.
  {
    tag: [t.typeName, t.className, t.namespace, t.definition(t.typeName)],
    color: 'var(--token-color-foreground-strong)',
  },

  // Strings and inserted/added content — success hue.
  {
    tag: [t.string, t.special(t.string), t.regexp, t.inserted],
    color: 'var(--token-color-foreground-success)',
  },

  // Numbers, booleans, atoms, constants — highlight hue.
  {
    tag: [t.number, t.bool, t.atom, t.constant(t.variableName)],
    color: 'var(--token-color-foreground-highlight)',
  },

  // Comments and metadata — de-emphasized, italicized.
  {
    tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
    color: 'var(--token-color-foreground-faint)',
    fontStyle: 'italic',
  },
  { tag: [t.meta, t.documentMeta], color: 'var(--token-color-foreground-faint)' },

  // Punctuation, brackets, separators — faint so structure recedes.
  { tag: [t.punctuation, t.bracket, t.separator], color: 'var(--token-color-foreground-faint)' },

  // Errors and deleted content — critical hue.
  { tag: [t.invalid, t.deleted], color: 'var(--token-color-foreground-critical)' },

  // Markdown-ish / doc emphasis (harmless if the language never emits them).
  { tag: t.heading, color: 'var(--token-color-foreground-strong)', fontWeight: 'bold' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, color: 'var(--token-color-foreground-action)', textDecoration: 'underline' },
]);

/**
 * The composable extension that registers {@link heliosHighlightStyle} with an
 * editor. Both Code Block and Code Editor include this once.
 */
export const heliosSyntaxHighlighting: Extension = syntaxHighlighting(heliosHighlightStyle);
