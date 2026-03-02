# Phase 18: Rich Activity Timeline - Research

**Researched:** 2026-03-03
**Domain:** React client-side filtering, timeline UI patterns, activity log data enrichment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Entry Detail Depth by Activity Type**
- Hill chart updates: Show position percentage change + zone transition when zone crosses a boundary: `"API Integration" 45% → 78% (Figuring Out → Making It Happen)`
- Deliverable updates: Show ALL changed fields inline, not just the primary one: status, hours, due date, etc.
- Status changes (projects): Show full status labels with arrow: `"Payment Pending → Payment Paid"` — exact status names as they appear in the app
- Documents: Distinct formats per action type:
  - Created: show title + visibility (`"Brand Guidelines" (internal)`)
  - Content updated: show title + version number if checkpointed
  - Visibility changed: show title + old → new visibility
- Deliverable status changes: Show deliverable name + from → to status
- File events: Show filename + file size if available
- Team events: Show developer/user name
- Requirements: Show requirement title + status transition
- Notes: Show truncated preview (~60 chars) + scoped deliverable name if applicable
- Legacy (INSERT/UPDATE/DELETE): Show entity name from details field

**Timeline Entry Interactions**
- Entity names are clickable links — clicking `"Homepage Design"` navigates to that deliverable; clicking a document name navigates to the document. Rest of entry is plain text.
- Subtle background highlight on hover — light tint on the entry to indicate boundary, aids scannability on long timelines
- User names are plain text — "by Sarah" is not a link
- Timestamps: Relative time by default (`2d ago`), exact date + time shown on hover tooltip (`Feb 28, 2026 at 3:42 PM`)

**Visual Treatment**
- Category-specific icons in timeline dots with color accents:
  - Status changes: `ArrowRightLeft` — orange/amber
  - Deliverables: `SquareCheck` — blue
  - Hill chart/progress: `TrendingUp` — cyan
  - Documents: `FileText` — purple
  - Files: `Paperclip` — stone
  - Sign-off flow: `BadgeCheck` — green
  - Team: `UserPlus` — indigo
  - Requirements: `ClipboardCheck` — yellow
  - Notes: `MessageSquare` — muted/gray
  - Legacy: `Circle` — muted/gray
- Date separator headers between entry groups: "Today", "Yesterday", or formatted date (`Feb 26, 2026`)
- Filter chips between card header and timeline: toggleable chips (All, Status, Deliverables, Documents, Hill Chart, Files, Team). "All" active by default. Client-side filtering on already-loaded data.

**Empty/Loading States**
- Filter returns no results: Contextual empty message reflecting active filter: "No document activity yet" or "No status changes recorded"
- New project with zero activity: Encouraging message: "Activity will appear here as your project progresses"
- Pagination: Show initial batch (~20-30 entries) with "Load more" button at bottom for the rest

**Recent Activity Card (Overview Tab)**
- 1-line summary per entry with key detail: `"Status changed — In Progress → Review"` or `"Document created — "Brand Guidelines""`
- No "by user" line in compact view
- Colored category dots (not full icons) — orange for status, blue for deliverables, etc. Subtle visual cue without icon clutter
- 5 entries (unchanged from current)
- "View all activity →" link at bottom of card, navigates to Activity tab
- Timestamps as short relative time on the right side

### Claude's Discretion
- Exact color hex values for category dots/icons (should match existing theme)
- Loading skeleton implementation details
- Exact hover highlight opacity/color
- "Load more" batch size
- Tooltip positioning and animation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 18 is a pure rendering upgrade to two existing components: `ActivityTab.tsx` (full timeline) and the Recent Activity card inside `OverviewTab.tsx`. No new API calls, no schema changes, no data-fetching changes — all activity data already arrives via `project.activity` from `getProject()`. The work is entirely in how each entry is displayed.

The core challenge is building a robust `formatDetails()` dispatcher that reads the `details` JSONB field and produces rich inline text per action type. All action types and their exact `details` shapes have been confirmed by reading the server actions that insert rows. Hill chart zone logic is already codified in `features/projects/components/hill-chart/utils.ts` and can be imported directly. The `Tooltip` component from `components/ui/tooltip.tsx` already exists for hover timestamps.

