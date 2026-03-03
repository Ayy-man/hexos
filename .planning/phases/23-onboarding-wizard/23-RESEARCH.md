# Phase 23: Onboarding Wizard - Research

**Researched:** 2026-03-03
**Domain:** Post-invite onboarding wizard — Supabase migration, Next.js App Router route group, multi-step client component, dashboard redirect guard
**Confidence:** HIGH — Full implementation plan pre-exists in `docs/plans/2026-03-03-auth-invite-implementation-plan.md` (Tasks 11-14); Phase 22 is complete; all patterns are verified in the codebase

---

## Summary

Phase 23 builds on the completed Phase 22 (Modern Auth Methods) to add a post-invite onboarding wizard. When a new user accepts an invite (via email/password, Google OAuth, or magic link), they currently land directly at their role-specific dashboard. Phase 23 interposes a 2-3 step wizard: profile completion → role-specific intro → done/redirect. The wizard is gated by a new `has_completed_onboarding BOOLEAN DEFAULT false` column on the `profiles` table.

The full implementation is already designed in `docs/plans/2026-03-03-auth-invite-implementation-plan.md` (Tasks 11-14) with exact SQL, TypeScript, and TSX code. This phase is 4 tasks: (1) migration + type update, (2) onboarding route group + wizard page + OnboardingWizard component, (3) dashboard layout redirect guard, (4) `completeOnboarding` server action. The auth callback route (`app/auth/callback/route.ts`) built in Phase 22 currently redirects post-invite users to `getRedirectForRole()` output (e.g., `/dashboard/dfy`) — after this phase, new users will hit the dashboard redirect guard and be bounced to `/onboarding` instead.

The existing `onboarding_status` JSONB column (used by the `onborda` tour system) remains untouched. The `OnboardingShell` / `OnboardingWrapper` / tour system in `features/onboarding/` is NOT removed — Phase 23 adds `has_completed_onboarding` for the new wizard gate but does not replace the existing tour overlay system. The design doc says "Replaces existing onboarding flow entirely" but the implementation plan code shows they coexist: the tour system continues running on top of the dashboard while the new wizard is a separate `/onboarding` route.

**Primary recommendation:** Follow Tasks 11-14 from the pre-written implementation plan exactly. The OnboardingWizard component is the only substantial piece not fully specified — implement it as a `useState`-based multi-step client component with role-specific Step 2 content.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.8.0 | Server-side Supabase client | Already used; profile update via `createClient()` |
| `@supabase/supabase-js` | ^2.89.0 | Supabase JS client | Core SDK; profile `update()` call |
| `next` | 16.1.0 | App Router route groups, server components | Already used; `(onboarding)` route group pattern |
| `react-hook-form` | ^7.69.0 | Form state management | Already installed; use for Step 1 profile form |
| `zod` | ^4.2.1 | Schema validation | Already installed; validate profile fields |
| `@hookform/resolvers` | ^5.2.2 | zod + react-hook-form bridge | Already installed |
| `sonner` | ^2.0.7 | Toast notifications | Already used throughout; success/error feedback |
| `framer-motion` | ^12.24.7 | Step transition animations | Already installed; optional step transitions |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.562.0 | Icons for wizard UI | Step indicators, completion checkmarks |
| `next-themes` | ^0.4.6 | Theme toggle in onboarding layout | Via existing `ThemeToggle` component |
| `date-fns` | ^4.1.0 | Timezone display formatting | If showing timezone in Step 1 |

### No New Packages Required

All needed libraries are already installed. The `(onboarding)` route group, step state management, and form handling use patterns already established in the codebase.

**Installation:** None required.

---

## Architecture Patterns

### Existing Structure to Build On

