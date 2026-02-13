# hexOS Brand Guidelines

**Version:** 1.2
**Last updated:** February 14, 2026
**Status:** Active — all new UI work must follow this guide

---

## Design Philosophy

hexOS is a command center for an AI automation agency. The interface draws from two influences: the warm materiality of classical Islamic scholarly spaces (umber tones, warm stone, patina) and the industrial restraint of Teenage Engineering product design (precision typography, monochrome surfaces, deliberate accent usage). The result is a dark-first interface that feels like a precision instrument with soul — not another cold SaaS dashboard, not a decorative novelty.

The guiding principles:

- **Data speaks, chrome doesn't.** Every visual element must earn its place. If a border, shadow, or badge doesn't improve scannability, remove it.
- **Warmth lives in the surfaces, not the content.** Backgrounds and borders carry warm undertones. Text and data stay neutral for readability.
- **One accent means something.** Teal appears only where there is intent — interactive elements, active states, new information. If everything is highlighted, nothing is.
- **Typography creates hierarchy, not decoration.** Size and weight do the heavy lifting. Color is secondary. Decorative styling is absent.

---

## Color System

### Dark Mode (Primary — ship this first)

All hex values below. OKLCH equivalents should be generated for the CSS custom properties in `globals.css`.

#### Backgrounds

| Token | Hex | Usage |
|---|---|---|
| `--bg-void` | `#0c0a08` | Page background, deepest layer |
| `--bg-surface` | `#141210` | Sidebar, top bar, panel backgrounds |
| `--bg-card` | `#181613` | Card containers, table wrappers, elevated panels |
| `--bg-hover` | `#1e1c18` | Hover state for rows, interactive surfaces |
| `--bg-elevated` | `#222019` | Dropdowns, command palette, tooltips, popovers — anything floating above cards |
| `--bg-overlay` | `rgba(8,7,5,0.70)` | Modal/dialog backdrop scrim |

Note the warm brown undertone in every value. These are not neutral grays — they sit in the amber-brown spectrum. `#0c0a08` reads as black but has life in it. This warmth is what distinguishes hexOS from Linear, Vercel, or any blue-gray SaaS tool.

The elevation hierarchy is strict: `void > surface > card > hover > elevated`. Every floating layer must be one step lighter than the surface it floats above. Dropdowns on cards use `--bg-elevated`. Modals use `--bg-elevated` for the dialog, `--bg-overlay` for the scrim.

#### Borders

| Token | Hex / RGBA | Usage |
|---|---|---|
| `--border-hairline` | `rgba(210,195,170,0.06)` | Card outlines, row separators (barely visible) |
| `--border-rule` | `rgba(210,195,170,0.10)` | Section dividers, table headers, stronger separations |
| `--border-active` | `rgba(210,195,170,0.18)` | Focus rings, active card borders |

Borders use warm-tinted transparency, not raw gray. The base color `rgb(210,195,170)` is a warm stone tone, so even at 6% opacity the borders read as organic rather than clinical.

#### Shadow

| Token | Value | Usage |
|---|---|---|
| `--shadow-float` | `0 8px 24px rgba(0,0,0,0.4)` | Dropdowns, popovers, command palette, modals — all floating surfaces |

This is the only shadow in the system. Cards, buttons, and static surfaces never use shadows. Only elements that float above the page (dropdowns, tooltips, modals) get `--shadow-float` to create physical separation from the layer beneath.

#### Text

| Token | Hex | Contrast on void | Usage |
|---|---|---|---|
| `--text-primary` | `#e2dbd0` | ~12:1 | Headings, project names, primary data |
| `--text-secondary` | `#a49a8e` | ~5.5:1 | Client names, body text, table content |
| `--text-tertiary` | `#8a8078` | ~4.5:1 | Labels, metadata, timestamps |
| `--text-ghost` | `#4d453d` | ~1.8:1 | Decorative only — footer, version number, disabled text |

Primary and secondary text are warm-tinted off-whites. They are NOT pure white — `#e2dbd0` has a stone warmth that reduces eye strain on dark backgrounds during long sessions.

