# Phase 20: Onboarding Bento Grid + Expandable Sheets - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the flat onboarding tab (two passive cards: deliverables sign-off + requirements) with a **bento grid dashboard** of minimal preview cards. Each card represents a section (deliverables, requirements, question categories). Clicking a card opens an **expandable sheet (~90% viewport)** where the actual work happens — filling out questions, reviewing deliverables, managing requirements.

Admin builds the form by creating categories with mixed question types and requirements. DFY partner sees the bento grid and clicks into each section to fill out at their own pace over multiple days. Admin monitors answer progress from the same grid view.

**Important:** The questions/categories system persists beyond onboarding. Even after onboarding is complete and the project moves to later phases, the tab remains accessible so admin can keep adding questions and DFY can keep answering. It functions as an ongoing Q&A/intake channel, not just a one-time onboarding form.

</domain>

<decisions>
## Implementation Decisions

### Bento Grid Layout
- Onboarding tab becomes a **bento-style grid** of minimal cards
- Cards are **preview-only** — they show title, status badge, completion fraction, and 1-2 preview items. No actions on the grid itself.
- Grid is responsive: 2 columns on desktop (larger card left, stacked smaller cards right as in mockup), single column on mobile
- Fixed cards (always present): **Deliverables** card, **Requirements/Onboarding** card
- Dynamic cards: one per admin-defined **question category** (e.g. "Project Questionnaire", "Brand Info", "Access & Credentials")
- Each card shows: icon, title, status badge (REQUIRED / PENDING / COMPLETE / in-progress fraction), and a brief content preview (1-2 items or first question)

### Expandable Sheet (Click-to-Expand)
- Clicking any bento card opens an **expandable sheet** that covers ~90% of the viewport
- Sheet animates up from the card (framer-motion layout animation or Dialog/Sheet component)
- Inside the sheet: full context and all actions for that section
  - **Deliverables sheet**: full deliverables tree, sign-off flow, status changes
  - **Requirements sheet**: full requirements list, status toggles, attachment upload, blocker management
  - **Question category sheet**: all questions in that category rendered as a form (react-hook-form), plus any requirements assigned to that category
- Close the sheet → back to the bento grid. Progress updates reflected immediately on the card.
- Sheet uses shadcn `<Dialog>` or `<Sheet>` (drawer) at ~90% viewport height/width

### Form Save Behavior
- **Auto-save on blur** (debounced) — each field persists when DFY moves to next field. No explicit save button needed.
- **Subtle inline "Saving..." / "Saved" status** near the top of the sheet, briefly appears on each save then fades. No toasts for saves.
- **Validation fires on mark complete only** — no red errors while filling out. When DFY marks onboarding complete (from a top-level action, not per-sheet), incomplete required fields are highlighted.

### Onboarding Completion
- **Explicit "Mark Onboarding Complete"** action — lives on the grid view (not inside a sheet), visible when all required items are answered
- DFY must explicitly signal they're done. Admin gets a clear completion signal.

### Post-Submit Behavior
- After DFY marks onboarding complete, the form remains **editable** — DFY can go back and change answers
- Changes after completion are **tracked in a change log** but the log is **hidden from DFY** (admin can see it)
- Admin does NOT need to unlock — DFY always has edit access

### Admin Form Builder UX
- Admin sees the same bento grid but with **edit controls**
- **Inline add**: inside an expanded category sheet, click "+ Add Question" at bottom — new row appears inline with type picker and title field. No modal.
- **Up/down arrows** for reordering questions within a category
- **"Preview as DFY" toggle** at the top of the grid — switches admin view to the DFY perspective (read-only form mode). Toggle back to edit mode.
- **Add category**: "+ Add Category" button on the grid adds a new bento card. Edit title inline. Delete via context menu.
- Admin can edit form structure even after DFY has started filling out

### Question Types
- `text` → shadcn `<Input>`
- `textarea` → shadcn `<Textarea>`
- `select` → shadcn `<Select>` with admin-defined options
- `multi_select` → shadcn checkbox group with admin-defined options
- `boolean` → shadcn `<Switch>`
- Each question has: title, optional description (helper text), question_type, options (for select/multi_select), is_required toggle

### Admin Progress Monitoring
- Admin sees same bento grid with **completion rings/progress bars** on each card
- Expanding a category card shows DFY answers inline (read-only)
- Unanswered/incomplete items visually flagged
- Top-level progress summary above the grid: "14/20 items completed" with overall percentage

