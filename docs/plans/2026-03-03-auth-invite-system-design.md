# Auth & Invite System Overhaul

**Date:** 2026-03-03
**Status:** Approved

## Overview

Comprehensive auth overhaul: fix the existing invite pipeline, add modern auth methods (Google OAuth, magic links, password reset), and build a clean onboarding wizard. Three phases, each end-to-end complete before moving on.

### Current State

- Email/password auth with Supabase SSR
- 5-role RBAC (admin, internal, dev, dfy, client)
- Invitation system ~90% built at API/DB layer (6 types, tokens, acceptance, seat management, RLS)
- Admin UI exists for inviting team, partners, devs, reviewing applications
- Org owners can invite teammates via TeamSettings component
- Resend configured but email templates directory is empty (0 templates)
- No OAuth, no magic links, no password reset, no onboarding

### Decisions

- **Auth methods:** Google OAuth + Magic Links + Password (all optional, user chooses)
- **DFY invites:** Admin toggles between "create new agency" or "add to existing agency" per invite
- **DFY self-service:** Org owners can invite up to 3 teammates directly (existing `max_seats: 3`)
- **Onboarding:** 2-3 step wizard after invite acceptance, replaces existing onboarding

---

## Phase 1 — Fix the Invite Pipeline

Unblocks everything. The API and DB are solid; the gaps are email delivery, a few bugs, and the admin DFY toggle.

### 1.1 Email Templates (React Email + Resend)

Four templates in `lib/email/templates/`, sharing a base layout with hexOS branding:

**`InvitationEmail.tsx`**
- Props: `inviterName`, `recipientEmail`, `role`, `organizationName?`, `acceptUrl`
- Content: "{inviter} invited you to join hexOS as a {role}"
- Prominent "Accept Invitation" CTA button
- Subtitle varies by type:
  - admin/internal: "Join the hexOS team"
  - dfy_first: "Set up your agency"
  - dfy_team: "Join {orgName}"
  - dev_solo/dev_team: "Start building"

**`ApplicationReceivedEmail.tsx`**
- Props: `applicantName`
- Content: "We received your application" + "We'll review it and get back to you"

**`ApplicationApprovedEmail.tsx`**
- Props: `applicantName`, `acceptUrl`
- Content: "You're in!" + "Accept Invitation" CTA button with token link

**`ApplicationRejectedEmail.tsx`**
- Props: `applicantName`
- Content: "Thanks for applying" + soft rejection message

### 1.2 Bug Fixes

**Expiry on creation:**
All `create*Invitation()` functions in `lib/api/invitations.ts` must explicitly set `expires_at` to `now + 7 days`. The DB default exists but the API can overwrite with undefined.

Affected functions:
- `createAdminInvitation()`
- `createDfyFirstInvitation()`
- `createTeamInvitation()`
- `createDevInvitation()`

**Duplicate invite detection:**
Add `hasExistingInvitation(email, orgId?)` check before insert in:
- `createAdminInvitation()`
- `createDfyFirstInvitation()`
- `createTeamInvitation()`
- `createDevInvitation()`

Return error instead of creating duplicate.

**Broken signout on invite page:**
In `/app/invite/[token]/page.tsx`, the "Sign in as {email}" link uses a client-side `onClick` that tries to call a server action. Replace with a proper `<form action={signOut}>` wrapper.

### 1.3 Admin DFY Toggle

In `AdminPartnersList.tsx` invite dialog, add a radio/select:

- **"Create new agency"** → uses `createDfyFirstInvitation()`, shows org name text field
- **"Add to existing agency"** → uses `createTeamInvitation(orgId, type: 'dfy_team')`, shows org dropdown populated from `getAllOrganizations('dfy_agency')`

### Files Changed (Phase 1)

| File | Change |
|------|--------|
| `lib/email/templates/InvitationEmail.tsx` | New |
| `lib/email/templates/ApplicationReceivedEmail.tsx` | New |
| `lib/email/templates/ApplicationApprovedEmail.tsx` | New |
| `lib/email/templates/ApplicationRejectedEmail.tsx` | New |
| `lib/email/templates/index.ts` | New (exports) |
| `lib/api/email.ts` | Wire templates to render + send |
| `lib/api/invitations.ts` | Fix expiry, add dup checks |
| `app/invite/[token]/page.tsx` | Fix signout action |
| `features/admin/components/AdminPartnersList.tsx` | Add DFY invite toggle |

---

## Phase 2 — Modern Auth Methods

