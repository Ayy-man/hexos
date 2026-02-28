# hexOS Architecture

## 1. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 16.1.0 | Full-stack React framework with server components, server actions, streaming |
| **Language** | TypeScript | ^5 | Strict mode enabled (`"strict": true` in `tsconfig.json`) |
| **Database** | Supabase (PostgreSQL) | `@supabase/supabase-js` ^2.89.0 | Postgres + Auth + Storage + Realtime + RLS |
| **Auth** | Supabase Auth | via `@supabase/ssr` ^0.8.0 | Cookie-based session management with middleware refresh |
| **UI Components** | shadcn/ui + Radix | `shadcn` ^3.6.2, `radix-ui` ^1.4.3 | Vega style, Stone+Cyan theme |
| **Typography** | Switzer (local font) | Custom OTF files | Full weight range 100-900, set as `--font-sans` |
| **Monospace Font** | Geist Mono | Google Fonts | `--font-geist-mono` for code |
| **Styling** | Tailwind CSS | ^4 | With `tw-animate-css`, `tailwind-scrollbar-hide`, `tailwind-merge` |
| **Rich Text** | Plate.js | `platejs` ^52.0.15 | Full editor with AI, comments, mentions, suggestions, tables, code blocks, math |
| **Email** | Resend + React Email | `resend` ^4.8.0 | Transactional emails with JSX templates |
| **Payments** | Stripe | `stripe` ^20.1.1 | Invoices, checkout sessions, webhooks |
| **Forms** | React Hook Form + Zod | `react-hook-form` ^7.69.0, `zod` ^4.2.1 | Form state + schema validation |
| **Charts** | Recharts | ^3.6.0 | Dashboard metrics and analytics |
| **DnD** | dnd-kit | `@dnd-kit/core` ^6.3.1 | Drag and drop for Kanban boards, sortable lists |
| **Motion** | Framer Motion | ^12.24.7 | Animations and transitions |
| **PDF** | react-pdf + @react-pdf/renderer | ^10.3.0, ^4.3.1 | PDF viewing and generation |
| **Command Palette** | cmdk | ^1.1.1 | Cmd+K global search |
| **Toasts** | Sonner | ^2.0.7 | Rich toast notifications |
| **Heatmaps** | cal-heatmap | ^4.2.4 | Developer activity heatmaps |
| **Onboarding** | Onborda | ^1.2.5 | Guided tour system |
| **Analytics** | Vercel Analytics | ^1.6.1 | Web vitals and page views |
| **Push** | web-push | ^3.6.7 | Browser push notifications |
| **Deployment** | Vercel | N/A | Production only -- no localhost testing |

### Path Aliases

```json
// tsconfig.json
"paths": { "@/*": ["./*"] }
```

All imports use `@/` prefix mapped to project root (e.g., `@/lib/api/projects`, `@/features/inquiries/actions/inquiryActions`).

---

## 2. App Router Structure

The application uses Next.js 16 App Router with route groups, nested layouts, and a mix of server components (default) and client components (explicit `'use client'`).

### Top-Level Layout (`app/layout.tsx`)

The root layout provides:
- **Switzer** font (local, variable `--font-sans`) + **Geist Mono** (Google, variable `--font-geist-mono`)
- `ThemeProvider` (next-themes, system default, light/dark support)
- `ErrorBoundary` wrapping all children
- `GlobalErrorHandler` for unhandled errors
- `ServiceWorkerRegister` for PWA
- `OfflineIndicator` / `InstallPrompt` for offline support
- `Vercel Analytics`
- PWA manifest with apple-web-app configuration

### Route Groups

