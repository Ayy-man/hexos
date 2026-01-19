# Codebase Structure

**Analysis Date:** 2026-01-19

## Directory Layout

```
hexos/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/             # Auth route group (login)
│   ├── (dashboard)/        # Protected dashboard route group
│   ├── api/                # REST API routes
│   ├── apply/              # Public application page
│   ├── invite/             # Public invitation acceptance
│   ├── p/                  # Public proposal view
│   ├── pay/                # Public payment pages
│   └── unauthorized/       # 403 error page
├── components/             # Shared React components
│   ├── ui/                 # UI primitives (shadcn/ui based)
│   ├── editor/             # Plate.js rich text editor components
│   ├── notifications/      # Notification UI components
│   └── shared/             # Cross-feature shared components
├── features/               # Domain feature modules
│   ├── admin/              # Admin-specific features
│   ├── blueprints/         # Blueprint management
│   ├── case-studies/       # Case study management
│   ├── conversations/      # Messaging system
│   ├── dev/                # Developer portal features
│   ├── dev-logging/        # Developer check-in system
│   ├── developer/          # Developer profile/skills
│   ├── finances/           # Financial management
│   ├── inquiries/          # Inquiry/proposal workflow
│   ├── notifications/      # Notification features
│   ├── onboarding/         # User onboarding tours
│   ├── organizations/      # Team management
│   ├── payments/           # Payment features
│   ├── project-initiation/ # Project setup wizard
│   ├── projects/           # Core project management
│   ├── settings/           # User settings
│   ├── suggestions/        # Suggestion box feature
│   └── testing/            # QA testing features
├── hooks/                  # Custom React hooks
├── lib/                    # Shared utilities and services
│   ├── actions/            # Global server actions
│   ├── api/                # Database access functions
│   ├── auth/               # Authentication utilities
│   ├── db/                 # Database utilities
│   ├── logging/            # Activity logging
│   ├── offline/            # Offline/PWA utilities
│   ├── push/               # Push notification utilities
│   ├── stripe/             # Stripe integration
│   ├── supabase/           # Supabase clients
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── scripts/                # Development/seed scripts
├── supabase/               # Supabase configuration
│   └── migrations/         # Database migrations
├── types/                  # Global TypeScript declarations
├── agent_docs/             # AI agent documentation
└── docs/                   # Project documentation
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router - pages, layouts, API routes
- Contains: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`
- Key files: `layout.tsx` (root), `(dashboard)/layout.tsx` (authenticated shell)

**`app/(dashboard)/`:**
- Purpose: All authenticated user-facing pages
- Contains: Projects, inquiries, settings, admin, finances pages
- Key subdirs: `projects/`, `inquiries/`, `settings/`, `admin/`, `finances/`

**`app/api/`:**
- Purpose: REST API endpoints for external services and complex operations
- Contains: Route handlers for webhooks, file operations, AI
- Key routes: `webhooks/stripe/`, `invoices/`, `projects/`, `documents/`

**`components/`:**
- Purpose: Shared UI components used across features
- Contains: UI primitives, layout components, global features
- Key files: `app-sidebar.tsx`, `command-palette.tsx`, `skeletons.tsx`

**`components/ui/`:**
- Purpose: Base UI component library (shadcn/ui pattern)
- Contains: Button, Card, Dialog, Input, Table, etc.
- Key files: `button.tsx`, `card.tsx`, `dialog.tsx`, `sidebar.tsx`

**`features/`:**
- Purpose: Domain-specific feature modules (vertical slices)
- Contains: Subdirectories per feature with components/, actions/
- Pattern: `features/{domain}/components/`, `features/{domain}/actions/`

**`features/projects/`:**
- Purpose: Core project management feature
- Contains: Project page components, server actions for projects/deliverables
- Key files: `components/ProjectPageClient.tsx`, `actions/projectActions.ts`

**`hooks/`:**
- Purpose: Custom React hooks for client-side logic
- Contains: Realtime subscriptions, debounce, platform detection
- Key files: `use-presence.ts`, `use-notifications-realtime.ts`, `use-inquiries-realtime.ts`

**`lib/api/`:**
- Purpose: Database access layer - all Supabase queries
- Contains: CRUD functions, complex queries, type re-exports
- Key files: `projects.ts`, `invoices.ts`, `inquiries.ts`, `conversations.ts`

**`lib/auth/`:**
- Purpose: Authentication and authorization utilities
- Contains: Guards, types, server actions for auth
- Key files: `guards.ts`, `types.ts`, `actions.ts`