```
app/
├── (auth)/               # Minimal centered layout — pattern to follow
│   ├── layout.tsx        # min-h-screen flex items-center justify-center bg-bg-void
│   └── login/page.tsx
├── (dashboard)/
│   └── layout.tsx        # Will add onboarding redirect guard at line ~47
├── auth/
│   └── callback/route.ts # Phase 22 — redirects to /dashboard after invite acceptance
│                          # New users hit dashboard → bounce to /onboarding
└── (onboarding)/         # NEW: minimal layout, no sidebar
    ├── layout.tsx
    └── onboarding/page.tsx

features/onboarding/
├── actions/
│   ├── onboardingActions.ts   # Existing: tour completion (keep as-is)
│   └── completeOnboarding.ts  # NEW: sets has_completed_onboarding = true
├── components/
│   ├── OnboardingWrapper.tsx  # Existing: tour auto-start (keep as-is)
│   ├── TourCard.tsx           # Existing: tour card UI (keep as-is)
│   └── OnboardingWizard.tsx   # NEW: multi-step wizard client component
└── lib/
    └── tours.ts               # Existing: tour step definitions (keep as-is)

lib/auth/
├── types.ts     # Add has_completed_onboarding?: boolean to Profile
└── cached.ts    # getAuthProfile() uses select('*') — already fetches new column

supabase/migrations/
└── 20260303000001_onboarding_flag.sql  # NEW: has_completed_onboarding + backfill
```

### Pattern 1: (onboarding) Route Group — Minimal Layout

**What:** A route group with a simple centered layout, no sidebar, no AppSidebar overhead. Same pattern as `(auth)`.

**When to use:** Any full-page experience outside the dashboard shell (auth pages, onboarding wizard).

```tsx
// app/(onboarding)/layout.tsx
import { ThemeToggle } from '@/components/theme-toggle'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-bg-void relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-center min-h-screen p-4">
        {children}
      </div>
    </div>
  )
}
```

### Pattern 2: Server Component Page — Auth Check + Profile Fetch

**What:** The `onboarding/page.tsx` is a server component that guards auth, checks `has_completed_onboarding`, fetches org membership for DFY users, and passes data down to the `OnboardingWizard` client component.

**When to use:** Every protected page that needs profile data before rendering.

```tsx
// app/(onboarding)/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser, getAuthProfile } from '@/lib/auth/cached'
import { DASHBOARD_ROUTES, type Profile } from '@/lib/auth/types'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { getUserMembership } from '@/lib/api/organizations'

export default async function OnboardingPage() {
  const { user, error: authError } = await getAuthUser()
  if (authError || !user) redirect('/login')

  const profile = await getAuthProfile()
  if (!profile) redirect('/login')

  // Completed onboarding users go directly to their dashboard
  if ((profile as any).has_completed_onboarding) {
    redirect(DASHBOARD_ROUTES[(profile as Profile).role] || '/dashboard')
  }

  // Get org info (relevant for dfy_first and dfy_team roles)
  const membership = await getUserMembership(user.id).catch(() => null)

  return (
    <OnboardingWizard
      userId={user.id}
      profile={profile as Profile}
      organizationName={membership?.organization?.name || null}
    />
  )
}
```

### Pattern 3: Multi-Step Client Component (OnboardingWizard)

**What:** `useState`-based stepper with 2-3 steps. No external stepper library needed — simple step index + conditional rendering is sufficient for 2-3 steps.

**When to use:** Short wizard flows (≤5 steps) where no step dependencies or branching logic exist.

```tsx
// features/onboarding/components/OnboardingWizard.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from '../actions/completeOnboarding'
import { DASHBOARD_ROUTES, type Profile } from '@/lib/auth/types'
import { toast } from 'sonner'

interface OnboardingWizardProps {
  userId: string
  profile: Profile
  organizationName: string | null
}

export function OnboardingWizard({ userId, profile, organizationName }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [name, setName] = useState(profile.name || '')
  const [timezone, setTimezone] = useState(
    profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [isPending, startTransition] = useTransition()

  const totalSteps = 3

  const handleComplete = () => {
    startTransition(async () => {
      const result = await completeOnboarding({ name, timezone })
      if (result.success) {
        router.push(DASHBOARD_ROUTES[profile.role] || '/dashboard')
      } else {
        toast.error(result.error || 'Failed to complete onboarding')
      }
    })
  }

  // Step 1: Profile completion
  // Step 2: Role-specific intro
  // Step 3: Done (or redirect directly from Step 2 "Go to Dashboard" CTA)
}
```

