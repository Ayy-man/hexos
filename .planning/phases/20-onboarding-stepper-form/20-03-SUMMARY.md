---
phase: 20-onboarding-stepper-form
plan: 03
subsystem: ui
tags: [react, react-hook-form, autosave, accessibility, shadcn, form-fields]

# Dependency graph
requires:
  - phase: 20-01
    provides: "saveAnswerAction, onboarding_questions/answers API and types"
  - phase: 20-02
    provides: "BentoCard, CategoryBentoCard, useOnboardingSheet — sheet infrastructure"

provides:
  - "useCategoryAutosave hook: three-layer auto-save (blur + 2.5s debounce + save-on-close) with dirty field tracking"
  - "AutoSaveStatus component: inline Saving.../Saved/Error+Retry with aria-live regions"
  - "QuestionField component: renders all 5 question types with htmlFor/aria-describedby/required asterisk"
  - "CategoryForm component: react-hook-form wrapper with forwardRef exposing saveOnClose/hasDirtyFields"
  - "CategorySheet (via 20-04): role-aware sheet content — DFY fill, admin build, admin preview"
  - "BentoCard.onBeforeClose: async guard prop for unsaved changes interception"
  - "CategoryBentoCard: unsaved changes AlertDialog, admin rename/delete, className prop"

affects:
  - "20-04: requires CategoryForm and auto-save hook for question forms in deliverables/requirements sheets"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-layer auto-save: onChange debounce (2.5s) + onBlur + save-on-close via useImperativeHandle"
    - "forwardRef pattern with useImperativeHandle to expose form control surface to parent"
    - "Promise-based close guard: BentoCard.onBeforeClose returns Promise<boolean> for async dirty-check"
    - "section_deleted error handling: 2s auto-close delay when FK constraint fails on save"

key-files:
  created:
    - "features/projects/components/tabs/onboarding/hooks/use-category-autosave.ts"
    - "features/projects/components/tabs/onboarding/form/AutoSaveStatus.tsx"
    - "features/projects/components/tabs/onboarding/form/QuestionField.tsx"
    - "features/projects/components/tabs/onboarding/form/CategoryForm.tsx"
  modified:
    - "features/projects/components/tabs/onboarding/BentoCard.tsx"
    - "features/projects/components/tabs/onboarding/CategoryBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx"
    - "features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx"

key-decisions:
  - "useCategoryAutosave reads form values INSIDE performSave callback (not closure) to avoid stale value bug — getValues(questionId) called at save time, not at handler creation time"
  - "CategoryForm exposed via forwardRef with useImperativeHandle — parent (CategoryBentoCard) calls saveOnClose() and reads hasDirtyFields without lifting state"
  - "BentoCard.onBeforeClose returns Promise<boolean> — parent resolves Promise from AlertDialog callback, avoiding race conditions in close interception"
  - "AutoSaveStatus is non-fading per CONTEXT.md — Saved/Error states persist until next action (no setTimeout hide)"

patterns-established:
  - "Auto-save pattern: three layers (debounce + blur + close-guard) via useCategoryAutosave — consistent pattern for all form types"
  - "forwardRef + useImperativeHandle for form-to-parent bridge — exposes minimal surface (saveOnClose, hasDirtyFields) without prop drilling"
  - "Promise-based guard pattern: parent returns new Promise, stores resolve in state, dialog action calls resolve() — enables async interception of synchronous event handlers"

requirements-completed: []

# Metrics
duration: 11min
completed: 2026-03-03
---

# Phase 20 Plan 03: Category Question Sheet Summary

**Three-layer auto-save form system for DFY onboarding — react-hook-form wrapper with blur/debounce/close-guard save, all 5 question type renderers, inline save status, and role-aware sheet content**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-03T00:09:28Z
- **Completed:** 2026-03-03T00:20:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built three-layer auto-save hook (useCategoryAutosave) that reads values INSIDE the save callback (not closures), preventing stale value bugs, with dirty field tracking per question ID
- Created QuestionField rendering all 5 types (text, textarea, select, multi_select, boolean) with proper accessibility: `htmlFor={fieldId}`, `aria-describedby={descId}`, required asterisk via `text-[--signal-warn]`
- Wired CategoryForm via forwardRef exposing `saveOnClose/hasDirtyFields` to parent; CategoryBentoCard uses Promise-based close guard with AlertDialog (Save & Close / Discard / Cancel)

## Task Commits

Each task was committed atomically:

1. **Task 1: Auto-save hook, status indicator, and question field** - `707d7a3` (feat)
2. **Task 2: CategoryForm, BentoCard guard, CategoryBentoCard wiring** - `851db02` (docs/20-04, included in metadata commit)

## Files Created/Modified

- `features/projects/components/tabs/onboarding/hooks/use-category-autosave.ts` - Three-layer auto-save: pendingSavesRef dedup, section_deleted error, retrySave
- `features/projects/components/tabs/onboarding/form/AutoSaveStatus.tsx` - Saving/Saved/Error+Retry with aria-live polite/assertive
- `features/projects/components/tabs/onboarding/form/QuestionField.tsx` - All 5 question types with WCAG-compliant label/input association and required asterisk
- `features/projects/components/tabs/onboarding/form/CategoryForm.tsx` - react-hook-form FormProvider with forwardRef, default values from answers, section_deleted 2s auto-close
- `features/projects/components/tabs/onboarding/BentoCard.tsx` - Added `onBeforeClose?: () => Promise<boolean> | boolean` prop and `handleOpenChange` async interceptor
- `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx` - Unsaved changes AlertDialog with Promise-based resolve, admin rename/delete, className prop
- `features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx` - Role-aware content: admin build (CategoryEditor), admin preview (CategoryForm+banner), DFY fill (CategoryForm), other (read-only)
- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` - Passes questions/answers/requirements/projectId/isAdmin/isDfy down to CategoryBentoCard

## Decisions Made

- `useCategoryAutosave` reads form values INSIDE `performSave` callback via `form.getValues(questionId)` — not in the outer closure — to always get the latest value at save time
- `CategoryForm` uses `forwardRef` + `useImperativeHandle` to expose `{ saveOnClose, hasDirtyFields }` — parent reads these without lifting state into a separate context
- `BentoCard.onBeforeClose` returns `Promise<boolean>` — enables async interception of the close event, with the Promise resolve stored in React state and called from the AlertDialog action
- `AutoSaveStatus` does NOT fade/hide the "Saved" or "Error" states — persistent per CONTEXT.md anti-toast guidance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Task 2 files (`CategoryForm.tsx`, `BentoCard.tsx`, `CategoryBentoCard.tsx`) were inadvertently included in the 20-04 docs commit (851db02) rather than a separate feat(20-03) commit. All work is committed and correct — only the commit labeling differs from the expected atomic-per-task structure.

TypeScript errors observed in `tsc` output are all pre-existing environment-level issues (missing lib declarations for react/jsx-runtime, react-hook-form, lucide-react) that affect all files equally and do not affect the Next.js build — confirmed identical to errors on pre-existing files like `CategoryEditor.tsx`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 question types render with auto-save; CategoryBentoCard opens CategorySheet via BentoCard ResponsiveDialog
- Plan 04 (admin form builder): CategoryEditor inside CategorySheet already provides inline question add/edit/reorder for admins
- The three-layer auto-save pattern is reusable for any form using react-hook-form — can be extended for deliverables/requirements sheets

---
*Phase: 20-onboarding-stepper-form*
*Completed: 2026-03-03*
