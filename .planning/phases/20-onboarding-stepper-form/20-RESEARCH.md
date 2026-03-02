# Phase 20: Onboarding Bento Grid + Expandable Sheets - Research

**Researched:** 2026-03-03
**Domain:** Bento grid dashboard, expandable sheet UX, auto-save forms, Supabase schema extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bento Grid Layout:**
- Onboarding tab becomes a bento-style grid of minimal cards
- Cards are preview-only — title, status badge, completion fraction, structured micro-summary. No actions on the grid itself.
- Card micro-summaries by type:
  - Question categories: "6 questions — 2 answered, 1 required remaining" with a thin progress bar
  - Deliverables: tree preview with completion count
  - Requirements: blocker count shown prominently, completion fraction
- Grid is responsive: 2 columns on desktop (larger card left, stacked smaller cards right as in mockup), single column on mobile
- Fixed cards: Deliverables card, Requirements/Onboarding card
- Dynamic cards: one per admin-defined question category
- Visual priority signals on cards: completed=muted/dimmed; required incomplete=left-border accent in `--signal-warn`; neutral=default
- "Last edited" timestamp on each card
- Grid overflow: max 6-8 visible cards, incomplete first, collapsible "Show N more" section

**Expandable Sheet (Click-to-Expand):**
- Clicking any bento card opens a sheet covering ~90% viewport
- MUST use `ResponsiveDialog` (`components/ui/responsive-dialog.tsx`) — do NOT build custom
- URL state for open sheets: `?section=brand-info` query param; Next.js `useSearchParams` + `router.push` with shallow routing
- Focus management: Radix Dialog/Sheet owns lifecycle (trapping, Escape, outside-click); framer-motion for enter/exit animations within Radix primitive
- Sheet close → back to bento grid; progress updates reflected immediately on card

**Responsive Behavior:**
- Mobile: compact list with progress indicators; opens bottom sheet via ResponsiveDialog's `side="bottom"`, `max-h-[90vh]`, `pb-safe`
- Keyboard interaction: test textarea focus inside bottom sheets; use `visualViewport` API to adjust sheet height when virtual keyboard opens

**Form Save Behavior:**
- Auto-save on blur (debounced) — each field persists on move to next field. No explicit save button.
- Additional onChange debounce at 2-3 seconds of typing inactivity as second layer
- Save-on-sheet-close safety net: explicit save-all-dirty-fields call when sheet dismissed, using react-hook-form `dirtyFields`
- Unsaved changes guard: "You have unsaved changes" confirmation dialog if sheet closed with dirty fields and no confirmed save
- Subtle inline "Saving..." / "Saved" status near top of sheet. Non-fading. `aria-live="polite"` region.
- Save error handling: persistent (non-fading) inline error with retry button. `aria-live="assertive"`. Do NOT swallow errors silently.
- Explicit actions (sign-off, mark complete, delete) use `toast` from sonner

**Validation & Completion Flow:**
- No red errors while filling out — low-friction experience
- Gentle completion hints on bento cards: "2 required questions remaining" in muted foreground
- On "Mark Onboarding Complete": re-validate against server state; grid visually flags cards with issues; opening a flagged card auto-scrolls to first incomplete required field
- If new required questions appeared since last sheet load, show: "2 new questions were added to [Category]. Please review them before completing."

**Onboarding Completion:**
- Explicit "Mark Onboarding Complete" action on the grid view (not inside a sheet)
- Visible when all required items are answered
- DFY must explicitly signal they're done; admin gets a clear completion signal

**Post-Submit Behavior:**
- Form remains editable after DFY marks onboarding complete
- Changes tracked in a change log, hidden from DFY (admin can see)
- Admin does NOT need to unlock — DFY always has edit access

**Admin Form Builder UX:**
- Inline add inside expanded category sheet: "+ Add Question" at bottom → new row with type picker and title field. No modal. Empty title on blur → row disappears silently.
- Reordering: drag-and-drop primary (using existing `sortable.tsx`), up/down arrow buttons as accessible fallback. Both for questions within a category and categories on grid.
- "Preview as DFY" toggle at top of grid — global toggle, persists across sheet opens. Preview mode: read-only form with banner "Preview mode — answers here are not saved".
- Add category: "+ Add Category" button on grid adds new bento card, edit title inline.
- Category management: kebab menu (three-dot icon) on each category card header with "Rename" and "Delete" options.
- Admin can edit form structure even after DFY has started filling out.

**Question Types:**
- `text` → shadcn `<Input>`
- `textarea` → shadcn `<Textarea>`
- `select` → shadcn `<Select>` with admin-defined options
- `multi_select` → `<fieldset>` + `<legend>` wrapping shadcn checkbox group
- `boolean` → shadcn `<Switch>`
- Each question: title, optional description, question_type, options (for select/multi_select), is_required toggle
- Label/input association: question `title` → `<Label htmlFor={questionId}>`; description → `<p id={questionId-desc}>` with `aria-describedby`

