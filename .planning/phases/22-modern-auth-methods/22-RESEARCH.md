# Phase 22: Modern Auth Methods - Research

**Researched:** 2026-03-03
**Domain:** Supabase Auth (OAuth, Magic Links, Password Reset) + Next.js 16 App Router
**Confidence:** HIGH — Full implementation plan pre-exists in docs/plans/; codebase patterns are well-established from Phase 21

---

## Summary

Phase 22 adds Google OAuth, magic links, and password reset to an existing email/password Supabase auth system. The implementation plan is already written in full detail in `docs/plans/2026-03-03-auth-invite-implementation-plan.md` (Tasks 6–10) and the system design in `docs/plans/2026-03-03-auth-invite-system-design.md`. Phase 21 (invite pipeline fix) is already complete, meaning email templates, the invite page signout fix, expiry fixes, and the admin DFY toggle are all done. Phase 22 builds directly on that foundation.

The core of Phase 22 is a **unified `/auth/callback` route** that handles OAuth code exchange, magic link confirmation, and serves as the landing point after password reset email links. Each auth method passes an optional `token` (invitation token) parameter so the callback can accept an invitation after OAuth/magic-link signup. The login page (`app/(auth)/login/page.tsx`) and invite page (`app/invite/[token]/page.tsx`) both need updates to surface the new options. Two new pages are needed: `forgot-password` and `reset-password`.

The project already uses `@supabase/ssr ^0.8.0` and `@supabase/supabase-js ^2.89.0`, which fully support all three auth methods via `signInWithOAuth`, `signInWithOtp`, `resetPasswordForEmail`, and `updateUser`. No new packages are required. Google OAuth requires a one-time Supabase dashboard configuration (enable Google provider, add OAuth credentials) — this is a config step, not a code step.

**Primary recommendation:** Follow Tasks 6–10 from the pre-written implementation plan exactly. The code is fully specified; the work is primarily transcription + verification.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | ^0.8.0 | Server-side Supabase client with cookie-based sessions | Already used; SSR-correct cookie handling |
| `@supabase/supabase-js` | ^2.89.0 | Supabase JS client | Core SDK; all auth methods live here |
| `next` | 16.1.0 | App Router framework | Already used throughout |
| `resend` | ^4.8.0 | Email delivery | Already used for invite emails |
| `@react-email/components` | ^0.0.32 | Email template rendering | Already used; PasswordResetEmail optional |

### No New Packages Required

All auth methods (`signInWithOAuth`, `signInWithOtp`, `resetPasswordForEmail`, `updateUser`) are part of `@supabase/supabase-js`. The codebase already has everything needed.

**Installation:** None required.

---

## Architecture Patterns

### Existing Auth Structure

```
lib/auth/
├── actions.ts       # Server actions: signIn, signOut, signUp, signInAndReturn
│                    # Phase 22 adds: signInWithGoogle, signInWithMagicLink,
│                    #                resetPassword, updatePassword
├── cached.ts        # getAuthUser(), getAuthProfile() — React.cache() dedup
├── guards.ts        # requireAuth(), requireProfile(), requireRole()
└── types.ts         # UserRole, Profile, DASHBOARD_ROUTES

lib/supabase/
├── server.ts        # createClient() — cookie-based server client
├── middleware.ts    # updateSession() — refreshes session in middleware
├── admin.ts         # createAdminClient() — service role for invitations
└── client.ts        # createBrowserClient() — (if needed for client components)

app/(auth)/
├── layout.tsx       # Minimal center-aligned layout (bg-bg-void)
├── login/page.tsx   # Existing password form — Phase 22 adds Google + magic link
└── (new in Phase 22)
    ├── forgot-password/page.tsx
    └── reset-password/page.tsx

app/auth/
└── callback/route.ts  # NEW in Phase 22 — unified GET handler

app/invite/[token]/
└── page.tsx         # Existing — Phase 22 adds Google + magic link buttons
```

### Pattern 1: Unified Auth Callback Route

**What:** A single `app/auth/callback/route.ts` handles all OAuth/magic-link/password-reset redirects by exchanging the `code` for a session, then routing to the right destination.

**When to use:** Always — all new auth methods (Google OAuth, magic links) redirect to this single endpoint.