The filter chip pattern uses togglable category state (single `activeFilter` string) applied client-side over the already-loaded array — no debounce needed, no API calls. Date separators require grouping entries by calendar date before rendering. Pagination is a simple `displayCount` state with a "Load more" button that increments it.

**Primary recommendation:** Expand `formatDetails()` into an action-type switch, import `getZone()` from hill-chart utils for zone labels, implement filter chips as plain `useState` over the props array, and add date separators by grouping sorted activity before rendering. No new dependencies needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Lucide React | Already installed | Category-specific icons per action type | Already used throughout the project for all icons |
| Radix UI Tooltip | Already installed via `components/ui/tooltip.tsx` | Hover timestamp tooltip (exact date/time) | Project's standard tooltip implementation |
| Next.js Link | Already installed | Entity name clickable links | Standard Next.js navigation |
| shadcn Badge | Already installed via `components/ui/badge.tsx` | Filter chip active state styling | Already used throughout project |
| Tailwind CSS 4 | Already installed | Color accents per category | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` (or native Date) | N/A — native Date sufficient | Date grouping for separator headers | Native `toLocaleDateString` already used in project; no new dep needed |
| `cn` from `@/lib/utils` | Already installed | Conditional Tailwind class merging | Use for hover states and active filter chip styles |
| `getZone()` from hill-chart utils | Internal utility | Zone label resolution for hill chart entries | Import directly from `features/projects/components/hill-chart/utils.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Date for separator grouping | `date-fns format/isToday/isYesterday` | date-fns is cleaner but adds a dep; native Date is sufficient for "Today"/"Yesterday" detection |
| Plain `button` elements for filter chips | shadcn `Toggle` / `ToggleGroup` | Toggle components add Radix dependency; the CONTEXT.md says "same shadcn Toggle/Badge pattern" — check if `toggle.tsx` exists first; plain styled buttons work equally well |
| `useState` for filter + pagination | URL search params | URL params would make filter state bookmarkable but adds complexity not requested |

**Installation:** No new packages needed. All required libraries are already in the project.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are confined to:

```
features/projects/components/tabs/
├── ActivityTab.tsx         # Full timeline — primary file to upgrade
└── OverviewTab.tsx         # Recent Activity card — secondary file to upgrade

features/projects/components/hill-chart/
└── utils.ts                # getZone() to import for hill chart zone labels (READ ONLY)
```

Optionally extract shared logic:
```
features/projects/components/tabs/
└── activity-utils.ts       # Shared formatActivityDetail(), CATEGORY_CONFIG map
                            # (only if ActivityTab.tsx grows unwieldy)
```

### Pattern 1: Action-Type Dispatcher for Detail Rendering

**What:** A switch statement (or lookup map) keyed by `action` string that returns the rich detail node for each entry type.

**When to use:** Replaces the current cascade of `if ('from' in details)` checks in `formatDetails()`.

```typescript
// In ActivityTab.tsx — expanded formatDetails()
function formatDetails(action: string, details: Record<string, unknown> | null): React.ReactNode {
  if (!details) return null

  switch (action) {
    case 'status_changed': {
      const from = String(details.old_status ?? '').replace(/_/g, ' ')
      const to = String(details.new_status ?? '').replace(/_/g, ' ')
      // Capitalize each word
      return (
        <span>
          {toTitleCase(from)}
          <span className="text-muted-foreground/60 mx-1">→</span>
          <span className="font-medium">{toTitleCase(to)}</span>
        </span>
      )
    }

    case 'hill_position_updated': {
      const title = String(details.title ?? '')
      const oldPos = Number(details.old_position ?? 0)
      const newPos = Number(details.new_position ?? 0)
      const oldZone = getZone(oldPos)
      const newZone = getZone(newPos)
      const zoneTransition = oldZone.zone !== newZone.zone
        ? ` (${oldZone.label} → ${newZone.label})`
        : ''
      return (
        <span>
          &ldquo;{title}&rdquo; {oldPos}% → {newPos}%
          {zoneTransition && <span className="text-muted-foreground/70">{zoneTransition}</span>}
        </span>
      )
    }

    case 'deliverable_status_changed': {
      const title = String(details.title ?? '')
      const from = toTitleCase(String(details.old_status ?? '').replace(/_/g, ' '))
      const to = toTitleCase(String(details.new_status ?? '').replace(/_/g, ' '))
      return (
        <span>
          &ldquo;{title}&rdquo;{' '}
          <span className="text-muted-foreground/60">→</span>{' '}
          <span className="font-medium">{to}</span>
          {from && <span className="text-muted-foreground"> (was {from})</span>}
        </span>
      )
    }

    case 'document_created': {
      const docTitle = String(details.title ?? '')
      const visibility = details.visibility ? ` (${details.visibility})` : ''
      return <span>&ldquo;{docTitle}&rdquo;<span className="text-muted-foreground">{visibility}</span></span>
    }

    case 'file_uploaded':
    case 'file_deleted': {
      const fileName = String(details.file_name ?? '')
      return <span className="font-mono text-xs">{fileName}</span>
    }

    case 'dev_assigned': {
      return <span>Developer: <span className="font-medium">{String(details.dev_name ?? '')}</span></span>
    }

    // ... etc for all action types
    default:
      return null
  }
}
```

