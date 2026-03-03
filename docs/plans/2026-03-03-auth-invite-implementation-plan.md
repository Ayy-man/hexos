# Auth & Invite System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the invite email pipeline, add Google OAuth + magic links + password reset, and build a clean onboarding wizard.

**Architecture:** Three sequential phases. Phase 1 creates React Email templates and fixes invite bugs. Phase 2 adds a unified `/auth/callback` route handling Google OAuth, magic links, and password reset. Phase 3 replaces the existing onboarding with a step-based wizard gated by a `has_completed_onboarding` profile flag.

**Tech Stack:** Next.js 16 (App Router), Supabase Auth (@supabase/ssr), React Email (@react-email/components), Resend, Tailwind CSS v4, shadcn/ui.

---

## Phase 1 — Fix the Invite Pipeline ✓ (completed 2026-03-03)

> **All 5 tasks executed via GSD Phase 21 (3 plans, 1 wave). 9 commits. Verified 10/10 must-haves.**

### Task 1: Create email base layout and InvitationEmail template

**Files:**
- Create: `lib/email/templates/BaseLayout.tsx`
- Create: `lib/email/templates/InvitationEmail.tsx`

**Step 1: Create the shared base layout**

```tsx
// lib/email/templates/BaseLayout.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'

interface BaseLayoutProps {
  preview: string
  children: React.ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={logoStyle}>hexOS</Text>
          </Section>
          {children}
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            hexOS by Hexona — Built for agencies and developers
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}

const containerStyle = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '480px',
}

const headerStyle = {
  textAlign: 'center' as const,
  paddingBottom: '24px',
}

const logoStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#09090b',
  margin: '0',
}

const hrStyle = {
  borderColor: '#e4e4e7',
  margin: '32px 0 16px',
}

const footerStyle = {
  fontSize: '12px',
  color: '#a1a1aa',
  textAlign: 'center' as const,
}
```

**Step 2: Create InvitationEmail template**

```tsx
// lib/email/templates/InvitationEmail.tsx
import { Button, Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface InvitationEmailProps {
  inviterName: string
  inviteType: string
  organizationName: string | null
  inviteUrl: string
}

function getSubtitle(type: string, orgName: string | null): string {
  switch (type) {
    case 'admin':
    case 'internal':
      return 'Join the hexOS team'
    case 'dfy_first':
      return 'Set up your agency on hexOS'
    case 'dfy_team':
      return `Join ${orgName || 'the team'} on hexOS`
    case 'dev_solo':
    case 'dev':
    case 'dev_team':
      return 'Start building on hexOS'
    default:
      return 'You\'ve been invited to hexOS'
  }
}

export function InvitationEmail({
  inviterName,
  inviteType,
  organizationName,
  inviteUrl,
}: InvitationEmailProps) {
  const subtitle = getSubtitle(inviteType, organizationName)

  return (
    <BaseLayout preview={subtitle}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>{subtitle}</Text>
        <Text style={textStyle}>
          <strong>{inviterName}</strong> has invited you to join
          {organizationName ? ` ${organizationName} on` : ''} hexOS.
        </Text>
        <Section style={buttonContainerStyle}>
          <Button style={buttonStyle} href={inviteUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={smallTextStyle}>
          This invitation expires in 7 days. If you didn't expect this email, you can ignore it.
        </Text>
      </Section>
    </BaseLayout>
  )
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 24px',
  border: '1px solid #e4e4e7',
}

const headingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#09090b',
  margin: '0 0 12px',
}

const textStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#3f3f46',
  margin: '0 0 24px',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const buttonStyle = {
  backgroundColor: '#0891b2',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
}

const smallTextStyle = {
  fontSize: '12px',
  color: '#a1a1aa',
  margin: '0',
}
```