**`lib/supabase/`:**
- Purpose: Supabase client factories for different contexts
- Contains: Server client, browser client, admin client, middleware
- Key files: `server.ts`, `client.ts`, `admin.ts`, `middleware.ts`

**`supabase/migrations/`:**
- Purpose: Database schema migrations
- Contains: SQL migration files
- Pattern: Timestamped SQL files applied in order

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with global providers
- `app/(dashboard)/layout.tsx`: Authenticated shell with sidebar
- `middleware.ts`: Request middleware for session refresh
- `app/page.tsx`: Landing/redirect to dashboard

**Configuration:**
- `next.config.ts`: Next.js configuration
- `tsconfig.json`: TypeScript configuration (uses `@/*` path alias)
- `package.json`: Dependencies and scripts
- `tailwind.config.ts`: Tailwind CSS configuration (if exists, otherwise CSS vars in `globals.css`)

**Core Logic:**
- `lib/api/projects.ts`: Project CRUD operations
- `lib/api/invoices.ts`: Invoice management
- `lib/api/inquiries.ts`: Inquiry/proposal workflow
- `lib/auth/guards.ts`: Auth/role guards
- `lib/errors.ts`: Error handling utilities

**Testing:**
- No test files detected (no `*.test.ts` or `*.spec.ts`)
- Test data scripts in `scripts/seed-test-data.sql`

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `ProjectPageClient.tsx`)
- Utilities/hooks: `kebab-case.ts` (e.g., `use-presence.ts`)
- Server actions: `camelCaseActions.ts` (e.g., `projectActions.ts`)
- API functions: `kebab-case.ts` (e.g., `projects.ts`, `scope-monitoring.ts`)

**Directories:**
- Features: `kebab-case` (e.g., `project-initiation`, `dev-logging`)
- Route groups: `(groupName)` (e.g., `(auth)`, `(dashboard)`)
- Dynamic routes: `[param]` (e.g., `[id]`, `[token]`)

**Components:**
- Feature components: `{Feature}{Purpose}.tsx` (e.g., `ProjectHeader.tsx`, `InquiryBoardView.tsx`)
- UI components: `{name}.tsx` lowercase (e.g., `button.tsx`, `card.tsx`)

**Functions:**
- API functions: `verb{Entity}` (e.g., `getProject`, `createInvoice`, `updateProjectStatus`)
- Server actions: `verb{Entity}Action` (e.g., `updateProjectStatusAction`, `confirmDeliverablesAction`)

## Where to Add New Code

**New Feature:**
- Primary code: `features/{feature-name}/components/`, `features/{feature-name}/actions/`
- Database functions: `lib/api/{feature-name}.ts`
- Types: `lib/types/{feature-name}.ts` or inline in `lib/api/`
- Pages: `app/(dashboard)/{feature-name}/page.tsx`

**New Page:**
- Implementation: `app/(dashboard)/{route}/page.tsx`
- Use RSC for data fetching, pass to client components
- Import feature components from `features/{domain}/components/`

**New API Route:**
- Implementation: `app/api/{resource}/route.ts`
- Pattern: Export `GET`, `POST`, `PATCH`, `DELETE` functions
- Auth check at start of each handler

**New Component:**
- Shared UI: `components/ui/{name}.tsx`
- Feature-specific: `features/{domain}/components/{Name}.tsx`
- Cross-feature shared: `components/shared/{Name}.tsx`

**New Hook:**
- Location: `hooks/use-{name}.ts`
- Pattern: `export function use{Name}(params) { ... }`

**New Server Action:**
- Location: `features/{domain}/actions/{domain}Actions.ts`
- Pattern: `'use server'` at top, `export async function verbEntityAction()`

**New Database Function:**
- Location: `lib/api/{entity}.ts`
- Pattern: `export async function verbEntity(input: InputType): Promise<OutputType>`

**Utilities:**
- Shared helpers: `lib/utils/{name}.ts`
- Domain-specific: Keep in `lib/api/` alongside related functions

## Special Directories

**`.planning/`:**
- Purpose: Project planning and documentation
- Generated: No (manually maintained)
- Committed: Yes

**`supabase/migrations/`:**
- Purpose: Database schema versioning
- Generated: Via Supabase CLI
- Committed: Yes

**`public/`:**
- Purpose: Static assets (icons, manifest, images)
- Generated: Partially (PWA icons via scripts)
- Committed: Yes

**`agent_docs/`:**
- Purpose: Documentation for AI agents/assistants
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes (by `next build`)
- Committed: No (in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-01-19*
