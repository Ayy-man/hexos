# Onboarding Stepper Form — Design

> Replaces the current flat onboarding tab with a guided multi-step form experience.

## Problem

The current onboarding tab shows two passive cards (Deliverables Sign-off + Onboarding Requirements) with no visual flow, no guided experience, and no way for the admin to see answer progress. It looks bare and doesn't communicate what the DFY partner should do next.

## Solution

A **vertical stepper form** that guides the DFY partner through onboarding step-by-step, with role-aware content for admins and DFY partners.

---

## Data Model

### New Tables

**`onboarding_categories`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| title | text | e.g. "Brand Info", "Access & Credentials" |
| description | text | nullable, helper text shown below title |
| position | int | sort order |
| created_at | timestamptz | |

**`onboarding_questions`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| project_id | uuid | FK → projects |
| category_id | uuid | FK → onboarding_categories |
| title | text | the question text |
| description | text | nullable, helper text |
| question_type | text | `text` · `textarea` · `select` · `multi_select` · `boolean` |
| options | jsonb | array of strings for select/multi_select, null otherwise |
| is_required | boolean | default false |
| position | int | sort order within category |
| created_at | timestamptz | |

**`onboarding_answers`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| question_id | uuid | FK → onboarding_questions |
| project_id | uuid | FK → projects |
| answered_by | uuid | FK → profiles |
| value | jsonb | string, boolean, or string[] depending on question_type |
| answered_at | timestamptz | |
| updated_at | timestamptz | |

### Modified Tables

**`onboarding_requirements`** — add column:

| Column | Type | Notes |
|--------|------|-------|
| category_id | uuid | nullable FK → onboarding_categories. null = uncategorized |

---

## Stepper Structure