```
app/
  (auth)/              # Unauthenticated pages
    layout.tsx          # Centered card layout, ThemeToggle only
    login/page.tsx      # Email/password sign-in

  (dashboard)/          # Authenticated pages -- full sidebar layout
    layout.tsx          # Auth gate + sidebar + header + providers
    dashboard/
      admin/            # Admin dashboard + metrics
      client/           # Client project view
      dev/              # Dev dashboard, opportunities, payouts, settings
      dfy/              # DFY partner dashboard + team settings
      page.tsx          # Redirects to role-appropriate dashboard
    projects/           # Project list + detail + create
    inquiries/          # Inquiry pipeline + detail + initiate + create
    conversations/      # Threaded conversations
    blueprints/         # Blueprint catalog + detail + create
    case-studies/       # Case study catalog + detail + create
    finances/           # Financial management (layout with sub-tabs)
      invoices/         # Invoice list + detail
      payouts/          # Payout management
      expenses/         # Expense tracking
      reports/          # Financial reports
      retainers/        # Retainer management
      schedule/         # Payment schedule
    admin/              # Admin-only pages
      team/             # Hexona team management
      partners/         # DFY partner management
      applications/     # Dev application approval
      devs/             # Developer management
      opportunities/    # Opportunity management
      blockers/         # Blocker tracking
      activity-log/     # System activity log
    notifications/      # Full notification page
    opportunities/      # Opportunity board (dev-facing)
    suggestions/        # Suggestion management
    my-suggestions/     # Personal suggestions (dev/dfy)
    settings/           # User settings (layout with sub-tabs)
      profile/          # Profile settings
      account/          # Account settings
      appearance/       # Theme settings
      notifications/    # Notification preferences
      developer/        # Developer profile (skills, etc.)
      partner/          # Partner profile
    pulse/              # Pulse dashboard (legacy)

  api/                  # API Route Handlers
    activity-logs/      # GET + export activity logs
    copilot/            # AI copilot endpoint
    documents/[id]/versions/  # Document version management
    generate-brief/     # AI brief generation
    invoices/           # CRUD + checkout/send/void
    log-error/          # Client-side error logging
    parse-deliverables/ # AI deliverable parsing
    projects/[id]/      # Project sub-resources (documents, expenses, invoices, mentionables, milestones)
    push/subscribe/     # Push notification subscription
    testing/            # Test escalation checks
    webhooks/stripe/    # Stripe webhook handler

  # Public pages (no auth required)
  apply/               # Dev application form (self-signup)
  invite/[token]/      # Invitation accept page
  p/[token]/           # Public project portal
  pay/[token]/         # Payment page
  pay/success/         # Payment success page
  unauthorized/        # Access denied page
  page.tsx             # Landing / redirect to dashboard
```

### Dashboard Layout (`app/(dashboard)/layout.tsx`)

The dashboard layout is the core authenticated shell. It:
1. **Authenticates** via `supabase.auth.getUser()` -- redirects to `/login` if no session
2. **Loads profile** from `profiles` table -- redirects if not found
3. **Computes navigation** via `getNavigation(profile.role)` -- role-specific sidebar items
4. **Fetches header data** in parallel: notifications, unread count, dev logging status, inquiry counts
5. **Renders** the full shell:
   - `OnbordaProvider` + `Onborda` -- guided tours
   - `SidebarProvider` + `AppSidebar` -- collapsible sidebar with role-filtered navigation
   - Header: `SidebarTrigger`, `DynamicBreadcrumb`, `CommandPalette`, `NotificationPopover`, `ThemeToggle`
   - `PresenceProvider` -- broadcasts user presence via Supabase Realtime
   - `CheckinPromptProvider` -- dev check-in prompts (dev role only)
   - `Toaster` -- sonner toast notifications

---

## 3. Feature-Sliced Architecture

The codebase uses a feature-sliced design pattern with 19 feature directories under `features/`. Each feature is a self-contained module with clear boundaries.

### Feature Directory Structure

