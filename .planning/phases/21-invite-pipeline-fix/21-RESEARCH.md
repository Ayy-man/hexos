# Phase 21: Invite Pipeline Fix - Research

**Researched:** 2026-03-03
**Domain:** React Email templates, Next.js server actions, Supabase Auth, invitation system bug fixes
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Email Templates**
- Create shared `BaseLayout.tsx` using `@react-email/components` (Html, Head, Preview, Body, Container, Section, Text, Hr)
- hexOS branding: logo text "hexOS", footer "hexOS by Hexona — Built for agencies and developers"
- Card style: white bg, 8px radius, 1px solid #e4e4e7 border, 32px/24px padding
- Button CTA: bg #0891b2 (cyan-600), white text, 6px radius, 12px/24px padding
- Body bg: #f4f4f5 (zinc-100), max-width 480px
- Create 4 templates:
  - `InvitationEmail` — props: inviterName, inviteType, organizationName, inviteUrl. Subtitle varies by type (admin→"Join the hexOS team", dfy_first→"Set up your agency", dfy_team→"Join {org}", dev→"Start building")
  - `ApplicationReceivedEmail` — props: name. "We received your developer application"
  - `ApplicationApprovedEmail` — props: name, inviteUrl. "You're in!" with CTA button
  - `ApplicationRejectedEmail` — props: name. Soft rejection message
- Barrel export via `lib/email/templates/index.ts`

**Invitation Expiry Fix**
- All 4 create*Invitation() functions (createAdminInvitation, createDfyFirstInvitation, createTeamInvitation, createDevInvitation) must explicitly set `expires_at` to `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()`
- Added directly to the `.insert({})` object in each function
- Target file: `lib/api/invitations.ts`

**Signout Fix on Invite Page**
- Replace the broken `<a onClick>` with a `<form action>` pattern using server action
- Server action calls `supabase.auth.signOut()` then `redirect(/invite/${token}?mode=login)`
- Target: `app/invite/[token]/page.tsx` around lines 236-246
- `redirect` already imported at line 4

**Admin DFY Invite Toggle**
- Add new server action `inviteDfyToExistingOrgAction` in `features/organizations/actions/invitationActions.ts`
  - Admin-only guard, duplicate invite check via `hasExistingInvitation`, seat check via `hasAvailableSeats`
  - Uses `createTeamInvitation()` with type `dfy_team`
  - Sends invitation email and revalidates `/dashboard/admin/partners`
- Update `AdminPartnersList.tsx` dialog with radio/button toggle:
  - "Create new agency" mode → shows org name field, calls `inviteDfyAgencyAction`
  - "Add to existing" mode → shows org dropdown (from `agencies` prop), calls `inviteDfyToExistingOrgAction`
- New state: `inviteMode`, `selectedOrgId`, `isSubmitting`, `error`
- Submit button disabled condition adapts to mode
- DFY orgs can self-invite up to 3 teammates (existing `max_seats: 3` default)

### Claude's Discretion
- Exact error handling patterns within email templates
- TypeScript compilation verification approach (standalone tsc vs pnpm build)
- Commit message formatting (provided as suggestions, may adapt to repo conventions)
- Whether to extract shared card/button styles into constants vs inline per template

### Deferred Ideas (OUT OF SCOPE)
- Duplicate invite detection on direct invite paths (partially covered by inviteDfyToExistingOrgAction, full coverage deferred)
- Transaction safety for acceptInvitation() — deferred to Phase 22/23
- Rate limiting on invitation creation — deferred to Phase 22
</user_constraints>

---

## Summary