**Admin Progress Monitoring:**
- Admin sees same bento grid with completion rings/progress bars on each card
- Expanding a category card shows DFY answers inline (read-only)
- Unanswered/incomplete items visually flagged
- Top-level progress summary above grid: "14/20 items completed" with overall percentage

**Empty & Edge States:**
- No categories: DFY sees deliverables card + "Your team is setting up the onboarding form. You'll be notified when it's ready."
- Admin adds category/question mid-flight: bundled notification (hourly). DFY won't see new questions in open sheet until re-open — server-side validation on "Mark Complete" catches this.
- Admin deletes category with answers: confirmation dialog warning with explicit confirmation required. Answers soft-deleted.
- Admin deletes category while DFY has sheet open: save fails → inline message "This section was removed by your team. Your changes could not be saved." → sheet closes gracefully.
- Phase transition: one-time banner "Onboarding complete — this tab now serves as your ongoing Q&A channel." Deliverables and Requirements cards collapse/archive.

**Persistent Questions Tab:**
- Tab remains visible and functional in all project phases after onboarding completes
- During onboarding phase: full bento grid with deliverables + requirements + category cards + "Mark Complete"
- After onboarding phase: deliverables/requirements cards archived, just category cards for ongoing Q&A
- Tab label post-onboarding: Claude's discretion ("Questions" or keep "Onboarding")

**Design Tokens & Styling:**
- Use existing design tokens from globals.css — NOT hardcoded Tailwind colors:
  - Complete/approved: `signal-good` / `signal-good-dim`
  - In-progress/pending: `accent` / `accent-dim`
  - Blocked/error: `signal-bad` / `signal-bad-dim`
  - Warning/blocker: `signal-warn` / `signal-warn-dim`
- Status badges pair color with icon — never color alone

**Keyboard & Accessibility:**
- Each bento card: `role="button"` with `tabIndex={0}`, visible focus ring using `--control-ring`
- Tab order follows visual reading order
- Sheet focus managed by Radix Dialog/Sheet (trapping, Escape-to-close)
- On sheet close, focus returns to triggering card
- `aria-live="polite"` for save status, `aria-live="assertive"` for save errors

**Data Model (from design doc — still applies):**
- New tables: `onboarding_categories`, `onboarding_questions`, `onboarding_answers`
- Modified: `onboarding_requirements` gets nullable `category_id` FK
- No Stepperize needed — bento grid doesn't need stepper state management

### Claude's Discretion
- Exact bento grid column/row sizing and card aspect ratios
- Debounce timing for auto-save (200-500ms range) and onChange (2-3s range)
- Exact animation for card-to-sheet transition within ResponsiveDialog
- "Saved" indicator display timing
- Change log storage approach (separate table vs jsonb column)
- Card icon choices per section type
- Mobile list layout specifics
- Tab label post-onboarding ("Questions" vs "Onboarding")

### Deferred Ideas (OUT OF SCOPE)
- Template library for common onboarding forms
- Client-facing view of onboarding progress
- Conditional questions (show question B only if question A answered "yes")

</user_constraints>

---

## Summary

Phase 20 replaces the flat `OnboardingTab` (two static cards) with a bento grid dashboard + expandable sheet pattern. The architecture is well-understood: the existing `ResponsiveDialog`, `Sortable`, `react-hook-form`, and design token system cover the major UI concerns. The primary new complexity is threefold: (1) three new Supabase tables with RLS policies, (2) an auto-save form system with blur/debounce/dirty-field tracking, and (3) URL-based sheet state using `useSearchParams` for deep-linking.

The project already has `useDebouncedCallback` in `hooks/use-debounce.ts`, `@dnd-kit` via `sortable.tsx`, and `react-hook-form` v7 installed. No new npm packages are required. The existing `ResponsiveDialog` already handles the desktop Dialog / mobile bottom Sheet split with `max-h-[90vh]` and `pb-safe`. The sign-off flow in the current `OnboardingTab` is preserved verbatim — it simply moves inside an expandable sheet.

The largest planning risk is the admin form builder inline editing (ephemeral rows, type picker, inline title editing), which has significant optimistic UI work. The auto-save + dirty-fields + save-on-close + unsaved changes guard pattern in the question category sheet is the other area of concentrated complexity.

