---
phase: 22-inquiry-multi-select-blueprints-case-studies
plan: "01"
subsystem: database-types
tags: [migration, typescript, rls, inquiries, blueprints, case-studies]
dependency_graph:
  requires: []
  provides:
    - inquiry_selections table (DDL + RLS in supabase/migrations/20260303000003_inquiry_selections.sql)
    - SelectionItem type (features/inquiries/types.ts)
    - CreateInquiryData.selections field (features/inquiries/types.ts)
  affects:
    - Plan 22-02 (imports SelectionItem for Zod schemas and RHF watch)
    - Plan 22-03 (references data.selections in createInquiry())
tech_stack:
  added: []
  patterns:
    - Junction table with exclusive arc CHECK constraint (exactly one FK non-null)
    - RLS with get_user_role() helper for DFY/admin/internal separation
    - TDD with type-level test files (.test-d.ts pattern)
key_files:
  created:
    - supabase/migrations/20260303000003_inquiry_selections.sql
    - features/inquiries/__tests__/types.test-d.ts
  modified:
    - features/inquiries/types.ts
decisions:
  - SelectionItem placed before CreateInquiryData in types.ts for clean dependency order
  - blueprint_id kept on CreateInquiryData for backwards compat — will be set from first blueprint in selections by createInquiry()
  - Migration file created for remote-only Supabase project (db push not linked locally — must be applied via Supabase dashboard)
  - TDD type-level test uses .test-d.ts naming convention — verifies SelectionItem and selections field at compile time
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 22 Plan 01: DB Foundation and TypeScript Types Summary

**One-liner:** Junction table `inquiry_selections` with exclusive-arc CHECK constraint + `SelectionItem` TypeScript interface added to `CreateInquiryData` for multi-select blueprints/case-studies on inquiries.

---

## Tasks Completed

| Task | Name | Type | Commit |
|------|------|------|--------|
| 1 | Create inquiry_selections migration | auto | 5fd5285 |
| 2 | Add SelectionItem type and extend CreateInquiryData | auto (tdd) | d7710d5 |

---

## What Was Built

### Task 1: Migration File

Created `supabase/migrations/20260303000003_inquiry_selections.sql` with:

- **`inquiry_selections` table** — UUID PK, `inquiry_id` FK (CASCADE), `item_type` CHECK (`blueprint | case_study`), `blueprint_id` and `case_study_id` nullable FKs (CASCADE), `sort_order INTEGER`, `created_at`
- **Exclusive arc constraint** — `inquiry_selections_item_type_check` ensures exactly one of `blueprint_id`/`case_study_id` is non-null, matching `item_type`
- **3 indexes** — `idx_inquiry_selections_inquiry_id`, `idx_inquiry_selections_blueprint_id`, `idx_inquiry_selections_case_study_id`
- **RLS enabled** with 3 policies:
  - `inquiry_selections_dfy_select_own` — DFY users can SELECT their own inquiry's selections
  - `inquiry_selections_dfy_insert` — DFY users can INSERT for their own inquiries
  - `inquiry_selections_admin_all` — Admin/internal have full access

### Task 2: TypeScript Types (TDD)

**RED** — Added type-level test in `features/inquiries/__tests__/types.test-d.ts` that failed because `SelectionItem` didn't exist and `CreateInquiryData` had no `selections` field.

**GREEN** — Updated `features/inquiries/types.ts`:

```typescript
export interface SelectionItem {
  type: 'blueprint' | 'case_study'
  id: string
  name: string
}

export interface CreateInquiryData {
  // ... existing fields ...
  blueprint_id?: string        // KEEP — set from first blueprint in selections for backwards compat
  selections?: SelectionItem[] // NEW — the full multi-select array
  // ...
}
```

TypeScript compiles without new errors introduced by these changes.

---

## Decisions Made

1. **`blueprint_id` kept on `CreateInquiryData`** — Backwards compatibility for existing `createInquiry()` callers. Plan 03 will populate it from the first blueprint in `selections`.

2. **Migration requires manual application** — Project uses remote-only Supabase. `npx supabase db push` reported "Cannot find project ref. Have you run supabase link?". Migration file is correctly structured and ready to apply via the Supabase dashboard (`SQL Editor` or migrations apply).

3. **TDD with `.test-d.ts` pattern** — Type-level tests use TypeScript's own compiler as the test runner (`npx tsc --noEmit`). RED confirmed with 2 errors; GREEN confirmed with 0 errors in our files.

---

## Deviations from Plan

None — plan executed exactly as written. The `db push` auth gate (no linked project) was anticipated in the plan's note about remote-only migrations.

---

## Self-Check

```
FOUND: supabase/migrations/20260303000003_inquiry_selections.sql
FOUND: features/inquiries/__tests__/types.test-d.ts
FOUND: features/inquiries/types.ts (modified)

Migration DDL counts:
- CREATE TABLE: 1
- CREATE INDEX: 3
- CREATE POLICY: 3
- ENABLE ROW LEVEL SECURITY: 1

Types exported:
- SelectionItem: YES
- CreateInquiryData.selections: YES
- CreateInquiryData.blueprint_id: YES (preserved)

Commits:
- 5fd5285: chore(22-01): create inquiry_selections junction table migration
- d98e1b8: test(22-01): add failing type-level test for SelectionItem and CreateInquiryData
- d7710d5: feat(22-01): add SelectionItem type and extend CreateInquiryData with selections field
```

## Self-Check: PASSED
