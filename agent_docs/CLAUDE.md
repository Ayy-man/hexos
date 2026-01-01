# hexOS

Project management portal for Hexona's DFY automation business. Replaces Tally/WhatsApp/Notion/ClickUp with unified system.

> **First time?** See `SETUP.md` for MCP configuration, Kibo UI install, and project initialization.

## Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Supabase (Postgres + Auth + Storage + **Realtime**)
- shadcn/ui (Vega style, Stone+Cyan theme)
- pnpm
- Vercel (deployment)
- Stripe (payments - not yet integrated)

## Commands

```bash
pnpm dev          # Local dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript check
pnpm lint         # Lint check
```

## Directory Structure

```
src/
├── app/                 # Next.js routes
├── components/ui/       # shadcn components
├── features/            # Feature modules (projects/, auth/, etc.)
├── lib/
│   ├── supabase/        # Supabase clients + generated types
│   ├── api/             # All database calls (abstraction layer)
│   └── validators/      # Zod schemas
supabase/
├── migrations/          # Versioned SQL migrations
└── seed.sql             # Test data
```

## Critical Rules

1. **Always deploy to Vercel** — No localhost testing. Push → Preview URL → Test.
2. **Always push to git** — Commit after every meaningful change.
3. **Update docs after major changes** — Keep agent_docs/ current.
4. **Never edit old migrations** — Create new migration files only.
5. **Never manually write DB types** — Run `pnpm supabase:types` to regenerate.
6. **All DB calls through lib/api/** — Never call Supabase from components directly.
7. **RLS is ON** — Security at database level. Dev as admin role to see all data.

## Before Starting Work

Read relevant files in `agent_docs/` based on your task:

| Task | Read |
|------|------|
| Database/schema changes | `database.md`, `security.md` |
| Auth/permissions | `auth.md`, `security.md` |
| New features | `architecture.md`, `features.md` |
| Business logic | `workflows.md` |
| UI patterns | `conventions.md`, `components.md` |
| Navigation/views | `navigation.md` |
| Real-time/notifications | `realtime.md` |
| Deployment | `deployment.md` |
| Custom components | `components.md` (request code from user) |

## Current Phase

Building MVP. See `agent_docs/features.md` for what's built vs planned.

### What's Complete
- Inquiry flow (form → AI copilot → proposal → negotiation → close)
- Project initiation wizard (convert inquiry → select deliverables → build requirements tree → create project)
- Blueprints & case studies catalog
- Dashboards for all roles (admin, dev, dfy, client)
- Hierarchical requirement templates (selecting template adds entire tree)
- Delete project (admin, preserves linked inquiry)
- Requirements CRUD after project creation

### Current Focus: Phase 4.9 (Project Lifecycle)
- [x] Project detail page with tabs (Overview, Deliverables, Requirements, Files, Activity)
- [x] Project Initiation Wizard with tree-based onboarding_requirements
- [x] Hierarchical templates (parent_id, position, default_blocker)
- [x] GHL Setup template tree (Hexona → DFY → Hexona → Client)
- [x] Delete project with inquiry preservation
- [x] Requirements CRUD after project creation
- [ ] **NEXT: Migrate RequirementsTab to use onboarding_requirements** (currently uses old flat project_requirements)
- [ ] Project status transitions (deliverables_pending → deliverables_confirmed → etc.)
- [ ] Deliverables sign-off flow (Admin → DFY confirms for client)
- [ ] Dev assignment UI
- [ ] File uploads UI

### Database Tables (Key)
- `inquiries` - Leads from DFY partners
- `proposal_deliverables` - Negotiated deliverables pre-close
- `projects` - Active projects post-conversion
- `project_deliverables` - Final deliverables (source of truth)
- `onboarding_requirements` - Tree-structured requirements with parent_id
- `requirement_templates` - Reusable templates with hierarchical support (parent_id, position, default_blocker)
- `requirement_attachments` - Files attached to requirements