### Pattern 2: Category Config Map for Icon + Color

**What:** A single `CATEGORY_CONFIG` object mapping action strings to `{ icon, colorClass, dotClass, filterGroup }` so icon rendering and filter grouping share one source of truth.

```typescript
// Confirmed Lucide icon names — all available in lucide-react
const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType
  colorClass: string          // Tailwind text color
  bgClass: string             // Tailwind bg color (lighter)
  dotClass: string            // For compact Recent Activity dots
  filterGroup: FilterCategory
}> = {
  status_changed:            { icon: ArrowRightLeft,  colorClass: 'text-amber-500',   bgClass: 'bg-amber-500/10',  dotClass: 'bg-amber-500',   filterGroup: 'status' },
  phase_changed:             { icon: ArrowRightLeft,  colorClass: 'text-amber-500',   bgClass: 'bg-amber-500/10',  dotClass: 'bg-amber-500',   filterGroup: 'status' },
  deliverable_added:         { icon: SquareCheck,     colorClass: 'text-blue-500',    bgClass: 'bg-blue-500/10',   dotClass: 'bg-blue-500',    filterGroup: 'deliverables' },
  deliverable_edited:        { icon: SquareCheck,     colorClass: 'text-blue-500',    bgClass: 'bg-blue-500/10',   dotClass: 'bg-blue-500',    filterGroup: 'deliverables' },
  deliverable_deleted:       { icon: SquareCheck,     colorClass: 'text-blue-500',    bgClass: 'bg-blue-500/10',   dotClass: 'bg-blue-500',    filterGroup: 'deliverables' },
  deliverable_status_changed:{ icon: SquareCheck,     colorClass: 'text-blue-500',    bgClass: 'bg-blue-500/10',   dotClass: 'bg-blue-500',    filterGroup: 'deliverables' },
  hill_position_updated:     { icon: TrendingUp,      colorClass: 'text-cyan-500',    bgClass: 'bg-cyan-500/10',   dotClass: 'bg-cyan-500',    filterGroup: 'hill_chart' },
  document_created:          { icon: FileText,        colorClass: 'text-purple-500',  bgClass: 'bg-purple-500/10', dotClass: 'bg-purple-500',  filterGroup: 'documents' },
  document_updated:          { icon: FileText,        colorClass: 'text-purple-500',  bgClass: 'bg-purple-500/10', dotClass: 'bg-purple-500',  filterGroup: 'documents' },
  document_deleted:          { icon: FileText,        colorClass: 'text-purple-500',  bgClass: 'bg-purple-500/10', dotClass: 'bg-purple-500',  filterGroup: 'documents' },
  file_uploaded:             { icon: Paperclip,       colorClass: 'text-stone-500',   bgClass: 'bg-stone-500/10',  dotClass: 'bg-stone-500',   filterGroup: 'files' },
  file_deleted:              { icon: Paperclip,       colorClass: 'text-stone-500',   bgClass: 'bg-stone-500/10',  dotClass: 'bg-stone-500',   filterGroup: 'files' },
  signoff_sent:              { icon: BadgeCheck,      colorClass: 'text-green-500',   bgClass: 'bg-green-500/10',  dotClass: 'bg-green-500',   filterGroup: 'status' },
  signed_off:                { icon: BadgeCheck,      colorClass: 'text-green-500',   bgClass: 'bg-green-500/10',  dotClass: 'bg-green-500',   filterGroup: 'status' },
  deliverables_confirmed:    { icon: BadgeCheck,      colorClass: 'text-green-500',   bgClass: 'bg-green-500/10',  dotClass: 'bg-green-500',   filterGroup: 'status' },
  dev_assigned:              { icon: UserPlus,        colorClass: 'text-indigo-500',  bgClass: 'bg-indigo-500/10', dotClass: 'bg-indigo-500',  filterGroup: 'team' },
  dev_unassigned:            { icon: UserPlus,        colorClass: 'text-indigo-500',  bgClass: 'bg-indigo-500/10', dotClass: 'bg-indigo-500',  filterGroup: 'team' },
  requirement_created:       { icon: ClipboardCheck,  colorClass: 'text-yellow-500',  bgClass: 'bg-yellow-500/10', dotClass: 'bg-yellow-500',  filterGroup: 'status' },
  requirement_updated:       { icon: ClipboardCheck,  colorClass: 'text-yellow-500',  bgClass: 'bg-yellow-500/10', dotClass: 'bg-yellow-500',  filterGroup: 'status' },
  requirement_completed:     { icon: ClipboardCheck,  colorClass: 'text-yellow-500',  bgClass: 'bg-yellow-500/10', dotClass: 'bg-yellow-500',  filterGroup: 'status' },
  note_added:                { icon: MessageSquare,   colorClass: 'text-muted-foreground', bgClass: 'bg-muted',    dotClass: 'bg-muted-foreground', filterGroup: 'status' },
  // Legacy fallback
  INSERT:                    { icon: Circle,          colorClass: 'text-muted-foreground', bgClass: 'bg-muted',    dotClass: 'bg-muted-foreground', filterGroup: 'status' },
  UPDATE:                    { icon: Circle,          colorClass: 'text-muted-foreground', bgClass: 'bg-muted',    dotClass: 'bg-muted-foreground', filterGroup: 'status' },
  DELETE:                    { icon: Circle,          colorClass: 'text-muted-foreground', bgClass: 'bg-muted',    dotClass: 'bg-muted-foreground', filterGroup: 'status' },
}

type FilterCategory = 'all' | 'status' | 'deliverables' | 'documents' | 'hill_chart' | 'files' | 'team'
```

