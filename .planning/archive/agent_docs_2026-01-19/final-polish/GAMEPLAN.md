# hexOS Final Polish Gameplan

**Generated:** 2026-01-10
**Total Issues:** 30 (17 bugs, 13 feature gaps)
**Priority:** Critical fixes first, then UX improvements, then new features

---

## Agent Assignments

| Agent | Focus Area | Issue Count |
|-------|------------|-------------|
| Agent 2 | UI/UX + Form Flow | 11 |
| Agent 3 | Data/API + Queries + Notifications | 12 |
| Agent 4 | Features + Permissions + New Functionality | 9 |

---

## Critical Files Reference

**Notification System:**
- `lib/api/notifications.ts` - createNotification function
- `lib/api/inquiries.ts` - missing notification calls (lines 216, 274, 410, 447)
- `lib/api/scope-monitoring.ts` - missing notification calls (lines 133, 337, 371)
- `hooks/use-notifications-realtime.ts` - working correctly

**Inquiry/Proposal Flow:**
- `features/inquiries/components/IntakeForm.tsx` - form state management
- `features/inquiries/components/AICopilotSidebar.tsx` - AI field setting
- `features/inquiries/components/MyVersionTab.tsx` - page reload issue (line 191)
- `features/inquiries/components/ShareLinkButton.tsx` - share logic
- `features/inquiries/components/ExportPDFButton.tsx` - PDF export
- `features/inquiries/utils/generateDocumentFromInquiry.ts` - emoji issue (lines 104-177)
- `app/(dashboard)/inquiries/[id]/page.tsx` - enum display (lines 638-671)

**Projects/DFY/Admin:**
- `features/projects/actions/projectActions.ts` - delete logic (lines 319-348)
- `lib/api/invoices.ts` - FK alias issue (lines 30-72)
- `supabase/migrations/20260107000200_comprehensive_admin_metrics.sql` - invalid enum 'closed'
- `supabase/migrations/20260108000004_secure_metrics_functions.sql` - invalid enum

---

## Priority Tiers

### P0 Critical (Blocks Core Functionality)

| # | Issue | Agent | Files | Root Cause |
|---|-------|-------|-------|------------|
| 1 | Notifications not triggering on DFY submit/proposal updates | 3 | `lib/api/inquiries.ts` | No `createNotification()` calls in `submitProposalToDfy()`, `updateInquiryStage()` |
| 2 | Admin metrics invalid enum `'closed'` | 3 | Multiple migrations | Should use `'agreed'` for won deals |
| 3 | DFY invoice query broken (`projects_1.name`) | 3 | `lib/api/invoices.ts:42` | FK relation alias issue in PostgREST |
| 4 | Team settings PGRST201 ambiguous join | 3 | `dashboard/dfy/settings/team/` | Needs explicit FK in organization_members query |

### P1 High (Major UX Impact)

| # | Issue | Agent | Files | Root Cause |
|---|-------|-------|-------|------------|
| 5 | AI Copilot "Updated 16 fields" but nothing updates | 2 | `AICopilotSidebar.tsx`, `IntakeForm.tsx` | Form state updates but flash animation selector broken |
| 6 | "Copy from Proposal" causes full page refresh | 2 | `MyVersionTab.tsx:191` | Uses `window.location.reload()` instead of editor state update |
| 7 | Fields showing `[object Object]` | 2 | `generateDocumentFromInquiry.ts:166-195` | `String(value)` on objects without proper handling |
| 8 | Urgency shows raw enum `thirty_days` | 2 | `inquiries/[id]/page.tsx:664` | No enum-to-label mapping |
| 9 | Download PDF has garbled emojis | 2 | `generateDocumentFromInquiry.ts:104-177` | Emojis in PDF text not rendered properly |
| 10 | Share Proposal shares INQUIRY instead | 2 | `ShareLinkButton.tsx` | Single `public_token` for both; no proposal route param |
| 11 | Project delete fails with 500 errors | 3 | `projectActions.ts:319-348` | Hard delete cascading issues; needs soft delete |

### P2 Medium (Should Fix)

