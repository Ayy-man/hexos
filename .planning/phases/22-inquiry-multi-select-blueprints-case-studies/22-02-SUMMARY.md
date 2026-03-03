---
phase: 22-inquiry-multi-select-blueprints-case-studies
plan: "02"
subsystem: inquiries-ui
tags: [multi-select, combobox, blueprints, case-studies, intake-form, zod]
dependency_graph:
  requires:
    - 22-01 (SelectionItem type, CreateInquiryData.selections field)
  provides:
    - ItemMultiSelect component (features/inquiries/components/ItemMultiSelect.tsx)
    - CaseStudyPreviewSidebar component (features/inquiries/components/CaseStudyPreviewSidebar.tsx)
    - Updated Zod schemas with selections array replacing blueprint_id in A1/B2
    - Updated IntakeForm accepting caseStudies prop
    - Updated ClosedBlueprint (A1), VariationProposal (B2), ClosedCustom (A3) form steps
  affects:
    - Plan 22-03 (data submission layer reads selections from form state)
tech_stack:
  added: []
  patterns:
    - '@base-ui/react ComboboxChips with controlled multi-select and ID prefixing (bp:/cs:) to avoid type collision'
    - focusedItem state pattern for sidebar switching between BlueprintDetailsSidebar and CaseStudyPreviewSidebar
    - selected_tier_blueprint_id tracks which blueprint the current tier belongs to — cleared when that blueprint is deselected
key_files:
  created:
    - features/inquiries/components/ItemMultiSelect.tsx
    - features/inquiries/components/CaseStudyPreviewSidebar.tsx
  modified:
    - features/inquiries/schemas/intakeFormSchema.ts
    - features/inquiries/components/IntakeForm.tsx
    - features/inquiries/components/steps/ClosedBlueprint.tsx
    - features/inquiries/components/steps/VariationProposal.tsx
    - features/inquiries/components/steps/ClosedCustom.tsx
    - app/(dashboard)/inquiries/new/page.tsx
decisions:
  - ComboboxChip from @base-ui/react does not accept a value prop — chips are purely presentational, managed by Combobox root context; removed erroneous value prop from chip render loop
  - CaseStudies fetched in parallel with getBlueprints() via Promise.all in new inquiry page — no waterfall added
  - getCaseStudies() called with no options (defaults to published status only) — DFY partners only see live case studies in the multi-select
  - new inquiry page uses unknown cast for Supabase return type — getCaseStudies() returns joined blueprint as array but CaseStudy interface expects object (pre-existing type discrepancy)
metrics:
  duration: "7 minutes"
  completed_date: "2026-03-03"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 6
---

# Phase 22 Plan 02: Multi-Select UI Layer Summary

**One-liner:** Searchable grouped combobox (ItemMultiSelect) with bp:/cs: prefixed IDs, chip-style selection, and dual-sidebar preview (BlueprintDetailsSidebar or CaseStudyPreviewSidebar) wired into A1 (ClosedBlueprint), B2 (VariationProposal), and A3 (ClosedCustom) intake form steps.

---

## Tasks Completed

| Task | Name | Type | Commit |
|------|------|------|--------|
| 1 | Create ItemMultiSelect and CaseStudyPreviewSidebar components | auto | 7aeb2fa |
| 2a | Update Zod schemas and IntakeForm wiring | auto | 7cfca0a |
| 2b | Update the three form step components | auto | 737d178 |

---

## What Was Built

### Task 1: New Components

**`features/inquiries/components/ItemMultiSelect.tsx`**

Controlled multi-select combobox using `@base-ui/react` Combobox with:
- `ComboboxChips` container with chip rendering and searchable `ComboboxChipsInput`
- Two grouped sections: `Blueprints` and `Case Studies` separated by `ComboboxSeparator`
- ID prefixing strategy: `bp:{uuid}` for blueprints, `cs:{uuid}` for case studies — avoids collisions since Combobox `value` is `string[]`
- `onFocusedItemChange` callback notifies parent of which item is "active" (drives sidebar switching)
- Props: `blueprints`, `caseStudies`, `value: SelectionItem[]`, `onChange`, `onFocusedItemChange`, `placeholder`

**`features/inquiries/components/CaseStudyPreviewSidebar.tsx`**

Simple card-based sidebar preview for a focused case study showing: client, industry, about (description), and challenge. Shows empty state with icon when no case study is selected. No tier pricing (blueprints only).

### Task 2a: Schema and Form Wiring

**`features/inquiries/schemas/intakeFormSchema.ts`**
- Added `selectionItemSchema` (type enum, id uuid, name string)
- `closedBlueprintSchema` (A1): removed `blueprint_id`, added `selections` (min 1), `selected_tier_blueprint_id` (nullable optional), retained all tier fields
- `variationProposalSchema` (B2): same changes as A1
- `closedCustomSchema` (A2/A3): added optional `selections` field
- `IntakeFormState`: removed `blueprint_id`, added `selections`, `selected_tier_blueprint_id`, and explicit tier field types

