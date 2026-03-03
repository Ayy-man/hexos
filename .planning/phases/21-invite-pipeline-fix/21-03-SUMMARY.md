---
phase: 21-invite-pipeline-fix
plan: "03"
subsystem: admin-invite-ui
tags: [admin, invite, dfy, server-action, dialog, mode-toggle]
dependency_graph:
  requires:
    - "inviteDfyAgencyAction (existing)"
    - "createTeamInvitation from lib/api/invitations"
    - "hasExistingInvitation from lib/api/invitations"
    - "hasAvailableSeats from lib/api/organizations"
    - "sendInvitationEmail from lib/api/email"
    - "agencies prop on AdminPartnersList (existing from page server component)"
  provides:
    - "inviteDfyToExistingOrgAction server action"
    - "AdminPartnersList dialog with mode toggle (new agency vs existing agency)"
  affects:
    - "features/organizations/actions/invitationActions.ts"
    - "features/admin/components/AdminPartnersList.tsx"
tech_stack:
  added: []
  patterns:
    - "Server action guard pattern (admin role check + duplicate check + seat check)"
    - "Conditional dialog field rendering via inviteMode state"
    - "shadcn Select for org dropdown"
key_files:
  created: []
  modified:
    - "features/organizations/actions/invitationActions.ts"
    - "features/admin/components/AdminPartnersList.tsx"
decisions:
  - "inviteDfyToExistingOrgAction does duplicate check scoped to org_id — prevents double-inviting same email to same org while allowing same email to be invited to different orgs"
  - "Seat check runs before invitation creation to give clear user-facing error when agency is full"
  - "Email label changes contextually ('Owner Email' for new, 'Partner Email' for existing) for clarity"
  - "All dialog state (inviteMode, selectedOrgId, inviteEmail, agencyName, error) resets on both success and dismiss"
metrics:
  duration: "3m 26s"
  completed_date: "2026-03-03"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 0
---

# Phase 21 Plan 03: Admin DFY Invite Toggle Summary

One-liner: Admin invite dialog now supports "Create new agency" and "Add to existing agency" modes, backed by a new `inviteDfyToExistingOrgAction` server action with admin guard, org-scoped duplicate check, and seat availability check.

## What Was Built

Added an admin-facing mode toggle to the DFY invite dialog and a new server action to handle the "add to existing agency" path.

### Task 1: inviteDfyToExistingOrgAction server action

Added to `/features/organizations/actions/invitationActions.ts` after `inviteDfyAgencyAction`:

- Auth guard: checks `user` and `profile.role === 'admin'`
- Org-scoped duplicate check: `hasExistingInvitation(email, organization_id)` — prevents duplicate invites within the same org
- Seat check: `hasAvailableSeats(organization_id)` — returns clear error if agency is full
- Creates `dfy_team` invitation via `createTeamInvitation`
- Fetches inviter name and org name for the invitation email
- Calls `sendInvitationEmail` with `'dfy_team'` type and org name
- Revalidates `/dashboard/admin/partners`
- Wrapped in try/catch with `[inviteDfyToExistingOrgAction]` error prefix

### Task 2: AdminPartnersList dialog mode toggle

Modified `/features/admin/components/AdminPartnersList.tsx`:

- Added `inviteDfyToExistingOrgAction` to existing import
- Added `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from shadcn
- Added `inviteMode: 'new' | 'existing'` and `selectedOrgId` state
- Toggle button row renders above email field: "Create new agency" | "Add to existing"
- `handleInvite` branches on `inviteMode` — calls `inviteDfyAgencyAction` or `inviteDfyToExistingOrgAction`
- Second field is conditional: agency name input (new mode) or org dropdown populated from `agencies` prop (existing mode)
- Submit disabled logic: `!inviteEmail || (inviteMode === 'new' ? !agencyName : !selectedOrgId) || isSubmitting`
- `DialogDescription` text is mode-aware
- `onOpenChange` handler resets all state (error, inviteMode, selectedOrgId, email, agencyName) on close

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: features/organizations/actions/invitationActions.ts
- FOUND: features/admin/components/AdminPartnersList.tsx
- FOUND: .planning/phases/21-invite-pipeline-fix/21-03-SUMMARY.md
- FOUND commit: 79ad3db (feat(21-03): add inviteDfyToExistingOrgAction server action)
- FOUND commit: 869b246 (feat(21-03): add mode toggle to AdminPartnersList invite dialog)