**Primary recommendation:** Structure the work as: (Wave 0) DB migration + API layer → (Wave 1) Bento grid UI (read-only cards, URL state, ResponsiveDialog wiring) → (Wave 2) Question category sheet with auto-save form → (Wave 3) Admin form builder → (Wave 4) Deliverables + Requirements sheets + completion flow.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.69.0 (installed) | Form state, `dirtyFields`, blur/change handlers | Already in project, handles all form needs |
| zod | 4.2.1 (installed) | Schema validation for question answers and admin inputs | Already in project, used for all forms |
| @hookform/resolvers | 5.2.2 (installed) | Zod resolver bridge for react-hook-form | Already in project |
| @dnd-kit/sortable | 10.0.0 (installed) | Drag-and-drop reordering via existing `Sortable` component | Already in project, `sortable.tsx` wraps it |
| framer-motion | 12.x (installed) | Sheet entrance/exit animations within Radix primitive | Already in project |
| sonner | 2.0.7 (installed) | Toast for explicit actions only (sign-off, delete, mark complete) | Established app pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/navigation `useSearchParams` | Next.js 16 (installed) | URL query param for `?section=...` sheet state | Sheet open/close state persistence |
| `hooks/use-debounce.ts` | local (exists) | `useDebouncedCallback` for auto-save blur and onChange | Auto-save timing control |
| ResponsiveDialog | local (exists at `components/ui/responsive-dialog.tsx`) | Desktop Dialog + Mobile bottom Sheet switching | All expandable sheets |
| Sortable | local (exists at `components/ui/sortable.tsx`) | Drag-and-drop list reordering | Questions within category, categories on grid |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `useDebouncedCallback` | lodash.debounce | `useDebouncedCallback` already exists in project — no extra dependency needed |
| react-hook-form `dirtyFields` | Manual dirty tracking | `dirtyFields` is built into RHF v7, no custom implementation required |
| useSearchParams + router.push | Zustand / Context for sheet state | URL state persists across refresh and browser back; critical for multi-day DFY workflow as decided |

**Installation:**
```bash
# No new packages required — all dependencies already installed
```

---

## Architecture Patterns

### Recommended Project Structure

```
features/projects/components/tabs/
├── OnboardingTab.tsx                        # REPLACE — becomes bento grid container
├── onboarding/                              # NEW — all onboarding sub-components
│   ├── OnboardingBentoGrid.tsx              # Grid layout + "Mark Complete" action
│   ├── BentoCard.tsx                        # Individual card (role="button", URL state trigger)
│   ├── DeliverablesBentoCard.tsx            # Fixed deliverables card variant
│   ├── RequirementsBentoCard.tsx            # Fixed requirements card variant
│   ├── CategoryBentoCard.tsx               # Dynamic question category card variant
│   ├── OnboardingProgressSummary.tsx        # "14/20 items completed" header
│   ├── sheets/
│   │   ├── DeliverablesSheet.tsx            # Deliverables sign-off sheet (lifts existing logic)
│   │   ├── RequirementsSheet.tsx            # Requirements list + status toggles sheet
│   │   └── CategorySheet.tsx               # Question form + category requirements sheet
│   ├── form/
│   │   ├── QuestionField.tsx                # Renders single question by type
│   │   ├── CategoryForm.tsx                 # react-hook-form wrapper for one category
│   │   └── AutoSaveStatus.tsx              # "Saving..." / "Saved" / error inline status
│   ├── admin/
│   │   ├── CategoryEditor.tsx              # Admin inline add/edit questions
│   │   ├── InlineQuestionRow.tsx           # Ephemeral new-question row (disappears on empty blur)
│   │   └── PreviewToggle.tsx              # "Preview as DFY" toggle
│   └── hooks/
│       ├── use-onboarding-sheet.ts         # URL state management for open sheet
│       ├── use-category-autosave.ts        # Auto-save logic (blur + onChange debounce)
│       └── use-onboarding-progress.ts      # Progress calculation across categories

lib/api/
├── onboarding-categories.ts                # NEW — CRUD for onboarding_categories
├── onboarding-questions.ts                 # NEW — CRUD for onboarding_questions
├── onboarding-answers.ts                   # NEW — upsert for onboarding_answers
└── onboarding-requirements.ts              # EXTEND — add category_id support

features/projects/actions/
└── onboardingFormActions.ts                # NEW — all form server actions

supabase/migrations/
└── YYYYMMDD000001_onboarding_form_tables.sql  # NEW — 3 new tables + category_id column
```

### Pattern 1: URL-Based Sheet State

**What:** Each bento card pushes `?section={slug}` to the URL on click. A `useEffect` watching `searchParams.get('section')` opens the corresponding `ResponsiveDialog`.

**When to use:** Any sheet that needs to persist across refresh and support browser back navigation.

**Example:**
```typescript
// hooks/use-onboarding-sheet.ts
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

export function useOnboardingSheet() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const activeSection = searchParams.get('section')

  const openSheet = useCallback((slug: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', slug)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const closeSheet = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('section')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  return { activeSection, openSheet, closeSheet }
}
```

