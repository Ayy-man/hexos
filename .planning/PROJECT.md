# hexOS

## What This Is

A project management portal for Hexona's DFY automation business, replacing fragmented tools (Tally, WhatsApp, Notion, ClickUp) with a unified system. Multi-tenant SaaS with role-based dashboards for Admin, Internal, Dev, DFY partners, and Clients — covering the full lifecycle from inquiry to delivery.

## Core Value

DFY partners can submit inquiries, receive proposals, and track their referred projects through a single portal — with complete visibility appropriate to their role.

## Requirements

### Validated

These capabilities are already shipped and working:

- ✓ Multi-step inquiry form with AI Copilot — existing
- ✓ Proposal pipeline with 10-stage Kanban board — existing
- ✓ Rich text documents (Plate.js) with comments, suggestions, discussions — existing
- ✓ Deliverables negotiation with counter offers and approval workflow — existing
- ✓ Project initiation wizard with hierarchical requirements — existing
- ✓ Full project lifecycle (22 statuses, 7 phases) — existing
- ✓ Role-based dashboards (Admin, Internal, Dev, DFY, Client) — existing
- ✓ Blueprints and case studies catalog — existing
- ✓ Conversations with bidirectional sync to inquiry comments — existing
- ✓ Developer skills/XP system with badges — existing
- ✓ Daily dev check-ins with position tracking — existing
- ✓ Delay tracking and extension requests — existing
- ✓ Invitation system with organization creation — existing
- ✓ Dev application self-signup with approval — existing
- ✓ Stripe backend (webhooks, invoice API) — existing
- ✓ Dev payouts with wire transfer workflow — existing
- ✓ DFY proposal reminders with snooze system — existing
- ✓ Command palette (Cmd+K) global search — existing
- ✓ Mobile responsive layouts — existing

### Active

Current scope for this milestone:

- [ ] Email delivery for invitations (Resend integration)
- [ ] Notification center (in-app notification UI)
- [ ] Email notifications (stage changes, reminders)
- [ ] Invoice management UI (admin dashboard)
- [ ] Gantt view for deliverables
- [ ] Scope monitoring system (baseline, change detection, approval)
- [ ] External portals polish (dev/DFY/client experience)
- [ ] RequirementsTab migration to onboarding_requirements table
- [ ] Deliverables sign-off flow

### Out of Scope

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
- shadcn/ui (Vega style, Stone+Cyan theme, Figtree font)
- Stripe for payments, Plate.js for rich text
- Deployed on Vercel, no localhost testing

**Recent History:**
- Database recovered from RLS crisis (2026-01-03) — safe functions documented
- Pulse system and time tracking removed (Jan 2026)
- Dev skills/gamification system completed
- Conversations bidirectional sync implemented

**Known Issues:**
- DFY invoice query broken with FK alias (PGRST error)
- AI Copilot form state sync broken (fields don't visually update)
- Admin metrics SQL functions use invalid enum value
- Authorization bypass in payout admin functions (missing role check)

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

---
*Last updated: 2026-01-19 after GSD initialization*
