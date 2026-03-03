# Phase 24: Remove Onboarding Form, Replace with Doc and Task — Research

**Researched:** 2026-03-04
**Domain:** File deletion, component surgery, server action modification, document/requirement auto-creation
**Confidence:** HIGH — all findings based on direct codebase inspection

---

## Summary

Phase 24 is a deletion-heavy refactor. It removes the onboarding form system (~19 files across components, hooks, actions, and API), strips the data-fetching waterfall it added to the project page server component, simplifies the onboarding tab UI to only the two surviving cards (Deliverables + Requirements), and adds a one-time auto-creation side effect in `completeInitiationAction` to produce an "Onboarding Questionnaire" document and a linked requirement row.

The phase has no external library dependencies — everything needed already exists in the codebase. `createProjectDocument` and `createOnboardingRequirement` are already implemented in `lib/api/`. The initiation action is already the right hook point. The main risks are import cleanup in `ProjectPageClient.tsx`, `ProjectTabs.tsx`, and the server component — missing a reference will cause a TypeScript error at build time.

**Primary recommendation:** Work in three sequential waves: (1) delete all ~19 files, (2) surgically strip imports/props/state from the three surviving files, (3) add the doc+requirement auto-creation block to `completeInitiationAction`. Do not modify the DB schema, the `onboarding_requirements` API, or any tab outside Onboarding.

---

## Standard Stack

### Core — already present, no installation needed

| Library | Purpose | Notes |
|---------|---------|-------|
| `lib/api/project-documents.ts` | `createProjectDocument(input)` | Creates a `project_documents` row; returns typed `ProjectDocument` |
| `lib/api/onboarding-requirements.ts` | `createOnboardingRequirement(input)` | Creates a single `onboarding_requirements` row |
| `features/project-initiation/actions/initiationActions.ts` | `completeInitiationAction` | The server action called when a project is initiated; already imports `bulkCreateOnboardingRequirements` |
| `lib/utils/projectPhases.ts` | `isOnboardingPhase()` | Keep; still used for tab visibility |

No new packages required.

---

## Architecture Patterns

### What the onboarding form system looks like today

```
app/(dashboard)/projects/[id]/page.tsx
  ↓ fetches: getOnboardingCategories, getOnboardingQuestions, getOnboardingAnswers
  ↓ passes: categories, questions, answers props
features/projects/components/ProjectPageClient.tsx
  ↓ receives: categories?, questions?, answers?
  ↓ passes: categories, questions, answers
features/projects/components/ProjectTabs.tsx
  ↓ receives: categories?, questions?, answers?
  ↓ logic: showQuestionsTab = !showOnboardingTab && (categories?.length ?? 0) > 0
  ↓ renders: <OnboardingBentoGrid categories=… questions=… answers=… />

features/projects/components/tabs/onboarding/
  OnboardingBentoGrid.tsx       ← orchestrator, DELETE
  CategoryBentoCard.tsx         ← DELETE
  OnboardingProgressSummary.tsx ← DELETE
  BentoCard.tsx                 ← KEEP (used by DeliverablesBentoCard + RequirementsBentoCard)
  DeliverablesBentoCard.tsx     ← KEEP
  RequirementsBentoCard.tsx     ← KEEP
  admin/
    CategoryEditor.tsx          ← DELETE
    QuestionEditor.tsx          ← DELETE
    InlineQuestionRow.tsx       ← DELETE
    PreviewToggle.tsx           ← DELETE
  form/
    CategoryForm.tsx            ← DELETE
    QuestionField.tsx           ← DELETE
    AutoSaveStatus.tsx          ← DELETE
  hooks/
    use-onboarding-progress.ts  ← DELETE
    use-onboarding-sheet.ts     ← KEEP (used by BentoCard.tsx which we keep)
    use-category-autosave.ts    ← DELETE
  sheets/
    CategorySheet.tsx           ← DELETE
    DeliverablesSheet.tsx       ← KEEP
    RequirementsSheet.tsx       ← KEEP
```