**Integration in bento card:**
```typescript
// BentoCard.tsx
function BentoCard({ slug, ...props }: BentoCardProps) {
  const { activeSection, openSheet, closeSheet } = useOnboardingSheet()

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="focus-visible:ring-2 focus-visible:ring-[--control-ring]"
        onClick={() => openSheet(slug)}
        onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? openSheet(slug) : null}
      >
        {/* card content */}
      </div>

      <ResponsiveDialog open={activeSection === slug} onOpenChange={(open) => !open && closeSheet()}>
        <ResponsiveDialogContent className="max-w-3xl max-h-[90vh]">
          {/* sheet content */}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  )
}
```

**IMPORTANT:** The `ResponsiveDialog` wraps `Dialog` on desktop and `Sheet` on mobile. The `ResponsiveDialogContent` already applies `max-h-[90vh] overflow-y-auto rounded-t-xl pb-safe` on mobile. The `className` prop on `ResponsiveDialogContent` is forwarded only on desktop (the mobile `SheetContent` hardcodes its classes). Pass `className` only for desktop sizing — mobile is already handled.

### Pattern 2: Auto-Save with Dirty Field Tracking

**What:** Three-layer save strategy using react-hook-form v7's built-in `formState.dirtyFields`.

**When to use:** The category question sheet — the primary data entry surface.

**Example:**
```typescript
// use-category-autosave.ts
'use client'

import { useCallback, useRef } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useDebouncedCallback } from '@/hooks/use-debounce'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useCategoryAutosave(
  form: UseFormReturn<CategoryFormValues>,
  onSave: (values: Partial<CategoryFormValues>) => Promise<void>,
  onSaveStatusChange: (status: SaveStatus) => void
) {
  const lastSavedRef = useRef<Partial<CategoryFormValues>>({})

  // Layer 1: onChange debounce (2500ms) — handles "user never blurs"
  const debouncedOnChange = useDebouncedCallback(async () => {
    const dirty = form.formState.dirtyFields
    if (Object.keys(dirty).length === 0) return
    await performSave(form.getValues())
  }, 2500)

  // Layer 2: onBlur for each field (called from QuestionField)
  const handleBlur = useCallback(async (fieldName: string) => {
    if (form.formState.dirtyFields[fieldName as keyof CategoryFormValues]) {
      await performSave({ [fieldName]: form.getValues(fieldName as any) })
    }
  }, [form])

  // Layer 3: save-on-close (called before sheet closes)
  const saveOnClose = useCallback(async () => {
    const dirty = form.formState.dirtyFields
    if (Object.keys(dirty).length === 0) return
    await performSave(form.getValues())
  }, [form])

  const performSave = useCallback(async (values: Partial<CategoryFormValues>) => {
    onSaveStatusChange('saving')
    try {
      await onSave(values)
      lastSavedRef.current = { ...lastSavedRef.current, ...values }
      onSaveStatusChange('saved')
    } catch {
      onSaveStatusChange('error')
    }
  }, [onSave, onSaveStatusChange])

  return { debouncedOnChange, handleBlur, saveOnClose, hasDirtyFields: Object.keys(form.formState.dirtyFields).length > 0 }
}
```

### Pattern 3: Bento Grid Layout (Tailwind CSS Grid)

**What:** CSS Grid with responsive column layout. No grid library needed — pure Tailwind CSS v4.

**When to use:** The main OnboardingBentoGrid layout.

**Example:**
```typescript
// OnboardingBentoGrid.tsx — grid layout approach
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Left column: large primary card (e.g., main questionnaire) */}
  <div className="md:row-span-2">
    <CategoryBentoCard category={primaryCategory} />
  </div>
  {/* Right column: stacked smaller fixed cards */}
  <div>
    <DeliverablesBentoCard project={project} />
  </div>
  <div>
    <RequirementsBentoCard requirements={requirements} />
  </div>
  {/* Additional category cards flow into grid naturally */}
  {remainingCategories.map(cat => (
    <CategoryBentoCard key={cat.id} category={cat} />
  ))}
</div>
```

### Pattern 4: Server Action Upsert for Answers

**What:** Supabase upsert with `onConflict` on `(question_id, project_id)` — single operation for create-or-update.

**When to use:** Every auto-save call for DFY answers.

**Example:**
```typescript
// lib/api/onboarding-answers.ts
export async function upsertOnboardingAnswer(input: {
  question_id: string
  project_id: string
  answered_by: string
  value: string | boolean | string[] | null
}): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('onboarding_answers')
    .upsert(
      {
        question_id: input.question_id,
        project_id: input.project_id,
        answered_by: input.answered_by,
        value: input.value,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'question_id,project_id' }
    )

  if (error) throw error
}
```

### Pattern 5: Inline Ephemeral Admin Row