```
features/
  admin/           # Admin-specific components and actions
    actions/       # Server actions for team mgmt, invitations
    activity-log/  # Activity log components
    components/    # AdminDashboard, DevManagement, TeamManagement, etc.

  blueprints/      # Blueprint catalog
    actions/       # CRUD server actions
    components/    # BlueprintList, BlueprintDetail, etc.

  case-studies/    # Case study catalog
    actions/       # CRUD server actions
    components/    # CaseStudyList, CaseStudyDetail, etc.

  conversations/   # Messaging system
    actions/       # Message CRUD, conversation management
    components/    # ConversationList, MessageThread, etc.

  dev/             # Developer-specific views
    actions/       # Dev dashboard actions
    components/    # DevDashboard, OpportunityCard, ApplicationList, etc.

  dev-logging/     # Developer check-in system
    components/    # CheckinPromptProvider, CheckinDialog, etc.

  developer/       # Developer profile & skills
    actions/       # Skill management, XP actions
    components/    # DevSkillsEditor, XPDisplay, BadgeList, etc.

  finances/        # Financial management
    actions/       # Invoice, payout, expense actions
    components/    # InvoiceList, PayoutTable, FinancialMetrics, etc.
    types/         # Financial type definitions

  inquiries/       # Inquiry pipeline (largest feature)
    actions/       # 7 action files: inquiry, proposal, deliverable, document, reminder, conversion, submit
    components/    # KanbanBoard, InquiryDetail, ProposalEditor, NegotiationPanel, etc.
    constants/     # Stage definitions, status mappings
    schemas/       # Zod validation schemas
    types.ts       # Inquiry-specific types
    utils/         # Helper functions

  notifications/   # Notification system
    actions/       # Mark read, clear, preferences

  onboarding/      # Guided onboarding
    actions/       # Onboarding progress actions
    components/    # OnboardingWrapper, TourCard, etc.
    lib/           # Tour definitions and configuration

  opportunities/   # Dev opportunity system
    actions/       # Bidding, pre-commitment actions
    components/    # OpportunityBoard, BidForm, CommitmentStatus, etc.

  organizations/   # Organization (team) management
    actions/       # Org CRUD, member management
    components/    # OrgSettings, MemberList, etc.
    index.ts       # Barrel export

  payments/        # Payment processing
    components/    # CheckoutForm, PaymentStatus, etc.

  project-initiation/ # Project creation wizard
    actions/       # Initiation workflow actions
    components/    # InitiationWizard, RequirementEditor, etc.
    utils/         # Wizard helpers

  projects/        # Project management (second largest)
    actions/       # Project CRUD, deliverable, file, document, delay actions
    components/    # ProjectDetail, DeliverableList, FileManager, DocumentEditor, etc.

  settings/        # User settings
    actions/       # Profile, notification, appearance actions
    components/    # SettingsForms, ProfileEditor, etc.

  suggestions/     # Suggestion system
    actions/       # Suggestion CRUD, voting
    components/    # SuggestionList, SuggestionForm, etc.

  testing/         # Testing/QA system
    actions/       # Test session management
    components/    # TestRunner, TestResults, etc.
```

### Feature Pattern

Each feature follows a consistent pattern:

1. **`components/`** -- React components (mix of server and client). These are imported by `app/` route pages.
2. **`actions/`** -- Server actions (marked with `'use server'`). These are the mutation entry points from the UI.
3. **`types/`** or **`types.ts`** -- Feature-specific TypeScript types (when not covered by `lib/api/` types).
4. **`hooks/`** -- Custom React hooks (rare; most hooks are in top-level `hooks/`).
5. **`constants/`**, **`schemas/`**, **`utils/`**, **`lib/`** -- Supporting code.

**Key rule**: Feature components never call the database directly. They call server actions, which call `lib/api/` functions.

---

## 4. API Layer Pattern

### Architecture

```
UI Component (features/*/components/)
    |
    | calls (via form action or onClick)
    v
Server Action (features/*/actions/*.ts) -- marked 'use server'
    |
    | calls + revalidatePath()
    v
API Module (lib/api/*.ts)
    |
    | calls via Supabase client
    v
Supabase PostgreSQL (with RLS)
```

### API Modules (`lib/api/`)

All database operations are centralized in `lib/api/`. There are **60+ API modules** covering every table and operation. Key modules:

| Module | Responsibility |
|--------|---------------|
| `projects.ts` | Project CRUD, status updates, financial fields, stats |
| `inquiries.ts` | Inquiry pipeline, stage management, priority, pricing |
| `deliverables.ts` | Deliverable CRUD, status, sort order, hierarchy |
| `invitations.ts` | All invitation types (admin, DFY, dev, team), validation, accept flow |
| `notifications.ts` | Notification queries, mark read, unread count, push delivery |
| `conversations.ts` | Conversation and message CRUD, participant management |
| `profiles.ts` | User profile queries and updates |
| `organizations.ts` | Org CRUD, member management, seat tracking |
| `invoices.ts` | Invoice management, Stripe integration |
| `payouts.ts` | Developer payout tracking |
| `project-files.ts` | File upload, download, folder/document management |
| `project-documents.ts` | Rich text documents (Plate.js content), versioning |
| `blueprints.ts` | Blueprint catalog CRUD |
| `email.ts` | Email sending via Resend with React Email templates |
| `dev-skills.ts` | Developer skill/XP system |
| `bids.ts` | Opportunity bidding system |
| `admin-metrics.ts` | Dashboard analytics queries |