**Example (from implementation plan Task 6):**
```typescript
// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { acceptInvitation } from '@/lib/api/invitations'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token') // invitation token if from invite flow
  const next = searchParams.get('next') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Missing auth code')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication failed')}`)
  }

  // If this is an invite flow, accept the invitation
  if (token) {
    const result = await acceptInvitation(token, user.id)
    if (result.success) {
      return NextResponse.redirect(`${origin}${result.redirect_to}`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Check if user has a profile with a role (existing user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No account found. Please use an invitation link to join.')}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

### Pattern 2: Google OAuth Action (Server Action with redirect)

**What:** Server action that calls `signInWithOAuth` and redirects to Google's consent screen.

**When to use:** On the login page and invite page Google buttons.

```typescript
// lib/auth/actions.ts — add after signInAndReturn()
export async function signInWithGoogle(inviteToken?: string) {
  const supabase = await createClient()

  const redirectTo = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  if (inviteToken) {
    redirectTo.searchParams.set('token', inviteToken)
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo.toString(),
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url)
  }
}
```

### Pattern 3: Magic Link Action (returns result, no redirect)

**What:** Server action that calls `signInWithOtp` and returns success/error so the UI can show a confirmation state.

**When to use:** On the login page "Send magic link" button and invite page "Send magic link instead" button.

```typescript
// lib/auth/actions.ts — add after signInWithGoogle()
export async function signInWithMagicLink(
  email: string,
  inviteToken?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const redirectTo = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  if (inviteToken) {
    redirectTo.searchParams.set('token', inviteToken)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

### Pattern 4: Password Reset (two-step: request + update)

**What:** Two server actions — `resetPassword(email)` sends the email, `updatePassword(newPassword)` is called after the user lands on `/reset-password` (which is linked from the Supabase reset email).

```typescript
// lib/auth/actions.ts — add after signInWithMagicLink()
export async function resetPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

### Pattern 5: Login Page Mode Toggle (server component with searchParams)

**What:** Login page stays a server component; toggle between password mode and magic-link mode via `?mode=magic-link` search param. Confirmation state via `?success=magic-link`.

**Why:** Avoids converting the page to a client component. Consistent with how invite page uses `?mode=signup|login`.

**Mode states:**
- Default (no param): email + password + Google button + "Use magic link instead" link
- `?mode=magic-link`: email + "Send magic link" button + "Use password instead" link
- `?success=magic-link`: "Check your email" confirmation screen

### Pattern 6: Invite Page — Inline Google + Magic Link

**What:** On the invite page, add Google and magic link options above the existing signup/login form with an "or" divider. Both pass `token` to their respective actions so the callback can accept the invitation post-auth.

**Server actions inside the page:**
```typescript
async function handleGoogleSignIn() {
  'use server'
  await signInWithGoogle(token)
}

async function handleMagicLink() {
  'use server'
  const result = await signInWithMagicLink(invitation.email, token)
  if (!result.success) {
    redirect(`/invite/${token}?error=${encodeURIComponent(result.error || 'Failed to send magic link')}`)
  }
  redirect(`/invite/${token}?error=${encodeURIComponent('Check your email for a sign-in link')}&mode=signup`)
}
```

### Anti-Patterns to Avoid

- **Don't build a custom email verification flow:** Supabase handles email confirmation automatically when enabled in the dashboard. Just configure it; don't build a custom confirmation route.
- **Don't use `supabase.auth.signIn` (deprecated):** Use `signInWithPassword`, `signInWithOAuth`, `signInWithOtp`. The old unified `signIn` method is removed in v2.
- **Don't redirect to `/auth/callback` without a `code` param:** The callback route checks for `code`; magic link clicks from email DO carry a code. Only OAuth and magic link clicks use this route.
- **Don't call `signInWithOAuth` and wait for a return value for auth:** OAuth redirects the user away; the function redirects server-side. No callback or await is needed in the caller.
- **Don't put the reset-password page behind a login guard:** The user is in a password-reset session (not a full auth session) when they land on `/reset-password`. Checking for a full profile will incorrectly redirect them to login.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth code exchange | Custom token parsing | `supabase.auth.exchangeCodeForSession(code)` | PKCE flow, CSRF protection, refresh token — all handled |
| Magic link delivery | SMTP send + token generation | `supabase.auth.signInWithOtp({ email })` | Supabase generates token, handles delivery, expiry |
| Password reset email | Custom Resend call for reset | `supabase.auth.resetPasswordForEmail(email, { redirectTo })` | Supabase owns reset token lifecycle; use Resend only for branding if needed |
| Session refresh on callback | Manual cookie writes | `supabase.auth.exchangeCodeForSession()` | Writes auth cookies automatically via `@supabase/ssr` cookie adapter |
| Email verification | Custom confirm route | Supabase auto-sends on `signUp`; enable in dashboard | Verification is a Supabase feature, not a code feature |

**Key insight:** Supabase Auth handles every cryptographic operation (PKCE, HMAC tokens, session cookies). The application code is responsible only for routing (what to do after auth), not for the auth mechanics.

---

## Common Pitfalls

### Pitfall 1: Missing `NEXT_PUBLIC_APP_URL` in Supabase redirect allow-list

**What goes wrong:** OAuth/magic-link redirects fail with "Redirect URI not allowed" error from Supabase/Google.

**Why it happens:** Supabase requires all `redirectTo` URLs to be in the allow-list in the Supabase dashboard (Authentication > URL Configuration > Redirect URLs).

**How to avoid:** Add `http://localhost:3000/auth/callback` (dev) and `https://yourdomain.com/auth/callback` (prod) to Supabase redirect URL allow-list before testing. Also configure these as authorized redirect URIs in Google Cloud Console.

**Warning signs:** OAuth callback returns to login page with a Supabase error; or Google shows "redirect_uri_mismatch".

### Pitfall 2: `reset-password` page has no session (can't call `updateUser`)

**What goes wrong:** User clicks the reset link in their email, lands on `/reset-password`, and `supabase.auth.updateUser({ password })` fails with "Not authenticated".

**Why it happens:** The Supabase password reset email links to `/reset-password` but does NOT include a `code` param — it uses a different flow (the session is set via an implicit fragment, not exchangeCodeForSession). In Next.js App Router (SSR), the fragment is not accessible server-side.

**How to avoid:** The `/reset-password` page must be a **client component** (`'use client'`) that reads the hash fragment on the client, or use Supabase's `onAuthStateChange` listener to detect the `PASSWORD_RECOVERY` event. The implementation plan uses the `supabase.auth.updateUser({ password })` call which works if the user arrives via the reset link (Supabase sets a recovery session). The key is: `updateUser` must be called within the same browser session that was set by the reset link. This works fine in production if `/reset-password` reads the session from cookies (which Supabase SSR sets automatically from the reset link hash).

**Nuance for SSR:** The implementation plan's `reset-password` page is a server component calling `updateUser`. This works because Supabase's reset email sets a cookie-accessible session. However, if this doesn't work, the fallback is making `reset-password` a client component that calls an API route. Test this early.

**Warning signs:** `updateUser` returns "Not authenticated" on the reset-password page.

### Pitfall 3: Google OAuth on invite page — email mismatch

**What goes wrong:** User on invite page signs in with Google account whose email differs from the invitation email. The `acceptInvitation` in the callback succeeds (or fails silently) regardless of email match.

**Why it happens:** The callback route at `/auth/callback` calls `acceptInvitation(token, user.id)` but doesn't validate that `user.email === invitation.email`.

**How to avoid:** Inside the callback route, after `acceptInvitation` is called, check the invitation's email against the OAuth user's email. The `validateInvitation(token)` call inside `acceptInvitation` does NOT check email — it only checks token validity and expiry. Add an email check in the callback before calling `acceptInvitation`, OR add it inside `acceptInvitation` itself.

**Recommendation:** The implementation plan as written accepts any authenticated user for a given token — this is a deliberate trade-off (simpler UX). For production, add the email guard.

### Pitfall 4: `signInWithGoogle` is a server action — can't call from `onClick`

**What goes wrong:** Google button's `onClick` handler calls `signInWithGoogle()` as a regular function, which fails because server actions called from client code must use form actions or the `useTransition` + `startTransition` pattern.

**How to avoid:** Wrap the Google button in `<form action={signInWithGoogle}>`. This is consistent with how the rest of the codebase handles server actions (e.g., the existing `signIn` form on the login page, the `handleAccept` form on the invite page).

### Pitfall 5: Magic link sends to wrong email on invite page

**What goes wrong:** Invite page "Send magic link instead" calls `signInWithMagicLink(email, token)` but gets the email from `invitation.email` (pre-filled). If the user edits the email field, the magic link goes to a different email than the invitation.

**How to avoid:** Pass `invitation.email` hardcoded to `signInWithMagicLink` in the `handleMagicLink` server action — don't read from form data. The email on the invite page is fixed by the invitation.

### Pitfall 6: `app/auth/callback/` directory vs `app/(auth)/callback/` grouping

**What goes wrong:** Route file placed at `app/(auth)/callback/route.ts` instead of `app/auth/callback/route.ts`, causing the URL to be `/callback` (missing the `/auth/` prefix) in some Next.js versions, or the route group layout being applied.

**How to avoid:** The callback route MUST be at `app/auth/callback/route.ts` (no route group parentheses). This matches the `redirectTo` URL `/auth/callback` configured in all three auth actions. The `app/(auth)/` route group is for pages that use the minimal center-aligned auth layout; the callback route returns `NextResponse.redirect` and doesn't render a page, so it doesn't belong in the layout group.

### Pitfall 7: `NEXT_PUBLIC_APP_URL` not set — localhost fallback in production

**What goes wrong:** OAuth and magic link redirects use `http://localhost:3000/auth/callback` in production because `NEXT_PUBLIC_APP_URL` is not set in the deployment environment.

**How to avoid:** Ensure `NEXT_PUBLIC_APP_URL` is set in Vercel/production environment variables. The existing codebase already uses this variable (in `lib/api/email.ts:100`), so it should already be set. Verify before testing OAuth flows.

---

## Code Examples

Verified patterns from the pre-existing implementation plan and codebase:

### Auth Callback — Full Route

```typescript
// app/auth/callback/route.ts (new file — does not exist yet)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { acceptInvitation } from '@/lib/api/invitations'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token = searchParams.get('token')
  const next = searchParams.get('next') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Missing auth code')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication failed')}`)
  }

  if (token) {
    const result = await acceptInvitation(token, user.id)
    if (result.success) {
      return NextResponse.redirect(`${origin}${result.redirect_to}`)
    }
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No account found. Please use an invitation link to join.')}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

### Forgot Password Page

```tsx
// app/(auth)/forgot-password/page.tsx (new file)
import { resetPassword } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  async function handleReset(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    const result = await resetPassword(email)
    if (!result.success) {
      redirect(`/forgot-password?error=${encodeURIComponent(result.error || 'Failed to send reset email')}`)
    }
    redirect('/forgot-password?success=1')
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Check your email</h1>
        <p className="text-sm text-text-tertiary">
          If an account exists with that email, you&apos;ll receive a password reset link.
        </p>
        <a href="/login" className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400">
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Reset password</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      {error && (
        <div className="rounded-md bg-signal-bad-dim p-3 text-sm text-signal-bad border border-signal-bad/25">
          {error}
        </div>
      )}
      <form action={handleReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            Email
          </label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <Button type="submit" className="w-full">Send reset link</Button>
      </form>
      <div className="text-center">
        <a href="/login" className="text-sm text-text-tertiary hover:text-text-secondary">
          Back to sign in
        </a>
      </div>
    </div>
  )
}
```

### Login Page — Google Button (form action pattern)

```tsx
// Snippet for app/(auth)/login/page.tsx
// Add above the existing <form action={signIn}> form:

async function handleGoogleSignIn() {
  'use server'
  await signInWithGoogle()
}

// In JSX:
<form action={handleGoogleSignIn}>
  <button
    type="submit"
    className="w-full flex items-center justify-center gap-2 rounded-md border border-border-rule bg-bg-subtle px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-muted"
  >
    {/* Google SVG icon */}
    Continue with Google
  </button>
</form>

<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-border-rule" />
  </div>
  <div className="relative flex justify-center text-xs">
    <span className="bg-bg-void px-2 text-text-ghost">or</span>
  </div>
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase.auth.signIn({ provider })` | `supabase.auth.signInWithOAuth({ provider, options })` | Supabase v2 | `signIn` removed; must use method-specific APIs |
| Custom session management | `@supabase/ssr` cookie adapter | @supabase/ssr introduction | No manual JWT handling needed |
| Separate OAuth callback per provider | Unified `/auth/callback` route | Current best practice | One route handles all providers |
| Client-side OAuth redirect | Server action + `redirect(data.url)` | Next.js App Router | Server actions can redirect; no client JS needed for button |

**Deprecated/outdated:**
- `supabase.auth.signIn({ provider })`: Removed in v2. All existing code already uses v2 APIs.
- `createServerComponentClient` / `createRouteHandlerClient`: Deprecated in favor of unified `createServerClient` from `@supabase/ssr`. This project already uses the current pattern (`createClient` from `lib/supabase/server.ts`).

---

## Open Questions

1. **Password reset page — server vs client component**
   - What we know: `supabase.auth.updateUser({ password })` requires an active session. Supabase reset emails set a session via a URL fragment, which is not accessible in SSR.
   - What's unclear: Whether `@supabase/ssr` automatically picks up the reset session from the URL fragment via middleware cookie exchange, or whether the reset-password page must be a client component.
   - Recommendation: Implement as a server component first (per plan). If `updateUser` fails with "Not authenticated", convert to a client component using `createBrowserClient` and call an API route or the action directly. This is the most common reason a reset-password page requires client-side code.

2. **Email verification on signup — is it enabled in the Supabase project?**
   - What we know: The roadmap bullet says "Email verification on signup" is a requirement. The existing `signUp` function in `lib/auth/actions.ts` does not handle email confirmation.
   - What's unclear: Whether the Supabase project has email confirmation enabled, and whether a confirmation landing page or message is needed.
   - Recommendation: Check Supabase dashboard > Authentication > Email settings. If "Confirm email" is enabled, `signUp` will send a verification email automatically. A confirmation message on the signup flow (invite page) may be needed. The auth callback route at `/auth/callback` will handle the confirmation code exchange. No additional code needed for the mechanics — only a UI message like "Check your email to confirm your account."

3. **Google OAuth — account linking for existing password users**
   - What we know: The design doc notes "Supabase handles account linking if 'Confirm email' is enabled."
   - What's unclear: The exact behavior depends on Supabase project settings. If a user signed up with email/password (via invite), and later tries Google OAuth with the same email, Supabase may: (a) link the accounts automatically, (b) require email confirmation, or (c) return an error.
   - Recommendation: Do not add any custom account-linking logic. Let Supabase handle it. Note in the plan that this behavior depends on project settings and should be tested during UAT.

---

## Files to Create / Modify

This is the complete change set for Phase 22 (Tasks 6–10 from the implementation plan):

### New Files
| File | Task |
|------|------|
| `app/auth/callback/route.ts` | Task 6 |
| `app/(auth)/forgot-password/page.tsx` | Task 9 |
| `app/(auth)/reset-password/page.tsx` | Task 9 |

### Modified Files
| File | Task | Change |
|------|------|--------|
| `lib/auth/actions.ts` | Task 7 | Add `signInWithGoogle`, `signInWithMagicLink`, `resetPassword`, `updatePassword` |
| `app/(auth)/login/page.tsx` | Task 8 | Add Google button, magic link toggle, forgot password link |
| `app/invite/[token]/page.tsx` | Task 10 | Add Google button + magic link option above signup/login form |

### No Migrations Required
Google OAuth and magic links require zero DB schema changes. Password reset uses existing Supabase auth mechanisms. The `has_completed_onboarding` flag belongs to Phase 23, not Phase 22.

### External Config (manual, not code)
- Supabase dashboard: Enable Google provider, add OAuth credentials
- Supabase dashboard: Add `/auth/callback` to allowed redirect URLs
- Google Cloud Console: Add authorized redirect URIs

---

## Sources

### Primary (HIGH confidence)
- `docs/plans/2026-03-03-auth-invite-implementation-plan.md` (Tasks 6–10) — Full implementation with exact code
- `docs/plans/2026-03-03-auth-invite-system-design.md` (Phase 2 section) — Architecture decisions
- `lib/auth/actions.ts` — Existing auth action patterns to extend
- `lib/supabase/server.ts` — Client creation pattern used throughout
- `app/invite/[token]/page.tsx` — Invite page pattern (server actions, form action, redirect flow)
- `app/(auth)/login/page.tsx` — Login page structure to extend
- `lib/api/invitations.ts:412-526` — `acceptInvitation()` API (used in callback route)

### Secondary (MEDIUM confidence)
- `@supabase/supabase-js ^2.89.0` package.json — confirms all auth methods available in current version
- `lib/api/email.ts` — confirms `NEXT_PUBLIC_APP_URL` env var pattern already established

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all APIs already in installed version
- Architecture: HIGH — implementation plan pre-written with exact code; existing patterns verified in codebase
- Pitfalls: HIGH for redirect config, MEDIUM for reset-password session (SSR ambiguity is a known real-world issue)
- Open questions: LOW confidence on exact behavior — require manual testing/config verification

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (Supabase auth APIs are stable; 30-day validity appropriate)
