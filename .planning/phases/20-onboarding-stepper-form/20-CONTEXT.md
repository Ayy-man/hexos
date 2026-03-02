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
- Cards are **preview-only** — they show title, status badge, completion fraction, and a structured micro-summary. No actions on the grid itself.
- Card micro-summaries by type:
  - **Question categories**: "6 questions — 2 answered, 1 required remaining" with a thin progress bar
  - **Deliverables**: tree preview with completion count
  - **Requirements**: blocker count shown prominently, completion fraction
- Grid is responsive: 2 columns on desktop (larger card left, stacked smaller cards right as in mockup), single column on mobile
- Fixed cards (always present during onboarding): **Deliverables** card, **Requirements/Onboarding** card
- Dynamic cards: one per admin-defined **question category** (e.g. "Project Questionnaire", "Brand Info", "Access & Credentials")
- **Visual priority signals on cards**: completed cards get muted/dimmed treatment; cards with required incomplete items get a left-border accent in `--signal-warn`; neutral cards sit default. Gives instant scan-and-prioritize.
- **"Last edited" timestamp** on each card — helps DFY resume after multi-day gaps
- **Grid overflow**: max 6-8 visible cards. If more categories exist, sort by completion status (incomplete first) with a collapsible "Show N more" section. Prevents layout chaos with many categories.

### Expandable Sheet (Click-to-Expand)
- Clicking any bento card opens an **expandable sheet** that covers ~90% of the viewport
- **Must use `ResponsiveDialog`** (`components/ui/responsive-dialog.tsx`) — already handles desktop Dialog / mobile bottom Sheet switching with `pb-safe` and `max-h-[90vh]`. Do NOT build a custom component.
- Inside the sheet: full context and all actions for that section
  - **Deliverables sheet**: full deliverables tree, sign-off flow, status changes
  - **Requirements sheet**: full requirements list, status toggles, attachment upload, blocker management
  - **Question category sheet**: all questions in that category rendered as a form (react-hook-form), plus any requirements assigned to that category
- Close the sheet → back to the bento grid. Progress updates reflected immediately on the card.
- **URL state for open sheets**: clicking a card pushes a query param like `?section=brand-info`. Sheet auto-opens on page load if param is present. Critical for multi-day workflow — DFY can bookmark or refresh without losing context. Use Next.js `useSearchParams` + `router.push` with shallow routing.
- **Focus management**: Radix-based Dialog/Sheet owns the open/close lifecycle — provides focus trapping, Escape-to-close, and outside-click-to-close for free. framer-motion can enhance entrance/exit animations within the Radix primitive.

### Responsive Behavior
- On mobile, abandon bento card presentation — use a **compact list with progress indicators** (similar to current OnboardingTab pattern). Still opens sheets on tap.
- Mobile sheets use `ResponsiveDialog`'s built-in bottom Sheet with `side="bottom"`, `max-h-[90vh]`, and `pb-safe`.
- **Keyboard interaction**: test textarea focus inside bottom sheets — use `visualViewport` API to adjust sheet height when virtual keyboard opens. Focused input must remain visible via explicit scroll-into-view.

### Form Save Behavior
- **Auto-save on blur** (debounced) — each field persists when DFY moves to next field. No explicit save button needed.
- **Additional onChange debounce** at 2-3 seconds of typing inactivity as second layer — handles "user never blurs" case (e.g., fills a field and closes laptop lid).
- **Save-on-sheet-close safety net**: explicit save-all-dirty-fields call when sheet is dismissed, catching anything blur missed. Uses react-hook-form's `dirtyFields` to track unsaved state.
- **Unsaved changes guard**: if user tries to close sheet with dirty fields and no confirmed save, show "You have unsaved changes" confirmation dialog.
- **Subtle inline "Saving..." / "Saved" status** near the top of the sheet. Non-fading for normal saves. **`aria-live="polite"` region** for screen reader announcements ("Changes saved").
- **Save error handling**: if a save fails, show a **persistent (non-fading) inline error with retry button**. Use `aria-live="assertive"` for immediate screen reader announcement ("Save failed"). Do NOT silently swallow errors.
- **Explicit actions** (sign-off, mark complete, delete) still use `toast` from sonner for consistency with rest of app. Only auto-saves use inline status.

### Validation & Completion Flow
- **No red errors while filling out** — low-friction filling experience
- **Gentle completion hints on bento cards**: if a category has required unanswered questions, card shows "2 required questions remaining" in muted foreground color. Not red, not alarming, just informational.
- **On "Mark Onboarding Complete"**: re-validate against **server state** (not just local form state) to catch any questions admin added since sheet was loaded. Grid visually flags cards with issues. Opening a flagged card auto-scrolls to the first incomplete required field.
- If new required questions appeared since last sheet load, show: "2 new questions were added to [Category]. Please review them before completing."

### Onboarding Completion
- **Explicit "Mark Onboarding Complete"** action — lives on the grid view (not inside a sheet), visible when all required items are answered
- DFY must explicitly signal they're done. Admin gets a clear completion signal.

### Post-Submit Behavior
- After DFY marks onboarding complete, the form remains **editable** — DFY can go back and change answers
- Changes after completion are **tracked in a change log** but the log is **hidden from DFY** (admin can see it)
- Admin does NOT need to unlock — DFY always has edit access