### Pattern 3: Client-Side Filter Chips

**What:** `useState` for active filter, `useMemo` to derive the filtered list, slice for pagination.

**When to use:** The activity array is already in props — no fetch needed.

```typescript
// In ActivityTab.tsx (already 'use client')
const [activeFilter, setActiveFilter] = useState<FilterCategory>('all')
const [displayCount, setDisplayCount] = useState(25)

const filteredActivity = useMemo(() => {
  if (activeFilter === 'all') return activity
  return activity.filter(entry => {
    const config = CATEGORY_CONFIG[entry.action]
    return config?.filterGroup === activeFilter
  })
}, [activity, activeFilter])

const visibleActivity = filteredActivity.slice(0, displayCount)
const hasMore = filteredActivity.length > displayCount
```

### Pattern 4: Date Separator Grouping

**What:** Group sorted entries by calendar date before rendering, inject separator rows between groups.

```typescript
type DayGroup = {
  label: string
  entries: ActivityEntry[]
}

function groupByDay(entries: ActivityEntry[]): DayGroup[] {
  const groups: DayGroup[] = []
  let currentLabel = ''

  for (const entry of entries) {
    const date = new Date(entry.created_at)
    const label = getDayLabel(date)
    if (label !== currentLabel) {
      groups.push({ label, entries: [] })
      currentLabel = label
    }
    groups[groups.length - 1].entries.push(entry)
  }
  return groups
}

function getDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (d.getTime() === today.getTime()) return 'Today'
  if (d.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
```

### Pattern 5: Hover Timestamp Tooltip

**What:** Wrap the relative time text in `<Tooltip>` from `components/ui/tooltip.tsx`. Show exact date + time in tooltip.

```typescript
function formatExactTime(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// In render:
<Tooltip>
  <TooltipTrigger asChild>
    <span className="text-xs text-muted-foreground cursor-default">
      {formatRelativeTime(entry.created_at)}
    </span>
  </TooltipTrigger>
  <TooltipContent>{formatExactTime(entry.created_at)}</TooltipContent>
</Tooltip>
```