### 2.1 Google OAuth

**Supabase config:** Enable Google provider in Supabase dashboard (Google Cloud OAuth credentials). No migration needed.

**New files:**
- `app/auth/callback/route.ts` — Exchanges auth code for session, checks profile, redirects to dashboard or onboarding

**Modified files:**
- `lib/auth/actions.ts` — Add `signInWithGoogle()` action calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
- `app/(auth)/login/page.tsx` — Add "Continue with Google" button above email/password form
- `app/invite/[token]/page.tsx` — Add Google option, validate invite email matches after OAuth callback

**Edge case:** User signs up via invite with password, later tries Google with same email. Supabase handles account linking if "Confirm email" is enabled.

### 2.2 Magic Links

**Supabase config:** Already supported out of the box. No provider config needed.

**Modified files:**
- `lib/auth/actions.ts` — Add `signInWithMagicLink(email)` calling `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
- `app/(auth)/login/page.tsx` — Add "Send magic link" secondary option below password field. User enters email, clicks button, sees "Check your email for a sign-in link"

**Same `/auth/callback/route.ts`** handles the magic link redirect.

### 2.3 Password Reset

**New files:**
- `app/(auth)/forgot-password/page.tsx` — Email input → `supabase.auth.resetPasswordForEmail(email)` → confirmation message
- `app/(auth)/reset-password/page.tsx` — New password form, accessed via Supabase reset email link
- `lib/email/templates/PasswordResetEmail.tsx` — Optional branded template (Supabase sends its own by default, but custom matches branding)

**Modified files:**
- `app/(auth)/login/page.tsx` — Add "Forgot password?" link below password field

### 2.4 Auth Callback Route

Single `app/auth/callback/route.ts` handles all flows:

1. Exchange code for session
2. Check if user has a profile
3. If from invite flow: validate and accept invitation
4. Redirect to onboarding (new user) or dashboard (existing user)

### Files Changed (Phase 2)

| File | Change |
|------|--------|
| `app/auth/callback/route.ts` | New — unified auth callback |
| `app/(auth)/forgot-password/page.tsx` | New |
| `app/(auth)/reset-password/page.tsx` | New |
| `lib/email/templates/PasswordResetEmail.tsx` | New (optional) |
| `lib/auth/actions.ts` | Add OAuth, magic link, reset actions |
| `app/(auth)/login/page.tsx` | Add Google, magic link, forgot password |
| `app/invite/[token]/page.tsx` | Add Google/magic link options |

---

## Phase 3 — Onboarding Wizard

### 3.1 Flow

After accepting an invite (or first OAuth/magic link login), user hits `/onboarding` instead of dashboard.

**Step 1 — Complete Profile**
- Pre-filled from invite data or OAuth (name, email, avatar from Google)
- User fills in: display name, avatar upload (or keep Google avatar), timezone (auto-detected with override), city/country (optional)
- Clean single-column form, matches existing design tokens

**Step 2 — Role-Specific Intro**
- **DFY owner (`dfy_first`):** "You're setting up your agency" → confirm org name, optional logo upload
- **DFY team (`dfy_team`):** "You've joined {org name}" → shows team members, what you can do
- **Dev (`dev_solo`):** "Welcome to the dev network" → quick skills/availability setup (reuses `dev_skills` + `dev_availability` tables)
- **Admin/Internal:** "Welcome to the team" → brief overview of admin tools
- **Client:** "Your project dashboard" → shows assigned project if any

**Step 3 — Done**
- "You're all set" confirmation → "Go to Dashboard" CTA
- Redirects to role-specific dashboard

### 3.2 Implementation

- New route: `app/(onboarding)/onboarding/page.tsx` with minimal layout (no sidebar)
- Add `has_completed_onboarding BOOLEAN DEFAULT false` to profiles table (one migration)
- Dashboard layout checks `profile.has_completed_onboarding` → if false, redirects to `/onboarding`
- Onboarding sets the flag to true on completion
- Existing onboarding components in `features/onboarding/` get replaced

### Files Changed (Phase 3)

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_onboarding_flag.sql` | New — add `has_completed_onboarding` to profiles |
| `app/(onboarding)/layout.tsx` | New — minimal layout |
| `app/(onboarding)/onboarding/page.tsx` | New — wizard page |
| `features/onboarding/` | Rewrite existing components |
| `lib/auth/types.ts` | Add `has_completed_onboarding` to Profile type |
| `app/(dashboard)/layout.tsx` | Add onboarding redirect check |
