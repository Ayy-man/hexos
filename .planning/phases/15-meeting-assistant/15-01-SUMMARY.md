---
phase: 15-meeting-assistant
plan: 01
subsystem: database
tags: [recall.ai, meetings, transcription, postgresql, rls, typescript]

# Dependency graph
requires:
  - phase: 13-email-delivery-resend
    provides: Singleton client pattern (resend.ts)
  - phase: 10-opportunities-overhaul
    provides: Manual type definitions pattern
provides:
  - Database schema for meetings, links, participants, and tasks
  - TypeScript types for meeting entities
  - Recall.ai client singleton for bot management
affects: [15-02-api-webhook-handlers, 15-03-claude-ai-extraction]

# Tech tracking
tech-stack:
  added: [recall.ai]
  patterns: [fetch-based singleton client, admin-only RLS policies, polymorphic linking]

key-files:
  created:
    - supabase/migrations/20260209000001_meeting_assistant.sql
    - lib/types/meetings.ts
    - lib/recall/client.ts
  modified: []

key-decisions:
  - "Admin-only RLS policies for V1 - all meeting tables restricted to admin role"
  - "Polymorphic meeting_links table without foreign key constraints on linkable_id"
  - "Fetch-based Recall.ai client (no official SDK) following resend.ts singleton pattern"
  - "Reused existing update_updated_at_column() trigger function"
  - "JSONB storage for transcript segments and key decisions"

patterns-established:
  - "Fetch-based third-party API client: getApiKey() + wrapper function + singleton export"
  - "Meeting task loosely coupled references: project_id/inquiry_id without FK constraints"
  - "Admin-only V1 RLS: single policy using get_user_role() = 'admin' for all operations"

# Metrics
duration: 2min
completed: 2026-02-09
---

# Phase 15 Plan 01: Meeting Assistant Foundation Summary

**Database schema with meetings/links/participants/tasks tables, manual TypeScript types, and fetch-based Recall.ai client singleton**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-09T13:07:24Z
- **Completed:** 2026-02-09T13:09:08Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Four-table schema with RLS policies restricting all access to admin role
- Manual TypeScript type definitions for all meeting entities plus input/output types
- Recall.ai client singleton with createBot, getBot, getBotTranscript methods
- Polymorphic linking system via meeting_links table for projects/inquiries/conversations
- Meeting tasks table supporting AI extraction, manual creation, and CSV import sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase migration for meeting tables + RLS** - `45c50d3` (feat)
2. **Task 2: Create TypeScript types and Recall.ai client singleton** - `44a0dbc` (feat)

## Files Created/Modified
- `supabase/migrations/20260209000001_meeting_assistant.sql` - Meetings, meeting_links, meeting_participants, meeting_tasks tables with admin-only RLS
- `lib/types/meetings.ts` - Manual type definitions for all meeting entities, input types, and AI extraction results
- `lib/recall/client.ts` - Fetch-based Recall.ai API client singleton following resend.ts pattern

## Decisions Made
- **Admin-only RLS for V1**: All four meeting tables use single `admin_full_access` policy with `get_user_role() = 'admin'` check. Simplifies initial implementation, can be expanded in V2 when dev/DFY partner visibility is needed.
- **No FK constraints for polymorphic linking**: meeting_links.linkable_id doesn't reference specific tables since it's polymorphic (project/inquiry/conversation). Prevents invalid cascades.
- **Loosely coupled task references**: meeting_tasks.project_id/inquiry_id/deliverable_id are nullable references without FK constraints, allowing tasks to exist independently or be linked later.
- **Fetch-based Recall.ai client**: No official Node SDK exists, so implemented lightweight wrapper around fetch with Token authentication following established singleton pattern from resend.ts.
- **JSONB for transcript/decisions**: transcript stored as JSONB array of TranscriptSegment objects, key_decisions as JSONB array of KeyDecision objects. Allows structured queries while maintaining flexibility.
- **Reuse update_updated_at_column()**: Found existing trigger function from expense tracking migration, reused instead of creating duplicate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section documents:
- Recall.ai account creation and API key generation
- Webhook endpoint configuration pointing to application domain
- Environment variables: RECALL_API_KEY, RECALL_WEBHOOK_SECRET

This setup will be required before webhook handlers (plan 15-02) can be tested.

## Next Phase Readiness

**Ready for plan 15-02 (API & Webhook Handlers):**
- Database tables exist and accept inserts (pending migration application)
- TypeScript types are importable for API helper functions
- Recall.ai client is importable for bot creation/management
- Schema supports all planned features: bot lifecycle, transcript storage, AI extraction, task management, polymorphic linking

**No blockers or concerns.**

---
*Phase: 15-meeting-assistant*
*Plan: 01*
*Completed: 2026-02-09*