`--text-tertiary` is bumped to `#8a8078` (~4.5:1 contrast) to meet WCAG AA for normal text. This applies to all metadata labels, timestamps, and anything the user needs to read. The previous `#746b62` was below threshold and is retired.

`--text-ghost` (`#4d453d`) is intentionally below WCAG thresholds and must ONLY be used for decorative, non-essential content: footer text, version strings, disabled placeholders. Never for labels, timestamps, or any content the user needs to read.

#### Accent — Desaturated Teal

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#6b9e94` | Interactive elements, active nav, links, CTA text |
| `--accent-dim` | `rgba(107,158,148,0.08)` | Active nav background, selected row tint |
| `--accent-border` | `rgba(107,158,148,0.25)` | Active tab borders, focus outlines |

This teal is NOT bright cyan. It is desaturated and slightly warm — closer to oxidized copper or turquoise patina than neon. It must only appear where there is user intent: clickable elements, active states, new information indicators. If a component doesn't respond to interaction, it should not use the accent color.

Forbidden uses of accent: background fills, decorative borders, static badges, chart fills (use signal colors instead).

#### Signal Colors (Status)

| Token | Value | Meaning |
|---|---|---|
| `--signal-good` | `#7a9e7a` | On track, complete, healthy |
| `--signal-good-dim` | `rgba(122,158,122,0.10)` | Background tint for good-status chips and indicators |
| `--signal-warn` | `#c4a24a` | At risk, approaching deadline, needs attention |
| `--signal-warn-dim` | `rgba(196,162,74,0.10)` | Background tint for warn-status chips and indicators |
| `--signal-bad` | `#b86054` | Behind, blocked, overdue, failed |
| `--signal-bad-dim` | `rgba(184,96,84,0.10)` | Background tint for bad-status chips and indicators |

Signal colors are deliberately desaturated. They communicate status without screaming. The `-dim` variants are named CSS custom properties used for subtle background tints on status chips, health indicators, and editor callout blocks. Signal colors appear as dots, progress bar fills, and inline text — never as full card backgrounds or large colored regions.

There is no blue or purple in this system. Every color has a warm undertone.

#### Form Controls

| Token | Value | Usage |
|---|---|---|
| `--control-bg` | `#0f0d0b` | Input, select, textarea backgrounds — slightly darker than card to appear inset |
| `--control-border` | `rgba(210,195,170,0.10)` | Default input border (same as `--border-rule`) |
| `--control-border-hover` | `rgba(210,195,170,0.18)` | Input border on hover (same as `--border-active`) |
| `--control-border-focus` | `rgba(107,158,148,0.40)` | Input border on focus — accent-tinted |
| `--control-ring` | `rgba(107,158,148,0.15)` | Focus ring glow (box-shadow) around focused inputs |
| `--control-placeholder` | `#5c554d` | Placeholder text — below tertiary, above ghost |
| `--control-disabled-bg` | `#111010` | Disabled input background |
| `--control-disabled-text` | `#4d453d` | Disabled input text (same as `--text-ghost`) |

Form controls use an inset appearance — `--control-bg` is darker than `--bg-card` to create the impression of a recessed surface. This matches the TE approach where input areas feel physically "pressed in" to the panel.

Focus states use the accent color as a border and a subtle ring glow, making it clear which field is active without being garish. Every `<Input>`, `<Select>`, `<Textarea>`, and `<Button>` in the app must use these tokens. No raw `stone-*` or `cyan-*` values.

### Light Mode (Future — not yet designed)

Light mode will follow when dark mode is fully shipped and stable. It will invert the surface hierarchy (warm off-white backgrounds, dark text) while keeping the same accent and signal colors. Do not attempt to build light mode until this guide is updated with light mode tokens.

---

## Typography

### Font Stack

| Role | Font | Fallback | Usage |
|---|---|---|---|
| **Display & Body** | DM Sans | `system-ui, sans-serif` | Headings, project names, body text, descriptions |
| **Mono / Labels** | JetBrains Mono | `'SF Mono', monospace` | Metadata labels, timestamps, status text, table headers, KPIs, numerical data |

