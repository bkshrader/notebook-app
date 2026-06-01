import { forwardRef } from 'react';

import { Accordion as ArkAccordion, type AccordionRootProps } from '@ark-ui/react/accordion';

import './Accordion.css';

/** Visual variant. `card` is the Helios default and recommended type. */
export type AccordionType = 'card' | 'flush';

/** Size scale, set once at the group level (never mixed per item). */
export type AccordionSize = 'small' | 'medium' | 'large';

/**
 * Heading element wrapping each toggle. Helios defaults to `div`, but this is an
 * accessibility-first project, so we default to a real heading (`h3`) and let
 * consumers raise/lower it to match the surrounding document outline (WCAG
 * 1.3.1). Use `div` only when a heading is genuinely inappropriate.
 */
export type AccordionTitleTag = 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export interface AccordionItem {
  /** Unique identifier for this item. */
  value: string;
  /** Visible header text for the trigger button. Required (WCAG 4.1.2). */
  title: React.ReactNode;
  /** Content revealed when the item is open. */
  content: React.ReactNode;
  /** Whether this individual item is disabled. */
  disabled?: boolean;
  /**
   * Non-interactive item: the toggle cannot be operated and the chevron is
   * hidden. Mirrors Helios `@isStatic`. A static item renders its title as a
   * plain heading (no button) so assistive tech is not told there is an
   * inert control to activate.
   */
  isStatic?: boolean;
  /**
   * The toggle row hosts its own interactive content (links/buttons), so only
   * the chevron acts as the expand/collapse control. Mirrors Helios
   * `@containsInteractive`. The title region becomes non-toggling.
   */
  containsInteractive?: boolean;
  /**
   * Accessible name for the chevron-only toggle button when
   * `containsInteractive` is set (the visible title is not the button's label
   * in that mode, so the icon button needs its own name — WCAG 4.1.2).
   * Defaults to `"Toggle section"`.
   */
  toggleLabel?: string;
}

export interface AccordionProps extends AccordionRootProps {
  /** Items to render. Each item's `title` becomes the trigger's accessible name. */
  items: AccordionItem[];
  /** Visual variant. Defaults to `card` (Helios default & recommended). */
  type?: AccordionType;
  /** Size scale for padding, typography, and icon size. Defaults to `medium`. */
  size?: AccordionSize;
  /** Heading element wrapping each toggle. Defaults to `h3`. */
  titleTag?: AccordionTitleTag;
}

/** Downward chevron — rotates 180° when its item is open (see Accordion.css). */
function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Heading element wrapping a toggle, configured by `titleTag`. */
type HeadingTag = AccordionTitleTag;

/** Static header: no operable control; chevron hidden via CSS (`data-static`). */
function StaticHeader({ title, Heading }: { title: React.ReactNode; Heading: HeadingTag }) {
  return (
    <Heading data-scope="accordion" data-part="item-heading">
      <div data-scope="accordion" data-part="item-trigger" data-static="">
        <span data-scope="accordion" data-part="item-indicator" aria-hidden="true">
          <ChevronIcon />
        </span>
        <span data-scope="accordion" data-part="toggle-content">
          {title}
        </span>
      </div>
    </Heading>
  );
}

/** Contains-interactive header: chevron is the toggle button, title is static. */
function InteractiveHeader({
  title,
  toggleLabel,
  Heading,
}: {
  title: React.ReactNode;
  toggleLabel: string;
  Heading: HeadingTag;
}) {
  return (
    <Heading data-scope="accordion" data-part="item-heading">
      <div data-scope="accordion" data-part="item-trigger">
        <ArkAccordion.ItemTrigger data-part="item-toggle-button" aria-label={toggleLabel}>
          <ArkAccordion.ItemIndicator>
            <ChevronIcon />
          </ArkAccordion.ItemIndicator>
        </ArkAccordion.ItemTrigger>
        <span data-scope="accordion" data-part="toggle-content">
          {title}
        </span>
      </div>
    </Heading>
  );
}

/** Default header: the whole row is the toggle button. */
function DefaultHeader({ title, Heading }: { title: React.ReactNode; Heading: HeadingTag }) {
  return (
    <Heading data-scope="accordion" data-part="item-heading">
      <ArkAccordion.ItemTrigger>
        <ArkAccordion.ItemIndicator>
          <ChevronIcon />
        </ArkAccordion.ItemIndicator>
        <span data-scope="accordion" data-part="toggle-content">
          {title}
        </span>
      </ArkAccordion.ItemTrigger>
    </Heading>
  );
}