### Pattern 6: Entity Name Clickable Link

**What:** Wrap the entity name (deliverable title, document title) in `<Link>` from `next/link`. Use project ID from props to construct path.

```typescript
// ActivityTab needs projectId prop added
interface ActivityTabProps {
  activity: ActivityEntry[]
  projectId: string  // NEW — needed for entity links
}

// In entry render:
function renderEntityLink(title: string, href: string): React.ReactNode {
  return (
    <Link
      href={href}
      className="font-medium hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      &ldquo;{title}&rdquo;
    </Link>
  )
}

// Example usage for deliverable:
const deliverableId = String(details.deliverable_id ?? '')
const href = `/projects/${projectId}?tab=deliverables&highlight=${deliverableId}`
renderEntityLink(String(details.title ?? ''), href)
```

**Important:** There are no dedicated sub-routes for individual deliverables or requirements in the current app (no `/projects/[id]/deliverables/[deliverableId]` pages). Navigation should route to the project page with a tab query param. Document navigation can route to the gameplan tab similarly.

### Pattern 7: Recent Activity Card Compact Rendering

**What:** Replace the `Circle` dot with a colored `div` dot. Add a 1-line detail summary. Add "View all activity →" link at card bottom.

```typescript
// In OverviewTab.tsx Recent Activity section:
{recentActivity.map((activity) => {
  const config = CATEGORY_CONFIG[activity.action]
  const detail = formatCompactDetail(activity.action, activity.details)
  return (
    <li key={activity.id} className="flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {/* Colored dot */}
        <div className={cn('h-2 w-2 rounded-full shrink-0', config?.dotClass ?? 'bg-muted-foreground')} />
        <div className="min-w-0 truncate">
          <span className="font-medium">
            {ACTIVITY_LABELS[activity.action] || activity.action.replace(/_/g, ' ')}
          </span>
          {detail && (
            <span className="text-muted-foreground"> — {detail}</span>
          )}
        </div>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formatRelativeTime(activity.created_at)}
      </span>
    </li>
  )
})}
{/* "View all activity" link */}
<div className="pt-2 border-t border-border mt-2">
  <button
    onClick={() => {/* navigate to activity tab */}}
    className="text-xs text-muted-foreground hover:text-foreground"
  >
    View all activity →
  </button>
</div>
```

**Note on "View all activity" navigation:** `OverviewTab` is not a route — it's a tab inside `ProjectTabs`. The simplest way to switch tabs is via a callback prop or by using the `Tabs` `onValueChange` mechanism. `ProjectTabs` manages `activeTab` state. Options:
1. Pass an `onNavigateToActivity` callback from `ProjectTabs` → `OverviewTab`
2. Use URL query param `?tab=activity` and have `ProjectTabs` read it on mount

### Anti-Patterns to Avoid

- **Fetching details on demand:** Do not add a new Supabase query per entry to enrich details. All needed data is in `details` JSONB already logged at write time.
- **Re-fetching on filter change:** Filtering must be client-side only over the already-loaded `activity` prop.
- **Over-enriching the `details` field:** The phase spec explicitly says no schema changes. Work with existing `details` shapes.
- **Using the generic `<Timeline>` component from `components/ui/timeline.tsx`:** It takes a pre-shaped `TimelineItem[]` array with fixed `title`/`description` fields. The rich activity rendering needs more flexibility than this API provides. Build inline or borrow its CSS patterns.
- **Duplicating `formatRelativeTime`:** It currently exists in both `ActivityTab.tsx` and `OverviewTab.tsx`. Consider extracting to a shared util, but do not move the function if it would create circular imports.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timestamp tooltip | Custom popover | `Tooltip`/`TooltipContent` from `components/ui/tooltip.tsx` | Already exists, handles portal/positioning |
| Icon rendering | Custom SVG icons | `lucide-react` — all named icons confirmed available | Already bundled, tree-shaken |
| Clickable entity links | Custom `<a>` with router.push | `<Link>` from `next/link` | Handles prefetching, client navigation |
| Zone label lookup | Custom zone string builder | `getZone(position)` from `features/projects/components/hill-chart/utils.ts` | Centralized, already tested via hill chart tab |
| Filter state | URL param routing | `useState` | Client-side only per spec |

