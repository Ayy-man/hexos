# hexOS

Project management portal for Hexona's DFY automation business. Replaces Tally/WhatsApp/Notion/ClickUp with unified system.

> **First time?** See `SETUP.md` for MCP configuration, Kibo UI install, and project initialization.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- Supabase (Postgres + Auth + Storage + **Realtime**)
- shadcn/ui (Vega style, Stone+Cyan theme)
- pnpm
- Vercel (deployment)
- Stripe (payments)

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
