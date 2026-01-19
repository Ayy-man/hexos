# Phase 05: Sidebar & Dashboard Polish - Research

**Researched:** 2026-01-19
**Domain:** Navigation UX, Tooltips, Data Synchronization
**Confidence:** HIGH

## Summary

This phase involves three distinct UI polish tasks: reordering sidebar navigation, adding hover tooltips with status counts to the Inquiries tab, and synchronizing DFY project cards with hill chart progress data. All components already exist in the codebase with well-established patterns.

The codebase uses shadcn/ui's Tooltip component (Radix-based) throughout, including in the sidebar's `SidebarMenuButton` component. Navigation is controlled via a static configuration in `lib/navigation.ts`. Hill chart progress calculation already exists in `lib/utils/projectProgress.ts` and is used by the dev dashboard.

**Primary recommendation:** Make minimal, surgical changes to existing files - no new components needed for sidebar reorder or tooltip additions.

## Standard Stack

The project already uses these components:

### Core Components
| Component | Location | Purpose | Status |
|-----------|----------|---------|--------|
| `Tooltip` | `components/ui/tooltip.tsx` | Radix-based tooltip | Ready to use |
| `SidebarMenuButton` | `components/ui/sidebar.tsx` | Sidebar nav buttons with built-in tooltip support | Ready to use |
| `AppSidebar` | `components/app-sidebar.tsx` | Main sidebar component | Consumes navigation config |
| `getNavigation()` | `lib/navigation.ts` | Role-based navigation config | Single source of truth |

### Data Sources
| API | Location | Purpose | Status |
|-----|----------|---------|--------|
| `getInquiries()` | `lib/api/inquiries.ts` | Fetch inquiries with stage info | Exists, returns `proposal_stage` |
| `calculateHillChartProgress()` | `lib/utils/projectProgress.ts` | Calculate avg hill position | Exists, ready to use |

### No New Dependencies Required

All functionality can be implemented with existing shadcn/ui components and Supabase queries.

## Architecture Patterns

### Current Navigation Structure
```
lib/navigation.ts
  getNavigation(role) → NavGroup[]
    ↓
components/app-sidebar.tsx
  AppSidebar({ navigation }) → renders groups/items
    ↓
components/ui/sidebar.tsx
  SidebarMenuButton({ tooltip }) → handles tooltip display
```

### Current Admin Sidebar Order (in `adminNav`)
```typescript
// Overview group
Dashboard, Pulse

// Management group
Projects, Conversations, Inquiries, Blueprints, Case Studies, Suggestions, Team

// Admin group
Metrics, Finances, Time Reports, Blockers, Developers, Opportunities  // <-- Blockers is 4th

// Teams group
Hexona Team, DFY Partners, Applications
```

### Recommended Pattern: Sidebar Tooltips with Dynamic Content

The `SidebarMenuButton` already supports tooltips via the `tooltip` prop (line 498-540 in sidebar.tsx). Currently, it only accepts `string | TooltipContent props`.

For dynamic tooltips with status counts, extend the NavItem interface:

```typescript
// lib/navigation.ts
export interface NavItem {
  title: string
  url: string
  icon: string
  badge?: string
  tooltipContent?: React.ReactNode  // NEW: rich tooltip content
}
```

### Pattern: Server-Side Data Fetching for Sidebar

Since `AppSidebar` is rendered in a server component context (dashboard layout), status counts should be:
1. Fetched at the layout level (Server Component)
2. Passed through to `AppSidebar` as props
3. Rendered as tooltip content