**Step 3: Verify it compiles**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && npx tsc --noEmit lib/email/templates/InvitationEmail.tsx 2>&1 | head -20`

If TypeScript standalone check fails, just verify the build works in Step 5.

**Step 4: Commit**

```bash
git add lib/email/templates/BaseLayout.tsx lib/email/templates/InvitationEmail.tsx
git commit -m "feat(auth): add base email layout and InvitationEmail template"
```

---

### Task 2: Create remaining email templates and index barrel

**Files:**
- Create: `lib/email/templates/ApplicationReceivedEmail.tsx`
- Create: `lib/email/templates/ApplicationApprovedEmail.tsx`
- Create: `lib/email/templates/ApplicationRejectedEmail.tsx`
- Create: `lib/email/templates/index.ts`

**Step 1: Create ApplicationReceivedEmail**

```tsx
// lib/email/templates/ApplicationReceivedEmail.tsx
import { Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ApplicationReceivedEmailProps {
  name: string
}

export function ApplicationReceivedEmail({ name }: ApplicationReceivedEmailProps) {
  return (
    <BaseLayout preview="We received your developer application">
      <Section style={cardStyle}>
        <Text style={headingStyle}>Application received</Text>
        <Text style={textStyle}>
          Hi {name}, thanks for applying to join hexOS as a developer.
        </Text>
        <Text style={textStyle}>
          We'll review your application and get back to you soon. You'll receive an email with next steps once we've had a look.
        </Text>
      </Section>
    </BaseLayout>
  )
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 24px',
  border: '1px solid #e4e4e7',
}

const headingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#09090b',
  margin: '0 0 12px',
}

const textStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#3f3f46',
  margin: '0 0 16px',
}
```

**Step 2: Create ApplicationApprovedEmail**

```tsx
// lib/email/templates/ApplicationApprovedEmail.tsx
import { Button, Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ApplicationApprovedEmailProps {
  name: string
  inviteUrl: string
}

export function ApplicationApprovedEmail({ name, inviteUrl }: ApplicationApprovedEmailProps) {
  return (
    <BaseLayout preview="Your hexOS developer application has been approved">
      <Section style={cardStyle}>
        <Text style={headingStyle}>You're in!</Text>
        <Text style={textStyle}>
          Hi {name}, your developer application has been approved. Click below to create your account and start taking on projects.
        </Text>
        <Section style={buttonContainerStyle}>
          <Button style={buttonStyle} href={inviteUrl}>
            Create Your Account
          </Button>
        </Section>
        <Text style={smallTextStyle}>
          This link expires in 7 days.
        </Text>
      </Section>
    </BaseLayout>
  )
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 24px',
  border: '1px solid #e4e4e7',
}

const headingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#09090b',
  margin: '0 0 12px',
}

const textStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#3f3f46',
  margin: '0 0 24px',
}

const buttonContainerStyle = {
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const buttonStyle = {
  backgroundColor: '#0891b2',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 24px',
  textDecoration: 'none',
}

const smallTextStyle = {
  fontSize: '12px',
  color: '#a1a1aa',
  margin: '0',
}
```

**Step 3: Create ApplicationRejectedEmail**

```tsx
// lib/email/templates/ApplicationRejectedEmail.tsx
import { Section, Text } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface ApplicationRejectedEmailProps {
  name: string
}

export function ApplicationRejectedEmail({ name }: ApplicationRejectedEmailProps) {
  return (
    <BaseLayout preview="Update on your hexOS developer application">
      <Section style={cardStyle}>
        <Text style={headingStyle}>Application update</Text>
        <Text style={textStyle}>
          Hi {name}, thanks for your interest in joining hexOS as a developer.
        </Text>
        <Text style={textStyle}>
          After reviewing your application, we're not able to move forward at this time. We appreciate the time you took to apply and encourage you to reapply in the future.
        </Text>
      </Section>
    </BaseLayout>
  )
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px 24px',
  border: '1px solid #e4e4e7',
}

const headingStyle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#09090b',
  margin: '0 0 12px',
}

