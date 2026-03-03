---
phase: 23-onboarding-wizard
plan: 01
subsystem: auth
tags: [supabase, nextjs, server-action, postgresql, typescript]

# Dependency graph
requires:
  - phase: 22-modern-auth-methods
    provides: invite-based auth flow, profiles table with role field
provides:
  - has_completed_onboarding boolean column on profiles with backfill migration
  - Profile TypeScript type extended with has_completed_onboarding optional boolean
  - Dashboard layout redirect guard bouncing unonboarded users to /onboarding
  - completeOnboarding server action atomically setting flag + optional profile fields
affects: [23-onboarding-wizard plan-02, any feature reading Profile type]

# Tech tracking
tech-stack:
  added: []
  patterns: [server action with auth guard + selective profile field updates, redirect guard before expensive Promise.all data fetches]

key-files:
  created:
    - supabase/migrations/20260303000001_onboarding_flag.sql
    - features/onboarding/actions/completeOnboarding.ts
  modified:
    - lib/auth/types.ts
    - app/(dashboard)/layout.tsx

key-decisions:
  - "has_completed_onboarding is optional boolean on Profile interface — consumers not expecting it yet, backfill runs at deployment"
  - "Redirect guard placed BEFORE getNavigation() and Promise.all() — unonboarded users skip all 11+ DB queries"
  - "completeOnboarding uses createClient() (not admin client) — respects RLS, validates session via supabase.auth.getUser()"
  - "revalidatePath('/dashboard') invalidates Next.js route cache so subsequent dashboard load re-fetches profile with updated flag"

patterns-established:
  - "Onboarding gate pattern: check flag after profile fetch, before any page-specific data fetches"
  - "Server action pattern: auth check → build updates map → supabase update → revalidate → return {success, error?}"

requirements-completed:
  - "has_completed_onboarding boolean migration with backfill"
  - "Dashboard layout redirects to /onboarding if flag is false"
  - "completeOnboarding server action sets flag + updates profile"

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 23 Plan 01: Onboarding Wizard Foundation Summary

**has_completed_onboarding flag with SQL backfill migration, dashboard redirect guard before Promise.all, and completeOnboarding server action with selective profile updates**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T15:53:17Z
- **Completed:** 2026-03-03T15:55:14Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created migration `20260303000001_onboarding_flag.sql` adding `has_completed_onboarding BOOLEAN DEFAULT false` with backfill setting existing users with a role to `true`
- Extended `Profile` interface in `lib/auth/types.ts` with `has_completed_onboarding?: boolean`
- Inserted redirect guard in dashboard layout BEFORE `getNavigation()` and the 11-item `Promise.all()` block, preventing wasted DB queries for unonboarded users
- Created `completeOnboarding` server action with auth guard, selective profile field updates, and `revalidatePath` cache invalidation

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration and Profile type** - `131b8e4` (feat)
2. **Task 2: Dashboard redirect guard** - `2b2d330` (feat)
3. **Task 3: completeOnboarding server action** - `a193f67` (feat)

**Plan metadata:** (docs commit — see final_commit step)

## Files Created/Modified
- `supabase/migrations/20260303000001_onboarding_flag.sql` - ALTER TABLE + UPDATE backfill for has_completed_onboarding
- `lib/auth/types.ts` - Profile interface extended with has_completed_onboarding?: boolean
- `app/(dashboard)/layout.tsx` - Redirect guard to /onboarding inserted before data fetches
- `features/onboarding/actions/completeOnboarding.ts` - Server action to atomically complete onboarding

## Decisions Made
- `has_completed_onboarding` is optional (`?`) on the Profile interface — existing TypeScript consumers not yet expecting it; migration backfill handles runtime values
- Redirect guard is placed BEFORE `getNavigation()` and all `Promise.all()` fetches — unonboarded users skip 11+ DB queries entirely
- `completeOnboarding` uses `createClient()` (not admin client) to respect RLS; session validated via `supabase.auth.getUser()` before any DB write
- Only non-empty optional fields (name, timezone, city, country) are included in the update object — avoids overwriting existing values with empty strings

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Pre-existing TypeScript errors from previously deleted files (invoices, deliverables routes, platejs modules) were present before this plan and are out of scope.

## User Setup Required
None - no external service configuration required. Migration must be run against Supabase to apply the schema change.

## Next Phase Readiness
- Foundation complete — Plan 02 can build the OnboardingWizard UI component that calls `completeOnboarding` on finish
- The redirect guard is live: any existing unonboarded user visiting a dashboard route will be bounced to `/onboarding`
- Existing users with a role will pass through unaffected (backfill sets their flag to `true`)

---
*Phase: 23-onboarding-wizard*
*Completed: 2026-03-03*
