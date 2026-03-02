# Phase 19: Enhanced Sidebar Hover Previews — Research

**Researched:** 2026-03-03
**Domain:** React interactive overlays, Radix UI primitives, sidebar data architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Interaction Model**
- Glance + Navigate: show item names AND let user click through directly from tooltip
- Each entity name is a `<Link>` with direct navigation to that item's page
- Tooltips should be pinnable (click to keep open so user can read and click items)

**Second-Layer Drill-Down (existing 4 tooltips)**
- Hovering a stat row (e.g., "Unopened: 1") reveals a sub-list of actual item names
- Inquiries: show inquiry name (client + project type) per status row
- Projects: show project name + client org per status row
- Conversations: already shows names — add clickable links + last message snippet
- Suggestions: show suggestion titles per status row
- Each sub-item links directly to its detail page

**New Hover Cards (items that currently have none)**
- Meetings: next 2-3 upcoming meetings with date/time, clickable
- Blueprints: counts by status (Draft/Published/Archived) with drill-down to names
- Case Studies: Draft vs Published counts with drill-down to names
- Blockers (Admin): active count by severity (Critical/High/Normal), color-coded, drill-down to titles + project

**UX Enhancements**
- Pinnable tooltips: click to lock open, click away to dismiss
- Empty state messaging: contextual messages instead of bare "0"
- Subtle hover underline on clickable names within tooltip

### Claude's Discretion
- Implementation approach for nested hover (HoverCard inside Tooltip vs single interactive popover)
- How to fetch the additional item-level data (server-side in layout vs client-side on hover)
- Animation/transition details for the drill-down reveal
- Max items to show in drill-down lists before truncating with "View all"

### Deferred Ideas (OUT OF SCOPE)
- Keyboard navigation within tooltips (arrow keys + Enter)
- Stale data indicator / auto-refresh on hover
- Tooltip search/filter for long lists
- Recent activity in tooltip (ties to Phase 18 timeline work)
- Metrics mini-sparkline in tooltip
- Onboarding/Settings completion percentage tooltip
</user_constraints>

---

## Summary

Phase 19 upgrades the existing sidebar tooltip system from aggregate-count-only displays into rich, drill-down, navigable hover cards. Four existing tooltips (Inquiries, Projects, Conversations, Suggestions) gain clickable item-name sub-lists per status row. Four new hover cards are added (Meetings, Blueprints, Case Studies, Blockers) for sidebar items that currently have none.

The pinnable tooltip requirement is the key architectural constraint. Radix UI's `Tooltip` primitive is explicitly documented as non-interactive — pointer events are blocked in its content, making links unclickable and pinning impossible. The correct approach is `Popover` (for pinning via open/closed state on click) or, more ergonomically, a hybrid pattern: hover opens the card, click pins it, click-away dismisses. This maps to `Popover` with `open` state managed by `useState`, triggered both on `onMouseEnter` and `onClick`. The existing `components/ui/popover.tsx` is already available (uses `radix-ui` umbrella package, v1.4.3) and does NOT need to be installed.

Data fetching is the second major architectural decision. The dashboard layout (`app/(dashboard)/layout.tsx`) already fetches stats in a `Promise.all` and passes them as props to `AppSidebar`. For item-level data (names, titles), fetching it all server-side at layout time would increase the layout's query count by 4-7 new queries for admin/internal users. A better approach for drill-down sub-lists is a dedicated Route Handler (`/api/sidebar-previews?type=inquiries&status=unopened`) that loads lazily on first hover — keeping the layout waterfall lean. Simple counts and already-fetched summaries (like `conversationSummary` which already has names) stay server-side.