```typescript
// In dashboard layout.tsx (server component)
const inquiryCounts = await getInquiryStatusCounts()
// Pass to AppSidebar
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tooltips | Custom hover state logic | shadcn/ui `Tooltip` component | Already integrated in sidebar |
| Progress calculation | Manual hill position math | `calculateHillChartProgress()` | Handles sub-deliverables, edge cases |
| Status counts | Client-side filtering | Server-side SQL count query | More efficient, less data transfer |

## Common Pitfalls

### Pitfall 1: Client-Side Data Fetching in Sidebar
**What goes wrong:** Adding `useEffect` to fetch inquiry counts causes hydration mismatches and performance issues
**Why it happens:** Sidebar is rendered server-side in layouts
**How to avoid:** Fetch counts at layout level, pass as props
**Warning signs:** "Text content does not match" errors, flickering counts

### Pitfall 2: Tooltip Not Showing When Sidebar is Expanded
**What goes wrong:** The `SidebarMenuButton` tooltip only shows when sidebar is collapsed (line 536: `hidden={state !== "collapsed" || isMobile}`)
**Why it happens:** By design - tooltips replace text when collapsed
**How to avoid:** For always-visible status counts, add as `badge` or inline content, not just tooltip
**Warning signs:** Tooltips work collapsed but not expanded

### Pitfall 3: Breaking Other Role Navigations
**What goes wrong:** Changing `adminNav` without checking `internalNav` causes inconsistencies
**Why it happens:** `internalNav` mirrors `adminNav` but with fewer items
**How to avoid:** Update both `adminNav` and `internalNav` when reordering shared items
**Warning signs:** Admin sees different order than Internal users

### Pitfall 4: Hill Chart Progress Mismatch
**What goes wrong:** DFY dashboard shows different progress than project detail page
**Why it happens:** Using different calculation methods (deliverable count vs hill position)
**How to avoid:** Always use `calculateHillChartProgress()` from `lib/utils/projectProgress.ts`
**Warning signs:** Progress doesn't match when navigating to project

## Code Examples

### 1. Reorder Sidebar Navigation (lib/navigation.ts)

Current Admin group order:
```typescript
// Current (Blockers is 4th in Admin group)
{
  label: 'Admin',
  items: [
    { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
    { title: 'Finances', url: '/finances', icon: 'DollarSign' },
    { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
    { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },  // Move up
    { title: 'Developers', url: '/admin/devs', icon: 'Users' },
    { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
  ],
}
```

Recommended order (Blockers first in Admin group):
```typescript
// Recommended (Blockers promoted to first)
{
  label: 'Admin',
  items: [
    { title: 'Blockers', url: '/admin/blockers', icon: 'AlertTriangle' },  // First
    { title: 'Metrics', url: '/dashboard/admin/metrics', icon: 'BarChart3' },
    { title: 'Finances', url: '/finances', icon: 'DollarSign' },
    { title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },
    { title: 'Developers', url: '/admin/devs', icon: 'Users' },
    { title: 'Opportunities', url: '/admin/opportunities', icon: 'Briefcase' },
  ],
}
```

### 2. Add Inquiry Status Counts API Function (lib/api/inquiries.ts)

```typescript
// New function to add
export async function getInquiryStatusCounts(): Promise<Record<ProposalStage, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('inquiries')
    .select('proposal_stage')
    .is('deleted_at', null)
    .is('archived_at', null)

  if (error) throw error

  const counts: Record<ProposalStage, number> = {
    unopened: 0,
    admin_reviewed: 0,
    in_queue: 0,
    working: 0,
    on_hold: 0,
    final_review: 0,
    ready: 0,
    sent: 0,
    closed: 0,
    lost: 0,
  }

  for (const inquiry of data || []) {
    const stage = (inquiry.proposal_stage || 'unopened') as ProposalStage
    counts[stage]++
  }

  return counts
}
```

### 3. Custom Tooltip Content for Inquiries Tab

```typescript
// In AppSidebar or a wrapper component
// SidebarMenuButton with custom tooltip content

<Tooltip>
  <TooltipTrigger asChild>
    <SidebarMenuButton asChild isActive={isActive}>
      <Link href={item.url}>
        <Icon />
        <span>{item.title}</span>
      </Link>
    </SidebarMenuButton>
  </TooltipTrigger>
  <TooltipContent side="right" className="p-3">
    <div className="space-y-1 text-xs">
      <p className="font-medium">Inquiry Status</p>
      <div className="flex justify-between gap-4">
        <span className="text-red-500">Unopened:</span>
        <span>{counts.unopened}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-cyan-500">Working:</span>
        <span>{counts.working}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-green-500">Ready:</span>
        <span>{counts.ready}</span>
      </div>
    </div>
  </TooltipContent>
</Tooltip>
```

### 4. Hill Chart Progress for DFY Dashboard

The DFY dashboard (`app/(dashboard)/dashboard/dfy/page.tsx`) currently shows deliverable-based progress:
```typescript
// Current (line 254-256)
const done = project.deliverables?.filter(d => d.status === 'done').length || 0
const total = project.deliverables?.length || 0
const progress = total > 0 ? Math.round((done / total) * 100) : 0
```

Replace with hill chart progress:
```typescript
import { calculateHillChartProgress } from '@/lib/utils/projectProgress'

// Updated
const hillProgress = calculateHillChartProgress(project.deliverables)
const progress = hillProgress?.averagePosition || 0
const label = hillProgress
  ? `${progress}% hill`
  : 'No deliverables'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deliverable count progress | Hill chart position progress | Phase 04 (2026-01) | More accurate dev progress |
| Static sidebar badges | Dynamic status counts | This phase | At-a-glance awareness |

## Open Questions

1. **Tooltip trigger behavior**
   - What we know: `SidebarMenuButton` hides tooltips when sidebar is expanded
   - What's unclear: Should Inquiries tooltip show on hover even when expanded, or only when collapsed?
   - Recommendation: Show on hover always for Inquiries (override hidden prop), but keep standard behavior for other items

2. **Blocker urgency indication**
   - What we know: Blockers have priority levels (critical/high/medium/low)
   - What's unclear: Should the sidebar show a count badge for critical blockers?
   - Recommendation: Add badge with critical+high count to Blockers nav item

## Sources

### Primary (HIGH confidence)
- `lib/navigation.ts` - Navigation configuration (lines 1-191)
- `components/ui/sidebar.tsx` - Sidebar component with tooltip support (lines 493-541)
- `components/ui/tooltip.tsx` - Radix tooltip wrapper
- `lib/utils/projectProgress.ts` - Hill chart progress calculation
- `lib/api/inquiries.ts` - Inquiry data fetching patterns

### Secondary (MEDIUM confidence)
- `app/(dashboard)/dashboard/dfy/page.tsx` - Current DFY dashboard implementation
- `app/(dashboard)/inquiries/page.tsx` - Inquiry status counting pattern

## Metadata

**Confidence breakdown:**
- Sidebar reorder: HIGH - Direct code modification, no API changes
- Tooltip enhancement: HIGH - Pattern exists in codebase, just needs extension
- Hill chart sync: HIGH - Function exists, just needs integration

**Research date:** 2026-01-19
**Valid until:** Indefinite (stable internal patterns)

---

## Implementation Approach Summary

### Task 1: Reorder Sidebar (Blockers Higher)
- **File:** `lib/navigation.ts`
- **Change:** Move Blockers to first position in Admin group
- **Both:** Update `adminNav` and `internalNav` arrays
- **Verification:** Visual check in sidebar

### Task 2: Add Hover Tooltips to Inquiries Tab
- **Files:**
  - `lib/api/inquiries.ts` - Add `getInquiryStatusCounts()` function
  - `lib/navigation.ts` - Extend `NavItem` interface for tooltip content
  - `components/app-sidebar.tsx` - Add custom rendering for Inquiries item
  - `app/(dashboard)/layout.tsx` - Fetch counts at layout level
- **Verification:** Hover over Inquiries in sidebar shows status breakdown

### Task 3: Sync DFY Cards to Hill Chart Progress
- **File:** `app/(dashboard)/dashboard/dfy/page.tsx`
- **Change:** Replace deliverable count progress with `calculateHillChartProgress()`
- **Import:** `lib/utils/projectProgress.ts`
- **Verification:** Progress percentages match project detail hill chart
