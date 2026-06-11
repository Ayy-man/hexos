# HEXOS v2 — Complete Product Map

*A product-manager's walkthrough of everything v2 contains, written to salvage decisions into v3. No technical detail — screens, features, objects, and flows only. "Completeness" everywhere refers to product completeness (does the thing work end-to-end for a user), never code quality.*

Grades used throughout: **solid** (works end-to-end) · **rough** (works but partial/inconsistent/undiscoverable) · **stub** (placeholder / "coming soon" / unwired) · **broken** (present but non-functional). Views are also tagged **fully built / rough / stub / dead-end**, with **ORPHANED** for anything unreachable from navigation.

---

## 1. One-Paragraph Overview

HexOS v2 is the internal operating system Hexona built to run its done-for-you AI-automation agency end-to-end, replacing a patchwork of Tally, WhatsApp, Notion, and ClickUp with one role-aware portal. It runs an *arbitrage* business model: outside **DFY partners** source client deals, Hexona's **internal team** qualifies them and writes proposals, contracted **developers** build the work, and **end clients** watch their project progress — each role seeing a deliberately different slice of the same system. The platform spans the entire deal lifecycle — inquiry intake (with an AI copilot) → a ten-stage proposal pipeline with line-item deliverable negotiation → conversion into a project → client onboarding/intake → a phased build with hill-chart progress, gated three-stage testing, scope-change monitoring, and blocker/delay tracking → delivery and sign-off → invoicing/payments and developer payouts → optional ongoing retainer. Around that spine it layers a productized-services catalog (Blueprints) and portfolio (Case Studies), a developer marketplace (invitations, applications, competitive bidding, AI-redacted briefs), an AI meeting notetaker that turns calls into action items and deliverables, real-time messaging, a notification center with push, a finance cockpit, and an admin metrics suite. It reached "ready for soft launch," but the surface area vastly outran the polish: several flagship subsystems are built-but-unwired (the entire automation scheduler, much of Finances), a couple of subsystems were built and then deliberately removed (Pulse productivity, time tracking), and orphaned/duplicate screens accumulated — the classic "good feature decisions, fatal polish debt" collapse the rebuild is reacting to.

---

## 2. Personas / Roles

**Five live roles** (an explicit hierarchy) plus several pre-account / unauthenticated personas the app also serves:

| Persona | What the app thinks their job is |
|---|---|
| **Admin** (Ayman, Hamza — the owners) | Run the whole platform: review inquiries, write & approve proposals, convert deals to projects, drive every project status, manage money, manage the developer roster/team/partners, see all metrics. The "operator/me." |
| **Internal** (future hires) | Admin's near-twin — same management reach but walled out of three things: the admin home dashboard, the Metrics suite, and Hexona-team management (all admin-only). Also blocked from meeting *detail* pages. |
| **Dev** (contracted developer) | Build assigned work: update deliverable status, push hill-chart progress, run self-testing, report blockers, do a mandatory daily check-in, maintain a skills profile, browse/bid on opportunities, and request payouts. |
| **DFY partner** (done-for-you reseller agency) | Bring in deals and shepherd them: submit inquiries, receive/negotiate/customize proposals, share them with prospects, report won/lost, sign off deliverables "on behalf of client," approve extension requests, and watch their referred projects' health and commissions. |
| **Client** (end customer) | A spectator + intake-completer: complete the onboarding questions/requirements they own, watch a single project's progress and deliverables, run client-stage acceptance testing, chat on their project, and pay invoices. Most restricted. |
| **Applicant** *(pre-account)* | A prospective developer filling the public "Apply to Join hexOS" form — pitch skills/portfolio/availability and await review. |
| **Invitee** *(pre-account)* | Anyone holding an invitation link — convert it into a live account (one unified flow covers Hexona admins, agency founders, agency teammates, approved devs, and dev teammates). |
| **Prospect / Payer** *(unauthenticated)* | The DFY's end customer who, without logging in, reads a shared white-labeled proposal link and pays a hosted invoice link. The app treats them as a passive recipient ("contact your representative"). |

*Note:* the app has **no built "client invitation" flow** — client accounts are provisioned by admin/DFY out-of-band. Client-as-spectator is real; client-as-self-service-signup is not.

---

## 3. View Map

Grouped by section. Route slugs are given as locators (address-bar paths, not file references).

### 3.1 Authentication & Access

- **Sign in** `/login` — everyone with an account — **Fully built.** Email+password, "Continue with Google," "Sign in with passkey" (only if the device supports it), a "Use magic link instead" toggle, "Forgot password?", and a shipped **"Quick login (testing only)"** panel with four one-click `@test.hexos` role buttons. Leads to the role's dashboard.
- **Magic-link mode** `/login?mode=magic-link` — **Fully built.** Email-only → "Check your email" confirmation.
- **Reset password (request)** `/forgot-password` — **Fully built.** Privacy-preserving copy ("If an account exists…").
- **Set new password** `/reset-password` — **Fully built.** Waits for the recovery session ("Verifying your reset link…"), validates match + length, routes back to login with a success banner.
- **Invitation acceptance** `/invite/[token]` — invitees — **Fully built.** One page, many states: signup, login-instead, logged-in-accept, **email-mismatch warning** ("invitation was sent to X, you're signed in as Y"), and invalid/expired/already-accepted. Title/subtitle adapt to invite type ("Join hexOS as an Admin," "Create {agency} on hexOS," "Your developer application has been approved"). Google + magic-link + password paths all carry the token through to auto-accept.
- **OAuth / magic-link callback** `/auth/callback` — headless — **Fully built.** Exchanges the sign-in, auto-accepts a carried invite, and bounces brand-new OAuth users with no role back to login ("No account found. Please use an invitation link to join.").
- **Apply to Join hexOS** `/apply` — public applicants — **Fully built but ORPHANED** (no in-app link anywhere; marketing/direct-URL entry only). Name, email, portfolio/GitHub, a fixed 16-skill checkbox grid, availability, bio; blocks duplicate emails; success state tells them to check email.
- **Unauthorized** `/unauthorized` — **Fully built** (intentional dead-end): "You don't have permission… Return to login."

### 3.2 First-Login Onboarding (account gate)

- **Onboarding wizard** `/onboarding` — every brand-new user — **Fully built.** A 3-step gate the dashboard *forces* un-onboarded users into: **Step 1 "Complete your profile"** (display name + auto-detected timezone, Google avatar/email prefilled), **Step 2** a role-branched welcome ("Welcome to the team" / "Your agency is set up" / "You've joined {org}" / "Welcome to the dev network" / "Your project dashboard"), **Step 3 "You're all set!"** → role dashboard. Deliberately asks for only the two things it needs.

### 3.3 Home Dashboards

- **Dashboard router** `/dashboard` — invisible redirect to the role home. **Fully built.**
- **Admin "Dashboard"** `/dashboard/admin` — admin only — **Fully built.** 5-stat health row (Total / Active / On Track / At Risk / Behind), an "All Projects" list (health icon, progress, status, assigned dev, 14-day activity sparkline), and a rail: "Pending Proposals" (grouped by stage), cross-project "Blockers," and "Quick Stats" with a health-distribution bar. "New Project" CTA.
- **Dev dashboard ("Welcome back, {name}")** `/dashboard/dev` — dev — **Fully built.** 4 deliverable-derived stats (Projects / Active Tasks / Done / Blocked), a horizontally-scrolling "My Projects" carousel, a "My Blockers" card with a Report-Blocker dialog, and a "Pending Work" grid. *(No payouts widget despite older docs claiming one — payouts live on their own page.)*
- **DFY dashboard ("Welcome, {name}")** `/dashboard/dfy` — DFY — **Fully built.** "Submit Inquiry" CTA, conditional **Stale Proposals** banner and **Extension Requests Pending Approval** card (inline approve/reject), Active/Won stats, a DFY-scoped "Proposal Pipeline," "My Projects" health, and an escalated-blockers card.
- **Client dashboard** `/dashboard/client` — client — **Fully built** (intentionally minimal). One project: status + progress + "X of Y deliverables," 3 stat cards, a numbered "What's being built for you" deliverable list, and a "Need Help?" card naming the developer. Empty state: "No project found. Contact your project manager."

### 3.4 Pipeline — Inquiries & Proposals

