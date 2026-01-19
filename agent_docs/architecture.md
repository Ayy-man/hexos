# Architecture

## System Overview

hexOS is a multi-tenant project management portal with role-based access control. It handles the full lifecycle of automation projects from inquiry to delivery.

```
┌─────────────────────────────────────────────────────────────────┐
│                         hexOS PORTAL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Next.js App (Vercel)                                          │
│   ├── Role-based dashboards (Admin/Dev/DFY/Client)              │
│   ├── Project management                                        │
│   ├── Form copilot (AI-assisted proposal creation)              │
│   └── Real-time updates via Supabase subscriptions              │
│                                                                 │
│   Supabase                                                      │
│   ├── PostgreSQL (data)                                         │
│   ├── Auth (all user types)                                     │
│   ├── Storage (project files)                                   │
│   └── Row Level Security (access control)                       │
│                                                                 │
│   Stripe                                                        │
│   └── Payment processing (webhooks → Supabase)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Inquiry → AI Blueprint Match → Proposal (AI-assisted) → Agreement → Payment → 
Onboarding → Development → Delivery → Closed
```

## Key Design Decisions

1. **Supabase for everything** — Auth, DB, Storage, Realtime. No Firebase, no external auth.

2. **Deliverables list = source of truth** — Created at project launch, drives Gantt, timeline, and scope monitoring.

3. **RLS for security** — All access control at database level. Application code assumes RLS is working.

4. **API abstraction layer** — All Supabase calls go through `lib/api/`. Components never touch DB directly.

5. **Feature-based folder structure** — Code organized by feature (`features/projects/`, `features/auth/`), not by type.

6. **Generated types** — TypeScript types generated from database schema. Never manually written.

## Operational Modes

Each project operates in one of three modes:

| Mode | Participants | Use Case |
|------|--------------|----------|
| Internal | Hexona team only | Direct client relationships |
| Hexona + Devs | + External contractors | Projects needing specialists |
| Hexona + Devs + DFY | Full arbitrage model | Partner-sourced deals |

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Admin | Hamza + Ayman | Everything |
| Internal | Future hires | All projects, no financials |
| Dev | External contractors | Assigned projects only |
| DFY | Revenue-share partners | Their deals only |
| Client | End customers (if invited) | Their project only |

See `auth.md` for detailed permissions matrix.
See `security.md` for RLS implementation.