const textStyle = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#3f3f46',
  margin: '0 0 16px',
}
```

**Step 4: Create barrel export**

```ts
// lib/email/templates/index.ts
export { InvitationEmail } from './InvitationEmail'
export { ApplicationReceivedEmail } from './ApplicationReceivedEmail'
export { ApplicationApprovedEmail } from './ApplicationApprovedEmail'
export { ApplicationRejectedEmail } from './ApplicationRejectedEmail'
```

**Step 5: Verify the build compiles**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -20`

The build should pass — `lib/api/email.ts` already imports from `@/lib/email/templates` which was previously broken. Now the barrel export exists.

**Step 6: Commit**

```bash
git add lib/email/templates/
git commit -m "feat(auth): add application email templates and barrel export"
```

---

### Task 3: Fix invitation expiry on creation

**Files:**
- Modify: `lib/api/invitations.ts:170-323` (four create functions)

**Step 1: Add expires_at to createAdminInvitation**

In `lib/api/invitations.ts`, find the `.insert({` block inside `createAdminInvitation` (around line 181) and add `expires_at`:

```ts
// Inside createAdminInvitation, add to the insert object:
expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
```

**Step 2: Add expires_at to createDfyFirstInvitation**

Same pattern, around line 210:

```ts
expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
```

**Step 3: Add expires_at to createTeamInvitation**

Around line 243:

```ts
expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
```

**Step 4: Add expires_at to createDevInvitation**

Around line 307:

```ts
expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
```

**Step 5: Verify the build compiles**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 6: Commit**

```bash
git add lib/api/invitations.ts
git commit -m "fix(auth): set explicit 7-day expiry on all invitation creation"
```

---

### Task 4: Fix broken signout on invite page

**Files:**
- Modify: `app/invite/[token]/page.tsx:236-246`

**Step 1: Replace the broken onClick signout with a form action**

The current code at line 236-246 has an `<a>` tag with an `onClick` that tries to call a server action. This doesn't work. Replace it with a proper form:

Find this block (around lines 236-246):
```tsx
<a
  href={`/invite/${token}?mode=login`}
  onClick={async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
  }}
  className="block w-full text-center rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
>
  Sign in as {invitation.email}
</a>
```

Replace with:
```tsx
<form action={async () => {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/invite/${token}?mode=login`)
}}>
  <button
    type="submit"
    className="block w-full text-center rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
  >
    Sign in as {invitation.email}
  </button>
</form>
```

Also add `redirect` to the imports at the top of the file if not already there (it's already imported at line 4).

**Step 2: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add app/invite/\\[token\\]/page.tsx
git commit -m "fix(auth): replace broken onClick signout with form action on invite page"
```

---

### Task 5: Add admin DFY invite toggle (create new org vs add to existing)

**Files:**
- Modify: `features/admin/components/AdminPartnersList.tsx:40-160`
- Modify: `features/organizations/actions/invitationActions.ts` (add new action)

**Step 1: Add a new server action for inviting DFY to existing org**

In `features/organizations/actions/invitationActions.ts`, add after the `inviteDfyAgencyAction` function (after line 162):

```ts
/**
 * Invite DFY user to an existing organization (admin only)
 */
export async function inviteDfyToExistingOrgAction(
  input: { email: string; organization_id: string }
): Promise<{ success: boolean; invitationId?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { success: false, error: 'Only admins can invite DFY users' }
    }

    const exists = await hasExistingInvitation(input.email, input.organization_id)
    if (exists) {
      return { success: false, error: 'An invitation already exists for this email' }
    }

    const hasSeats = await hasAvailableSeats(input.organization_id)
    if (!hasSeats) {
      return { success: false, error: 'Organization has no available seats' }
    }

    const invitation = await createTeamInvitation(
      { email: input.email, organization_id: input.organization_id },
      user.id,
      'dfy_team'
    )

    if (!invitation) {
      return { success: false, error: 'Failed to create invitation' }
    }

    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', input.organization_id)
      .single()

    await sendInvitationEmail(
      input.email,
      inviterProfile?.name || 'A hexOS admin',
      'dfy_team',
      org?.name || null,
      invitation.token
    )

    revalidatePath('/dashboard/admin/partners')

    return { success: true, invitationId: invitation.id }
  } catch (error) {
    console.error('[inviteDfyToExistingOrgAction] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invitation',
    }
  }
}
```