**Note:** The implementation plan shows Step 3 as a "Done" confirmation before redirect. This can be simplified to redirect from Step 2 completion directly if preferred — keep it simple.

### Pattern 4: Dashboard Redirect Guard

**What:** In the dashboard layout, after the profile check, add a single guard that bounces unonboarded users to `/onboarding`.

**When to use:** Any layout that wraps authenticated pages that require onboarding completion.

```typescript
// In app/(dashboard)/layout.tsx — after line 47 (after the !profile check)
if (!(profile as any).has_completed_onboarding) {
  redirect('/onboarding')
}
```

**Critical:** This must be placed BEFORE the heavy data fetches (notifications, project stats, etc.) that follow in the layout. Bouncing early avoids unnecessary DB calls.

### Pattern 5: completeOnboarding Server Action

**What:** Server action that updates the profile atomically — sets `has_completed_onboarding = true` and any profile fields collected in Step 1.

```typescript
// features/onboarding/actions/completeOnboarding.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(data: {
  name?: string
  timezone?: string
  city?: string
  country?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const updates: Record<string, unknown> = {
    has_completed_onboarding: true,
  }

  if (data.name) updates.name = data.name
  if (data.timezone) updates.timezone = data.timezone
  if (data.city) updates.city = data.city
  if (data.country) updates.country = data.country

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
```

### Pattern 6: Step 2 Role-Specific Content

Each role sees different Step 2 content:

| Role | Invite Type | Step 2 Content |
|------|------------|----------------|
| `admin` / `internal` | admin/internal invite | "Welcome to the team" + tools overview (brief admin panel walkthrough) |
| `dfy` (org owner) | `dfy_first` invite | "You're setting up your agency" + confirm org name display (org created during invite acceptance) |
| `dfy` (team member) | `dfy_team` invite | "You've joined {org name}" + shows team intro |
| `dev` | `dev_solo` / `dev_team` invite | "Welcome to the dev network" + skills/availability prompt |
| `client` | client invite (if ever) | "Your project dashboard" + shows assigned project |

Implementation: Use a `switch (profile.role)` in the Step 2 render section of `OnboardingWizard`.

### Anti-Patterns to Avoid

- **Don't use Stepperize or an external stepper library:** The phase description mentions Stepperize, but Phase 20 (Onboarding Stepper Form) has been superseded. Phase 23's wizard is simple enough for `useState`-based step management. No new library is needed.
- **Don't remove the existing `onborda` tour system:** The `OnboardingShell`, `OnboardingWrapper`, and tours in `features/onboarding/lib/tours.ts` remain in the dashboard layout. The new wizard is a separate pre-dashboard flow, not a replacement of the tour overlays.
- **Don't put the redirect guard after the data fetches:** The dashboard layout fetches 11+ data sources via `Promise.all()`. Place the `redirect('/onboarding')` guard before these fetches to avoid unnecessary DB calls for users who will be immediately bounced.
- **Don't pass `has_completed_onboarding` in Profile type as required:** Mark it optional (`has_completed_onboarding?: boolean`) because existing users may have `null` (or `undefined` in TypeScript) until the migration backfill runs. The guard `!(profile as any).has_completed_onboarding` correctly handles `null`, `false`, and `undefined` as "not completed."
- **Don't create a new supabase profile update function:** The `completeOnboarding` action writes directly to the profiles table using `createClient()`. Do not try to reuse `updateCurrentUserProfile()` from `lib/api/profiles.ts` — that function's `ProfileUpdate` type doesn't include `has_completed_onboarding` and adding it there is too broad a change.
- **Don't redirect from onboarding wizard to `/dashboard`:** Use `DASHBOARD_ROUTES[profile.role]` for role-specific landing. Redirecting to `/dashboard` works but sends all users through an extra redirect hop.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step state management | Custom stepper library | `useState(step)` | 2-3 steps: a stepper library adds complexity for no benefit |
| Profile field update | New Supabase function | Direct `.update()` in the server action | `ProfileUpdate` type doesn't need to grow; action handles the new field |
| Auth session check | Custom auth guard | `getAuthUser()` + `getAuthProfile()` from `lib/auth/cached.ts` | React.cache() deduplication; same pattern as dashboard layout |
| Timezone detection | Custom browser API | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Browser API, no library needed |
| Org name lookup | New org API function | `getUserMembership(user.id)` from `lib/api/organizations.ts` | Already returns org info with a single join |