/** The three interaction modes an item can take. */
type ItemMode = 'static' | 'interactive' | 'default';

/** Resolve an item's interaction mode (single decision, no compound booleans). */
function itemMode(item: AccordionItem): ItemMode {
  if (item.isStatic) return 'static';
  if (item.containsInteractive) return 'interactive';
  return 'default';
}

/** Header element for an item, chosen by its mode. */
function ItemHeader({ item, Heading }: { item: AccordionItem; Heading: HeadingTag }) {
  const headers: Record<ItemMode, React.ReactNode> = {
    static: <StaticHeader title={item.title} Heading={Heading} />,
    interactive: (
      <InteractiveHeader
        title={item.title}
        toggleLabel={item.toggleLabel ?? 'Toggle section'}
        Heading={Heading}
      />
    ),
    default: <DefaultHeader title={item.title} Heading={Heading} />,
  };
  return <>{headers[itemMode(item)]}</>;
}

/** Renders one accordion item, selecting the header shape for its mode. */
function AccordionItemView({
  item,
  type,
  size,
  Heading,
}: {
  item: AccordionItem;
  type: AccordionType;
  size: AccordionSize;
  Heading: HeadingTag;
}) {
  const mode = itemMode(item);
  // Static items are always non-interactive; an explicit `disabled` also wins.
  const disabled = mode === 'static' || Boolean(item.disabled);

  return (
    <ArkAccordion.Item
      value={item.value}
      disabled={disabled}
      data-type={type}
      data-size={size}
      data-static={mode === 'static' ? '' : undefined}
      data-contains-interactive={mode === 'interactive' ? '' : undefined}
    >
      <ItemHeader item={item} Heading={Heading} />
      <ArkAccordion.ItemContent>
        <div data-scope="accordion" data-part="item-body">
          {item.content}
        </div>
      </ArkAccordion.ItemContent>
    </ArkAccordion.Item>
  );
}

/**
 * Token-styled wrapper over Ark UI's Accordion, built to match the Helios
 * Accordion specification (https://helios.hashicorp.design/components/accordion).
 *
 * Anatomy (from @ark-ui/react/accordion):
 *   Root > Item > ItemTrigger (contains ItemIndicator) + ItemContent
 *
 * Helios parity:
 *   - `type` (card | flush) and `size` (small | medium | large) drive the
 *     variant containers and the size matrix via `data-type` / `data-size`.
 *   - The chevron precedes the label (chevron → gap → label, left-aligned),
 *     with the label in a `toggle-content` part that grows to fill the row.
 *   - Each toggle is wrapped in a configurable heading (`titleTag`).
 *   - `isStatic` and `containsInteractive` reshape the interactive surface.
 *   - Defaults to `multiple` + `collapsible` so any number of items can be open
 *     and every open item can close — matching Helios. Override either prop.
 *
 * The trigger is a native `<button>` with `aria-expanded` and `aria-controls`
 * managed by Ark/Zag. Styling targets Ark's `data-scope`/`data-part`
 * attributes (per the unstyled-primitives-ark ADR) — no custom class names.
 * Deviation from Helios: the default `titleTag` is a heading, not `div`
 * (accessibility-first); and (per project decision) the open item is NOT
 * recolored to the action color — only the chevron rotates.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    items,
    children,
    type = 'card',
    size = 'medium',
    titleTag = 'h3',
    // Helios allows any number of items open at once; default to that. Passing
    // `multiple` (and `collapsible`) explicitly still overrides these defaults.
    multiple = true,
    collapsible = true,
    ...rootProps
  },
  ref,
) {
  const Heading = titleTag;

  return (
    <ArkAccordion.Root
      ref={ref}
      data-type={type}
      data-size={size}
      multiple={multiple}
      collapsible={collapsible}
      {...rootProps}
    >
      {items.map((item) => (
        <AccordionItemView key={item.value} item={item} type={type} size={size} Heading={Heading} />
      ))}
      {children}
    </ArkAccordion.Root>
  );
});