| # | Issue | Agent | Files | Root Cause |
|---|-------|-------|-------|------------|
| 12 | Scope change notifications never fire | 3 | `lib/api/scope-monitoring.ts` | No `createNotification()` imports or calls |
| 13 | Requirement unblocking only console logs | 3 | `lib/api/requirement-notifications.ts` | Never creates in-app notification |
| 14 | Inquiry assignment no notification | 3 | `lib/api/inquiries.ts:274` | `assignInquiry()` missing notification |
| 15 | Form too small/cramped | 2 | IntakeForm components | CSS/layout issue |
| 16 | Back button breaks "Next" button state | 2 | `IntakeForm.tsx` | Navigation state issue |
| 17 | No auto-advance on option selection | 2 | `IntakeForm.tsx` | Missing onChange handler to advance |
| 18 | 406 on conversation_read_status | 3 | RLS policies | May need policy adjustment |

### P3 Low (Polish/New Features)

| # | Issue | Agent | Files | Description |
|---|-------|-------|-------|-------------|
| 19 | Archive vs Delete system | 4 | migrations, projectActions.ts | Add `archived_at`, `deleted_at` columns |
| 20 | Copy Document/Proposal button | 4 | Document/Proposal tab headers | Clipboard copy as markdown |
| 21 | DFY View Indicator (eye icon) | 4 | Inquiry list, migrations | Add `admin_viewed_at` column |
| 22 | Meeting Recording field | 4 | Intake forms, migrations | URL input for Fathom/Fireflies |
| 23 | Realtime stage changes | 4 | Supabase subscriptions | Live updates on Kanban/detail views |
| 24 | Budget field conditional | 4 | CustomProposal step | Show number input or dropdown based on type |
| 25 | Urgency reframe | 4 | CustomProposal step | "Is there a hard deadline?" with reason |
| 26 | Profile system | 4 | New `/settings/profile` route | Avatar, name, phone, timezone, prefs | ✅ COMPLETE |
| 27 | "Copy from Proposal" icon confusing | 2 | MyVersionTab.tsx | Change to "Import from Proposal" |
| 28 | Push notifications disconnected | 3 | sendPushNotification integration | Connect to notification creation |
| 29 | Document tab admin-only edit | 4 | Inquiry [id] page Document tab | Admin-only edit on inquiry Document tab (NOT proposal views) |
| 30 | Preferred Go-Live Date optional | 4 | Form schema | Make field optional |

---

## Dependency Graph

```
P0 Issues (no dependencies, can start immediately):
- #1 Notification triggers
- #2 Admin metrics enum
- #3 DFY invoice query
- #4 Team settings join

#11 Project delete → blocks → #19 Archive vs Delete system

#1 Notifications fix → unblocks → #12, #13, #14 (other notification issues)
#1 Notifications fix → unblocks → #28 Push notifications

#5 AI Copilot fix → unblocks → #17 Auto-advance (both form state related)

#6 Copy from Proposal → independent
#7-10 Display issues → independent
```

---

## Per-Agent Task Lists

### Agent 2: UI/UX + Form Flow

**Priority Order:**
1. [P1] #5 — Fix AI Copilot form state sync (flash animation selector, form values verification)
2. [P1] #6 — Replace page reload with editor state update in Copy from Proposal
3. [P1] #7 — Fix `[object Object]` display in generateDocumentFromInquiry.ts
4. [P1] #8 — Add enum-to-label mapping for urgency and other enums
5. [P1] #9 — Remove emojis from PDF generation
6. [P1] #10 — Fix Share Proposal to share proposal (add route param or separate token)
7. [P2] #15 — Improve form sizing/layout
8. [P2] #16 — Fix back button navigation state
9. [P2] #17 — Add auto-advance on option selection
10. [P3] #27 — Change "Copy from Proposal" icon to clearer label

**Key Files:**
- `features/inquiries/components/IntakeForm.tsx`
- `features/inquiries/components/AICopilotSidebar.tsx`
- `features/inquiries/components/MyVersionTab.tsx`
- `features/inquiries/components/ShareLinkButton.tsx`
- `features/inquiries/utils/generateDocumentFromInquiry.ts`
- `app/(dashboard)/inquiries/[id]/page.tsx`