**What:** Admin clicks "+ Add Question" → a transient form row appears. On blur with empty title, the row is removed without saving. On blur with a title, it saves.

**When to use:** Admin question creation inside CategorySheet.

**Example:**
```typescript
// InlineQuestionRow.tsx
function InlineQuestionRow({ onSave, onCancel }: InlineQuestionRowProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<QuestionType>('text')

  const handleTitleBlur = () => {
    if (!title.trim()) {
      onCancel() // row disappears silently
    } else {
      onSave({ title, type })
    }
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <QuestionTypePicker value={type} onChange={setType} />
      <Input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        placeholder="Question title..."
        className="flex-1"
      />
      <Button variant="ghost" size="icon" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Direct Dialog/Sheet usage:** NEVER use `<Dialog>` or `<Sheet>` directly — always use `<ResponsiveDialog>` and its sub-components.
- **Hardcoded Tailwind colors:** NEVER use `text-green-500`, `bg-amber-50`, etc. for status signals — use `var(--signal-good)`, `var(--signal-warn)`, etc. The existing `OnboardingTab.tsx` uses hardcoded Tailwind colors — do NOT copy this pattern.
- **Toast for auto-saves:** NEVER use `toast` from sonner for auto-save status. Only use `toast` for explicit user actions (sign-off, mark complete, delete). Auto-saves use inline status only.
- **Blocking the sheet on dirty check:** NEVER block the sheet from closing on a timer — check `dirtyFields` synchronously on the `onOpenChange` callback and show confirmation dialog if needed.
- **State in URL for everything:** ONLY the section slug goes in the URL. Form values stay in react-hook-form state. Don't put answer values in URL params.
- **Re-fetching categories on every answer save:** Auto-save should update answers in isolation — do not `revalidatePath` in a way that causes full page re-fetch on every keystroke. Use targeted revalidation or client-side state updates.
- **Calling Supabase directly from components:** All DB operations go through `lib/api/` functions called from server actions. Never import `createClient()` in component files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Desktop Dialog / Mobile Sheet switching | Custom responsive modal | `ResponsiveDialog` (already exists) | Already handles `useIsMobile`, `pb-safe`, `max-h-[90vh]` |
| Drag-and-drop reordering | Custom DnD | `Sortable` + `SortableItem` + `SortableItemHandle` (already exists) | Wraps @dnd-kit with pointer and keyboard sensor |
| Debounce callback | Custom `setTimeout` management | `useDebouncedCallback` from `hooks/use-debounce.ts` | Already handles cleanup, ref-stable callback |
| Form dirty state tracking | Manual `changedFields` state | react-hook-form `formState.dirtyFields` | Built-in per-field granular dirty tracking |
| Hold-to-confirm CTAs | Custom pressure button | `ButtonHoldAndRelease` (`components/ui/hold-and-release-button.tsx`) | Already used for sign-off in current OnboardingTab |
| Sign-off server actions | New actions | `confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction` (already exist in `projectActions.ts`) | These are complete and tested |
| Deliverable tree building | New tree builder | `buildDeliverableTree()` lifted from current `OnboardingTab.tsx` | Working implementation exists |

**Key insight:** This phase is primarily wiring existing capabilities into a new layout. The bento grid is CSS Grid. The sheets are ResponsiveDialog. The form is react-hook-form. The drag-and-drop is @dnd-kit via Sortable. Building custom versions of any of these would duplicate tested code.

---

## Common Pitfalls

### Pitfall 1: ResponsiveDialogContent className Only Applies on Desktop

**What goes wrong:** Developer passes `className="max-w-3xl"` expecting it to control mobile sheet width — it has no effect because `SheetContent` hardcodes its own styles in the mobile branch.

**Why it happens:** `ResponsiveDialogContent` conditionally renders either `SheetContent` or `DialogContent`. The `className` prop is passed to `DialogContent` only. The mobile `SheetContent` renders with its own fixed classes.

**How to avoid:** Accept that mobile sheet sizing is controlled by `ResponsiveDialog`'s built-in defaults. Only pass `className` for desktop Dialog sizing (max-width, etc.).

**Warning signs:** Sheet looks full-width on mobile when you expected it narrower — that is correct behavior.

### Pitfall 2: useSearchParams Requires Suspense Boundary in Next.js App Router

**What goes wrong:** Using `useSearchParams()` in a component causes a build error or hydration warning: "useSearchParams() should be wrapped in a suspense boundary."

**Why it happens:** In Next.js App Router, `useSearchParams` is a dynamic hook that opts the component out of static rendering, requiring a Suspense boundary to prevent the entire route from blocking.

**How to avoid:** Wrap the component using `useSearchParams` in `<Suspense fallback={...}>` at the nearest boundary, OR extract the hook into a small child component and suspend there.

```typescript
// Correct pattern:
export function OnboardingTab(props: Props) {
  return (
    <Suspense fallback={<OnboardingTabSkeleton />}>
      <OnboardingTabInner {...props} />
    </Suspense>
  )
}

