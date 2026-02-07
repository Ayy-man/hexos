# hexOS Documentation

**Project:** hexOS - Project Management Portal for Hexona's DFY Automation Business
**Status:** Ready for soft launch
**Last Updated:** 2026-02-06

---

## Table of Contents

### Part 1: Architecture
- [1.1 Tech Stack](#11-tech-stack)
- [1.2 App Router Structure](#12-app-router-structure)
- [1.3 Feature-Sliced Architecture](#13-feature-sliced-architecture)
- [1.4 API Layer Pattern](#14-api-layer-pattern)
- [1.5 Database Patterns](#15-database-patterns)
- [1.6 Auth and Authorization](#16-auth-and-authorization)
- [1.7 Key Infrastructure](#17-key-infrastructure)
- [1.8 Deployment and Constraints](#18-deployment-and-constraints)

### Part 2: Features
- [2.1 Inquiries](#21-inquiries)
- [2.2 Projects](#22-projects)
- [2.3 Opportunities](#23-opportunities)
- [2.4 Conversations](#24-conversations)
- [2.5 Finances](#25-finances)
- [2.6 Payments](#26-payments)
- [2.7 Notifications](#27-notifications)
- [2.8 Blueprints](#28-blueprints)
- [2.9 Case Studies](#29-case-studies)
- [2.10 Suggestions](#210-suggestions)
- [2.11 Organizations](#211-organizations)
- [2.12 Onboarding](#212-onboarding)
- [2.13 Dev](#213-dev)
- [2.14 Dev Logging](#214-dev-logging)
- [2.15 Developer](#215-developer)
- [2.16 Admin](#216-admin)
- [2.17 Settings](#217-settings)
- [2.18 Project Initiation](#218-project-initiation)
- [2.19 Testing](#219-testing)
- [2.20 Cross-Feature Integration Map](#220-cross-feature-integration-map)
- [2.21 Database Table Summary](#221-database-table-summary)

### Part 3: Role-Based Access & Views
- [3.1 Admin](#31-admin)
- [3.2 Internal](#32-internal)
- [3.3 Dev](#33-dev-developer)
- [3.4 DFY](#34-dfy-done-for-you-partner)
- [3.5 Client](#35-client)
- [3.6 Feature Access Matrix](#36-feature-access-matrix)

### Part 4: Build History & Roadmap
- [4.1 Build History](#41-build-history)
- [4.2 Current State](#42-current-state)
- [4.3 Roadmap Ahead](#43-roadmap-ahead)

---

# Part 1: Architecture

## 1.1 Tech Stack

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

## 1.2 App Router Structure

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
    projects/[id]/      # Project sub-resources
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

## 1.3 Feature-Sliced Architecture

The codebase uses a feature-sliced design pattern with 19 feature directories under `features/`. Each feature is a self-contained module with clear boundaries.

### Feature Directory Structure

```
features/
  admin/           # Admin-specific components and actions
  blueprints/      # Blueprint catalog
  case-studies/    # Case study catalog
  conversations/   # Messaging system
  dev/             # Developer-specific views
  dev-logging/     # Developer check-in system
  developer/       # Developer profile & skills
  finances/        # Financial management
  inquiries/       # Inquiry pipeline (largest feature)
  notifications/   # Notification system
  onboarding/      # Guided onboarding
  opportunities/   # Dev opportunity system
  organizations/   # Organization (team) management
  payments/        # Payment processing
  project-initiation/ # Project creation wizard
  projects/        # Project management (second largest)
  settings/        # User settings
  suggestions/     # Suggestion system
  testing/         # Testing/QA system
```

### Feature Pattern

Each feature follows a consistent pattern:

1. **`components/`** -- React components (mix of server and client). Imported by `app/` route pages.
2. **`actions/`** -- Server actions (marked with `'use server'`). Mutation entry points from the UI.
3. **`types/`** or **`types.ts`** -- Feature-specific TypeScript types.
4. **`hooks/`** -- Custom React hooks (rare; most hooks are in top-level `hooks/`).
5. **`constants/`**, **`schemas/`**, **`utils/`**, **`lib/`** -- Supporting code.

**Key rule**: Feature components never call the database directly. They call server actions, which call `lib/api/` functions.

---

## 1.4 API Layer Pattern

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

All database operations are centralized in `lib/api/`. There are **60+ API modules**. Key modules:

| Module | Responsibility |
|--------|---------------|
| `projects.ts` | Project CRUD, status updates, financial fields, stats |
| `inquiries.ts` | Inquiry pipeline, stage management, priority, pricing |
| `deliverables.ts` | Deliverable CRUD, status, sort order, hierarchy |
| `invitations.ts` | All invitation types, validation, accept flow |
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

### Server Action Pattern

```typescript
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

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getProjects(filter: ProjectFilter = 'active') {
  const supabase = await createClient()

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
- Use PostgREST relationship syntax for JOINs
- Admin operations use `createClient()` from `lib/supabase/admin.ts` (service role key, bypasses RLS)

---

## 1.5 Database Patterns

### Supabase Configuration

Three Supabase client variants:

| Client | File | Auth | Use Case |
|--------|------|------|----------|
| **Server** | `lib/supabase/server.ts` | Cookie-based (anon key) | All standard API calls -- RLS applies |
| **Client** | `lib/supabase/client.ts` | Browser session (anon key) | Client-side realtime subscriptions, presence |
| **Admin** | `lib/supabase/admin.ts` | Service role key | System operations that bypass RLS |

### Row-Level Security (RLS)

RLS is enabled on all tables from day one. Policies use helper functions to avoid recursion:

```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;
```

**Key RLS patterns:**
- `SECURITY DEFINER` functions for role checks to avoid recursive policy evaluation
- `can_access_project(p_project_id)` -- reusable function for project-level access
- `can_access_file_v2(p_project_id, p_visibility)` -- file access respects visibility settings
- Admin role sees all data; other roles filtered by ownership/assignment/organization

**Historical context:** An RLS crisis occurred (2026-01-03) due to recursive policy functions. Resolution involved creating `SECURITY DEFINER` safe functions with `STABLE` marking and explicit `SET search_path = public`.

### Migration Approach

- **116 migration files** in `supabase/migrations/`
- **Never edit old migrations** -- always create new ones
- Migrations use `DO $$ ... END $$` blocks with existence checks for robustness

### Type Generation

Database types are never manually written:

```bash
pnpm supabase:types
```

### Core Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` with name, email, role, location, timezone |
| `projects` | Core entity -- 22 statuses across 7 phases |
| `deliverables` | Project deliverables with hierarchy, hill chart position |
| `blueprints` | Productized service templates with default deliverables |
| `inquiries` | Inquiry pipeline with 10-stage proposal workflow |
| `conversations` / `messages` | Threaded conversations by type |
| `invitations` | Multi-type invitation system (6 types) |
| `organizations` / `organization_members` | Multi-tenant org structure with seat limits |
| `notifications` | In-app notifications with actor, project references |
| `activity_log` | System-wide audit trail |
| `project_files` | File/folder/document tree with visibility controls |
| `invoices` | Invoice records linked to Stripe |
| `payouts` | Developer payout tracking |
| `dev_skills` / `developer_profiles` | Developer skill/XP/badge system |
| `opportunities` / `bids` | Developer opportunity marketplace with bidding |

---

## 1.6 Auth and Authorization

### Authentication Flow

1. **Supabase Auth** handles all authentication -- email/password only (no OAuth/social)
2. **Middleware** (`middleware.ts`) refreshes session on every non-static request (3s timeout)
3. **Dashboard layout** performs the actual auth gate -- checks user and loads profile
4. **Sign-in** via server action calls `supabase.auth.signInWithPassword()`

### Role System

Five roles with a numeric hierarchy:

```typescript
export type UserRole = 'admin' | 'internal' | 'dev' | 'dfy' | 'client'

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100, internal: 80, dev: 50, dfy: 50, client: 10,
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

### Invitation-Based Onboarding

Users do not self-register (except dev applications). The flow:

1. Admin invites via team management UI -> creates invitation with token
2. Email sent via Resend with unique `invite/[token]` link
3. Recipient validates token (expiry, status, seat availability)
4. Account created via Supabase Auth sign-up
5. Invitation accepted -> sets profile role, creates org membership if applicable
6. Redirected to role-appropriate dashboard

**Invitation types:**

| Type | Flow | Creates Org? |
|------|------|-------------|
| `admin` | Admin invites Hexona team member | No |
| `internal` | Admin invites internal staff | No |
| `dfy_first` | Admin invites new DFY agency | Yes (creates org, user becomes owner) |
| `dfy_team` | DFY owner invites team member | No (joins existing org) |
| `dev_solo` | Admin invites developer, or dev self-applies | No |
| `dev_team` | Dev org owner invites team member | No (joins existing org) |

---

## 1.7 Key Infrastructure

### Realtime (Supabase Presence)

- **Singleton channel** (`app:presence`) prevents duplicate connections
- Broadcasts user info (id, name, email, role, online_at)
- Heartbeat updates `profiles.last_seen_at` every 60 seconds
- Used by admin dashboard for team presence and project detail for collaborator awareness

### File Storage (Supabase Storage)

- **Bucket**: `general-purpose`
- **Signed URLs**: 1-hour expiry for downloads
- **Two-workspace model**: Internal (admin/int/dev) and Client (client visible)
- **File tree**: `project_files` table with `content_type`: file/folder/document, `visibility`, `parent_id`
- **File viewers**: Dedicated viewers for images, PDFs, audio, video, code files

### Email (Resend + React Email)

| Template | Used For |
|----------|----------|
| `InvitationEmail.tsx` | All invitation types |
| `ApplicationReceivedEmail.tsx` | Dev application confirmation |
| `ApplicationApprovedEmail.tsx` | Dev application approved |
| `ApplicationRejectedEmail.tsx` | Dev application rejected |

### Payments (Stripe)

- `createStripeInvoice()` -- creates customer + invoice + line items
- `finalizeAndSendInvoice()` -- finalize and email
- `createCheckoutSession()` -- Stripe Checkout for direct payment
- Webhook at `app/api/webhooks/stripe/route.ts` for event processing

### Rich Text (Plate.js)

15+ plugins including AI, comments, mentions, suggestions, tables, code blocks, math, media, TOC, layouts. Content stored as JSONB in `project_documents.content` with versioning.

### Notifications

- **In-app**: `notifications` table + popover with realtime updates
- **Push**: Web push via service worker
- **Toast**: Sonner with database-backed deduplication
- **Full page**: `/notifications` with filterable list

### Command Palette

Global search via cmdk (Cmd+K) -- searches projects, inquiries, conversations, team members. Role-filtered results.

---

## 1.8 Deployment and Constraints

| Constraint | Rule |
|------------|------|
| **Deployment** | Always deploy to Vercel -- no localhost testing |
| **Database migrations** | Never edit old migrations -- always create new ones |
| **RLS functions** | Never create recursive RLS functions -- use `SECURITY DEFINER` safe functions |
| **Type generation** | Never manually write DB types -- regenerate with `pnpm supabase:types` |
| **API boundary** | All DB calls through `lib/api/` -- never call Supabase from components directly |
| **Security** | RLS is ON from day 1 -- dev as admin role to see all data |
| **Font** | Switzer (local, `--font-sans`) -- not Figtree (was changed) |

**PWA Support:** Service worker, offline indicator, install prompt, manifest with iOS/Android icons, IndexedDB offline storage.

---

# Part 2: Features

> All 19 feature modules under `features/<name>/` with components, actions, API surface, and database tables.

## 2.1 Inquiries

**Purpose:** The full sales pipeline. DFY partners submit inquiries, admins write proposals, deliverables are negotiated, and deals are closed and converted to projects.

### Key Components

| Component | Description |
|-----------|-------------|
| `IntakeForm.tsx` | Multi-step inquiry submission form (5 form paths) |
| `InquiryBoardView.tsx` | Kanban-style board grouped by proposal stage |
| `InquiryListView.tsx` | Card-based list view |
| `InquiryTableView.tsx` | Sortable/filterable table view |
| `ProposalTab.tsx` | Admin writes proposal with Plate.js editor |
| `MyVersionTab.tsx` | DFY partner's private copy of the proposal |
| `AICopilotSidebar.tsx` | AI-powered sidebar for proposal assistance |
| `ExportPDFButton.tsx` | Export proposal to PDF |
| `PublicProposalView.tsx` | Public-facing proposal page (no auth) |
| `CreateOpportunityButton.tsx` | Create dev opportunity from inquiry |
| `SuggestChangesButton.tsx` | DFY suggests changes to a proposal |

**Deliverables sub-components:** `DeliverablesTab`, `DeliverablesTable`, `DeliverableRow`, `AddDeliverableModal`, `BlueprintTierSelector`, `DeliverableDiff`, `DeliverableHistory`, `CounterOfferDialog`, `CounterResponseCard`

**Conversion sub-components:** `ConvertToProjectButton`, `ConvertToProjectWizard`, `RequirementsBuilder`

**Intake form steps:** `InitialStep`, `ProposalType`, `BlueprintInfo`, `CustomProposal`, `VariationProposal`, `ClosedDealType`, `ClosedBlueprint`, `ClosedCustom`, `ForwardForm`, `ConfirmationScreen`

### Server Actions

**inquiryActions.ts:** `archiveInquiryAction`, `unarchiveInquiryAction`, `deleteInquiryAction`, `updateInquiryStatusAction`, `updateStageAction`, `updatePriorityAction`, `updateDueDateAction`, `assignInquiryAction`, `updatePriceDfyAction`, `bulkUpdateStageAction`, `updatePricingAction`

**conversionActions.ts:** `markAsClosedAction`, `unmarkAsClosedAction`, `convertToProjectAction`, `convertAndRedirectAction`, `reopenInquiryAction`

**deliverableActions.ts:** `triggerParseDeliverablesAction` (AI extraction via OpenRouter/Claude 3.5 Haiku), `createDeliverableAction`, `updateDeliverableAction`, `deleteDeliverableAction`, `addFromBlueprintTierAction`, `submitDeliverablesForReviewAction`, `reviewDeliverableAction`, `bulkApproveDeliverablesAction`, `finalApproveDeliverablesAction`, `acceptCounterAction`, `rejectCounterAction`

**proposalActions.ts:** `saveProposalContentAction`, `submitProposalAction`, `unsubmitProposalAction`, `submitForReviewAction`, `approveProposalAction`, `saveDfyVersionAction`, `copyProposalToDfyVersionAction`

**reminderActions.ts:** `snoozeReminderAction`, `markLostAction`, `markWonAction`, `requestAdminHelpAction`, `trackDfyViewAction`, `requestUpdatesAction`

### API Functions

`lib/api/inquiries.ts`, `lib/api/inquiry-comments.ts`, `lib/api/proposal-deliverables.ts`, `lib/api/proposal-reminders.ts`, `lib/api/blueprints.ts`

### Database Tables

`inquiries`, `inquiry_comments`, `proposal_deliverables`, `proposal_reminders`, `profiles`

### Special Patterns

- **AI Integration:** OpenRouter API with Claude 3.5 Haiku for extracting deliverables via tool-use
- **Deliverable Negotiation:** DFY edits -> submits -> INT reviews -> approves/counters/rejects -> DFY responds -> final approval
- **Proposal Stages:** intake -> scoping -> proposal_writing -> final_review -> ready -> sent -> follow_up -> closed/lost
- **5 Intake Form Paths:** A1, A2, A3, B2, B3 based on submission_type and deal_type
- **Public Sharing:** Token-based proposal links (no auth)
- **PDF Export:** React-PDF for downloadable proposals

---

## 2.2 Projects

**Purpose:** Full project lifecycle management. 22 statuses across 7 phases, with hill charts, scope monitoring, delay tracking, file management, and requirement dependencies.

### Key Components

| Component | Description |
|-----------|-------------|
| `ProjectPageClient.tsx` | Main project page client component |
| `ProjectHeader.tsx` | Name, status badge, actions dropdown |
| `ProjectStatusControl.tsx` | Status transition controls (role-based) |
| `ProjectTabs.tsx` | Tab navigation |

**Tabs:** `OverviewTab`, `DeliverablesTab`, `FilesTab`, `ChatTab`, `RequirementsTab`, `FinancialsTab`, `ScopeTab`, `ActivityTab`, `OnboardingTab`, `TestingTab`, `GameplanTabWrapper`, `ProjectInfoTab`

**Hill Chart:** `HillChart.tsx` (SVG, 0-100 scale), `ParentDeliverableCard`, `SubDeliverableCard`, `CompactSparkline`, `ExpandedSparkline`

**Scope Monitoring:** `ScopeChangeCard`, `ScopeChangeDialog`, `ScopeMetricsSummary`

**Delays & Extensions:** `DelayListCard`, `DelayMarkerDialog`, `ExtensionRequestDialog`, `ExtensionApprovalCard`

**File Management:** Two-workspace layout (Internal/Client), `FileSidebar`, `FileViewerModal`, `DocumentEditor`, viewers for images/PDFs/audio/video/code

**Gameplan:** `GameplanEditor` (Plate.js), `DocumentTabs`, `VersionHistoryPanel`

### Server Actions

**projectActions.ts:** `updateProjectStatusAction`, `confirmDeliverablesAction`, `sendForSignoffAction`, `signOffDeliverablesAction`, `assignDevAction`, `archiveProjectAction`, `updateDeliveryOverrideAction`, requirement CRUD

**deliverableActions.ts:** `addDeliverableAction` (with auto scope flagging), `updateDeliverableAction`, `updateDeliverableStatusAction`, `deleteDeliverableAction`

**fileActions.ts:** `uploadProjectFileAction` (50MB max), `createFolderAction`, `createDocumentAction`, `updateDocumentContentAction`, file tree operations, two-workspace sharing

**hillChartActions.ts:** `updatePositionAction` (one entry/day, auto-creates test at 90%+), `quickUpdatePositionAction`, `batchUpdatePositionsAction`

**delayActions.ts:** `createDelayAction`, `getDelaySummaryAction`

**extensionActions.ts:** `requestExtensionAction`, `approveExtensionAction`, `rejectExtensionAction`

**scopeActions.ts:** `flagScopeChangeAction`, `approveScopeChangeAction`, `captureBaselineAction`, `compareToBaselineAction`

### Database Tables

`projects`, `deliverables`, `deliverable_position_history`, `project_requirements`, `onboarding_requirements`, `project_files`, `project_delays`, `project_extensions`, `scope_baselines`, `scope_changes`, `scope_change_comments`, `activity_log`, `payment_milestones`

### Special Patterns

- **22 Statuses / 7 Phases:** deliverables_pending through completed
- **Hill Chart (0-100):** 0-50 = figuring out, 50-100 = making it happen. 90%+ auto-creates test session
- **Scope Baseline:** Captured at sign-off. All changes auto-compared and flagged
- **Two-Workspace Files:** Internal and Client workspaces with share/unshare
- **Requirement Dependencies:** DAG-based; `canCompleteRequirement` check before completion

---

## 2.3 Opportunities

**Purpose:** Developer opportunity marketplace. Admins create opportunities, generate AI-redacted briefs, developers bid.

### Key Components

`BidForm.tsx`, `BidCard.tsx`, `BidList.tsx`, `RedactedBriefCard.tsx`, `PreCommitmentTab.tsx`, `CommitmentStatusBadge.tsx`

### Server Actions

**bidActions.ts:** `submitBidAction`, `withdrawBidAction`, `updateBidStatusAction`

**briefActions.ts:** `generateBriefAction` (cached with SHA256 hash), `regenerateBriefAction`

**preCommitmentActions.ts:** `setCommitmentStatusAction`, `toggleInterestAction`, `getCommittedDevsAction`

### Database Tables

`dev_opportunity_bids`, `brief_extractions`, `dev_opportunity_preferences`, `project_invitations`

### Special Patterns

- **AI Brief Generation:** Privacy-safe redacted briefs hiding client identity
- **Cache-First:** SHA256 input hash; regeneration only if source data changed
- **Three-Layer Commitment:** interested -> committed -> bid submitted

---

## 2.4 Conversations

**Purpose:** Real-time messaging with threaded conversations, reactions, file attachments, @mentions, unread tracking.

### Key Components

`ChatPanel.tsx`, `ConversationList.tsx`, `MessageInput.tsx`, `MessageItem.tsx`, `MessageReactions.tsx`, `UnreadBadge.tsx`

### Server Actions

`sendMessageAction`, `sendMessageWithAttachmentsAction`, `editMessageAction`, `deleteMessageAction`, `toggleReactionAction`, `markReadAction`

### Database Tables

`conversations`, `messages`, `message_reactions`, `conversation_participants`, `conversation_read_status`, `message_attachments`

---

## 2.5 Finances

**Purpose:** Financial management with payout processing and retainer management.

### Key Components

`FinancesOverview.tsx`, `RetainerManagement.tsx`, `payouts/PayoutManagement.tsx`

### Server Actions

**Admin payouts:** `approvePayoutAction`, `rejectPayoutAction`, `markPayoutPaidAction` (wire_transfer/paypal/crypto)

**Dev payouts:** `submitPayoutAction` (FormData with invoice file, wire transfer details)

**Retainers:** `createRetainer`, `generateRetainerInvoice` (auto-generates invoice, advances next_invoice_date)

### Database Tables

`payouts`, `retainers`, `invoices`, `invoice_line_items`

### Special Patterns

- **Wire Transfer Details:** SWIFT/BIC, IBAN, bank name, recipient info
- **Invoice Number Generation:** Supabase RPC `generate_invoice_number`

---

## 2.6 Payments

**Purpose:** Stripe-powered payment processing with public invoice page.

### Key Components

`PublicInvoiceView.tsx` -- public-facing with Stripe Checkout integration.

### Database Tables

`invoices`, `invoice_line_items`

---

## 2.7 Notifications

**Purpose:** In-app notification system with bell icon, popover, and full-page views.

### Server Actions

`fetchNotificationsAction`, `markNotificationReadAction`, `markAllNotificationsReadAction`

### Special Patterns

- **Event-Driven:** Created by other features (status changes, blockers, extensions, tests)
- **30+ notification types** across all features
- **Layout revalidation:** `revalidatePath('/', 'layout')` to update counts globally

---

## 2.8 Blueprints

**Purpose:** Service catalog. Admins create packages with rich content, Loom videos, and tiered pricing. DFY partners reference them in inquiries.

### Key Components

`BlueprintCard.tsx`, `BlueprintViewer.tsx`, `BlueprintEditor.tsx`, `BlueprintForm.tsx`, `LoomVideoEmbed.tsx`, `PricingTiersEditor.tsx`, `RelatedCaseStudies.tsx`, `IconPicker.tsx`

### Server Actions

`createBlueprintAction`, `updateBlueprintAction`, `updateBlueprintContentAction`, `deleteBlueprintAction`, `publishBlueprintAction`, `duplicateBlueprintAction`

### Database Tables

`blueprints` (title, description, content, icon, tags, loom_url, pricing_tiers, status)

---

## 2.9 Case Studies

**Purpose:** Portfolio catalog linked to blueprints. Sales collateral for DFY partners.

### Key Components

`CaseStudyCard.tsx`, `CaseStudyViewer.tsx`, `CaseStudyEditor.tsx`, `CaseStudyForm.tsx`

### Server Actions

`uploadCaseStudyImageAction`, `createCaseStudyAction`, `updateCaseStudyContentAction`, `publishCaseStudyAction`, `duplicateCaseStudyAction`

### Database Tables

`case_studies` (title, content, cover_image_url, linked blueprint IDs, status)

---

## 2.10 Suggestions

**Purpose:** Internal suggestion box with screenshots and conversation threads per suggestion.

### Key Components

`SuggestionsList.tsx`, `MySuggestionsList.tsx`, `SuggestionDetailSheet.tsx`

### Special Patterns

- Each suggestion creates a linked conversation for threaded discussion
- All admin/internal users automatically participate in suggestion discussions

---

## 2.11 Organizations

**Purpose:** Multi-tenant org management. DFY agencies and dev agencies with seats, member management, and role assignment.

### Server Actions

**organizationActions.ts:** `createOrganizationAction`, `updateMemberRoleAction`, `deactivateMemberAction`, `getOrganizationSeatsAction`, `createDevAgencyAction`

**invitationActions.ts:** `inviteAdminUserAction`, `inviteDfyAgencyAction`, `inviteDevAction`, `inviteTeamMemberAction`, `submitDevApplicationAction`, `approveDevApplicationAction`, `rejectDevApplicationAction`, `acceptInvitationAction`, `revokeInvitationAction`, `resendInvitationAction`

### Database Tables

`organizations`, `organization_members`, `invitations`, `profiles`

### Special Patterns

- **Seat Management:** max_seats enforced on invitations and reactivations
- **6 Invitation Types:** admin, internal, dfy_first, dfy_team, dev, dev_team
- **Dev Application Flow:** Public apply -> admin review -> approve/reject with emails
- **Agency Conversion:** Solo devs can convert to agency owners

---

## 2.12 Onboarding

**Purpose:** Guided tours using Onborda library. 4 role-specific tours.

### Tours

- **admin-welcome:** Command Center, Pipeline Management, Financial Intelligence, Project Oversight
- **client-welcome:** Project Portal, Requirements, Billing, Communication
- **dev-welcome:** Workspace, Maintenance Pulse, Reporting
- **dfy-welcome:** Agency HQ, Service Catalog, Revenue & Earnings

Persistent state stored in `profiles.onboarding_status` JSONB.

---

## 2.13 Dev

**Purpose:** Developer dashboard with project cards, opportunity browsing, blocker reporting, task queue, and payout submission.

### Key Components

`HorizontalProjectCard.tsx`, `DevOpportunitiesContent.tsx`, `OpportunityCard.tsx`, `OpportunityDetailModal.tsx`, `BlockerReportDialog.tsx`, `payouts/SubmitPayoutForm.tsx`

### Server Actions

**blockerActions.ts:** `reportBlockerAction`, `updateBlockerStatusAction` (with notifications)

**taskQueueActions.ts:** `reorderTasksAction`, `setWorkingOnAction`, `toggleStarredAction`, `addToQueueAction`

### Database Tables

`blockers`, `blocker_comments`, `dev_task_queue`, `dev_opportunity_preferences`

### Special Patterns

- **Task Queue:** Personal queue separate from project deliverables; star, reorder, "working on"
- **Blocker Notifications:** Admin acknowledge/resolve triggers reporter notification

---

## 2.14 Dev Logging

**Purpose:** Daily developer check-in system with per-deliverable position updates.

### Key Components

`CheckinPromptProvider.tsx` (auto-prompts for overdue check-ins), `CheckinModal.tsx`, `DeliverableCheckinCard.tsx`, `PositionQuickButtons.tsx`

### Special Patterns

- **Check-in Types:** progress, blocked, skip
- **Hill Chart Integration:** Position deltas from check-ins update deliverable hill positions

---

## 2.15 Developer

**Purpose:** Skills/XP/badges gamification system.

### Server Actions

`upsertSkillAction`, `verifySkillAction` (admin verifies), `endorseSkillAction` (peer, 15 XP), `awardBadgeAction` (100 XP), `awardXPAction`

### Database Tables

`dev_skills`, `dev_skill_endorsements`, `dev_badges`

---

## 2.16 Admin

**Purpose:** Comprehensive metrics dashboard, opportunity creation, team/partner management, blocker queue, financial oversight.

### Key Components

`ComprehensiveMetricsDashboard.tsx`, `AdminOpportunitiesContent.tsx`, `AdminApplicationsList.tsx`, `AdminBlockerQueue.tsx`, `AdminDevDirectory.tsx`, `AdminPartnersList.tsx`

**Metrics tabs:** Overview, Pipeline, Projects, Financials, Team

### Server Actions

**opportunityActions.ts:** `createOpportunityAction`, `sendInvitationAction`, `publishOpportunityAction`, `closeOpportunityAction`

**metricsActions.ts:** `fetchComprehensiveDashboardMetrics` (all metrics in one call), pipeline/project/dev/partner analytics

**financialActions.ts:** `createProjectPaymentMilestones` (4 structures: 100% upfront, 50/50, 40/30/30, custom), invoice CRUD, expense CRUD

### Special Patterns

- **Single-Call Metrics:** All dashboard data in one `fetchComprehensiveDashboardMetrics` call
- **Payment Structures:** 100% upfront, 50/50, 40/30/30, custom splits
- **Activity Log Export:** CSV and JSON with date range filtering

---

## 2.17 Settings

**Purpose:** Profile, avatar, location, notifications, theme, dev availability.

### Server Actions

`updateLocationAction`, `updateProfileAction`, `uploadAvatarAction`, `updateNotificationPreferencesAction`, `updateDevAvailabilityAction` (hours/week, max projects, date range, auto-assign)

---

## 2.18 Project Initiation

**Purpose:** Multi-step wizard to convert closed inquiry into full project.

### Key Components

`InitiateWizard.tsx`, steps: `DeliverablesStep`, `RequirementsStep`, `ReviewStep`

### Server Actions

`completeInitiationAction` -- creates project, payment milestones, copies deliverables, builds requirements tree, updates inquiry status

### Special Patterns

- **Duplicate Prevention:** Checks `source_inquiry_id`
- **Tree Structure:** Requirements via temp_id -> real_id mapping, level-by-level creation
- **Payment Structures:** 100_upfront, 50_50, 40_30_30, custom

---

## 2.19 Testing

**Purpose:** QA testing with three-stage pipeline (dev -> admin/int -> client), auto-generated checklists, and auto-blocker creation.

### Key Components

`TestingQueue.tsx`, `TestingModal.tsx`

### Server Actions

`startTestingAction`, `generateChecklistAction` (context-based templates), `updateChecklistItemAction`, `submitTestResultsAction` (auto hill progression: 90% -> 95% -> 100%), `escalateClientTestAction`

### Database Tables

`test_sessions`, `test_checklist_items`, `blockers`

### Special Patterns

- **Three-Stage Pipeline:** dev -> admin_int -> client
- **Auto-Generated Checklists:** Templates for voice, email, webhook, dashboard deliverables
- **Hill Chart Integration:** Test results auto-progress positions
- **Auto-Blocker Creation:** Failed items create blockers

---

## 2.20 Cross-Feature Integration Map

| Feature A | Feature B | Integration |
|-----------|-----------|-------------|
| Inquiries | Projects | Inquiry conversion creates project |
| Inquiries | Blueprints | Inquiries reference blueprints, import tiers |
| Inquiries | Opportunities | Create opportunity from inquiry |
| Projects | Conversations | Project-scoped conversations |
| Projects | Testing | Hill chart 90%+ triggers test sessions |
| Projects | Dev Logging | Daily check-ins update hill positions |
| Projects | Finances | Payment milestones per project |
| Opportunities | Dev | Dev browses and bids on opportunities |
| Opportunities | Admin | Admin creates and manages opportunities |
| Organizations | Onboarding | Invitation flow leads to org membership |
| Blueprints | Case Studies | Case studies linked to blueprints |
| Suggestions | Conversations | Suggestions use conversation system |
| Testing | Projects | Test results update hill chart, create blockers |
| Dev | Projects | Task queue references project deliverables |
| Notifications | All | Created by project, blocker, testing, extension events |

---

## 2.21 Database Table Summary

| Table | Primary Feature | Also Used By |
|-------|----------------|--------------|
| `inquiries` | Inquiries | Project Initiation |
| `proposal_deliverables` | Inquiries | Project Initiation |
| `projects` | Projects | All |
| `deliverables` | Projects | Testing, Dev, Hill Chart |
| `deliverable_position_history` | Projects | Dev Logging |
| `project_files` | Projects | -- |
| `project_delays` | Projects | -- |
| `project_extensions` | Projects | -- |
| `scope_baselines` / `scope_changes` | Projects | -- |
| `conversations` / `messages` | Conversations | Suggestions |
| `notifications` | Notifications | All features |
| `blueprints` | Blueprints | Inquiries |
| `case_studies` | Case Studies | Blueprints |
| `organizations` / `organization_members` | Organizations | -- |
| `invitations` | Organizations | -- |
| `profiles` | Settings, Auth | All features |
| `blockers` | Dev | Testing |
| `dev_task_queue` | Dev | -- |
| `dev_skills` | Developer | -- |
| `dev_checkins` | Dev Logging | -- |
| `test_sessions` / `test_checklist_items` | Testing | Projects |
| `invoices` | Admin, Finances | Payments |
| `payouts` | Finances | -- |
| `expenses` | Admin | -- |
| `payment_milestones` | Admin, Initiation | Projects |
| `dev_opportunity_bids` / `brief_extractions` | Opportunities | -- |

---

# Part 3: Role-Based Access & Views

## Role Definitions

| Role | Level | Dashboard Route | Description |
|------|:-----:|-----------------|-------------|
| `admin` | 100 | `/dashboard/admin` | Full platform control |
| `internal` | 80 | `/dashboard/admin` | Admin-like, fewer management powers |
| `dev` | 50 | `/dashboard/dev` | Contracted developer |
| `dfy` | 50 | `/dashboard/dfy` | Done-For-You partner (agency/reseller) |
| `client` | 10 | `/dashboard/client` | End client, most restricted |

---

## 3.1 Admin

### Sidebar Navigation

| Group | Items |
|-------|-------|
| Overview | Dashboard, Pulse |
| Management | Projects, Conversations, Inquiries, Blueprints, Case Studies, Suggestions |
| Admin | Blockers, Metrics, Finances, Developers, Opportunities |
| Teams | Hexona Team, DFY Partners, Applications |
| Settings | Settings |

### Dashboard

Stats row (total/active/on-track/at-risk/behind projects), all projects list with health/sparklines, pending proposals by DFY partner, blockers, quick stats.

### Full Access

- **Inquiries:** All inquiries, edit documents/proposals, convert to projects, create opportunities, final-approve deliverables
- **Projects:** All projects, Financials tab, Project Info tab, assign devs, full status control
- **Opportunities:** Create, invite devs, publish, close, view all stats
- **Finances:** Full access (invoices, payouts, expenses, retainers, reports, schedule)
- **Metrics:** Admin-only comprehensive dashboard
- **Team Management:** Hexona Team (admin-only), DFY Partners, Developer Directory, Applications, Blocker Queue, Activity Log

---

## 3.2 Internal

Nearly identical to Admin with key differences:

| Feature | Admin | Internal |
|---------|:-----:|:--------:|
| Admin Dashboard page | Yes | Blocked by `requireRole(['admin'])` |
| Metrics page | Yes | Blocked by `requireRole(['admin'])` |
| Hexona Team management | Yes | Blocked by `requireRole(['admin'])` |
| All other admin features | Yes | Yes |

**Note:** Internal routes to `/dashboard/admin` but the page guard may block them. This could be an oversight.

---

## 3.3 Dev (Developer)

### Sidebar Navigation

| Group | Items |
|-------|-------|
| Overview | Dashboard |
| Work | My Projects, Opportunities, Conversations, Payouts, My Suggestions |
| Settings | Team, Developer Profile, Settings |

### Dashboard

Greeting, stats (projects/in-progress/completed/blocked deliverables), project cards with sparklines, blockers, payouts, pending work.

### Access

- **Inquiries:** No access
- **Projects:** Own assigned projects only, no Financials/Project Info tabs, cannot assign devs
- **Opportunities:** Browse, bid, view invitations, track applications
- **Payouts:** View own, submit requests at `/dashboard/dev/payouts/submit`
- **Finances:** No access to `/finances/*`

### Special Features

- Daily check-in prompts (`CheckinPromptProvider`)
- Blocker reporting
- Personal task queue (star, reorder, "working on")
- Dev agency team management
- Skills/XP/badges profile

---

## 3.4 DFY (Done-For-You Partner)

### Sidebar Navigation

| Group | Items |
|-------|-------|
| Overview | Dashboard |
| Business | Blueprints, Case Studies, My Deals, Conversations, Submit Inquiry, My Suggestions |
| Settings | Team, Settings |

### Dashboard

Greeting, submit inquiry button, stale proposals banner, pending extension requests, stats (active deals/won/total earned), proposal pipeline, project cards.

### Access

- **Inquiries:** Own submissions only, "My Version" private tab, mark as closed, negotiate deliverables
- **Projects:** Own deals only, no Financials/Project Info tabs
- **Opportunities:** No access
- **Finances:** No access
- **Blueprints/Case Studies:** Browse published only, cannot create

### Special Features

- Stale proposal reminders with snooze
- Extension request approve/reject on dashboard
- "My Version" private proposal copy
- DFY agency team management

---

## 3.5 Client

### Sidebar Navigation

| Group | Items |
|-------|-------|
| Overview | My Project |
| Settings | Settings |

Minimal navigation -- only their project and settings.

### Dashboard

Single project view: status badge, progress bar, deliverable counts, deliverable list, contact card. Empty state if no project.

### Access

- **Inquiries:** No access
- **Projects:** Own project only, read-only progress tracking
- **Opportunities:** No access
- **Finances:** No access
- **No creation capabilities**

---

## 3.6 Feature Access Matrix

| Feature | Admin | Internal | Dev | DFY | Client |
|---------|:-----:|:--------:|:---:|:---:|:------:|
| Dashboard | Admin | Admin* | Dev | DFY | Client |
| Projects (list all) | Yes | Yes | Own | Own | Own |
| Projects (create) | Yes | Yes | -- | -- | -- |
| Project Financials tab | Yes | Yes | -- | -- | -- |
| Project Info tab | Yes | Yes | -- | -- | -- |
| Assign devs | Yes | -- | -- | -- | -- |
| Inquiries (list all) | Yes | Yes | -- | Own | -- |
| Inquiries (create) | Yes | Yes | -- | Yes | -- |
| Inquiry document edit | Yes | Yes | -- | -- | -- |
| Inquiry "My Version" tab | -- | -- | -- | Yes | -- |
| Convert inquiry to project | Yes | Yes | -- | -- | -- |
| Blueprints (view) | Yes | Yes | -- | Yes | -- |
| Blueprints (create) | Yes | Yes | -- | -- | -- |
| Case Studies (view) | Yes | Yes | -- | Yes | -- |
| Opportunities (admin) | Yes | Yes | -- | -- | -- |
| Opportunities (browse/bid) | -- | -- | Yes | -- | -- |
| Finances | Yes | Yes | -- | -- | -- |
| Payouts (own) | -- | -- | Yes | -- | -- |
| Metrics | Yes | -- | -- | -- | -- |
| Team management | Yes | -- | -- | -- | -- |
| DFY Partners | Yes | Yes | -- | -- | -- |
| Dev Directory | Yes | Yes | -- | -- | -- |
| Applications review | Yes | Yes | -- | -- | -- |
| Blocker Queue | Yes | Yes | -- | -- | -- |
| Report Blockers | -- | -- | Yes | -- | -- |
| Suggestions (review all) | Yes | Yes | -- | -- | -- |
| Suggestions (submit own) | Yes | Yes | Yes | Yes | Yes |
| Conversations | Yes | Yes | Yes | Yes | Yes |
| Notifications | Yes | Yes | Yes | Yes | Yes |
| Dev check-in prompts | -- | -- | Yes | -- | -- |
| Team Presence (sidebar) | Yes | Yes | -- | -- | -- |
| Command Palette | Yes | Yes | Yes | Yes | Yes |
| Onboarding tours | Yes | Yes | Yes | Yes | Yes |

\* Internal routes to `/dashboard/admin` but the page guard is `requireRole(['admin'])`, which may block internal users.

### RLS Boundaries

- **Admin/Internal:** See all data across the platform
- **Dev:** Only assigned projects, own payouts/blockers/applications
- **DFY:** Only own inquiries and associated projects
- **Client:** Only their own project

### Inquiry Stage Visibility

- **DFY:** `sent`, `closed`, `lost`
- **Admin/Internal:** `unopened`, `admin_reviewed`, `in_queue`, `working`, `ready`, `final_review`, `sent`, `closed`, `lost`

---

# Part 4: Build History & Roadmap

## 4.1 Build History

### Phase Summary

| Phase | Name | Completed | Key Deliverables |
|-------|------|-----------|-----------------|
| 01 | Critical Bugs | 2026-01-20 | Storage RLS fixes, DFY "suggest changes" fix, structured action results pattern |
| 02 | Code Cleanup | 2026-01-20 | Removed team section and time reports, cleaned navigation |
| 03 | Form Input Fixes | 2026-01-20 | Currency input UX (text+inputMode), $50 step, textarea newlines, app-wide audit |
| 04 | Branding & PDF | 2026-01-20 | White-labeled PDF exports, "Mark as Closed" repositioned |
| 05 | Sidebar & Dashboard | 2026-01-20 | Blockers-first sidebar, hill chart progress sync, inquiry tooltips |
| 06 | Blueprints & Case Studies | 2026-01-20 | Loom video support, related case studies on blueprints |
| 07 | Finance Tab Redesign | 2026-01-20 | Revenue/Costs/Timeline sections, conditional color coding |
| 08 | Testing Tab Polish | 2026-01-20 | Project-scoped queue, correct tab positioning, error states |
| 09 | Suggestion Box | 2026-01-31 | My Suggestions page, per-suggestion conversations, status tracking |
| 10 | Opportunities Overhaul | 2026-01-20 | Bidding system, AI redacted briefs, pre-commitment, hours-to-weeks |
| 11 | Notification Audit | 2026-01-20 | Database-backed toast dedup, realtime hook fix, 27 triggers documented |
| 12 | Offboarding Flow | Not started | Design spec only -- deprioritized |
| 13 | Email Delivery | 2026-02-01 | Resend integration, 4 React Email templates, all invitation actions wired |

### Major Milestones

| Date | Milestone |
|------|-----------|
| 2026-01-03 | Database RLS crisis and recovery -- safe function patterns documented |
| Jan 2026 | Pulse/time tracking removal -- overengineered, may return redesigned |
| 2026-01-19 | Polish roadmap created -- 20 items organized into 13 phases |
| 2026-01-20 | Phases 01-08, 10-11 completed in bulk |
| 2026-01-31 | Suggestion Box Expansion completed |
| 2026-02-01 | Email delivery with Resend completed |
| 2026-02-02 | Critical blockers cleared -- ready for soft launch |

### Architecture Patterns Established

- **Structured server action results:** Return `{ data?, error? }` instead of throwing
- **Currency input:** `type="text"` + `inputMode="decimal"` + regex sanitization
- **Toast deduplication:** Database-backed `shown_as_toast_at` with partial index
- **AI brief generation:** OpenRouter + structured tool calling with SHA256 cache invalidation
- **Email templates:** React Email components with inline styles
- **Lazy tab loading:** Fetch data only when tab activated via useEffect
- **White-label exports:** Remove platform branding unconditionally
- **Fire-and-forget updates:** `void supabase.update()` for non-blocking writes

---

## 4.2 Current State

### Shipped and Working

**Core Workflow:** Multi-step inquiry form with AI Copilot, 10-stage proposal pipeline, full project lifecycle (22 statuses, 7 phases), project initiation wizard, deliverables negotiation

**Content & Collaboration:** Rich text documents (Plate.js), conversations with bidirectional sync, blueprints and case studies with Loom support

**Developer Experience:** Skills/XP/badges, daily check-ins, delay tracking, bidding system, pre-commitment, AI redacted briefs, suggestion box with conversations

**User Management:** Role-based dashboards (5 roles), invitation system with org creation, dev application self-signup, email delivery via Resend

**Finance & Payments:** Stripe backend, dev payouts with wire transfer, redesigned finance tab

**UX & Polish:** Stale proposal reminders, Cmd+K search, mobile responsive, notification center, toast dedup, white-label exports

### Known Issues

| Issue | Status |
|-------|--------|
| AI Copilot form state sync | Needs testing -- may be edge case |
| Payout admin actions missing role check | Mitigated by layout protection |

### Soft Launch Readiness: READY

All critical blockers cleared as of 2026-02-02.

---

## 4.3 Roadmap Ahead

### Active Polish Items (Can Launch Without)

| Item | Complexity |
|------|------------|
| Email notifications for stage changes and reminders | Moderate |
| Gantt view for deliverables | Complex |
| Scope monitoring system | Complex |
| External portals polish | Moderate |
| RequirementsTab migration to onboarding_requirements | Moderate |
| Deliverables sign-off flow | Moderate |
| Invoice management UI improvements | Moderate |

### Pending Phase

- **Phase 12: Offboarding Flow Design** -- design spec for post-project completion experience

### Future Iteration Ideas (Out of Scope for v1)

**Near-term:**
- Client invitation flow
- Mercury payout execution
- Public invoice payment page

**Platform expansion:**
- A2UI agent-generated UIs
- Interactive proposal builder (client-facing)
- BaigWork marketplace
- WhatsApp integration
- AI scope creep detection
- Multi-tenant white-labeling (custom subdomains)
- Agreement/contract phase with e-signatures

### Technical Debt

| Item | Priority |
|------|----------|
| Payout role checks (`requireRole()` on admin actions) | Low |
| AI Copilot form sync testing | Low |
| Time tracking redesign | Deferred |

---

*Generated: 2026-02-06*
