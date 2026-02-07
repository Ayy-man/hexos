# hexOS Role-Based Access & Views

## Role Definitions

hexOS uses 5 user roles defined in `lib/auth/types.ts`:

| Role       | Hierarchy Level | Dashboard Route      | Description                           |
|------------|:--------------:|----------------------|---------------------------------------|
| `admin`    | 100            | `/dashboard/admin`   | Full platform control                 |
| `internal` | 80             | `/dashboard/admin`   | Admin-like, fewer management powers   |
| `dev`      | 50             | `/dashboard/dev`     | Contracted developer                  |
| `dfy`      | 50             | `/dashboard/dfy`     | Done-For-You partner (agency/reseller)|
| `client`   | 10             | `/dashboard/client`  | End client, most restricted           |

### Auth Guard Functions (`lib/auth/guards.ts`)

- `requireAuth()` -- any logged-in user
- `requireProfile()` -- logged-in with profile
- `requireRole(allowedRoles)` -- only listed roles may proceed
- `requireAdmin()` -- shortcut for `requireRole(['admin'])`
- `requireInternal()` -- shortcut for `requireRole(['admin', 'internal'])`

---

## 1. Admin

### Sidebar Navigation (`lib/navigation.ts`)

| Group       | Items                                                                        |
|-------------|-----------------------------------------------------------------------------|
| Overview    | Dashboard (`/dashboard/admin`), Pulse (`/pulse`)                            |
| Management  | Projects, Conversations, Inquiries, Blueprints, Case Studies, Suggestions   |
| Admin       | Blockers, Metrics, Finances, Developers, Opportunities                      |
| Teams       | Hexona Team, DFY Partners, Applications                                     |
| Settings    | Settings                                                                    |

**Sidebar Footer**: Suggestion Box, Team Presence indicator, User menu.

### Dashboard (`/dashboard/admin` -- `requireRole(['admin'])`)

- **Stats row**: Total projects, Active projects, On Track / At Risk / Behind counts (project health).
- **All Projects list** with health icon, status badge, progress bar, assigned dev, and 14-day activity sparkline.
- **Pending Proposals** grouped by DFY partner (count per partner).
- **Blockers** across all projects (title + project name).
- **Quick Stats**: Inquiry count, Completed count, Pending proposals count, Health distribution bar.
- **Actions**: "New Project" button links to `/projects/new`.

### Inquiries

- **List page** (`/inquiries`): Full access. Sees "All Inquiries" heading. Active/Archived filter tabs. Pipeline stats (Unopened, In Queue, Working, Ready). Can create new submissions.
- **New inquiry** (`/inquiries/new`): Allowed via `requireRole(['admin', 'internal', 'dfy'])`.
- **Detail page** (`/inquiries/[id]`): Full access to all inquiries.
  - Auto-advances inquiry from "unopened" to "admin_reviewed" on first view.
  - Tabs visible: Overview, Document (edit + comment), Proposal (edit + review workflow), Deliverables (after proposal sent).
  - **Admin-only actions**: Edit document, Edit pricing, Archive/Delete inquiry, Update proposal stage, Submit for review, Approve proposal, Unsubmit proposal, Convert to Project, Create Opportunity, Reopen closed/lost inquiries, Final-approve deliverables, Send back for revision.
  - Sees both internal and DFY comment threads.

### Projects

- **List page** (`/projects`): Sees all projects across all clients. Table with project name, client, status, progress, assigned dev, target date. Filters: Active/Archived, status category. "New Project" button.
- **New project** (`/projects/new`): `requireRole(['admin', 'internal'])`.
- **Detail page** (`/projects/[id]`): `isAdmin = true` enables:
  - **Tabs**: Overview, Progress, Testing, Files, Chat, + More dropdown with Deliverables, Requirements, Activity, Scope, **Financials** (admin-only), **Project Info** (admin-only).
  - Can assign devs from available dev list (`availableDevs` only fetched for admin role).
  - Full project status control.
  - Scope change management.

### Opportunities

- **Admin Opportunities** (`/admin/opportunities`): `requireRole(['admin', 'internal'])`. Create opportunities, invite devs, view stats (Open, Drafts, Available Devs, Filled). Full CRUD on all opportunities.

