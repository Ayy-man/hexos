---
phase: 22-modern-auth-methods
plan: "02"
subsystem: auth
tags: [supabase, oauth, google, magic-link, password-reset, react-email, next-auth]

# Dependency graph
requires:
  - phase: 22-01
    provides: signInWithGoogle, signInWithMagicLink, resetPassword, updatePassword server actions
  - phase: 21-invite-pipeline-fix
    provides: BaseLayout email template pattern
provides:
  - Login page with Google OAuth button, magic link toggle, and forgot password link
  - Forgot-password page with email form and confirmation state
  - Reset-password page as client component using PASSWORD_RECOVERY event
  - PasswordResetEmail template following Phase 21 BaseLayout pattern
affects: [23-onboarding-wizard, future-auth-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client component for auth flows requiring hash fragment access (PASSWORD_RECOVERY)"
    - "onAuthStateChange listener for Supabase session events in client components"
    - "?success= and ?error= search params for server action result communication"
    - "Google OAuth via inline server action wrapping signInWithGoogle"

key-files:
  created:
    - app/(auth)/forgot-password/page.tsx
    - app/(auth)/reset-password/page.tsx
    - lib/email/templates/PasswordResetEmail.tsx
  modified:
    - app/(auth)/login/page.tsx

key-decisions:
  - "Reset-password page is a client component — Supabase password reset emails use URL hash fragments for session, which are inaccessible to SSR"
  - "Reset-password calls supabase.auth.updateUser directly from browser client (not updatePassword server action) — browser client has the recovery session from hash fragment"
  - "?success=password-reset uses cyan (not red) styling on login page — distinguishes success from error"
  - "Task 5 (Supabase email verification config) is a dashboard-only step — no custom code needed, documented as manual verification"

patterns-established:
  - "Password-recovery client pattern: useEffect + onAuthStateChange('PASSWORD_RECOVERY') + sessionReady state guard"
  - "Consistent auth page label style: text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5"

requirements-completed:
  - "Google OAuth via Supabase provider (login page button)"
  - "Magic links as optional login method (signInWithOtp + confirmation UI)"
  - "Password reset flow (forgot-password page + reset-password page + email template)"
  - "Email verification on signup (Supabase dashboard config — no custom code)"

# Metrics
duration: 11min
completed: 2026-03-03
---

# Phase 22 Plan 02: Modern Auth Methods — Login UI Summary

**Google OAuth button, magic link mode toggle, forgot-password + reset-password pages, and PasswordResetEmail template — full login-side UI consuming Plan 01 server actions**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-03T14:53:30Z
- **Completed:** 2026-03-03T15:04:19Z
- **Tasks:** 4 (+ 1 manual config step documented)
- **Files modified:** 4

## Accomplishments

- Login page upgraded with Google OAuth button, magic link toggle (?mode=magic-link), forgot password link, and success param handling (?success=magic-link confirmation screen, ?success=password-reset cyan success banner)
- Forgot-password page created as server component with handleReset action, confirmation screen on success, error banner on failure
- Reset-password page created as client component — uses onAuthStateChange to detect PASSWORD_RECOVERY event from URL hash fragment, disables form until session ready, validates password match and length
- PasswordResetEmail template created following Phase 21 BaseLayout pattern with cyan CTA button and security note

## Task Commits

Each task was committed atomically:

1. **Tasks 1a+1b: Login page — Google OAuth, magic link, forgot password** - `fe31ac3` (feat)
2. **Task 2: Forgot-password page** - `9e14fd9` (feat)
3. **Task 3: Reset-password client component** - `11b78a9` (feat)
4. **Task 4: PasswordResetEmail template** - `8cfe5ee` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/(auth)/login/page.tsx` — Updated: Google OAuth button + or-divider, ?mode=magic-link form toggle, forgot password link, ?success=password-reset/magic-link handling, test users preserved
- `app/(auth)/forgot-password/page.tsx` — New: email form with server action, success/error states, consistent design tokens
- `app/(auth)/reset-password/page.tsx` — New: client component, PASSWORD_RECOVERY event listener, form disabled until session ready, redirects to /login?success=password-reset
- `lib/email/templates/PasswordResetEmail.tsx` — New: BaseLayout wrapper, resetUrl prop, cyan CTA, security note, matches Phase 21 template pattern

## Decisions Made

- **Reset-password must be a client component:** Supabase password reset emails use `#access_token=...&type=recovery` URL hash fragments. SSR cannot read hash fragments. Using `onAuthStateChange` to detect `PASSWORD_RECOVERY` event ensures the browser client picks up the recovery session before form submission.
- **Browser client calls updateUser directly:** The `updatePassword` server action uses the server-side Supabase client, which won't have the recovery session established from the hash. The browser client already has it via the PASSWORD_RECOVERY event, so `supabase.auth.updateUser` is called directly.
- **Success styling is cyan (not red):** `?success=password-reset` banner uses cyan to clearly distinguish it from error banners which use `signal-bad` red.
- **Task 5 is dashboard-only:** Email verification on signup is a Supabase "Confirm email" toggle — no custom code needed. Documented for manual verification.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing TypeScript errors in the repository (from deleted/modified files outside this plan's scope) did not affect the new files.

## User Setup Required

**Task 5 (manual):** Verify Supabase Dashboard > Authentication > Email Provider > "Confirm email" is enabled. If not enabled, enable it. No code changes are needed — the existing `signUp` function and auth callback route (Plan 01) handle the full email verification flow.

## Next Phase Readiness

- All login-side UI complete — Google OAuth, magic link, password reset, forgot password
- Ready for Phase 23: Onboarding Wizard (post-invite stepper, role-specific intro, dashboard redirect)
- Supabase "Confirm email" dashboard config should be verified before first user signups

## Self-Check: PASSED

All files exist and all commits verified:
- `app/(auth)/login/page.tsx` - FOUND
- `app/(auth)/forgot-password/page.tsx` - FOUND
- `app/(auth)/reset-password/page.tsx` - FOUND
- `lib/email/templates/PasswordResetEmail.tsx` - FOUND
- Commit fe31ac3 - FOUND
- Commit 9e14fd9 - FOUND
- Commit 11b78a9 - FOUND
- Commit 8cfe5ee - FOUND

---
*Phase: 22-modern-auth-methods*
*Completed: 2026-03-03*
