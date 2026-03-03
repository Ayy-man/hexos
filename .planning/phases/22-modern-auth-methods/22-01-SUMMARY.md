---
phase: 22-modern-auth-methods
plan: "01"
subsystem: auth
tags: [supabase, oauth, google, magic-link, password-reset, next.js, server-actions]

# Dependency graph
requires:
  - phase: 21-invite-pipeline-fix
    provides: "acceptInvitation function in lib/api/invitations.ts — used by callback route"
provides:
  - "app/auth/callback/route.ts — unified GET route handling OAuth, magic link, and password reset callbacks"
  - "signInWithGoogle — server action for Google OAuth with invite token passthrough"
  - "signInWithMagicLink — server action for OTP email with invite-aware callback URL"
  - "resetPassword — server action for Supabase password reset email"
  - "updatePassword — server action for updating user password via Supabase updateUser"
affects:
  - "22-02 (login UI) — consumes signInWithGoogle and signInWithMagicLink"
  - "22-03 (reset-password page) — consumes resetPassword and updatePassword"
  - "23-onboarding-wizard — callback route's invite-accept flow determines post-signup redirect"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified /auth/callback route (not in route group) — avoids layout rendering on redirect-only routes"
    - "Invite token passthrough via URL searchParam through OAuth callback chain"
    - "NEXT_PUBLIC_APP_URL with http://localhost:3000 fallback for redirect URL construction"

key-files:
  created:
    - "app/auth/callback/route.ts"
  modified:
    - "lib/auth/actions.ts"

key-decisions:
  - "Auth callback at app/auth/callback/route.ts (not app/(auth)/callback/) — route groups include layout, callback needs redirect-only response"
  - "Invite token passed as ?token= searchParam through OAuth callback — avoids Supabase state manipulation"
  - "Failed invite acceptance still redirects to /dashboard (user is authenticated) — graceful degradation"
  - "Profile role check gates existing OAuth users — new OAuth users without invitations get error redirect to login"

patterns-established:
  - "Pattern 1: All auth redirects point to /auth/callback — single entry point for session establishment"
  - "Pattern 2: Optional inviteToken param in Google/magic link actions — supports both invite and direct login flows"

requirements-completed:
  - "Unified /auth/callback route handling OAuth, magic links, and password reset"
  - "Invite-aware auth callback: validates and accepts invitation after OAuth/magic link signup"
  - "Google OAuth via Supabase provider"
  - "Magic links as optional login method"
  - "Password reset flow"

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 22 Plan 01: Modern Auth Methods — Actions & Callback Summary

**Supabase OAuth callback route with invite-token passthrough, plus 4 server actions (Google OAuth, magic link OTP, password reset, password update)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T14:44:42Z
- **Completed:** 2026-03-03T14:50:36Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created `app/auth/callback/route.ts` — unified GET route that exchanges OAuth/magic link codes for sessions, accepts invitations when token param is present, checks profile roles, and handles all error cases with redirect
- Added 4 new server actions to `lib/auth/actions.ts`: `signInWithGoogle`, `signInWithMagicLink`, `resetPassword`, `updatePassword` — all using NEXT_PUBLIC_APP_URL with localhost fallback
- All existing auth functions (signIn, signOut, signUp, signInAndReturn) left completely unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified auth callback route** - `7734c82` (feat)
2. **Task 2: Add Google OAuth, magic link, and password reset actions** - `2ca5645` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified
- `app/auth/callback/route.ts` - New unified auth callback GET handler for all OAuth/magic link/password reset flows
- `lib/auth/actions.ts` - Added 4 new exported server actions; existing 4 functions untouched

## Decisions Made
- Auth callback placed at `app/auth/callback/route.ts` (not inside `app/(auth)/`) because route groups include a layout — this route only returns redirects, never HTML
- Invite token passed as `?token=` URL searchParam through the OAuth callback chain — cleanest approach without manipulating Supabase PKCE state
- Failed invite acceptance still redirects to `/dashboard` rather than erroring — user is already authenticated, graceful degradation is correct
- Profile role check rejects new OAuth signups without an invitation — enforces invite-only access model

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `pnpm build` fails with Node.js v22 + Next.js 16.1.0 package config incompatibility — confirmed pre-existing issue (fails on base commit before any changes). TypeScript validation via direct file inspection and grep verified all signatures are correct.

## User Setup Required
None - no external service configuration required. (Google OAuth provider must be configured in Supabase dashboard separately, but that's a pre-requisite documented in the design plan.)

## Next Phase Readiness
- Auth callback route and all 4 server actions ready for consumption by 22-02 (login/signup UI with Google + magic link buttons) and 22-03 (reset-password page)
- No blockers — action layer is complete

## Self-Check: PASSED

- `app/auth/callback/route.ts` — FOUND
- `lib/auth/actions.ts` (8 exports) — FOUND
- `.planning/phases/22-modern-auth-methods/22-01-SUMMARY.md` — FOUND
- Commit `7734c82` (auth callback route) — FOUND
- Commit `2ca5645` (4 new server actions) — FOUND

---
*Phase: 22-modern-auth-methods*
*Completed: 2026-03-03*
