---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Performance
status: unknown
last_updated: "2026-03-03T00:40:20.860Z"
progress:
  total_phases: 21
  completed_phases: 18
  total_plans: 60
  completed_plans: 58
---

# Project State

**Milestone:** v1.2 UX Enrichment — IN PROGRESS
**Repository:** hexos-main
**Last Updated:** 2026-03-02

---

## Current Position

Status: Phase 22 Plan 03 complete — data layer closed: createInquiry() writes junction rows to inquiry_selections, detail page shows all selections, fieldMappings updated. Awaiting human visual verification checkpoint.
Last activity: 2026-03-03 - Completed Phase 22-03: createInquiry() junction insert + primaryBlueprintId derivation, fieldMappings A1/A3/B2 now use 'selections', inquiry detail page queries and renders inquiry_selections with blueprint/case-study joins

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** DFY partners can submit inquiries, receive proposals, and track projects through a single portal
**Current focus:** Blocker Queue Redesign (Phase 21)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 22-inquiry-multi-select-blueprints-case-studies/22-03-PLAN.md — checkpoint:human-verify pending
Resume file: .planning/phases/22-inquiry-multi-select-blueprints-case-studies/22-03-SUMMARY.md

## Decisions

- Phase 18-01: Used CATEGORY_CONFIG map as single source of truth for activity type visual config in activity-utils.ts
- Phase 18-01: Used React.createElement in .ts file to return React nodes without requiring JSX transform
- Phase 18-02: Always render Recent Activity card with empty state rather than conditionally hiding it
- Phase 18-02: Cross-tab navigation via onNavigateToActivity callback prop (not string-based tab name passed directly)
- Phase 19-01: Used b.name (not b.title) for blueprints and case-studies — actual schema column is name
- Phase 19-01: getUpcomingMeetings uses createServerClient alias since meetings.ts already imports createClient from admin
- Phase 19-01: Non-admin users receive empty items array (not 403) on admin-gated sidebar drill-down types
- Phase 19-02: Invisible overlay button with stopPropagation for pin capture — preserves underlying Link click for navigation
- Phase 19-02: DrillDownRow caches via items===null guard — fetches once on first hover, never re-fetches
- Phase 19-03: Meetings hover card gates on meetingsSummary.length > 0 — no tooltip shown when zero upcoming meetings
- Phase 19-03: BlockerHoverContent uses conditional rendering per severity row — only non-zero counts rendered to avoid noise
- Phase 19-03: Critical blocker badge uses bg-red-500 class override for distinct red color
- [Phase quick-3]: Used || for date fields and ?? for price fields in inquiry-to-project sync to preserve explicit 0 values
- [Phase 21-01]: getAllBlockers() returns all statuses including resolved/closed — placed after getAllActiveBlockers with full resolver/project joins
- [Phase 21-01]: getBlockerCommentsAction() wraps getBlockerComments as thin server action — BlockerConversation uses it (not direct API) for client-side comment fetching
- [Phase 20-01]: saveAnswerAction omits revalidatePath to prevent re-renders on auto-save
- [Phase 20-01]: upsertOnboardingAnswer uses onConflict question_id,project_id for idempotent saves via UNIQUE constraint
- [Phase 20-01]: markOnboardingCompleteAction queries server state directly — never trusts client completion status
- [Phase 20-02]: BentoCard renders ResponsiveDialog inline — co-location keeps click handler and dialog state together
- [Phase 20-02]: OnboardingBentoGrid wraps inner component in Suspense for useSearchParams (Next.js requirement)
- [Phase 20-02]: showQuestionsTab uses same "onboarding" tab value with "Questions" label — avoids duplicate TabsContent
- [Phase 20-02]: buildDeliverableTree placed in DeliverablesBentoCard module — only used there, can be lifted for Plans 03-04
- [Phase quick-4]: Replicated exact case studies image pattern for blueprints — same storage bucket, same hook, same UI layout
- [Phase 20-04]: isSelectOpenRef with 150ms blur delay prevents race condition when user opens Select dropdown in InlineQuestionRow
- [Phase 20-04]: Admin build mode bypasses unsaved-changes guard in CategoryBentoCard — CategoryEditor has no form dirty state
- [Phase 20-04]: CategorySheet three-mode content: isAdmin+!isPreviewMode → CategoryEditor, isAdmin+isPreviewMode → CategoryForm+banner, isDfy → fill mode
- [Phase 20-03]: useCategoryAutosave reads form values INSIDE performSave callback via getValues(questionId) — prevents stale value bug by reading at save time, not at handler creation time
- [Phase 20-03]: BentoCard.onBeforeClose returns Promise<boolean> — parent stores resolve in state, AlertDialog action calls resolve() for async close interception without race conditions
- [Phase 22-01]: blueprint_id kept on CreateInquiryData for backwards compat — set from first blueprint in selections by createInquiry()
- [Phase 22-01]: Migration for inquiry_selections requires manual apply via Supabase dashboard (project not linked locally)
- [Phase 22-02]: ComboboxChip from @base-ui/react has no value prop — chips are presentational, managed by Combobox root context
- [Phase 22-02]: getCaseStudies() called with no options (published only) — DFY partners only see live case studies in multi-select
- [Phase 22-02]: selected_tier_blueprint_id tracks which blueprint the current tier belongs to — cleared when that blueprint is deselected
- [Phase 20-05]: DeliverablesSheet receives full project prop (not just deliverables) — needed for sign-off status derived from project.status and project.signed_off_at
- [Phase 20-05]: sheetContent prop used on BentoCard — BentoCard already owns the dialog lifecycle via useOnboardingSheet
- [Phase 22]: unknown cast used for selectionsData to bypass Supabase join type discrepancy in inquiry detail page
- [Phase 22]: createInquiry() junction insert is non-fatal — inquiry creation is never blocked by inquiry_selections errors

## Accumulated Context

### Roadmap Evolution

- Phase 19 added: Enhanced Sidebar Hover Previews with Drill-Down Navigation (v1.2 UX Enrichment)
- Phase 19 in progress: API layer (19-01), UI layer (19-02), and new cards (19-03 Tasks 1-2) executed — awaiting visual verification

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 3 | Auto-sync inquiry data to project during conversion | 2026-03-02 | 5608315 | [3-auto-sync-inquiry-data-to-project-during](./quick/3-auto-sync-inquiry-data-to-project-during/) |
| 4 | Add image_url field to blueprints (DB, API, form UI, card display) | 2026-03-03 | 66e69ae | [4-add-image-url-field-to-blueprints](./quick/4-add-image-url-field-to-blueprints/) |

---

*Updated 2026-03-03 — Phase 22-03 complete (pending visual verification): createInquiry() junction insert + primaryBlueprintId derivation, fieldMappings updated for A1/A3/B2, inquiry detail page queries and renders inquiry_selections*