- **Project Intake Form** `/inquiries/new` — DFY + admin/internal — **Fully built** (one intentional dead-end). A branching wizard: Step 1 "What are you here for?" → **"I have closed a deal"** vs **"I'm requesting a proposal,"** fanning into six named paths (e.g. "You Closed a Blueprint!", "Blueprint + Variation Proposal", "Custom Deal Proposal"). Collects prospect info + multi-select **Blueprints & Case Studies** with per-blueprint tier choices, an optional "Forward Form" step, and an **AI Copilot** sidebar that auto-fills fields. The "blueprint proposal" path is a deliberate info-only dead-end ("You have everything you need in the Blueprint Library!") whose "View Blueprint Library" link is a placeholder. Ends on a "Deal Submitted / Proposal Request received" confirmation (mentions follow-up "via WhatsApp").
- **All Inquiries / My Submissions** `/inquiries` — admin/internal see all; DFY sees own — **Fully built.** Stat row (Total / Unopened / In Queue / Working / Ready), Active/Archived tabs (internal only), a **Table ⇄ Board** toggle (the Board is a drag-between-stages kanban with live multi-viewer sync), and "New Submission."
- **Inquiry detail** `/inquiries/[id]` — **Fully built.** Header (prospect, **stage badge**, Share, Export PDF, DFY "Mark as Closed") over tabs:
  - **Overview** — prospect info, chosen blueprints/tiers, humanized submission details, a **Proposal Progress** timeline, a **Quick Pricing Editor** (admin), and an Actions card (Convert to Project / Create Opportunity / Reopen). Fully built.
  - **Document** — an auto-generated brief in a rich editor with inline comment/discussion threads + fullscreen; admin-editable, DFY read-only. Fully built.
  - **Proposal** — admin authors (auto-save, floating toolbar) and drives the workflow buttons (Submit for Review → Approve → Submit to Partner → Undo Send); DFY sees it read-only and, post-send, gets a **"Suggest Changes"** card. Fully built.
  - **My Version** — DFY-owner only: a private editable copy ("Only you can see this tab") with "Import from Proposal." Fully built.
  - **Deliverables** — appears after the proposal is sent: the full negotiation surface (line-item table, status badges, diffs, counter cards, version history). Fully built.
- **Project Setup / Initiate** `/inquiries/[id]/initiate` — **admin only** (internal is bounced) — **Fully built.** Full-page 3-step convert-to-project wizard: select carry-over **Deliverables** → build the **Requirements** tree (owner Hexona/DFY/Client, blocker severity, Loom/resource links, templates) → **Review** (project + client name, **payment structure** 100% / 50-50 / 40-30-30) → "Create Project."
- **Public proposal** `/p/[token]` — unauthenticated prospect — **Fully built.** White-labeled (partner logo, no Hexona branding): "Proposal For {company}," the proposal/document content read-only, an **"Investment"** pricing block, "Contact your representative," and its own PDF export.

### 3.5 Delivery — Projects

- **Projects (list)** `/projects` — all roles (scoped) — **Fully built.** Search + **Active / Retainer / Completed** filters; table (desktop) / cards (mobile) with status dot, progress bar, assigned dev, target date; the Retainer filter swaps to retainer health tiles. "New Project."
- **New Project** `/projects/new` — admin/internal — **Fully built** (plain-styled). Basic info, **Project Type** (Blueprint / Blueprint + Custom / Full Custom), **Operational Mode** (Internal / Hexona Devs / Hexona Devs + DFY), assignment (dev + DFY partner), timeline & client price, notes. Starts the project at "Deliverables Pending."
- **Project detail** `/projects/[id]` — all roles — **Fully built.** A preloading shell (header with breadcrumb, name, an editable **Estimated Delivery** badge, a phase progress bar, and a **status control**) over a **phase-driven tab strip** — tabs appear/disappear by phase, less-used ones hide under a "More" dropdown (which also hosts "Report Blocker" and a pending-scope-changes badge). Tabs:

  | Tab | Who | What it is | Completeness |
  |---|---|---|---|
  | **Onboarding / Questions** | admin/dfy/client | A bento grid of draggable client-intake **Category** cards (categories→questions), plus Deliverables/Requirements cards; DFY's **"Mark Onboarding Complete"** gate (blocked by unanswered required items or absolute blockers); admin **Preview-as-client** toggle; relabels to "Questions" Q&A channel after onboarding. | Fully built |
  | **Overview** | all | Phase timeline, Requirements/Deliverables stat cards, Delay Summary, Active Blockers, Scope-Changes summary, Project Details (inline dev assign for admin), Recent Activity, Notes. | Fully built |
  | **Progress** | all (edit gated) | A **Shape-Up hill chart** — drag dots / ±% on sub-deliverables; Figuring-Out / Making-It / Done / Overdue stats; read-only in late phases. | Fully built |
  | **Testing** | role-filtered (appears at 90%) | A **Testing Queue** (Ready / In Progress / Recently Passed) with a Dev/QA/Client status row per deliverable and a **Testing Modal** (AI-or-manual checklist across six categories, pass/fail with reasons, submit). | Fully built |
  | **Deliverables** | all (edit=admin) | Sign-off banners, **Confirm Deliverables → Send for DFY Sign-off**, a hierarchical (parent→"Task") list with status/hours/due, post-sign-off "edits log a scope change" warning. | Fully built |
  | **Requirements** | all (gated by ownership) | Onboarding-progress bar + hierarchical checklist with **Owner** (Hexona/DFY/Client) and **Blocker** (Partial/Blocker) badges, Loom/resource links, add/edit/sub-item. | Fully built (one stub: "uncomplete not implemented yet") |
  | **Scope** | all (approve=admin) | **Scope Baseline** card (captured at sign-off) + current-vs-baseline delta, a **Scope Changes** list (All/Pending/Approved/Rejected) with hours/timeline/cost impact and **Flag Change** / Approve / Reject. | Fully built |
  | **Files** | all (edit varies) | Two-pane workspace with an **Internal ⇄ Client/Shared visibility** toggle, document list + uploads (50 MB), a fullscreen rich editor with @mentions, and file viewers. | Fully built |
  | **Chat** | all (scoped) | Embedded role-scoped project/workspace/partner conversations. | Fully built |
  | **Activity** | all | Filterable day-grouped activity timeline with "Load more." | Fully built |
  | **Improvements** ("Future Improvements") | all (convert=admin) | Captures ideas "too large for retainer tasks"; admin multi-selects and **"Create Project from Selected."** | Fully built |
  | **Financials** | admin/internal | Hero metrics (Value/Collected/Expenses/Profit), Payment Milestones, Project Expenses, Related Invoices; create-actions deep-link to Finances. | Fully built (read-mostly) |
  | **Meetings** | admin | Linked-meeting list → meeting detail. | Fully built (thin) |
  | **Project Info** | admin (edit), internal (view) | Pricing (client/our/dev + computed Hexona/DFY profit), Dates & Cycles (computed sales/delivery-cycle days), Settings (retainer plan, software payer), Archived banner/Restore, and a **Danger Zone** (Archive / Delete — "linked inquiry preserved"). | Fully built |
  | **Check-ins** / **Tasks** | retainer projects | Retainer cadence check-in log (health green/yellow/red) and a To-Do/In-Progress/Done task board. | Fully built |

  *Project modals (all fully built):* Edit Delivery Date, status transitions (Move Back To… / Put On Hold / Cancel), **Mark Delay** (Client vs Dev), **Request Deadline Extension** (auto "extension breakdown"), **Close Project** (Complete vs **Move to Retainer**), Report Blocker, Flag/Approve/Reject Scope Change, Add/Edit Deliverable & Requirement, New Document, Create/Convert Improvement.

### 3.6 Finances & Money

The Finances hub sits behind a single sidebar link (**"Finances"**); all sub-pages below are reachable only via the overview's quick-links/cards — discoverability is limited.