---

### Agent 3: Data/API + Queries + Notifications

**Priority Order:**
1. [P0] #1 — Add notification calls to `submitProposalToDfy()`, `updateInquiryStage()` in inquiries.ts
2. [P0] #2 — Fix admin metrics: replace `'closed'` with `'agreed'` in all SQL functions
3. [P0] #3 — Fix DFY invoice query FK alias (projects:project_id)
4. [P0] #4 — Fix team settings ambiguous join (explicit FK reference)
5. [P1] #11 — Implement soft delete for projects (update delete logic, add migration)
6. [P2] #12 — Add notification calls to scope change functions
7. [P2] #13 — Convert requirement unblocking console.log to createNotification
8. [P2] #14 — Add notification to assignInquiry()
9. [P2] #18 — Investigate and fix conversation_read_status 406 errors
10. [P3] #28 — Connect push notifications to notification creation flow

**Key Files:**
- `lib/api/inquiries.ts` (add import + calls)
- `lib/api/scope-monitoring.ts` (add import + calls)
- `lib/api/requirement-notifications.ts` (replace console.log)
- `lib/api/invoices.ts` (fix query)
- `supabase/migrations/20260107000200_comprehensive_admin_metrics.sql`
- `supabase/migrations/20260108000004_secure_metrics_functions.sql`
- `features/projects/actions/projectActions.ts`

**New Migrations Needed:**
- Add `archived_at`, `deleted_at` to projects table
- Fix metrics functions with correct enum values

---

### Agent 4: Features + Permissions + New Functionality

**Priority Order:**
1. [P3] #19 — Complete archive vs delete system (after Agent 3 adds columns)
2. [P3] #20 — Add Copy Document/Proposal clipboard button
3. [P3] #21 — Add DFY View Indicator (`admin_viewed_at` column + eye icon)
4. [P3] #22 — Add Meeting Recording URL field to intake forms
5. [P3] #23 — Implement realtime stage change subscriptions
6. [P3] #24 — Budget field conditional (number input vs dropdown)
7. [P3] #25 — Reframe Urgency field ("Is there a hard deadline?")
8. [P3] #29 — Implement document edit permissions (admin edit, others comment)
9. [P3] #30 — Preferred Go-Live Date optional

**Key Files:**
- All intake form components
- Document/Proposal tab headers
- `features/projects/components/files/DocumentEditor.tsx`
- `features/inquiries/components/deliverables/BlueprintTierSelector.tsx`

**New Routes Needed:**
- `/settings/profile` (if implementing #26)

---

## Execution Order

**Phase 1 (Critical - Agent 3 leads):**
- Agent 3: Fix P0 issues #1-4 simultaneously
- Agent 2: Start on #5-7 (form state, display issues)
- Agent 4: Research document permissions implementation

**Phase 2 (High Priority):**
- Agent 3: Complete #11 (soft delete migration + logic)
- Agent 2: Complete #8-10 (enum labels, PDF emojis, share fix)
- Agent 4: Start #19 (archive UI using Agent 3's migration)

**Phase 3 (Medium Priority):**
- Agent 3: #12-14 (remaining notification issues)
- Agent 2: #15-17 (form UX improvements)
- Agent 4: #20-23 (new features)

**Phase 4 (Polish):**
- All agents: Remaining P3 items

---

## Validation Checklist

After all fixes, verify:
- [ ] Submitting DFY proposal creates notification for partner
- [ ] Changing inquiry stage notifies assigned user
- [ ] Admin metrics page loads without enum errors
- [ ] DFY dashboard invoices load correctly
- [ ] Team settings page loads without PGRST201 error
- [ ] AI Copilot actually updates form fields visibly
- [ ] Copy from Proposal updates editor without page reload
- [ ] No `[object Object]` in inquiry display
- [ ] Urgency shows "< 30 days" not "thirty_days"
- [ ] PDF downloads without garbled characters
- [ ] Share Proposal copies proposal URL (not inquiry)
- [ ] Project archive moves to archive view, not hard delete
- [ ] Scope change approvals trigger notifications
- [ ] Document tab on inquiry is admin-only editable