function OnboardingTabInner(props: Props) {
  const searchParams = useSearchParams() // safe inside Suspense
  // ...
}
```

**Warning signs:** Build console error about `useSearchParams`; page falls back to static rendering.

### Pitfall 3: Auto-Save Causing Stale Closure Over Form Values

**What goes wrong:** Debounced save callback captures the form's `getValues()` result at creation time, not at execution time — saves stale data when debounce fires after values have changed.

**Why it happens:** `useDebouncedCallback` stabilizes the callback reference. If you pass `form.getValues()` result into the callback at creation, it is captured as a closure.

**How to avoid:** Always call `form.getValues()` INSIDE the debounce callback body, not outside. Use `useRef` to hold the form reference if needed.

```typescript
// WRONG:
const values = form.getValues() // captured at render time
const debouncedSave = useDebouncedCallback(() => save(values), 2500)

// CORRECT:
const debouncedSave = useDebouncedCallback(() => {
  const values = form.getValues() // read at execution time
  save(values)
}, 2500)
```

### Pitfall 4: Sheet Focus Not Returning to Bento Card on Close

**What goes wrong:** After closing a sheet, focus is dropped (goes to body) instead of returning to the triggering card, breaking keyboard navigation.

**Why it happens:** Radix Dialog returns focus to the last focused element before the dialog opened. If the card used `onClick` without `role="button"` and proper `tabIndex`, Radix has no element to return focus to.

**How to avoid:** Ensure every bento card has `role="button"` and `tabIndex={0}`. Radix will then correctly return focus to the card that triggered the sheet.

### Pitfall 5: Upsert Conflict Column Mismatch

**What goes wrong:** `supabase.upsert({ onConflict: 'question_id,project_id' })` fails with a Supabase error about the conflict constraint not existing.

**Why it happens:** Supabase upsert with `onConflict` requires a **unique constraint** on those columns in PostgreSQL, not just a conceptual uniqueness. The migration must explicitly create a `UNIQUE(question_id, project_id)` constraint on `onboarding_answers`.

**How to avoid:** Add `CONSTRAINT onboarding_answers_question_project_unique UNIQUE (question_id, project_id)` in the migration SQL.

### Pitfall 6: Category Delete While DFY Sheet Open — No Graceful Degradation

**What goes wrong:** Admin deletes a category. DFY has that category's sheet open. DFY submits an answer save — it fails with FK violation. No user-visible error.

**Why it happens:** The server action throws on the FK error but the client component only shows the generic toast error (or worse, silently fails).

**How to avoid:** In the answer save server action, explicitly catch the FK/not-found error and return `{ success: false, error: 'section_deleted' }`. The CategorySheet checks for this error code and shows the specific inline message: "This section was removed by your team" and triggers sheet close.

### Pitfall 7: Supabase RLS Blocking DFY Answer Writes

**What goes wrong:** DFY saves an answer but gets a 403 / RLS policy violation.

**Why it happens:** The `onboarding_answers` table needs explicit RLS policies. The default is deny-all. DFY must be able to INSERT and UPDATE answers for their own project.

**How to avoid:** RLS policies on `onboarding_answers` must allow:
- SELECT: project members (admin + DFY for same project)
- INSERT/UPDATE: DFY partner for their own project
- DELETE: admin only

Use the project's existing `can_access_project` function to avoid recursive RLS. See `security.md` "RLS Crisis Lessons" — never create functions that query the same table they protect.

---

## Code Examples

Verified patterns from existing project code:

### Server Action Pattern (project convention)
```typescript
// features/projects/actions/onboardingFormActions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertOnboardingAnswer } from '@/lib/api/onboarding-answers'