Uses [Stepperize](https://stepperize.vercel.app/) for headless stepper state + navigation. UI rendered with existing shadcn components.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  Onboarding Progress                        14/20 ✓  │
│  ████████████████████░░░░░░░  70%                    │
├────────────────┬─────────────────────────────────────┤
│                │                                     │
│  ✓ Sign-off    │   [Active step content]             │
│  ● Brand Info  │                                     │
│  ○ Access      │   Question fields, requirement      │
│  ○ Content     │   items, rendered as a form.         │
│  ○ Review      │                                     │
│                │          [ Save & Continue ]         │
│                │                                     │
├────────────────┴─────────────────────────────────────┤
```

- **Left rail**: Step list with status icons (✓ complete, ● current, ○ upcoming). Shows completion fraction per step (e.g. "3/5"). Clickable — free navigation between steps.
- **Main area**: Active step's form content.
- **Progress header**: Overall completion bar.

### Steps

1. **Deliverables Sign-off** (always first)
   - DFY view: deliverables list + "Confirm on Behalf of Client" CTA
   - Admin view: deliverables list + sign-off status + "Send for Sign-off" / waiting state
   - Reuses existing sign-off actions, just restyled inside stepper

2. **Category steps** (one per admin-defined category, dynamic)
   - Renders questions by type → shadcn form fields
   - Renders requirements as completable items with status + attachment upload
   - "Save & Continue" at bottom — validates required fields, saves, advances

3. **Review & Complete** (always last)
   - Summary of all answers + requirement statuses
   - Incomplete items highlighted
   - "Mark Onboarding Complete" CTA

---

## Role-Aware Behavior

### DFY Partner (filling out)

- Sees the stepper as a form to fill out
- Can freely navigate between steps
- Partial saves on "Save & Continue" or step navigation
- Required field validation on step completion attempt
- Can upload attachments on requirements

### Admin (building + monitoring)

**Setup mode** (before DFY starts):
- Can add/edit/reorder categories via the left rail
- Within each category: "Add Question" or "Add Requirement" buttons
- Question type picker (text, textarea, select, multi_select, boolean)
- Options editor for select types
- Required toggle per question
- Drag to reorder items within a category
- Requirements use existing creation flow

**Progress mode** (once DFY starts filling out):
- Left rail shows completion rings per step (not just checkmarks)
- Clicking a category shows DFY's answers inline (read-only)
- Unanswered items visually flagged
- Top-level progress summary: "14/20 items completed" with per-category breakdown
- Can still add/edit form structure — new items appear as unanswered

---

## Question Field Rendering

| question_type | Rendered as | value stored |
|---------------|-------------|--------------|
| `text` | `<Input>` | `"string"` |
| `textarea` | `<Textarea>` | `"string"` |
| `select` | `<Select>` with options | `"selected option"` |
| `multi_select` | `<CheckboxGroup>` with options | `["opt1", "opt2"]` |
| `boolean` | `<Switch>` | `true` / `false` |

All fields wrapped in react-hook-form `<FormField>` with zod validation (required check when `is_required` is true).

---

## Component Breakdown

### New Components

| Component | Purpose |
|-----------|---------|
| `OnboardingStepper` | Main container — stepperize provider, left rail + content area |
| `StepperRail` | Vertical step list with completion indicators, click to navigate |
| `CategoryForm` | Renders one category's questions + requirements as a react-hook-form form |
| `QuestionField` | Renders a single question by type (delegates to shadcn Input/Textarea/Select/Switch/Checkbox) |
| `RequirementFormItem` | Renders a requirement within the form (status toggle, attachment, blocker badge) |
| `CategoryEditor` | Admin: add/edit/reorder items within a category |
| `OnboardingProgressHeader` | Progress bar + completion stats |
| `ReviewStep` | Final summary step |

### Modified Components

| Component | Change |
|-----------|--------|
| `OnboardingTab` | Replace contents with `OnboardingStepper` |

### No New Dependencies

- **Stepperize** — only new package (headless stepper state, zero deps)
- Everything else uses existing: shadcn Form/Input/Textarea/Select/Switch/Checkbox, react-hook-form, zod, framer-motion

---

## API Layer

### New Files

**`lib/api/onboarding-categories.ts`**
- `getOnboardingCategories(projectId)` — fetch all categories ordered by position
- `createOnboardingCategory(input)` — create category
- `updateOnboardingCategory(id, input)` — update title/description
- `deleteOnboardingCategory(id)` — delete category (cascade questions)
- `reorderOnboardingCategories(updates)` — batch reorder

**`lib/api/onboarding-questions.ts`**
- `getOnboardingQuestions(projectId)` — fetch all questions with answers
- `getOnboardingQuestionsByCategory(categoryId)` — fetch questions for one category
- `createOnboardingQuestion(input)` — create question
- `updateOnboardingQuestion(id, input)` — update question
- `deleteOnboardingQuestion(id)` — delete question + answer
- `reorderOnboardingQuestions(updates)` — batch reorder within category

**`lib/api/onboarding-answers.ts`**
- `getOnboardingAnswers(projectId)` — fetch all answers for a project
- `upsertOnboardingAnswer(input)` — create or update an answer (upsert on question_id + project_id)
- `bulkUpsertOnboardingAnswers(inputs)` — save entire step's answers at once

### Modified Files

**`lib/api/onboarding-requirements.ts`**
- Add `category_id` to create/update inputs
- Add `getRequirementsByCategory(categoryId)` query

### Server Actions

**`features/projects/actions/onboardingFormActions.ts`**
- `saveCategoryAnswersAction(projectId, categoryId, answers[])` — saves all answers for a step
- `addCategoryAction(projectId, title)` — admin adds category
- `addQuestionAction(projectId, categoryId, data)` — admin adds question
- `updateQuestionAction(questionId, data)` — admin edits question
- `deleteCategoryAction(categoryId)` — admin removes category
- `deleteQuestionAction(questionId)` — admin removes question
- `reorderCategoryItemsAction(categoryId, updates)` — admin reorders

---

## Progress Calculation

```ts
function getOnboardingProgress(categories, questions, answers, requirements) {
  const totalItems = questions.length + requirements.length
  const answeredQuestions = questions.filter(q =>
    answers.some(a => a.question_id === q.id && a.value !== null)
  ).length
  const completedRequirements = requirements.filter(r =>
    r.status === 'approved'
  ).length
  const completedItems = answeredQuestions + completedRequirements

  return {
    total: totalItems,
    completed: completedItems,
    percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    byCategory: categories.map(cat => ({
      categoryId: cat.id,
      title: cat.title,
      total: /* questions + requirements in this category */,
      completed: /* answered + approved in this category */,
    }))
  }
}
```

---

## Migration

### Supabase Migration

1. Create `onboarding_categories` table
2. Create `onboarding_questions` table
3. Create `onboarding_answers` table
4. Add `category_id` column to `onboarding_requirements` (nullable, no breaking change)
5. RLS policies: project members can read all, DFY can write answers, admin can write categories/questions/requirements

### Backwards Compatibility

- Existing `onboarding_requirements` without a `category_id` render in an "Uncategorized" section
- Existing deliverables sign-off flow is unchanged, just moved into step 1 of the stepper
- No data migration needed — new tables start empty, admin populates per project
