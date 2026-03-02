---
phase: 21-blocker-queue-redesign
plan: 01
subsystem: ui
tags: [react, supabase, blockers, components, server-actions]

# Dependency graph
requires: []
provides:
  - getAllBlockers() API function that returns all blocker statuses including resolved/closed
  - getBlockerCommentsAction() server action for client-side comment fetching
  - BlockerCard component — compact clickable card for blocker queue list
  - BlockerConversation component — chat-like thread with lazy-loaded comments and composer
affects:
  - 21-02 (will compose these components into BlockerSidebar and AdminBlockerQueue)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Thin server action wrapper pattern (getBlockerCommentsAction wraps getBlockerComments for client-side use)
    - Brand design token usage (bg-bg-card, signal-bad, accent-dim, signal-warn-dim, etc.) in new components

key-files:
  created:
    - features/admin/components/BlockerCard.tsx
    - features/admin/components/BlockerConversation.tsx
  modified:
    - lib/api/blockers.ts
    - features/dev/actions/blockerActions.ts

key-decisions:
  - "getAllBlockers() added after getAllActiveBlockers() — no status filter, orders by created_at descending with full resolver/project joins"
  - "getBlockerCommentsAction() uses try/catch returning { success, comments } shape consistent with other server actions in the file"
  - "BlockerConversation uses getBlockerCommentsAction (server action) not direct API import — required for client-side fetching after mount"
  - "BlockerCard uses button element (not Link) with w-full text-left for accessible clickable card pattern"

patterns-established:
  - "Brand token pattern: all colors use custom CSS variables (bg-bg-card, text-text-primary, signal-bad) not Tailwind defaults"
  - "Server action wrapper pattern: thin 'use server' wrapper around API functions enables client components to fetch data without direct Supabase access"

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 21 Plan 01: Blocker Queue Data Layer and Leaf Components Summary

**getAllBlockers() API + getBlockerCommentsAction server action + BlockerCard/BlockerConversation components ready for Phase 21-02 assembly**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T00:12:29Z
- **Completed:** 2026-03-03T00:14:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `getAllBlockers()` to `lib/api/blockers.ts` — returns all blockers of all statuses (including resolved/closed), with full reporter/resolver/deliverable/project joins
- Added `getBlockerCommentsAction()` to `features/dev/actions/blockerActions.ts` — thin server action wrapper enabling client components to fetch comments via server action pattern
- Created `BlockerCard.tsx` — minimal clickable card with priority color bar, title truncation, description preview, status badge (brand-colored), project name, relative time, comment count, and reporter name
- Created `BlockerConversation.tsx` — chat-like thread with Avatar+name+timestamp per message, hover-reveal edit/delete, inline edit mode, Enter-to-send composer, auto-scroll to bottom

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getAllBlockers API function and getBlockerCommentsAction server action** - `4a76100` (feat)
2. **Task 2: Create BlockerCard and BlockerConversation components** - `14b0890` (feat)

**Plan metadata:** (docs commit — pending)

## Files Created/Modified
- `lib/api/blockers.ts` — Added `getAllBlockers()` function (lines 143-162)
- `features/dev/actions/blockerActions.ts` — Added `getBlockerCommentsAction()`, updated imports to include `getBlockerComments` and `BlockerComment` type
- `features/admin/components/BlockerCard.tsx` — New component: compact blocker card for queue list view
- `features/admin/components/BlockerConversation.tsx` — New component: lazy-loading chat thread with CRUD comment operations

## Decisions Made
- `getAllBlockers()` placed immediately after `getAllActiveBlockers()` for logical grouping — consistent select shape with resolver join added
- `getBlockerCommentsAction()` returns `{ success: true, comments }` or `{ success: false, comments: [] as BlockerComment[] }` — matches the existing action return shape pattern in the file
- `BlockerConversation` uses `getBlockerCommentsAction` (not direct `getBlockerComments` import) — the plan explicitly requires this server action wrapper for correct client-side fetching after hydration
- Composer uses `size="icon-sm"` for Send button — matches the Button component's icon size variants

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors exist project-wide (cannot find modules: 'react', 'date-fns', 'lucide-react', JSX intrinsic elements). These are environment-level tsconfig issues affecting all files in the project — confirmed by checking that identical errors exist in `AdminBlockerQueue.tsx` and other pre-existing files. Our new files have no additional errors beyond these pre-existing ones.

## Next Phase Readiness
- All leaf components ready for Plan 21-02 to compose into `BlockerSidebar` and `AdminBlockerQueue` orchestrator
- `getAllBlockers()` ready for the admin blockers page to use in Plan 21-02
- `getBlockerCommentsAction` importable from `@/features/dev/actions/blockerActions`
- Both components use correct brand design tokens per CONTEXT.md decisions

## Self-Check: PASSED

- FOUND: lib/api/blockers.ts
- FOUND: features/dev/actions/blockerActions.ts
- FOUND: features/admin/components/BlockerCard.tsx
- FOUND: features/admin/components/BlockerConversation.tsx
- FOUND: .planning/phases/21-blocker-queue-redesign/21-01-SUMMARY.md
- FOUND commit: 4a76100
- FOUND commit: 14b0890

---
*Phase: 21-blocker-queue-redesign*
*Completed: 2026-03-03*
