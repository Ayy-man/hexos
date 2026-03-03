---
phase: 20-onboarding-stepper-form
plan: 04
subsystem: ui
tags: [react, next.js, dnd-kit, admin, form-builder, drag-and-drop, inline-editing]

# Dependency graph
requires:
  - phase: 20-01
    provides: "onboardingFormActions server actions for all CRUD operations"
  - phase: 20-02
    provides: "OnboardingBentoGrid, CategoryBentoCard, BentoCard, Sortable component"

provides:
  - "InlineQuestionRow: ephemeral new-question creation row, dismisses silently on empty blur"
  - "QuestionEditor: full question editing with type picker, title blur-save, required toggle, options editor, inline delete confirmation, DFY answer preview, sortable drag handle, accessible arrow buttons"
  - "CategoryEditor: sortable question list with Sortable/SortableItem drag-and-drop, + Add Question, optimistic reorder"
  - "PreviewToggle: Switch+Label component for admin DFY preview mode"
  - "CategoryBentoCard: kebab menu (Rename inline / Delete with answer count warning), isPreviewMode prop"
  - "CategorySheet: three-mode content (admin build → CategoryEditor, admin preview → CategoryForm+banner, DFY → CategoryForm)"
  - "OnboardingBentoGrid: PreviewToggle integration, Sortable category reorder, + Add Category inline input"

affects:
  - "CategorySheet: updated to support isPreviewMode and admin build mode with CategoryEditor"
  - "CategoryBentoCard: enhanced with admin kebab menu, rename/delete, isPreviewMode threading"
  - "OnboardingBentoGrid: PreviewToggle, admin Sortable grid, + Add Category button"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Ephemeral row pattern: show/hide with useState + auto-dismiss on empty blur"
    - "Inline delete confirmation: toggle between delete button and Yes/Cancel buttons in-row (no dialog)"
    - "Three-mode sheet content: isAdmin+!isPreviewMode → builder, isAdmin+isPreviewMode → read-only+banner, isDfy → fill"
    - "Optimistic reorder: setSortedQuestions immediately, server action in startTransition, restore on failure"
    - "isSelectOpenRef guard: prevents blur from triggering save while Select dropdown is open"

key-files:
  created:
    - "features/projects/components/tabs/onboarding/admin/InlineQuestionRow.tsx"
    - "features/projects/components/tabs/onboarding/admin/QuestionEditor.tsx"
    - "features/projects/components/tabs/onboarding/admin/CategoryEditor.tsx"
    - "features/projects/components/tabs/onboarding/admin/PreviewToggle.tsx"
  modified:
    - "features/projects/components/tabs/onboarding/CategoryBentoCard.tsx"
    - "features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx"
    - "features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx"

key-decisions:
  - "isSelectOpenRef with 150ms delay prevents blur-save collision when user opens Select dropdown in InlineQuestionRow"
  - "Admin build mode skips unsaved guard in handleBeforeClose (CategoryEditor has no form state to save)"
  - "Kebab menu delete warning counts answers only for that category's questions (not project-wide)"
  - "OnboardingBentoGrid uses separate Sortable vs static div based on isAdmin — avoids DnD overhead for non-admin users"
  - "CategorySheet isReadOnly computed as !isDfy when not in admin build mode — admin preview and other roles both see read-only"

requirements-completed: []

# Metrics
duration: 9min
completed: 2026-03-03
---

# Phase 20 Plan 04: Admin Form Builder Summary

**Full admin form builder UX with inline question creation, drag-and-drop reorder, category management via kebab menu, and DFY preview mode toggled from the bento grid header**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-03T00:09:30Z
- **Completed:** 2026-03-03T00:18:00Z
- **Tasks:** 2
- **Files created/modified:** 7

## Accomplishments

- Built 4 new admin components: InlineQuestionRow (ephemeral row with auto-dismiss), QuestionEditor (full per-question editing with drag handle, type picker, options editor, DFY answer preview), CategoryEditor (sortable question list with Sortable/SortableItem), PreviewToggle (Switch+Label with Eye icon)
- Enhanced CategoryBentoCard with admin kebab menu (Rename inline / Delete with AlertDialog showing answer count), isPreviewMode prop threading
- Updated CategorySheet with three-mode content selection: admin build mode shows CategoryEditor, admin preview shows CategoryForm with "Preview mode — answers here are not saved" banner, DFY shows editable CategoryForm
- Updated OnboardingBentoGrid: PreviewToggle rendered above grid (admin only), admin grid wrapped in Sortable for category drag-and-drop reorder, "+ Add Category" inline input with blur-save and empty-title dismiss

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InlineQuestionRow, QuestionEditor, and CategoryEditor** - `38f73a1` (feat)
2. **Task 2: Add category management, preview toggle, and wire admin controls** - `3d62362` (feat)

## Files Created/Modified

- `features/projects/components/tabs/onboarding/admin/InlineQuestionRow.tsx` — Ephemeral new-question row: type Select, title Input with autoFocus, x button, dismisses on empty blur, isSelectOpenRef guard
- `features/projects/components/tabs/onboarding/admin/QuestionEditor.tsx` — Editable question row: SortableItemHandle drag grip, QuestionType Select, title blur-save, Switch for required, inline options editor, inline delete confirmation, DFY answer preview
- `features/projects/components/tabs/onboarding/admin/CategoryEditor.tsx` — Sortable question list: Sortable+SortableItem for drag-and-drop, moveQuestion for arrow button reorder, InlineQuestionRow for add, all actions via server actions with toast error handling
- `features/projects/components/tabs/onboarding/admin/PreviewToggle.tsx` — Switch+Label with Eye icon, controlled by isPreviewMode state in OnboardingBentoGrid
- `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx` — Added admin kebab menu (MoreVertical), Rename inline Input, Delete AlertDialog with DFY answer count warning, isPreviewMode prop
- `features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx` — Three-mode rendering (admin build/preview/DFY fill), preview banner, passes isPreviewMode to determine content mode
- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` — PreviewToggle above grid, Sortable category grid for admin, reorderCategoriesAction on drag-end, + Add Category inline Input with blur/Escape handling

## Decisions Made

- `isSelectOpenRef` with 150ms blur delay prevents race condition when user opens Select dropdown (blur fires before Select opens)
- Admin build mode bypasses `handleBeforeClose` guard (no form dirty state to save in CategoryEditor)
- Kebab menu delete confirmation counts answers scoped to the category's own questions only
- Admin grid uses `<Sortable>` with `strategy="grid"`, non-admin uses plain `<div>` — avoids DnD context overhead for DFY users
- `isReadOnly` in CategorySheet is `!isDfy` outside admin build mode — admin preview and viewer roles both get read-only form

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with minor adaptation for existing Plan 03 code already in place.

### Plan 03 Code Discovered

Plan 03 (CategoryForm, CategorySheet, QuestionField, AutoSaveStatus, CategoryBentoCard with form integration) was already implemented but uncommitted. Task 2 integrated cleanly with this existing work by updating CategorySheet to support the new isPreviewMode prop and admin build mode switching.

## Issues Encountered

TypeScript errors from `npx tsc --noEmit` are all pre-existing environment-level issues (missing React/JSX type declarations, missing lucide-react/sonner type declarations) that affect all ~60+ files in the project equally. These do not affect the Next.js build. Confirmed by comparing with pre-existing errors in BentoCard.tsx, CategoryBentoCard.tsx, and dozens of other project files.

## Self-Check: PASSED

All 7 files exist on disk. Both task commits (38f73a1, 3d62362) verified in git log.