DM Sans is the primary typeface. It has enough character to not feel generic (unlike Inter) while remaining highly legible at small sizes on screens. JetBrains Mono is used for all metadata and labels — it creates a clear visual distinction between "data" (mono) and "content" (sans) without needing color or weight changes.

**Breaking change from current codebase:** The current app uses **Switzer** (loaded as a local font with 18 weight files in `/app/fonts/Switzer-*.otf`). This guide replaces Switzer with DM Sans. Implementation requires:

1. Remove all `/app/fonts/Switzer-*.otf` files
2. Remove the `localFont` import and `switzer` declaration in `app/layout.tsx`
3. Add DM Sans via Google Fonts (`next/font/google`) or as a local font
4. Add JetBrains Mono via Google Fonts (replacing or supplementing Geist Mono)
5. Update `--font-sans` to point to DM Sans and `--font-mono` to JetBrains Mono
6. **Test all pages for text overflow** — DM Sans has different character widths than Switzer. Truncation points, line breaks, and layout spacing will shift. Pay attention to sidebar labels, table cells, card titles, and badge text.

### Type Scale

| Element | Font | Size | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| Hero metric | DM Sans | 56px | 400 | -0.03em | Portfolio count, primary KPI on dashboard |
| Card metric | DM Sans | 24px | 500 | -0.02em | Stat card values (pipeline value, inquiry count) |
| Section heading | DM Sans | 14px | 500 | 0 | "Active Projects", card headers |
| Body / row text | DM Sans | 13px | 500 | 0 | Project names, client names in tables |
| Body secondary | DM Sans | 12-13px | 400 | 0 | Descriptions, secondary table content |
| Mono label | JetBrains Mono | 10px | 500 | 0.08em | Section labels ("PORTFOLIO", "RECENT ACTIVITY") |
| Mono data | JetBrains Mono | 11px | 400 | 0.04em | Due dates, scope counts, percentages |
| Mono tiny | JetBrains Mono | 10px | 400 | 0.06em | Timestamps, footer, version |

Key rules:

- Mono labels are ALWAYS uppercase with wide letter spacing. This creates the "instrument panel" labeling aesthetic.
- Hero metrics use weight 400, not 600/700. Size creates hierarchy, not boldness. This is the core TE influence.
- Negative letter spacing on large type (-0.02 to -0.03em) keeps big numbers tight and controlled.
- Body text never goes below 12px. Mono metadata can go to 10px because monospace fonts are inherently more legible at small sizes.

---

## Spacing System

Base unit: **4px**. Every spacing value in the system is a multiple of 4.

| Token | Value | Multiples | Usage |
|---|---|---|---|
| `--space-1` | 4px | 1x | Tight gaps (icon to label, dot to text) |
| `--space-2` | 8px | 2x | Inline element gaps, compact padding |
| `--space-3` | 12px | 3x | Table row vertical padding, small card padding |
| `--space-4` | 16px | 4x | Panel gaps, between bottom grid items |
| `--space-5` | 20px | 5x | Metric strip cell padding |
| `--space-6` | 24px | 6x | Card internal padding, table horizontal padding |
| `--space-8` | 32px | 8x | Page horizontal padding, main content padding |
| `--space-9` | 36px | 9x | Between major sections |
| `--space-10` | 40px | 10x | Large section gaps (below hero) |

### Specific Applications

| Context | Token | Value |
|---|---|---|
| Page padding (horizontal) | `--space-8` | 32px |
| Between major sections | `--space-9` | 36px |
| Card internal padding | `--space-6` | 24px |
| Table row padding (vertical) | `--space-3` | 12px |
| Table row padding (horizontal) | `--space-6` | 24px |
| Between bottom panels | `--space-4` | 16px |
| Metric strip cell padding (vertical) | `--space-5` | 20px |
| Metric strip cell padding (horizontal) | `--space-6` | 24px |
| Content max-width | — | 1060px |