**Key insight:** This phase is primarily wiring — the DB update, auth pattern, and org lookup all already exist. The only new code is the wizard UI and the redirect guard.

---

## Common Pitfalls

### Pitfall 1: Dashboard Layout Fetches Before Redirect Guard

**What goes wrong:** The `has_completed_onboarding` redirect check is placed after the `Promise.all([...])` block that fetches 11 data sources. Every time a new user hits the dashboard URL, 11 DB queries run before they're redirected to `/onboarding`.

**Why it happens:** The existing guard pattern (auth check, profile check) is at the top, but the temptation is to add the onboarding check near where `profile` first renders content.

**How to avoid:** Add the check immediately after the `!profile` guard (around line 47 of the dashboard layout), before the `isAdminOrInternal` / `isDev` flags and before the `Promise.all()` block.

**Warning signs:** Performance profiling shows unexpected DB queries for new users; onboarding redirect works but is slow.

---

### Pitfall 2: Existing Users Get Bounced to /onboarding

**What goes wrong:** After the migration adds `has_completed_onboarding BOOLEAN DEFAULT false`, all existing users now have `false` and get redirected to `/onboarding` on their next login.

**Why it happens:** Migration doesn't backfill existing users to `true`.

**How to avoid:** The migration MUST include the backfill:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
-- Backfill: all existing users with a role have implicitly completed onboarding
UPDATE public.profiles SET has_completed_onboarding = true WHERE role IS NOT NULL;
```
This is already in the implementation plan (Task 11). Do not omit the UPDATE statement.

**Warning signs:** All existing users are suddenly redirected to onboarding on first login after deployment.

---

### Pitfall 3: getAuthProfile() Caches Stale has_completed_onboarding

**What goes wrong:** After `completeOnboarding` server action sets `has_completed_onboarding = true`, the wizard does `router.push('/dashboard')`. The dashboard layout calls `getAuthProfile()` which still returns `false` because React.cache() has the old value cached in the same request.

**Why it happens:** React.cache() deduplicates within a single server request. `router.push()` triggers a new navigation, which is a new request — so the cache is fresh. This is NOT actually a problem with `router.push()`.

**How to avoid:** No action needed for `router.push()`. However, if the wizard uses `redirect()` from next/navigation instead of `router.push()`, the behavior is the same (new request, fresh cache). The `revalidatePath('/dashboard')` in `completeOnboarding` also invalidates Next.js's route cache.

**Warning signs:** After wizard completion, the dashboard redirects BACK to `/onboarding`. If this happens, check that the `UPDATE` ran successfully and that the profile query includes the new column.

---

### Pitfall 4: acceptInvitation redirect_to Still Points to Dashboard (Correct Behavior)

**What goes wrong (false alarm):** The `getRedirectForRole()` function in `lib/api/invitations.ts` returns `/dashboard/dfy`, `/dashboard/dev`, etc. After Phase 23, new users get redirected there and immediately bounced to `/onboarding`. This double-redirect is intentional.

**Why it's fine:** The auth callback redirects to the dashboard, which guards against `has_completed_onboarding = false` and redirects to `/onboarding`. This is the correct two-step flow. Modifying `getRedirectForRole` to return `/onboarding` directly would skip the guard logic and create a different code path to maintain.

**How to avoid:** Do NOT modify `lib/api/invitations.ts`. The double redirect is acceptable (two HTTP 307s). If performance is a concern, `getRedirectForRole` can return `/onboarding` directly, but this is an optimization, not a requirement.

---

### Pitfall 5: OnboardingWizard Rendered for Dev Skills Step

**What goes wrong:** Step 2 for `dev` role is supposed to show "skills/availability setup." The plan calls out `dev_skills` and `dev_availability` tables. Implementing a full skills selector in the wizard adds significant complexity.

**Why it happens:** The design doc mentions it, but the implementation plan Task 12 says "quick skills/availability setup (reuses dev_skills + dev_availability tables)" without specifying the exact UI.

**How to avoid:** Keep Step 2 for `dev` role minimal — just show a brief intro message about the dev network, with a link to the settings page where they can set up skills later. Do not build a full inline skills editor in the wizard. This is consistent with "role-specific intro" framing.

---

### Pitfall 6: Missing `(onboarding)` Route Group — Layout Bleeds

**What goes wrong:** The onboarding page is placed at `app/onboarding/page.tsx` instead of `app/(onboarding)/onboarding/page.tsx`, causing it to use the root `app/layout.tsx` with no intermediate layout, or accidentally picking up the dashboard layout if nested incorrectly.

**How to avoid:** The route must be at `app/(onboarding)/onboarding/page.tsx`. The `(onboarding)` directory is the route group that provides the minimal layout. The URL is `/onboarding` (route groups don't appear in URLs).

---

## Code Examples

Verified patterns from the pre-existing implementation plan and codebase:

### Migration (Task 11)

```sql
-- supabase/migrations/20260303000001_onboarding_flag.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Backfill: existing users have implicitly completed onboarding
UPDATE public.profiles SET has_completed_onboarding = true WHERE role IS NOT NULL;
```

### Profile Type Update (Task 11)

```typescript
// lib/auth/types.ts — add to Profile interface
export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string | null
  logo_url?: string | null
  city?: string | null
  country?: string | null
  timezone?: string | null
  created_at: string
  last_seen_at?: string | null
  has_completed_onboarding?: boolean  // ADD THIS
}
```

### Dashboard Layout Redirect Guard (Task 13)

```typescript
// app/(dashboard)/layout.tsx — insert after the !profile guard (~line 47)
// BEFORE the isAdminOrInternal / isDev lines and Promise.all()