**`features/inquiries/components/IntakeForm.tsx`**
- Added `caseStudies: CaseStudy[]` prop
- `onSubmit` sets `blueprint_id: undefined` and includes `selections: (data.selections as SelectionItem[]) || []`
- Passes `caseStudies` to `ClosedBlueprint`, `VariationProposal`, and `ClosedCustom` render calls

**`app/(dashboard)/inquiries/new/page.tsx`** (deviation fix)
- Added `getCaseStudies()` call in parallel with `getBlueprints()` via `Promise.all`
- Passes `caseStudies` prop to `IntakeForm`

### Task 2b: Form Step Components

**`features/inquiries/components/steps/ClosedBlueprint.tsx` (A1)**
- `useState<SelectionItem | null>(focusedItem)` for sidebar switching
- `focusedBlueprint` / `focusedCaseStudy` computed from selections + focused item
- `showBlueprintSidebar` logic: true when focused is blueprint or no case studies selected
- `ItemMultiSelect` replaces old `<Select>` blueprint dropdown
- Tier clearing when selected tier's blueprint is removed from selections
- `selected_tier_blueprint_id` set in `handleTierSelect`
- Sidebar: `BlueprintDetailsSidebar` when `showBlueprintSidebar`, else `CaseStudyPreviewSidebar`

**`features/inquiries/components/steps/VariationProposal.tsx` (B2)**
- Identical pattern to ClosedBlueprint — all the same logic applied

**`features/inquiries/components/steps/ClosedCustom.tsx` (A3)**
- Added optional `blueprints?`, `caseStudies?` props
- `ItemMultiSelect` conditionally rendered `{isVariation && blueprints && caseStudies && ...}` before `additional_notes` field
- No sidebar (A3 is simple vertical layout)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Page caller not updated for caseStudies prop**
- **Found during:** Task 2a
- **Issue:** `IntakeForm` now requires `caseStudies: CaseStudy[]` but `app/(dashboard)/inquiries/new/page.tsx` only fetched blueprints
- **Fix:** Added `getCaseStudies()` call in parallel with `getBlueprints()` via `Promise.all`; passes `caseStudies` to `IntakeForm`
- **Files modified:** `app/(dashboard)/inquiries/new/page.tsx`
- **Commit:** 7cfca0a

**2. [Rule 1 - Bug] ComboboxChip does not accept a value prop**
- **Found during:** Task 2b TypeScript verification
- **Issue:** Plan spec included `value` prop on `ComboboxChip` elements, but `@base-ui/react` `ComboboxChipProps` extends `BaseUIComponentProps<'div', ...>` and has no `value` prop — TS error TS2322
- **Fix:** Removed `value` prop from `ComboboxChip` renders in `ItemMultiSelect.tsx`; chip identity managed by `key` prop; chip removal handled via `ComboboxChipRemove` and Combobox root context
- **Files modified:** `features/inquiries/components/ItemMultiSelect.tsx`
- **Commit:** 737d178

---

## Self-Check

```
FOUND: features/inquiries/components/ItemMultiSelect.tsx
FOUND: features/inquiries/components/CaseStudyPreviewSidebar.tsx
FOUND: features/inquiries/schemas/intakeFormSchema.ts (modified)
FOUND: features/inquiries/components/IntakeForm.tsx (modified)
FOUND: features/inquiries/components/steps/ClosedBlueprint.tsx (modified)
FOUND: features/inquiries/components/steps/VariationProposal.tsx (modified)
FOUND: features/inquiries/components/steps/ClosedCustom.tsx (modified)
FOUND: app/(dashboard)/inquiries/new/page.tsx (modified)

Schema checks:
- selections in closedBlueprintSchema: YES (line 31)
- selections in variationProposalSchema: YES (line 56)
- selections in closedCustomSchema: YES (line 47, optional)
- selected_tier_blueprint_id in closedBlueprintSchema: YES (line 32)
- selected_tier_blueprint_id in variationProposalSchema: YES (line 57)
- blueprint_id: z.string() in schemas: NOT FOUND (correctly removed)
- selected_tier_blueprint_id in IntakeFormState: YES (line 137)
- selections in IntakeFormState: YES (line 136)

TypeScript: 3 pre-existing errors (QuestionField.tsx, DeliverablesSheet.tsx) — zero errors from this plan's files

Commits:
- 7aeb2fa: feat(22-02): create ItemMultiSelect and CaseStudyPreviewSidebar components
- 7cfca0a: feat(22-02): update Zod schemas and IntakeForm wiring for multi-select
- 737d178: feat(22-02): update form steps to use ItemMultiSelect and CaseStudyPreviewSidebar
```

## Self-Check: PASSED