**Primary recommendation:** Replace the `Tooltip` primitive with a stateful `Popover` for each enriched sidebar item. Use hover to open and click to pin. Fetch drill-down item data via a lightweight API Route on first hover, caching the result in component state to prevent re-fetching.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `radix-ui` (umbrella) | ^1.4.3 | `Popover` primitive for pinnable cards | Already installed, project convention — all ui/ components import from `"radix-ui"` not `@radix-ui/*` |
| `@radix-ui/react-popover` | 1.1.15 | Underlying popover (transitive dep via `radix-ui`) | Already resolved in pnpm-lock.yaml |
| `next/link` | Next.js 16 | Clickable navigation inside hover cards | Must use for prefetch + client navigation |
| `Tailwind CSS 4` | - | Styling drill-down sub-lists | Project convention |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `framer-motion` | ^12.24.7 | Animate drill-down sub-list reveal | Available in project; use for the nested expand animation per stat row hover |
| `React.useState` | React 19 | Track open/pinned state, cached drill-down data | Component-local state for popover |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Popover` | `Tooltip` | Tooltip blocks pointer events in content — links and pinning are impossible. Never use Tooltip for interactive content. |
| `Popover` | `HoverCard` (`@radix-ui/react-hover-card`) | HoverCard is hover-only with no click-pin model. Closer to current behavior but pinning still requires state management. `Popover` is more flexible. HoverCard IS installed (in lockfile as transitive dep) but Popover is the better fit for pinnable requirement. |
| Client-side fetch on hover | Server-side in layout | Layout would grow by 4-7 new DB queries. Client-side fetch on first hover keeps layout lean and only pays the cost when user actually hovers. |

**Installation:** No new packages needed. `radix-ui` umbrella package already installed at `^1.4.3`. Both `@radix-ui/react-popover` and `@radix-ui/react-hover-card` are already in `pnpm-lock.yaml` as transitive dependencies.

---

## Architecture Patterns

### Recommended Project Structure

No new directories are needed. Changes touch these existing files:

```
components/
├── app-sidebar.tsx            # Replace Tooltip with Popover, add 4 new hover cards
├── ui/
│   └── popover.tsx            # Already exists — use as-is
app/
└── (dashboard)/
    └── layout.tsx             # Optionally add new sidebar preview queries
lib/
└── api/
    ├── inquiries.ts           # Add getInquiriesByStage() for drill-down
    ├── projects.ts            # Add getProjectsByStatus() for drill-down
    ├── suggestions.ts         # Add getSuggestionsByStatus() for drill-down
    ├── meetings.ts            # Add getUpcomingMeetings() for sidebar card
    ├── blueprints.ts          # Add getBlueprintStatusCounts() for sidebar card
    ├── case-studies.ts        # Add getCaseStudyStatusCounts() for sidebar card
    └── blockers.ts            # Add getActiveBlockersByPriority() for sidebar card
app/
└── api/
    └── sidebar-previews/
        └── route.ts           # NEW: Route Handler for lazy drill-down data