**Key insight:** This phase is a pure UI upgrade. Every building block already exists in the codebase. The only "new" work is wiring them together and writing the per-action-type rendering logic.

---

## Common Pitfalls

### Pitfall 1: Missing `details` Fields on Legacy Entries
**What goes wrong:** Older `activity_log` rows (logged before current server actions) may have a `details` JSONB with unexpected shapes or missing expected keys. Calling `String(details.old_status)` when `old_status` doesn't exist returns `"undefined"`.
**Why it happens:** Activity logging was added incrementally — early rows used generic `INSERT/UPDATE/DELETE` actions with free-form details; newer rows have structured fields.
**How to avoid:** Always use nullish coalescing: `String(details.old_status ?? '')`. For the legacy `INSERT/UPDATE/DELETE` actions, fall back to `details.entity_name` or generic text.
**Warning signs:** Timeline entries showing "undefined" or empty detail text during testing.

### Pitfall 2: `projectId` Not Available in `ActivityTab`
**What goes wrong:** Entity name clickable links need `/projects/${projectId}/...` URLs, but `ActivityTab` currently only receives the `activity` array — no `projectId` prop.
**Why it happens:** The component was built without linking in mind.
**How to avoid:** Add `projectId: string` to `ActivityTabProps`. Update the `ProjectTabs.tsx` call site to pass `projectId={project.id}`.
**Warning signs:** TypeScript error on `projectId` reference; links rendering with undefined in URL.

### Pitfall 3: Tab Navigation from OverviewTab for "View All Activity"
**What goes wrong:** `OverviewTab` has no way to switch to the Activity tab — it doesn't own the `Tabs` state.
**Why it happens:** Tab state lives in `ProjectTabs` via `activeTab`/`handleTabChange`.
**How to avoid:** Add `onNavigateToActivity?: () => void` prop to `OverviewTab`. In `ProjectTabs`, pass `onNavigateToActivity={() => handleTabChange('activity')}`. The "View all activity →" button calls this prop.
**Warning signs:** Button click does nothing or causes page reload.

### Pitfall 4: Zone Transition Logic for Hill Chart Entries
**What goes wrong:** `getZone(oldPos)` and `getZone(newPos)` must both be called. If `old_position` is missing in the `details` JSONB (some early entries only log `position` without `old_position`/`new_position`), zone transition display breaks.
**Why it happens:** `hillChartActions.ts` logs `old_position` and `new_position`, but early `quickUpdatePositionAction` entries (before the field was added) may only have `position`.
**How to avoid:** Check for both field shapes: `details.old_position ?? details.position ?? 0` for old value, `details.new_position ?? details.position ?? 0` for new value. Only show zone transition when both are present and differ.
**Warning signs:** Zone label shows `Figuring Out → Figuring Out` (both same) or errors when `old_position` is undefined.

### Pitfall 5: Filter Chip Active State Styling Mismatch
**What goes wrong:** Filter chips look different from other toggle-style buttons in the app.
**Why it happens:** If `toggle.tsx` doesn't exist (it's not in `components/ui/` — only `badge.tsx` and `button.tsx` exist), the shadcn Toggle component cannot be used.
**How to avoid:** Confirmed `toggle.tsx` does NOT exist in this project's `components/ui/`. Use plain `<button>` elements with conditional Tailwind classes: active = `bg-accent text-accent-foreground`, inactive = `text-muted-foreground hover:text-foreground`.
**Warning signs:** Import error for `@/components/ui/toggle`.

### Pitfall 6: `forceMount` on ActivityTab Content
**What goes wrong:** `ProjectTabs.tsx` uses `forceMount` on the Activity tab: `<TabsContent value="activity" className="mt-6" forceMount>`. This means `ActivityTab` renders even when the tab is not active, including running all `useMemo` computations.
**Why it happens:** `forceMount` keeps the DOM alive for all tabs to avoid re-renders on tab switch.
**How to avoid:** The filtering `useMemo` is cheap (client-side array filter). No concern here. Do NOT remove `forceMount` — it's intentional for tab persistence.