export async function saveAnswerAction(
  projectId: string,
  questionId: string,
  value: string | boolean | string[] | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    await upsertOnboardingAnswer({
      question_id: questionId,
      project_id: projectId,
      answered_by: user.id,
      value,
    })

    // NOTE: Do NOT revalidatePath here for auto-saves — would cause full re-render
    // Only revalidate on explicit actions (mark complete, delete)
    return { success: true }
  } catch (error) {
    console.error('[saveAnswerAction] FAILED:', error)
    return { success: false, error: 'Failed to save answer' }
  }
}
```

### Bento Card with Visual Priority Signal
```typescript
// CategoryBentoCard.tsx — visual priority via left border accent
function CategoryBentoCard({ category, progress, openSheet }: Props) {
  const hasRequiredIncomplete = progress.requiredRemaining > 0
  const isComplete = progress.completed === progress.total && progress.total > 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openSheet(category.id)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openSheet(category.id)}
      className={cn(
        'border rounded-lg p-4 cursor-pointer transition-opacity',
        'focus-visible:ring-2 focus-visible:ring-[--control-ring] focus-visible:outline-none',
        // Left border accent for required incomplete (signal-warn)
        hasRequiredIncomplete && 'border-l-4 border-l-[--signal-warn]',
        // Muted treatment for completed cards
        isComplete && 'opacity-60'
      )}
    >
      {/* card content */}
    </div>
  )
}
```

### QuestionField Rendering by Type
```typescript
// form/QuestionField.tsx
function QuestionField({ question, control, onBlur }: QuestionFieldProps) {
  const fieldId = `question-${question.id}`
  const descId = `${fieldId}-desc`

  return (
    <FormField
      control={control}
      name={question.id}
      render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor={fieldId}>
            {question.title}
            {question.is_required && <span className="text-[--signal-warn] ml-1">*</span>}
          </FormLabel>
          {question.description && (
            <p id={descId} className="text-sm text-muted-foreground">{question.description}</p>
          )}
          <FormControl>
            {question.question_type === 'text' && (
              <Input
                id={fieldId}
                aria-describedby={question.description ? descId : undefined}
                {...field}
                onBlur={() => { field.onBlur(); onBlur(question.id) }}
              />
            )}
            {question.question_type === 'textarea' && (
              <Textarea
                id={fieldId}
                aria-describedby={question.description ? descId : undefined}
                {...field}
                onBlur={() => { field.onBlur(); onBlur(question.id) }}
              />
            )}
            {question.question_type === 'boolean' && (
              <Switch
                id={fieldId}
                aria-describedby={question.description ? descId : undefined}
                checked={field.value}
                onCheckedChange={(v) => { field.onChange(v); onBlur(question.id) }}
              />
            )}
            {/* select and multi_select follow similar pattern */}
          </FormControl>
        </FormItem>
      )}
    />
  )
}
```

### Migration SQL Pattern (project convention)
```sql
-- supabase/migrations/YYYYMMDD000001_onboarding_form_tables.sql

-- 1. onboarding_categories
CREATE TABLE public.onboarding_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. onboarding_questions
CREATE TABLE public.onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.onboarding_categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  question_type text NOT NULL CHECK (question_type IN ('text','textarea','select','multi_select','boolean')),
  options jsonb,
  is_required boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. onboarding_answers
CREATE TABLE public.onboarding_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.onboarding_questions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  answered_by uuid REFERENCES public.profiles(id),
  value jsonb,
  answered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Required for upsert onConflict:
  CONSTRAINT onboarding_answers_question_project_unique UNIQUE (question_id, project_id)
);