**Step 2: Update AdminPartnersList to support both invite modes**

In `features/admin/components/AdminPartnersList.tsx`, update the component. The key changes:

1. Add new state: `inviteMode` ('new_agency' | 'existing_agency'), `selectedOrgId`
2. Import `inviteDfyToExistingOrgAction` and `Select` component
3. Update the dialog form to show radio toggle and conditional fields
4. Update `handleInvite` to call the right action based on mode

Replace the state declarations (lines 42-46) with:
```tsx
const [search, setSearch] = useState('')
const [isInviteOpen, setIsInviteOpen] = useState(false)
const [inviteEmail, setInviteEmail] = useState('')
const [agencyName, setAgencyName] = useState('')
const [inviteMode, setInviteMode] = useState<'new_agency' | 'existing_agency'>('new_agency')
const [selectedOrgId, setSelectedOrgId] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

Update the import to include:
```tsx
import { inviteDfyAgencyAction, inviteDfyToExistingOrgAction, revokeInvitationAction, resendInvitationAction } from '@/features/organizations/actions/invitationActions'
```

Update `handleInvite` (lines 58-77) to:
```tsx
const handleInvite = async () => {
  setIsSubmitting(true)
  setError(null)

  let result
  if (inviteMode === 'new_agency') {
    result = await inviteDfyAgencyAction({
      email: inviteEmail,
      organization_name: agencyName,
    })
  } else {
    if (!selectedOrgId) {
      setError('Please select an agency')
      setIsSubmitting(false)
      return
    }
    result = await inviteDfyToExistingOrgAction({
      email: inviteEmail,
      organization_id: selectedOrgId,
    })
  }

  setIsSubmitting(false)

  if (!result.success) {
    setError(result.error || 'Failed to send invitation')
    return
  }

  setIsInviteOpen(false)
  setInviteEmail('')
  setAgencyName('')
  setSelectedOrgId('')
  setInviteMode('new_agency')
}
```

Replace the dialog content (the `<div className="space-y-4 py-4">` section, lines 118-148) with:
```tsx
<div className="space-y-4 py-4">
  {error && (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
      {error}
    </div>
  )}

  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="user@agency.com"
      value={inviteEmail}
      onChange={(e) => setInviteEmail(e.target.value)}
    />
  </div>

  <div className="space-y-2">
    <Label>Invite Type</Label>
    <div className="flex gap-2">
      <Button
        type="button"
        variant={inviteMode === 'new_agency' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setInviteMode('new_agency')}
        className="flex-1"
      >
        Create new agency
      </Button>
      <Button
        type="button"
        variant={inviteMode === 'existing_agency' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setInviteMode('existing_agency')}
        className="flex-1"
      >
        Add to existing
      </Button>
    </div>
  </div>

  {inviteMode === 'new_agency' ? (
    <div className="space-y-2">
      <Label htmlFor="agencyName">Agency Name</Label>
      <Input
        id="agencyName"
        placeholder="Acme Digital"
        value={agencyName}
        onChange={(e) => setAgencyName(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        This will be the name of the agency when they accept
      </p>
    </div>
  ) : (
    <div className="space-y-2">
      <Label htmlFor="agency">Select Agency</Label>
      <select
        id="agency"
        value={selectedOrgId}
        onChange={(e) => setSelectedOrgId(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Select an agency...</option>
        {agencies.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name} ({org.member_count}/{org.max_seats} seats)
          </option>
        ))}
      </select>
    </div>
  )}
</div>
```

Update the submit button disabled condition (line 154):
```tsx
<Button
  onClick={handleInvite}
  disabled={
    !inviteEmail ||
    (inviteMode === 'new_agency' ? !agencyName : !selectedOrgId) ||
    isSubmitting
  }
>
  {isSubmitting ? 'Sending...' : 'Send Invitation'}
</Button>
```

**Step 3: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -20`

**Step 4: Commit**

```bash
git add features/admin/components/AdminPartnersList.tsx features/organizations/actions/invitationActions.ts
git commit -m "feat(auth): add admin toggle for DFY invite — new agency or existing org"
```

---

## Phase 2 — Modern Auth Methods

### Task 6: Create auth callback route

**Files:**
- Create: `app/auth/callback/route.ts`

**Step 1: Create the unified callback handler**

```ts
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
    // If acceptance fails, still redirect to dashboard — user is authenticated
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  // Check if user has a profile with a role (existing user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, has_completed_onboarding')
    .eq('id', user.id)
    .single()

  if (!profile?.role) {
    // New OAuth user with no role — redirect to login with info
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No account found. Please use an invitation link to join.')}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
```

**Step 2: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add app/auth/callback/route.ts
git commit -m "feat(auth): add unified auth callback route for OAuth and magic links"
```

---

### Task 7: Add Google OAuth and magic link actions

**Files:**
- Modify: `lib/auth/actions.ts`

**Step 1: Add signInWithGoogle action**

Add after the existing `signInAndReturn` function (after line 97):

```ts
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

**Step 2: Add signInWithMagicLink action**

Add after signInWithGoogle:

```ts
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

**Step 3: Add resetPassword action**

```ts
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

**Step 4: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 5: Commit**

```bash
git add lib/auth/actions.ts
git commit -m "feat(auth): add Google OAuth, magic link, and password reset actions"
```

---

### Task 8: Update login page with Google, magic link, and forgot password

**Files:**
- Modify: `app/(auth)/login/page.tsx`

**Step 1: Rewrite the login page**

Replace the entire content of `app/(auth)/login/page.tsx` with a new version that adds:
- "Continue with Google" button at top
- Email/password form (existing)
- "Send magic link" as alternative to password
- "Forgot password?" link
- Keep test users section for dev

The page needs to become a client component for the magic link state toggle, OR use search params. Use search params to keep it as a server component:

- Default view: email + password + Google + "Use magic link instead" link
- `?mode=magic-link`: email + "Send magic link" button + "Use password instead" link
- `?success=magic-link`: "Check your email" confirmation

Full implementation: replace the form section to include Google button above, "Forgot password?" link below password, and mode toggle for magic link. The Google button calls `signInWithGoogle` as a form action. Magic link uses `signInWithMagicLink` as a server action with the email from form data.

**Step 2: Verify build and visually test**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add app/\\(auth\\)/login/page.tsx
git commit -m "feat(auth): add Google OAuth, magic link, and forgot password to login page"
```

---

### Task 9: Create forgot-password and reset-password pages

**Files:**
- Create: `app/(auth)/forgot-password/page.tsx`
- Create: `app/(auth)/reset-password/page.tsx`

**Step 1: Create forgot-password page**

```tsx
// app/(auth)/forgot-password/page.tsx
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
          If an account exists with that email, you'll receive a password reset link.
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
          Enter your email and we'll send you a reset link
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

**Step 2: Create reset-password page**

```tsx
// app/(auth)/reset-password/page.tsx
import { updatePassword } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function handleUpdate(formData: FormData) {
    'use server'
    const password = formData.get('password') as string
    const confirm = formData.get('confirm') as string

    if (password !== confirm) {
      redirect('/reset-password?error=' + encodeURIComponent('Passwords do not match'))
    }

    if (password.length < 8) {
      redirect('/reset-password?error=' + encodeURIComponent('Password must be at least 8 characters'))
    }

    const result = await updatePassword(password)
    if (!result.success) {
      redirect(`/reset-password?error=${encodeURIComponent(result.error || 'Failed to update password')}`)
    }
    redirect('/login?error=' + encodeURIComponent('Password updated. Please sign in.'))
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Set new password</h1>
        <p className="mt-2 text-sm text-text-tertiary">
          Enter your new password below
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-signal-bad-dim p-3 text-sm text-signal-bad border border-signal-bad/25">
          {error}
        </div>
      )}

      <form action={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            New Password
          </label>
          <Input id="password" name="password" type="password" required minLength={8} placeholder="Min 8 characters" />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-[10px] font-mono font-medium uppercase tracking-wider text-text-tertiary mb-1.5">
            Confirm Password
          </label>
          <Input id="confirm" name="confirm" type="password" required minLength={8} placeholder="Repeat password" />
        </div>
        <Button type="submit" className="w-full">Update password</Button>
      </form>
    </div>
  )
}
```

**Step 3: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 4: Commit**

```bash
git add app/\\(auth\\)/forgot-password/page.tsx app/\\(auth\\)/reset-password/page.tsx
git commit -m "feat(auth): add forgot-password and reset-password pages"
```

---

### Task 10: Update invite page with Google and magic link options

**Files:**
- Modify: `app/invite/[token]/page.tsx`

**Step 1: Add Google and magic link options to the invite page**

Add imports at top:
```ts
import { signInWithGoogle, signInWithMagicLink } from '@/lib/auth/actions'
```

Add a server action for Google on invite page:
```ts
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

In the signup form section (around line 290), add above the form:
```tsx
{/* OAuth options */}
<form action={handleGoogleSignIn}>
  <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800">
    <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
    Continue with Google
  </button>
</form>

<div className="relative">
  <div className="absolute inset-0 flex items-center">
    <div className="w-full border-t border-stone-200 dark:border-stone-800" />
  </div>
  <div className="relative flex justify-center text-xs">
    <span className="bg-stone-50 dark:bg-stone-950 px-2 text-stone-500">or</span>
  </div>
</div>
```

Add a magic link option after the signup/login form toggle (around line 396):
```tsx
<div className="text-center text-sm">
  <form action={handleMagicLink}>
    <button type="submit" className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 text-xs">
      Send magic link instead
    </button>
  </form>
</div>
```

**Step 2: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 3: Commit**

```bash
git add app/invite/\\[token\\]/page.tsx
git commit -m "feat(auth): add Google OAuth and magic link to invite acceptance page"
```

---

## Phase 3 — Onboarding Wizard

### Task 11: Add has_completed_onboarding migration and update Profile type

**Files:**
- Create: `supabase/migrations/20260303000001_onboarding_flag.sql`
- Modify: `lib/auth/types.ts`

**Step 1: Create migration**

```sql
-- Add onboarding completion flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- Existing users have completed onboarding
UPDATE public.profiles SET has_completed_onboarding = true WHERE role IS NOT NULL;
```

**Step 2: Update Profile type**

In `lib/auth/types.ts`, add to the Profile interface:

```ts
has_completed_onboarding?: boolean
```

**Step 3: Apply migration locally**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && npx supabase db push 2>&1 | tail -5`

If not using local Supabase, skip this step — the migration will be applied on deploy.

**Step 4: Commit**

```bash
git add supabase/migrations/20260303000001_onboarding_flag.sql lib/auth/types.ts
git commit -m "feat(auth): add has_completed_onboarding flag to profiles"
```

---

### Task 12: Create onboarding layout and wizard page

**Files:**
- Create: `app/(onboarding)/layout.tsx`
- Create: `app/(onboarding)/onboarding/page.tsx`

**Step 1: Create minimal onboarding layout**

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

**Step 2: Create onboarding wizard page**

This is a client component with stepper UI. It reads the user's profile and role, shows appropriate steps, and marks onboarding complete on finish.

```tsx
// app/(onboarding)/onboarding/page.tsx
import { redirect } from 'next/navigation'
import { getAuthUser, getAuthProfile } from '@/lib/auth/cached'
import { DASHBOARD_ROUTES, type Profile, type UserRole } from '@/lib/auth/types'
import { OnboardingWizard } from '@/features/onboarding/components/OnboardingWizard'
import { getUserMembership } from '@/lib/api/organizations'

export default async function OnboardingPage() {
  const { user, error: authError } = await getAuthUser()

  if (authError || !user) {
    redirect('/login')
  }

  const profile = await getAuthProfile()

  if (!profile) {
    redirect('/login')
  }

  // If already completed onboarding, go to dashboard
  if ((profile as any).has_completed_onboarding) {
    redirect(DASHBOARD_ROUTES[(profile as Profile).role] || '/dashboard')
  }

  // Get org info if user is in one
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

**Step 3: Create the OnboardingWizard client component**

Create `features/onboarding/components/OnboardingWizard.tsx` — a multi-step form with:
- Step indicator (dots or numbers)
- Step 1: profile completion (name, timezone)
- Step 2: role-specific intro
- Step 3: done/redirect
- Server action to update profile and set `has_completed_onboarding = true`

This is a substantial client component. Implement it with `useState` for current step, form data, and a server action for the final submit.

**Step 4: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -20`

**Step 5: Commit**

```bash
git add app/\\(onboarding\\)/ features/onboarding/components/OnboardingWizard.tsx
git commit -m "feat(auth): add onboarding wizard layout and page"
```

---

### Task 13: Add onboarding redirect to dashboard layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx:43-47`
- Modify: `lib/auth/cached.ts` (update profile query to include new field)

**Step 1: Update cached profile query to include has_completed_onboarding**

In `lib/auth/cached.ts`, find the profile select query and add `has_completed_onboarding` to the selected columns.

**Step 2: Add onboarding redirect in dashboard layout**

In `app/(dashboard)/layout.tsx`, after the profile check (around line 47), add:

```ts
if (!(profile as any).has_completed_onboarding) {
  redirect('/onboarding')
}
```

**Step 3: Update acceptInvitation to NOT set has_completed_onboarding**

No change needed — new profiles get `false` by default, which triggers the redirect.

**Step 4: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 5: Commit**

```bash
git add app/\\(dashboard\\)/layout.tsx lib/auth/cached.ts
git commit -m "feat(auth): redirect new users to onboarding from dashboard"
```

---

### Task 14: Create onboarding completion action

**Files:**
- Create: `features/onboarding/actions/completeOnboarding.ts`

**Step 1: Create server action**

```ts
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

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

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

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
```

**Step 2: Wire this action into the OnboardingWizard component**

The OnboardingWizard's final step calls `completeOnboarding(formData)` and then redirects using `router.push(DASHBOARD_ROUTES[role])`.

**Step 3: Verify build**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -10`

**Step 4: Commit**

```bash
git add features/onboarding/actions/completeOnboarding.ts features/onboarding/components/OnboardingWizard.tsx
git commit -m "feat(auth): add onboarding completion action and wire to wizard"
```

---

## Final Verification

### Task 15: End-to-end verification

**Step 1: Full build check**

Run: `cd "/Users/aymanbaig/Desktop/Manual Library/hexos-main-backup" && pnpm build 2>&1 | tail -20`

**Step 2: Manual test checklist**

- [ ] Login page shows Google, email/password, magic link, forgot password
- [ ] Forgot password sends email, reset page works
- [ ] Admin can invite DFY → "create new agency" or "add to existing"
- [ ] Invitation email renders correctly (check Resend dashboard)
- [ ] Invite acceptance page shows Google/magic link options
- [ ] New user completing invite lands on onboarding wizard
- [ ] Onboarding wizard completes and redirects to dashboard
- [ ] Existing users bypass onboarding (flag already true)
- [ ] DFY org owner can invite up to 3 team members from team settings

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(auth): address e2e verification issues"
```