if (!(profile as any).has_completed_onboarding) {
  redirect('/onboarding')
}
```

Note: `getAuthProfile()` uses `select('*')` so it already fetches the new column without any changes to `lib/auth/cached.ts`.

### completeOnboarding Server Action (Task 14)

```typescript
// features/onboarding/actions/completeOnboarding.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding(data: {
  name?: string
  timezone?: string
  city?: string
  country?: string
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const updates: Record<string, unknown> = {
    has_completed_onboarding: true,
  }

  if (data.name) updates.name = data.name
  if (data.timezone) updates.timezone = data.timezone
  if (data.city) updates.city = data.city
  if (data.country) updates.country = data.country

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
```

### Step 2 Role Branch (in OnboardingWizard)

```tsx
// Inside OnboardingWizard — step 2 render
function RoleIntroStep({ profile, organizationName }: { profile: Profile; organizationName: string | null }) {
  switch (profile.role) {
    case 'admin':
    case 'internal':
      return <AdminIntro />
    case 'dfy':
      return organizationName
        ? <DfyTeamIntro orgName={organizationName} />
        : <DfyOwnerIntro orgName={organizationName} />
    case 'dev':
      return <DevIntro />
    case 'client':
      return <ClientIntro />
    default:
      return null
  }
}
```

**Note:** The `dfy_first` vs `dfy_team` distinction is not directly available on the profile (it's on the invitation type). Use `organizationName` as the proxy: if the org was just created for this user (dfy_first), they're the owner; if they joined an existing org (dfy_team), `organizationName` will still be present. In practice, both dfy invite types set `role: 'dfy'` on the profile. The `getUserMembership()` call returns org info regardless of whether they're owner or member. The distinction for Step 2 copy can be inferred from org membership role if needed.

---

## Integration with Phase 22 Auth Flows

Phase 22 built `app/auth/callback/route.ts` which handles all auth flows:

1. **Email/password signup** (via invite page): User signs up → invitation accepted → redirect to `/dashboard/dfy` (or role-specific) → dashboard guard bounces to `/onboarding`
2. **Google OAuth** (via invite page): OAuth callback → invitation accepted → `result.redirect_to` (e.g., `/dashboard`) → dashboard guard bounces to `/onboarding`
3. **Magic link** (via invite page): Same as OAuth
4. **Existing users**: Auth callback checks `profile.role` → redirects to `/dashboard` → guard sees `has_completed_onboarding = true` (after backfill) → no bounce

The dashboard layout redirect guard is the single integration point. No changes to `app/auth/callback/route.ts` are needed.

---

## Files to Create / Modify

Complete change set for Phase 23 (Tasks 11-14):

### New Files

| File | Task | Notes |
|------|------|-------|
| `supabase/migrations/20260303000001_onboarding_flag.sql` | 11 | ALTER + UPDATE backfill |
| `app/(onboarding)/layout.tsx` | 12 | Minimal layout with ThemeToggle |
| `app/(onboarding)/onboarding/page.tsx` | 12 | Server component: auth guard + profile fetch |
| `features/onboarding/components/OnboardingWizard.tsx` | 12 | Client component: 3-step wizard |
| `features/onboarding/actions/completeOnboarding.ts` | 14 | Server action: update profile + set flag |

### Modified Files

| File | Task | Change |
|------|------|--------|
| `lib/auth/types.ts` | 11 | Add `has_completed_onboarding?: boolean` to Profile |
| `app/(dashboard)/layout.tsx` | 13 | Add redirect guard after `!profile` check |

### Not Modified

| File | Why |
|------|-----|
| `lib/auth/cached.ts` | `getAuthProfile()` uses `select('*')` — fetches new column automatically |
| `app/auth/callback/route.ts` | Phase 22 redirect behavior is correct; guard in dashboard layout handles the bounce |
| `lib/api/invitations.ts` | `getRedirectForRole()` can stay as-is; double redirect is acceptable |
| `features/onboarding/actions/onboardingActions.ts` | Existing tour system unchanged |
| `components/onboarding-shell.tsx` | Existing tour shell unchanged |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `onboarding_status JSONB` (tour completion tracking) | `has_completed_onboarding BOOLEAN` (wizard gate) | Simpler schema; boolean is sufficient for redirect gate vs JSONB tracking array |
| Tour overlay system (onborda) | Pre-dashboard wizard route | Wizard runs before dashboard; tours run after — they can coexist |
| Supabase migration file naming | `YYYYMMDD000001_name.sql` format | Consistent with existing migrations; use `20260303000001` to match today's date |

---

## Open Questions

1. **Should the wizard skip Step 2 for admin/internal users?**
   - What we know: Step 2 content for admin/internal is "Welcome to the team + brief overview of admin tools" — not much to show
   - What's unclear: Whether a 2-step wizard (Step 1 + Done) is better for admin
   - Recommendation: Keep Step 2 for all roles for consistency. Admin Step 2 can be a simple "Here's your command center" message with 2-3 bullet points. Minimal effort.

2. **Org owner vs org member distinction in Step 2 for DFY users**
   - What we know: `profile.role === 'dfy'` for both dfy_first and dfy_team invite types. `getUserMembership()` returns org info in both cases.
   - What's unclear: Whether to distinguish "You're setting up your agency" (dfy_first) vs "You've joined {org}" (dfy_team) requires knowing the membership role.
   - Recommendation: Check `membership?.role === 'owner'` from `getUserMembership()` result. If owner → show org setup copy. If member → show team intro copy.

3. **Avatar pre-population from Google OAuth**
   - What we know: When a user signs in via Google OAuth, Supabase stores their Google avatar URL in `auth.users.raw_user_meta_data.avatar_url`. The profile creation trigger may or may not copy this to `profiles.avatar_url`.
   - What's unclear: Whether the profile trigger copies the Google avatar automatically.
   - Recommendation: In Step 1, pre-populate the avatar display with `profile.avatar_url`. If it's already set from Google, show it. If not, offer the option to upload one later via Settings (don't add avatar upload to the wizard — keep it simple).

4. **pnpm build known failure**
   - What we know: `pnpm build` fails with Node.js v22 + Next.js 16.1.0 package config incompatibility — pre-existing issue documented in Phase 22 summaries
   - Recommendation: Use `pnpm tsc --noEmit` for TypeScript validation instead of `pnpm build`. This is the established verification pattern from Phase 22.

---

## Validation Architecture

> `config.json` has no `nyquist_validation` key — defaults to no validation requirement. Skipping this section.

---

## Sources

### Primary (HIGH confidence)

- `docs/plans/2026-03-03-auth-invite-implementation-plan.md` (Tasks 11-14) — Full implementation with exact SQL and TypeScript code
- `docs/plans/2026-03-03-auth-invite-system-design.md` (Phase 3 section) — Architecture decisions for the wizard
- `app/(dashboard)/layout.tsx` — Dashboard layout structure; location for redirect guard
- `app/(auth)/layout.tsx` — Route group layout pattern to follow for `(onboarding)`
- `lib/auth/types.ts` — Profile type to extend
- `lib/auth/cached.ts` — `getAuthProfile()` uses `select('*')` — confirmed no change needed
- `app/auth/callback/route.ts` — Phase 22 auth callback; redirects post-invite users to dashboard
- `lib/api/invitations.ts:627-640` — `getRedirectForRole()` — confirmed returns dashboard URLs, not `/onboarding`
- `lib/api/organizations.ts:246-266` — `getUserMembership()` — returns org + membership info for dfy step 2
- `features/onboarding/components/OnboardingWrapper.tsx` — Existing tour system; confirmed separate from wizard
- `supabase/migrations/20260109000001_onboarding_status.sql` — Existing `onboarding_status` JSONB column; confirmed different from new `has_completed_onboarding`
- `features/settings/actions/settingsActions.ts` — `updateProfileAction` pattern for profile update; `completeOnboarding` follows same pattern
- `lib/api/profiles.ts:175-230` — `ProfileUpdate` interface; confirmed `has_completed_onboarding` must be handled separately

### Secondary (MEDIUM confidence)

- `package.json` — Confirmed no new packages needed; all libraries already installed
- `.planning/phases/22-modern-auth-methods/22-RESEARCH.md` — Phase 22 patterns and pitfalls; informs integration approach
- `.planning/phases/22-modern-auth-methods/22-03-SUMMARY.md` — Phase 22 completion status and next phase readiness

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all APIs verified in installed versions
- Architecture: HIGH — implementation plan pre-written with exact code; existing patterns verified in codebase
- Pitfalls: HIGH — all pitfalls drawn from verified codebase patterns (existing migration, layout structure, cache behavior)
- Open questions: MEDIUM — org owner/member distinction and Google avatar pre-population require testing; no blockers

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (patterns are stable; 30-day validity appropriate)
