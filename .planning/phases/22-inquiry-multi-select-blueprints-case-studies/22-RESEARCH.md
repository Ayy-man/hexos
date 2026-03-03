# Phase 22: Inquiry Multi-Select Blueprints + Case Studies - Research

**Researched:** 2026-03-03
**Domain:** Multi-select form UI, Supabase junction tables, RHF array state management, downstream blueprint_id consumers
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Database:**
- New `inquiry_selections` junction table with `item_type` discriminator ('blueprint' | 'case_study')
- CHECK constraint ensures exactly one of blueprint_id/case_study_id is non-null based on item_type
- Keep existing `inquiries.blueprint_id` column as "primary blueprint" — set to first selected blueprint for backwards compat
- ON DELETE CASCADE from inquiry; ON DELETE CASCADE from blueprint/case_study
- RLS: same as inquiries table (DFY see own, admin/internal see all)

**Form UI:**
- Replace `<Select>` single dropdown with multi-select component (combobox or checkbox list)
- Visually distinguish blueprints vs case studies in the selector (different icons, grouped sections)
- Existing `BlueprintDetailsSidebar` shows details for the FIRST selected blueprint (or whichever is focused)
- Case studies show a simpler preview (name, client, industry) — no tier pricing
- DFY can only see published blueprints and published case studies (existing RLS handles this)

**Form Paths Affected:**
- A1 (Closed Blueprint): Gets multi-select for blueprints + case studies
- A3 (Closed Variation): Gets multi-select for blueprints + case studies (currently has NO blueprint select — add it)
- B2 (Variation Proposal): Gets multi-select for blueprints + case studies
- B3 (Custom Proposal): No change
- A2 (Closed Custom): No change

**Submission & Storage:**
- `form_data` JSONB stores full array of selections: `[{type, id, name}]`
- `CreateInquiryData` gets new `selections` array field
- Server action writes to junction table + sets primary `blueprint_id` from first blueprint in array
- If no blueprints selected (only case studies), `blueprint_id` stays null

**Backwards Compat:**
- `inquiries.blueprint_id` stays populated (first blueprint) — ALL existing code keeps working unchanged
- New junction table is additive — existing queries don't break
- Detail page enhanced to show all selections

### Claude's Discretion
- Exact multi-select UI pattern (combobox vs checkbox list vs tag input)
- Animation/transition details for selection
- Exact layout of mixed blueprint + case study preview in sidebar
- Whether to show selection count badge in list views

### Deferred Ideas (OUT OF SCOPE)
- Pricing aggregation across multiple blueprints (combined tier pricing)
- Case study as "proof point" in proposal PDF export
- Analytics dashboard grouping by blueprint combination
- Auto-suggest case studies based on selected blueprints (same blueprint_id link)
</user_constraints>

---

## Summary

Phase 22 converts two existing single-select blueprint `<Select>` dropdowns (in `ClosedBlueprint.tsx` and `VariationProposal.tsx`) and adds a new multi-select to `ClosedCustom.tsx` (A3 path, currently has no blueprint selection). The multi-select must support heterogeneous items — blueprints and case studies in grouped sections — with removable chip tags for selected items.

The codebase already has a fully functional `@base-ui/react` Combobox component at `components/ui/combobox.tsx` that supports multi-select via `ComboboxChips` / `ComboboxChip` / `ComboboxChipsInput`. This is the right primitive. The `CustomProposal.tsx` component demonstrates the existing array-toggle pattern (`watch + toggleArrayValue + setValue`) for multi-select checkboxes. Combining the Combobox chips UI with RHF's `setValue` array pattern is the standard approach in this codebase.

The database work requires one new migration file: `inquiry_selections` junction table with CHECK constraint, RLS policies mirroring the inquiries table, and CASCADE deletes. The `createInquiry()` function and `CreateInquiryData` type need a `selections` field. The `submitInquiry` server action is a thin wrapper; logic goes into `createInquiry()`. Downstream consumers of `blueprint_id` (6+ locations) remain completely unmodified because backwards compat is maintained via the "first blueprint in selections" strategy.

