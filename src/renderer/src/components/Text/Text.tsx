import { createElement, forwardRef } from 'react';

import './Text.css';

/**
 * Typographic primitive, built to the Helios Text specification
 * (https://helios.hashicorp.design/components/text).
 *
 * Text is **presentational** — it has no focus, keyboard, open, or selection
 * state — so per the unstyled-primitives-ark ADR's scope clarification
 * (docs/features/accessibility/adrs/unstyled-primitives-ark.md) it wraps a plain
 * semantic HTML element rather than an Ark primitive (Ark exposes no `text`
 * primitive). It applies a predefined HDS typographic style (variant + size +
 * weight + color + alignment) to a block of text or structured content.
 *
 * Like Helios, it is **polymorphic**: the rendered element is chosen with the
 * `as` prop and defaults to `<span>` (Helios's default `@tag`). Consumers are
 * invited to pass the semantically correct element for the context (e.g.
 * `as="h1"` for a page title, `as="p"` for a paragraph) — the visual style is
 * decoupled from the tag, exactly as the Helios accessibility guidance requires.
 *
 * Styling is driven by `data-*` attributes our wrapper sets on the element
 * (`data-part`, `data-variant`, `data-size`, `data-weight`, `data-color`,
 * `data-align`) and selected in Text.css with attribute selectors — keeping the
 * no-class-name convention used by the Ark-backed components. Every value
 * resolves to a Helios `--token-typography-*` / `--token-color-foreground-*`
 * custom property (token-only; the consumer cannot inject a raw CSS color, which
 * is what the project's stylelint `declaration-strict-value` rule forbids and
 * what keeps contrast under our control).
 */

/** Font-family + type-scale family. Mirrors the Helios `Hds::Text::*` variants. */
export type TextVariant = 'display' | 'body' | 'code';

/**
 * Type-scale step within a variant. Helios scopes the available steps per
 * variant (Display: 100–500; Body and Code: 100–300); selecting a step a variant
 * does not define falls back to that variant's base size in CSS.
 */
export type TextSize = '100' | '200' | '300' | '400' | '500';

/** Font weight. Maps 1:1 to the Helios `--token-typography-font-weight-*` set. */
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * Semantic foreground color. Token-only by design: Helios lets consumers pass an
 * arbitrary CSS color string, but our CSS contract forbids raw colors (stylelint
 * `declaration-strict-value`) so contrast stays under design-system control.
 * `inherit` (the default) takes the surrounding text color.
 */
export type TextColor =
  | 'inherit'
  | 'primary'
  | 'strong'
  | 'faint'
  | 'disabled'
  | 'action'
  | 'success'
  | 'warning'
  | 'critical'
  | 'highlight';

/** Logical text alignment. */
export type TextAlign = 'start' | 'center' | 'end';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /** HTML element (or component tag name) to render. Defaults to `span`, matching Helios. */
  as?: React.ElementType;
  /** Typographic family + scale. Defaults to `body`. */
  variant?: TextVariant;
  /** Type-scale step within the variant. Defaults to `200`. */
  size?: TextSize;
  /** Font weight. Defaults to `regular`. */
  weight?: TextWeight;
  /** Semantic foreground color token. Defaults to `inherit`. */
  color?: TextColor;
  /** Logical text alignment. Unset by default (inherits). */
  align?: TextAlign;
}

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  {
    as = 'span',
    variant = 'body',
    size = '200',
    weight = 'regular',
    color = 'inherit',
    align,
    children,
    ...rest
  },
  ref,
) {
  return createElement(
    as,
    {
      ref,
      'data-part': 'text',
      'data-variant': variant,
      'data-size': size,
      'data-weight': weight,
      'data-color': color,
      ...(align ? { 'data-align': align } : {}),
      ...rest,
    },
    children,
  );
});
