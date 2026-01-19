# Phase 02: Code Cleanup - Research

**Researched:** 2026-01-19
**Domain:** Next.js App Router code removal, navigation configuration
**Confidence:** HIGH

## Summary

This phase removes two unused/placeholder features from hexOS:
1. **Team section** (`/settings/team`) - A placeholder page showing "Coming Soon"
2. **Time Reports section** (`/admin/time-reports`) - Orphaned UI for removed time tracking feature

The time tracking database tables were already removed in migration `20260112000006_remove_time_tracking.sql`, but the UI code and API functions remain as dead code. The API functions now return empty arrays/zeros.

**Primary recommendation:** Delete the route directories, remove nav entries, clean up command palette references, and remove time-tracking-specific API functions from `admin-reports.ts` while preserving `getAllDevs()` which is still used.

## Scope Clarification

### What IS Being Removed

| Item | Route | Type | Reason |
|------|-------|------|--------|
| Team Settings Placeholder | `/settings/team` | Placeholder | Shows "Coming Soon", never implemented |
| Time Reports Page | `/admin/time-reports` | Dead Feature | Time tracking removed Jan 2026, API returns empty data |
| Time Reports Content Component | `features/admin/components/TimeReportsContent.tsx` | Dead Feature | Used only by time-reports page |
| Time API Functions | `lib/api/admin-reports.ts` | Dead Code | `getAllTimeEntries`, `getDevTimeReports`, `getProjectTimeReports`, `getTimeSummaryStats` |

### What Is NOT Being Removed

| Item | Route/Location | Reason |
|------|----------------|--------|
| Hexona Team Page | `/admin/team` | Active feature - manages admin/internal users |
| Dev Team Settings | `/dashboard/dev/settings/team` | Active feature - dev agency management |
| DFY Team Settings | `/dashboard/dfy/settings/team` | Active feature - DFY agency management |
| TeamPresence Widget | `components/team-presence.tsx` | Active feature - shows online users in sidebar footer |
| `getAllDevs()` function | `lib/api/admin-reports.ts` | Used by `/admin/devs` page |
| Presence hooks | `hooks/use-presence.ts` | Used by TeamPresence, AdminTeamList, TeamSettings |

## Files to Delete

### Route Directories (DELETE ENTIRELY)
```
app/(dashboard)/settings/team/page.tsx
app/(dashboard)/admin/time-reports/page.tsx
features/admin/components/TimeReportsContent.tsx
```

## Files to Modify

### Navigation Configuration
**File:** `lib/navigation.ts`

**Lines to remove:**
- Line 33: `{ title: 'Team', url: '/settings/team', icon: 'Users' },` (in adminNav Management section)
- Line 41: `{ title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },` (in adminNav Admin section)
- Line 87: `{ title: 'Time Reports', url: '/admin/time-reports', icon: 'Clock' },` (in internalNav Admin section)

**Note:** Do NOT remove:
- Line 50: `{ title: 'Hexona Team', url: '/admin/team', icon: 'Shield' },` - This is the active admin team page
- Line 127: `{ title: 'Team', url: '/dashboard/dev/settings/team', icon: 'Users' },` - Active dev feature
- Line 154: `{ title: 'Team', url: '/dashboard/dfy/settings/team', icon: 'Users' },` - Active DFY feature

### Command Palette
**File:** `components/command-palette.tsx`

**Remove (lines ~152-157):**
```typescript
{
  id: 'nav-time-reports',
  type: 'clock',
  title: 'Time Reports',
  subtitle: 'Developer time tracking',
  link: '/admin/time-reports',
},
```

**Remove (lines ~200-205 in admin section):**
```typescript
{
  id: 'nav-admin-settings-team',
  type: 'team',
  title: 'Team Settings',
  subtitle: 'Manage organization members',
  link: '/settings/team',
}
```

**Note:** Do NOT remove the DFY/Dev team settings entries at `/dashboard/dfy/settings/team` and `/dashboard/dev/settings/team`.

### Breadcrumb Configuration
**File:** `components/dynamic-breadcrumb.tsx`

**Remove from PAGE_TITLES:**
- Line 32: `'/settings/team': 'Team',`

### API Functions
**File:** `lib/api/admin-reports.ts`

**Remove functions:**
- `getAllTimeEntries()` (lines 60-69) - Returns empty array, deprecated
- `getDevTimeReports()` (lines 74-119) - Uses getAllTimeEntries, always empty
- `getProjectTimeReports()` (lines 124-168) - Uses getAllTimeEntries, always empty
- `getTimeSummaryStats()` (lines 190-203) - Returns zeros, deprecated
- `normalizeTimeEntry()` helper (lines 206-216) - Only used by removed functions

**Remove types:**
- `DevTimeReport` interface (lines 4-15)
- `TimeEntryWithDetails` interface (lines 17-41)
- `ProjectTimeReport` interface (lines 43-54)

**KEEP:**
- `getAllDevs()` function (lines 173-184) - Used by `/admin/devs/page.tsx`