- **Finances (Overview)** `/finances` — admin/internal — **Fully built.** Period selector; hero cards (Revenue / Expenses / Net Profit / Margin); a **Cash-Flow Projection** chart; **Payable** ("money you owe") and **Outstanding** ("money owed to you") rollups; Recent Activity; and an **Action Required** queue (overdue invoices → Send Reminder, due milestones → Create Invoice, pending/approved payouts → Review/Process).
- **Invoice Management (list)** `/finances/invoices` — admin/internal — **Fully built.** Stat tiles, status/project filters, table; status-aware row menu (draft → Edit/Send/Delete; sent → Copy Payment Link/View on Stripe/Void; paid → Download PDF); "New Invoice" slide-over (line items, editable tax %, live total). Auto-numbered `INV-YYYY-NNNN`.
- **Invoice detail** `/finances/invoices/[id]` — admin/internal — **Rough.** Renders the invoice and an Actions card, but its **Send Invoice / Send Reminder / Mark as Paid buttons are unwired** (the working send/void path is on the list page).
- **Payouts (management)** `/finances/payouts` — admin/internal — **Fully built** (the most complete money screen). Metric cards; All/Pending/Approved/Paid/Rejected tabs; rows expand to **Wire Transfer Details** with per-field copy + **"Copy All"** (paste into a bank portal); Approve / Reject-with-reason / **"Mark as Sent"** ("record details after sending via Mercury — an expense will be auto-created").
- **Expenses (ledger)** `/finances/expenses` — admin/internal — **Fully built.** Spreadsheet-style inline-editable table, project/category filters, CSV export, "Add Expense" sheet with categories (Direct Cost / Contractor / Tools-Ops / Other), project-or-overhead allocation, and a **recurring-expense** block. *(Recurring config is captured but never materializes future rows.)*
- **Payment Schedule** `/finances/schedule` — admin/internal — **Rough** (read-only). Milestones grouped by month with Paid/Overdue/Due and a 90-day "Expected Collections" KPI; a "Create Invoice" deep-link whose milestone param isn't consumed. Milestones are created in Projects, not here.
- **Retainers (billing)** `/finances/retainers` — admin/internal — **Rough.** Active/Paused/Cancelled sections, normalized monthly-recurring-revenue, "New Retainer" (frequency + billing day), and **"Generate Invoice Now"** (creates a *draft* invoice, advances next-invoice-date). The advertised *automatic* scheduled billing **does not exist**.
- **Financial Reports** `/finances/reports` — admin/internal — **Stub.** Four cards (P&L, Revenue by Client, Aging 30/60/90, Expense Breakdown), all "Coming Soon," linking to pages that don't exist.
- **My Payouts** `/dashboard/dev/payouts` — dev — **Fully built.** Pending/This-Month/Total-Paid cards, payout history, a **Rejected Requests** card with reasons, "New Request."
- **Submit Payout Request** `/dashboard/dev/payouts/submit` — dev — **Fully built.** Project, description, amount, a **Wire Transfer vs "I'll email my invoice"** chooser (conditional wire-details), invoice upload, invoice number/date.
- **Public Invoice / Pay** `/pay/[token]` — unauthenticated client — **Fully built.** Branded, status-aware invoice with **"Pay with Card"** (hosted checkout), "Payment Received," or "voided," + optional PDF.
- **Payment Success** `/pay/success` — unauthenticated — **Fully built.** "Payment Successful!", "confirmation email has been sent," links to the paid invoice and hexona.io. *(Known link bug: the copied pay-link and cancel URL use the raw invoice id rather than the public token.)*

### 3.7 Opportunities — Developer Marketplace

- **Opportunities (dev)** `/opportunities` — dev (the sidebar target) — **Fully built.** Stats + a pending-invitations banner; tabs: **Browse** (cards → detail modal → **Apply** with a cover message), **Invitations** (Pending/Past with **match %**, Accept/Decline + response message), **My Applications** (Pending Review / Shortlisted / Accepted / Not Selected, with reviewer "Feedback").
- **Project Opportunities (admin)** `/admin/opportunities` — admin/internal — **Fully built** (one dead menu item). Stats, status filter, **New Opportunity** (weeks/hours/complexity/expiry/link-to-project), cards with bid counts; row menu: View Details, **Invite Developer**, and a dead "View Applications." Admin **Opportunity Detail Modal** with **Details / Bids (Shortlist→Accept/Reject) / Brief (AI-generated, redacted) / Committed Devs** tabs.
- **Available Opportunities (dev bidding)** `/dashboard/dev/opportunities` — dev — **Fully built but ORPHANED** (no nav links here). The newer bidding system: Starred/Hidden filters, cards with a **Bid** overlay → a dialog with **Submit Bid** (proposed weeks, optional price, cover) and **Pre-commit** (Interested / Committed / Not Interested) tabs.

### 3.8 Admin Management

- **Blocker Queue** `/admin/blockers` — admin/internal/dev/dfy — **Fully built.** Critical-alert banner; project/priority filters + status pills (Active/New/Acknowledged/In Progress/Resolved/Archived/All, with 72h auto-archive); a bento grid → **Blocker Sidebar** (Overview + a threaded Conversation) with Acknowledge → Start Working → Resolve, **Escalate to DFY** (one-way), Delete.
- **Developer Directory** `/admin/devs` — admin/internal — **Fully built.** Stats, search + availability filter, **Invite Developer**, a table (availability, capacity h/week, top skills as "{skill} {n}/5", active projects), and pending-invite management (Copy Link/Resend/Revoke).
- **Developer Applications** `/admin/applications` — admin/internal — **Fully built.** Stats (Pending/Approved-"Awaiting signup"/Joined/Rejected), application cards, **Review** dialog, Approve / Reject.
- **Hexona Team** `/admin/team` — **admin only** — **Fully built.** Invite admin/internal, presence, role badges, invitation lifecycle.
- **DFY Partners** `/admin/partners` — admin/internal — **Fully built** (two dead menu items). **Invite Agency** (create-new vs add-to-existing), agencies table (team/seats, projects), pending invites.
- **Activity Log** `/admin/activity-log` — admin/internal — **Fully built.** Stats (Total/Today/AI Queries/Errors), category/user/entity filters + **Export**, an expandable audit table capturing AI prompt/response + tokens/latency, change diffs, error stacks, and request context. **Export dialog**: CSV / JSON / JSON Lines, date range, include-AI/metadata toggles.

### 3.9 Metrics & Pulse

- **Analytics** `/dashboard/admin/metrics` — **admin only** — **Fully built UI.** Always-on hero KPIs + critical alert banners, then tabs: **Overview** (win rate, conversion funnel, inquiry trend, project health), **Pipeline** (stacked monthly pipeline, stages, inquiry-sources table + CSV), **Projects** (health, by-phase, deliverables/blockers, timeline metrics + CSV), **Team** (developer hours, DFY leaderboard, utilization + CSV — *but the time-tracking widgets read emptied tables and show zeros*), **Financials**. 
- **Pulse** `/pulse` — admin/internal — **Stub.** A "Pulse / Coming soon" placeholder still linked from the sidebar, command palette, and mobile menu. *(Was a full productivity/OKR system; removed — see §7.)*

### 3.10 Communication & Knowledge

