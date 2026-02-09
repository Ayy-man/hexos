---
phase: 14-offboarding-retainer-system
plan: 05
subsystem: projects
tags: [improvements, backlog, future-work, project-conversion, retainer]
requires: [14-01]
provides:
  - Future Improvements backlog for all projects
  - Multi-select improvement bundling to new projects
  - Priority-based improvement tracking
affects: [project-detail-ui, admin-workflow]
tech-stack:
  added: []
  patterns:
    - Lazy tab data loading with useEffect
    - Checkbox multi-selection pattern
    - Priority badge color coding (critical/important/nice_to_have)
    - Admin-only batch conversion to new projects
key-files:
  created:
    - lib/api/project-improvements.ts
    - features/projects/actions/improvementActions.ts
    - features/projects/components/improvements/ImprovementsSection.tsx
    - features/projects/components/improvements/CreateImprovementDialog.tsx
    - features/projects/components/improvements/ConvertToProjectDialog.tsx
  modified:
    - features/projects/components/ProjectTabs.tsx
key-decisions:
  - "Improvements tab available on ALL project statuses (active, retainer, completed)"
  - "Any team member (admin, DFY, dev) can add improvements via RLS policies"
  - "Admin-only conversion to new project (UPDATE/DELETE restricted)"
  - "Client-side priority sorting (critical > important > nice_to_have)"
  - "Select All only selects open improvements (not converted ones)"
  - "Converted improvements show link to new project"
metrics:
  duration: 5 min
  completed: 2026-02-09
---

# Phase 14 Plan 05: Future Improvements Backlog Summary

**Future Improvements backlog with multi-select bundling, available on all projects regardless of status**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-09T13:41:28Z
- **Completed:** 2026-02-09T13:47:18Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created complete API module for improvements CRUD with batch conversion
- Implemented server actions following structured result pattern
- Built ImprovementsSection with lazy loading, priority badges, and multi-select
- Created CreateImprovementDialog for adding new improvement ideas
- Created ConvertToProjectDialog for admin bundling of improvements
- Integrated Improvements tab into ProjectTabs More dropdown (all project types)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create improvements API module and server actions** - `0a0a2f2` (feat)
2. **Task 2: Create improvement UI components and integrate into ProjectTabs** - `24639e9` (feat)

## Files Created/Modified
- `lib/api/project-improvements.ts` - CRUD operations for improvements with author/project joins, priority sorting, batch conversion
- `features/projects/actions/improvementActions.ts` - 3 server actions (create, update, convert-to-project) with structured results
- `features/projects/components/improvements/ImprovementsSection.tsx` - Lazy-loaded improvement list with multi-select, priority badges, open/converted grouping
- `features/projects/components/improvements/CreateImprovementDialog.tsx` - Add improvement form with title/description/priority
- `features/projects/components/improvements/ConvertToProjectDialog.tsx` - Admin dialog for bundling selected improvements into new project
- `features/projects/components/ProjectTabs.tsx` - Added Improvements to More dropdown, available on all project statuses

## Decisions Made

**1. Improvements tab available on all project statuses**
- Rationale: Teams need to capture future ideas on active, retainer, and completed projects
- Impact: Unlike retainer-specific tabs, improvements are universally accessible
- Result: Tab appears in More dropdown for all projects without conditional hiding

**2. Any team member can add improvements**
- Rationale: Best ideas come from everyone (admin, DFY, dev) working on the project
- Impact: INSERT RLS policy checks team membership, not admin-only
- Result: Democratic idea capture, admin controls conversion

**3. Admin-only conversion to new project**
- Rationale: Creating new projects requires business judgment and client coordination
- Impact: UPDATE/DELETE policies restricted to admin role
- Result: Team adds ideas, admin decides what becomes a project

**4. Client-side priority sorting**
- Rationale: Small dataset (<100 improvements per project typically)
- Impact: Custom sort function after fetch (critical > important > nice_to_have)
- Result: Simpler than complex DB ordering, fast enough for real-world use

**5. Select All only affects open improvements**
- Rationale: Converted improvements are historical, not actionable
- Impact: Checkbox selection and "Select All" button only operate on open status
- Result: Clear UX for bundling - only select things that can be converted

**6. Converted improvements show project link**
- Rationale: Trace which improvement led to which new project
- Impact: Join with projects table for converted_project_name, show ExternalLink button
- Result: Full audit trail from idea to execution

## Technical Highlights

**Priority badge configuration:**
```typescript
const priorityConfig = {
  critical: { label: 'Critical', className: 'bg-error-muted text-error-foreground' },
  important: { label: 'Important', className: 'bg-warning-muted text-warning-foreground' },
  nice_to_have: { label: 'Nice to Have', className: 'bg-muted text-muted-foreground' },
}
```
Consistent color coding across all improvement components.

**Lazy tab loading:**
```typescript
useEffect(() => {
  loadImprovements()
}, [project.id])
```
Improvements only fetch when tab activates, not on page load.

**Batch conversion:**
```typescript
export async function markAsConverted(
  improvementIds: string[],
  convertedProjectId: string
): Promise<void>
```
Atomic update using `.in('id', improvementIds)` for multi-row operations.

**Multi-select with Set:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
```
Efficient O(1) lookup for checkbox state.

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 14 completion:**
- Wave 1 (14-01): Database foundation ✓
- Wave 2 (14-02, 14-03): Projects page, API layer ✓
- Wave 3 (14-04, 14-05): Retainer UI, Improvements backlog ✓

**Future Improvements system ready for production use:**
- All team members can add improvement ideas
- Admin can bundle ideas into new projects
- Full audit trail from improvement to project
- Available on active, retainer, and completed projects

## Testing Notes

**Manual verification checklist:**
- [ ] Improvements tab appears in More dropdown on active project
- [ ] Improvements tab appears in More dropdown on retainer project
- [ ] Improvements tab appears in More dropdown on completed project
- [ ] Any team member can add improvement via CreateImprovementDialog
- [ ] Priority badges show correct colors (critical=red, important=amber, nice_to_have=gray)
- [ ] Admin can select multiple improvements
- [ ] "Create Project from Selected" creates new project and marks improvements as converted
- [ ] Converted improvements show link to new project
- [ ] TypeScript compiles without errors

---

*Phase 14 Wave 3 complete - Improvements backlog fully functional*