Phase 21 fixes the invite pipeline so invitations actually work end-to-end. The API and database layers are solid — invitation types, token generation, RLS, and seat management all exist. Three specific gaps exist: (1) email templates existed on disk but use wrong hexOS branding (blue #2563eb instead of cyan #0891b2, no shared BaseLayout, no hexOS footer copy), (2) `expires_at` is not set in the 4 create*Invitation() `.insert()` calls so the DB default may be overwritten by undefined, and (3) the "Sign in as {email}" link uses a server-action `onClick` on an `<a>` tag, which is a React/Next.js anti-pattern that silently fails.

The email pipeline is fully wired: `lib/api/email.ts` imports from `@/lib/email/templates`, `render()` from `@react-email/components` converts JSX to HTML, and `resend.emails.send()` delivers it. The templates just need to be replaced with correct hexOS-branded versions. The signout bug is surgical — one `<a onClick>` element becomes a `<form action={signOutAndRedirect}>` element. The admin DFY toggle adds one new server action and expands the existing dialog UI with mode switching state.

**Primary recommendation:** Tasks 1-2 (templates) unblock the entire email system. Tasks 3-5 are independent surgical fixes. Execute in order 1→2→3→4→5 since tasks 1-2 share BaseLayout and the barrel index.

---

## Critical Discovery: Templates Already Exist (Wrong Branding)

**This changes Task 1 and Task 2 from "create" to "rewrite."**

All 4 template files and the barrel index already exist on disk:
- `lib/email/templates/InvitationEmail.tsx` — exists, uses `#2563eb` (blue), no BaseLayout, no hexOS footer
- `lib/email/templates/ApplicationReceivedEmail.tsx` — exists, uses generic styles
- `lib/email/templates/ApplicationApprovedEmail.tsx` — exists, uses `#2563eb` (blue)
- `lib/email/templates/ApplicationRejectedEmail.tsx` — exists, generic styles
- `lib/email/templates/index.ts` — exists, correct barrel exports

The planner must treat these as **rewrite tasks**, not create tasks. The `lib/api/email.ts` is already fully wired to import and use these templates. The barrel index exports are already correct. The core work is replacing the inline style objects and component structure with the hexOS BaseLayout + correct branding tokens.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-email/components` | ^0.0.32 | Email component primitives (Html, Body, Container, etc.) | Already installed; provides cross-client compatible email primitives |
| `resend` | ^4.0.0 | Email delivery API | Already configured in `lib/email/resend.ts` |
| `next` | 16.1.0 | App Router server actions, server components | Project framework |
| `react` | 19.2.3 | Component model for templates | Project framework |
| `@supabase/ssr` | ^0.8.0 | Server-side auth (signOut, getUser) | Project auth layer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `shadcn` Dialog | project | Admin DFY toggle modal | Already used in AdminPartnersList.tsx |
| `shadcn` Label, Input, Button | project | Form controls in toggle dialog | Already imported in AdminPartnersList.tsx |
| `lucide-react` | ^0.562.0 | Icons in dialog | Already imported |

### No New Installations Needed
All required packages are already present. No `npm install` required for any task in this phase.

---

## Architecture Patterns

### Existing File Layout (what we're working with)

```
lib/
├── email/
│   ├── resend.ts              # Resend client + EMAIL_FROM constant
│   ├── templates/
│   │   ├── BaseLayout.tsx     # TO CREATE — shared wrapper
│   │   ├── InvitationEmail.tsx        # REWRITE — wrong branding
│   │   ├── ApplicationReceivedEmail.tsx   # REWRITE — wrong branding
│   │   ├── ApplicationApprovedEmail.tsx   # REWRITE — wrong branding
│   │   ├── ApplicationRejectedEmail.tsx   # REWRITE — wrong branding
│   │   └── index.ts           # EXISTS — correct, add BaseLayout export
│   └── (email.ts is at lib/api/email.ts)
├── api/
│   ├── email.ts               # Wiring layer — render() + resend — NO CHANGES NEEDED
│   └── invitations.ts         # FIX — add expires_at to 4 create* functions
app/
└── invite/[token]/page.tsx    # FIX — replace <a onClick> with <form action>
features/
└── organizations/
    └── actions/
        └── invitationActions.ts  # ADD — inviteDfyToExistingOrgAction
    └── admin/
        └── components/
            └── AdminPartnersList.tsx  # MODIFY — add mode toggle to dialog
```

### Pattern 1: React Email BaseLayout Wrapper

**What:** A shared layout component that all 4 templates use via `{children}`. Provides consistent outer HTML, hexOS branding header, and footer. Templates only provide inner card content.

**When to use:** Every email template in this project.

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
import React from 'react'

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
  backgroundColor: '#f4f4f5', // zinc-100
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const containerStyle = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '40px 20px',
}

const headerStyle = {
  marginBottom: '24px',
}

const logoStyle = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#18181b', // zinc-900
  margin: '0',
}

const hrStyle = {
  borderColor: '#e4e4e7',
  margin: '24px 0',
}

const footerStyle = {
  color: '#71717a', // zinc-500
  fontSize: '12px',
  textAlign: 'center' as const,
}
```

### Pattern 2: Template Inner Card

**What:** Each template wraps its content in a card section using inline style object that matches the hexOS design spec.

```tsx
// Shared card style constants (can inline or extract)
const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e4e4e7',
  padding: '32px 24px',
  marginBottom: '24px',
}

const buttonStyle = {
  backgroundColor: '#0891b2', // cyan-600
  color: '#ffffff',
  borderRadius: '6px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}
```

### Pattern 3: Next.js Server Action for Signout

**What:** Replace `<a onClick>` with `<form action={serverAction}>`. The server action calls `supabase.auth.signOut()` then `redirect()`. This is the required pattern because `onClick` on `<a>` tags cannot invoke server actions — only `<form action>` and `<button formAction>` can.

**The broken code (lines 236-246 of invite page):**
```tsx
// BROKEN — onClick on <a> cannot invoke server action
<a
  href={`/invite/${token}?mode=login`}
  onClick={async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
  }}
  className="block w-full ..."
>
  Sign in as {invitation.email}
</a>
```

**Fixed pattern:**
```tsx
// Define server action at page scope (before return, after existing server actions)
async function signOutAndRedirect() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(`/invite/${token}?mode=login`)
}

// In JSX, replace <a> with <form> + <button>
<form action={signOutAndRedirect}>
  <button
    type="submit"
    className="block w-full text-center rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
  >
    Sign in as {invitation.email}
  </button>
</form>
```

### Pattern 4: New Server Action in invitationActions.ts

**What:** `inviteDfyToExistingOrgAction` follows the exact same guard pattern as other actions in the file — auth check, role check, duplicate check, seat check, create, send email, revalidate.

```typescript
// features/organizations/actions/invitationActions.ts
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
      return { success: false, error: 'Only admins can invite DFY team members' }
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

### Pattern 5: AdminPartnersList Toggle UI

**What:** Add `inviteMode` state (`'new' | 'existing'`) to the existing dialog. The two modes render different form fields. The `agencies` prop already exists on the component.

**New state to add:**
```tsx
const [inviteMode, setInviteMode] = useState<'new' | 'existing'>('new')
const [selectedOrgId, setSelectedOrgId] = useState('')
```

**Mode toggle inside dialog (after error display, before current fields):**
```tsx
<div className="flex rounded-md border border-border overflow-hidden">
  <button
    type="button"
    className={`flex-1 py-2 text-sm ${inviteMode === 'new' ? 'bg-primary text-primary-foreground' : ''}`}
    onClick={() => setInviteMode('new')}
  >
    Create new agency
  </button>
  <button
    type="button"
    className={`flex-1 py-2 text-sm ${inviteMode === 'existing' ? 'bg-primary text-primary-foreground' : ''}`}
    onClick={() => setInviteMode('existing')}
  >
    Add to existing
  </button>
</div>
```

**Conditional field rendering:**
- Mode `'new'`: show Agency Name `<Input>` field (current behavior) — calls `inviteDfyAgencyAction`
- Mode `'existing'`: show org dropdown `<select>` — calls `inviteDfyToExistingOrgAction`

**Submit button disabled logic:**
- Mode `'new'`: `!inviteEmail || !agencyName || isSubmitting`
- Mode `'existing'`: `!inviteEmail || !selectedOrgId || isSubmitting`

### Anti-Patterns to Avoid

- **`onClick` on `<a>` for server actions:** Silently fails in Next.js App Router. Only `<form action>` and `<button formAction>` can invoke server actions.
- **Assuming DB defaults cover API calls:** The DB has an `expires_at` default, but when the API passes an object without `expires_at`, Postgres treats it as NULL-override in some configurations. Always set explicitly.
- **Importing `BaseLayout` in the barrel index:** Do NOT export `BaseLayout` from `index.ts` — it's an internal component, not a public template. `email.ts` never imports it directly; only templates use it internally.
- **Using `render()` at template level:** `render()` is called in `lib/api/email.ts`, not inside the template files themselves. Templates just return JSX.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML generation | Custom HTML string concatenation | `@react-email/components` + `render()` | Cross-client CSS support, preview, component model |
| Email delivery | Raw SMTP or fetch to Resend API | `resend` SDK | Already configured in `lib/email/resend.ts` |
| Auth signout in server context | Custom session clearing | `supabase.auth.signOut()` | Handles cookie clearing and session invalidation correctly |
| Seat availability check | Inline member count query | `hasAvailableSeats()` in `lib/api/organizations.ts` | Already implemented and tested |
| Duplicate invite check | Inline invitations query | `hasExistingInvitation()` in `lib/api/invitations.ts` | Already implemented with org-scoped variant |

---

## Common Pitfalls

### Pitfall 1: `<a onClick>` Cannot Invoke Server Actions
**What goes wrong:** The `onClick` handler with `'use server'` on an anchor element does not fire as a server action. The href navigation happens but signOut never executes. User is redirected to the login mode URL still logged in as the wrong account.
**Why it happens:** Next.js App Router only supports server actions via `<form action>` and `<button formAction>`. The `onClick` directive on non-form elements is silently ignored.
**How to avoid:** Always use `<form action={serverAction}><button type="submit">` pattern for server-side mutations triggered from UI.
**Warning signs:** A broken link that navigates but doesn't execute server-side code.

### Pitfall 2: Forgetting to Close the Dialog After Successful "Add to Existing" Submit
**What goes wrong:** After `inviteDfyToExistingOrgAction` succeeds, `setIsInviteOpen(false)` and field reset must cover `selectedOrgId` and `inviteMode` too, not just `inviteEmail`/`agencyName`.
**How to avoid:** In `handleInvite`, after success, also reset `setSelectedOrgId('')` and optionally `setInviteMode('new')`.

### Pitfall 3: `expires_at` Undefined Overwrites DB Default
**What goes wrong:** In Supabase JS client, if you pass `expires_at: undefined` in the insert payload, some versions treat it as "set to null" rather than "omit the column." The DB default trigger may not fire.
**Why it happens:** JavaScript's `undefined` in object spread is omitted, but explicitly listing the field name with `undefined` value can behave differently.
**How to avoid:** Always set `expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` explicitly in the 4 create functions. Do not rely on the DB default for the API layer.

### Pitfall 4: Template Rewrite Must Preserve Props Interface
**What goes wrong:** `lib/api/email.ts` calls templates with specific prop shapes. If you change the interface (e.g., rename `inviterName` to `senderName`), you break the email layer.
**How to avoid:** Keep existing prop interfaces exactly as-is. Only change the JSX/styles within the template component. The `email.ts` wiring file needs zero changes.

### Pitfall 5: `BaseLayout` and `render()` Ordering
**What goes wrong:** `render()` from `@react-email/components` must be called on the top-level email component (e.g., `InvitationEmail({...})`), not on `BaseLayout` itself. If you call `render(BaseLayout({...}))` you lose the template content.
**How to avoid:** Templates should compose: `InvitationEmail` renders `<BaseLayout>` wrapping its own card content. `email.ts` calls `render(InvitationEmail({...}))`.

### Pitfall 6: AdminPartnersList Needs `agencies` Passed for Org Dropdown
**What goes wrong:** The org dropdown for "Add to existing" mode needs the list of DFY agencies. The component already receives `agencies: OrganizationWithStats[]` as a prop. Do not fetch separately inside the component — use the prop.
**How to avoid:** The `agencies` prop already comes from `getAllOrganizations('dfy_agency')` in the page server component. No changes needed to the page data fetching.

---

## Code Examples

Verified from reading actual codebase files:

### Expiry Fix Pattern (for all 4 create* functions)
```typescript
// lib/api/invitations.ts — add expires_at to each .insert({}) call
const { data, error } = await supabase
  .from('invitations')
  .insert({
    type: invitationType,
    email: input.email.toLowerCase(),
    target_role: input.target_role,
    invited_by: invitedBy,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // ADD THIS
  })
  .select()
  .single()
```

### Correct Template Import in email.ts (already correct, no changes needed)
```typescript
// lib/api/email.ts — already correct
import { render } from '@react-email/components'
import {
  InvitationEmail,
  ApplicationReceivedEmail,
  ApplicationApprovedEmail,
  ApplicationRejectedEmail,
} from '@/lib/email/templates'
```

### Barrel Index (already correct, only update if BaseLayout needs export — it does NOT)
```typescript
// lib/email/templates/index.ts — already correct, no change needed
export { InvitationEmail } from './InvitationEmail'
export { ApplicationReceivedEmail } from './ApplicationReceivedEmail'
export { ApplicationApprovedEmail } from './ApplicationApprovedEmail'
export { ApplicationRejectedEmail } from './ApplicationRejectedEmail'
// Do NOT export BaseLayout — it's internal
```

### InvitationEmail Rewrite (hexOS branding)
```tsx
// lib/email/templates/InvitationEmail.tsx
import { Section, Text, Button, Link } from '@react-email/components'
import { BaseLayout } from './BaseLayout'

interface InvitationEmailProps {
  inviterName: string
  inviteType: string
  organizationName: string | null
  inviteUrl: string
}

function getSubtitle(inviteType: string, organizationName: string | null): string {
  switch (inviteType) {
    case 'admin':
    case 'internal':
      return 'Join the hexOS team'
    case 'dfy_first':
      return 'Set up your agency'
    case 'dfy_team':
      return `Join ${organizationName || 'your team'}`
    default:
      return 'Start building'
  }
}

export function InvitationEmail({ inviterName, inviteType, organizationName, inviteUrl }: InvitationEmailProps) {
  const preview = organizationName
    ? `${inviterName} invited you to join ${organizationName}`
    : `${inviterName} invited you to join hexOS`
  const subtitle = getSubtitle(inviteType, organizationName)

  return (
    <BaseLayout preview={preview}>
      <Section style={cardStyle}>
        <Text style={headingStyle}>You're invited</Text>
        <Text style={subtitleStyle}>{subtitle}</Text>
        <Text style={bodyStyle}>
          {inviterName} has invited you to join {organizationName || 'hexOS'}.
        </Text>
        <Button style={buttonStyle} href={inviteUrl}>
          Accept Invitation
        </Button>
        <Text style={linkLabelStyle}>Or copy and paste this URL:</Text>
        <Link href={inviteUrl} style={linkStyle}>{inviteUrl}</Link>
        <Text style={expiryStyle}>This invitation expires in 7 days.</Text>
      </Section>
    </BaseLayout>
  )
}
// ... style constants with #0891b2 button, white card, zinc-100 body
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `onClick` with `'use server'` on `<a>` | `<form action={serverAction}>` + `<button type="submit">` | Next.js App Router (stable) | Server actions only work on form submit events |
| Templates returning raw inline JSX | Templates composing a shared BaseLayout | This phase | Consistent branding, single source of truth for header/footer |
| No `expires_at` in insert (relying on DB default) | Explicit `expires_at` in every create* call | This phase | Guarantees 7-day expiry regardless of DB default behavior |

---

## Open Questions

1. **BaseLayout: should it export to barrel index?**
   - What we know: `email.ts` only imports the 4 named templates, not BaseLayout
   - What's clear: BaseLayout is an internal composition helper, NOT a public email template
   - Recommendation: Do NOT export from `index.ts`. Add `// Internal layout — not exported` comment.

2. **Select element for org dropdown: native `<select>` or shadcn `Select`?**
   - What we know: The project uses shadcn components throughout. The AdminPartnersList already imports `Input`, `Label`, `Button` from shadcn.
   - Recommendation: Use shadcn `Select` from `@/components/ui/select` for consistency with the rest of the dialog. Import `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` if not already in the file.

3. **Dialog description update for "Add to existing" mode**
   - What we know: Current `DialogDescription` says "Invite a new DFY partner to create their agency on the platform"
   - Recommendation: Update the description dynamically based on `inviteMode` — "Create their agency" for new, "Join an existing agency" for existing.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `lib/api/invitations.ts` — confirmed 4 create* functions lack `expires_at`
- Direct codebase read: `app/invite/[token]/page.tsx` lines 236-246 — confirmed broken `onClick` pattern
- Direct codebase read: `lib/email/templates/InvitationEmail.tsx` — confirmed wrong branding (#2563eb blue)
- Direct codebase read: `features/organizations/actions/invitationActions.ts` — confirmed existing action patterns
- Direct codebase read: `features/admin/components/AdminPartnersList.tsx` — confirmed dialog structure and `agencies` prop
- Direct codebase read: `app/(dashboard)/admin/partners/page.tsx` — confirmed `agencies` data already fetched
- Direct codebase read: `lib/api/organizations.ts` — confirmed `hasAvailableSeats` and `getAllOrganizations` signatures
- Direct codebase read: `package.json` — confirmed `@react-email/components: ^0.0.32`, `resend: ^4.8.0`, `next: 16.1.0`

### Secondary (MEDIUM confidence)
- `@react-email/components` documentation patterns — `render()`, `Button`, `Link`, `Section`, `Hr`, `Preview` API usage consistent with existing template files in project

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed, versions confirmed from package.json
- Architecture: HIGH — all target files read and understood, exact change locations identified
- Pitfalls: HIGH — bugs identified from direct code inspection, not hypothesis
- Template branding: HIGH — existing templates confirmed wrong, correct values from CONTEXT.md

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable dependencies, no external API changes)

---

## Key Discoveries for the Planner

1. **Templates already exist** — Tasks 1 and 2 are rewrites, not creates. The barrel index (`index.ts`) is already correct and needs no changes. `email.ts` needs no changes.

2. **Exact bug location confirmed** — The broken signout is on lines 236-246 of `app/invite/[token]/page.tsx`. The `redirect` import is already at line 4.

3. **4 create* functions to fix** — `createAdminInvitation`, `createDfyFirstInvitation`, `createTeamInvitation`, `createDevInvitation` in `lib/api/invitations.ts`. All confirmed missing `expires_at`.

4. **`inviteDfyToExistingOrgAction` is genuinely new** — The existing actions file has `inviteDfyAgencyAction` (new agency) but not an "add to existing org" variant. This is the one net-new server action.

5. **`agencies` prop already available** — `AdminPartnersList` already receives `agencies: OrganizationWithStats[]` from the page. The org dropdown can use this data directly — no new data fetching needed.

6. **No DB migrations needed** — Everything is application-layer fixes.