-- 4. Extend onboarding_requirements (backwards compatible, nullable)
ALTER TABLE public.onboarding_requirements
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.onboarding_categories(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.onboarding_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

-- Use can_access_project function (already exists, safe, non-recursive)
-- Admin/internal: full access; dfy: read categories/questions, write answers; others: read-only
```

### Existing Design Tokens Available
```css
/* From app/globals.css — confirmed in codebase */
--signal-good: #7a9e7a;         /* Complete/approved */
--signal-good-dim: rgba(122, 158, 122, 0.14);
--signal-warn: #c4a24a;         /* Warning/blocker */
--signal-warn-dim: rgba(196, 162, 74, 0.14);
--signal-bad: #b86054;          /* Error/blocked */
--signal-bad-dim: rgba(184, 96, 84, 0.14);
--control-ring: rgba(107, 158, 148, 0.18);  /* Focus ring */
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Two flat cards with no interaction model | Bento grid with click-to-expand sheets | Higher visual density; DFY can jump to what they need |
| Manual dirty tracking with custom `useState` | react-hook-form `formState.dirtyFields` | Per-field granularity, no custom implementation |
| Custom debounce with `setTimeout` | `useDebouncedCallback` from existing hook | Stable reference, proper cleanup on unmount |
| Stepper (rejected) | URL-keyed bento + sheets | Works for multi-day workflows; bookmarkable; browser-back closes sheet naturally |

**Deprecated/outdated:**
- Stepperize: was listed in design doc but CONTEXT.md explicitly removes it. Do NOT install or reference Stepperize.
- Hardcoded Tailwind status colors from current `OnboardingTab.tsx` (`bg-green-100`, `bg-blue-100`, etc.): replace with design tokens.

---

## Open Questions

1. **Change log storage approach**
   - What we know: Post-completion edits must be tracked; admin can see the log; DFY cannot.
   - What's unclear: Separate `onboarding_answer_history` table vs jsonb `change_log` column on `onboarding_answers`.
   - Recommendation: Separate `onboarding_answer_history` table with `(answer_id, old_value, new_value, changed_by, changed_at)`. Cleaner querying for admin view. Claude's discretion per CONTEXT.md.

2. **"Last edited" timestamp on bento card**
   - What we know: Each card shows the last time that section was modified.
   - What's unclear: Source of the timestamp — `updated_at` on the category? Max `updated_at` across answers in that category?
   - Recommendation: Query `MAX(updated_at)` across `onboarding_answers` where `question_id` belongs to that category. For deliverables/requirements cards, use the project's most recent deliverable/requirement `updated_at`.

3. **Tab label post-onboarding**
   - What we know: When project moves past onboarding phase, tab label changes. This is Claude's discretion.
   - Recommendation: Use "Questions" post-onboarding to reflect the ongoing Q&A function. Keeps it distinct from the onboarding context.

4. **"Mark Onboarding Complete" server-side re-validation scope**
   - What we know: Must validate against server state, not just local form state, to catch newly added required questions.
   - What's unclear: Should this be a separate API endpoint or a server action that returns validation errors?
   - Recommendation: Server action `markOnboardingCompleteAction(projectId)` that queries current required questions + answers, returns `{ success: false, incompleteCategories: string[] }` if any required answers missing. Client shows toast with specific message and visually flags cards.

5. **Notification trigger for "admin adds question mid-flight"**
   - What we know: Bundled notification (hourly) using the existing notification system.
   - What's unclear: Does the existing notification system support hourly batching?
   - Recommendation: Scope this to: on `INSERT` to `onboarding_questions`, trigger a database trigger (or server action) that creates/updates a notification. Batching can be approximated by checking if a "new questions" notification for this project was already created in the last hour — if yes, update its message; if no, create new. This is a simplification of true hourly batching but prevents spam.

---

## Integration Points (Critical for Planning)

These are the exact existing files that will be modified, not replaced:

1. **`app/(dashboard)/projects/[id]/page.tsx`** — Add `getOnboardingCategories`, `getOnboardingQuestions`, `getOnboardingAnswers` to the `Promise.all`. Pass results to `ProjectPageClient`.

2. **`features/projects/components/ProjectPageClient.tsx`** — Add `categories`, `questions`, `answers` to the `ProjectPageClientProps` interface and thread through to `ProjectTabs`.

3. **`features/projects/components/ProjectTabs.tsx`** — Update `ProjectTabsProps` with new data. Replace `<OnboardingTab />` render with new bento grid component, passing all required data. Tab label conditional logic for post-onboarding.

4. **`features/projects/components/tabs/OnboardingTab.tsx`** — This file gets completely replaced by `OnboardingBentoGrid`. Extract before replacing: `buildDeliverableTree()`, sign-off handler functions, `ButtonHoldAndRelease` usage pattern, `STATUS_COLORS` map (but migrate to design tokens).

5. **`lib/api/onboarding-requirements.ts`** — Add `category_id` to `CreateOnboardingRequirementInput` and `UpdateOnboardingRequirementInput`. Add `getRequirementsByCategory(categoryId)` query function.

6. **`features/projects/actions/projectActions.ts`** — Sign-off actions (`confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction`) stay here, unchanged. No migration needed.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `components/ui/responsive-dialog.tsx`, `components/ui/sortable.tsx`, `hooks/use-debounce.ts`, `features/projects/components/tabs/OnboardingTab.tsx`, `lib/api/onboarding-requirements.ts`, `features/projects/components/ProjectPageClient.tsx`, `features/projects/components/ProjectTabs.tsx`, `app/(dashboard)/projects/[id]/page.tsx`
- `.planning/codebase/CONVENTIONS.md` — naming, file structure, component patterns
- `.planning/codebase/STACK.md` — confirmed library versions
- `app/globals.css` — confirmed design token values
- `docs/plans/2026-03-03-onboarding-stepper-form-design.md` — data model (tables still apply per CONTEXT.md)
- `.planning/phases/20-onboarding-stepper-form/20-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Next.js App Router docs pattern for `useSearchParams` + Suspense boundary — standard Next.js 13+ behavior, confirmed by project's Next.js 16.1.0 version
- Supabase `upsert` with `onConflict` — standard Supabase JS v2 pattern, consistent with `@supabase/supabase-js` 2.89.0

### Tertiary (LOW confidence)
- `visualViewport` API for mobile virtual keyboard handling — widely supported (iOS Safari 13+, Android Chrome 61+), but specific implementation untested in this project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in `package.json` and in use in codebase
- Architecture: HIGH — existing patterns directly observable in codebase
- Pitfalls: HIGH — most sourced from existing code patterns and Supabase/Next.js documented behaviors
- Integration points: HIGH — confirmed by reading actual source files

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable stack, 30-day window)