All values snap to the 4px grid. No exceptions. If a spacing value doesn't feel right at the nearest multiple of 4, adjust the surrounding elements — don't break the grid.

---

## Layout

### Navigation Structure

**Sidebar (Primary):** Supports two states:

**Collapsed (default):** 60px wide, icon-only. Nav icons are 18px stroke SVGs. Active state uses `accent-dim` background with `accent` icon color. Badge counts appear as small (16px) numbered dots overlaid on the icon's top-right corner, using `--signal-warn` background for attention items. Settings pinned to bottom.

**Expanded (on hover or toggle):** 220px wide. Shows text labels, group headers, badge counts as inline numbers, and team presence indicators (avatar dots with online status). The suggestion box lives here. User profile dropdown at the bottom.

The collapsed state is the default working mode — it preserves content width. The expanded state is for navigation discovery and checking operational counts. Transition between states: 150ms ease-out.

**Top bar (Secondary/Contextual):** 48px tall. Its content adapts based on the current page:

**List pages** (projects, inquiries, conversations, etc.): Page title on the left, sub-navigation filter tabs (e.g., Active / Retainer / Completed) in the center, command-K search trigger and date on the right.

**Detail pages** (project/[id], inquiry/[id], meeting/[id], etc.): Breadcrumb trail on the left (`Projects > Client Name > Project Name`), with command-K search trigger on the right. Breadcrumbs use `--text-tertiary` for ancestors, `--text-primary` for current page. Separator: `/` in `--text-ghost`. Breadcrumb links use `--accent` on hover.

**Settings and utility pages** (settings, notifications, etc.): Page title on the left, command-K on the right. No tabs, no breadcrumbs — these pages are flat.

On mobile, the top bar simplifies to page title (or back arrow on detail pages) + search trigger. Breadcrumbs are hidden on mobile — the back arrow replaces them.

### Content Zones

The main content area uses a single-column layout at max-width 1060px, centered. Content is organized in this hierarchy:

1. **Hero zone** — the single most important metric for this page, displayed large with health breakdown inline
2. **Metric strip** — 4-column panel with secondary KPIs, divided by vertical hairlines (not separate cards)
3. **Primary data** — the main table or list for this page (projects, inquiries, etc.)
4. **Supporting panels** — two-column grid for secondary information (activity feed, pipeline, etc.)

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|---|---|---|
| **Desktop** | >=1024px | Full layout — sidebar (collapsed/expandable) + top bar + content |
| **Tablet** | 768-1023px | Sidebar hidden by default (hamburger trigger in top bar), content full-width, metric strip collapses to 2x2 grid |
| **Mobile** | <768px | Bottom nav replaces sidebar (5 icon tabs), top bar simplified to page title + search, metric strip stacks vertically, tables switch to card-list view, hero metric scales to 40px |

Mobile-specific rules:

- Touch targets minimum 44x44px
- Bottom nav height: 56px with safe area padding for iOS
- Cards get 16px horizontal margin (full bleed)
- Tables are replaced by stacked card views with the most important columns visible and the rest expandable
- The command palette (Cmd+K) becomes the primary search on mobile, triggered from the top bar
- PWA installation prompt uses `--bg-elevated` card with `--accent` CTA

---

## Data Density

hexOS is a data-heavy command center. Lists will grow. The system needs rules for when tables get long.

### Table Pagination

Tables show **25 rows** by default. If the dataset exceeds 25 items, show a "Load more" trigger at the bottom of the table — a single text link in `--text-tertiary` mono 10px uppercase: `SHOW MORE (N REMAINING)`. No numbered pagination. No infinite scroll.

The "load more" pattern keeps the user in control (no surprise content shifting) while avoiding page-load overhead of full pagination.

### Search & Filter Persistence

Every list page (projects, inquiries, conversations, etc.) uses the same filter pattern:

- **Top bar** contains sub-nav filter tabs (e.g., Active / Retainer / Completed)
- **Below top bar** a search input (using `--control-bg` tokens, not a separate search bar style)
- Filter state is stored in URL search params so it survives refresh and sharing
- Active filters show a count: "12 projects" in `--text-tertiary` mono data style