**Primary recommendation:** Build a new `ItemMultiSelect` controlled component backed by RHF `watch/setValue`, using the existing `Combobox + ComboboxChips` from `@base-ui/react`. Fetch both blueprints and case studies in `new/page.tsx` with `Promise.all`, pass as combined props.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | ^1.0.0 | `Combobox` with multi-select chip support | Already in codebase at `components/ui/combobox.tsx` |
| `react-hook-form` | ^7.69.0 | `watch/setValue` for array field state | Used in all 3 form components |
| `zod` | ^4.2.1 | Schema validation for `selections` array | Used in `intakeFormSchema.ts` |
| Supabase JS | project version | Junction table insert in server action | All data mutations use Supabase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | project version | Blueprint/case study icons | Item type discriminator icons in selector |
| `cn` (clsx/tailwind-merge) | project version | Conditional class composition | Selection chip styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ComboboxChips` (base-ui) | Tag-input-style pill list with toggle buttons | Combobox has searchable filter — better UX for 20+ items; pills without search fine for <10 items. Given blueprints could grow, Combobox wins |
| `ComboboxChips` (base-ui) | `toggleArrayValue` button grid (existing pattern in CustomProposal) | Button grid has no search. Use button grid only if total items < 8 and labels are short |
| New package | Custom multi-select | Avoid — @base-ui Combobox is already the project standard and covers this use case |

**No new packages required.** Everything needed is already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. New files fit into existing feature structure:

```
features/inquiries/
├── components/
│   ├── steps/
│   │   ├── ClosedBlueprint.tsx          ← modify: replace Select with ItemMultiSelect
│   │   ├── VariationProposal.tsx        ← modify: replace Select with ItemMultiSelect
│   │   └── ClosedCustom.tsx             ← modify: add ItemMultiSelect (currently none)
│   ├── BlueprintDetailsSidebar.tsx      ← modify: handle null when no blueprint
│   └── ItemMultiSelect.tsx              ← new: shared multi-select component
├── schemas/
│   └── intakeFormSchema.ts              ← modify: add selections[] to A1, A3, B2 schemas
├── types.ts                             ← modify: add selections to CreateInquiryData
└── actions/
    └── submitInquiry.ts                 ← no change (thin wrapper)

lib/api/
└── inquiries.ts                         ← modify: createInquiry() writes to junction table

app/(dashboard)/inquiries/
├── new/page.tsx                         ← modify: fetch case studies alongside blueprints
└── [id]/page.tsx                        ← modify: display all selections

supabase/migrations/
└── YYYYMMDD_inquiry_selections.sql      ← new: junction table migration
```

### Pattern 1: RHF Array State for Multi-Select

**What:** Use `watch` to read the current array, `setValue` to replace it. Exactly matches `departments_involved` / `support_level` in `CustomProposal.tsx`.

**When to use:** Any multi-select field backed by react-hook-form.

**Example (from actual codebase, `CustomProposal.tsx` lines 183-192):**
```typescript
// Source: features/inquiries/components/steps/CustomProposal.tsx
const departmentsInvolved = watch('departments_involved') || []

const toggleArrayValue = (field: string, value: string, currentValues: string[]) => {
  if (currentValues.includes(value)) {
    setValue(field, currentValues.filter((v) => v !== value))
  } else {
    setValue(field, [...currentValues, value])
  }
}
```

For the `selections` field, the equivalent approach with an object array:
```typescript
// Typed version for heterogeneous selections
type SelectionItem = { type: 'blueprint' | 'case_study'; id: string; name: string }

const selections: SelectionItem[] = watch('selections') || []