### Barrel Export (`lib/api/index.ts`)

```typescript
export * from './projects'
export * from './deliverables'
export * from './profiles'
export * from './inquiries'
export * from './inquiry-comments'
```

Only a subset is re-exported from the barrel. Most API modules are imported directly (e.g., `import { getMyNotifications } from '@/lib/api/notifications'`).

### Server Action Pattern

Server actions in `features/*/actions/` follow a consistent pattern:

```typescript
// features/inquiries/actions/inquiryActions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { updateInquiryStage, type ProposalStage } from '@/lib/api/inquiries'

export async function updateStageAction(
  id: string,
  stage: ProposalStage,
  notes?: string
): Promise<void> {
  await updateInquiryStage(id, stage, notes)   // Call lib/api
  revalidatePath('/inquiries')                  // Revalidate list
  revalidatePath(`/inquiries/${id}`)            // Revalidate detail
}
```

**Pattern rules:**
1. Always marked `'use server'` at the top
2. Import business logic from `lib/api/`
3. Call `revalidatePath()` after mutations to refresh server components
4. Sometimes call `redirect()` for navigation after destructive actions
5. Return typed results or void

### API Module Pattern

API modules in `lib/api/` follow this pattern:

```typescript
// lib/api/projects.ts
import { createClient } from '@/lib/supabase/server'

export async function getProjects(filter: ProjectFilter = 'active') {
  const supabase = await createClient()           // Server-side client (cookie-based auth)

  const { data, error } = await supabase
    .from('projects')
    .select(`*, dfy_partner:profiles!projects_dfy_partner_id_fkey(id, name, email), ...`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ProjectWithRelations[]
}
```

**Key patterns:**
- Always create a server-side Supabase client per request via `createClient()`
- RLS automatically filters data based on the authenticated user's role
- Use PostgREST relationship syntax for JOINs (e.g., `profiles!projects_dfy_partner_id_fkey`)
- Type assertions on return values (types defined alongside in the same file or in `lib/types/`)
- Admin operations use `createClient()` from `lib/supabase/admin.ts` (service role key, bypasses RLS)

### Route Handlers (`app/api/`)

For operations that need HTTP endpoints (webhooks, streaming, external access):

- `app/api/webhooks/stripe/route.ts` -- Stripe webhook verification and event processing
- `app/api/copilot/route.ts` -- AI copilot streaming responses
- `app/api/invoices/*/route.ts` -- Invoice operations exposed as REST
- `app/api/push/subscribe/route.ts` -- Push notification subscription management
- `app/api/generate-brief/route.ts` -- AI-powered brief generation

---

## 5. Database Patterns

### Supabase Configuration

Three Supabase client variants are used:

| Client | File | Auth | Use Case |
|--------|------|------|----------|
| **Server** | `lib/supabase/server.ts` | Cookie-based (anon key) | All standard API calls -- RLS applies |
| **Client** | `lib/supabase/client.ts` | Browser session (anon key) | Client-side realtime subscriptions, presence |
| **Admin** | `lib/supabase/admin.ts` | Service role key | System operations that bypass RLS (invitations, admin ops) |