### Finances (`/finances/*`)

- **Layout guard**: `requireRole(['admin', 'internal'])`.
- **Sub-pages**: Overview, Invoices, Payouts, Expenses, Payment Schedule, Retainers, Reports.
- Uses `supabase/admin` client for unrestricted data access (invoices, expenses, payment milestones, payouts across all projects).

### Metrics (`/dashboard/admin/metrics`)

- **Guard**: `requireRole(['admin'])` -- admin-only, not internal.
- Comprehensive dashboard: Inquiry pipeline, conversion rates, inquiry sources timeline, project health, project status distribution, project timeline, developer utilization, time tracking, DFY partner performance, deliverables overview, blockers overview, activity overview, opportunity metrics.
- Full financial metrics: revenue, overdue payments, payment timeline, revenue trends, pending by project, expenses, payment sources, invoices.

### Admin-Only Management Pages

| Page                       | Route                  | Guard                         | Purpose                                    |
|----------------------------|------------------------|-------------------------------|---------------------------------------------|
| Hexona Team                | `/admin/team`          | `requireRole(['admin'])`      | Manage admin/internal members, invite new   |
| DFY Partners               | `/admin/partners`      | `requireRole(['admin', 'internal'])` | Agency management, member seats      |
| Developer Directory        | `/admin/devs`          | `requireRole(['admin', 'internal'])` | Dev availability, skills, workload   |
| Applications               | `/admin/applications`  | `requireRole(['admin', 'internal'])` | Review dev applications              |
| Blocker Queue              | `/admin/blockers`      | `requireRole(['admin', 'internal'])` | All reported blockers across projects |
| Activity Log               | `/admin/activity-log`  | admin/internal (page-level)   | System activity log                         |

### Pulse (`/pulse`)

- Guard: admin/internal only (redirects others to `/dashboard`).
- Currently shows "Coming soon".

### Blueprints (`/blueprints`)

- Guard: `requireRole(['admin', 'internal', 'dfy'])`.
- Admin can: see all (published + draft), filter by status, create new blueprints ("New Blueprint" button).

### Case Studies (`/case-studies`)

- Guard: `requireRole(['admin', 'internal', 'dfy'])`.
- Admin can: see all (published + draft), filter by status, create new case studies ("New Case Study" button).

### Suggestions (`/suggestions`)

- Guard: `requireRole(['admin', 'internal'])`.
- Reviews all user-submitted suggestions. Counts by status (New, Reviewed, Implemented, Declined).

### Conversations (`/conversations`)

- All roles with access see: Direct conversations, Project conversations, Inquiry conversations.
- Admin/Internal: Can create new direct conversations. The new-conversation dialog filters recipients to admin/internal roles.

### Notifications

All roles receive notifications via the header popover. Types relevant to admin:
`project_assigned`, `blocker_acknowledged`, `blocker_resolved`, `blocker_comment`, `admin_comment`, `mention`, `deadline_reminder`, `status_change`, `stage_changed`, `invoice_sent`, `invoice_paid`, `payout_submitted`, `payout_approved`, `payout_paid`, `payout_rejected`, `scope_change_flagged`, `scope_change_approved`, `scope_change_rejected`, `proposal_ready`, `assigned`, `requirement_unblocked`, `testing_ready_admin_int`, `testing_passed`, `testing_failed`, `testing_escalated`, `suggestion_reply`, `suggestion_status_change`.

### Settings

- General: Profile, Notifications, Account, Appearance.
- Role-specific: "Team" link to `/admin/team`.

---

## 2. Internal

Internal is nearly identical to Admin with these differences:

### Same As Admin

- **Same dashboard** (`/dashboard/admin`) -- but `requireRole(['admin'])` means the admin dashboard page itself only loads for admin. Internal users also route to `/dashboard/admin` but will get a 403 since the page guard is `requireRole(['admin'])` only.
  - **Correction**: Looking more closely, the admin dashboard page has `requireRole(['admin'])`. However, the sidebar links internal to `/dashboard/admin`. This means internal users get redirected to unauthorized. In practice, the `internalNav` still points to `/dashboard/admin`, suggesting internal sees the same admin dashboard. The dashboard page likely needs both roles -- checking the guard: it's `requireRole(['admin'])`, so internal might be excluded from the dashboard page specifically. This could be an oversight or intentional.