### Empty & Edge States
- **No categories set up**: DFY sees the deliverables card + a friendly message area: "Your team is setting up the onboarding form. You'll be notified when it's ready."
- **Admin adds category/question mid-flight**: New card appears on grid. DFY gets a **bundled notification** (hourly — if multiple questions added within the same hour, only one "There are new questions in [category]" notification). Not per-question.
- **Admin deletes category with answers**: Confirmation dialog warns "This category has X answers from the DFY partner. Deleting will remove their responses." Requires explicit confirmation. Answers soft-deleted (recoverable in DB).

### Persistent Questions Tab
- The questions/categories system is **not onboarding-only** — the tab remains visible and functional in all project phases, even after onboarding is marked complete
- Admin can keep adding questions at any time throughout the project lifecycle
- DFY can keep answering new questions as they appear
- During onboarding phase: full bento grid with deliverables card + requirements card + category cards + "Mark Complete" action
- After onboarding phase: grid simplifies — no deliverables card, no "Mark Complete", just the category cards for ongoing Q&A
- Tab label in onboarding phase: "Onboarding". Tab label post-onboarding: Claude's discretion ("Questions" or keep "Onboarding")

### Claude's Discretion
- Exact bento grid column/row sizing and card aspect ratios
- Sheet component choice (Dialog vs Sheet/Drawer vs custom)
- Debounce timing for auto-save (200-500ms range)
- Exact animation for card-to-sheet transition (layout animation vs simple fade-in)
- "Saved" indicator fade timing
- Change log storage approach (separate table vs jsonb column)
- Card icon choices per section type

</decisions>

<specifics>
## Specific Ideas

- Reference design doc at `docs/plans/2026-03-03-onboarding-stepper-form-design.md` for data model — tables and API layer still apply, only the UI pattern changed (stepper → bento grid + sheets)
- **No Stepperize needed** — bento grid doesn't need stepper state management
- Categories contain a mix of questions AND requirements in the same sheet — not separated
- The existing deliverables sign-off flow (3-step process: confirm → send for sign-off → client signs off) is unchanged functionally, just lives inside an expandable sheet now
- Existing `onboarding_requirements` table gets a `category_id` column added (nullable, backwards compatible)
- Three new tables: `onboarding_categories`, `onboarding_questions`, `onboarding_answers`
- User's mockup reference: bento grid with larger "Project Questionnaire" card on left, stacked "Deliverables" and "Onboarding" cards on right. Cards are minimal with just title, status badge, and 1-2 preview items.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OnboardingTab` component (`features/projects/components/tabs/OnboardingTab.tsx`) — current implementation to replace, sign-off logic reusable
- `ButtonHoldAndRelease` (`components/ui/hold-and-release-button.tsx`) — used for sign-off confirmation CTAs
- `Card`, `Badge`, `Button`, `Progress`, `Dialog`, `Sheet` — shadcn UI primitives
- `confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction` — existing sign-off server actions
- `buildDeliverableTree()` — deliverable tree builder already in OnboardingTab
- `OnboardingRequirement` type and `lib/api/onboarding-requirements.ts` — existing requirements API
- `react-hook-form` v7.69 — already installed
- `framer-motion` — already installed, used elsewhere for animations
- `toast` from `sonner` — existing notification pattern

### Established Patterns
- Server actions return `{ success: boolean; error?: string }`
- API files in `lib/api/` with kebab-case naming
- Feature components in `features/{domain}/components/`
- Actions in `features/{domain}/actions/`
- Client components use `'use client'` + `useState` + `useTransition`
- `isAdmin` and `isDfy` role checks passed as props from server component

### Integration Points
- `ProjectTabs` renders `OnboardingTab` — entry point stays the same
- `ProjectPageClient` passes `project`, `requirements`, `userRole`, `isAdmin`, `isDfy` — will need to also pass categories, questions, answers
- `app/(dashboard)/projects/[id]/page.tsx` server component — add data fetching for new tables
- `lib/utils/projectPhases.ts` — `isOnboardingPhase()` controls tab visibility (no change needed)

</code_context>

<deferred>
## Deferred Ideas

- Template library for common onboarding forms (e.g. "Web Development" template with pre-built categories/questions) — future phase
- Client-facing view of onboarding progress (currently only admin + DFY) — future phase
- Conditional questions (show question B only if question A answered "yes") — future enhancement

</deferred>

---

*Phase: 20-onboarding-stepper-form*
*Context gathered: 2026-03-03*
