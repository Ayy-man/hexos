---
phase: 20-onboarding-stepper-form
plan: "06"
subsystem: ui
tags: [react, next.js, server-actions, onboarding, bento-grid, form]

# Dependency graph
requires:
  - phase: 20-01
    provides: markOnboardingCompleteAction server action and saveAnswerAction
  - phase: 20-02
    provides: BentoCard, OnboardingBentoGrid layout, ResponsiveDialog, useOnboardingSheet
  - phase: 20-03
    provides: useCategoryAutosave, unsaved-changes guard, BentoCard.onBeforeClose
  - phase: 20-04
    provides: CategorySheet three-mode content (admin/preview/DFY)
  - phase: 20-05
    provides: DeliverablesSheet and RequirementsSheet with full content

provides:
  - Onboarding completion flow: "Mark Onboarding Complete" button with server-side validation
  - allRequiredAnswered gate: checks requiredRemaining===0 across all categories AND no unapproved absolute blockers
  - Flagged category UI: AlertTriangle warning on cards + CategorySheet auto-scroll to first incomplete required field
  - Post-completion success banner: "Onboarding complete! You can still edit your responses below."
  - isPostOnboarding prop: hides deliverables/requirements cards, shows transition Q&A banner
  - Transition banner dismissible per project via localStorage flag
  - ProjectTabs tab label transition: "Onboarding" during phase → "Questions" post-onboarding
  - Full onboarding lifecycle: admin builds form → DFY fills → DFY marks complete → ongoing Q&A continues

affects:
  - Any future phase that reads project.status to gate onboarding-phase UI
  - Any phase that extends the onboarding tab (now "Questions" post-onboarding)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-side completion validation: markOnboardingCompleteAction queries DB state directly, never trusts client progress"
    - "Flagged card pattern: incompleteCategories array from server drives visual warnings on individual bento cards"
    - "localStorage banner dismissal: key onboarding-banner-dismissed-{projectId} for one-time per-project banners"
    - "allRequiredAnswered derived from progress.byCategory.every(c => c.requiredRemaining === 0) + no unapproved absolute blockers"

key-files:
  created: []
  modified:
    - features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx
    - features/projects/components/tabs/onboarding/CategoryBentoCard.tsx
    - features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx
    - features/projects/components/ProjectTabs.tsx

key-decisions:
  - "allRequiredAnswered checks both requiredRemaining===0 and no unapproved absolute blocker requirements — ensures both axes of completeness"
  - "flagged prop threaded from OnboardingBentoGrid → CategoryBentoCard → CategorySheet to isolate scroll-to-first-incomplete logic"
  - "Transition banner uses localStorage per project (not global) so dismissal on project A does not affect project B"

patterns-established:
  - "Per-project localStorage dismissal: key includes projectId to scope banner state per project"
  - "Server-validation-first completion: never trust client state for completion gating"

requirements-completed: []

# Metrics
duration: ~30min
completed: 2026-03-03
---

# Phase 20 Plan 06: Onboarding Completion Flow and Tab Transition Summary

**Mark Onboarding Complete with server-side validation, flagged card auto-scroll to first incomplete required field, post-completion and post-onboarding state transitions, and tab label change to "Questions"**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-03T00:34:00Z
- **Completed:** 2026-03-03T00:40:20Z
- **Tasks:** 2 (1 auto, 1 checkpoint:human-verify — approved)
- **Files modified:** 4

## Accomplishments

- "Mark Onboarding Complete" button visible on grid when all required items answered (DFY only, during onboarding phase), calling `markOnboardingCompleteAction` for server-side validation
- Server-side validation returns `incompleteCategories` array — each flagged card shows AlertTriangle warning; opening a flagged card auto-scrolls to the first incomplete required field
- Post-completion success banner ("Onboarding complete! You can still edit your responses below.") replaces the Mark Complete button; form remains editable
- `isPostOnboarding` prop hides deliverables and requirements cards from the grid, shows a dismissible transition banner ("Onboarding complete — this tab now serves as your ongoing Q&A channel")
- Tab label transitions from "Onboarding" to "Questions" post-onboarding via `showQuestionsTab` flag in `ProjectTabs.tsx`

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement completion flow, post-onboarding state, and tab transition** - `370407e` (feat)
2. **Task 2: Visual verification checkpoint** - approved by user (no code commit)

**Plan metadata:** _(final docs commit pending)_

## Files Created/Modified

- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` - Added completion button, handleMarkComplete, flaggedCategories state, isPostOnboarding conditional rendering, success and transition banners
- `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx` - Accepts and surfaces flagged prop with AlertTriangle warning indicator
- `features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx` - Accepts flagged prop; on mount auto-scrolls to first incomplete required field via getElementById
- `features/projects/components/ProjectTabs.tsx` - Passes isPostOnboarding={showQuestionsTab} to OnboardingBentoGrid; tab label shows "Questions" post-onboarding

## Decisions Made

- `allRequiredAnswered` checks both `progress.byCategory.every(c => c.requiredRemaining === 0)` AND no unapproved absolute blocker requirements — ensures completeness on both axes before enabling the button
- `flagged` prop is threaded from `OnboardingBentoGrid` → `CategoryBentoCard` → `CategorySheet` so the sheet can own the auto-scroll logic without lifting state further
- Transition banner uses `localStorage` key `onboarding-banner-dismissed-{projectId}` scoped per project so dismissal on one project does not affect others

## Deviations from Plan

None — plan executed exactly as written. CategoryBentoCard required a minor prop addition (flagged) that was implied by the plan's requirement to surface warnings on cards; this is within plan scope.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Complete onboarding stepper form feature (Phase 20, all 6 plans) is fully shipped and verified
- The onboarding tab renders correctly across admin build, DFY fill, completion, and post-onboarding Q&A modes
- No outstanding blockers for subsequent phases

---
*Phase: 20-onboarding-stepper-form*
*Completed: 2026-03-03*