### Revalidation Path References
**File:** `features/organizations/actions/invitationActions.ts`

**Modify:** Lines 220, 433, 462 contain `revalidatePath('/settings/team')` - these can stay as no-ops (revalidating a non-existent path is harmless) OR be removed for cleanliness.

**File:** `features/organizations/actions/organizationActions.ts`

**Modify:** Lines 45, 75, 141, 176, 221, 322 contain `revalidatePath('/settings/team')` - same as above.

## Dependency Analysis

### Time Reports Dependencies
```
/admin/time-reports/page.tsx
  └── lib/api/admin-reports.ts (getDevTimeReports, getProjectTimeReports, getTimeSummaryStats, getAllDevs)
  └── lib/api/projects.ts (getProjects)
  └── features/admin/components/TimeReportsContent.tsx
       └── lib/api/admin-reports.ts (DevTimeReport, ProjectTimeReport types)
```

After removal, no other code depends on time-tracking functions.

### Settings Team Dependencies
```
/settings/team/page.tsx
  └── lib/auth/guards.ts (requireRole) - shared, keep
  └── components/ui/* - shared, keep
```

No custom dependencies, page is self-contained placeholder.

## Common Pitfalls

### Pitfall 1: Accidentally Removing Active Team Features
**What goes wrong:** Removing the wrong `/team` routes
**Why it happens:** Multiple team-related routes exist with similar names
**How to avoid:** Only delete `/settings/team` and `/admin/time-reports`, NOT `/admin/team`, `/dashboard/dev/settings/team`, or `/dashboard/dfy/settings/team`
**Warning signs:** If you see `AdminTeamList`, `TeamSettings`, or organization management code, STOP

### Pitfall 2: Breaking getAllDevs
**What goes wrong:** Removing `getAllDevs()` from `admin-reports.ts` breaks `/admin/devs` page
**Why it happens:** Function is in the same file as deprecated time functions
**How to avoid:** Keep `getAllDevs()`, only remove time-tracking specific functions
**Warning signs:** Import errors in `app/(dashboard)/admin/devs/page.tsx`

### Pitfall 3: Leaving Orphan Imports
**What goes wrong:** TypeScript errors from importing deleted modules
**Why it happens:** Not checking all import sites
**How to avoid:** Run `pnpm tsc --noEmit` after deletions to catch errors
**Warning signs:** Build failures on deploy

## Verification Checklist

After completing changes:

1. **Build check:** `pnpm build` succeeds without errors
2. **Nav check:** Time Reports and Team (under settings) no longer appear in sidebar for any role
3. **Route check:** `/settings/team` returns 404
4. **Route check:** `/admin/time-reports` returns 404
5. **Active features still work:**
   - `/admin/team` (Hexona Team) loads correctly
   - `/dashboard/dev/settings/team` loads correctly
   - `/dashboard/dfy/settings/team` loads correctly
   - `/admin/devs` (Developer Directory) loads correctly
6. **Sidebar widget:** TeamPresence still appears in sidebar footer for admin/internal
7. **Command palette:** No broken links when using Cmd+K

## Code Examples

### Navigation Entry Removal Pattern
```typescript
// REMOVE this entry:
{ title: 'Team', url: '/settings/team', icon: 'Users' },

// KEEP this entry (different route):
{ title: 'Hexona Team', url: '/admin/team', icon: 'Shield' },
```

### Safe API File Cleanup
```typescript
// admin-reports.ts AFTER cleanup should contain:

import { createClient } from '@/lib/supabase/server'

/**
 * Get all devs with their roles
 */
export async function getAllDevs(): Promise<{ id: string; name: string; email: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('role', 'dev')
    .order('name')

  if (error) throw error
  return data || []
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Time tracking with dedicated tables | Removed entirely | Jan 2026 | DB clean, UI remains |
| Placeholder Team page | Should be removed | This phase | Cleaner navigation |

**Deprecated/outdated:**
- Time tracking database tables: Already removed via migration
- Time tracking UI: Being removed this phase

## Open Questions

None - scope is clear from FINAL-POLISH-ROADMAP.md and PROJECT.md.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis via file reads
- `/Users/aymanbaig/Desktop/hexos-main/lib/navigation.ts` - Navigation structure
- `/Users/aymanbaig/Desktop/hexos-main/lib/api/admin-reports.ts` - API functions
- `/Users/aymanbaig/Desktop/hexos-main/supabase/migrations/20260112000006_remove_time_tracking.sql` - DB removal confirmation

### Secondary (MEDIUM confidence)
- `.planning/FINAL-POLISH-ROADMAP.md` - Phase scope definition
- `.planning/PROJECT.md` - Project context

## Metadata

**Confidence breakdown:**
- Files to delete: HIGH - Direct inspection confirmed scope
- Files to modify: HIGH - Grep analysis found all references
- What NOT to remove: HIGH - Active features verified through multiple uses

**Research date:** 2026-01-19
**Valid until:** Indefinite (code cleanup, not version-dependent)
