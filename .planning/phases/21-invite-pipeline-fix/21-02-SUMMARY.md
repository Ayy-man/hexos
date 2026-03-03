---
phase: 21-invite-pipeline-fix
plan: 02
subsystem: auth
tags: [supabase, invitations, server-actions, next-app-router]

# Dependency graph
requires: []
provides:
  - "4 create*Invitation functions that set expires_at = 7 days from creation in .insert() payload"
  - "Fixed signout flow on invite acceptance page using <form action> server action pattern"
affects: [22-modern-auth-methods, 23-onboarding-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use <form action={serverAction}> not <a onClick> for server action invocation in Next.js App Router"
    - "Set expires_at in .insert() payload for all invitation types that should expire"

key-files:
  created: []
  modified:
    - lib/api/invitations.ts
    - app/invite/[token]/page.tsx

key-decisions:
  - "signOutAndRedirect defined as a named server action inside the page component — gives it access to token from page params scope"
  - "expires_at added after status field in each .insert() for consistency — createDevApplication (pending_approval) intentionally left without expires_at"

patterns-established:
  - "Server action pattern: define named async function with 'use server' inside page component, wire to <form action>"
  - "Invitation expiry: all create*Invitation functions that produce status=pending must include expires_at = 7 days"

requirements-completed: [INV-02-EXPIRY, INV-03-SIGNOUT]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Phase 21 Plan 02: Invite Pipeline Fix — Expiry and Signout Summary

**Surgical two-bug fix: all 4 create*Invitation functions now set expires_at 7 days forward in the DB insert, and the broken `<a onClick>` signout is replaced with a `<form action={signOutAndRedirect}>` that actually executes**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-03T13:29:26Z
- **Completed:** 2026-03-03T13:30:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` to createAdminInvitation, createDfyFirstInvitation, createTeamInvitation, and createDevInvitation insert payloads
- createDevApplication (pending_approval self-signup) left unchanged — no expiry needed until admin approval converts it
- Replaced broken `<a onClick>` with `<form action={signOutAndRedirect}>` + `<button>` — Next.js App Router requires form action pattern for server actions; onClick on anchor silently fails
- signOutAndRedirect server action calls supabase.auth.signOut() then redirect() to the invite page in login mode

## Task Commits

1. **Task 1: Add expires_at to all 4 create*Invitation functions** - `7dd29fc` (fix)
2. **Task 2: Fix signout on invite acceptance page** - `fa9e956` (fix)

## Files Created/Modified

- `lib/api/invitations.ts` - Added expires_at field to .insert() in 4 create* functions
- `app/invite/[token]/page.tsx` - Added signOutAndRedirect server action; replaced broken <a onClick> with <form action> + <button>

## Decisions Made

- signOutAndRedirect defined as a named server action inside the page component to access `token` from page params scope via closure — same pattern as the existing handleSignup/handleLogin/handleAccept actions
- createDevApplication left without expires_at because its status is `pending_approval` (awaiting admin review), not `pending` (invitation to accept). The approveDevApplication function already sets expires_at when converting to pending.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Invitation expiry bug fixed: invitations will now properly expire after 7 days
- Signout bug fixed: users logged in as the wrong account can correctly sign out and land on the login form for the invitation email
- Phase 21-03 (admin DFY toggle) can proceed independently

---
*Phase: 21-invite-pipeline-fix*
*Completed: 2026-03-03*