### Differences from Admin

| Feature                   | Admin | Internal |
|--------------------------|:-----:|:--------:|
| Admin Dashboard page     | Yes   | Blocked by `requireRole(['admin'])` |
| Metrics page             | Yes   | Blocked by `requireRole(['admin'])` |
| Hexona Team management   | Yes   | Blocked by `requireRole(['admin'])` |
| DFY Partners page        | Yes   | Yes      |
| Developer Directory      | Yes   | Yes      |
| Applications             | Yes   | Yes      |
| Blocker Queue            | Yes   | Yes      |
| Admin Opportunities      | Yes   | Yes      |
| Finances                 | Yes   | Yes      |
| Blueprints (create)      | Yes   | Yes      |
| Case Studies (create)    | Yes   | Yes      |
| Suggestions review       | Yes   | Yes      |
| Inquiries (full)         | Yes   | Yes      |
| Projects (create new)    | Yes   | Yes      |
| Project Financials tab   | Yes   | Yes (`isAdmin = profile.role === 'admin' || profile.role === 'internal'`) |
| Pulse                    | Yes   | Yes      |

### Sidebar Navigation

Same groups as admin **except**:
- Teams group has **no** "Hexona Team" link (only DFY Partners, Applications).

### Sidebar Footer

Same as admin: Suggestion Box, **Team Presence** indicator (admin/internal only), User menu.

### Settings

- General: Profile, Notifications, Account, Appearance.
- Role-specific: "Team" link to `/admin/team` (but may be blocked by admin-only guard).

---

## 3. Dev (Developer)

### Sidebar Navigation

| Group    | Items                                                          |
|----------|----------------------------------------------------------------|
| Overview | Dashboard (`/dashboard/dev`)                                   |
| Work     | My Projects, Opportunities, Conversations, Payouts, My Suggestions |
| Settings | Team, Developer Profile, Settings                              |

### Dashboard (`/dashboard/dev` -- `requireRole(['dev'])`)

- **Greeting**: "Welcome back, {firstName}".
- **Stats row**: Projects count, In Progress deliverables, Completed deliverables, Blocked deliverables.
- **My Projects**: Horizontal scrollable cards with project name, client, status, deliverables, expected payout, target date, activity sparkline.
- **My Blockers**: Active blockers with priority indicators. "Report Blocker" dialog.
- **Payouts**: Expected vs Pending amounts. Recent pending payouts list.
- **Pending Work**: Grid of pending deliverables across projects.

### Inquiries

- **No access**. Not in `['admin', 'internal', 'dfy']` check on inquiries page. No sidebar link.

### Projects

- **List page** (`/projects`): Sees only assigned projects (RLS-filtered). Labeled "My Projects" in sidebar.
- **Detail page**: `isAdmin = false` for devs.
  - Tabs visible: Overview, Progress, Testing, Files, Chat, + More (Deliverables, Requirements, Activity, Scope).
  - **No** Financials tab, **No** Project Info tab.
  - Cannot assign devs. Cannot create new projects.

### Opportunities

- **Dev Opportunities** (`/opportunities`): Sees public opportunities via `getPublicOpportunities()`. Three tabs:
  - **Browse**: List of open projects to apply for.
  - **Invitations**: Pending invitations sent by admin (accept/decline).
  - **My Applications**: Track application status.
- **Dev Opportunities Page** (`/dashboard/dev/opportunities`): `requireRole(['dev'])`. Browse and bid on projects matching skills. Uses `getOpportunitiesForDev()` and `getMyBids()`.

### Finances

- **No access** to `/finances/*` (layout guard: admin/internal only).
- **Payouts page** (`/dashboard/dev/payouts`): `requireRole(['dev', 'admin', 'internal'])`. View own payouts. Submit payout requests at `/dashboard/dev/payouts/submit`.

### Conversations

- Access to conversations page. Sees direct, project, and inquiry conversations scoped to their participation.

