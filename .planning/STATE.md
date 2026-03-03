---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Performance
status: unknown
last_updated: "2026-03-03T14:51:40.913Z"
progress:
  total_phases: 22
  completed_phases: 18
  total_plans: 55
  completed_plans: 53
---

# Project State

**Milestone:** v1.2 UX Enrichment — IN PROGRESS
**Repository:** hexos-main
**Last Updated:** 2026-03-02

---

## Current Position

Status: Phase 22 in progress — 22-01 complete (auth callback + server actions)
Last activity: 2026-03-03 - Phase 22-01 executed — unified auth callback route + 4 server actions (Google OAuth, magic link, password reset, update password)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** DFY partners can submit inquiries, receive proposals, and track projects through a single portal
**Current focus:** UX Enrichment (Phase 19)

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 22-01-PLAN.md — auth callback route + 4 server actions (Google OAuth, magic link, password reset, update password)
Resume file: .planning/phases/22-modern-auth-methods/22-01-SUMMARY.md

## Decisions

- Phase 18-01: Used CATEGORY_CONFIG map as single source of truth for activity type visual config in activity-utils.ts
- Phase 18-01: Used React.createElement in .ts file to return React nodes without requiring JSX transform
- Phase 18-02: Always render Recent Activity card with empty state rather than conditionally hiding it
- Phase 18-02: Cross-tab navigation via onNavigateToActivity callback prop (not string-based tab name passed directly)
- Phase 19-01: Used b.name (not b.title) for blueprints and case-studies — actual schema column is name
- Phase 19-01: getUpcomingMeetings uses createServerClient alias since meetings.ts already imports createClient from admin
- Phase 19-01: Non-admin users receive empty items array (not 403) on admin-gated sidebar drill-down types
- Phase 19-02: Invisible overlay button with stopPropagation for pin capture — preserves underlying Link click for navigation
- Phase 19-02: DrillDownRow caches via items===null guard — fetches once on first hover, never re-fetches
- Phase 19-03: Meetings hover card gates on meetingsSummary.length > 0 — no tooltip shown when zero upcoming meetings
- Phase 19-03: BlockerHoverContent uses conditional rendering per severity row — only non-zero counts rendered to avoid noise
- Phase 19-03: Critical blocker badge uses bg-red-500 class override for distinct red color
- Phase 21-02: signOutAndRedirect defined as named server action inside page component — gives access to token from page params scope via closure
- Phase 21-02: createDevApplication left without expires_at — it uses pending_approval (awaiting admin review); approveDevApplication already sets expires_at when converting to pending
- Phase 21-03: inviteDfyToExistingOrgAction duplicate check scoped to org_id — allows same email to be in different orgs but prevents duplicate within same org
- Phase 21-03: Seat check in inviteDfyToExistingOrgAction runs before invitation creation to give clear user-facing error when agency is full
- [Phase 21-invite-pipeline-fix]: BaseLayout is internal-only (not barrel-exported) — templates import directly from ./BaseLayout
- [Phase 21-invite-pipeline-fix]: All email template buttons use #0891b2 (cyan-600), replacing old #2563eb blue
- [Phase 22-modern-auth-methods]: Auth callback at app/auth/callback/route.ts (not in route group) — route groups include layout, callback needs redirect-only response
- [Phase 22-modern-auth-methods]: Invite token passed as ?token= searchParam through OAuth callback — avoids Supabase PKCE state manipulation
- [Phase 22-modern-auth-methods]: Failed invite acceptance still redirects to /dashboard — user is authenticated, graceful degradation preferred over error
- [Phase 22-modern-auth-methods]: Profile role check in callback rejects new OAuth users without invitations — enforces invite-only access

## Accumulated Context

### Roadmap Evolution

- Phase 19 added: Enhanced Sidebar Hover Previews with Drill-Down Navigation (v1.2 UX Enrichment)
- Phase 19 in progress: API layer (19-01), UI layer (19-02), and new cards (19-03 Tasks 1-2) executed — awaiting visual verification
- v1.3 Auth & Invite System milestone added with 3 phases:
  - Phase 21 added: Invite Pipeline Fix — email templates, expiry fix, signout fix, admin DFY toggle
  - Phase 22 added: Modern Auth Methods — Google OAuth, magic links, password reset
  - Phase 23 added: Onboarding Wizard — post-invite stepper, role-specific intro, dashboard redirect

---

*Updated 2026-03-03 — Phase 22-01 complete — auth callback route + 4 server actions (signInWithGoogle, signInWithMagicLink, resetPassword, updatePassword)*