### Admin Form Builder UX
- Admin sees the same bento grid but with **edit controls**
- **Inline add**: inside an expanded category sheet, click "+ Add Question" at bottom — new row appears inline with type picker and title field. No modal. If title left empty on blur, row disappears silently (ephemeral until saved). Small "x" dismiss button on new rows as explicit cancel.
- **Reordering**: drag-and-drop as primary (using existing `sortable.tsx` component), up/down arrow buttons as accessible fallback. Both for questions within a category and categories on the grid.
- **"Preview as DFY" toggle** at the top of the grid — global toggle, persists across sheet opens. In preview mode, admin sees read-only form mode with a banner "Preview mode — answers here are not saved". Admin can interact with form fields to test the experience but nothing persists.
- **Add category**: "+ Add Category" button on the grid adds a new bento card. Edit title inline.
- **Category management**: visible **kebab menu (three-dot icon)** on each category card header with "Rename" and "Delete" options. Context menu as power-user shortcut, not primary path.
- Admin can edit form structure even after DFY has started filling out

### Question Types
- `text` → shadcn `<Input>`
- `textarea` → shadcn `<Textarea>`
- `select` → shadcn `<Select>` with admin-defined options
- `multi_select` → `<fieldset>` + `<legend>` wrapping shadcn checkbox group with admin-defined options
- `boolean` → shadcn `<Switch>`
- Each question has: title, optional description (helper text), question_type, options (for select/multi_select), is_required toggle
- **Label/input association**: question `title` maps to `<Label htmlFor={questionId}>`. Optional `description` maps to `<p id={questionId-desc}>` with `aria-describedby` on the input.

### Admin Progress Monitoring
- Admin sees same bento grid with **completion rings/progress bars** on each card
- Expanding a category card shows DFY answers inline (read-only)
- Unanswered/incomplete items visually flagged
- Top-level progress summary above the grid: "14/20 items completed" with overall percentage

### Empty & Edge States
- **No categories set up**: DFY sees the deliverables card + a friendly message area: "Your team is setting up the onboarding form. You'll be notified when it's ready." Admin sees a nudge if no categories after X days in onboarding phase.
- **Admin adds category/question mid-flight**: New card appears on grid. DFY gets a **bundled notification** (hourly — if multiple questions added within the same hour, only one "There are new questions in [category]" notification). Not per-question. If DFY has the category sheet open, they won't see new questions until re-open — on "Mark Complete", server-side validation catches this.
- **Admin deletes category with answers**: Confirmation dialog warns "This category has X answers from the DFY partner. Deleting will remove their responses." Requires explicit confirmation. Answers soft-deleted (recoverable in DB).
- **Admin deletes category while DFY has sheet open**: save fails → inline message "This section was removed by your team. Your changes could not be saved." → sheet closes gracefully.
- **Phase transition**: when project moves past onboarding, show a one-time banner "Onboarding complete — this tab now serves as your ongoing Q&A channel." Deliverables and Requirements cards collapse/archive rather than disappearing abruptly.

### Persistent Questions Tab
- The questions/categories system is **not onboarding-only** — the tab remains visible and functional in all project phases, even after onboarding is marked complete
- Admin can keep adding questions at any time throughout the project lifecycle
- DFY can keep answering new questions as they appear
- During onboarding phase: full bento grid with deliverables card + requirements card + category cards + "Mark Complete" action
- After onboarding phase: grid simplifies — deliverables/requirements cards archived, just the category cards for ongoing Q&A
- Tab label in onboarding phase: "Onboarding". Tab label post-onboarding: Claude's discretion ("Questions" or keep "Onboarding")

### Design Tokens & Styling
- **Use existing design tokens** from globals.css — NOT hardcoded Tailwind colors:
  - Complete/approved: `signal-good` / `signal-good-dim`
  - In-progress/pending: `accent` / `accent-dim`
  - Blocked/error: `signal-bad` / `signal-bad-dim`
  - Warning/blocker: `signal-warn` / `signal-warn-dim`
- **Status badges pair color with icon** — never color alone as differentiator:
  - Complete: checkmark icon + `signal-good`
  - Pending: clock/dash icon + muted
  - Required: asterisk/exclamation icon + `signal-warn`

### Keyboard & Accessibility
- Each bento card: `role="button"` with `tabIndex={0}`, visible focus ring using `--control-ring`
- Tab order follows visual reading order (left to right, top to bottom)
- Sheet focus managed by Radix Dialog/Sheet primitives (focus trapping, Escape-to-close)
- On sheet close, focus returns to the triggering card
- `aria-live="polite"` for save status, `aria-live="assertive"` for save errors

### Claude's Discretion
- Exact bento grid column/row sizing and card aspect ratios
- Debounce timing for auto-save (200-500ms range) and onChange (2-3s range)
- Exact animation for card-to-sheet transition within ResponsiveDialog
- "Saved" indicator display timing
- Change log storage approach (separate table vs jsonb column)
- Card icon choices per section type
- Mobile list layout specifics

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
- `OnboardingTab` component (`features/projects/components/tabs/OnboardingTab.tsx`) — current implementation to replace. Preserve and lift: `buildDeliverableTree()`, sign-off action handlers, `ButtonHoldAndRelease` pattern, status badge color map.
- `ResponsiveDialog` (`components/ui/responsive-dialog.tsx`) — **must use** for all expandable sheets. Handles desktop Dialog / mobile bottom Sheet switching.
- `sortable.tsx` (`components/ui/sortable.tsx`) — use for drag-and-drop reordering in admin builder
- `ButtonHoldAndRelease` (`components/ui/hold-and-release-button.tsx`) — used for sign-off confirmation CTAs
- `Card`, `Badge`, `Button`, `Progress`, `Dialog`, `Sheet`, `DropdownMenu` — shadcn UI primitives
- `confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction` — existing sign-off server actions
- `OnboardingRequirement` type and `lib/api/onboarding-requirements.ts` — existing requirements API
- `react-hook-form` v7.69 — already installed
- `framer-motion` — already installed, used elsewhere for animations
- `toast` from `sonner` — existing notification pattern for explicit actions

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
*UI/UX review incorporated: 2026-03-03*