const toggleSelection = (item: SelectionItem) => {
  const exists = selections.some(s => s.type === item.type && s.id === item.id)
  if (exists) {
    setValue('selections', selections.filter(s => !(s.type === item.type && s.id === item.id)))
  } else {
    setValue('selections', [...selections, item])
    // Clear tier fields if changing away from a blueprint
  }
}
```

### Pattern 2: Combobox Chips for Searchable Multi-Select

**What:** Use the existing `Combobox` from `@base-ui/react` with `ComboboxChips` as the trigger anchor. Provides a search-filterable dropdown with selected items as removable chips.

**When to use:** When item list has 10+ items and users need search. For blueprints (potentially many), this is better than button grid.

**Key API from `components/ui/combobox.tsx`:**
```typescript
// Combobox supports multiple selection natively
<Combobox multiple value={selectedIds} onValueChange={handleChange}>
  <ComboboxChips> {/* Anchor + chip display */}
    {selectedItems.map(item => (
      <ComboboxChip key={item.id}>{item.name}</ComboboxChip>
    ))}
    <ComboboxChipsInput placeholder="Search blueprints & case studies..." />
  </ComboboxChips>
  <ComboboxContent anchor={anchorRef}>
    <ComboboxList>
      <ComboboxGroup>
        <ComboboxLabel>Blueprints</ComboboxLabel>
        {blueprints.map(bp => (
          <ComboboxItem key={bp.id} value={bp.id}>
            {bp.icon && <span>{bp.icon}</span>}
            {bp.name}
            <span className="text-muted-foreground text-xs">
              ({bp.pricing_tiers.length} tiers)
            </span>
          </ComboboxItem>
        ))}
      </ComboboxGroup>
      <ComboboxSeparator />
      <ComboboxGroup>
        <ComboboxLabel>Case Studies</ComboboxLabel>
        {caseStudies.map(cs => (
          <ComboboxItem key={cs.id} value={cs.id}>
            {cs.icon && <span>{cs.icon}</span>}
            {cs.name}
            {cs.client_name && (
              <span className="text-muted-foreground text-xs">{cs.client_name}</span>
            )}
          </ComboboxItem>
        ))}
      </ComboboxGroup>
    </ComboboxList>
  </ComboboxContent>
</Combobox>
```

**IMPORTANT:** The `@base-ui/react` Combobox `value` prop works with simple string IDs. Since blueprints and case studies share UUID-based IDs that could theoretically collide, prefix IDs (e.g., `bp:${id}` and `cs:${id}`) and parse on selection change to reconstruct the full `SelectionItem` object.

### Pattern 3: BlueprintDetailsSidebar — Focus-Based Preview

**What:** Sidebar currently receives `blueprint: BlueprintSummary | null` and renders tier selection or an empty state. For multi-select, it shows details for the "focused" item (first blueprint, or whichever the user last clicked in the chip list).

**When to use:** Sidebar already handles `null` (shows placeholder). No API change needed — pass `focusedBlueprint` derived from selections.

**Current signature (unchanged):**
```typescript
// Source: features/inquiries/components/BlueprintDetailsSidebar.tsx
interface BlueprintDetailsSidebarProps {
  blueprint: BlueprintSummary | null
  selectedTier: string | null
  onSelectTier: (tierName: string, tier: PricingTier) => void
  className?: string
}
```

Case studies need a NEW `CaseStudyPreviewSidebar` component (simple, no tier pricing) OR the existing sidebar could be extended with a union `item` prop. Simpler to keep them separate and conditionally render.

### Pattern 4: Junction Table Insert with Primary FK Backfill

**What:** After inserting to `inquiry_selections`, derive `blueprint_id` from the first blueprint in selections and update `inquiries` row.

**When to use:** This phase's submission logic.

```typescript
// In createInquiry() after insert:
if (data.selections && data.selections.length > 0) {
  // Write junction rows
  const junctionRows = data.selections.map((sel, index) => ({
    inquiry_id: inquiry.id,
    item_type: sel.type,
    blueprint_id: sel.type === 'blueprint' ? sel.id : null,
    case_study_id: sel.type === 'case_study' ? sel.id : null,
    sort_order: index,
  }))
  await supabase.from('inquiry_selections').insert(junctionRows)

  // Backfill primary blueprint_id for backwards compat
  const firstBlueprint = data.selections.find(s => s.type === 'blueprint')
  if (firstBlueprint) {
    await supabase
      .from('inquiries')
      .update({ blueprint_id: firstBlueprint.id })
      .eq('id', inquiry.id)
  }
}
```

### Pattern 5: Zod Array Validation

**What:** `closedBlueprintSchema` and `variationProposalSchema` currently require `blueprint_id: z.string().min(1, ...)`. Replace with a `selections` array that requires at least one item.

**Current pattern (zod v4 is installed):**
```typescript
// Current (to remove):
blueprint_id: z.string().min(1, 'Blueprint selection is required'),