**File count to delete: 19 files**
- `features/projects/actions/onboardingFormActions.ts`
- `lib/api/onboarding-categories.ts`
- `lib/api/onboarding-questions.ts`
- `lib/api/onboarding-answers.ts`
- `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx`
- `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx`
- `features/projects/components/tabs/onboarding/OnboardingProgressSummary.tsx`
- `features/projects/components/tabs/onboarding/admin/CategoryEditor.tsx`
- `features/projects/components/tabs/onboarding/admin/QuestionEditor.tsx`
- `features/projects/components/tabs/onboarding/admin/InlineQuestionRow.tsx`
- `features/projects/components/tabs/onboarding/admin/PreviewToggle.tsx`
- `features/projects/components/tabs/onboarding/form/CategoryForm.tsx`
- `features/projects/components/tabs/onboarding/form/QuestionField.tsx`
- `features/projects/components/tabs/onboarding/form/AutoSaveStatus.tsx`
- `features/projects/components/tabs/onboarding/hooks/use-onboarding-progress.ts`
- `features/projects/components/tabs/onboarding/hooks/use-category-autosave.ts`
- `features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx`

Note: `features/projects/components/tabs/OnboardingTab.tsx` is a **separate legacy file** in `tabs/` (not `tabs/onboarding/`) that contains the OLD deliverables + requirements view. It is currently not rendered in `ProjectTabs.tsx` — the `OnboardingBentoGrid` is rendered directly instead. This file should also be deleted to avoid confusion.

### Files to MODIFY (surgical cuts only)

**1. `app/(dashboard)/projects/[id]/page.tsx`**

Remove three imports and three Promise.all entries:
```typescript
// DELETE these imports:
import { getOnboardingCategories } from '@/lib/api/onboarding-categories'
import { getOnboardingQuestions } from '@/lib/api/onboarding-questions'
import { getOnboardingAnswers } from '@/lib/api/onboarding-answers'

// BEFORE — Promise.all with 7 items:
const [availableDevs, pendingScopeChanges, delaySummary, testingInfoMap, categories, questions, answers] = await Promise.all([
  ...
  getOnboardingCategories(id).catch(() => []),
  getOnboardingQuestions(id).catch(() => []),
  getOnboardingAnswers(id).catch(() => []),
])

// AFTER — Promise.all with 4 items:
const [availableDevs, pendingScopeChanges, delaySummary, testingInfoMap] = await Promise.all([
  profile.role === 'admin' ? getAvailableDevs() : Promise.resolve([]),
  getPendingScopeChangesCount(id).catch(() => 0),
  getDelaySummary(id).catch(() => ...),
  getProjectTestingInfo(id).catch(() => new Map()),
])

// Also remove from <ProjectPageClient> JSX:
// categories={categories}
// questions={questions}
// answers={answers}
```

**2. `features/projects/components/ProjectPageClient.tsx`**

Remove type imports and prop definitions:
```typescript
// DELETE these imports:
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

// DELETE from ProjectPageClientProps interface:
categories?: OnboardingCategory[]
questions?: OnboardingQuestion[]
answers?: OnboardingAnswer[]

// DELETE from destructured params and ProjectTabs JSX props:
categories, questions, answers
```

**3. `features/projects/components/ProjectTabs.tsx`**

This is the most complex surgery:
```typescript
// DELETE these imports:
import { OnboardingBentoGrid } from './tabs/onboarding/OnboardingBentoGrid'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

// DELETE from ProjectTabsProps:
categories?: OnboardingCategory[]
questions?: OnboardingQuestion[]
answers?: OnboardingAnswer[]

// DELETE showQuestionsTab logic:
const showQuestionsTab = !showOnboardingTab && (categories?.length ?? 0) > 0

// DELETE "Questions" tab trigger (showQuestionsTab branch)
// DELETE onboarding TabsContent block that renders OnboardingBentoGrid
// KEEP the onboarding tab trigger (showOnboardingTab branch)
// REPLACE TabsContent body with simple two-card layout:
```

New onboarding tab content should render `DeliverablesBentoCard` and `RequirementsBentoCard` directly (removing categories/questions/answers dependency):
```tsx
{showOnboardingTab && (
  <TabsContent value="onboarding" className="mt-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DeliverablesBentoCard
        project={project}
        progress={...}   // compute inline from project.deliverables
        userRole={userRole}
        isAdmin={isAdmin}
        isDfy={isDfy}
      />
      <RequirementsBentoCard
        requirements={project.requirements || []}
        progress={...}   // compute inline from project.requirements
        projectId={project.id}
        isAdmin={isAdmin}
      />
    </div>
    {/* Hint: Onboarding Questionnaire is in the Files tab */}
    <p className="text-sm text-muted-foreground mt-4">
      The Onboarding Questionnaire document is available in the Files tab.
    </p>
  </TabsContent>
)}
```

