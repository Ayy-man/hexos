---
phase: 10-opportunities-overhaul
plan: 01
subsystem: api, database
tags: [supabase, postgresql, rls, bidding, ai-caching, opportunities]

# Dependency graph
requires:
  - phase: 07-finance-tab-redesign
    provides: Project completion state for post-project opportunity context
provides:
  - dev_opportunity_bids table for developer bidding system
  - brief_extractions table for AI-generated brief caching
  - Extended project_opportunities with weeks-based estimates
  - Extended dev_opportunity_preferences with commitment tracking
  - Bids API module with full CRUD operations
  - Brief extractions API module with cache logic
affects: [10-02, 10-03, opportunities-ui, dev-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bid status workflow: pending -> shortlisted -> accepted/rejected"
    - "Brief cache with SHA256 input hash for invalidation"
    - "7-day default cache expiry for AI-generated content"

key-files:
  created:
    - "supabase/migrations/20260119000001_opportunities_overhaul.sql"
    - "lib/api/bids.ts"
    - "lib/api/brief-extractions.ts"
  modified: []

key-decisions:
  - "Use weeks-based estimates (DECIMAL 3,1) for longer projects"
  - "Keep existing estimated_hours for backward compatibility"
  - "SHA256 hash for brief cache invalidation when source data changes"
  - "Admin notification trigger on new bid submission"

patterns-established:
  - "Bid normalization pattern: normalizeBidRelations for joined dev/opportunity"
  - "Cache expiry pattern: expires_at with gt() filter for valid briefs"
  - "Web Crypto API for SHA256 hashing (Node.js 15+ compatible)"

# Metrics
duration: 10min
completed: 2026-01-20
---

# Phase 10 Plan 01: Database & API Foundation Summary

**Bidding system tables (dev_opportunity_bids, brief_extractions) with full RLS, bid API module for dev/admin operations, and brief extraction caching API**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-01-20T00:12:37+05:30
- **Completed:** 2026-01-20T00:22:11+05:30
- **Tasks:** 3/3
- **Files created:** 3

## Accomplishments
- Created `dev_opportunity_bids` table for developer bidding with status workflow
- Created `brief_extractions` table for AI-generated brief caching with TTL
- Extended `project_opportunities` with weeks-based duration estimates
- Extended `dev_opportunity_preferences` with commitment tracking fields
- Full RLS policies: admins all access, devs manage own bids/read briefs
- Bid notification trigger for admin awareness
- Complete bids API: submit, withdraw, getMyBids, getBidsForOpportunity, updateBidStatus, getBidCount
- Complete brief-extractions API: getCachedBrief, saveBriefExtraction, invalidateBriefCache, getInputHash

## Task Commits

Each task was committed atomically:

1. **Task 1: Create database migration** - `66d71a7` (feat)
2. **Task 2: Create bids API module** - `d81ee92` (feat)
3. **Task 3: Create brief extractions API module** - `b929b4b` (feat)

Additional fix: `b56c52c` (fix: remove invalid NOW() index from opportunities migration)

## Files Created/Modified

- `supabase/migrations/20260119000001_opportunities_overhaul.sql` - Migration with bidding tables, brief cache, RLS policies
- `lib/api/bids.ts` - Bid CRUD operations for devs and admins
- `lib/api/brief-extractions.ts` - Brief caching with SHA256 hash invalidation

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| DECIMAL(3,1) for weeks | Allows half-week precision (e.g., 2.5 weeks) |
| Keep estimated_hours | Backward compatibility with existing opportunities |
| SHA256 input hash | Detect when source data changes to invalidate stale cache |
| 7-day default TTL for briefs | Balance cache freshness with AI cost savings |
| Admin notification on bid | Admins need awareness of incoming bids without polling |
| Unique(opportunity_id, dev_id) | One bid per dev per opportunity |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed invalid NOW() index predicate**
- **Found during:** Task 1 (migration deployment)
- **Issue:** PostgreSQL doesn't allow NOW() in index WHERE clause (not IMMUTABLE)
- **Fix:** Removed idx_brief_extractions_valid, query uses filter instead
- **Files modified:** supabase/migrations/20260119000001_opportunities_overhaul.sql
- **Verification:** Migration applies successfully
- **Committed in:** b56c52c

---

**Total deviations:** 1 auto-fixed (bug)
**Impact on plan:** Index removal doesn't affect functionality; filtering done at query time.

## Issues Encountered

None - migration was already applied via Supabase SQL Editor before execution started.

## User Setup Required

None - no external service configuration required. Migration has already been applied.

## Next Phase Readiness

- Schema foundation ready for Phase 10-02 (UI components)
- API modules ready for server action wrappers
- RLS policies ensure proper access control
- Brief caching ready for AI generation endpoint integration

---
*Phase: 10-opportunities-overhaul*
*Completed: 2026-01-20*