// Replacement:
selections: z.array(z.object({
  type: z.enum(['blueprint', 'case_study']),
  id: z.string().uuid(),
  name: z.string(),
})).min(1, 'Select at least one blueprint or case study'),
```

**For A3 (ClosedCustom currently has no blueprint select):** Add `selections` field to `closedCustomSchema` when `isVariation=true`. Since the schema is shared for A2 and A3, either split them or make `selections` optional and validate conditionally.

### Anti-Patterns to Avoid
- **Do not change `inquiries.blueprint_id` semantics:** It must remain `null` when no blueprints selected, and `=` first blueprint when any blueprint selected. Never aggregate/remove.
- **Do not split A2/A3 into separate Zod schemas needlessly:** A3 gets multi-select, A2 does not. The cleanest path is adding `selections` as optional to `closedCustomSchema` (A2 simply won't pass it).
- **Do not use `register()` for the selections array:** `register()` is for native input elements. Array objects must use `setValue/watch`.
- **Do not refetch case studies on the client:** Pass from server as props (same as blueprints). The `new/page.tsx` server component currently only calls `getBlueprints()`; add `getCaseStudies()` in `Promise.all`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select with chips | Custom dropdown + chip component | `ComboboxChips` from `components/ui/combobox.tsx` | Already in codebase, handles keyboard navigation, ARIA, search filtering |
| Array toggle logic | Custom state machine | `watch + setValue + filter/spread` (existing pattern from CustomProposal.tsx) | Dead simple, no abstraction needed |
| ID namespacing for mixed types | Separate value maps | Prefix strings: `'bp:uuid'` and `'cs:uuid'` | One-liner encode/decode avoids collision without complex data structures |
| RLS for junction table | Per-row ownership checks | Mirror inquiries RLS using `submitted_by` join | Same pattern as existing tables; admin/internal see all, DFY see own |

**Key insight:** The @base-ui Combobox already handles grouped sections via `ComboboxGroup` + `ComboboxLabel`. No need for any custom dropdown — just configure it.

---

## Common Pitfalls

### Pitfall 1: Tier Selection State on Blueprint Change
**What goes wrong:** When user selects multiple blueprints, the tier selection (`selected_tier_name`, `selected_tier_price`, etc.) in the form becomes ambiguous — which blueprint's tier was selected?
**Why it happens:** Current form stores a single tier selection. With multi-select, the sidebar shows only one blueprint at a time.
**How to avoid:** Keep tier selection tied to the "focused" blueprint ID. Store as `selected_tier_blueprint_id` alongside `selected_tier_name`. When a blueprint is removed from selections, clear the tier only if it belonged to that blueprint.
**Warning signs:** Tier data carries over when user removes the blueprint it was for.

### Pitfall 2: Combobox Value Type Collision
**What goes wrong:** Blueprint ID `abc-123` and case study ID `abc-123` (extremely unlikely but UUID space overlap is zero in practice). The real risk is that the `@base-ui` Combobox `value` array contains plain strings — mixing blueprint and case study IDs means you can't tell which type a given ID belongs to from the value array alone.
**Why it happens:** Combobox `value` is `string[]`. Without prefixing, `onValueChange` gives back IDs with no type context.
**How to avoid:** Prefix IDs: `bp:${blueprintId}` for blueprints, `cs:${caseStudyId}` for case studies. Parse in the `onValueChange` handler.
**Warning signs:** Type confusion in `onValueChange` callback.

### Pitfall 3: A3 Form Path Gets No Blueprint_id When No Blueprint Selected
**What goes wrong:** A3 currently goes through `ClosedCustom.tsx` which has no blueprint select at all. The `closedCustomSchema` has no `blueprint_id` or `selections`. After this phase, A3 needs selections but A2 does not.
**Why it happens:** A2 and A3 share `closedCustomSchema` and the same `ClosedCustom` component (distinguished by `isVariation` prop).
**How to avoid:** Add `selections` field (optional, default `[]`) to `closedCustomSchema` and only show the multi-select in `ClosedCustom` when `isVariation=true`. A2 still works because it simply never sets selections.
**Warning signs:** A2 submissions accidentally including empty selections array in form_data.

### Pitfall 4: Form Submission with Empty Selections Passing Validation
**What goes wrong:** If `blueprint_id` validation is removed from Zod schema without adding `selections.min(1)`, A1/A3/B2 forms can be submitted with zero selections.
**Why it happens:** The `canProceed` function in `IntakeForm.tsx` only checks `prospect_company_name` for `path_form` step. Zod schema validation is the real guard.
**How to avoid:** Ensure `selections: z.array(...).min(1, '...')` is in the schema for A1, A3 (when variation), and B2.
**Warning signs:** Submit button not disabled; empty inquiry submitted.

### Pitfall 5: Realtime Hook Missing Junction Data
**What goes wrong:** `use-inquiries-realtime.ts` normalizes inquiries from a Supabase realtime push. The SELECT query in `refetch()` joins `blueprint:blueprints(name)` but won't join `inquiry_selections`. The list view still shows `inquiry.blueprint.name` but won't show all selections.
**Why it happens:** Realtime SELECT is hardcoded. Junction table data requires a separate join or sub-select.
**How to avoid:** For the list view, `blueprint.name` from the primary FK is sufficient (backwards compat). Phase decision is to show a count badge optionally — this can be a separate query or added to the SELECT. Don't try to join `inquiry_selections` in realtime; it adds complexity. The detail page (server-rendered) can do a separate query.
**Warning signs:** List view showing wrong or missing blueprint info after a new inquiry is submitted.

### Pitfall 6: blueprint_id Not Set During createInquiry()
**What goes wrong:** `createInquiry()` currently accepts `blueprint_id` at the top level of `CreateInquiryData`. After this phase, `blueprint_id` comes from `selections`. If the insert happens before selections are processed, `blueprint_id` remains null even when blueprints were selected.
**Why it happens:** Two-step logic: insert inquiry, then process selections.
**How to avoid:** Derive `blueprint_id` from `data.selections` BEFORE inserting the inquiry row, so it's set in the initial INSERT.
**Warning signs:** Inquiries showing no blueprint despite user selecting one.

---

## Code Examples

### Junction Table Migration

```sql
-- Source: pattern from supabase/migrations/20260210000002_retainer_system_tables.sql
CREATE TABLE IF NOT EXISTS inquiry_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('blueprint', 'case_study')),
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE CASCADE,
  case_study_id UUID REFERENCES case_studies(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Exactly one of blueprint_id or case_study_id must be non-null
  CONSTRAINT inquiry_selections_item_type_check CHECK (
    (item_type = 'blueprint' AND blueprint_id IS NOT NULL AND case_study_id IS NULL) OR
    (item_type = 'case_study' AND case_study_id IS NOT NULL AND blueprint_id IS NULL)
  )
);