### Empty States

When a filtered or unfiltered list returns zero results:

- No illustration or icon. Just centered text.
- Primary message: DM Sans 13px / 500 / `--text-secondary`
- Secondary hint: DM Sans 12px / 400 / `--text-tertiary`
- Example: "No active projects" / "Create your first project or check another filter"

---

## Component Treatments

### Cards

Cards use `--bg-card` with `--border-hairline` borders and `border-radius: 10px`. They are containers, not decorations — minimal chrome, no shadows, no gradients, no header bars unless the card genuinely needs a title/action row.

Card header rows (when needed) use a `--border-rule` bottom border to separate the title from content. No background color difference for headers.

Hover state on interactive cards: `--bg-hover`.

### Tables

Tables live inside cards. Column headers use mono 10px uppercase with `--text-tertiary` color. Row text uses sans 13px. Rows are separated by `--border-hairline` dividers. Hover state on rows: `--bg-hover` background.

Progress bars within tables are 3px tall, use signal colors, with `--border-hairline` as the track color.

### Status Indicators

Status is communicated through signal dots (7px circles) paired with short text labels in the corresponding signal color. Never use colored badges, pills, or background fills for status.

Health summary chips (used in the hero zone) are the one exception — they use `signal-*-dim` backgrounds with a signal dot and count. These are small, inline elements, not large cards.

### Buttons & Interactive Elements

Primary actions use `--accent` text color or `--accent-dim` background with `--accent-border` outline. There are no filled/solid accent buttons in the default system — the accent is always used as tint + border + text, never as a solid block.

Destructive actions use `--signal-bad` following the same tint + border + text pattern.

Sub-nav filter tabs use `--accent-dim` background with `--accent-border` on active state. Inactive tabs are transparent with `--text-tertiary` color.

### Form Controls

All inputs (`<Input>`, `<Select>`, `<Textarea>`) use:

- Background: `--control-bg`
- Border: `--control-border` (default), `--control-border-hover` (hover), `--control-border-focus` (focus)
- Focus ring: `--control-ring` as a `box-shadow` spread
- Text: `--text-primary`
- Placeholder: `--control-placeholder`
- Disabled: `--control-disabled-bg` + `--control-disabled-text`
- Border radius: 8px
- Height: 36px (default), 32px (compact/table), 40px (forms)

Labels above inputs use mono 10px uppercase `--text-tertiary` — same as section labels. Helper/error text below inputs uses 12px sans, error text uses `--signal-bad`.

### Dropdowns, Popovers & Command Palette

All floating surfaces use:

- Background: `--bg-elevated`
- Border: `--border-rule`
- Border radius: 10px
- Shadow: `--shadow-float` — the only shadow in the system, used exclusively to lift floating elements off the page

The command palette (Cmd+K) uses `--bg-elevated` with `--control-bg` for its search input. Result items use `--bg-hover` on hover.

Modal dialogs use `--bg-elevated` for the dialog body with `--bg-overlay` as the backdrop scrim.

### Sparklines

Small inline charts (72x24px default) that sit alongside metric values. They use stroke-only rendering at 1.5px with 50% opacity — visible enough to show trend, not bright enough to compete with the number. Sparkline color matches the metric's signal color or uses `--accent` for neutral metrics.

### Navigation

Sidebar icons are 18px stroke-based SVGs, 1.3px stroke width. Active icon color is `--accent`, inactive is `--text-tertiary`. Active background is `--accent-dim` with 8px border-radius.

Badge overlays on collapsed sidebar icons: 16px circles, `--signal-warn` background, `--text-primary` text at 9px mono weight 600. Position: top-right of the 40px icon button, offset -4px.

---

## Rich Text Editor (Plate.js)

The editor inherits the base token system. Specific treatments:

| Element | Treatment |
|---|---|
| Editor surface | `--bg-card` background — sits inside a card container |
| Body text | DM Sans 14px / 400 / `--text-primary` / line-height 1.7 |
| Code blocks | `--control-bg` background, `--border-rule` border, JetBrains Mono 13px, 12px padding |
| Inline code | `--control-bg` background, `--border-hairline` border, JetBrains Mono 12px, 2px 6px padding |
| Callout blocks | `--signal-warn-dim` background (info), `--signal-bad-dim` (warning), `--signal-good-dim` (success), left border 3px solid matching signal color |
| Block quotes | Left border 3px `--border-active`, `--text-secondary` text, italic |
| Comment threads | `--bg-elevated` popover, `--accent` for the highlight on commented text |
| AI suggestion highlights | `--accent-dim` background on suggested text, `--accent-border` underline |
| Floating toolbar | `--bg-elevated` background, `--border-rule` border, shadow per dropdown spec |
| Table cells | `--border-rule` borders, `--bg-surface` header row |
| Links | `--accent` color, no underline by default, underline on hover |

The editor's toolbar icons follow the same 18px / 1.3px stroke convention as sidebar icons.

---

## Motion

hexOS uses minimal, precise motion. The TE influence: transitions are fast and mechanical, not bouncy or playful. No spring physics, no overshoot, no mount animations on cards.

| Context | Duration | Easing | Property |
|---|---|---|---|
| Hover states (rows, buttons) | 100ms | `ease-out` | `background-color` |
| Nav active state | 150ms | `ease-out` | `color`, `border-color`, `background-color` |
| Sidebar expand/collapse | 150ms | `ease-out` | `width` |
| Dropdown open | 120ms | `ease-out` | `opacity`, `transform` (scale 0.97 to 1) |
| Dropdown close | 80ms | `ease-in` | `opacity`, `transform` |
| Modal open | 150ms | `ease-out` | `opacity`, dialog: `transform` (translateY 8px to 0) |
| Modal close | 100ms | `ease-in` | `opacity`, `transform` |
| Progress bar fill | 500ms | `ease` | `width` |
| Page transitions | None | — | No page-level animations. Content appears instantly. |

Forbidden motion patterns:

- No mount animations on cards or list items (no staggered pop-in)
- No spring/bounce easing
- No skeleton loaders with shimmer animation (use static placeholder shapes in `--border-hairline` color)
- No parallax, no scroll-triggered animations
- No `pulse-glow`, `fire-glow`, or attention-seeking keyframe animations

Remove all existing keyframe animations (`pop-in`, `slide-in`, `fade-in-up`, `fire-glow`, `pulse-glow`) from the codebase.

---

## Signal & Status Mapping

This is the single source of truth for status-to-color mapping. All components must reference these values. No hardcoded colors anywhere.

| Status | Signal token | Text label | Dot | Progress bar |
|---|---|---|---|---|
| On Track / Healthy / Complete | `--signal-good` | "On Track" | `--signal-good` | `--signal-good` fill |
| At Risk / Warning / Approaching | `--signal-warn` | "At Risk" | `--signal-warn` | `--signal-warn` fill |
| Behind / Blocked / Overdue | `--signal-bad` | "Behind" | `--signal-bad` | `--signal-bad` fill |
| New / Neutral / Informational | `--accent` | varies | `--accent` | `--accent` fill |
| Inactive / Archived | `--text-ghost` | varies | `--text-ghost` | `--text-ghost` fill |

The previous codebase had five separate status-to-color mappings (STATUS_COLORS, STATUS_BG, STATUS_BADGE_STYLES, STATUS_ACCENT, HEALTH_CONFIG). All of these must be replaced by a single utility that references these tokens.

### Concrete Status Mapping

hexOS has 22 project statuses across 7 phases. Each maps to exactly one signal:

