---
phase: 10-opportunities-overhaul
plan: 03
subsystem: api, features
tags: [openrouter, ai, caching, opportunities, redaction]

# Dependency graph
requires:
  - phase: 10-01
    provides: brief_extractions table, cache API (getCachedBrief, saveBriefExtraction, getInputHash)
provides:
  - AI-powered redacted brief generation endpoint
  - Brief server actions with caching logic
  - RedactedBriefCard display component for developers
affects: [opportunities-ui, dev-dashboard, admin-opportunities]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "OpenRouter API with Claude 3.5 Haiku for brief generation"
    - "Tool calling for structured extraction (extract_brief)"
    - "Input hash comparison for cache invalidation"

key-files:
  created:
    - "app/api/generate-brief/route.ts"
    - "features/opportunities/actions/briefActions.ts"
    - "features/opportunities/components/RedactedBriefCard.tsx"
  modified: []

key-decisions:
  - "Redact client names, prices, URLs, addresses, internal notes"
  - "Keep industry, problem type, tech stack, complexity, duration"
  - "Use cache hash match to determine if regeneration needed"
  - "Return null for getBriefForOpportunityAction on error (graceful degradation)"

patterns-established:
  - "AI brief generation with structured tool calling"
  - "Source data assembly from linked entities"
  - "Complexity color coding: emerald/amber/red for low/medium/high"

# Metrics
duration: 4min
completed: 2026-01-20
---

# Phase 10 Plan 03: AI Brief Generation Summary

**AI-powered redacted brief generation with caching for developer opportunities; endpoint at /api/generate-brief, server actions with cache logic, and RedactedBriefCard component for display**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-01-20T02:50:29Z
- **Completed:** 2026-01-20T02:53:52Z
- **Tasks:** 3/3
- **Files created:** 3

## Accomplishments
- Created `/api/generate-brief` endpoint using OpenRouter + Claude 3.5 Haiku
- Implements structured extraction via `extract_brief` tool calling
- System prompt handles redaction of sensitive data (client names, prices, URLs, etc.)
- Returns both structured `RedactedBrief` object and markdown text
- Error handling for 401, 402, 429 status codes

- Created `briefActions.ts` with 3 server actions:
  - `generateBriefAction`: checks cache (hash match), generates if needed
  - `regenerateBriefAction`: invalidates cache, regenerates, revalidates paths
  - `getBriefForOpportunityAction`: assembles opportunity data, delegates to generate

- Created `RedactedBriefCard.tsx` display component:
  - Shows industry, problem type, scope summary in structured layout
  - Tech stack displayed as badges
  - Deliverables as checklist with check icons
  - Complexity badge with color coding (emerald/amber/red)
  - Duration with clock icon
  - Special requirements section (if present)
  - Footer shows redacted fields count and generation date
  - Regenerate button for admins (uses useTransition for loading state)
  - Shield icon indicates data is sanitized

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AI brief generation endpoint** - `1e75c29` (feat)
2. **Task 2: Create brief server actions with caching** - `791fc0a` (feat)
3. **Task 3: Create RedactedBriefCard component** - `34821cb` (feat)

## Files Created/Modified

- `app/api/generate-brief/route.ts` - AI endpoint for brief generation
- `features/opportunities/actions/briefActions.ts` - Server actions with caching
- `features/opportunities/components/RedactedBriefCard.tsx` - Display component

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Redact: names, prices, URLs, addresses | Protect sensitive client information from developers |
| Keep: industry, problem type, tech stack | Developers need this info to evaluate opportunity fit |
| Hash comparison for cache validity | Detect source data changes without regenerating every time |
| Return null on error in getBriefForOpportunityAction | Graceful degradation - UI can show fallback |
| Complexity color coding | Visual at-a-glance assessment (green=easy, amber=moderate, red=complex) |

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully without blockers.

## User Setup Required

None - OpenRouter API key already configured from previous AI features.

## Next Phase Readiness

- AI brief generation complete, ready for integration in opportunity detail views
- RedactedBriefCard ready to be added to opportunity cards/modals
- Admin regeneration flow ready for testing
- Cache infrastructure from 10-01 now has full AI generation layer on top

---
*Phase: 10-opportunities-overhaul*
*Completed: 2026-01-20*