CREATE INDEX idx_inquiry_selections_inquiry_id ON inquiry_selections(inquiry_id);
CREATE INDEX idx_inquiry_selections_blueprint_id ON inquiry_selections(blueprint_id);
CREATE INDEX idx_inquiry_selections_case_study_id ON inquiry_selections(case_study_id);

ALTER TABLE inquiry_selections ENABLE ROW LEVEL SECURITY;

-- DFY see own (via inquiry ownership)
CREATE POLICY "inquiry_selections_dfy_select_own" ON inquiry_selections
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_selections.inquiry_id
      AND inquiries.submitted_by = auth.uid()
    )
  );

-- DFY insert (via own inquiry)
CREATE POLICY "inquiry_selections_dfy_insert" ON inquiry_selections
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dfy'
    AND EXISTS (
      SELECT 1 FROM inquiries
      WHERE inquiries.id = inquiry_selections.inquiry_id
      AND inquiries.submitted_by = auth.uid()
    )
  );

-- Admin/Internal full access
CREATE POLICY "inquiry_selections_admin_all" ON inquiry_selections
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
  );
```

### Updated CreateInquiryData Type

```typescript
// Source: features/inquiries/types.ts (existing, to modify)
export interface SelectionItem {
  type: 'blueprint' | 'case_study'
  id: string
  name: string
}

