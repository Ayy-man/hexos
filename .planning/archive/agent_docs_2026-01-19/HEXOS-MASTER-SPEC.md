# hexOS - Master Specification

> Single source of truth for the hexOS project management portal.

## Document Control

| Field | Value |
|-------|-------|
| Version | 2.0 |
| Date | December 21, 2025 |
| Status | Ready for Development |

## 1. Executive Summary

hexOS is a custom project management portal for Hexona's DFY automation business. It replaces fragmented tools (Tally, WhatsApp, Notion, ClickUp) with a unified system featuring:

- Role-based dashboards (Admin, Dev, DFY, Client)
- AI-assisted proposal creation (Form Copilot)
- Project lifecycle management from inquiry to delivery
- Scope monitoring with baseline comparison
- Stripe payment integration

## 2. Key Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|-----------|
| Auth provider | Supabase Auth only | Native RLS integration, no Firebase complexity |
| Database | Supabase PostgreSQL | All-in-one: DB, Auth, Storage, Realtime |
| RLS | ON from day 1 | Dev as admin avoids friction, security built-in |
| File storage | Supabase Storage | No Google Drive integration |
| Local testing | No localhost | Always deploy to Vercel preview |
| Package manager | pnpm | Faster, stricter |
| UI framework | shadcn/ui (Vega preset) | Stone+Cyan theme, Figtree font |

## 3. Tech Stack

```
Frontend:     Next.js 14 (App Router) + TypeScript (strict)
UI:           shadcn/ui (Vega, Stone+Cyan, Lucide icons)
Database:     Supabase PostgreSQL + RLS
Auth:         Supabase Auth
Storage:      Supabase Storage
Payments:     Stripe
Hosting:      Vercel
```

## 4. User Roles

| Role | Users | Access |
|------|-------|--------|
| Admin | Hamza, Ayman | Everything |
| Internal | Future hires | All projects, no financials |
| Dev | External contractors | Assigned projects only |
| DFY | Revenue-share partners | Their deals only |
| Client | End customers (if invited) | Their project only |

## 5. Project Lifecycle

```
INQUIRY → PROPOSAL → AGREEMENT → PAYMENT → ONBOARDING → DEVELOPMENT → DELIVERY → CLOSED
```

### Status States

**Inquiry:** `inquiry_new` → `ai_matching` → `qualified`

**Proposal:** `proposal_drafting` → `internal_review` → `proposal_sent` → `negotiating` → `committed`

**Agreement:** `agreement_sent` → `agreement_signed`

**Payment:** `payment_pending` → `payment_partial` → `payment_paid`

**Onboarding:** `collecting_access` → `access_complete` → `dev_assigned`

**Development:** `in_progress` → `blocked_client` / `blocked_internal` → `review_checkpoint` → `revisions` → `final_qa`

**Delivery:** `delivered` → `acceptance_pending` → `accepted`

**Closed:** `completed` / `cancelled` / `on_hold`

## 6. Project Types

| Type | Blueprint Match | Characteristics |
|------|-----------------|-----------------|
| Blueprint | 90%+ | Standard scope, fixed pricing |
| Blueprint + Custom | 50-89% | Base + modifications |
| Full Custom | <50% | Premium pricing, custom scope |

## 7. Operational Modes

| Mode | Participants |
|------|--------------|
| Internal | Hexona team only |
| Hexona + Devs | + External contractors |
| Hexona + Devs + DFY | + Revenue-share partners |

## 8. Core Features (MVP)

### 8.1 Inquiry Form + AI Matching

- Submit inquiry via form
- AI matches against blueprints catalog
- Auto-route based on match score

### 8.2 Form Copilot (Proposal Creation)

- Paste meeting notes / context
- AI extracts client info, requirements
- Pre-fills proposal form
- Uses `@assistant-ui/react-hook-form` pattern

### 8.3 Project Management

- Full status lifecycle
- Deliverables list (source of truth)
- Timeline / Gantt view
- Activity logging

### 8.4 Role-Based Dashboards

- Admin: All projects + financials
- Internal: All projects, no financials
- Dev: Assigned projects only
- DFY: Their deals only
- Client: Their project only (if invited)

### 8.5 Scope Monitoring

