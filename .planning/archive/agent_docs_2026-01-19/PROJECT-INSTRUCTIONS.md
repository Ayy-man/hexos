# hexOS Project Instructions

You are helping build **hexOS**, a custom project management portal for Hexona Systems' DFY automation business.

## What is hexOS?

hexOS replaces fragmented tools (Tally, WhatsApp, Notion, ClickUp) with a unified system featuring:
- Role-based dashboards (Admin, Internal, Dev, DFY Partner, Client)
- AI-assisted proposal creation (Form Copilot)
- Project lifecycle management from inquiry to delivery
- Scope monitoring with baseline comparison
- Stripe payment integration
- Real-time updates and notifications

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript (strict)
- **UI:** shadcn/ui (Vega style, Stone+Cyan theme) + Kibo UI for complex views
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Payments:** Stripe
- **Hosting:** Vercel
- **Package Manager:** pnpm

## Documentation Structure

The project has comprehensive documentation in `agent_docs/`:

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Quick reference, commands, critical rules |
| `SETUP.md` | Initial setup guide |
| `HEXOS-MASTER-SPEC.md` | Complete specification |
| `architecture.md` | System design |
| `database.md` | Schema + migrations |
| `security.md` | RLS policies |
| `auth.md` | Authentication + permissions |
| `workflows.md` | Business logic + state machine |
| `features.md` | What's built vs planned |
| `navigation.md` | Role-based navigation structure |
| `realtime.md` | Notifications + portal sync + dev check-ins |
| `conventions.md` | Code patterns |
| `components.md` | UI components + MCP tools |
| `deployment.md` | Vercel setup |
| `future-features.md` | Roadmap (don't build yet) |

## Key Rules

1. **Always deploy to Vercel** — No localhost testing. Push → Preview URL → Test.
2. **Never edit old migrations** — Create new migration files only.
3. **Never manually write DB types** — Run `pnpm supabase:types` to regenerate.
4. **All DB calls through lib/api/** — Never call Supabase from components directly.
5. **RLS is ON** — Security at database level from day 1.

## User Roles

| Role | Access |
|------|--------|
| Admin | Everything (Ayman, Hamza) |
| Internal | All projects, no financials |
| Dev | Assigned projects only |
| DFY | Their deals only |
| Client | Their project only |

## Project Lifecycle

```
INQUIRY → PROPOSAL → AGREEMENT → PAYMENT → ONBOARDING → DEVELOPMENT → DELIVERY → CLOSED
```

## Workspace vs Portal

Each project has two views:
- **Workspace** (Internal): Full access for Hexona + Devs
- **Portal** (External): Synced content visible to DFY + Client

INT controls what gets synced from Workspace → Portal (granular, git-like sync).

## How to Help

When working on hexOS:
1. Reference the appropriate `agent_docs/` file for context
2. Follow the conventions in `conventions.md`
3. Use shadcn/ui components first, Kibo UI for complex views
4. Keep security in mind (RLS, role-based access)
5. Remember the Workspace/Portal separation for features

## Current Phase

Building MVP. Priority order:
1. Foundation (auth, routes)
2. Core Data (projects, deliverables CRUD)
3. Dashboards (admin, project detail)
4. Inquiry Flow (form, AI matching)
5. External Access (dev/dfy/client portals)
6. Payments (Stripe)
7. Scope Monitoring

## Owner

Ayman Baig — Hexona Systems (Toronto)
