---
phase: 20-onboarding-stepper-form
plan: 05
subsystem: ui
tags: [react, tailwind, design-tokens, sheets, deliverables, sign-off, requirements]

# Dependency graph
requires:
  - phase: 20-02
    provides: BentoCard with sheetContent prop, ResponsiveDialog integration, useOnboardingSheet hook
  - phase: 20-03
    provides: CategorySheet pattern, useCategoryAutosave, three-mode sheet content pattern
provides:
  - "DeliverablesSheet.tsx: full deliverables tree with sign-off flow inside expandable sheet"
  - "RequirementsSheet.tsx: full requirements list with status badges and blocker warning"
  - "DeliverablesBentoCard wired with sheetContent + userRole/isAdmin/isDfy props"
  - "RequirementsBentoCard wired with sheetContent + projectId/isAdmin props"
  - "OnboardingBentoGrid updated to forward new props to both fixed bento cards"
affects: [20-06, 20-07, onboarding-tab, project-tabs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sheet content passed via sheetContent prop on BentoCard — co-location without custom dialog state"
    - "Design tokens used exclusively for status colors — --signal-good, --signal-bad, --signal-warn, --signal-good-dim, --signal-bad-dim, --signal-warn-dim"
    - "buildDeliverableTree and DeliverableTreeItem lifted from OnboardingTab into DeliverablesSheet"

key-files:
  created:
    - "features/projects/components/tabs/onboarding/sheets/DeliverablesSheet.tsx"
    - "features/projects/components/tabs/onboarding/sheets/RequirementsSheet.tsx"
  modified:
    - "features/projects/components/tabs/onboarding/DeliverablesBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/RequirementsBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx"

key-decisions:
  - "DeliverablesSheet receives full project prop (not just deliverables) — needed for sign-off status derived from project.status and project.signed_off_at"
  - "sheetContent prop used on BentoCard rather than a separate ResponsiveDialog — BentoCard already owns the dialog lifecycle"
  - "userRole destructured in OnboardingBentoGridInner (was missing, causing TS2304) — forwarded to DeliverablesBentoCard"
  - "bg-[color:var(--accent-dim)] syntax used for CSS custom properties in Tailwind class strings where the property has a dash in its name"

patterns-established:
  - "Sheet migration pattern: lift logic from OnboardingTab → dedicated Sheet component → pass as sheetContent to BentoCard"
  - "Design token migration: STATUS_COLORS map replaced by inline cn() expressions with CSS custom property class strings"

requirements-completed: []

# Metrics
duration: 20min
completed: 2026-03-03
---

# Phase 20 Plan 05: Deliverables and Requirements Sheets Summary

**DeliverablesSheet with full sign-off flow (confirm/send/sign-off via ButtonHoldAndRelease) and RequirementsSheet with status badges, both wired into their BentoCards via sheetContent prop using design tokens throughout**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-03T00:30:00Z
- **Completed:** 2026-03-03T00:50:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 updated)

## Accomplishments
- Created `DeliverablesSheet.tsx` with full deliverables tree, progress bar, sign-off status badge, and three-state sign-off flow (confirm → send for sign-off → sign off on behalf of client)
- Created `RequirementsSheet.tsx` with full requirements list, status badges, blocker warning, and design token colors throughout
- Wired both sheets into `DeliverablesBentoCard` and `RequirementsBentoCard` via the `sheetContent` prop on `BentoCard`
- Updated `OnboardingBentoGrid` to forward `userRole`, `isAdmin`, `isDfy` to `DeliverablesBentoCard` and `projectId`, `isAdmin` to `RequirementsBentoCard`
- Migrated all status colors from hardcoded Tailwind (`text-green-500`, `bg-red-50`) to design tokens (`text-[--signal-good]`, `bg-[--signal-bad-dim]`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DeliverablesSheet with sign-off flow** - `13ea88d` (feat)
2. **Task 2: Create RequirementsSheet and wire both sheets** - `9b44af1` (feat)

## Files Created/Modified
- `features/projects/components/tabs/onboarding/sheets/DeliverablesSheet.tsx` - Full deliverables tree + sign-off flow inside sheet (275 lines)
- `features/projects/components/tabs/onboarding/sheets/RequirementsSheet.tsx` - Full requirements list with status badges and blocker warning (119 lines)
- `features/projects/components/tabs/onboarding/DeliverablesBentoCard.tsx` - Added userRole/isAdmin/isDfy props, wired sheetContent
- `features/projects/components/tabs/onboarding/RequirementsBentoCard.tsx` - Added projectId/isAdmin props, wired sheetContent
- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` - Added userRole to destructuring, forwarded new props to both fixed bento cards

## Decisions Made
- `DeliverablesSheet` receives the full `project: ProjectWithRelations` prop rather than just the deliverables array — required because sign-off status is derived from `project.status` and `project.signed_off_at`
- Used `sheetContent` prop on `BentoCard` rather than adding a separate `ResponsiveDialog` — `BentoCard` already owns the dialog lifecycle via `useOnboardingSheet` and `handleOpenChange`
- `userRole` was already in the `OnboardingBentoGridProps` interface but was not destructured in `OnboardingBentoGridInner` — added it to the destructuring to fix the TS2304 reference error
- Used `bg-[color:var(--accent-dim)]` Tailwind syntax (with the `color:` prefix) for the awaiting-signoff badge background to correctly reference the CSS custom property in a background utility class

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing userRole destructuring in OnboardingBentoGridInner**
- **Found during:** Task 2 (wiring RequirementsSheet, checking OnboardingBentoGrid)
- **Issue:** `userRole` was listed in `OnboardingBentoGridProps` interface and the outer `OnboardingBentoGrid` spreads all props, but `OnboardingBentoGridInner` was not destructuring `userRole`, causing TS2304 `Cannot find name 'userRole'` when forwarding it to `DeliverablesBentoCard`
- **Fix:** Added `userRole` to the `OnboardingBentoGridInner` destructuring parameter
- **Files modified:** `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx`
- **Verification:** TS2304 error for `userRole` resolved in that file
- **Committed in:** `9b44af1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix required for `userRole` to be correctly forwarded to `DeliverablesBentoCard`. No scope creep.

## Issues Encountered

- Pre-existing project-wide TypeScript module resolution errors (`react`, `lucide-react`, `sonner` modules not found in tsconfig) cause TS2307/TS2322 errors in all files including pre-existing ones like `OnboardingTab.tsx` and `CategorySheet.tsx`. These errors are identical to what appears in the original `OnboardingTab.tsx` for `ButtonHoldAndRelease` usage and `DeliverableTreeItem` with `key` prop — confirmed to be pre-existing and not introduced by this plan.

## Next Phase Readiness
- Both fixed bento card sheets are fully functional with interactive content
- `OnboardingTab.tsx` can now be deprecated in a future pass — all its modal logic has been migrated to the sheet components
- Phase 20-06 can proceed: the deliverables and requirements sheets are complete

## Self-Check: PASSED

- FOUND: `features/projects/components/tabs/onboarding/sheets/DeliverablesSheet.tsx`
- FOUND: `features/projects/components/tabs/onboarding/sheets/RequirementsSheet.tsx`
- FOUND: `.planning/phases/20-onboarding-stepper-form/20-05-SUMMARY.md`
- FOUND commit: `13ea88d` (Task 1)
- FOUND commit: `9b44af1` (Task 2)

---
*Phase: 20-onboarding-stepper-form*
*Completed: 2026-03-03*