| Project Status | Signal | Rationale |
|---|---|---|
| `deliverables_pending` | `--accent` | New, forward-moving — awaiting definition |
| `agreement_sent` | `--accent` | Active process, waiting for response |
| `agreement_signed` | `--signal-good` | Milestone achieved |
| `payment_pending` | `--signal-warn` | Waiting on external action |
| `payment_received` | `--signal-good` | Milestone achieved |
| `onboarding_started` | `--accent` | Active forward motion |
| `requirements_gathering` | `--accent` | Active forward motion |
| `requirements_complete` | `--signal-good` | Milestone achieved |
| `development_ready` | `--accent` | Ready state, about to start |
| `in_development` | `--accent` | Active work in progress |
| `internal_review` | `--accent` | Active process step |
| `client_review` | `--signal-warn` | Waiting on external action |
| `revision` | `--signal-warn` | Rework needed, attention required |
| `final_review` | `--accent` | Active process step |
| `delivery_prep` | `--accent` | Active forward motion |
| `delivered` | `--signal-good` | Milestone achieved |
| `sign_off_pending` | `--signal-warn` | Waiting on external action |
| `completed` | `--signal-good` | Done |
| `on_hold` | `--signal-warn` | Stalled, needs attention |
| `blocked_client` | `--signal-bad` | Blocked |
| `blocked_internal` | `--signal-bad` | Blocked |
| `cancelled` | `--text-ghost` | Inactive / archived |

**The rule:** Active forward-moving statuses use `--accent` (neutral/informational). Statuses waiting on someone external use `--signal-warn`. Milestones achieved use `--signal-good`. Blocked/failed use `--signal-bad`. Dead/archived use `--text-ghost`.

This mapping lives in `lib/utils/status.ts` as the single source of truth. No component should define its own status-to-color logic.

---

## What This System Does NOT Include

- **Gradients.** Nowhere. Not on cards, not on buttons, not on backgrounds.
- **Shadows.** Only `--shadow-float` on floating surfaces (dropdowns, modals, popovers). Never on cards or static surfaces.
- **Colored backgrounds on cards.** Cards are always `--bg-card`. Status is shown through dots and text, not card fills.
- **Bright or saturated colors.** Every color in this system is deliberately muted.
- **Light mode.** Not yet. Dark first.
- **Multiple accent colors.** One accent (teal). Status has three signal colors. That is the entire palette.
- **Decorative icons or illustrations.** The UI communicates through typography and data, not decoration.

---

## Implementation Notes for Claude Code

When reskinning hexOS to match this guide:

1. **Update `globals.css`** with the new token values. Map every token above to CSS custom properties. Remove the old cyan-primary values. Include the new control, elevated, and overlay tokens.

2. **Fix the two-color-system problem first.** The login page, projects page, and projects table all use raw `stone-*`, `cyan-*`, `bg-white` values. These must be converted to token references before any layout work.

3. **Unify status colors.** Create a single `lib/utils/status.ts` that exports signal colors, dim variants, and label text for each status. Delete all other status-to-color mappings.

4. **Apply the type system.** Add `font-mono` (JetBrains Mono) and `font-sans` (DM Sans) to tailwind config. All metadata labels switch to mono uppercase. All metrics use the scale defined above.

5. **Fix form controls.** Replace all raw `<input>`, `<button>`, and `<select>` elements (especially on the login page) with shadcn `<Input>`, `<Button>`, `<Select>` components styled with the control tokens.

6. **Restructure dashboard layouts.** Hero metric zone at top. Metric strip below. Primary data table. Supporting panels at bottom. Kill the "parking lot" of equal stat cards.

7. **Apply card treatments.** Remove any shadows, gradient fills, or colored headers from cards. All cards use `--bg-card` + `--border-hairline` + `rounded-[10px]`.

8. **Implement sidebar duality.** Collapsed (60px icon-only) as default, expandable (220px with labels + badges) on hover/toggle. Badge counts overlay on collapsed icons.

9. **Strip existing animations.** Remove `pop-in`, `slide-in`, `fade-in-up`, `fire-glow`, `pulse-glow` keyframes. Replace with the transition table specified above.

10. **Editor tokens.** Apply the Plate.js treatments for code blocks, callouts, comments, and toolbars using the base token system.

---

## File Reference

This guide should be saved as `agent_docs/brand.md` in the hexOS repository and referenced by Claude Code for all UI work. The prototype implementation is in the v4 JSX artifact.