- **Conversations (Inbox)** `/conversations` — all roles — **Fully built** (one dead desktop "New Message" button). A two-panel messenger with **Inbox / Projects / Inquiries** tabs (unread badges), search/type filters, a visibility banner per chat ("Visible to everyone on this project"), and a chat panel (avatars, edit/delete own, emoji reactions, attachments, @mentions). *(Note: deep-links to `/conversations/[id]` go nowhere — that route doesn't exist.)*
- **Meetings (list)** `/meetings` — admin/internal — **Fully built.** Status filter (Pending/Recording/Processing/Ready/Failed), table/cards, **New Meeting** (paste a Zoom/Meet/Teams link → "Bot is joining…").
- **Meeting detail** `/meetings/[id]` — **admin only** (internal is locked out) — **Fully built.** Status panel while the bot works, then 5 tabs: **Summary** (AI bullets + Key Decisions), **Tasks** (action items with done-state, assignee, priority, **AI/Manual/Imported source badge**, "Linked to deliverable," **Convert to Deliverable**, CSV Import/Export), **Transcript** (searchable, speaker-labeled), **Recording** (embedded player), **Participants** (speaker→profile matching). Plus Link-to-Project/Inquiry.
- **Blueprints (library)** `/blueprints` — admin/internal/dfy — **Fully built.** "Pre-built automation solutions catalog" (DFY: "solutions to sell"). Cards (icon, cover, price, hours, tags, Draft badge), search, tag filters, admin status filter, "New Blueprint."
- **New Blueprint** `/blueprints/new` — admin/internal — **Fully built.** Icon, name, description, hours, base price, tags, cover image, **Loom URL** (validated, live preview), **pricing tiers** editor, Published/Draft toggle.
- **Blueprint detail** `/blueprints/[id]` — admin/internal/dfy — **Fully built** (but post-creation editing is limited). Loom walkthrough, rich content (with fullscreen + autosave), pricing tiers (last tier auto-"Recommended"), and a **DFY "Quick Actions" card ("I Closed This Deal" / "Request Proposal")** that deep-links into a pre-filled inquiry. Admin Edit/Duplicate/Delete. *(The full edit form is orphaned — cover image, Loom, price, tags, status are effectively write-once; publish/unpublish has no button.)*
- **Case Studies (library / new / detail)** `/case-studies`, `/case-studies/new`, `/case-studies/[id]` — admin/internal/dfy — **Fully built.** "Success stories from completed automation projects." Structured **Challenge / Solution / Results** blocks, client/industry, tags, cover, rich content + fullscreen, and bidirectional **Related Blueprint** linking. Draft/Published toggle, Duplicate (forces Draft), Delete. *(Loom is captured in the form but never displayed on the detail page — a false-promise gap. One-click publish/unpublish exists in the backend but has no button.)*
- **Suggestions (admin review)** `/suggestions` — admin/internal — **Fully built.** Stat cards (New/Reviewed/Implemented/Declined), expandable cards (submitter name+role, screenshot lightbox), row menu (Mark Reviewed/Implemented/Declined, Delete), and a private **Admin Notes** field. *(Has no view of the per-suggestion conversation thread.)*
- **My Suggestions** `/my-suggestions` — dev/dfy — **Fully built.** Own suggestions list → a detail **sheet** with a live **conversation thread** to "communicate with the team," + "New Suggestion."
- **Notifications center** `/notifications` — all roles — **Fully built.** Unread count, Mark-all-as-read, Refresh, items grouped Today/Yesterday/Earlier with actor/action/target lines, type chips, and click-to-deep-link.

### 3.11 Settings

Left settings sidebar: a "General" group (Profile, Notifications, Account, Appearance) + a role-specific link.

- **Profile** `/settings/profile` — all — **Fully built.** Avatar, name, disabled email, role badge, bio (250-char), phone ("for WhatsApp notifications (coming soon)"), company (DFY/client), and an embedded **Location** card with its *own* Save (a small redundancy).
- **Notifications** `/settings/notifications` — all — **Fully built** (WhatsApp channel is a "Coming Soon" preview). In-App vs Email toggles per category + Weekly Digest.
- **Account** `/settings/account` — all — **Rough.** Only **Passkeys** is live (register/list/delete). **Password change, 2FA, Active Sessions** are all "Coming Soon" — and in-app password change is disabled here even though the standalone reset flow works.
- **Appearance** `/settings/appearance` — all — **Fully built.** Theme (live), Compact density, default Projects/Inquiries list-or-board views.
- **Developer** `/settings/developer` — dev — **Fully built.** **Availability** (status, capacity, max concurrent projects, auto-assign, planned absence) + **Skills** (gamified Level/XP/Badges stats and a 0–10 Skills Matrix across 8 emoji categories).
- **Partner** `/settings/partner` — DFY — **Rough.** Only logo upload (for proposals/PDFs) is live; Performance Overview (`--`), Partnership Tier ("Standard Partner"), and Payouts are placeholders.
- **Team** (settings link) — admin/internal → `/admin/team`; dev/DFY agency team management lives at `/dashboard/dev/settings/team` & `/dashboard/dfy/settings/team` — **Fully built** (org rename, seat counter, member table with presence, invite + pending-invite management).

### 3.12 Global Shell Surfaces (present on every authenticated screen)

- **Command Palette (Cmd/Ctrl+K)** — all — **Fully built.** Role-aware quick links + recents + live grouped search across Projects, Inquiries, Blueprints, Case Studies, Conversations.
- **Suggestion Box (sidebar footer)** — **Fully built.** A submit dialog (title, description, drag-drop screenshot) for admin/internal/client; a "My Suggestions" link for dev/DFY.
- **Notification popover (bell) + toasts** — all — **Fully built.** Unread badge, View-all/Unread tabs, mark-all-read, and a swipe-dismissible real-time toast stack with once-only dedup.
- **Team Presence** — admin/internal — **Fully built.** Live "N online" with avatars + an offline "last seen" list.
- **PWA Install Prompt** — **Fully built.** "Install hexOS" after engagement heuristics.
- **Offline Indicator** — **Rough.** Offline/syncing/pending-changes banner backed by a small local mutation queue.
- **App Sidebar + hover cards** — **Fully built.** Role-driven nav with rich drill-down hover previews (inquiries, projects, conversations, suggestions, meetings, blueprints, case studies, blockers) and count badges.
- **Nav user menu** — **Fully built.** Profile, Sign out.
- **Dynamic Breadcrumb** — **Rough.** Title map is stale (misses Meetings, Notifications, My Suggestions, etc.).

### 3.13 Orphaned Views (built but unreachable from navigation)

- **`/apply`** (public dev application) — fully built, linked from nowhere in-app.
- **`/dashboard/dev/opportunities`** (the full bidding/briefs/pre-commit experience) — fully built, no nav link.
- **Modal "Convert to Project" wizard** (a second, richer conversion UI with custom payment milestones) — built, never rendered; the full-page Initiate wizard is the live path.
- **Admin "Proposal Status Requests" panel** (bulk-nudge stale proposals grouped by partner) — built, mounted on no page.
- **Gameplan tab** (standalone multi-doc planner with version history) — built, superseded by the Files tab.
- **Simple Onboarding tab** (two-card sign-off view) — built, superseded by the Onboarding bento grid.
- **Tutorial-replay settings card** — built, rendered nowhere (docs falsely call it a settings page).
- **`/conversations/[id]`** — referenced by links but the page doesn't exist (dead deep-links).
- **Financial Reports sub-pages** (`/finances/reports/*`) — referenced, never built.

---

## 4. Feature Inventory

Grouped by domain. Each: what it does — who — what it reads/changes — grade.

### Pipeline
- **Branching intake wizard + AI Copilot** — DFY/admin — creates an inquiry from one of six paths; AI auto-fills fields from conversation context. **Solid.**
- **Proposal pipeline (kanban)** — admin/internal — drags inquiries through ten stages with live sync. **Solid.**
- **Proposal editor + auto-brief** — admin — rich proposal authoring with inline discussions; a separate auto-generated brief. **Solid.**
- **Proposal review workflow** — admin — Submit-for-Review → Approve → Submit-to-Partner → Undo. **Solid.**
- **"My Version" private proposal copy** — DFY — a walled-off editable duplicate for client-specific tweaks. **Solid.**
- **White-label public proposal + PDF export** — admin shares a tokenized link; both web and PDF strip Hexona branding. **Solid.**
- **AI deliverables extraction** — admin/DFY — parses proposal prose into priced line items (with confidence + source snippet); manual fallback. **Solid.**
- **Deliverable negotiation (multi-round)** — DFY proposes edits/adds/removes → admin Approve/Reject/Counter → DFY Accept/Reject counters → admin Final-Approve-&-Lock, with per-line status badges, diffs, and append-only history. **Solid** (the most elaborate feature in the app).
- **Quick pricing editor** — admin — sets DFY/Hexona/dev prices + notes. **Solid.**
- **Stale-proposal follow-up loop** — DFY — a dashboard banner with Won / Lost / Still-Going (snooze, max 3) / Need-Help (escalate); auto-escalates after snooze cap. **Solid.**
- **Mark Won/Lost/Closed + Reopen** — DFY marks outcome; admin reopens. **Solid.**
- **Convert to Project (Initiate)** — admin — selects deliverables, builds requirements, sets payment structure. **Solid.**
- **Create Opportunity from inquiry** — admin — spins the brief into a dev-facing opportunity. **Solid.**
- **Admin bulk "Request Updates"** — built but unmounted. **Stub (orphaned).**

### Delivery
- **Project status pipeline & control** — admin — drives the project through its phases with a primary "next step" + guarded backward moves; devs see a read-only badge. **Solid.**
- **Deliverable tracker + hierarchy** — admin CRUD / dev status — parent→Task items with status/hours/due. **Solid.**
- **Deliverable sign-off flow** — admin confirms → sends to DFY → DFY confirms "on behalf of client"; locks deliverables + captures scope baseline. **Solid.**
- **Client onboarding / requirements** — owner-typed + blocker-typed requirement tree + categories/questions; ownership-gated completion feeds onboarding %. **Solid** (one stub: uncomplete).
- **Hill-chart progress** — drag-to-update Shape-Up chart; drives the headline %. **Solid.**
- **Three-stage gated testing** — Self-Testing (dev) → QA Review (admin) → Client UAT (client/DFY); each pass locks the hill to 90/95/100; AI-or-manual checklists; failures can spawn blockers. **Solid.**
- **Scope-change monitoring** — baseline at sign-off; post-sign-off edits auto-log as scope changes with hours/timeline/cost deltas → admin Approve/Reject. **Solid.** *(Docs list this as "not built"; it is.)*
- **Blocker reporting** — dev/admin/DFY — file with priority + optional deliverable. **Solid.**
- **Delay tracking** — Client Delay (extends timeline) vs Dev Delay (accountability). **Solid.**
- **Deadline extensions** — admin requests (auto-splits client-delay vs additional days) for DFY approval; approval moves the target date. **Solid.**
- **Delivery-date estimation + override** — auto-estimate from progress + delays; admin hard-override. **Solid.**
- **Dev assignment** — admin inline assign/reassign. **Rough** (a richer invitation/accept model exists underneath but isn't surfaced here).
- **Project files & documents** — internal/client visibility, uploads, rich docs with @mentions + version history; auto-created default folders/doc. **Solid.**
- **Improvements → project conversion** — capture future work, bulk-convert to a new project. **Solid.**
- **Completion / retainer conversion** — guided Close (Complete vs Move-to-Retainer with cadence + assignees). **Solid.**
- **Archive / soft-delete** — hides/restores; delete preserves the linked inquiry. **Solid.**

### People / Org / Auth
- **Email/password, Google, magic-link, passkey sign-in** — all — **Solid.**
- **Passkey registration & management** — all — register/list/delete devices. **Solid.**
- **First-login onboarding gate** — captures name + timezone, flips the gate. **Solid.**
- **Role-aware welcome tours** — auto-launch per role. **Rough** (selectors reference nav IDs that may not exist; fires-and-completes immediately; replay card is orphaned).
- **Public dev application intake** — captures applicant, blocks dupes, emails confirmation. **Solid** (entry page unlinked).
- **Dev application review** — admin Approve (→ invite + email) / Reject (→ email). **Solid.**
- **Unified invitation system (6 types)** — admin/internal/dfy-founder/dfy-team/dev/dev-team; token, 7-day expiry, dedup, seat checks; one model also expresses dev applications. **Solid.**
- **Organization & team-seat management** — create/rename/deactivate orgs, member roles, presence, "no leave only deactivate," seat ceiling. **Solid.**
- **Developer skills matrix + availability** — 0–10 across 8 categories, verify/endorse, capacity, auto-assign, planned absence; gamified Level/XP/Badges. **Solid** (gamification depth unverified).
- **Profile / notification-prefs / appearance** — **Solid** (some downstream effects — WhatsApp, compact mode — not wired).

### Marketplace
- **Opportunity authoring + invitations** — admin — create (weeks/complexity/expiry), invite specific devs with a message. **Solid** (one dead menu item).
- **Browse / apply / accept-decline** — dev — public browse, apply with cover, accept/decline invites with match %. **Solid.**
- **Competitive bidding** — dev submits bids; admin Shortlist→Accept/Reject. **Solid but orphaned from nav.**
- **Pre-commitment signaling** — dev marks Interested/Committed/Declined. **Solid (within the orphaned surface).**
- **AI redacted briefs** — strips client identity/price/URLs, keeps industry/scope/tech; cached 7 days; admin Generate/Regenerate. **Solid.**

### Money
- **Invoice generator + lifecycle** — admin — auto-numbered; draft→sent→paid (+void/overdue/payment-failed). **Solid.**
- **Stripe hosted-invoice send + client checkout** — **Solid** (undermined by the id-vs-token pay-link bug).
- **Copy Payment Link** — **Broken** (copies an id-based URL the public page can't resolve).
- **Payout workflow** — dev submits (wire details or email-invoice) → admin Approve/Reject → Mark-as-Paid (auto-creates a contractor expense). **Solid.**
- **Wire-detail "Copy All"** — per-field + all-at-once copy for the bank. **Solid.**
- **Expense tracker** — categorize, allocate, CSV export, inline edit. **Solid.**
- **Recurring expenses** — config captured but never materialized. **Rough.**
- **Retainer (billing) management** — create/pause/resume/cancel; "Generate Invoice Now" (manual, draft). **Rough** (no auto-billing).
- **Payment schedule / milestones** — read-only month view. **Rough** (can't create milestones here).
- **Finance overview + cash-flow projection** — **Solid** (display layer).
- **Financial reports** — all "Coming Soon." **Stub.**

### Comms & Knowledge
- **Multi-context messaging** — direct/project/workspace/partner/inquiry/suggestion threads; edit/delete/react/attach/@mention; read receipts; real-time. **Solid.**
- **AI meeting notetaker** — bot records → transcript → AI summary/decisions/action-items → tasks → Convert-to-Deliverable; CSV import/export. **Solid** (admin-gated; internal locked out of detail).
- **Blueprint library** — productized catalog with tiers, Loom, rich docs, draft/publish, DFY sell-shortcuts. **Solid** (edit path orphaned post-create).
- **Case-study manager** — Challenge/Solution/Results portfolio, blueprint cross-link. **Solid** (Loom captured-not-displayed).
- **Suggestion box** — submit (with screenshot) → admin triage + notes; submitter conversation thread. **Solid** but **bifurcated** (admin notes vs submitter chat never meet; admin-side thread feed orphaned; reply notification defined-but-never-fired).
- **Notification center + push** — ~40 types, grouped, popover + once-only toasts, deep-links. **Solid.**
- **Command palette** — cross-entity search + role quick-nav. **Solid.**
- **Team presence / PWA install / offline mode** — **Solid / Solid / Rough.**
- **Rich document editor** (mentions, inline comments/discussions, AI assist) powering proposals, project docs, blueprints, case studies. **Solid** as a capability (collaborative features scoped per surface).

### Admin / Ops
- **Role-routed home dashboards** — admin portfolio-health, dev my-work, DFY pipeline, client spectator. **Solid.**
- **Metrics/Analytics suite** — KPIs, funnel, pipeline, health/timeline, utilization, DFY leaderboard, CSV exports. **Solid** (Team-tab time-tracking shows zeros).
- **Blocker queue + triage** — lifecycle, priorities, 72h archive, threaded comments, DFY escalation (manual, single-step). **Solid.**
- **Developer directory / applications / Hexona team / DFY partners** — full rosters + invite/seat management. **Solid** (a few dead menu items; /10 vs /5 skill-scale inconsistency).
- **Activity log + export** — categorized audit trail with AI/diff/error/context capture; CSV/JSON/JSONL. **Solid** (filtering currently client-side).
- **Dev daily check-in** — overdue-driven modal (Made Progress / No Work / Blocked), hill deltas, 24h lock, snooze. **Solid.**
- **Pulse (productivity/OKR) + time tracking** — **Removed/Broken** (page "Coming soon," tables dropped, code remnants linger).

### AI
- **Intake Form Copilot** — auto-fills the inquiry form from conversation context. **Solid.**
- **Brief Generator** — redacted project briefs for external devs. **Solid.**
- **Deliverables Parser** — proposal text → structured line items. **Solid.**
- **Meeting Extraction** — transcript → summary/tasks/decisions/links. **Solid.**
- **Blueprint match score** — AI % match of inquiry → blueprint. **Rough** (computed/stored; light UI surfacing).

---

## 5. Object Model (in plain English)

Lifecycle states are given **as the UI implies them today**. Where the underlying data still carries dormant/legacy states no longer used by the UI, that's flagged. **★ = a real state machine / pipeline / kanban.**

### Pipeline objects
- **Inquiry / Submission** — an incoming deal from a DFY partner (or admin). It carries a lightweight legacy status (`new → processing → converted`) but is really driven by its **Proposal Stage ★**: **Unopened → Admin Reviewed → In Queue → Working → On Hold → Final Review → Ready → Sent → Closed / Lost.** Board-draggable. **DFY partners see a relabeled 3-state view**: Sent shows as "Ready," Closed as "Won," plus Lost. Auto-advances Unopened→Admin-Reviewed on first admin open.
- **Proposal** — the pitch living on an inquiry (three coexisting bodies: the auto **Document** brief, the official **Proposal**, and the DFY **My Version**). No separate enum beyond the inquiry stage + a "submitted" stamp.
- **Proposal Deliverable ★** — a negotiated line item. Two-level state: **negotiation status** (`none → parsing → dfy_editing → dfy_submitted → int_reviewing → approved/locked`, with a `needs_revision → dfy_editing` branch) and **per-line change status** (`original/edited/added/removed → approved/rejected/countered → counter_accepted/counter_rejected`). Final-approve requires every line resolved.
- **Blueprint ★(light)** — a productized service template (tiers, base price, hours, Loom, default deliverables, AI match score). Status: **Draft → Published** ("hidden" ↔ "visible to DFY partners").
- **Case Study ★(light)** — a portfolio piece (Challenge/Solution/Results, client, industry, optional blueprint link). Status: **Draft → Published.**

### Delivery objects
- **Project ★** — the central delivery unit, created from a won inquiry at **Deliverables Pending**. Phased status machine: **Sign-off** (Deliverables Pending → Awaiting Sign-off → Signed Off) → **Agreement** (Agreement Sent → Signed) → **Payment** (Payment Pending → Partial → Paid) → **Onboarding** (Collecting Access → Access Complete → Dev Assigned) → **Development** (In Progress → Blocked-Client/Blocked-Internal → Review Checkpoint → Revisions → Final QA) → **Delivery** (Delivered → Acceptance Pending → Accepted) → **Retainer**, with terminal **Completed / Cancelled / On Hold.** Backward moves "reset to the first status of an earlier phase." The list layer collapses everything into **Active / Retainer / Completed.** *(The old inquiry/proposal stages were deliberately removed from the project object — they now live only at the inquiry level.)*
- **Deliverable ★** — work within a project (parent → "Task" children). Status **Pending → In Progress → Blocked → Done**, plus a 0–100 **hill position** (Figuring-Out 0–49 / Making-It 50–89 / Done 90–100); reaching 90 opens testing; passing the three test stages locks it 90→95→100. Locks read-only after sign-off.
- **Requirement (onboarding) ★** — a client prerequisite in a tree. Status **Pending → In Progress → Submitted → Approved**, plus **Blocked.** Owner: **Hexona / DFY / Client.** Blocker severity: **None / Partial / Absolute** (absolute gates "Mark Onboarding Complete").
- **Onboarding Category / Question / Answer** — the structured intake form a client fills out, grouped into categories, optionally with Loom guidance.
- **Test Session ★** — a deliverable's QA pass across **Dev (Self-Testing) → Admin/Int (QA Review) → Client (UAT)**; each stage **Pending → In Progress → Passed / Failed / Escalated.**
- **Scope Change ★** — a baseline deviation. Request type (Clarification / New Scope / Reduction / Timeline) + trigger (client request / dev flag / deliverable modified-added-removed / hours-increased / timeline-extended) + hours/timeline/cost delta. Status **Pending Review → Approved / Rejected.** Compared to a one-per-project **Scope Baseline** captured at sign-off.
- **Blocker ★** — an impediment. **Reported (New) → Acknowledged → In Progress → Resolved → Closed**, priority Low/Medium/High/Critical, plus an orthogonal **Escalated-to-DFY** flag; resolved/closed >72h move to "Archived."
- **Delay** — Client Delay (extends timeline) vs Dev Delay (accountability), 1–7 days.
- **Extension Request ★** — **Pending → Approved / Rejected**; approval moves the project's target date.
- **Improvement ★(light)** — future-work idea. **Open → Converted** (to a project); priority Critical/Important/Nice-to-Have.
- **Payment Milestone** — a scheduled checkpoint (label, amount, due, paid-at); **Due → Overdue → Paid.**
- **Project Document + Versions** — a planning doc with full version history. **Project File** — an asset with internal/client visibility + folders.

### People / Org objects
- **Profile / User** — a person in one of five roles; carries onboarding gate, presence/last-seen, location, avatar/logo, notification + UI preferences. Auto-provisioned (default client) on first auth; **created → onboarding wizard → active.**
- **Organization** — a `dfy` or `dev` agency (solo/team/agency variants), slug, seat ceiling (default 3), soft-deactivatable.
- **Organization Member ★(light)** — Owner / Admin / Member; active ↔ deactivated (no "leave").
- **Invitation ★** — **Pending → Accepted**, with branches to **Revoked / Expired** (7-day) and, for dev applications, a leading **Pending Approval → Pending (approved) / Rejected.** Acceptance side-effects vary by type (creates an org, adds a membership, or just sets a role).
- **Dev Application** — a specialization of Invitation (the public apply form): **Awaiting Approval → Approved (Awaiting signup) → Joined**, or **Rejected.**
- **Dev Skill** — proficiency **0–10** (named levels), self-rated → admin-verified/adjusted, endorsement count. **Dev Check-in** — type Progress/No-Work/Delay, one per dev/project/day, **locks 24h after creation.**
- **Passkey Credential** — a registered WebAuthn device.

### Money objects
- **Invoice ★** — a client bill. **Draft → Sent → Paid**, plus **Overdue / Void (terminal) / Payment Failed.** Editable only while Draft; numbered `INV-YYYY-NNNN`.
- **Payout ★** — money owed to a dev. UI uses **Pending → Approved → Paid** (+ **Rejected**), payment method wire-transfer or emailed-invoice. *(A dormant 11-state "Mercury" enum — invoice_required → invoice_uploaded → revision_needed → verified → processing → completed/failed — survives in data but the product collapsed to the 4 states.)*
- **Expense** — a cost (Direct/Contractor/Tools-Ops/Other; bank/card/debit source); optional recurring config; auto-created (as "contractor") when a payout is paid.
- **Retainer ★** — an ongoing engagement. **Active → Paused → Active**, → **Cancelled (terminal)**; cadence weekly/biweekly/monthly/quarterly/yearly; carries next-invoice-date + billing day. *(Note: this billing "retainer" is distinct from the project-service "retainer" — check-ins/tasks/health — surfaced inside Projects.)*

### Comms / System objects
- **Conversation** — a thread typed project/workspace/partner/direct/inquiry/suggestion; auto-provisioned per parent object.
- **Message ★(light)** — active → edited → soft-deleted; carries attachments/reactions/mentions/read-status.
- **Meeting ★** — a recorded call. **Pending → Joining → Recording → Processing → Ready**, or **Failed.** Bot-driven, linkable to a project/inquiry.
- **Meeting Task ★** — an action item, origin AI-extracted/manual/imported. **Pending → In Progress → Done**, promotable to a Deliverable.
- **Suggestion ★(light)** — **New → Reviewed → Implemented / Declined**; carries private admin notes + an auto-created conversation.
- **Notification** — ~40 types; **Unread → Read**, plus a "shown-as-toast" dedup flag; grouped Today/Yesterday/Earlier.
- **Activity Log** — append-only audit entry (auth/CRUD/status/AI/file/payment/conversation/error).
- **Push Subscription** — a device endpoint; auto-pruned when dead.
- **AI Brief Extraction** — a cached, redacted brief (7-day expiry + input-hash staleness).

### Removed (data dropped, remnants linger)
- **Pulse** (focus tracking, weekly/quarterly reviews, yearly-goal → quarterly-target → action → daily-task, points/streaks) and **Time Tracking** (time entries, active timers) — both fully removed.

---

## 6. Automations & Integrations

*Described by outcome, not mechanism.*

### ⚠ The headline finding: the automation scheduler is not wired
All four scheduled jobs are fully built and secret-protected, but **nothing actually triggers them** (no scheduler is configured). In production they simply never run:
- **Overdue Check-in Reminder** — *intended* to nudge retainer devs + admins when a check-in cadence lapses.
- **Deadline Reminder** — *intended* to alert assigned devs + admins about deliverables due within 3 days.
- **Proposal Expiry Nudge** — *intended* to prod DFY partners (and alert admins) about proposals sitting "Sent" for 14+ days.
- **Testing Escalation Check** — *intended* to catch client-stage tests stuck 7+ days — and even when run, it only **flags eligibility; it escalates/notifies nothing.**

So every "time-based" behavior the product implies (stale-proposal follow-up cadence, deadline reminders, overdue check-ins, test escalation) is currently inert until a scheduler is added.

### Event-triggered (these DO fire, on user actions)
- **@mention → notification** (the one true automatic trigger) — mentioning someone in any message creates a "{actor} mentioned you" notification (real-time + push).
- **Notification fan-out → Web Push** — every in-app notification also pushes to the recipient's registered devices; ~40 event types span the whole lifecycle (inquiry won/lost, proposal sent/ready, project created/completed/moved-to-retainer, deliverable status, sign-off, stage/assignment changes, blocker raised/escalated, scope change flagged/approved/rejected, invoice sent/paid/payment-failed, all six testing states, suggestion status/reply, meeting ready/scheduled, check-in submitted, requirement unblocked, retainer events).
- **Inquiry auto-advance** — first admin open bumps Unopened → Admin Reviewed.
- **Sign-off → scope baseline snapshot**, and **post-sign-off deliverable edits → auto-logged scope change.**
- **Test pass → hill-position auto-lock** (90/95/100); **test fail → optional linked blocker.**
- **Extension approved → project target date moves**; **client delay → delivery estimate shifts.**
- **Dev assignment → dev's task queue auto-populates** with the project's deliverables + a "project assigned" notification.
- **Stale-proposal snooze cap (3) → auto-escalation to admin.**
- **New bid → admins notified**; **blocker status/comment → reporter notified.**
- **Auto-provisioned conversation rooms** per project (three, by visibility tier), per suggestion, per inquiry.
- **Real-time live updates** (no refresh): notifications/badge, messages, the inquiry board, requirements, hill chart, meeting status, presence/last-seen.
- **Client error capture** — uncaught front-end errors are logged with browser/OS/page context (non-blocking; no external alerting — someone must look at the log).

### Webhook-triggered (external → HexOS)
- **Stripe** — `checkout/invoice paid` → marks the invoice **Paid** (and the linked milestone), notifies client + DFY + admins; `payment_failed` → flips to **Payment Failed** and alerts admins.
- **Recall (meeting bot)** — drives the meeting through Joining → Recording → Processing → Ready, then **runs AI extraction inline** (summary, action-item tasks, key decisions, suggested project links) and fires a "Meeting Notes Ready" notification; marks Failed on fatal error.

### Integrations (product-level health)
- **Stripe** (invoicing, hosted client checkout, payment-status sync) — **Solid.** USD-only.
- **Recall.ai** (meeting bot: Zoom/Meet/Teams record + transcribe) — **Solid** (transcript processing runs inline — long-meeting timeout risk).
- **AI assistant — single Claude model via OpenRouter** — **Solid**, but a single-model/no-fallback concentration risk: one outage takes down all AI features.
- **Web Push (PWA)** — **Solid.** Fires on every notification; auto-prunes dead devices.
- **Resend (transactional email)** — **Solid but thin** (only 4 templates; see below).
- **Vercel Analytics** — **Solid but minimal** (traffic/web-vitals only; no product/funnel analytics).
- **Loom** (video embeds on blueprints/case studies/onboarding) — **Solid, lightweight** (URL validate + embed; *but case-study Loom is captured-not-displayed*).
- **Offline store + sync queue (PWA/IndexedDB)** — **Rough/narrow.** Caches projects/conversations/notifications/small files; only a handful of mutation types replay on reconnect (two of which are now-dead Pulse ops); last-write-wins.
- **First-party error/audit log** — **Solid**, but **no external alerting** (Sentry/Datadog absent).
- **Stub/broken** — the per-project **expenses API returns an empty stub**; a couple of internal debug endpoints ship without auth gates.

### AI features (all on one Claude model, no fallback)
1. **Intake Form Copilot** — reads a sales conversation and auto-fills the inquiry form, asking one short follow-up for missing fields. **Wired.**
2. **Brief Generator** — produces a **redacted** project brief (strips client name/price/contacts/URLs; keeps industry/scope/tech/complexity/duration/deliverables) so the agency can share opportunity context with external devs. Cached 7 days. **Wired.**
3. **Deliverables Parser** — turns free-text proposal content into structured, priced line items. **Wired.**
4. **Meeting Extraction** — transcript → summary + action-item tasks (assignee-name-matched) + key decisions + suggested links. **Wired.**
5. **Blueprint match score** — an AI % match of an inquiry to a blueprint (seed shows 85%). **Present in the data; lightly surfaced.**

### Email catalog (Resend) — 4 wired, 1 orphaned
1. **Invitation** ("You've been invited to join hexOS / {org}") — on any invite flow.
2. **Dev Application Received** — on public-form submit.
3. **Dev Application Approved** — on admin approve (carries an invite link).
4. **Dev Application Rejected** — on admin reject.
5. **Password Reset** — a fully-designed template that is **never sent** (reset is handled natively by auth). Orphaned.

*Everything else clients would expect by email (proposal sent, milestones, retainer check-ins) exists only as in-app/push notifications. Invoice/receipt emails are sent by Stripe itself, not by HexOS.*

### What the seed/fixtures reveal
- **The business:** an AI-automation agency, **Hexona**, owners **Ayman & Hamza**. The seeded **Blueprint catalog is the product menu**, priced **$800–$2,500** and grouped "Popular / Highest ROI" vs "Secondary": *Instagram DM AI Agent, MCTB + Voice AI (Missed-Call-Text-Back), Speed-to-Lead AI Agent, AEO (AI SEO), Database Reactivation, Digital Loyalty System, AI Website Chat Widget,* plus *Reputation & Review Domination, Lead Nurture Sequence, Email Auto-Responder, AI Appointment Reminders & No-Show Recovery, B2B Email System.* The dev-skills taxonomy names the real tools: **Zapier, Airtable, HubSpot, Manychat, GHL (GoHighLevel).**
- **The operating model** is the five-role value chain, with test accounts for each (`dev@/dfy@/client@/internal@test.hexos`): DFY brings the client → internal/admin qualifies & matches → dev builds → client signs off.
- **The intended end-to-end workflow** is modeled in one sample project ("Acme CRM Dashboard," client "John Smith / Acme Corp"): type Blueprint+Custom, mode Hexona-Devs+DFY, **20% DFY commission**, assigned dev, **50/50 payment**, **85% blueprint match**, **$4,500 quote vs $2,000 dev cost**, a realistic deliverable list, two payment milestones (deposit paid / final pending), and — tellingly — a **priced scope change** ("Client requested Slack integration… +$500, approved"). The seed deliberately demonstrates margin tracking (quote vs dev-cost vs commission) and scope-add-as-revenue as central workflows.

---

## 7. Salvage Verdict

The synthesis. v2's *feature decisions* were genuinely good and unusually complete for an agency this size; what killed it was breadth — too many flagship subsystems each left at ~80%, plus a few built-then-removed, plus an automation backbone that never actually runs.

### 7a. Features that map to the v3 pillars

**ONBOARDING (intake, gates, client links)**
- **The client project-intake engine** — the real prize. Structured **Categories → Questions → Answers**, an **owner-typed (Hexona/DFY/Client) + blocker-typed (None/Partial/Absolute) requirement tree**, an admin **"Preview as client"** toggle, a **"Mark Onboarding Complete" gate** that's blocked until required items are answered and absolute blockers clear, and the post-onboarding relabel to an ongoing "Questions" Q&A channel. *(This is the "onboarding" the v3 pillar means — not the first-login account wizard.)*
- **Hierarchical, reusable requirement templates** (selecting a template drops in a whole subtree).
- **The first-login account wizard** — a deliberately minimal, hard-gated 2-field setup worth comparing against the v3 rebuild for its restraint.
- **The unified 6-type invitation system** (Hexona team / agency founder / agency teammate / solo dev / dev teammate, + dev application as the same object) with token/expiry/dedup/seat semantics and robust edge-case handling (expired-but-pending, seat-at-accept, email-mismatch, OAuth auto-accept).
- **Passkey auth** end-to-end. **Client links** today = the tokenized public proposal/pay links (no-login, white-labeled).

**DELIVERY (project lifecycle, phases, build status, ops pane)**
- **The phase-driven project detail** with its tab strip that shows/hides by phase, and the **explicit ordered status machine** with one "primary next step" + guarded backward moves.
- **Deliverables + hill-chart progress** as the single source of truth for "where is this."
- **Three-stage gated testing (Self → QA → Client UAT) coupled to hill position** (90/95/100 locks), with AI-or-manual checklists and failure→blocker linkage — a genuinely clever progress/quality coupling.
- **Scope-change monitoring** (baseline at sign-off → auto-logged post-sign-off edits → approve/reject with hours/timeline/cost deltas) — the agency guardrail against silent scope creep. *Already built despite the docs saying otherwise.*
- **Delay tracking (client vs dev) + extension breakdowns** — politically smart accountability that feeds the delivery estimate.
- **Deliverable sign-off flow** (admin confirm → DFY confirm "on behalf of client" → lock + baseline).
- **Files with Internal/Client visibility + version history**, **per-project activity timeline**, **blocker reporting**, **dev daily check-ins** (Made Progress / No Work / Blocked with hill deltas), and **Improvements → new-project** upsell capture. The **Close → Complete vs Move-to-Retainer** lifecycle.

**PIPELINE (inquiry/proposal tracking, follow-up)**
- **The branching intake wizard + AI Form Copilot** and **blueprint/case-study selection with tier picking** feeding the deal.
- **The ten-stage proposal kanban** with **role-relabeled stages** (DFY sees a clean 3-state Ready→Won/Lost over the admin's 10) and live board sync.
- **AI deliverable extraction → multi-round line-item negotiation** (counter/accept/reject, per-line status, diffs, append-only history) — the most thought-through machine in v2.
- **The DFY "My Version" private proposal copy** and the **white-label public proposal link + PDF.**
- **The stale-proposal follow-up loop** (Won/Lost/Snooze-x3/Escalate, auto-escalate at cap) — a self-driving accountability mechanism (just needs the scheduler to actually fire it).
- **Convert-to-Project (Initiate)** and **Create-Opportunity-from-inquiry** as the two hand-offs out of pipeline.

**Cross-pillar platform pieces worth keeping in view:** the **AI Meeting Notetaker → action items → Convert-to-Deliverable** loop (the standout differentiated feature), the **developer marketplace** (invite + apply + bid + pre-commit + AI redacted briefs), the **notification + push + realtime** stack, the **command palette**, the **activity-log/audit trail**, the **blocker triage queue**, and the **Stripe billing + payout** core.

### 7b. Good decisions to carry forward verbatim
- **Role-relabeled views over one shared object** (DFY sees Ready/Won/Lost; the catalog reframes "curate" vs "browse to sell"; the same project page filters by role+phase). Clean internal/external separation done once.
- **Deliverables as the single source of truth** — pricing, sign-off baseline, hill progress, and testing all hang off the same structured list.
- **The progress↔quality coupling** (hill position drives the testing gate, which locks the position) — keep this exact mechanic.
- **Scope baseline captured automatically at sign-off + post-sign-off edits auto-logged as priced scope changes.** This is the agency's anti-scope-creep moat.
- **Client-delay vs dev-delay** as distinct, timeline-affecting vs accountability-only — and the **extension breakdown** that separates "client-caused" from "additional" days.
- **Owner + blocker typing on onboarding requirements** with a gate that blocks completion on absolute blockers.
- **Unified invitation object** spanning every join path, with the dev application expressed as the same object.
- **Hold-to-confirm buttons** on irreversible actions; **white-labeling stripped unconditionally** from all client-facing output.
- **Payout "Copy All" wire details** and **payout-paid → auto-expense** (record money-out once, correctly categorized).
- **Tokenized, login-free, status-aware public links** for proposal and payment.
- **Notification dedup** (each alert toasts once, across tabs/refreshes) and the **@mention auto-trigger.**

### 7c. "You'll want this later" (built for a real reason; v3 just hasn't hit it yet)
- **Developer marketplace** (invitations + open applications + competitive bidding + pre-commitment + **AI redacted briefs**) — strong, mostly-complete; needs nav wiring and an apply-vs-bid decision before it's load-bearing.
- **AI Meeting Notetaker** — high-value and near-product-quality; the action-item→deliverable bridge is the differentiator.
- **The Metrics/Analytics cockpit** — the right business KPIs/funnel/utilization once there's data volume (drop the dead time-tracking widgets).
- **Activity Log / audit trail** with AI-prompt capture and multi-format export — reusable observability.
- **Command palette** and **sidebar hover-card drill-downs** — keep nearly as-is.
- **Finance depth as specs, not features:** payment-structure presets + milestone schedule, recurring expenses, DFY invoice visibility, and the four-report suite (P&L/Aging/Revenue-by-client/Expense-breakdown) are the right shape — finish them when volume justifies.
- **Richer dev-assignment** (the invitation/accept model under the simple inline assign), **custom payment milestones** (currently only in the orphaned convert modal), and **tiered proposal-reminder thresholds** (35/49-day constants already defined).
- **Per-suggestion conversation threads** — good pattern once unified with the admin side.
- **Improvements → project** upsell pipeline and the **retainer (service) check-ins/tasks/health** post-delivery lifecycle.
- **Passkeys**, **PWA install/offline**, and **WhatsApp/email notification channels** (the preference toggles already exist as placeholders).

### 7d. Things to deliberately NOT rebuild (overbuilt, redundant, or the likely collapse cause)
- **Pulse** — a full gamified personal-OKR/productivity system (yearly goals → quarterly targets → daily tasks with rollover, focus tracking, weekly + quarterly reviews, points/streaks). **Built, then removed at the database level**, leaving a "Coming soon" page plus a code/link graveyard. If it returns, start fresh and far simpler. This is exhibit A of the over-build.
- **Time tracking** (timers, time entries) — removed alongside Pulse; its corpse still shows as zeroes in the Metrics "Team" tab. Don't resurrect; if ever needed, rebuild minimal and focused.
- **The 11-state "Mercury" payout machine** — the product correctly collapsed to Pending/Approved/Paid/Rejected. Don't carry the dead enum.
- **Retainer "auto-bill on a schedule" as currently implied** — there's no scheduler; "Generate Invoice Now" (manual, draft) is fine for now. Either build it properly later or stop the empty-state from promising automation. Same for **recurring expenses** (config with no engine).
- **Duplicate/orphaned screens** — pick one and delete the rest: the **modal Convert-to-Project** vs the live Initiate wizard; the **full Blueprint edit form** vs inline section editors; the **Gameplan tab** vs Files; the **simple Onboarding tab** vs the bento grid; the **two near-identical suggestion submit dialogs**; the **admin proposal-update panel** that's mounted nowhere.
- **The legacy inquiry `status` field** (new/processing/converted) — redundant with the proposal-stage pipeline. One status system, not two.
- **Half-wired action surfaces** — the invoice **detail page's** Send/Reminder/Mark-Paid buttons (the list page already does this); **"Send Reminder"** everywhere (works nowhere); the dead **"View Applications" / "View Details" / "Edit Settings"** menu items; the dead **desktop "New Message"** button and **`/conversations/[id]`** deep-links; the **orphaned password-reset email** and **tutorial-replay card**; the **production "Quick login" test panel.**
- **The split-brain suggestion loop** (admin private notes vs submitter chat thread that never meet, with a reply notification that never fires) — unify into one thread before extending.

**Root-cause read for v3:** the collapse wasn't bad features — it was (1) an **automation backbone that was built but never scheduled**, so the platform *looked* automated while quietly doing nothing on a timer; (2) **flagship subsystems left at ~80%** (Finances especially — a CFO-grade hub where only the invoice→pay→payout core actually works); (3) **build-then-remove churn** (Pulse, time tracking) that left graveyards; and (4) **orphan/duplicate accumulation** (a dozen unreachable or doubled screens). v3's pillar-by-pillar discipline is the right antidote: take the strong, opinionated mechanics above — verbatim where noted — and refuse the breadth that buried them.

---

*Map compiled from a full sweep of routes/pages, navigation, components, API surface, seed/fixture data, and in-app copy. Where purpose was inferred from an unfinished feature it is marked "appears intended to…". Completeness reflects product state only.*