The progress objects for these cards are simple computations:
```typescript
// deliverablesProgress
const deliverables = project.deliverables || []
const deliverablesProgress = {
  total: deliverables.length,
  completed: deliverables.filter(d => d.status === 'done').length,
}

// requirementsProgress
const requirements = project.requirements || []
const requirementsProgress = {
  total: requirements.length,
  completed: requirements.filter(r => r.status === 'approved').length,
  blockerCount: requirements.filter(r => r.blocker_type === 'absolute' && r.status !== 'approved').length,
}
```

**4. `features/project-initiation/actions/initiationActions.ts`**

Add two side-effects after the existing requirements creation block (Step 4). The project's `id` is available as `project.id`:

```typescript
// After Step 4 (requirements creation) — add Step 5a and 5b:

// 5a. Auto-create the Onboarding Questionnaire document
const { data: questDoc, error: questDocError } = await supabase
  .from('project_documents')
  .insert({
    project_id: project.id,
    title: 'Onboarding Questionnaire',
    slug: 'onboarding-questionnaire',
    content: null,
    position: 0,
    visibility: 'client',
    created_by: user.id,
  })
  .select()
  .single()

if (questDocError) {
  console.error('[completeInitiation] Failed to create questionnaire doc:', questDocError)
  // Non-fatal — project creation succeeded, log and continue
} else {
  // 5b. Add an onboarding_requirement linking to the doc
  const docUrl = `/projects/${project.id}?tab=files`
  await supabase
    .from('onboarding_requirements')
    .insert({
      project_id: project.id,
      title: 'Complete the Onboarding Questionnaire',
      description: 'Fill out the Onboarding Questionnaire document in the Files tab.',
      owner_type: 'dfy',
      blocker_type: 'none',
      status: 'pending',
      resource_url: docUrl,
      position: 0,
    })
}
```

**Important note on `resource_url`:** The `OnboardingRequirement` type includes `resource_url: string | null` and `RequirementsTab.tsx` already renders a clickable link for requirements with a `resource_url`. The new requirement can use the Files tab URL as the resource link. The exact URL format `?tab=files` vs `?section=files` needs verification against how tabs are addressed in the URL — looking at `use-onboarding-sheet.ts` which uses `?section=`, the ProjectTabs component uses a `value` prop but not URL state. So the link should just direct users to the Files tab conceptually via plain text or use a `/projects/${id}` link.

**BETTER APPROACH for resource_url:** Since there is no URL-based tab routing (tabs are controlled by local state in `ProjectTabs.tsx`), the resource_url cannot deep-link to a tab. Instead, leave `resource_url` as `null` and put the instruction in the `description` field. Or link to the full project page and let users find Files tab manually.

### Pattern: `createProjectDocument` API signature

```typescript
// lib/api/project-documents.ts
export interface CreateDocumentInput {
  project_id: string
  title: string
  slug: string
  content?: unknown        // Plate.js JSON; null/undefined = blank doc
  position?: number
  visibility?: DocumentVisibility  // 'internal' | 'client'
}

export async function createProjectDocument(input: CreateDocumentInput): Promise<ProjectDocument>
```

The function creates the record and sets `created_by` from the authenticated session. In `initiationActions.ts` the supabase client is already authenticated as the admin who ran the initiation, so no extra auth setup needed. The `content` field can be `null` or omitted — the Plate.js editor handles blank documents fine.

**Visibility decision:** The questionnaire doc should be `'client'` so DFY partners can see and fill it in the Files tab.

### Pattern: `createOnboardingRequirement` API signature

```typescript
// lib/api/onboarding-requirements.ts
export interface CreateOnboardingRequirementInput {
  project_id: string
  parent_id?: string | null
  title: string
  description?: string
  notes?: string
  owner_type?: RequirementOwner      // 'hexona' | 'dfy' | 'client'
  blocker_type?: RequirementBlocker  // 'none' | 'partial' | 'absolute'
  loom_url?: string
  resource_url?: string
  position?: number
  category_id?: string | null
}
```

