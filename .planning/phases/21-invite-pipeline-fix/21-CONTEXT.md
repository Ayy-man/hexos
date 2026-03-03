# Phase 21: Invite Pipeline Fix - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning
**Source:** PRD Express Path (docs/plans/2026-03-03-auth-invite-implementation-plan.md)

<domain>
## Phase Boundary

Fix the existing invite email pipeline so invitations actually send, set proper expiry on creation, fix the broken signout on the invite acceptance page, and add an admin toggle for inviting DFY users to new vs existing organizations. This phase makes the existing invite system work end-to-end before modern auth methods are added in Phase 22.

</domain>

<decisions>
## Implementation Decisions

### Email Templates
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

### Invitation Expiry Fix
- All 4 create*Invitation() functions (createAdminInvitation, createDfyFirstInvitation, createTeamInvitation, createDevInvitation) must explicitly set `expires_at` to `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()`
- Added directly to the `.insert({})` object in each function
- Target file: `lib/api/invitations.ts`

### Signout Fix on Invite Page
- Replace the broken `<a onClick>` with a `<form action>` pattern using server action
- Server action calls `supabase.auth.signOut()` then `redirect(/invite/${token}?mode=login)`
- Target: `app/invite/[token]/page.tsx` around lines 236-246
- `redirect` already imported at line 4

### Admin DFY Invite Toggle
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

</decisions>

<specifics>
## Specific Ideas

- Existing `lib/api/email.ts` already imports from `@/lib/email/templates` — the barrel export will fix the broken import
- `sendInvitationEmail()` is already called in invitation actions but renders nothing — templates make it functional
- The `agencies` prop needed for the org dropdown in AdminPartnersList already exists in the page server component data fetching
- The invite page already imports `redirect` from `next/navigation` at line 4
- `hasExistingInvitation` and `hasAvailableSeats` helper functions already exist in `lib/api/invitations.ts`

</specifics>

<deferred>
## Deferred Ideas

- Duplicate invite detection on direct invite paths (partially covered by inviteDfyToExistingOrgAction, full coverage deferred)
- Transaction safety for acceptInvitation() — deferred to Phase 22/23
- Rate limiting on invitation creation — deferred to Phase 22

</deferred>

---

*Phase: 21-invite-pipeline-fix*
*Context gathered: 2026-03-03 via PRD Express Path*