### Notifications

Relevant types: `project_assigned`, `blocker_acknowledged`, `blocker_resolved`, `blocker_comment`, `mention`, `deadline_reminder`, `status_change`, `payout_approved`, `payout_paid`, `payout_rejected`, `scope_change_flagged`, `scope_change_approved`, `scope_change_rejected`, `assigned`, `requirement_unblocked`, `testing_ready_dev`, `testing_passed`, `testing_failed`, `suggestion_reply`, `suggestion_status_change`.

### Special Dev Features

- **Check-ins / Dev Logging**: `CheckinPromptProvider` wraps the entire dashboard for devs only (`isDev` check in layout). Daily check-in prompts. Components in `features/dev-logging/`.
- **Blocker Reporting**: Can report blockers from dashboard and project pages.
- **Suggestions**: Can submit via Suggestion Box in sidebar. View own suggestions at `/my-suggestions` (`requireRole(['dev', 'dfy'])`).
- **Team Settings** (`/dashboard/dev/settings/team`): `requireRole(['dev'])`. Create/manage a dev agency. Invite team members.
- **Developer Profile** (`/settings/developer`): Skills and availability settings.

### Settings

- General: Profile, Notifications, Account, Appearance.
- Role-specific: "Developer" settings (skills, availability).

---

## 4. DFY (Done-For-You Partner)

### Sidebar Navigation

| Group    | Items                                                                 |
|----------|-----------------------------------------------------------------------|
| Overview | Dashboard (`/dashboard/dfy`)                                          |
| Business | Blueprints, Case Studies, My Deals, Conversations, Submit Inquiry, My Suggestions |
| Settings | Team, Settings                                                        |

### Dashboard (`/dashboard/dfy` -- `requireRole(['dfy'])`)

- **Greeting**: "Welcome, {firstName}".
- **Submit Inquiry button** in header.
- **Stale Proposals Banner**: Shown when proposals need follow-up.
- **Pending Extension Requests**: Shown when project extensions await approval.
- **Stats row**: Active Deals, Won deals, Total Earned (commission from completed deals).
- **Proposal Pipeline**: Recent inquiries with stage badges (DFY-visible stages: `sent`, `closed`, `lost`).
- **My Projects**: Project list with health indicators, progress bars, DFY price, and activity sparklines.
- **Project Health**: On Track / At Risk / Behind summary.

### Inquiries

- **List page** (`/inquiries`): Sees "My Submissions" (own submissions only). No Active/Archived filter tabs (internal-only). Can create new submissions.
- **New inquiry** (`/inquiries/new`): Full access.
- **Detail page**: Can only view own submissions (`inquiry.submitted_by === profile.id`).
  - Tabs visible: Overview, Document (comment only, no edit), Proposal (view after submission, can start negotiation), **My Version** (DFY-only private tab), Deliverables (after proposal sent).
  - **DFY-specific actions**: Mark as Closed (on own submitted inquiries), Start Negotiation (initiates deliverables parsing), Accept/Reject countered deliverables.
  - Sees DFY comment thread only (not internal).
  - Cannot edit pricing directly.

### Projects

- **List page** (`/projects`): Labeled "My Deals" in sidebar. Sees only related projects (RLS-filtered by DFY association).
- **Detail page**: `isAdmin = false`, `isDfy = true`.
  - Same tabs as dev (no Financials, no Project Info).

### Opportunities

- **No access** to opportunities pages. No sidebar link.

### Finances

- **No access** to `/finances/*` (layout guard: admin/internal only).
- No payouts page.

### Conversations

- Access to conversations page. Scoped to own project/inquiry conversations.

### Notifications

Relevant types: `mention`, `deadline_reminder`, `status_change`, `stage_changed`, `proposal_ready`, `scope_change_flagged`, `scope_change_approved`, `scope_change_rejected`, `suggestion_reply`, `suggestion_status_change`.

### Special DFY Features