```

### Pattern 1: Pinnable Popover (replaces Tooltip for interactive items)

**What:** `Popover` controlled with `useState`. Hover opens it (`onMouseEnter`/`onMouseLeave`), click pins it (click toggles `isPinned`). Click outside dismisses (Radix handles this via `onOpenChange`).

**When to use:** For all 8 sidebar items that need hover cards in this phase.

**Example:**
```typescript
// components/app-sidebar.tsx — new pattern replacing Tooltip
function PinnableHoverCard({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)

  const handleMouseEnter = () => { if (!pinned) setOpen(true) }
  const handleMouseLeave = () => { if (!pinned) setOpen(false) }
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setPinned(prev => !prev)
    setOpen(prev => !prev)
  }
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) { setPinned(false); setOpen(false) }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          {trigger}
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-72 p-3 bg-bg-elevated border-border-rule shadow-[var(--shadow-float)]">
        {children}
      </PopoverContent>
    </Popover>
  )
}
```

### Pattern 2: Lazy Drill-Down Data Fetch

**What:** Item-level data (inquiry names, project names, suggestion titles) is NOT fetched at layout time. Instead, it's fetched client-side on first hover using a dedicated API route. The result is cached in `useState` so subsequent hovers don't re-fetch.

**When to use:** For the drill-down sub-list within stat rows (second-layer).

**Example:**
```typescript
// In the drill-down stat row component
function InquiryDrillDownRow({ stage, count }: { stage: string; count: number }) {
  const [items, setItems] = useState<Array<{ id: string; name: string }> | null>(null)
  const [hovered, setHovered] = useState(false)

  const handleMouseEnter = async () => {
    setHovered(true)
    if (items === null) {
      const res = await fetch(`/api/sidebar-previews?type=inquiries&status=${stage}&limit=5`)
      const data = await res.json()
      setItems(data.items)
    }
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={() => setHovered(false)}>
      <div className="flex justify-between">
        <span>{stage}: {count}</span>
      </div>
      {hovered && items && (
        <div className="mt-1 ml-2 space-y-0.5">
          {items.map(item => (
            <Link key={item.id} href={`/inquiries/${item.id}`} className="block text-xs hover:underline truncate">
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Pattern 3: Server-Side Counts vs Client-Side Names

**What:** Keep all aggregate counts server-side (layout.tsx, `Promise.all`). Item names and sub-list data load client-side via Route Handler. This split keeps the layout request fast while enabling rich drill-down.

**When to use:** All new hover cards. Counts go in layout; names stay lazy.

**Layout additions for new items (server-side counts only):**
```typescript
// layout.tsx — add to Promise.all (admin/internal only)
const [
  ...,
  meetingsSummary,      // { upcoming: Meeting[] }  — top 3 upcoming
  blueprintCounts,      // { draft: N, published: N }
  caseStudyCounts,      // { draft: N, published: N }
  activeBlockerCounts,  // { critical: N, high: N, normal: N }
] = await Promise.all([
  ...,
  isAdminOrInternal ? getUpcomingMeetings(3).catch(() => []) : Promise.resolve([]),
  isAdminOrInternal ? getBlueprintStatusCounts().catch(() => null) : Promise.resolve(null),
  isAdminOrInternal ? getCaseStudyStatusCounts().catch(() => null) : Promise.resolve(null),
  isAdminOrInternal ? getActiveBlockerCountsByPriority().catch(() => null) : Promise.resolve(null),
])
```

### Pattern 4: Conversations — Already Has Names, Needs Links Only

**What:** `conversationSummary` already passes `{ id, title, type, unread_count }` from `getUnreadConversationsSummary()`. The `ConversationTooltipContent` component already renders names but as plain text — just wrap in `<Link href={/conversations/${conv.id}}>`.

**When to use:** Conversations tab of this phase. No new API calls needed.

### Anti-Patterns to Avoid
- **Using `Tooltip` for interactive content:** Radix `Tooltip` adds `pointer-events: none` to its content in CSS. Links inside will not be clickable. Replace with `Popover`.
- **Fetching all item-level data server-side at layout:** Layout already has 7 concurrent queries. Adding 4-7 more for drill-down names (which may never be used) adds latency for every page load. Prefer lazy fetch.
- **Direct Supabase from `components/`:** Project rule — all DB calls through `lib/api/`. Route Handler uses server client from `lib/supabase/server.ts`.
- **Deeply nesting Tooltip inside Tooltip:** Radix `Tooltip` doesn't support nested tooltips reliably. The `Popover` pattern avoids this entirely.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Open/dismiss on outside click | Custom click-outside listener | `Popover.onOpenChange` | Radix handles focus, keyboard, and pointer events per ARIA spec |
| Hover delay timing | Custom `setTimeout` | `Popover.openDelay` or state with debounce | Radix handles this consistently |
| Portal rendering | Manual `createPortal` | `PopoverContent` (already uses `PopoverPrimitive.Portal`) | Stacking context, z-index, and scroll are handled |
| Link navigation | Custom `router.push` | `next/link` | Prefetch support, correct behavior for `<a>` semantics |
| Animation | Custom CSS classes | `framer-motion` `AnimatePresence` + `motion.div` (already installed) | Project already uses it; Radix provides `data-state` attributes that work with framer |

**Key insight:** The existing `Popover` component at `components/ui/popover.tsx` is production-ready. No new component scaffolding is needed — just consume it.

---

## Common Pitfalls

### Pitfall 1: Tooltip blocks pointer events in content
**What goes wrong:** Developers put `<Link>` tags inside `<TooltipContent>` and links don't respond to clicks.
**Why it happens:** `@radix-ui/react-tooltip` applies `pointer-events: none` to content to prevent the tooltip from stealing focus from the trigger.
**How to avoid:** Use `Popover` for all interactive tooltip content. The switch from `Tooltip` to `Popover` is the core refactor of this phase.
**Warning signs:** Links in TooltipContent that don't navigate on click.

### Pitfall 2: Popover trigger wrapping a Link breaks navigation
**What goes wrong:** When `<PopoverTrigger asChild>` wraps a `<SidebarMenuButton asChild><Link>`, clicking the sidebar item opens the popover instead of navigating.
**Why it happens:** The click event is captured by PopoverTrigger before Link's default behavior fires.
**How to avoid:** Don't use `PopoverTrigger asChild` to wrap the navigation link. Instead, layer the trigger as a separate element positioned over or adjacent to the nav item (or use an `onMouseEnter`/`onClick` on a wrapper div that controls `Popover` as a controlled component, leaving the Link free to navigate).
**Implementation:** Use the `PinnableHoverCard` pattern above — the `PopoverTrigger` wraps a div that intercepts hover/click for the card, while the actual `<Link>` inside `SidebarMenuButton` remains untouched for navigation.

### Pitfall 3: `app-sidebar.tsx` is `'use client'` — cannot call server APIs directly
**What goes wrong:** Developer tries to `await getInquiriesByStage()` inside the sidebar component.
**Why it happens:** `app-sidebar.tsx` is a client component (`'use client'`). Server API functions use `createClient()` from `lib/supabase/server.ts` which requires the Next.js server context.
**How to avoid:** All client-side data fetching must go through a Route Handler (`app/api/sidebar-previews/route.ts`) or via server actions. The component fetches JSON from the route via `fetch()`.
**Warning signs:** TypeScript error about server-only context, or runtime error `cookies()` called in client.

### Pitfall 4: Re-fetching drill-down data on every hover
**What goes wrong:** User briefly hovers over "Unopened: 3" multiple times, firing 3+ network requests.
**Why it happens:** `items` state is reset or not cached between hovers.
**How to avoid:** Use `items === null` as the sentinel: only fetch when `null`, set to `[]` on empty response. Use a `useRef` or component-level `Map` cache if the same stat row is shared across multiple renders.
**Warning signs:** Network tab shows duplicate requests for the same `?status=` param.

### Pitfall 5: Meetings API uses admin client — not safe for Route Handler
**What goes wrong:** `lib/api/meetings.ts` imports `createClient` from `lib/supabase/admin`. The admin client bypasses RLS.
**Why it happens:** Meeting CRUD operations were designed for admin use.
**How to avoid:** For the sidebar preview Route Handler, write a new lightweight function in `lib/api/meetings.ts` that uses the **server** client (with RLS), not the admin client: `import { createClient } from '@/lib/supabase/server'`. The function only needs `scheduled_at`, `title`, `status`, `id` fields — a safe, minimal select.
**Warning signs:** Meetings data leaking across users; all users seeing all meetings.

### Pitfall 6: Blueprints and Case Studies default to `published` only
**What goes wrong:** Admin sees only "Published: 5" in hover card but expects "Draft: 2, Published: 5" breakdown.
**Why it happens:** `getBlueprints()` defaults to `status: 'published'` unless `status: 'all'` is passed.
**How to avoid:** New `getBlueprintStatusCounts()` function must pass `{ status: 'all' }` to count across all statuses, then group in JS.

---

## Code Examples

### Anatomy of Current Tooltip Pattern (to be replaced)
```typescript
// BEFORE (from components/app-sidebar.tsx lines 301-322)
if (tooltipContent) {
  return (
    <SidebarMenuItem key={item.title}>
      <Tooltip>                                    // ← Radix Tooltip (non-interactive)
        <TooltipTrigger asChild>
          <SidebarMenuButton asChild isActive={isActive}>
            <Link href={item.url} prefetch={true}>
              <Icon />
              <span>{item.title}</span>
              {badgeContent}
            </Link>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right" align="start" className="p-3 bg-bg-elevated ...">
          {tooltipContent}                         // ← counts only, no links
        </TooltipContent>
      </Tooltip>
    </SidebarMenuItem>
  )
}
```

### New Popover Pattern (interactive, pinnable)
```typescript
// AFTER — controlled Popover alongside the nav Link
<SidebarMenuItem key={item.title}>
  <Popover open={isOpen} onOpenChange={handleOpenChange}>
    <div
      className="relative"
      onMouseEnter={() => !isPinned && setIsOpen(true)}
      onMouseLeave={() => !isPinned && setIsOpen(false)}
    >
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={item.url} prefetch={true}>
          <Icon />
          <span>{item.title}</span>
          {badgeContent}
        </Link>
      </SidebarMenuButton>
      <PopoverTrigger asChild>
        <button
          aria-label="Pin preview"
          className="absolute inset-0 w-full opacity-0"
          onClick={(e) => { e.preventDefault(); setPinned(p => !p); setIsOpen(p => !p) }}
        />
      </PopoverTrigger>
    </div>
    <PopoverContent side="right" align="start" className="w-72 p-3 bg-bg-elevated text-text-primary border border-border-rule shadow-[var(--shadow-float)]">
      {tooltipContent}
    </PopoverContent>
  </Popover>
</SidebarMenuItem>
```

### New API Functions Required

**Inquiries drill-down:**
```typescript
// lib/api/inquiries.ts — new function
export async function getInquiriesByStage(stage: ProposalStage, limit = 5): Promise<Array<{ id: string; prospect_company_name: string | null; form_data: Record<string, unknown> | null }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inquiries')
    .select('id, prospect_company_name, form_data')
    .eq('proposal_stage', stage)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}
```

**Projects drill-down:**
```typescript
// lib/api/projects.ts — new function
export async function getProjectsByStatusGroup(group: 'active' | 'inquiry' | 'completed', limit = 5) {
  const supabase = await createClient()
  const statusMap = {
    active: ['in_progress', 'blocked_client', 'blocked_internal', 'review_checkpoint', 'revisions', 'final_qa'],
    inquiry: ['deliverables_pending', 'awaiting_signoff', 'signed_off', 'agreement_sent', 'agreement_signed', 'payment_pending', 'payment_partial', 'payment_paid', 'collecting_access', 'access_complete', 'dev_assigned'],
    completed: ['completed', 'cancelled', 'on_hold'],
  }
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_name, client_name, status')
    .in('status', statusMap[group])
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return data || []
}
```

**Meetings sidebar summary (server client, not admin):**
```typescript
// lib/api/meetings.ts — new function using server client
import { createClient } from '@/lib/supabase/server'  // NOT admin client

export async function getUpcomingMeetings(limit = 3): Promise<Array<{ id: string; title: string; scheduled_at: string | null; status: string }>> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('meetings')
    .select('id, title, scheduled_at, status')
    .gte('scheduled_at', now)
    .not('status', 'in', '("done","error")')
    .order('scheduled_at', { ascending: true })
    .limit(limit)
  if (error) return []
  return (data || []) as Array<{ id: string; title: string; scheduled_at: string | null; status: string }>
}
```

**Blueprint counts:**
```typescript
// lib/api/blueprints.ts — new function
export async function getBlueprintStatusCounts(): Promise<{ draft: number; published: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('blueprints').select('status')
  if (error) return { draft: 0, published: 0 }
  const counts = { draft: 0, published: 0 }
  for (const row of data || []) {
    if (row.status === 'draft') counts.draft++
    else if (row.status === 'published') counts.published++
  }
  return counts
}
```

**Blocker counts by priority (active only):**
```typescript
// lib/api/blockers.ts — new function
export async function getActiveBlockerCountsByPriority(): Promise<{ critical: number; high: number; medium: number; low: number }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blockers')
    .select('priority')
    .not('status', 'in', '("resolved","closed")')
  if (error) return { critical: 0, high: 0, medium: 0, low: 0 }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const row of data || []) {
    counts[row.priority as keyof typeof counts]++
  }
  return counts
}
```

### Route Handler for Lazy Drill-Down
```typescript
// app/api/sidebar-previews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth/cached'
import { getInquiriesByStage } from '@/lib/api/inquiries'
import { getProjectsByStatusGroup } from '@/lib/api/projects'
import { getSuggestionsByStatus } from '@/lib/api/suggestions'
import { getAllActiveBlockers } from '@/lib/api/blockers'
import { getBlueprints } from '@/lib/api/blueprints'
import { getCaseStudies } from '@/lib/api/case-studies'

export async function GET(request: NextRequest) {
  const profile = await getAuthProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 10)

  // Gate admin-only types
  const isAdminOrInternal = ['admin', 'internal'].includes(profile.role)

  switch (type) {
    case 'inquiries':
      if (!isAdminOrInternal) return NextResponse.json({ items: [] })
      const inquiries = await getInquiriesByStage(status as any, limit)
      return NextResponse.json({ items: inquiries.map(i => ({
        id: i.id,
        name: [i.prospect_company_name, (i.form_data as any)?.project_type].filter(Boolean).join(' — ') || 'Unnamed',
      })) })
    // ... other cases
    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }
}
```

### Navigation Routes (confirmed from `lib/navigation.ts`)

| Entity | Route Pattern |
|--------|--------------|
| Inquiries | `/inquiries/[id]` |
| Projects | `/projects/[id]` |
| Conversations | `/conversations/[id]` |
| Suggestions | `/suggestions` (admin list only — no `[id]` route exists) |
| Meetings | `/meetings/[id]` |
| Blueprints | `/blueprints/[id]` |
| Case Studies | `/case-studies/[id]` |
| Blockers | `/admin/blockers` (list only — no `[id]` route exists) |

---

## Current Sidebar Data Architecture

### What Flows Through the Layout Today

`app/(dashboard)/layout.tsx` fetches all of the following in one `Promise.all`:

| Variable | API Function | Used For |
|----------|-------------|---------|
| `notifications` | `getMyNotifications(20)` | Header notification bell |
| `unreadCount` | `getUnreadCount()` | Notification badge |
| `devLoggingStatus` | `getDevLoggingStatus()` | Dev check-in prompt |
| `inquiryStatusCounts` | `getInquiryStatusCounts()` | Inquiries tooltip counts |
| `projectStats` | `getProjectStats()` | Projects tooltip counts |
| `conversationSummary` | `getUnreadConversationsSummary()` | Conversations tooltip (names + counts) |
| `suggestionCounts` | `getSuggestionCounts()` | Suggestions tooltip counts |

All are passed to `<AppSidebar>` via named props. Adding new count-level data for Meetings, Blueprints, Case Studies, Blockers follows the same pattern.

### AppSidebar Props Interface (current)

```typescript
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  profile: Profile
  navigation: NavGroup[]
  inquiryCounts?: { unopened: number; working: number; ready: number; total: number }
  projectStats?: { total: number; active: number; inquiry: number; completed: number }
  conversationSummary?: { total_unread: number; conversations: UnreadConversationSummary[] }
  suggestionCounts?: Record<string, number>
}
```

New props to add:

```typescript
  meetingsSummary?: Array<{ id: string; title: string; scheduled_at: string | null; status: string }>
  blueprintCounts?: { draft: number; published: number }
  caseStudyCounts?: { draft: number; published: number }
  activeBlockerCounts?: { critical: number; high: number; medium: number; low: number }
```

### Tooltip Content Component Map (current → proposed)

| Sidebar Item | Current Component | Phase 19 Change |
|-------------|------------------|-----------------|
| Inquiries | `InquiryTooltipContent` | Upgrade: add drill-down rows per status; make item names clickable Links |
| Projects | `ProjectTooltipContent` | Upgrade: add drill-down rows per status group |
| Conversations | `ConversationTooltipContent` | Upgrade: wrap each `conv.title` in `<Link href={/conversations/${conv.id}}>` |
| Suggestions | `SuggestionTooltipContent` | Upgrade: add drill-down rows per status |
| Meetings | None | New: show upcoming 2-3 meetings |
| Blueprints | None | New: draft/published counts + drill-down |
| Case Studies | None | New: draft/published counts + drill-down |
| Blockers | None | New: critical/high/medium counts, color-coded |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `Tooltip` with interactive content | `Popover` for interactive hover cards | Links work; pinning possible |
| All data server-side at layout time | Counts server-side, names client-side lazy | Layout stays fast; drill-down loads on demand |
| Aggregate counts only | Named item sub-lists with Links | User navigates directly from hover card |

**Deprecated/outdated:**
- Using `@radix-ui/react-tooltip` for content that contains interactive elements: replace with `@radix-ui/react-popover` (both available via the `radix-ui` umbrella package).

---

## Open Questions

1. **Suggestions individual detail pages — RESOLVED**
   - What we know: `app/(dashboard)/suggestions/` contains only `loading.tsx` and `page.tsx` — no `[id]` subdirectory exists. There is no individual suggestion detail page.
   - Resolution: Drill-down links for Suggestions should navigate to the list page `/suggestions` (admin) or use a query param to highlight. Planner should decide: `/suggestions?id=[id]` scroll-into-view, or simply link to `/suggestions` with no deep link. The simplest correct answer is to link the suggestion title to `/suggestions` (same destination as the nav item).

2. **Blocker individual detail page — RESOLVED**
   - What we know: `app/(dashboard)/admin/blockers/` contains only `loading.tsx` and `page.tsx` — no `[id]` subdirectory exists. There is no individual blocker detail page.
   - Resolution: Blocker drill-down links should navigate to `/admin/blockers`. The list page presumably has the blocker visible. Planner may scope adding a query param `/admin/blockers?blocker=[id]` to auto-scroll/highlight, but that's out of scope for this phase per CONTEXT.md.

3. **Meetings `scheduled_at` — null handling**
   - What we know: `getMeetings()` uses `created_at` for ordering, not `scheduled_at`. The `scheduled_at` column can be null.
   - What's unclear: Should the Meetings hover card show meetings with `scheduled_at: null`? What ordering is appropriate for "upcoming"?
   - Recommendation: `getUpcomingMeetings()` should filter by `scheduled_at >= now()` AND `scheduled_at IS NOT NULL`. Fall back to "No upcoming meetings scheduled" empty state.

4. **Popover z-index vs sidebar**
   - What we know: `TooltipContent` uses `z-50`. `PopoverContent` also defaults to `z-50`.
   - What's unclear: Does the sidebar's own stacking context override z-50? The sidebar uses `SidebarRail` and `SidebarInset` from shadcn.
   - Recommendation: Test in dev. May need `z-[100]` on PopoverContent to appear above sidebar elements. The existing `TooltipContent` adds `className` overrides already.

5. **Max items in drill-down before "View all"**
   - What we know: Claude's discretion per CONTEXT.md.
   - Recommendation: Show 5 items maximum; append a "View all →" Link when count exceeds 5. This limits the popover height and avoids overflow.

---

## Validation Architecture

> `workflow.nyquist_validation` not found in `.planning/config.json` — the config only contains `{ mode, depth, parallelization, created }`. Skipping this section.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `components/app-sidebar.tsx` — full component structure, 364 lines
- Direct codebase read: `components/ui/tooltip.tsx` — Radix Tooltip wrapper, confirmed `pointer-events` limitation
- Direct codebase read: `components/ui/popover.tsx` — already available, uses `radix-ui` umbrella
- Direct codebase read: `app/(dashboard)/layout.tsx` — dashboard layout data fetching pattern
- Direct codebase read: `lib/api/inquiries.ts`, `lib/api/projects.ts`, `lib/api/suggestions.ts`, `lib/api/meetings.ts`, `lib/api/blueprints.ts`, `lib/api/case-studies.ts`, `lib/api/blockers.ts` — all API functions
- Direct codebase read: `lib/navigation.ts` — all route URLs per role
- pnpm-lock.yaml: `@radix-ui/react-popover@1.1.15` and `@radix-ui/react-hover-card@1.1.15` are transitive deps already installed
- `agent_docs/CLAUDE.md` — project rules (all DB calls through lib/api/, 'use client' components cannot call server APIs)

### Secondary (MEDIUM confidence)
- Radix UI documentation pattern (training knowledge, consistent with code observed): `Tooltip` blocks pointer events in content; `Popover` supports interactive content

### Tertiary (LOW confidence)
- Optimal z-index for Popover inside sidebar: requires runtime testing to verify

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in pnpm-lock.yaml; component patterns confirmed in codebase
- Architecture: HIGH — layout.tsx data flow directly read; API function signatures confirmed
- Pitfalls: HIGH — `pointer-events: none` limitation confirmed by reading `tooltip.tsx`; `app-sidebar.tsx` is `'use client'` confirmed on line 1; meetings uses admin client confirmed on line 6 of `meetings.ts`
- Open questions: MEDIUM — require checking 2 more directories (suggestions/[id], admin/blockers/[id])

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack — Radix UI and Next.js versions unlikely to change in 30 days)
