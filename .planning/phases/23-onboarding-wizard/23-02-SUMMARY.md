---
phase: 23-onboarding-wizard
plan: 02
subsystem: auth
tags: [nextjs, react, client-component, wizard, onboarding, typescript]

# Dependency graph
requires:
  - phase: 23-onboarding-wizard
    plan: 01
    provides: completeOnboarding server action, has_completed_onboarding flag, dashboard redirect guard
provides:
  - (onboarding) Next.js route group with minimal sidebar-free layout
  - /onboarding server page with auth/profile/onboarding-complete guards
  - OnboardingWizard client component with 3-step flow and role-specific content
affects: [new users hitting /onboarding, role-specific dashboard routing post-wizard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route group layout pattern: (onboarding) with ThemeToggle, no sidebar or header"
    - "useState-based multi-step wizard: no external stepper library needed for 3 steps"
    - "role-specific content via switch on profile.role in sub-component"
    - "useTransition for async server action + router.push redirect on success"

key-files:
  created:
    - app/(onboarding)/layout.tsx
    - app/(onboarding)/onboarding/page.tsx
    - features/onboarding/components/OnboardingWizard.tsx

key-decisions:
  - "useState(step) used instead of external stepper library — sufficient for 3 steps, zero dependency overhead"
  - "RoleIntroContent extracted as separate sub-component to keep OnboardingWizard readable"
  - "Browser Intl.DateTimeFormat().resolvedOptions().timeZone used as timezone default — auto-detects locale without requiring user input"
  - "dfy role has two switch branches (isOrgOwner true/false) — owner sees agency setup content, member sees team join content"
  - "Avatar preview shown conditionally only if profile.avatar_url exists — Google OAuth users get photo preview, email/magic link users see no image"
  - "getUserMembership wrapped in .catch(() => null) server-side — non-DFY roles have no org membership and must not throw"

patterns-established:
  - "(onboarding) route group pattern: minimal layout, no sidebar, ThemeToggle top-right"
  - "Server page guard chain: auth → profile → onboarding flag → render (each redirects on failure)"
  - "Role-specific wizard content: switch on role in sub-component, passed organizationName + isOrgOwner as props"

# Metrics
duration: 8min
completed: 2026-03-03
---

# Phase 23 Plan 02: Onboarding Wizard UI Summary

**Minimal (onboarding) route group with sidebar-free layout, server page auth/profile/flag guards, and 3-step OnboardingWizard with role-specific intro content for all 5 roles**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-03-03
- **Tasks:** 3 (Task 0: verification-only, Tasks 1-2: implementation)
- **Files created:** 3

## Accomplishments

- Verified old Phase 20 onboarding stepper form files (`features/projects/components/tabs/onboarding/*`) are fully deleted with no stale imports remaining
- Created `app/(onboarding)/layout.tsx` — minimal layout with `bg-bg-void`, no sidebar, ThemeToggle positioned top-right
- Created `app/(onboarding)/onboarding/page.tsx` — server component with three-guard chain: unauthenticated → `/login`, no profile → `/login`, already onboarded → `DASHBOARD_ROUTES[role]`; passes `profile`, `organizationName`, and `isOrgOwner` to wizard
- Created `features/onboarding/components/OnboardingWizard.tsx` — `'use client'` component with useState-based 3-step flow:
  - Step 1: Display name input (required, blocks Continue when empty) + timezone input (auto-detected via `Intl.DateTimeFormat`) + email read-only + avatar preview
  - Step 2: Role-specific intro via `switch(profile.role)` — distinct icon, heading, and bullet points for admin/internal, dfy-owner, dfy-member, dev, and client roles
  - Step 3: `CheckCircle2` confirmation screen, calls `completeOnboarding({ name, timezone })` via `useTransition`, redirects to `DASHBOARD_ROUTES[profile.role]` on success
- Cyan-600 step indicator dots, Back buttons on steps 2 and 3, `toast.error` on failure

## Task Commits

1. **Task 0: Verify old onboarding flow cleanup** — verification-only, no commit needed (confirmed clean)
2. **Task 1: Route group layout + server page** — `001602e` (feat)
3. **Task 2: OnboardingWizard component** — `7019f45` (feat)

## Files Created

- `app/(onboarding)/layout.tsx` — Minimal centered layout with ThemeToggle, no sidebar
- `app/(onboarding)/onboarding/page.tsx` — Server page with auth guard chain and org membership fetch
- `features/onboarding/components/OnboardingWizard.tsx` — 3-step wizard client component with role-specific content

## Decisions Made

- `useState(step)` used — no external stepper library needed for a 3-step linear flow
- `RoleIntroContent` extracted as sub-component — keeps `OnboardingWizard` readable, accepts `role`, `organizationName`, `isOrgOwner`
- `Intl.DateTimeFormat().resolvedOptions().timeZone` provides sensible timezone default without requiring user input
- `dfy` role split into two branches: owner gets "Your agency is set up" copy, member gets "You've joined {orgName}" copy
- Avatar preview shown only when `profile.avatar_url` exists — keeps Step 1 clean for non-OAuth users
- `getUserMembership` wrapped in `.catch(() => null)` — non-DFY users have no org and should not error

## Deviations from Plan

None - plan executed exactly as written.

## TypeScript Status

No errors in new files. Pre-existing errors in `.next/types/validator.ts` (deleted route modules), deliverables components, platejs modules, and `@gsap/react` types are out-of-scope and documented in 23-01 SUMMARY.

## Next Phase Readiness

- Onboarding wizard is fully functional: `/onboarding` → 3-step wizard → `completeOnboarding()` → role-specific dashboard
- Foundation (Plan 01) + UI (Plan 02) together deliver the complete post-invite onboarding experience
- Migration must be applied to Supabase before `/onboarding` becomes live for new users

## Self-Check: PASSED

- app/(onboarding)/layout.tsx: FOUND
- app/(onboarding)/onboarding/page.tsx: FOUND
- features/onboarding/components/OnboardingWizard.tsx: FOUND
- 23-02-SUMMARY.md: FOUND
- Commit 001602e (Task 1): FOUND
- Commit 7019f45 (Task 2): FOUND

---
*Phase: 23-onboarding-wizard*
*Completed: 2026-03-03*