- **Stale Proposal Reminders**: Dashboard banner for proposals needing follow-up.
- **Pending Extension Requests**: Can approve/reject extension requests on dashboard.
- **My Version tab**: Private editable version of proposal content (DFY-only tab on inquiry detail).
- **Copy Proposal to My Version**: Can copy the Hexona proposal to their private version for customization.
- **Deliverable Negotiation**: Can submit deliverables for review, accept/reject admin counters.
- **Suggestions**: Can submit via Suggestion Box. View own at `/my-suggestions`.
- **Blueprints/Case Studies**: Browse published items (sales collateral). Cannot create new ones.
- **Team Settings** (`/dashboard/dfy/settings/team`): `requireRole(['dfy'])`. Manage DFY agency team members.

### Settings

- General: Profile, Notifications, Account, Appearance.
- Role-specific: "Partner" settings (company and branding).

---

## 5. Client

### Sidebar Navigation

| Group    | Items                              |
|----------|------------------------------------|
| Overview | My Project (`/dashboard/client`)   |
| Settings | Settings                           |

**Minimal navigation** -- only sees their project and settings.

### Dashboard (`/dashboard/client` -- `requireRole(['client'])`)

- Shows **single project** (first project from `getProjects()`, RLS-filtered to client's own).
- **Project Status**: Status badge, progress bar with completion percentage, deliverable count.
- **Stats**: Completed, In Progress, Blocked deliverable counts.
- **Deliverables list**: Each deliverable with status icon, title, due date.
- **Contact card**: Developer name. "Contact your project manager" guidance.
- **Empty state**: "No project found. Contact your project manager for access."

### Inquiries

- **No access**. Not in allowed roles list.

### Projects

- **List page**: Would be accessible via `requireAuth()` but search/link generates `/dashboard/client` for client role (no direct project link).
- **Detail page**: Can access their own project. `isAdmin = false`. Tabs: Overview, Progress, Testing, Files, Chat, + More (Deliverables, Requirements, Activity, Scope -- no Financials, no Project Info).

### Opportunities

- **No access**.

### Finances

- **No access**.

### Conversations

- Accessible but scoped to own project conversations only.

### Notifications

Relevant types: `mention`, `deadline_reminder`, `status_change`, `testing_ready_client`, `testing_passed`, `testing_failed`, `requirement_unblocked`.

### Special Client Features

- **Read-only project view**: Progress tracking, deliverable status visibility.
- **No creation capabilities**: Cannot create projects, inquiries, or opportunities.
- **No financial data**: Cannot see pricing, payouts, or invoices.

### Settings

- General only: Profile, Notifications, Account, Appearance.
- No role-specific settings.

---

## Cross-Cutting Role Comparisons

### Feature Access Matrix

| Feature                    | Admin | Internal | Dev | DFY | Client |
|----------------------------|:-----:|:--------:|:---:|:---:|:------:|
| Dashboard                  | Admin | Admin*   | Dev | DFY | Client |
| Pulse                      | Yes   | Yes      | --  | --  | --     |
| Projects (list all)        | Yes   | Yes      | Own | Own | Own    |
| Projects (create)          | Yes   | Yes      | --  | --  | --     |
| Project Financials tab     | Yes   | Yes      | --  | --  | --     |
| Project Info tab           | Yes   | Yes      | --  | --  | --     |
| Assign devs to projects    | Yes   | --       | --  | --  | --     |
| Inquiries (list all)       | Yes   | Yes      | --  | Own | --     |
| Inquiries (create)         | Yes   | Yes      | --  | Yes | --     |
| Inquiry document edit      | Yes   | Yes      | --  | --  | --     |
| Inquiry proposal edit      | Yes   | Yes      | --  | --  | --     |
| Inquiry "My Version" tab   | --    | --       | --  | Yes | --     |
| Convert inquiry to project | Yes   | Yes      | --  | --  | --     |
| Blueprints (view)          | Yes   | Yes      | --  | Yes | --     |
| Blueprints (create)        | Yes   | Yes      | --  | --  | --     |
| Case Studies (view)        | Yes   | Yes      | --  | Yes | --     |
| Case Studies (create)      | Yes   | Yes      | --  | --  | --     |
| Opportunities (admin)      | Yes   | Yes      | --  | --  | --     |
| Opportunities (browse/bid) | --    | --       | Yes | --  | --     |
| Finances                   | Yes   | Yes      | --  | --  | --     |
| Payouts (view own)         | --    | --       | Yes | --  | --     |
| Payout submit              | --    | --       | Yes | --  | --     |
| Metrics                    | Yes   | --       | --  | --  | --     |
| Hexona Team management     | Yes   | --       | --  | --  | --     |
| DFY Partner management     | Yes   | Yes      | --  | --  | --     |
| Developer Directory        | Yes   | Yes      | --  | --  | --     |
| Dev Applications review    | Yes   | Yes      | --  | --  | --     |
| Blocker Queue              | Yes   | Yes      | --  | --  | --     |
| Report Blockers            | --    | --       | Yes | --  | --     |
| Suggestions (review all)   | Yes   | Yes      | --  | --  | --     |
| Suggestions (submit own)   | Yes   | Yes      | Yes | Yes | Yes    |
| My Suggestions page        | --    | --       | Yes | Yes | --     |
| Conversations              | Yes   | Yes      | Yes | Yes | Yes    |
| New direct conversations   | Yes   | Yes      | --  | --  | --     |
| Notifications              | Yes   | Yes      | Yes | Yes | Yes    |
| Dev check-in prompts       | --    | --       | Yes | --  | --     |
| Team Presence (sidebar)    | Yes   | Yes      | --  | --  | --     |
| Dev Team settings          | --    | --       | Yes | --  | --     |
| DFY Team settings          | --    | --       | --  | Yes | --     |
| Developer profile settings | --    | --       | Yes | --  | --     |
| Partner settings           | --    | --       | --  | Yes | --     |
| Onboarding tours           | Yes   | Yes      | Yes | Yes | Yes    |
| Command Palette            | Yes   | Yes      | Yes | Yes | Yes    |

\* Internal routes to `/dashboard/admin` but the page guard is `requireRole(['admin'])`, which may block internal users from the admin dashboard page itself.

### RLS (Row-Level Security) Boundaries

Data visibility is enforced at the database level via Supabase RLS:
- **Admin/Internal**: See all data across the platform.
- **Dev**: See only projects assigned to them and their own payouts/blockers/applications.
- **DFY**: See only inquiries they submitted and projects associated with their deals.
- **Client**: See only their own project.

### Inquiry Visibility by Stage (DFY vs Admin)

DFY partners see limited proposal stages: `sent`, `closed`, `lost`.
Admin/Internal see all stages: `unopened`, `admin_reviewed`, `in_queue`, `working`, `ready`, `final_review`, `sent`, `closed`, `lost`.

### Settings Pages per Role

| Settings Page       | Admin | Internal | Dev | DFY | Client |
|---------------------|:-----:|:--------:|:---:|:---:|:------:|
| Profile             | Yes   | Yes      | Yes | Yes | Yes    |
| Notifications       | Yes   | Yes      | Yes | Yes | Yes    |
| Account             | Yes   | Yes      | Yes | Yes | Yes    |
| Appearance          | Yes   | Yes      | Yes | Yes | Yes    |
| Developer           | --    | --       | Yes | --  | --     |
| Partner             | --    | --       | --  | Yes | --     |
| Team (admin)        | Yes   | Yes*     | --  | --  | --     |

\* Internal has the link but the target page may be admin-only.

---

## Key Implementation Files

| File                                | Purpose                                      |
|-------------------------------------|----------------------------------------------|
| `lib/auth/types.ts`                 | `UserRole` type, `ROLE_HIERARCHY`, `DASHBOARD_ROUTES` |
| `lib/auth/guards.ts`               | `requireRole()`, `requireAdmin()`, `requireInternal()` |
| `lib/navigation.ts`                | Per-role sidebar navigation config           |
| `components/app-sidebar.tsx`        | Sidebar rendering with role-based inquiries badge |
| `app/(dashboard)/layout.tsx`        | Dashboard layout, role detection, inquiry counts |
| `features/settings/components/SettingsSidebar.tsx` | Role-specific settings nav |
| `lib/search.ts`                     | Role-aware search result link generation     |
| `components/suggestion-box.tsx`     | Suggestion box, DFY/Dev get "My Suggestions" navigation |
