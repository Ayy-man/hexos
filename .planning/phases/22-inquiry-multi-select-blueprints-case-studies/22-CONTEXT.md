# Phase 22: Inquiry Multi-Select Blueprints + Case Studies - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning
**Source:** Conversation analysis (4 parallel research agents)

<domain>
## Phase Boundary

This phase adds case studies as selectable items alongside blueprints in the inquiry intake form ("I've closed a deal" / proposal request), and converts the single-select blueprint dropdown into a multi-select supporting both item types.

### What this phase delivers:
- DFY partners can select multiple blueprints AND/OR case studies when submitting an inquiry
- New junction table `inquiry_selections` for many-to-many relationship
- Backwards-compatible: `inquiries.blueprint_id` kept as primary blueprint for existing downstream code
- Updated intake form UI with multi-select
- Updated downstream consumers (detail page, list views, conversion, reminders, etc.)

### What this phase does NOT deliver:
- No changes to case study CRUD (already complete)
- No changes to blueprint CRUD
- No changes to pricing tier system (tiers still per-blueprint)
- No new case study creation flow from inquiry

</domain>

<decisions>
## Implementation Decisions

### Database
- New `inquiry_selections` junction table with `item_type` discriminator ('blueprint' | 'case_study')
- CHECK constraint ensures exactly one of blueprint_id/case_study_id is non-null based on item_type
- Keep existing `inquiries.blueprint_id` column as "primary blueprint" — set to first selected blueprint for backwards compat
- ON DELETE CASCADE from inquiry; ON DELETE CASCADE from blueprint/case_study
- RLS: same as inquiries table (DFY see own, admin/internal see all)

### Form UI
- Replace `<Select>` single dropdown with multi-select component (combobox or checkbox list)
- Visually distinguish blueprints vs case studies in the selector (different icons, grouped sections)
- Existing `BlueprintDetailsSidebar` shows details for the FIRST selected blueprint (or whichever is focused)
- Case studies show a simpler preview (name, client, industry) — no tier pricing
- DFY can only see published blueprints and published case studies (existing RLS handles this)

### Form Paths Affected
- **A1 (Closed Blueprint)**: Gets multi-select for blueprints + case studies
- **A3 (Closed Variation)**: Gets multi-select for blueprints + case studies (currently has no blueprint select — add it)
- **B2 (Variation Proposal)**: Gets multi-select for blueprints + case studies
- **B3 (Custom Proposal)**: No change (no blueprint selection)
- **A2 (Closed Custom)**: No change (no blueprint selection)

### Submission & Storage
- `form_data` JSONB stores full array of selections: `[{type, id, name}]`
- `CreateInquiryData` gets new `selections` array field
- Server action writes to junction table + sets primary `blueprint_id` from first blueprint in array
- If no blueprints selected (only case studies), `blueprint_id` stays null

### Downstream Backwards Compat Strategy
- `inquiries.blueprint_id` stays populated (first blueprint) so ALL existing code keeps working unchanged
- New junction table is additive — existing queries don't break
- Detail page enhanced to show all selections
- List/table views can optionally show count badge

### Claude's Discretion
- Exact multi-select UI pattern (combobox vs checkbox list vs tag input)
- Animation/transition details for selection
- Exact layout of mixed blueprint+case study preview in sidebar
- Whether to show selection count badge in list views

</decisions>

<specifics>
## Specific Ideas

- Group the multi-select into two sections: "Blueprints" header and "Case Studies" header
- Show blueprint icon + name + tier count; show case study icon + name + client name
- Selected items appear as removable tags/chips above or below the selector
- Sidebar preview switches based on which item is hovered/focused in the selection
- For case studies, sidebar shows: name, description, client_name, industry, challenge summary
- Form validation: at least one blueprint OR case study must be selected (for paths that require it)

## Key Files from Research

### Form Components
- `features/inquiries/components/steps/ClosedBlueprint.tsx` — A1 path, blueprint dropdown lines 90-121
- `features/inquiries/components/steps/VariationProposal.tsx` — B2 path, blueprint dropdown lines 93-125
- `features/inquiries/components/steps/ClosedCustom.tsx` — A3 path (no blueprint select currently)
- `features/inquiries/components/BlueprintDetailsSidebar.tsx` — tier pricing display
- `features/inquiries/components/IntakeForm.tsx` — main form orchestrator

### Schema & Types
- `features/inquiries/schemas/intakeFormSchema.ts` — zod schemas
- `features/inquiries/types.ts` — CreateInquiryData interface
- `features/inquiries/constants/fieldMappings.ts` — FIELD_LISTS per path

### API & Actions
- `lib/api/inquiries.ts` — createInquiry(), getInquiry(), all query functions
- `features/inquiries/actions/submitInquiry.ts` — server action
- `lib/api/case-studies.ts` — getCaseStudies(), getBlueprintsForSelect()
- `lib/api/blueprints.ts` — getBlueprints()

### Downstream Consumers
- `app/(dashboard)/inquiries/[id]/page.tsx` — detail page displays blueprint
- `app/(dashboard)/inquiries/new/page.tsx` — fetches blueprints for form
- `hooks/use-inquiries-realtime.ts` — realtime subscription normalizes blueprint
- `features/project-initiation/actions/initiationActions.ts` — project conversion uses blueprint_id
- `lib/api/proposal-deliverables.ts` — bulkCreateFromBlueprintTier()
- `lib/api/proposal-reminders.ts` — joins blueprint in reminder queries
- `features/inquiries/components/conversion/ConvertToProjectWizard.tsx` — project naming

### Database
- `supabase/migrations/20241221000005_inquiries_table.sql` — inquiries table with blueprint_id FK
- `supabase/migrations/20241222000003_case_studies.sql` — case_studies table

</specifics>

<deferred>
## Deferred Ideas

- Pricing aggregation across multiple blueprints (combined tier pricing)
- Case study as "proof point" in proposal PDF export
- Analytics dashboard grouping by blueprint combination
- Auto-suggest case studies based on selected blueprints (same blueprint_id link)

</deferred>

---

*Phase: 22-inquiry-multi-select-blueprints-case-studies*
*Context gathered: 2026-03-03 via conversation analysis*
