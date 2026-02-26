# hexOS

## What This Is

A project management portal for Hexona's DFY automation business, replacing fragmented tools (Tally, WhatsApp, Notion, ClickUp) with a unified system. Multi-tenant SaaS with role-based dashboards for Admin, Internal, Dev, DFY partners, and Clients — covering the full lifecycle from inquiry to delivery to retainer.

## Core Value

DFY partners can submit inquiries, receive proposals, and track their referred projects through a single portal — with complete visibility appropriate to their role.

## Requirements

### Validated

These capabilities are shipped and working:

- ✓ Multi-step inquiry form with AI Copilot — v1.0
- ✓ Proposal pipeline with 10-stage Kanban board — v1.0
- ✓ Rich text documents (Plate.js) with comments, suggestions, discussions — v1.0
- ✓ Deliverables negotiation with counter offers and approval workflow — v1.0
- ✓ Project initiation wizard with hierarchical requirements — v1.0
- ✓ Full project lifecycle (22 statuses, 7 phases) — v1.0
- ✓ Role-based dashboards (Admin, Internal, Dev, DFY, Client) — v1.0
- ✓ Blueprints and case studies catalog with Loom video support — v1.0
- ✓ Conversations with bidirectional sync to inquiry comments — v1.0
- ✓ Developer skills/XP system with badges — v1.0
- ✓ Daily dev check-ins with position tracking — v1.0
- ✓ Delay tracking and extension requests — v1.0
- ✓ Invitation system with organization creation — v1.0
- ✓ Dev application self-signup with approval — v1.0
- ✓ Stripe backend (webhooks, invoice API) — v1.0
- ✓ Dev payouts with wire transfer workflow — v1.0
- ✓ DFY proposal reminders with snooze system — v1.0
- ✓ Command palette (Cmd+K) global search — v1.0
- ✓ Mobile responsive layouts — v1.0
- ✓ Email delivery with Resend + React Email templates — v1.0
- ✓ Notification center UI (bell icon, popover, realtime, full page) — v1.0
- ✓ Toast notification deduplication — v1.0
- ✓ White-labeled proposal exports (PDF + web) — v1.0
- ✓ Suggestion box with conversation threads — v1.0
- ✓ Developer bidding system with AI redacted briefs — v1.0
- ✓ Pre-commitment workflow for opportunities — v1.0
- ✓ Meeting assistant with Recall.ai + AI transcription — v1.0
- ✓ Offboarding & retainer system with completion ceremony — v1.0
- ✓ Full notification coverage across all lifecycle events — v1.0
- ✓ Finance tab with logical groupings (Revenue, Costs, Timeline) — v1.0

### Active

**No critical blockers remaining.** Ready for soft launch.

**Polish (can launch without):**
- [ ] Email notifications (stage changes, reminders)
- [ ] Gantt view for deliverables
- [ ] Scope monitoring system (baseline, change detection, approval)
- [ ] External portals polish (dev/DFY/client experience)
- [ ] RequirementsTab migration to onboarding_requirements table
- [ ] Deliverables sign-off flow
- [ ] Invoice management UI improvements

### Out of Scope

- Client invitation flow — deprioritized for v1
- Mercury payout execution — deprioritized for v1
- Public invoice payment page — deprioritized for v1
- A2UI agent-generated UIs — future iteration
- Interactive proposal builder (client-facing) — future iteration
- BaigWork marketplace — future iteration
- WhatsApp integration — future iteration
- AI scope creep detection — future iteration
- Multi-tenant white-labeling (custom subdomains) — future iteration
- Agreement/contract phase with e-signatures — future iteration
- Time tracking — removed, may return redesigned

## Context

**Technical Environment:**
- Next.js 16 (App Router) + TypeScript strict mode
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- shadcn/ui (dark-first warm token system, General Sans font)
- Stripe for payments, Plate.js for rich text, Resend for email, Recall.ai for meetings
- Deployed on Vercel, no localhost testing

**Current State (post v1.0):**
- 16 phases shipped across v1.0 Polish milestone (Jan 19 - Feb 26, 2026)
- All critical production bugs resolved
- Full notification coverage implemented
- Meeting assistant fully operational
- Offboarding/retainer lifecycle complete
- UI brand redesign shipped (dark-first warm tokens, General Sans, FAB)

**Known Issues:**
- AI Copilot form state sync (fields may not visually update) — needs testing, may be edge case
- Payout admin actions missing role check — mitigated by layout protection

## Constraints

- **Deployment:** Always deploy to Vercel — no localhost testing
- **Database:** Never edit old migrations, never create recursive RLS functions
- **Types:** Never manually write DB types — regenerate with `pnpm supabase:types`
- **API:** All DB calls through `lib/api/` — never call Supabase from components directly
- **Security:** RLS is ON from day 1, dev as admin role to see all data

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth only | Native RLS integration, no Firebase complexity | ✓ Good |
| Feature-sliced architecture | Easy to add new features, clear boundaries | ✓ Good |
| Invitation-based onboarding | Control over who joins, organization structure | ✓ Good |
| Plate.js for rich text | Full-featured editor, JSONB storage | ✓ Good |
| Remove Pulse/time tracking | Overengineered, will return redesigned | — Pending |
| Resend for email delivery | Simple API, React Email support, good DX | ✓ Good |
| Recall.ai for meeting bot | Managed service, multi-platform, reasonable cost | ✓ Good |
| Database-backed toast dedup | Works across tabs and page refreshes | ✓ Good |
| Retainer as project lifecycle phase | Reuses project infrastructure, clean transitions | ✓ Good |
| Admin client for cross-user notifications | Bypasses RLS for notification delivery | ✓ Good |

---
*Last updated: 2026-02-26 after v1.0 milestone*