export interface CreateInquiryData {
  partner_name: string
  submission_type: 'closed' | 'proposal'
  deal_type: 'blueprint' | 'custom' | 'variation'
  form_path: 'A1' | 'A2' | 'A3' | 'B2' | 'B3'
  prospect_company_name?: string
  prospect_website?: string
  industry?: string
  blueprint_id?: string          // KEEP — set from first blueprint in selections
  selections?: SelectionItem[]   // NEW — the full multi-select array
  form_data: Record<string, unknown>
  forward_emails?: string[]
}
```

### Updated createInquiry() Logic

```typescript
// Source: lib/api/inquiries.ts (existing createInquiry, to extend)
export async function createInquiry(data: CreateInquiryData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Derive primary blueprint_id from selections for backwards compat
  const primaryBlueprintId = data.blueprint_id ||
    data.selections?.find(s => s.type === 'blueprint')?.id ||
    null

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .insert({
      submitted_by: user?.id,
      partner_name: data.partner_name,
      submission_type: data.submission_type,
      deal_type: data.deal_type,
      form_path: data.form_path,
      prospect_company_name: data.prospect_company_name,
      prospect_website: data.prospect_website,
      industry: data.industry,
      blueprint_id: primaryBlueprintId,  // from first blueprint in selections
      form_data: data.form_data,
      forward_emails: data.forward_emails || [],
    })
    .select()
    .single()

  if (error) throw error

  // Write junction table rows (additive, non-breaking)
  if (data.selections && data.selections.length > 0) {
    const junctionRows = data.selections.map((sel, index) => ({
      inquiry_id: inquiry.id,
      item_type: sel.type,
      blueprint_id: sel.type === 'blueprint' ? sel.id : null,
      case_study_id: sel.type === 'case_study' ? sel.id : null,
      sort_order: index,
    }))
    const { error: selError } = await supabase
      .from('inquiry_selections')
      .insert(junctionRows)
    if (selError) {
      console.error('[createInquiry] Failed to write selections:', selError)
      // Non-fatal: inquiry still created, don't throw
    }
  }

  // ... existing notification logic unchanged ...
  return inquiry
}
```

### Updated new/page.tsx Data Fetching

```typescript
// Source: app/(dashboard)/inquiries/new/page.tsx (to modify)
// Add getCaseStudies import and parallel fetch
import { getCaseStudies } from '@/lib/api/case-studies'
import type { CaseStudy } from '@/lib/api/case-studies'

export default async function NewInquiryPage() {
  await requireRole(['admin', 'internal', 'dfy'])
  const profile = await getProfile()

  let blueprints: Awaited<ReturnType<typeof getBlueprints>> = []
  let caseStudies: CaseStudy[] = []

  try {
    // Parallel fetch — no waterfall (React Performance skill: Promise.all pattern)
    const [b, cs] = await Promise.all([
      getBlueprints(),           // published only (default)
      getCaseStudies(),          // published only (default)
    ])
    blueprints = b
    caseStudies = cs
  } catch (error) {
    console.error('Failed to fetch form data:', error)
  }

  return (
    <div className="py-4">
      <IntakeForm blueprints={blueprints} caseStudies={caseStudies} partnerName={partnerName} />
    </div>
  )
}
```

### Zod Schema Update (A1 example)

```typescript
// Source: features/inquiries/schemas/intakeFormSchema.ts (to modify)
const selectionItemSchema = z.object({
  type: z.enum(['blueprint', 'case_study']),
  id: z.string().uuid(),
  name: z.string(),
})

// Path A1: was blueprint_id required, now selections required
export const closedBlueprintSchema = z.object({
  prospect_company_name: z.string().min(1, 'Company name is required'),
  prospect_website: z.string().min(1, 'Website is required'),
  industry: z.string().min(1, 'Industry is required'),
  // REMOVED: blueprint_id: z.string().min(1, ...)
  selections: z.array(selectionItemSchema).min(1, 'Select at least one blueprint or case study'),
  monthly_volume: z.string().min(1, 'Monthly volume is required'),
  current_tools: z.string().min(1, 'Current tools is required'),
  existing_crm: z.string().min(1, 'CRM information is required'),
  primary_goal: z.string().min(1, 'Primary goal is required'),
  additional_notes: z.string().min(1, 'Additional notes are required'),
})
```

### ItemMultiSelect Component Signature

```typescript
// New: features/inquiries/components/ItemMultiSelect.tsx
interface SelectionItem {
  type: 'blueprint' | 'case_study'
  id: string
  name: string
  // Blueprint-specific
  icon?: string | null
  tierCount?: number
  // Case study-specific
  clientName?: string | null
}

