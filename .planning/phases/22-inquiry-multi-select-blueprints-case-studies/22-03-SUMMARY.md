---
phase: 22-inquiry-multi-select-blueprints-case-studies
plan: "03"
subsystem: inquiries-data-layer
tags: [inquiry_selections, createInquiry, fieldMappings, detail-page, junction-table]
dependency_graph:
  requires:
    - 22-01 (inquiry_selections migration, SelectionItem type)
    - 22-02 (IntakeForm caseStudies prop, ItemMultiSelect, Zod schemas with selections)
  provides:
    - createInquiry() writes junction rows to inquiry_selections; derives blueprint_id from first blueprint in selections
    - fieldMappings FIELD_LISTS A1/A3/B2 now include 'selections' (replacing 'blueprint_id' in A1/B2)
    - Inquiry detail page queries inquiry_selections and renders list in Prospect Information card
    - new/page.tsx confirmed to use Promise.all for blueprints + case studies (done in Plan 02, verified here)
  affects:
    - All inquiry form submissions via createInquiry()
    - All inquiry detail page views showing Prospect Information card
tech_stack:
  added: []
  patterns:
    - Non-fatal junction table insert (errors logged, inquiry creation never blocked)
    - unknown cast for Supabase join type discrepancy (arrays vs single objects)
    - Primary blueprint_id derived from selections for backwards compat with downstream consumers
key_files:
  created:
    - features/inquiries/__tests__/fieldMappings.test-d.ts
  modified:
    - lib/api/inquiries.ts
    - features/inquiries/constants/fieldMappings.ts
    - app/(dashboard)/inquiries/[id]/page.tsx
decisions:
  - unknown cast used for selectionsData to bypass Supabase array-vs-object join type discrepancy (same pattern as new/page.tsx in Plan 02)
  - new/page.tsx was already updated in Plan 02 deviation — Task 2 verified it was complete, only [id]/page.tsx needed changes
  - inquirySelections fetch placed after deliverables/blueprints Promise.all to keep data fetching sequential and predictable
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 3
---

# Phase 22 Plan 03: Data Layer and Detail Page Summary

**One-liner:** `createInquiry()` now writes junction rows to `inquiry_selections` and derives `blueprint_id` from selections; inquiry detail page queries and renders all selected blueprints/case studies; `fieldMappings` FIELD_LISTS updated for A1/A3/B2.

---

## Tasks Completed

| Task | Name | Type | Commit |
|------|------|------|--------|
| 1 (RED) | Type-level test for fieldMappings selections | test (tdd) | 07b1d1e |
| 1 (GREEN) | Update createInquiry() and fieldMappings | auto (tdd) | e163cb5 |
| 2 | Update [id]/page.tsx selections display | auto | 807ca37 |

---

## What Was Built

### Task 1: createInquiry() and fieldMappings

**`lib/api/inquiries.ts`**

Updated `createInquiry()`:
- Derives `primaryBlueprintId` BEFORE the insert: `data.selections?.find(s => s.type === 'blueprint')?.id || data.blueprint_id || null`
- Passes `primaryBlueprintId` as `blueprint_id` in the insert (was `data.blueprint_id || null`)
- After `if (error) throw error`, inserts junction rows for all selections:
  - Maps each `SelectionItem` to `{ inquiry_id, item_type, blueprint_id | null, case_study_id | null, sort_order }`
  - Errors are non-fatal — logged with `console.error` but inquiry creation never blocked
- Notification call unchanged (still after junction insert)

**`features/inquiries/constants/fieldMappings.ts`**

Updated FIELD_LISTS:
- **A1**: `'blueprint_id'` → `'selections'`
- **A3**: Added `'selections'` before `'additional_notes'`
- **B2**: `'blueprint_id'` → `'selections'`
- A2, B3 unchanged

### Task 2: [id]/page.tsx selections display

**`app/(dashboard)/inquiries/[id]/page.tsx`**

- Added `import { createClient } from '@/lib/supabase/server'`
- Added `inquirySelections` fetch after the existing deliverables/blueprints block:
  - Queries `inquiry_selections` with `blueprint:blueprints(id, name, icon)` and `case_study:case_studies(id, name, icon, client_name)` joins
  - Ordered by `sort_order ASC`
  - Error is non-fatal (falls back to primary blueprint only)
  - Uses `unknown` cast for Supabase join type discrepancy
- In JSX Prospect Information card:
  - KEPT existing `inquiry.blueprint` display unchanged (backwards compat)
  - Added new section below: `inquirySelections.length > 0 && (...)` showing each selection with type badge, icon+name, and client_name for case studies
- Updated form_data filter to exclude `'selections'` (prevents JSON blob in Submission Details)

### Task 2 (new/page.tsx): Already complete from Plan 02

`app/(dashboard)/inquiries/new/page.tsx` was already updated in Plan 02 as a deviation fix — it already uses `Promise.all` for blueprints + caseStudies and passes `caseStudies` to `IntakeForm`. No changes needed.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase join returns arrays, not single objects**
- **Found during:** Task 2 TypeScript verification
- **Issue:** `selectionsData as typeof inquirySelections` produced TS2352 — Supabase returns `blueprint: {id, name, icon}[]` (array) but our type expects `blueprint: {...} | null` (single object). This is a pre-existing Supabase type discrepancy documented in Plan 02.
- **Fix:** Changed to `selectionsData as unknown as typeof inquirySelections` (same pattern used in new/page.tsx)
- **Files modified:** `app/(dashboard)/inquiries/[id]/page.tsx`
- **Commit:** 807ca37

**2. [Deviation - Already done] new/page.tsx was complete from Plan 02**
- **Found during:** Task 2 pre-check
- **Issue:** Plan 02 anticipated that new/page.tsx needed getCaseStudies and applied it as a deviation fix
- **Action:** Verified the file was correct, skipped re-implementing it, only implemented the [id]/page.tsx changes
- **Impact:** None — behavior matches plan specification exactly

---

## Verification

```
npx tsc --noEmit — only 3 pre-existing errors (QuestionField.tsx, DeliverablesSheet.tsx); zero errors from plan files

grep 'inquiry_selections' lib/api/inquiries.ts:
  63: .from('inquiry_selections')
  67: console.error('[createInquiry] Failed to write inquiry_selections:')

grep 'getCaseStudies' app/(dashboard)/inquiries/new/page.tsx:
  3: import { getCaseStudies, type CaseStudy } from '@/lib/api/case-studies'
  17: getCaseStudies(),

grep 'inquiry_selections' app/(dashboard)/inquiries/[id]/page.tsx:
  329: .from('inquiry_selections')
  344: console.error('[inquiry detail] Failed to fetch inquiry_selections:')

grep "'selections'" features/inquiries/constants/fieldMappings.ts:
  A1: 'selections' (line 7)
  A3: 'selections' (line 15)
  B2: 'selections' (line 20)
```

---

## Self-Check

```
FOUND: lib/api/inquiries.ts (modified)
FOUND: features/inquiries/constants/fieldMappings.ts (modified)
FOUND: features/inquiries/__tests__/fieldMappings.test-d.ts (created)
FOUND: app/(dashboard)/inquiries/[id]/page.tsx (modified)

Commits:
- 07b1d1e: test(22-03): add type-level test for fieldMappings selections fields
- e163cb5: feat(22-03): update createInquiry() for junction table and fieldMappings for selections
- 807ca37: feat(22-03): add inquiry_selections query and display to inquiry detail page
```

## Self-Check: PASSED
