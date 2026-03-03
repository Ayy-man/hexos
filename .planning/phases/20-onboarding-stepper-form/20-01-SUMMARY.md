---
phase: 20-onboarding-stepper-form
plan: 01
subsystem: database, api
tags: [supabase, postgresql, rls, typescript, server-actions, onboarding]

# Dependency graph
requires: []
provides:
  - Supabase migration with onboarding_categories, onboarding_questions, onboarding_answers tables
  - RLS policies for admin full access, project member SELECT, DFY INSERT/UPDATE on answers
  - category_id extension on onboarding_requirements
  - TypeScript API layer: 5 category functions, 6 question functions, 2 answer functions
  - Server actions: 10 actions for all form CRUD operations and onboarding completion
affects:
  - 20-02 (stepper UI depends on these actions and APIs)
  - 20-03 (admin form builder depends on category/question CRUD actions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - upsert with onConflict for idempotent answer saves
    - { success, error? } return pattern for all server actions
    - saveAnswerAction avoids revalidatePath to prevent re-renders on auto-save

key-files:
  created:
    - supabase/migrations/20260303000001_onboarding_form_tables.sql
    - lib/api/onboarding-categories.ts
    - lib/api/onboarding-questions.ts
    - lib/api/onboarding-answers.ts
    - features/projects/actions/onboardingFormActions.ts
  modified:
    - lib/api/onboarding-requirements.ts

key-decisions:
  - "saveAnswerAction does NOT call revalidatePath — prevents full page re-render on every auto-save keystroke"
  - "upsertOnboardingAnswer uses onConflict: question_id,project_id — idempotent saves via UNIQUE constraint"
  - "markOnboardingCompleteAction queries server state directly — not trusting client to report completion"
  - "DFY answers: separate INSERT (WITH CHECK) and UPDATE (USING + WITH CHECK) RLS policies, not FOR ALL"
  - "saveAnswerAction returns section_deleted error code on FK violations — enables UI to handle deleted questions gracefully"

patterns-established:
  - "Answer auto-save: upsert pattern with onConflict, no revalidatePath, returns {success, error?}"
  - "Server-side form completion: query required questions + existing answers, return incompleteCategories[]"

requirements-completed: []

# Metrics
duration: 15min
completed: 2026-03-03
---

# Phase 20 Plan 01: Onboarding Form — Data Layer Summary

**Three new Supabase tables (categories/questions/answers) with RLS, full TypeScript API layer (13 functions), and 10 server actions for onboarding form CRUD and completion validation**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-03T23:44:00Z
- **Completed:** 2026-03-02T23:59:36Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created onboarding_categories, onboarding_questions, onboarding_answers tables with proper constraints, indexes, and triggers
- Extended onboarding_requirements with nullable category_id FK
- Built full API layer: 5 category functions, 6 question functions, 2 answer functions (upsert with onConflict)
- Created 10 server actions covering all form operations, with saveAnswerAction intentionally omitting revalidatePath for auto-save performance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration for onboarding form tables** - `de06ccc` (feat)
2. **Task 2: Create API functions for categories, questions, and answers** - `5b5554d` (feat)
3. **Task 3: Create server actions for onboarding form operations** - `88b422d` (feat)

## Files Created/Modified
- `supabase/migrations/20260303000001_onboarding_form_tables.sql` - 3 new tables, ALTER onboarding_requirements, 6 indexes, 2 triggers, 9 RLS policies
- `lib/api/onboarding-categories.ts` - CRUD for categories: getOnboardingCategories, createOnboardingCategory, updateOnboardingCategory, reorderOnboardingCategories, deleteOnboardingCategory
- `lib/api/onboarding-questions.ts` - CRUD for questions: getOnboardingQuestions, getOnboardingQuestionsByCategory, createOnboardingQuestion, updateOnboardingQuestion, reorderOnboardingQuestions, deleteOnboardingQuestion
- `lib/api/onboarding-answers.ts` - getOnboardingAnswers, upsertOnboardingAnswer (onConflict: question_id,project_id)
- `features/projects/actions/onboardingFormActions.ts` - 10 server actions following {success, error?} pattern
- `lib/api/onboarding-requirements.ts` - Added category_id to interfaces + insert/update logic, added getRequirementsByCategory function

## Decisions Made
- `saveAnswerAction` intentionally does NOT call `revalidatePath` — prevents full page re-renders on every auto-save keystroke (per RESEARCH.md anti-pattern guidance)
- `upsertOnboardingAnswer` uses `onConflict: 'question_id,project_id'` — backed by UNIQUE constraint in migration for true idempotent upserts
- `markOnboardingCompleteAction` queries server state directly (required questions + existing answers) — never trusts client to report completion status
- DFY RLS policies for answers use separate INSERT and UPDATE policies rather than a single FOR ALL — required to set both USING and WITH CHECK correctly
- `saveAnswerAction` returns `{ success: false, error: 'section_deleted' }` on FK violations — enables UI to handle race conditions when questions/categories are deleted while client is answering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed implicit any type in markOnboardingCompleteAction filter callback**
- **Found during:** Task 3 (Create server actions)
- **Issue:** TypeScript inferred `any` for the filter/map callback parameters when processing answers from Supabase query
- **Fix:** Added explicit type annotations `(a: { question_id: string; value: unknown })` on filter and map callbacks
- **Files modified:** features/projects/actions/onboardingFormActions.ts
- **Verification:** `npx tsc --noEmit` shows zero new errors in onboardingFormActions.ts
- **Committed in:** `88b422d` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug/type error)
**Impact on plan:** Minor fix — typed the Supabase query result callbacks. No scope creep.

## Issues Encountered
- Pre-existing TypeScript project configuration does not resolve `next/cache`, `next/navigation`, or `@/` path aliases when running `tsc` on individual files outside the full project context. This is a known pre-existing issue across the whole codebase — confirmed by running `npx tsc --noEmit` (project-wide) which shows zero errors in our new files.

## User Setup Required
None - migration will be applied via standard Supabase migration process.

## Next Phase Readiness
- Data foundation complete for all UI plans in Phase 20
- Plan 20-02 (stepper UI) can import from onboardingFormActions.ts and lib/api/onboarding-*.ts
- Plan 20-03 (admin form builder) can use addCategoryAction, addQuestionAction, etc.
- Requires: `supabase db push` or equivalent to apply the migration to Supabase project

## Self-Check: PASSED

- FOUND: supabase/migrations/20260303000001_onboarding_form_tables.sql
- FOUND: lib/api/onboarding-categories.ts
- FOUND: lib/api/onboarding-questions.ts
- FOUND: lib/api/onboarding-answers.ts
- FOUND: features/projects/actions/onboardingFormActions.ts
- FOUND: .planning/phases/20-onboarding-stepper-form/20-01-SUMMARY.md
- FOUND commit: de06ccc (Task 1)
- FOUND commit: 5b5554d (Task 2)
- FOUND commit: 88b422d (Task 3)

---
*Phase: 20-onboarding-stepper-form*
*Completed: 2026-03-03*