interface ItemMultiSelectProps {
  blueprints: BlueprintSummary[]
  caseStudies: CaseStudy[]          // from lib/api/case-studies
  value: SelectionItem[]            // controlled from RHF watch()
  onChange: (items: SelectionItem[]) => void  // calls RHF setValue()
  placeholder?: string
}
```

---

## Exact Code Locations and Impact Map

### Files to MODIFY

| File | What Changes |
|------|-------------|
| `features/inquiries/components/steps/ClosedBlueprint.tsx` | Lines 90-121: replace `<Select>` with `<ItemMultiSelect>`; update `selectedBlueprintId = selections[0]?.id` for sidebar |
| `features/inquiries/components/steps/VariationProposal.tsx` | Lines 93-125: identical change to ClosedBlueprint |
| `features/inquiries/components/steps/ClosedCustom.tsx` | When `isVariation=true`: add `<ItemMultiSelect>` before other fields (currently no blueprint select here at all) |
| `features/inquiries/components/BlueprintDetailsSidebar.tsx` | No signature change; but callers now compute `focusedBlueprint` from `selections.find(s => s.type==='blueprint')` |
| `features/inquiries/components/IntakeForm.tsx` | Add `caseStudies: CaseStudy[]` prop; pass to `ClosedBlueprint`, `VariationProposal`, `ClosedCustom` |
| `features/inquiries/schemas/intakeFormSchema.ts` | Replace `blueprint_id: z.string()...` with `selections: z.array(...)...min(1)` in `closedBlueprintSchema`, `variationProposalSchema`; add optional `selections` to `closedCustomSchema` |
| `features/inquiries/types.ts` | Add `SelectionItem` interface; add `selections?: SelectionItem[]` to `CreateInquiryData` |
| `features/inquiries/constants/fieldMappings.ts` | Add `'selections'` to FIELD_LISTS for A1, A3, B2 paths |
| `lib/api/inquiries.ts` | `createInquiry()`: derive `primaryBlueprintId` from selections; insert junction rows |
| `app/(dashboard)/inquiries/new/page.tsx` | Add `getCaseStudies()` in `Promise.all`; pass `caseStudies` to `IntakeForm` |
| `app/(dashboard)/inquiries/[id]/page.tsx` | Add query for `inquiry_selections` JOIN; display in Overview tab "Prospect Information" card |

### Files UNCHANGED (verified)

| File | Why Unchanged |
|------|--------------|
| `features/inquiries/actions/submitInquiry.ts` | Thin wrapper, no logic — unchanged |
| `hooks/use-inquiries-realtime.ts` | Uses `inquiry.blueprint` (primary FK join) — unchanged; list view unaffected |
| `lib/api/proposal-reminders.ts` | Uses `blueprint:blueprints(name)` join on primary FK — unchanged |
| `lib/api/proposal-deliverables.ts` | `bulkCreateFromBlueprintTier` takes explicit `blueprintId` arg — unchanged |
| `features/project-initiation/actions/initiationActions.ts` | Line 111: `matched_blueprint_id: inquiry.blueprint_id` — unchanged, gets primary blueprint from FK |
| `lib/api/inquiries.ts` (getInquiry/getInquiries) | SELECT queries join `blueprint:blueprints(name)` — unchanged |
| `features/inquiries/components/steps/CustomProposal.tsx` (B3) | No blueprint select, no change |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Radix-UI `Select` for single-select | Already using it; this phase replaces it with @base-ui Combobox | Phase 22 | Combobox supports multi-select + search |
| No junction table | New `inquiry_selections` table | Phase 22 | Enables M:M blueprints+case studies per inquiry |
| `blueprint_id` as sole reference | `blueprint_id` as primary/backwards-compat FK + junction table | Phase 22 | Both old and new code work |

**Note:** The codebase uses `radix-ui` for most primitives but `@base-ui/react` specifically for `Combobox`. Both are in `package.json`. The Combobox component at `components/ui/combobox.tsx` is already fully built and exported — do not rebuild.

---

## Open Questions

1. **Focused item for sidebar preview when multiple blueprints selected**
   - What we know: Sidebar shows one blueprint at a time; CONTEXT.md says "first selected blueprint or whichever is focused"
   - What's unclear: Does "focused" mean hover over chip, or last selected? Claude's discretion on exact interaction.
   - Recommendation: Default to first blueprint in selections array; no hover-tracking complexity needed for v1.

2. **CaseStudyPreviewSidebar — new component or extend BlueprintDetailsSidebar?**
   - What we know: Case studies show `name, description, client_name, industry, challenge summary` — no tier pricing
   - What's unclear: Whether to extend the existing sidebar with union type or create a separate component
   - Recommendation: Create a separate `CaseStudyPreviewSidebar.tsx` (simpler, avoids type union complexity). Display conditionally based on first-selected item type.

3. **Detail page ([id]/page.tsx) — how to display all selections**
   - What we know: The page already shows `inquiry.blueprint.name` in "Prospect Information" card
   - What's unclear: Exact UI for showing N items (list vs badges)
   - Recommendation: Query `inquiry_selections` with blueprint/case_study name joins; display as a list below the primary blueprint field, or replace it with the full list. Claude's discretion.

4. **A3 path form_path change**
   - What we know: A3 currently maps to `ClosedCustom` in IntakeForm; `deal_type` = 'variation'
   - What's unclear: CONTEXT.md says A3 "currently has no blueprint select — add it". The A3 schema (`closedCustomSchema`) is shared with A2. Making `selections` optional-but-shown-only-for-variation is clean.
   - Recommendation: Add `selections?: SelectionItem[]` to `closedCustomSchema`. Show the multi-select in `ClosedCustom` only when `isVariation=true`.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skip this section.

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: All files listed in CONTEXT.md were read verbatim; code examples quoted from actual file content
- `features/inquiries/components/steps/ClosedBlueprint.tsx` — exact blueprint Select implementation
- `features/inquiries/components/steps/VariationProposal.tsx` — identical blueprint Select pattern
- `features/inquiries/components/steps/ClosedCustom.tsx` — confirmed NO blueprint select exists
- `features/inquiries/components/steps/CustomProposal.tsx` — confirmed `toggleArrayValue` pattern for array multi-select
- `features/inquiries/components/BlueprintDetailsSidebar.tsx` — exact prop interface
- `features/inquiries/components/IntakeForm.tsx` — form orchestration, submission, canProceed logic
- `features/inquiries/schemas/intakeFormSchema.ts` — exact Zod schemas for A1, A3, B2
- `features/inquiries/types.ts` — `CreateInquiryData` interface
- `features/inquiries/constants/fieldMappings.ts` — FIELD_LISTS per path
- `lib/api/inquiries.ts` — `createInquiry()` full implementation; all SELECT query joins
- `lib/api/case-studies.ts` — `getCaseStudies()` signature (accepts `status`, `tags`, `search` options; defaults to `published` only)
- `lib/api/blueprints.ts` — `BlueprintSummary` type
- `lib/api/proposal-deliverables.ts` — `bulkCreateFromBlueprintTier` takes explicit blueprintId
- `lib/api/proposal-reminders.ts` — confirms `blueprint:blueprints(name)` join on primary FK
- `features/project-initiation/actions/initiationActions.ts` — line 111 `matched_blueprint_id: inquiry.blueprint_id`
- `hooks/use-inquiries-realtime.ts` — normalizes `blueprint` from primary FK join; SELECT query confirmed
- `app/(dashboard)/inquiries/new/page.tsx` — currently only `getBlueprints()`, not `Promise.all`
- `app/(dashboard)/inquiries/[id]/page.tsx` — blueprint display at line 686-690; filter at line 708
- `components/ui/combobox.tsx` — full `@base-ui/react` Combobox wrapper including `ComboboxChips`, `ComboboxGroup`, `ComboboxLabel`
- `supabase/migrations/20241221000005_inquiries_table.sql` — inquiries schema, RLS policies
- `supabase/migrations/20241222000003_case_studies.sql` — case_studies schema, RLS policies
- `.planning/config.json` — `mode: "yolo"`, no `nyquist_validation` key → skip Validation section

### Secondary (MEDIUM confidence)
- `.claude/skills/react-performance/SKILL.md` — Promise.all pattern (Section 1.1) applied to `new/page.tsx` fetch

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed via package.json; component confirmed in codebase
- Architecture: HIGH — all file locations and exact code patterns verified by direct source read
- Pitfalls: HIGH — derived from actual code reading (tier clearing, shared schema, realtime query)
- Downstream impact: HIGH — every consumer listed in CONTEXT.md was checked; none need changes

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable codebase, no fast-moving dependencies)