```typescript
// Server client -- used in lib/api/ and server actions
import { createServerClient } from '@supabase/ssr'
const supabase = createServerClient(url, anonKey, { cookies: { getAll, setAll } })

// Admin client -- bypasses RLS
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
const supabase = createSupabaseClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

### Row-Level Security (RLS)

RLS is enabled on all tables from day one. Policies are role-aware and use helper functions to avoid recursion:

```sql
-- Non-recursive role getter (SECURITY DEFINER -- runs as function owner, not caller)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
```

**Key RLS patterns:**
- `SECURITY DEFINER` functions for role checks to avoid recursive policy evaluation
- `can_access_project(p_project_id)` -- reusable function for project-level access
- `can_access_file_v2(p_project_id, p_visibility)` -- file access respects visibility settings
- `can_access_conversation_v2(...)` -- conversation access by type (project, workspace, partner, direct)
- Admin role sees all data; other roles filtered by ownership/assignment/organization

**Historical context:** An RLS crisis occurred (2026-01-03) due to recursive policy functions. Resolution involved creating `SECURITY DEFINER` safe functions with `STABLE` marking and explicit `SET search_path = public`. This is documented in migrations `20260103000011_emergency_rls_fix.sql` and `20260103000013_restore_stability.sql`.

### Migration Approach

- **116 migration files** in `supabase/migrations/`, named with date-based prefixes (e.g., `20241221000001_initial_schema.sql`)
- **Never edit old migrations** -- always create new ones
- Initial schema (`20241221000001`) defines all core enums, tables, and policies
- Subsequent migrations add columns, tables, functions, and policy adjustments
- Migrations use `DO $$ ... END $$` blocks with existence checks for robustness
- `BEGIN;` / `COMMIT;` wrapping for transactional safety

### Type Generation

Database types are never manually written. They are generated from the live schema:

```bash
pnpm supabase:types
```

Application types are then defined in `lib/api/*.ts` files alongside query functions, or in `lib/types/` for shared types (e.g., `lib/types/organization.ts`).

### Core Schema

Key tables from the initial migration:

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` with name, email, role (`user_role` enum), location, timezone |
| `projects` | Core entity -- 22 statuses across 7 phases, FK to profiles for dfy_partner, assigned_dev, client |
| `deliverables` | Project deliverables with hierarchy (parent_id), hill chart position, sort order |
| `blueprints` | Productized service templates with default deliverables (JSONB) |
| `inquiries` | Inquiry pipeline with 10-stage proposal workflow |
| `inquiry_comments` | Comment system with bidirectional sync to conversations |
| `conversations` / `messages` | Threaded conversations by type (project, workspace, partner, direct) |
| `invitations` | Multi-type invitation system (admin, internal, dfy_first, dfy_team, dev_solo, dev_team) |
| `organizations` / `organization_members` | Multi-tenant org structure with seat limits |
| `notifications` | In-app notifications with actor, project references |
| `activity_log` | System-wide audit trail |
| `project_files` | File/folder/document tree with visibility controls |
| `project_documents` | Rich text documents (Plate.js JSONB content) with versioning |
| `onboarding_requirements` | Hierarchical requirements checklist per project |
| `invoices` | Invoice records linked to Stripe |
| `payouts` | Developer payout tracking |
| `dev_skills` / `developer_profiles` | Developer skill/XP/badge system |
| `opportunities` / `bids` | Developer opportunity marketplace with bidding |
| `suggestions` | Feature suggestion system |

---

## 6. Auth and Authorization

### Authentication Flow

1. **Supabase Auth** handles all authentication -- email/password only (no OAuth/social)
2. **Middleware** (`middleware.ts`) runs on every non-static request to refresh the session:
   ```typescript
   // lib/supabase/middleware.ts
   await withTimeout(supabase.auth.getUser(), 3000)  // 3s timeout to prevent hanging
   ```
3. **Dashboard layout** performs the actual auth gate -- checks `supabase.auth.getUser()` and loads profile
4. **Sign-in** via server action (`lib/auth/actions.ts`) calls `supabase.auth.signInWithPassword()`
5. Activity logging on login/logout via `activityLogger`

### Role System

Five roles with a numeric hierarchy:

```typescript
// lib/auth/types.ts
export type UserRole = 'admin' | 'internal' | 'dev' | 'dfy' | 'client'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  internal: 80,
  dev: 50,
  dfy: 50,
  client: 10,
}

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  internal: '/dashboard/admin',
  dev: '/dashboard/dev',
  dfy: '/dashboard/dfy',
  client: '/dashboard/client',
}
```

### Authorization Guards (`lib/auth/guards.ts`)

Server-side guard functions used in server components and server actions:

| Guard | Effect |
|-------|--------|
| `getSession()` | Returns Supabase user or null |
| `getProfile()` | Returns profile or null |
| `requireAuth()` | Redirects to `/login` if not authenticated |
| `requireProfile()` | Redirects to `/login` if no profile |
| `checkAuth()` | Throws error if not authenticated (for server actions) |
| `requireRole(allowedRoles)` | Redirects to `/unauthorized` if role not in list |
| `requireAdmin()` | Shorthand for `requireRole(['admin'])` |
| `requireInternal()` | Shorthand for `requireRole(['admin', 'internal'])` |
| `redirectToDashboard()` | Redirects to role-appropriate dashboard |

### Authorization in Practice

**In server components (pages):**
```typescript
// Role check happens at the dashboard layout level
// Pages rely on the layout guard + navigation filtering
```

**In server actions:**
```typescript
// features/admin/actions/teamActions.ts
export async function inviteTeamMember(...) {
  const profile = await requireRole(['admin'])  // Throws/redirects if unauthorized
  // ... proceed with action
}
```

**In the UI:**
- Navigation is role-filtered in `lib/navigation.ts` -- each role only sees relevant sidebar items
- Components check role for conditional rendering (e.g., admin-only buttons)
- The `CommandPalette` accepts a `role` prop to filter search results

### Invitation-Based Onboarding

Users do not self-register (except dev applications). The onboarding flow:

1. **Admin invites** via team management UI -> creates invitation record with token
2. **Email sent** via Resend with unique `invite/[token]` link
3. **Recipient visits** link -> validates token (expiry, status, seat availability)
4. **Account created** via Supabase Auth sign-up on the invitation page
5. **Invitation accepted** -> sets profile role, creates org membership if applicable
6. **Redirected** to role-appropriate dashboard

**Invitation types:**
| Type | Flow | Creates Org? |
|------|------|-------------|
| `admin` | Admin invites Hexona team member | No |
| `internal` | Admin invites internal staff | No |
| `dfy_first` | Admin invites new DFY agency | Yes (creates org, user becomes owner) |
| `dfy_team` | DFY owner invites team member | No (joins existing org) |
| `dev_solo` | Admin invites developer, or dev self-applies | No |
| `dev_team` | Dev org owner invites team member | No (joins existing org) |

**Dev application flow (self-signup):**
1. Developer visits `/apply` (public page)
2. Submits application with name, email, skills, portfolio, bio
3. Status set to `pending_approval` (not `pending`)
4. Admin reviews in `/admin/applications`
5. If approved: status changes to `pending`, email with invite link sent
6. If rejected: rejection email sent

---

## 7. Key Infrastructure

### Realtime (Supabase Presence)

User presence is tracked via Supabase Realtime channels:

- **`PresenceProvider`** (`components/presence-provider.tsx`) wraps the dashboard layout
- **`usePresence`** hook (`hooks/use-presence.ts`) manages a shared singleton channel (`app:presence`)
  - Broadcasts user info (id, name, email, role, online_at) via presence track
  - Syncs online users on presence `sync` events
  - Updates `profiles.last_seen_at` every 60 seconds (heartbeat)
  - Singleton pattern prevents duplicate channel connections
- **`useOnlineUsers`** hook -- read-only variant for components that just need the online user list
- Used by: admin dashboard for team presence, project detail for collaborator awareness

### File Storage (Supabase Storage)

Files are stored in Supabase Storage bucket `general-purpose`:

- **Upload**: Server actions in `features/projects/actions/` handle file upload to storage
- **Download**: `lib/api/project-files.ts` generates signed URLs (1-hour expiry)
- **Metadata**: `project_files` table tracks file tree with:
  - `content_type`: `'file' | 'folder' | 'document'` -- supports nested folders and rich text documents inline
  - `visibility`: `'internal' | 'client'` -- controls who can see files
  - `shared_to`: Additional sharing scope
  - `parent_id`: Folder hierarchy
- **File tree**: Built client-side from flat records via `buildFileTree()` utility
- **File viewers**: Dedicated viewers for images, PDFs, audio, video, code files (`features/projects/components/files/viewers/`)

### Email (Resend + React Email)

Email is sent via Resend with React Email JSX templates:

**Configuration** (`lib/email/resend.ts`):
```typescript
export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || 'hexOS <noreply@hexona.io>'
export const resend = new Resend(process.env.RESEND_API_KEY)
```

**Templates** (`lib/email/templates/`):
| Template | Used For |
|----------|----------|
| `InvitationEmail.tsx` | All invitation types |
| `ApplicationReceivedEmail.tsx` | Dev application confirmation |
| `ApplicationApprovedEmail.tsx` | Dev application approved |
| `ApplicationRejectedEmail.tsx` | Dev application rejected |

**Sending flow** (`lib/api/email.ts`):
1. Render React Email component to HTML via `render()` from `@react-email/components`
2. Send via `resend.emails.send({ from, to, subject, html })`
3. Convenience wrappers: `sendInvitationEmail()`, `sendApplicationReceivedEmail()`, etc.

### Payments (Stripe)

Stripe integration for invoicing and payments:

**Server SDK** (`lib/stripe/server.ts`):
- Lazy-initialized Stripe client via Proxy pattern
- `createStripeInvoice()` -- creates customer + invoice + line items
- `finalizeAndSendInvoice()` -- finalize and email invoice
- `createCheckoutSession()` -- Stripe Checkout for direct payment
- `constructWebhookEvent()` -- signature verification

**Webhook** (`app/api/webhooks/stripe/route.ts`):
- Handles Stripe events (payment success, invoice status changes)
- Updates local invoice records in Supabase

**Public payment page** (`app/pay/[token]/`):
- Token-based access to payment pages (no auth required)

### Rich Text (Plate.js)

Full-featured rich text editor used for project documents and inquiry proposals:

**Plugins** (from `package.json` dependencies):
- `@platejs/basic-nodes` -- headings, paragraphs, lists
- `@platejs/code-block` -- syntax-highlighted code
- `@platejs/table` -- table editor
- `@platejs/comment` -- inline comments
- `@platejs/suggestion` -- track changes / suggestions
- `@platejs/mention` -- @mentions with mentionable resolution
- `@platejs/ai` -- AI-assisted writing
- `@platejs/media` -- images, embeds
- `@platejs/math` -- LaTeX math
- `@platejs/emoji` -- emoji picker
- `@platejs/toc` -- table of contents
- `@platejs/layout` -- column layouts
- `@platejs/link` -- link editing
- `@platejs/floating` -- floating toolbar
- `@platejs/combobox` -- slash commands
- `@platejs/callout` -- callout blocks
- `@platejs/date` -- date mentions

**Storage**: Document content is stored as JSONB in `project_documents.content`. Versioning is supported via `document_versions` table.

**Editor components** are in `components/editor/`.

### Notifications

Multi-channel notification system:

- **In-app**: `notifications` table + `NotificationPopover` component with realtime updates
- **Push**: Web push via `web-push` library + service worker
- **Toast**: Sonner toasts for immediate feedback, with deduplication tracking (`notification_toast_tracking`)
- **Full page**: `/notifications` page with filterable notification list
- Types include: project updates, comment mentions, stage changes, assignment notifications, etc.

### Activity Logging

Centralized audit trail:

- **`lib/logging/activity-logger.ts`** -- structured logger for auth events, mutations, system events
- **`activity_log` table** -- stores action, details (JSONB), user reference
- **Admin view**: `/admin/activity-log` with export to CSV via API route
- **Per-project**: Activity tab on project detail page

### Command Palette

Global search via cmdk (`components/command-palette.tsx`):
- Triggered by Cmd+K
- Searches projects, inquiries, conversations, team members
- Role-filtered results
- Quick navigation across the entire app

---

## 8. Deployment and Constraints

### Deployment

- **Platform**: Vercel only
- **No localhost testing** -- all development deploys to Vercel preview/production
- **Vercel Analytics** integrated for web vitals
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_APP_URL`

### Key Constraints

| Constraint | Rule |
|------------|------|
| **Deployment** | Always deploy to Vercel -- no localhost testing |
| **Database migrations** | Never edit old migrations -- always create new ones |
| **RLS functions** | Never create recursive RLS functions -- use `SECURITY DEFINER` safe functions |
| **Type generation** | Never manually write DB types -- regenerate with `pnpm supabase:types` |
| **API boundary** | All DB calls through `lib/api/` -- never call Supabase from components directly |
| **Security** | RLS is ON from day 1 -- dev as admin role to see all data |
| **Font** | Switzer (local, `--font-sans`) -- not Figtree (was changed) |

### PWA Support

The app is a Progressive Web App:
- Service worker registration (`components/service-worker-register.tsx`)
- Offline indicator (`components/offline-indicator.tsx`)
- Install prompt (`components/install-prompt.tsx`)
- Manifest with icons for iOS and Android
- Offline storage via IndexedDB (`lib/db/offline-storage.ts`)

### Shared Components (`components/`)

Reusable components outside of features:
- `components/ui/` -- shadcn/ui primitives (Button, Dialog, Card, Table, etc.)
- `components/editor/` -- Plate.js editor configuration and components
- `components/shared/` -- shared business components
- `components/notifications/` -- notification bell, popover, list
- `components/hooks/` -- shared hooks
- `components/skeletons.tsx` -- loading skeletons for SSR streaming

---

*Last updated: 2026-02-28*
