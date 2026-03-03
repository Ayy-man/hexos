# hexOS Roadmap

## Milestones

- **v1.0 Polish** — Phases 01-16 (shipped 2026-02-26) | [Archive](milestones/v1.0-ROADMAP.md)

<details>
<summary>v1.0 Polish (Phases 01-16) — SHIPPED 2026-02-26</summary>

- [x] Phase 01: Critical Bugs (2/2 plans)
- [x] Phase 02: Code Cleanup (1/1 plan)
- [x] Phase 03: Form Input Fixes (2/2 plans)
- [x] Phase 04: Branding & PDF Polish (1/1 plan)
- [x] Phase 05: Sidebar & Dashboard Polish (3/3 plans)
- [x] Phase 06: Blueprints & Case Studies (3/3 plans)
- [x] Phase 07: Finance Tab Redesign (2/2 plans)
- [x] Phase 08: Testing Tab Polish (1/1 plan)
- [x] Phase 09: Suggestion Box Expansion (3/3 plans)
- [x] Phase 10: Opportunities Overhaul (5/5 plans)
- [x] Phase 11: Notification System Audit (2/2 plans)
- [x] Phase 12: Offboarding Flow Design (design only)
- [x] Phase 13: Email Delivery with Resend (2/2 plans)
- [x] Phase 14: Offboarding & Retainer System (5/5 plans)
- [x] Phase 15: Meeting Assistant (7/7 plans)
- [x] Phase 16: Notification Coverage Overhaul (5/5 plans)

</details>

---

## v1.1 Performance

- [ ] Phase 17: Performance Optimization (6 work streams)
  - WS-1: Caching & Auth Dedup
  - WS-2: Bundle & Dynamic Imports
  - WS-3: Loading States
  - WS-4: Waterfall Fixes
  - WS-5: Re-render Fixes
  - WS-6: CSS & Animation Fixes

---

## v1.2 UX Enrichment

- [x] Phase 18: Rich Activity Timeline (completed 2026-03-02)
  - Upgrade both Activity Timeline (full tab) and Recent Activity (overview card) with rich inline details per activity type
  - Category-specific icons + color accents for visual differentiation (status, deliverables, documents, hill chart, files, team, etc.)
  - Toggleable filter chips (All, Status, Deliverables, Documents, Hill Chart, Files, Team)
  - Show entity names, field-level diffs (old → new), zone labels, file names, and truncated previews inline
  - Client-side filtering on already-loaded activity data

- [x] Phase 19: Enhanced Sidebar Hover Previews with Drill-Down Navigation (completed 2026-03-02)
  - Add second-layer drill-down to existing tooltip stat rows (Inquiries, Projects, Conversations, Suggestions) — hover a count row to see actual item names
  - Make every entity name in tooltips a clickable Link for direct navigation
  - Add new hover cards for Meetings, Blueprints, Case Studies, and Blockers sidebar items
  - Fetch additional data (item names/titles) to power the drill-down lists
  - Pinnable tooltips (click to keep open) for comfortable reading and clicking
  - **Plans:** 3 plans
    - [x] 19-01-PLAN.md — API functions + Route Handler for drill-down data (completed 2026-03-03)
    - [ ] 19-02-PLAN.md — PinnableHoverCard component + upgrade existing 4 tooltips
    - [ ] 19-03-PLAN.md — 4 new hover cards (Meetings, Blueprints, Case Studies, Blockers) + visual verification

- [ ] Phase 20: Onboarding Stepper Form
  - Replace flat onboarding tab with a guided multi-step form experience
  - Admin builds onboarding forms: categories with mixed question types (text, textarea, select, multi_select, boolean) and requirements
  - DFY partner fills out as a vertical stepper: deliverables sign-off → category sections → review & complete
  - Admin monitors answer progress with completion rings per category and inline answer previews
  - Role-aware UI: same page adapts for admin (build + monitor) and DFY (fill out)
  - New tables: onboarding_categories, onboarding_questions, onboarding_answers
  - Uses Stepperize (headless stepper) + existing shadcn/react-hook-form/zod

---

## v1.3 Auth & Invite System

- [x] Phase 21: Invite Pipeline Fix (completed 2026-03-03)
  - Create 4 React Email templates (invitation, app received, app approved, app rejected) with shared hexOS base layout
  - Fix invite creation to always set expires_at (+7 days) on all create*Invitation() functions
  - Add duplicate invite detection (hasExistingInvitation check) on all invite creation paths
  - Fix broken signout on /invite/[token] page (replace client onClick with proper form action)
  - Add admin DFY toggle: "Create new agency" vs "Add to existing agency" in partner invite dialog
  - DFY orgs can self-invite up to 3 teammates
  - **Design doc:** docs/plans/2026-03-03-auth-invite-system-design.md
  - **Implementation plan:** docs/plans/2026-03-03-auth-invite-implementation-plan.md (Tasks 1-5)
  - **Plans:** 3 plans
    - [ ] 21-01-PLAN.md — BaseLayout + 4 email template rewrites with hexOS branding
    - [ ] 21-02-PLAN.md — Invitation expiry fix + signout fix on invite page
    - [ ] 21-03-PLAN.md — Admin DFY toggle (new action + dialog mode switch)

- [ ] Phase 22: Modern Auth Methods
  - Google OAuth via Supabase provider (login page button + invite page support)
  - Magic links as optional login method (signInWithOtp + confirmation UI)
  - Password reset flow (forgot-password page + reset-password page + email template)
  - Email verification on signup
  - Unified /auth/callback route handling OAuth, magic links, and password reset
  - Invite-aware auth callback: validates and accepts invitation after OAuth/magic link signup
  - **Implementation plan:** docs/plans/2026-03-03-auth-invite-implementation-plan.md (Tasks 6-10)

- [ ] Phase 23: Onboarding Wizard
  - Add has_completed_onboarding boolean to profiles table (Supabase migration)
  - 2-3 step post-invite wizard: profile completion → role-specific intro → dashboard
  - Role-specific Step 2 content: DFY owner (org setup), DFY team (team intro), Dev (skills/availability), Admin (tools overview), Client (project dashboard)
  - Dashboard layout redirects to /onboarding if flag is false
  - Replaces existing onboarding flow entirely
  - Supersedes Phase 20 onboarding scope for auth-related flows
  - **Implementation plan:** docs/plans/2026-03-03-auth-invite-implementation-plan.md (Tasks 11-14)