### Pitfall 7: Status Label Formatting
**What goes wrong:** Project status values are snake_case database enums (e.g., `payment_pending`). The CONTEXT.md requires showing exact status names as they appear in the app (e.g., "Payment Pending"). Simply calling `.replace(/_/g, ' ')` gives lowercase words.
**Why it happens:** Status labels require title-casing.
**How to avoid:** Write a `toTitleCase(str: string)` helper: `str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')`. Use it on all status values. Or build a `STATUS_LABELS` map for the known 22 statuses.

---

## Code Examples

Verified patterns from codebase inspection:

### Actual `details` Field Shapes by Action Type (CONFIRMED from server actions)

```typescript
// status_changed (projectActions.ts)
{ old_status: string, new_status: string, notes: string | null }

// hill_position_updated (hillChartActions.ts)
{ deliverable_id: string, title: string, old_position: number, new_position: number, note: string | null }

// deliverable_added (deliverableActions.ts)
{ deliverable_id: string, title: string }

// deliverable_edited (deliverableActions.ts)
{ deliverable_id: string, fields_changed: string[] }
// NOTE: does NOT include old/new values per field — only lists changed field names

// deliverable_status_changed (deliverableActions.ts)
{ deliverable_id: string, title: string, old_status: string, new_status: string }

// deliverable_deleted (deliverableActions.ts)
{ deliverable_id: string, title: string }

// document_created (documentActions.ts)
{ document_id: string, title: string }
// NOTE: visibility NOT included in current logging — display what's available

// document_deleted (documentActions.ts)
{ document_id: string, title: string }

// file_uploaded (fileActions.ts)
{ file_name: string, visibility: string }
// NOTE: file_size NOT included in current logging — spec says "if available"

// file_deleted (fileActions.ts)
{ file_name: string }

// dev_assigned (projectActions.ts)
{ dev_id: string, dev_name: string }

// onboarding_requirement_completed (projectActions.ts)
{ requirement_id: string }
// NOTE: no title logged — cannot show title without a lookup

// signoff_sent, signed_off, deliverables_confirmed (projectActions.ts)
{} // empty details

// Legacy INSERT/UPDATE/DELETE
// Free-form — may have entity_name, id, or other fields
```

### Hill Chart Zone Labels (from `utils.ts`)

```typescript
// Zones defined in features/projects/components/hill-chart/utils.ts:
// 0 - 49:   'Figuring Out' (amber)
// 50 - 89:  'Making It'    (cyan)
// 90 - 100: 'Done'         (green)
import { getZone } from '@/features/projects/components/hill-chart/utils'
const zone = getZone(position) // returns { zone, label, colorClass, bgClass }
```

### Existing Tooltip Usage Pattern

```tsx
// components/ui/tooltip.tsx — already exists, Radix-based
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger asChild>
    <span className="text-xs text-muted-foreground cursor-default">2d ago</span>
  </TooltipTrigger>
  <TooltipContent>Feb 28, 2026 at 3:42 PM</TooltipContent>
</Tooltip>
```

### Filter Chip Pattern (no Toggle component available)