- Baseline = deliverables list at project launch
- Triggers: client request, dev flag, deliverable change, timeline extension
- Approval workflow for changes

### 8.6 Payment Integration

- Stripe for payment processing
- Payment structures: 100% upfront, 50/50, 40/30/30, custom
- Manual milestone marking by admin
- Dev sees "Cleared" / "Pending" (no amounts)

## 9. Permissions Matrix

| Feature | Admin | Internal | Dev | DFY | Client |
|---------|-------|----------|-----|-----|--------|
| View all projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| View financials | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create projects | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign devs | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update deliverables | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve scope changes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit inquiries | ✅ | ✅ | ❌ | ✅ | ❌ |
| Invite clients | ✅ | ✅ | ❌ | ✅ | ❌ |

## 10. Data Model (Summary)

### Core Tables

- `profiles` — User profiles (extends auth.users)
- `projects` — Project records
- `deliverables` — Project deliverables (source of truth)
- `project_files` — Uploaded files
- `payment_milestones` — Payment tracking
- `scope_changes` — Scope change requests
- `activity_log` — All activity
- `blueprints` — Productized services catalog

See `agent_docs/database.md` for full schema.

## 11. Security Model

- RLS ON from day 1
- Helper functions: `get_user_role()`, `can_access_project()`
- Column-level security via views (hide financials)
- Audit trail on all changes
- Devs can only update deliverable status, not content

See `agent_docs/security.md` for full policies.

## 12. Directory Structure

```
hexos/
├── CLAUDE.md                    # Agent instructions
├── agent_docs/                  # Progressive disclosure docs
├── supabase/
│   ├── migrations/              # Versioned SQL
│   └── seed.sql                 # Test data
└── src/
    ├── app/                     # Next.js routes
    ├── components/ui/           # shadcn components
    ├── features/                # Feature modules
    └── lib/
        ├── supabase/            # Clients + types
        └── api/                 # DB abstraction layer
```

## 13. Development Workflow

1. Make changes
2. Push to git
3. Vercel creates preview deployment
4. Test on preview URL
5. Merge to main for production

**No localhost testing.**

## 14. Implementation Phases

### Phase 1: Foundation
- [ ] Project setup (shadcn Vega preset)
- [ ] Supabase project + initial migration
- [ ] Auth flow
- [ ] Route structure

### Phase 2: Core Data
- [ ] Projects CRUD
- [ ] Deliverables CRUD
- [ ] Status management

### Phase 3: Dashboards
- [ ] Admin dashboard
- [ ] Project detail view
- [ ] Gantt view

### Phase 4: Inquiry Flow
- [ ] Inquiry form
- [ ] AI blueprint matching
- [ ] Form copilot

### Phase 5: External Access
- [ ] Dev portal
- [ ] DFY portal
- [ ] Client portal

### Phase 6: Payments
- [ ] Stripe integration
- [ ] Payment milestones

### Phase 7: Scope Monitoring
- [ ] Baseline capture
- [ ] Change detection
- [ ] Approval workflow

## 15. Future Features (Not MVP)

Documented in `agent_docs/future-features.md`:

- Email notifications
- WhatsApp integration
- Interactive proposal builder (client-facing)
- BaigWork marketplace
- A2UI agent-generated UIs
- Time tracking
- Multi-tenant / white-label

**Build for today, architect for tomorrow.**

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| DFY | Done-For-You partner who sources client deals |
| Blueprint | Standardized, productized service offering |
| Arbitrage | Business model: partners source, Hexona fulfills |
| Scope Baseline | Deliverables list created at project launch |
| Form Copilot | AI assistant that pre-fills forms from context |

## Appendix B: Related Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Agent instructions (lean, every session) |
| `agent_docs/architecture.md` | System design |
| `agent_docs/database.md` | Schema + migrations |
| `agent_docs/security.md` | RLS policies |
| `agent_docs/auth.md` | Authentication |
| `agent_docs/workflows.md` | Business logic |
| `agent_docs/features.md` | What's built vs planned |
| `agent_docs/conventions.md` | Code patterns |
| `agent_docs/deployment.md` | Vercel setup |
| `agent_docs/future-features.md` | Roadmap items |