`owner_type: 'dfy'` signals that the DFY partner owns completion. `blocker_type: 'none'` keeps it as a soft requirement (won't block progression). The function uses `createClient()` internally, but in `initiationActions.ts` we already have a `supabase` client — we should call the `onboarding_requirements` insert directly (as the existing requirements creation does via `bulkCreateOnboardingRequirements`) rather than calling `createOnboardingRequirement()` which creates its own client. This keeps all DB calls on one authenticated session.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Document creation | Custom Supabase insert | `createProjectDocument()` from `lib/api/project-documents.ts` |
| Requirement creation | Separate supabase client call | Direct insert via existing `supabase` client (same pattern as existing requirements in initiationActions) |
| Progress computation | Custom hook | Inline JS from `project.deliverables` and `project.requirements` (both already on the project object) |
| Slug generation | Custom slugify | `'onboarding-questionnaire'` is a fixed literal — no dynamic generation needed |

---

## Common Pitfalls

### Pitfall 1: Missing import removal causes TypeScript errors
**What goes wrong:** Delete a file but forget to remove its import in `ProjectTabs.tsx` or `ProjectPageClient.tsx` — TypeScript fails at build time.
**Prevention:** After deletions, run `pnpm tsc --noEmit` to catch dangling references.
**Warning signs:** Build errors referencing deleted module paths.

### Pitfall 2: `showQuestionsTab` logic left behind
**What goes wrong:** The `showQuestionsTab` branch in `ProjectTabs.tsx` references `categories?.length` which no longer exists as a prop — TypeScript error, or if silently optional, the tab shows a broken state.
**Prevention:** Delete both the `showQuestionsTab` variable AND the `{showQuestionsTab && (...))}` JSX block.

### Pitfall 3: `OnboardingTab.tsx` left as a zombie file
**What goes wrong:** `features/projects/components/tabs/OnboardingTab.tsx` (the OLD tab, not the bento grid) is never imported in the current codebase but exists. If left, it will still import from deleted modules (`onboardingFormActions`) and cause TypeScript errors on other files referencing the module graph.
**Actually, verify this:** `OnboardingTab.tsx` at line 34 imports `confirmDeliverablesAction, sendForSignoffAction, signOffDeliverablesAction` from `projectActions` — these survive. It does NOT import from any onboarding-form modules. So it could be kept or deleted; it is currently unused. Safe to delete for cleanliness.

### Pitfall 4: `initiationActions.ts` uses `createClient` (not admin client) — RLS applies
**What goes wrong:** Calling `createProjectDocument()` which internally calls `createClient()` creates a separate auth session context inside the function that may not see the same user. In `initiationActions.ts`, the supabase instance was created by `await createClient()` and `user` was extracted from it. The direct `supabase.from('project_documents').insert(...)` approach keeps all calls on the same client session — same RLS context.
**Prevention:** Do the document insert directly via the existing `supabase` variable in `initiationActions`, not by calling `createProjectDocument()` which creates a new client internally.

### Pitfall 5: Document `slug` collision if initiation is re-run
**What goes wrong:** The duplicate-project guard at the top of `completeInitiationAction` prevents duplicate projects, but the slug `'onboarding-questionnaire'` is per-project (scoped by `project_id`), so there is no uniqueness constraint collision. The guard already returns early if a project exists.
**Prevention:** Nothing extra needed — the early-return guard covers this.

### Pitfall 6: `markOnboardingCompleteAction` still references deleted question tables
**What goes wrong:** `onboardingFormActions.ts` is being deleted entirely. The "Mark Complete" button in `OnboardingBentoGrid.tsx` called this action — but the whole file is deleted. No survivors reference it.
**Prevention:** Verify no surviving file imports from `onboardingFormActions.ts`. Confirmed: only `OnboardingBentoGrid.tsx` (deleted) imported from it.

### Pitfall 7: `use-onboarding-sheet.ts` is used by `BentoCard.tsx` (which survives)
**What goes wrong:** Deleting `use-onboarding-sheet.ts` while keeping `BentoCard.tsx` would break the surviving deliverables and requirements cards.
**Prevention:** KEEP `use-onboarding-sheet.ts`. Only delete `use-onboarding-progress.ts` and `use-category-autosave.ts`.

---

## Code Examples

### Correct import removals in `ProjectPageClient.tsx`

```typescript
// BEFORE (lines 18-20):
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

// AFTER: delete all three lines

// BEFORE interface:
interface ProjectPageClientProps {
  ...
  categories?: OnboardingCategory[]
  questions?: OnboardingQuestion[]
  answers?: OnboardingAnswer[]
}

// AFTER interface: delete those three optional props
```

### Correct import removals in `ProjectTabs.tsx`

```typescript
// BEFORE (lines 18-19, 37-39):
import { OnboardingBentoGrid } from './tabs/onboarding/OnboardingBentoGrid'
import type { OnboardingCategory } from '@/lib/api/onboarding-categories'
import type { OnboardingQuestion } from '@/lib/api/onboarding-questions'
import type { OnboardingAnswer } from '@/lib/api/onboarding-answers'

// AFTER: delete the OnboardingBentoGrid import and the three type imports
// NOTE: Keep the surviving imports:
// import { DeliverablesBentoCard } — this needs to be ADDED (currently imported inside OnboardingBentoGrid)
// import { RequirementsBentoCard } — same, needs to be added at ProjectTabs level
```

**Critical discovery:** `DeliverablesBentoCard` and `RequirementsBentoCard` are currently imported inside `OnboardingBentoGrid.tsx`. After deleting that file, `ProjectTabs.tsx` needs to import them directly:

```typescript
import { DeliverablesBentoCard } from './tabs/onboarding/DeliverablesBentoCard'
import { RequirementsBentoCard } from './tabs/onboarding/RequirementsBentoCard'
```

### Questionnaire document + requirement creation in `initiationActions.ts`

Add after the existing requirements creation block (currently ends at line ~282):

```typescript
// 5a. Auto-create Onboarding Questionnaire document (client-visible)
try {
  const { data: questDoc } = await supabase
    .from('project_documents')
    .insert({
      project_id: project.id,
      title: 'Onboarding Questionnaire',
      slug: 'onboarding-questionnaire',
      content: null,
      position: 0,
      visibility: 'client',
      created_by: user.id,
    })
    .select('id')
    .single()

  // 5b. Add onboarding_requirement that links to the doc
  if (questDoc) {
    await supabase
      .from('onboarding_requirements')
      .insert({
        project_id: project.id,
        title: 'Complete the Onboarding Questionnaire',
        description: 'Fill in the Onboarding Questionnaire document available in the Files tab.',
        owner_type: 'dfy',
        blocker_type: 'none',
        status: 'pending',
        position: 0,
        resource_url: null,
      })
  }
} catch (e) {
  console.error('[completeInitiation] Questionnaire doc/req creation failed:', e)
  // Non-fatal — project creation already succeeded
}
```

---

## Detailed File Impact Inventory

### Files Confirmed to DELETE (19 files)

| File | Reason |
|------|--------|
| `features/projects/actions/onboardingFormActions.ts` | All exported actions become unused |
| `lib/api/onboarding-categories.ts` | Only imported by deleted files |
| `lib/api/onboarding-questions.ts` | Only imported by deleted files |
| `lib/api/onboarding-answers.ts` | Only imported by deleted files |
| `features/projects/components/tabs/onboarding/OnboardingBentoGrid.tsx` | Replaced by simpler layout |
| `features/projects/components/tabs/onboarding/CategoryBentoCard.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/OnboardingProgressSummary.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/admin/CategoryEditor.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/admin/QuestionEditor.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/admin/InlineQuestionRow.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/admin/PreviewToggle.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/form/CategoryForm.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/form/QuestionField.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/form/AutoSaveStatus.tsx` | No longer needed |
| `features/projects/components/tabs/onboarding/hooks/use-onboarding-progress.ts` | No longer needed |
| `features/projects/components/tabs/onboarding/hooks/use-category-autosave.ts` | No longer needed |
| `features/projects/components/tabs/onboarding/sheets/CategorySheet.tsx` | No longer needed |
| `features/projects/components/tabs/OnboardingTab.tsx` | Legacy file, unused, for cleanliness |

Plus consider deleting the now-empty `admin/` and `form/` directories (git rm handles this automatically).

### Files Confirmed to KEEP (from onboarding directory)

| File | Reason |
|------|--------|
| `features/projects/components/tabs/onboarding/BentoCard.tsx` | Used by DeliverablesBentoCard + RequirementsBentoCard |
| `features/projects/components/tabs/onboarding/DeliverablesBentoCard.tsx` | Keep — deliverables sign-off |
| `features/projects/components/tabs/onboarding/RequirementsBentoCard.tsx` | Keep — requirements |
| `features/projects/components/tabs/onboarding/hooks/use-onboarding-sheet.ts` | Used by BentoCard |
| `features/projects/components/tabs/onboarding/sheets/DeliverablesSheet.tsx` | Keep — sign-off sheet |
| `features/projects/components/tabs/onboarding/sheets/RequirementsSheet.tsx` | Keep — requirements sheet |

### Files to MODIFY (4 files)

| File | Changes |
|------|---------|
| `app/(dashboard)/projects/[id]/page.tsx` | Remove 3 API imports, remove 3 Promise.all entries, remove 3 JSX props |
| `features/projects/components/ProjectPageClient.tsx` | Remove 3 type imports, remove 3 prop definitions, remove 3 destructured params, remove 3 JSX props passed to ProjectTabs |
| `features/projects/components/ProjectTabs.tsx` | Remove 4 imports (OnboardingBentoGrid + 3 types), remove 3 props from interface, remove showQuestionsTab logic, remove Questions tab trigger, remove OnboardingBentoGrid TabsContent, add DeliverablesBentoCard+RequirementsBentoCard imports, replace TabsContent body |
| `features/project-initiation/actions/initiationActions.ts` | Add doc + requirement auto-creation after step 4 |

---

## Open Questions

1. **`resource_url` for the questionnaire requirement**
   - What we know: `OnboardingRequirement.resource_url` renders as a link in `RequirementsTab.tsx`. There is no URL-based tab routing in ProjectTabs (tabs use local state, not URL params).
   - What's unclear: Should `resource_url` point to the project page root, or left null with text in `description`?
   - Recommendation: Leave `resource_url: null` and put the guidance in `description`: "Fill in the Onboarding Questionnaire document in the Files tab." This is safe and honest.

2. **Initial Plate.js content for the questionnaire doc**
   - What we know: `content: null` is valid — `createProjectDocument` accepts `content?: unknown` and the Plate editor handles blank documents. No seed content exists in the codebase for any auto-created document.
   - Recommendation: Use `content: null`. Admin can add questions directly in the document editor.

3. **Does the new requirement appear in the `RequirementsBentoCard` on the onboarding tab?**
   - What we know: `RequirementsBentoCard` receives `requirements={project.requirements || []}`. The `project.requirements` comes from `getProject(id)` which fetches onboarding_requirements via the project's relations query.
   - Need to verify: Does `getProject()` include `onboarding_requirements` in its select? If not, the new auto-created requirement won't appear on the onboarding tab without adding it to the project query.

4. **`getProject()` relations — does it fetch requirements?**
   - What we know: `ProjectWithRelations` type includes `requirements?: OnboardingRequirement[]` and `ProjectStatusControl` maps it. The project page server component does NOT separately fetch requirements — they come embedded in the project object.
   - Need to verify: Check `lib/api/projects.ts` for the `getProject` select statement to confirm `onboarding_requirements` is included.

---

## Validation Architecture

No automated tests exist in this project (no test config, no test directory found). Nyquist validation is not configured (`config.json` has no `workflow.nyquist_validation` key — defaults to disabled). Skip this section.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all 19 files to delete
- Direct codebase inspection of all 4 files to modify
- `lib/api/project-documents.ts` — `createProjectDocument` signature and behavior
- `lib/api/onboarding-requirements.ts` — `createOnboardingRequirement` signature
- `features/project-initiation/actions/initiationActions.ts` — insertion point and existing pattern
- `.planning/phases/24-remove-onboarding-form-replace-with-doc-and-task/.continue-here.md` — prior session findings
- `features/projects/components/ProjectTabs.tsx` — full component read confirming all import chains

---

## Metadata

**Confidence breakdown:**
- File inventory (what to delete): HIGH — files inspected directly, imports traced
- Modification surgery (what to cut from surviving files): HIGH — all touched files read in full
- Auto-creation insertion (new initiationActions code): HIGH — API signatures verified, insertion point confirmed
- `getProject` requirements inclusion: MEDIUM — needs verification in `lib/api/projects.ts` (not read yet)

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable codebase, no external dependencies)