```tsx
// toggle.tsx does NOT exist — use plain buttons
const FILTER_CHIPS: { label: string; value: FilterCategory }[] = [
  { label: 'All', value: 'all' },
  { label: 'Status', value: 'status' },
  { label: 'Deliverables', value: 'deliverables' },
  { label: 'Documents', value: 'documents' },
  { label: 'Hill Chart', value: 'hill_chart' },
  { label: 'Files', value: 'files' },
  { label: 'Team', value: 'team' },
]

<div className="flex gap-2 flex-wrap">
  {FILTER_CHIPS.map(chip => (
    <button
      key={chip.value}
      onClick={() => { setActiveFilter(chip.value); setDisplayCount(25) }}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-medium transition-colors',
        activeFilter === chip.value
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {chip.label}
    </button>
  ))}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic `Circle` dot for all activity | Category-specific icon + color per action type | Phase 18 | Instant visual categorization |
| Plain text `formatDetails()` cascade | Action-type switch dispatcher | Phase 18 | Richer inline context per entry |
| All entries shown in flat list | Date separator headers + paginated display | Phase 18 | Scannability on long timelines |
| No filter capability | Client-side filter chips | Phase 18 | Quick category focus |
| Recent Activity: plain label only | Recent Activity: label + 1-line detail + colored dot | Phase 18 | More informative at-a-glance |

**Deprecated/outdated:**
- `ACTIVITY_LABELS` in `OverviewTab.tsx` and `formatAction()` in `ActivityTab.tsx` are separate but overlapping maps. After this phase both should be merged into `CATEGORY_CONFIG` or a shared `ACTIVITY_LABELS` constant — but this is a refactor opportunity, not a requirement.

---

## Open Questions

1. **`deliverable_edited` has no old/new values in details**
   - What we know: `{ deliverable_id, fields_changed: string[] }` only lists which fields changed, not their before/after values
   - What's unclear: Can we show meaningful detail? "Updated: title, hours" is weak
   - Recommendation: Show "Updated: [field list]" — e.g., "Updated: estimated hours, due date". Do not attempt to look up before/after from current deliverable state (the record has already changed).

2. **`onboarding_requirement_completed` has no title in details**
   - What we know: Only `{ requirement_id: string }` is logged — no title cached
   - What's unclear: We could look up the title from `project.requirements`, but this requires a client-side find by ID
   - Recommendation: Try `project.requirements?.find(r => r.id === details.requirement_id)?.title` — the requirements array is already in the `project` prop passed to `ProjectTabs`. Pass `requirements` to `ActivityTab` or pass the whole lookup as a Map. If requirements is unavailable, fall back to "Requirement completed".

3. **`document_created` lacks visibility in details**
   - What we know: Only `{ document_id, title }` is logged — visibility not captured at log time
   - What's unclear: Can we look it up? The document may be deleted or changed
   - Recommendation: Show title only without visibility. Do not attempt to look up live document state. The CONTEXT.md says "show title + visibility" — note this is aspirational; if the field isn't in details, show what's available.

4. **"View all activity" navigation from OverviewTab**
   - What we know: `OverviewTab` doesn't own tab state; `ProjectTabs` does
   - What's unclear: Is passing a callback prop the cleanest approach?
   - Recommendation: Add `onNavigateToActivity?: () => void` prop. This is a one-liner change in `ProjectTabs`. Alternative (URL param) adds routing complexity not warranted.

5. **`file_size` not in file event details**
   - What we know: `file_uploaded` only logs `{ file_name, visibility }` — no `file_size`
   - What's unclear: CONTEXT.md says "show filename + file size if available"
   - Recommendation: Show filename only; file size is not available in current logs. This is correct behavior per "if available".

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` not set in `.planning/config.json` (defaults to false).

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `features/projects/actions/projectActions.ts`, `deliverableActions.ts`, `hillChartActions.ts`, `fileActions.ts`, `documentActions.ts` — confirmed exact `details` field shapes for all action types
- Direct codebase inspection — `features/projects/components/tabs/ActivityTab.tsx` — confirmed current implementation, available hooks, `formatRelativeTime` exists
- Direct codebase inspection — `features/projects/components/tabs/OverviewTab.tsx` — confirmed `ACTIVITY_LABELS`, `recentActivity` rendering, tab navigation constraint
- Direct codebase inspection — `features/projects/components/hill-chart/utils.ts` — confirmed `getZone()` function and zone label strings
- Direct codebase inspection — `components/ui/tooltip.tsx`, `badge.tsx`, `timeline.tsx` — confirmed available components and their APIs
- Direct codebase inspection — `features/projects/components/ProjectTabs.tsx` — confirmed `activity` prop flow, `forceMount` on activity tab, `activeTab` state ownership
- Direct codebase inspection — `lib/api/projects.ts` — confirmed `activity_log` Supabase query shape including `user:profiles(name)` join

### Secondary (MEDIUM confidence)
- Project conventions from `agent_docs/conventions.md` — Tailwind patterns, component file naming, shadcn color theme (Stone+Cyan)
- `components.json` and `components/ui/` directory listing — confirmed `toggle.tsx` does NOT exist; must use plain buttons for filter chips

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All libraries confirmed present in codebase; no new deps needed
- Architecture: HIGH — Patterns are straightforward extensions of existing code; data shapes confirmed from source
- Pitfalls: HIGH — All pitfalls discovered from direct code reading, not speculation
- Details field shapes: HIGH — Read directly from server actions that write to `activity_log`
- Entity link routing: HIGH — Confirmed no sub-routes exist for deliverables; URL param approach is the only viable path

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable codebase; valid until action logging patterns change)
