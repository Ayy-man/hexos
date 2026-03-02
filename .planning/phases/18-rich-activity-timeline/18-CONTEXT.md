# Phase 18: Rich Activity Timeline - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the activity timeline presentation layer across all project views — the full Activity Timeline tab and the compact Recent Activity card on the Overview tab. Each entry shows meaningful inline context (entity names, field-level diffs, zone labels) with category-specific visual treatment and client-side filter chips. No new data logging or schema changes — this is purely a rendering/formatting upgrade using existing `activity_log` data.

</domain>

<decisions>
## Implementation Decisions

### Entry Detail Depth by Activity Type
- **Hill chart updates:** Show position percentage change + zone transition when zone crosses a boundary: `"API Integration" 45% → 78% (Figuring Out → Making It Happen)`
- **Deliverable updates:** Show ALL changed fields inline, not just the primary one: status, hours, due date, etc.
- **Status changes (projects):** Show full status labels with arrow: `"Payment Pending → Payment Paid"` — exact status names as they appear in the app
- **Documents:** Distinct formats per action type:
  - Created: show title + visibility (`"Brand Guidelines" (internal)`)
  - Content updated: show title + version number if checkpointed
  - Visibility changed: show title + old → new visibility
- **Deliverable status changes:** Show deliverable name + from → to status
- **File events:** Show filename + file size if available
- **Team events:** Show developer/user name
- **Requirements:** Show requirement title + status transition
- **Notes:** Show truncated preview (~60 chars) + scoped deliverable name if applicable
- **Legacy (INSERT/UPDATE/DELETE):** Show entity name from details field

### Timeline Entry Interactions
- **Entity names are clickable links** — clicking `"Homepage Design"` navigates to that deliverable; clicking a document name navigates to the document. Rest of entry is plain text.
- **Subtle background highlight on hover** — light tint on the entry to indicate boundary, aids scannability on long timelines
- **User names are plain text** — "by Sarah" is not a link
- **Timestamps:** Relative time by default (`2d ago`), exact date + time shown on hover tooltip (`Feb 28, 2026 at 3:42 PM`)

### Visual Treatment
- **Category-specific icons** in timeline dots with color accents:
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
- **Date separator headers** between entry groups: "Today", "Yesterday", or formatted date (`Feb 26, 2026`)
- **Filter chips** between card header and timeline: toggleable chips (All, Status, Deliverables, Documents, Hill Chart, Files, Team). "All" active by default. Client-side filtering on already-loaded data.

### Empty/Loading States
- **Filter returns no results:** Contextual empty message reflecting active filter: "No document activity yet" or "No status changes recorded"
- **New project with zero activity:** Encouraging message: "Activity will appear here as your project progresses"
- **Pagination:** Show initial batch (~20-30 entries) with "Load more" button at bottom for the rest

### Recent Activity Card (Overview Tab)
- **1-line summary per entry** with key detail: `"Status changed — In Progress → Review"` or `"Document created — \"Brand Guidelines\""`
- No "by user" line in compact view
- **Colored category dots** (not full icons) — orange for status, blue for deliverables, etc. Subtle visual cue without icon clutter
- **5 entries** (unchanged from current)
- **"View all activity →" link** at bottom of card, navigates to Activity tab
- Timestamps as short relative time on the right side

### Claude's Discretion
- Exact color hex values for category dots/icons (should match existing theme)
- Loading skeleton implementation details
- Exact hover highlight opacity/color
- "Load more" batch size
- Tooltip positioning and animation

</decisions>

<specifics>
## Specific Ideas

- Hill chart zone transitions are the most valuable detail — crossing from "Figuring Out" to "Making It Happen" is a meaningful project milestone that should be visually prominent
- The format `"Entity Name" old → new` should be consistent across all entry types for scannability
- Filter chips should use the same shadcn Toggle/Badge pattern used elsewhere in the app
- Date separators should use "Today" and "Yesterday" for recent entries, then fall back to formatted dates

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ActivityTab.tsx` — has `formatAction()` with 30+ action labels and `formatDetails()` with partial detail formatting. Needs expansion, not rewrite.
- `OverviewTab.tsx` — has `ACTIVITY_LABELS` mapping and Recent Activity card rendering. Needs detail enrichment.
- `components/ui/timeline.tsx` — Generic Timeline component with status icons, sizes, connector lines. Currently unused by activity views — could be adopted or patterns borrowed.
- Lucide icons already available throughout the project for category icons.
- shadcn `Badge`, `Toggle`, `Card` components available for filter chips.

### Established Patterns
- Activity data fetched via Supabase relation in `getProject()`: `activity:activity_log(id, action, details, created_at, user:profiles(name))`
- `details` JSONB field already contains: entity_name, from_status, to_status, old_position, new_position, file_name, hours changes, etc.
- `formatRelativeTime()` exists in ActivityTab.tsx — needs hover tooltip extension
- Activity data loads with the project — no separate API call needed for filtering

### Integration Points
- `ActivityTab` receives `activity` array from `ProjectTabs` → already has all data
- Filter chips are client-side only — filter the existing `activity` prop
- Entity links need to route to: deliverable detail (within project), document page, requirement section
- Recent Activity card in `OverviewTab` uses `project.activity.slice(0, 5)` — same data source

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-rich-activity-timeline*
*Context gathered: 2026-03-02*
