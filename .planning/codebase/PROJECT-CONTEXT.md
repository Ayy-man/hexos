# Project Context (from agent_docs/)

**Analysis Date:** 2026-01-19
**Source:** Summarized from `agent_docs/` documentation before archiving

## What is hexOS?

hexOS is a **project management portal for Hexona's DFY (Done-For-You) automation business**. It replaces fragmented tools (Tally, WhatsApp, Notion, ClickUp) with a unified system.

**Core value proposition:**
- Role-based dashboards for different stakeholders
- AI-assisted proposal creation (Form Copilot)
- End-to-end project lifecycle management
- Scope monitoring with baseline comparison
- Stripe payment integration

## User Roles

| Role | Users | Access |
|------|-------|--------|
| `admin` | Hamza, Ayman | Everything - full access to all projects, financials, settings |
| `internal` | Future hires | All projects, no financials |
| `dev` | External contractors | Assigned projects only |
| `dfy` | Revenue-share partners | Their referred deals only |
| `client` | End customers | Their project only (if invited) |

## Project Lifecycle

```
INQUIRY → PROPOSAL → SIGN-OFF → AGREEMENT → PAYMENT → ONBOARDING → DEVELOPMENT → DELIVERY → CLOSED
```

**Full Status Flow (30 statuses, 9 phases):**

**Inquiry Phase (handled at inquiry level):**
- `inquiry_new` → `ai_matching` → `qualified`

**Proposal Phase (handled at inquiry level via `proposal_stage`):**
- `unopened` → `admin_reviewed` → `in_queue` → `working` → `on_hold` → `final_review` → `ready` → `sent` → `closed`/`lost`

**Project Phases (after conversion from inquiry):**
- Sign-off: `deliverables_pending` → `deliverables_confirmed`
- Agreement: `agreement_sent` → `agreement_signed`
- Payment: `payment_pending` → `payment_partial` → `payment_paid`
- Onboarding: `collecting_access` → `access_complete` → `dev_assigned`
- Development: `in_progress` → `blocked_client`/`blocked_internal` → `review_checkpoint` → `revisions` → `final_qa`
- Delivery: `delivered` → `acceptance_pending` → `accepted`
- Closed: `completed` / `cancelled` / `on_hold`

## Key Business Concepts

**Project Types:**
| Type | Blueprint Match | Pricing |
|------|-----------------|---------|
| Blueprint | 90%+ match | Fixed pricing from catalog |
| Blueprint + Custom | 50-89% match | Base + modifications |
| Full Custom | <50% match | Premium, custom scope |

**DFY Partner Model:**
- Partners source client deals (arbitrage model)
- Hexona fulfills the work
- Proposal negotiation workflow between DFY and internal team
- Commission/revenue share structure

**Payment Structures:**
- `100_upfront` — Single payment before work
- `50_50` — 50% start, 50% delivery
- `40_30_30` — 40% start, 30% midpoint, 30% delivery
- `custom` — Defined per project

## Features Built (MVP Complete)

### Core Workflows
- ✅ Multi-step inquiry form with AI copilot
- ✅ Proposal creation with Plate.js rich text editor
- ✅ Deliverables negotiation (DFY suggests → INT reviews → counter offers)
- ✅ Project initiation wizard (3-step: deliverables → requirements → review)
- ✅ Full project status management (30 statuses, 9 phases)

### Dashboards
- ✅ Admin dashboard (all projects, financials, pipeline)
- ✅ Dev dashboard (assigned projects, deliverables)
- ✅ DFY dashboard (referred deals, commissions)
- ✅ Client dashboard (project progress)

### Project Management
- ✅ Deliverables CRUD with Hill Chart visualization
- ✅ Hierarchical requirements tree (onboarding checklist)
- ✅ Two-workspace file system (internal/client)
- ✅ Gameplan documents with @mentions and version history
- ✅ Activity logging throughout

### Developer Features
- ✅ Daily check-in system with position tracking
- ✅ Delay tracking (client/dev delays)
- ✅ Extension request workflow with DFY approval
- ✅ Skills matrix with gamification (XP, levels, badges)

### Finances
- ✅ Invoice CRUD with Stripe integration
- ✅ Dev payout workflow (wire transfer/invoice options)
- ✅ Expense tracking

### Catalogs
- ✅ Blueprints catalog (productized services)
- ✅ Case studies catalog
- ✅ Requirement templates (hierarchical)

### UX
- ✅ Command palette (⌘K global search)
- ✅ Project progress bars (phase + deliverable based)
- ✅ Skeleton loaders, error boundaries
- ✅ Real-time presence indicators
- ✅ PWA with offline support

## Features NOT Built (Future)

**Near-term planned:**
- Email notifications (Resend integration planned)
- Scope monitoring automation
- Client portal improvements

**Future roadmap (documented but not scheduled):**
- A2UI agent-generated interfaces
- Interactive proposal builder
- BaigWork marketplace
- Multi-tenant/white-label
- AI scope creep detection
- Recurring projects/retainers

## Critical Rules (from CLAUDE.md)

1. **Always deploy to Vercel** — No localhost testing. Push → Preview URL → Test
2. **Always push to git** — Commit after every meaningful change
3. **Never edit old migrations** — Create new migration files only
4. **Never manually write DB types** — Run `pnpm supabase:types` to regenerate
5. **All DB calls through lib/api/** — Never call Supabase from components directly
6. **RLS is ON** — Security at database level

## Known Gotchas

**Next.js Caching:**
- Server components cache aggressively in production
- Add `export const dynamic = 'force-dynamic'` to pages with frequently-changing data

**Emails Not Implemented:**
- Email sending is stubbed (console.log only)
- Admin must manually copy/share invite links

**RLS Crisis (Jan 2026):**
- Database was recovered from recursive RLS policy issue
- Safe functions: `can_access_file_v2`, `can_access_project`, `get_user_role`
- Removed (dangerous): `get_effective_file_visibility`, `can_access_file`

## Glossary

| Term | Definition |
|------|------------|
| DFY | Done-For-You partner who sources client deals |
| Blueprint | Standardized, productized service offering |
| Arbitrage | Business model where partners source deals, Hexona fulfills |
| Scope Baseline | Deliverables snapshot created when project signed off |
| Form Copilot | AI assistant that pre-fills forms from context |
| Hill Chart | Progress visualization (0-100% with figuring out/making it happen phases) |
| Gameplan | Rich text project planning document |

---

*Context summary: 2026-01-19*
*Source: agent_docs/ (archived)*
