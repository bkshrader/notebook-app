## Do not implement the Helios app-shell components

- Status: accepted
- Date: 2026-06-02
- Deciders: Bradley Shrader
- Tags: frontend, design-system, component-library, scope

## Context and Problem Statement

The [Component Library](../../component-library/OVERVIEW.md) is our in-repo set of
accessible React primitives, each a thin token-styled wrapper over an
[Ark UI](https://ark-ui.com/) primitive where one exists and a plain semantic HTML
element where none does ([unstyled-primitives-ark ADR](./unstyled-primitives-ark.md)).
During the 2026-06 Helios coverage reconciliation we diffed our component set against
the [Helios Design System](./design-system-helios.md) component catalogue and built out
the missing primitives (Alert, Badge, Card, Button, Toast, Dropdown, the form controls,
and so on).

That reconciliation left one cluster explicitly unbuilt: the **app-shell** components
Helios publishes —

- **App Header**
- **App Footer**
- **App Side Nav**
- **Page Header**
- **Filter Bar**
- **Application State**

The question this ADR settles is whether these belong in our Component Library at all.
Decision: **they do not, and are not planned.** This records that so the gap is a
deliberate, documented scope boundary rather than an oversight a future reader (or
audit) re-opens.

## Decision Drivers

- The Component Library's charter is **reusable, composable primitives** — a widget you
  drop in many places and parameterise via props
  ([Component Library OVERVIEW](../../component-library/OVERVIEW.md)). A component earns
  its place by being reused and by encapsulating non-trivial behaviour or styling.
- `notebook-app` is a **local-first, single-purpose desktop notes app for academics**
  ([project charter](../OVERVIEW.md)), not a multi-tenant enterprise cloud console — the
  product Helios's app shell was designed for.
- **ADHD-first, stable, predictable layout** is a non-negotiable constraint
  ([accessibility OVERVIEW](../OVERVIEW.md)). The app's chrome is one bespoke, stable
  surface, not a library of interchangeable shell parts.
- We do not pay the cost of building, testing (a11y matrix), and maintaining a primitive
  we will instantiate exactly once.

## Decision Outcome

**We will not implement the Helios app-shell components as Component Library
primitives.** They fall into two buckets, both of which fail the "earns its place as a
reusable primitive" test:

### 1. Components that do not fit this application's design

**App Header, App Footer, App Side Nav, Application State** are the navigational and
status chrome of a HashiCorp-style enterprise web console — a global product-switcher
header, an org/project side navigation, a marketing-style footer, and full-page
empty/error/loading "application state" screens. `notebook-app` is a local-first desktop
notes app with a single, bespoke window chrome. There is no second consumer of an
"App Header" here; there is no org switcher, no multi-product footer, no cloud
application-state taxonomy. Building these as parameterised primitives would be
inventing reuse that does not exist, and would pull an enterprise-console information
architecture into an app whose ADHD-first charter calls for one stable, purpose-built
layout. When the app needs its header/sidebar/empty-states, they will be **bespoke
screens assembled from the existing primitives** (Button, Text, Icon, Separator,
Alert, …), not instances of a shell component.

### 2. Components that are layout-only rules, not components

**Page Header and Filter Bar** are, in Helios, essentially _layout conventions_ — a
title-plus-actions row, and a row of filter controls with consistent spacing. They
carry almost no behaviour and no encapsulated state; their "implementation" is a flex
container with gap and alignment tokens wrapping primitives the consumer already owns
(headings, Buttons, the form controls, Badge counts). Wrapping a one-line layout rule in
a `forwardRef` component, a CSS file, stories, and an a11y test adds indirection without
adding value — the same trap the [unstyled-primitives-ark ADR](./unstyled-primitives-ark.md)
already calls out for `Separator`-style one-liners, here applied to layout containers.
These patterns are better expressed as **documented composition** (a layout recipe in
[DESIGN.md](../../../../DESIGN.md) when a screen needs one) than as library primitives.

### Positive Consequences

- The Component Library stays a set of genuinely reusable primitives; no single-use or
  layout-only components dilute it.
- No build/test/maintenance cost for primitives that would be instantiated once or never.
- The app's chrome stays bespoke and stable, honouring the ADHD-first layout constraint
  instead of importing an enterprise-console shell.
- The coverage gap is now intentional and documented — future Helios-reconciliation
  passes treat these as out-of-scope-by-decision, not "missing".

### Negative Consequences

- A future reader comparing our set to the Helios catalogue will see these absent and
  must read this ADR to understand why (mitigated by this record and the
  [component-library PROGRESS note](../../component-library/PROGRESS.md)).
- If `notebook-app` ever grows a genuinely repeated shell pattern (unlikely given the
  charter), this decision must be revisited — see below.

## When to revisit

Reopen this decision only if a concrete, **repeated** need appears: e.g. the app gains
multiple distinct windows that each need the same header/sidebar chrome, or a page-header
/ filter-bar layout is being copy-pasted across enough screens that a shared component
would remove real duplication. At that point, build the **specific** pattern the app
actually repeats — not the full Helios app-shell set — and supersede this ADR.

## Links

- [Component Library OVERVIEW](../../component-library/OVERVIEW.md) — the charter these
  components are judged against.
- [unstyled-primitives-ark ADR](./unstyled-primitives-ark.md) — Ark-or-plain-HTML
  wrapper scope; the "CSS one-liner isn't worth a component" principle.
- [design-system-helios ADR](./design-system-helios.md) — tokens-only Helios consumption.
- [accessibility OVERVIEW](../OVERVIEW.md) — the ADHD-first, stable-layout charter.
- [component-library PROGRESS](../../component-library/PROGRESS.md) — the 2026-06 audit +
  expansion that surfaced this gap.
- [DESIGN.md](../../../../DESIGN.md) — where bespoke layout recipes live instead.
- MADR template: <https://adr.github.io/madr/>
