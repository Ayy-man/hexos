# Features

## Custom Components Available

| Component | Status | Use In |
|-----------|--------|--------|
| Action Searchbar | ✅ Integrated | Global ⌘K command palette |
| File Tree | Ready | Deliverables hierarchy, project structure |
| Kanban Board | ✅ Integrated | Pipeline view (inquiries board) |
| Location Tag | ✅ Integrated | User profiles, team views, conversations |

### Location Tag Component

Shows user's location with live local time on hover. Integrated with profile settings.

**Files:**
- `components/ui/location-tag.tsx` - Base component
- `components/profile-location-tag.tsx` - Wrapper using profile data
- `features/settings/components/LocationSettings.tsx` - Settings UI
- `supabase/migrations/20260108000003_profile_location_fields.sql` - DB fields

**Usage:**
```tsx
// With profile data
import { ProfileLocationTag } from '@/components/profile-location-tag'
<ProfileLocationTag profile={user} />

// Direct usage
import { LocationTag } from '@/components/ui/location-tag'
<LocationTag city="Lahore" country="Pakistan" timezone="PKT" />
```

See `components.md` for details.

## MVP Scope (Current Phase)

### Phase 1: Foundation (Complete)

- [x] Project setup (Next.js 16 + shadcn/ui Vega preset)
- [x] Supabase project created + client configured
- [x] Vercel deployment connected
- [x] MCP integrations (Supabase + Vercel)
- [x] Initial database migration
- [x] Auth flow (login/logout)
- [x] Basic route structure
- [x] Test accounts (admin, dev, dfy, client)
- [x] Dark mode support (system/light/dark toggle)

### Phase 2: Core Data

- [x] Projects CRUD
- [x] Deliverables CRUD (add/edit/delete/status change)
- [x] Status management (22 statuses, 7 phases)
- [x] Activity logging

### Phase 3: Dashboards

- [x] Admin dashboard (all projects, financials)
- [x] Dev dashboard (assigned projects, deliverables)
- [x] DFY dashboard (deals, commissions)
- [x] Client dashboard (project progress)
- [x] Sidebar layout with role-based navigation
- [x] Project detail view with tabs (Overview, Deliverables, Requirements, Files, Activity)
- [x] Deliverables CRUD in project detail
- [x] Status transitions (22 statuses via ProjectStatusControl)
- [x] Phase stepper showing project progress (7 phases)
- [ ] Deliverables list + Gantt view
- [x] **Project list stage progress bar** - Visual progress bar based on phase (14-100%) + deliverables when in development

### Phase 4: Inquiry Flow (Complete)

See `inquiry-form.md` for full specification.

- [x] Database: inquiries table + RLS policies
- [x] Blueprints seed data (12 solutions in 2 categories)
- [x] Multi-step form with conditional branching
  - [x] Branch A: Closed deals (A1, A2, A3)
  - [x] Branch B: Proposal requests (B1, B2, B3)
- [x] AI Copilot sidebar (toggleable)
  - [x] Chat interface with Claude 3.5 Haiku via OpenRouter
  - [x] Tool calling for form field population (set_form_field)
  - [x] Only visible on step 3 (detail form page)
  - [x] Smart inference (referral → warm_referral, $X → specific_number, etc.)
  - [x] Follow-up questions for unfilled required fields
  - [x] Token usage tracking displayed in sidebar header
  - [x] Field flash animation (cyan glow when AI fills a field)
  - [x] Compact response format (2-3 lines max)
- [x] CustomProposal form redesign (Path B3)
  - [x] Card-based sections with icons for visual hierarchy
  - [x] OptionCard components for important choices (Build Preference, Problem Importance, Project Tier)
  - [x] InlineRadioGroup (pill buttons) for simple choices (Budget, Urgency, Engagement)
  - [x] Pill toggles for multi-select (Departments, Support Level)
  - [x] Grid layouts for related questions (2-3 columns)
  - [x] All components have `data-field` attributes for AI Copilot flash animation
- [ ] Inquiry → Project conversion (closed deals)
- [x] Inquiries list page (admin/internal see all, dfy sees own)
- [x] Inquiry detail page (/inquiries/[id])
  - [x] Overview tab (form data display)
  - [x] Document tab (Plate.js rich text editor)
- [x] Document editor (Plate.js)
  - [x] Rich text editing (headings, bold, italic, blockquote)
  - [x] Auto-save with 1.5s debounce
  - [x] document_content JSONB column on inquiries
  - [x] Inline comments (CommentKit plugin)
  - [x] Suggestion/track-changes mode (SuggestionKit plugin)
  - [x] Block-level discussions (DiscussionKit plugin)
  - [x] Fullscreen document view (side-by-side with comments)
  - [x] Inline discussions persisted to database
- [x] Comments/annotations system
  - [x] inquiry_comments table with RLS
  - [x] Thread support (replies)
  - [x] Resolve/unresolve comments
  - [x] Role-based access (admin/internal can edit, dfy can view own)

### Phase 4.5: Blueprints Catalog (Complete)

- [x] Database: Extended blueprints table
  - [x] content (JSONB) - Rich text content
  - [x] pricing_tiers (JSONB) - Structured tier pricing
  - [x] tags (TEXT[]) - Free-form filtering tags
  - [x] status (draft/published)
  - [x] icon (emoji)
- [x] Blueprint editor (Plate.js)
  - [x] Basic blocks (headings, paragraphs, blockquotes)
  - [x] Lists (bulleted, numbered via indent system)
  - [x] Links
  - [x] Code blocks (syntax highlighting ready)
  - [x] Callout blocks (info, warning, error, tip variants)
  - [x] Auto-save with debounce
  - [x] Fixed toolbar header in edit mode
  - [x] Fullscreen editing mode
- [x] Blueprint pages
  - [x] /blueprints - List with search, tag filters, status filters
  - [x] /blueprints/[id] - Detail view with viewer/editor modes
  - [x] /blueprints/new - Create page (admin only)
- [x] Role-based access
  - [x] Admin/Internal: Full CRUD, see drafts
  - [x] DFY: View published only, quick actions
- [x] Admin actions
  - [x] Edit mode toggle
  - [x] Duplicate blueprint (creates copy as draft)
  - [x] Delete blueprint (with confirmation)
- [x] DFY action buttons
  - [x] "Closed Deal" → Creates closed-deal inquiry
  - [x] "Request Proposal" → Creates proposal inquiry
- [x] UX enhancements
  - [x] Full emoji picker (Frimousse) for icons
  - [x] Fullscreen document view with Esc to close
- [x] Navigation: Blueprints in sidebar for admin, internal, DFY

### Phase 4.55: Case Studies Catalog (Complete)

- [x] Database: case_studies table
  - [x] name, description, icon (emoji)
  - [x] client_name, industry (meta fields)
  - [x] challenge, solution, results (text)
  - [x] content (JSONB) - Rich text content
  - [x] tags (TEXT[]) - Free-form filtering tags
  - [x] status (draft/published)
  - [x] blueprint_id (FK) - Optional link to blueprint
  - [x] RLS: Admin/Internal full CRUD, DFY view published
- [x] Case Study editor (Plate.js)
  - [x] Same editor kit as blueprints
  - [x] Auto-save with debounce
  - [x] Fullscreen editing mode
- [x] Case Study pages
  - [x] /case-studies - List with search, tag filters, status filters
  - [x] /case-studies/[id] - Detail view with Challenge/Solution/Results cards
  - [x] /case-studies/new - Create page (admin only)
- [x] Role-based access
  - [x] Admin/Internal: Full CRUD, see drafts
  - [x] DFY: View published only
- [x] Admin actions
  - [x] Edit mode toggle
  - [x] Duplicate case study (creates copy as draft)
  - [x] Delete case study (with confirmation)
- [x] Features
  - [x] "View Related Blueprint" link (if linked)
  - [x] Full emoji picker for icons
  - [x] Fullscreen document view
- [x] Navigation: Case Studies in sidebar for admin, internal, DFY

### Phase 4.6: Enhanced Proposal Flow (Complete)

ClickUp-style inquiry management with pipeline views.

- [x] Database: New proposal stage workflow
  - [x] proposal_stage enum: unopened → admin_reviewed → in_queue → working → on_hold → final_review → ready → sent → closed → lost
  - [x] priority field (low, normal, high, urgent)
  - [x] due_date, estimated_value, assigned_to columns
  - [x] stage_history JSONB tracking
  - [x] public_token for client view links (P1)
- [x] API layer updates
  - [x] updateInquiryStage() with history tracking
  - [x] updateInquiryPriority()
  - [x] updateInquiryDueDate()
  - [x] assignInquiry()
  - [x] bulkUpdateInquiryStage()
  - [x] getInquiryByPublicToken() (P1)
- [x] Server actions for all updates
- [x] InquiryTableView (grouped table)
  - [x] Collapsible sections by stage
  - [x] Columns: Name, DFY, Due Date, Priority, Value, Created
  - [x] Dropdown menu to move between stages
  - [x] Stage count badges
- [x] InquiryBoardView (kanban board)
  - [x] @dnd-kit based drag-and-drop between columns
  - [x] Cards: company, priority, value, partner, due date
  - [x] Color-coded column headers (7 stages)
  - [x] Drag overlay preview
  - [x] Reusable Kanban component (`components/ui/sortable.tsx`)
- [x] InquiryTableView (grouped table)
  - [x] HTML5 native drag to stage headers
  - [x] Dropdown menu for stage changes
- [x] View toggle (Table | Board tabs)
- [x] Stats cards showing stage counts
- [x] StageBadge component with color coding
- [x] PriorityBadge component with flag icon
- [x] Toast notifications (sonner)
  - [x] Success toast on stage change
  - [x] Error toast with details on failure
  - [x] Toaster added to dashboard layout
- [x] Optimistic updates
  - [x] UI updates immediately while server processes
  - [x] Automatic revert on error
- [x] StageHistoryTimeline component
  - [x] Shows proposal progress in inquiry detail sidebar
  - [x] Chronological timeline of stage changes
  - [x] Visual progress bar (Pending → Agreed)
  - [x] Visible to all users including DFY partners
- [x] Timeline UI component (`components/ui/timeline.tsx`)
  - [x] Vertical/horizontal orientation
  - [x] Status icons (completed/active/pending/error)
  - [x] Timestamp formatting
  - [x] Custom content support

### Phase 4.7: Proposal + My Version Tabs (Complete)

Admin-to-DFY proposal workflow with private DFY workspace.

- [x] Database: Proposal columns
  - [x] proposal_content (JSONB) - Rich text proposal
  - [x] proposal_submitted_at, proposal_submitted_by - Submission tracking
  - [x] dfy_version_content (JSONB) - DFY private copy
  - [x] proposal_discussions (JSONB) - Inline discussions
  - [x] 'proposal' comment_type for sidebar comments
  - [x] RLS policies for proposal comments (DFY access after submission)
- [x] Proposal Tab
  - [x] Admin: Full edit access, Plate.js editor with auto-save
  - [x] DFY: Read-only view after proposal submitted
  - [x] "Submit for Review" button → moves to `final_review` stage (hold 2 seconds)
  - [x] "Approve" button → moves from `final_review` to `ready` stage (hold 2 seconds)
  - [x] "Submit to Partner" button → moves to `sent` stage (only in `ready` stage, hold 2 seconds)
  - [x] "Undo Send" button for admins (hold 2 seconds)
  - [x] Two-way comments (admin + DFY can comment after submission)
  - [x] Comments sidebar with threads, resolve/unresolve
  - [x] "Not Yet Available" placeholder for DFY before submission
- [x] My Version Tab (DFY only)
  - [x] Private workspace - admins cannot see
  - [x] Privacy disclaimer banner
  - [x] "Copy from Proposal" button with confirmation
  - [x] Full Plate.js editor with auto-save
  - [x] Available only after proposal is submitted
- [x] Auto-advance stage
  - [x] Inquiry moves from "unopened" to "admin_reviewed" on first admin view
- [x] Auto-transition to "sent" stage
  - [x] Proposal stage auto-transitions to "sent" when submitted to DFY
  - [x] Role-aware labels: Admin sees "SENT", DFY sees "READY"
  - [x] Undo send reverts stage back to "ready"
- [x] Tab visibility matrix
  - [x] Overview: Admin (edit), DFY owner (view)
  - [x] Document: Admin (edit), DFY owner (edit)
  - [x] Proposal: Admin (edit always), DFY owner (view after submit)
  - [x] My Version: DFY owner only (admin cannot access)
- [x] Independent tab scrolling (each tab scrolls independently)

**P1 Features:**
- [x] Public proposal link (client view at /p/[token])
- [x] PDF export (@react-pdf/renderer with Plate.js conversion)
- [x] DFY logo upload (settings page, appears on PDF exports)
- [ ] Email notifications on stage change
- [ ] DFY quick edit on proposal

**P2 Features (Planned):**
- [ ] Blueprint → template auto-fill
- [ ] Inquiry attachments
- [ ] AI proposal writer extensions

### Phase 4.8: Deliverables Negotiation System (Complete)

Two-entry system for managing deliverables between DFY partners and Internal team.

**Entry A (Pre-Close):** DFY suggests changes to proposal deliverables
```
Proposal submitted → DFY clicks "Suggest Changes" → AI parses deliverables
→ DFY edits table → Submits → INT reviews → Accept/Reject/Counter loop → Approved
```

**Entry B (Post-Close):** Convert approved inquiry to project
```
DFY clicks "Mark as Closed" → INT clicks "Convert to Project"
→ Confirm deliverables → Add onboarding requirements → Project created
→ Inquiry auto-moves to "closed" stage
```

**Pipeline Stages:**
- `closed` - Deal won, converted to project
- `lost` - Deal lost, no conversion
- Admin can reopen closed/lost inquiries via hold-to-confirm button

**Multi-Round Negotiation Flow:**
```
DFY edits → Submits → Admin reviews each item:
  - Approve → Item approved
  - Reject → Item rejected
  - Counter (name/desc/price) → DFY responds:
    - Accept Counter → Values applied, item marked counter_accepted
    - Reject Counter → Item needs re-review (counter_rejected)
    - Edit Again → DFY makes new edits, resubmits
→ All items resolved → Admin clicks "Final Approve" → Deliverables locked
```

- [x] Database: New tables
  - [x] proposal_deliverables - Negotiated deliverables linked to inquiry
  - [x] proposal_deliverable_comments - Per-deliverable discussion
  - [x] proposal_deliverable_history - Version history with audit trail
  - [x] project_requirements - Onboarding checklist items
- [x] Database: Inquiry modifications
  - [x] deliverables_status enum (none, parsing, dfy_editing, dfy_submitted, int_reviewing, approved, needs_revision)
  - [x] closed_at, closed_by, closed_notes, client_email columns
- [x] Database: Deliverables columns
  - [x] counter_name, counter_description, counter_price, counter_note
  - [x] change_status includes: counter_accepted, counter_rejected
  - [x] Auto-reset to 'edited' when DFY modifies approved/rejected items
- [x] Database: Project modification
  - [x] source_inquiry_id column linking project to source inquiry
- [x] API Layer
  - [x] lib/api/proposal-deliverables.ts - Deliverables CRUD + counter response
  - [x] lib/api/project-requirements.ts - Requirements CRUD
  - [x] Inquiry conversion functions (markAsClosed, convertToProject)
  - [x] acceptCounter(), rejectCounter() - DFY counter response
  - [x] insertHistory() helper - Version tracking (uses same auth client)
  - [x] getDeliverableHistory() - Fetch version history
- [x] AI Parser
  - [x] Direct OpenRouter call from server action (Claude Haiku)
  - [x] Plate.js to plain text converter
- [x] Deliverables Components
  - [x] DeliverablesTab.tsx - Main orchestrator
  - [x] DeliverablesTable.tsx - Editable table with diff display
  - [x] DeliverableRow.tsx - Single row with inline editing + history
  - [x] DeliverableDiff.tsx - Strikethrough/highlight diff + counter values
  - [x] DeliverableStatusBadge.tsx - All statuses including counter_accepted/rejected
  - [x] CounterOfferDialog.tsx - Admin counter with name/desc/price fields
  - [x] CounterResponseCard.tsx - DFY accept/reject/edit counter UI
  - [x] DeliverableHistory.tsx - Expandable version timeline (v1, v2, v3...)
  - [x] AddDeliverableModal.tsx - Modal: blueprint tier OR custom
  - [x] BlueprintTierSelector.tsx - Blueprint → tier picker
- [x] Server Actions
  - [x] deliverableActions.ts - All deliverable CRUD + review + counter actions
  - [x] conversionActions.ts - Close deal + convert to project
- [x] Conversion Components
  - [x] MarkAsClosedButton.tsx - DFY action with hold-to-confirm
  - [x] ConvertToProjectButton.tsx - INT action trigger
  - [x] ConvertToProjectWizard.tsx - 3-step wizard
  - [x] Step1Deliverables.tsx - Confirm deliverables
  - [x] Step2Requirements.tsx - Onboarding checklist builder
  - [x] Step3Review.tsx - Review & create
- [x] RLS Policies
  - [x] DFY can update own inquiries (for dfy_version_content)
  - [x] Proposal deliverables access policies
  - [x] Proposal deliverable history access policies
  - [x] Project requirements access policies
- [x] Pipeline Stages
  - [x] Added 'closed' and 'lost' stages to proposal_stage enum
  - [x] Auto-transition to 'closed' on project conversion
  - [x] ReopenInquiryButton for admin (hold-to-confirm)

### Phase 4.9: Post-Close Project Management (Complete)

After inquiry converts to project, manage it through to delivery.

**Auto-Import Deliverables on Conversion:**
When admin clicks "Convert to Project", the system automatically:
1. If `proposal_deliverables` exist → use those ✅
2. If empty AND `proposal_content` exists → auto-trigger AI parsing before showing wizard ✅
3. If AI finds no deliverables → open wizard with empty list, user can add manually ✅

**Full Project Lifecycle (30 Statuses, 9 Phases):**
```
INQUIRY → PROPOSAL → SIGN-OFF → AGREEMENT → PAYMENT → ONBOARDING → DEVELOPMENT → DELIVERY → CLOSED
```

All transitions managed via `ProjectStatusControl` component with phase stepper UI.

**Who Sees Projects:**
- Admin: Full access, all projects
- DFY: Their referred projects (view + sign-off)
- Dev: Assigned projects only

**Project Detail Page** (`/projects/[id]`) - ClickUp-style horizontal tabs:
- [x] Overview tab (phase stepper, progress cards, blockers list, recent activity)
- [x] Deliverables tab (CRUD: add/edit/delete/status change with activity logging)
- [x] Requirements tab (onboarding checklist with dependency tracking)
- [x] Files tab (two-workspace system: internal/client with sharing, documents via Plate.js)
- [x] Activity tab (timeline of all changes)

**Conversion Wizard:**
- [x] 3-step wizard (Deliverables → Requirements → Review)
- [x] Payment structure selection (100%, 50/50, 40/30/30, custom)
- [x] Requirements builder with suggestions
- [x] Auto-parse deliverables if none exist

**Project Initiation Wizard:**
Full-page wizard at `/inquiries/[id]/initiate` replacing the modal-based conversion.
- [x] Step 1: Select deliverables from proposal
- [x] Step 2: Build hierarchical requirements tree with template library
- [x] Step 3: Review project details and create project
- [x] Tree-structured onboarding_requirements (parent_id for nested items)
- [x] Requirement templates with categories (platform_access, credentials, assets, setup, payments)
- [x] File attachments support for requirements
- [x] RLS policies for admin/dfy/client access
- [x] **Hierarchical Templates** - Templates with parent_id support for nested children

**Hierarchical Requirement Templates:**
Templates support nested children via `parent_id` column. When a template is selected, the entire tree is added:
```
📁 GHL Setup (Hexona, absolute blocker)
  ├── Add Billing to Hexona (DFY)
  ├── Add WAGHL (Hexona)
  └── Add WAGHL Billing (Client)
```
Template columns: `parent_id`, `position`, `default_blocker`
API: `lib/api/requirement-templates.shared.ts` (client-safe), `lib/api/requirement-templates.ts` (server)

**Project Status Management:**
- [x] `ProjectStatusControl` component with full 22-status transition map
- [x] Phase stepper (7 phases displayed in both StatusControl and OverviewTab)
- [x] Primary action button for main forward transition
- [x] Secondary actions dropdown for alternatives
- [x] "Put On Hold" and "Cancel Project" always available
- [x] Activity log entry on every transition

**Deliverables CRUD:**
- [x] `deliverableActions.ts` - add/update/delete/status change with activity logging
- [x] Add deliverable button + dialog
- [x] Status dropdown per deliverable (pending → in_progress → blocked → done)
- [x] Edit/Delete via dropdown menu (admin only)
- [x] Role-based permissions (admin full, dev can change status only)

**Overview Tab Enhancements:**
- [x] Phase progress stepper (8 phases, excluding closed)
- [x] Progress cards (Requirements X/Y, Deliverables X/Y, Target Delivery, Created)
- [x] Active blockers list (project blocked + blocked requirements)
- [x] Recent activity (last 5 entries)
- [x] Dev assignment UI

**Project Management (Admin):**
- [x] **Delete Project** - Admin can delete projects from Danger Zone
- [x] **Requirements CRUD** - Add/edit/delete requirements after project creation
- [x] **Duplicate Project Prevention** - UNIQUE constraint on `projects.source_inquiry_id`

**Requirements System:**
- [x] Requirements table with dependencies (depends_on_id)
- [x] Status tracking (pending, in_progress, completed, blocked)
- [x] Completion tracking per item
- [x] Dependency visualization (DependencyBadge)
- [ ] Auto-advance when all items completed

**Two-Workspace File System:**
- [x] Visibility: `internal` (team workspace) / `client` (client-visible)
- [x] `shared_to` column for cross-workspace sharing
- [x] Content types: folders, uploaded files, documents (Plate.js)
- [x] RLS: Dev sees internal + shared_to internal; DFY/Client sees client + shared_to client

**Remaining Items:**
- [ ] Deliverables sign-off flow (Admin → DFY confirms for client)
- [ ] File uploads UI improvements
- [ ] Migrate RequirementsTab to use onboarding_requirements (currently uses old flat project_requirements)
- [ ] Projects list stage progress bar

**Slated for Later:**
- Agreement/contract phase (see future-features.md)
- Claude artifact-style proposal pages (see future-features.md)
- Stripe payment integration
- Email notifications on stage change

**Slated: Pipeline Stage Notifications (P1):**
- Email/in-app notifications when proposals move between stages
- Notify ADM when proposal is submitted for review (→ final_review)
- Notify INT/DFY when proposal is approved (→ ready)
- Notify DFY when proposal is sent (→ sent)

**Slated: INT vs ADM Role Distinction:**
- Currently both admin and internal roles are treated identically for proposal workflow
- Future enhancement: INT creates proposals, submits for ADM review
- ADM has final approval authority before sending to partners
- Role-based notification routing based on this distinction

### Phase 5: Developer Skills & Gamification (Complete)

RPG-style skill tracking, badges, and leveling system for developers.

**Database (`20260108000001_dev_skills_system.sql`):**
- [x] `dev_skills` table - Proficiency tracking (0-10 scale) with usage stats
- [x] `dev_badges` table - Achievement badges
- [x] `project_skill_tags` table - Skills used in projects
- [x] `skill_endorsements` table - Peer endorsements (LinkedIn-style)
- [x] `skill_templates` table - 30+ pre-defined skills
- [x] XP & leveling columns on profiles (`xp_points`, `level`, `total_projects_completed`)
- [x] Auto-increment trigger for skill usage tracking
- [x] Auto-update trigger for endorsement counts
- [x] RLS policies for proper access control

**Skill Categories & Templates:**
- [x] 🤖 AI & Chatbots (7 skills): Chatbots, Voice Agents, Manychat, Agentic Builds, MCP, Model Training, On-Prem LLM
- [x] ⚡ Automation Platforms (3 skills): n8n, Make, Zapier
- [x] 🏢 CRM & Business (4 skills): GHL, HubSpot, Airtable, Other CRMs
- [x] 📧 Marketing & Sales (4 skills): Marketing Automation, Lead Qualification, Sales, Marketing
- [x] ☁️ Cloud & APIs (3 skills): Meta Platform, Google Cloud, AWS S3
- [x] 💻 Development (6 skills): Fullstack, Frontend, Backend, Website Building, Scraping, Python
- [x] 📊 Data & Analytics (2 skills): Analytics Dashboards, Data Analysis
- [x] ✨ Modern Tools (2 skills): Vibe-coding, Project Management

**API Layer (`/lib/api/dev-skills.ts`):**
- [x] `getSkillTemplates()` - Fetch all active skill templates
- [x] `getDevSkills()` - Get all skills for a developer
- [x] `getDevSkillsByCategory()` - Skills grouped by category
- [x] `upsertDevSkill()` - Create or update skill
- [x] `updateSkillProficiency()` - Update proficiency level (0-10)
- [x] `deleteDevSkill()` - Remove skill
- [x] `verifyDevSkill()` - Admin verification
- [x] `endorseSkill()` - Add endorsement
- [x] `removeEndorsement()` - Remove endorsement
- [x] `getSkillEndorsements()` - Fetch endorsements
- [x] `getDevBadges()` - Get earned badges
- [x] `awardBadge()` - Award badge (admin only)
- [x] `awardXP()` - Award XP points
- [x] `getDevStats()` - XP, level, badges, skills count

**Server Actions (`/features/developer/actions/skillActions.ts`):**
- [x] `upsertSkillAction()` - CRUD for skills
- [x] `updateProficiencyAction()` - Quick proficiency update
- [x] `deleteSkillAction()` - Remove skill
- [x] `verifySkillAction()` - Admin verify (with optional adjusted level)
- [x] `endorseSkillAction()` - Endorse skill (awards 15 XP)
- [x] `removeEndorsementAction()` - Remove endorsement
- [x] `awardBadgeAction()` - Award badge (awards 100 XP)
- [x] `awardXPAction()` - Award XP (admin only)

**UI Components:**
- [x] `SkillsMatrix` component
  - [x] Color-coded proficiency bars (red→orange→yellow→green→cyan)
  - [x] Interactive sliders for editing (0-10 scale)
  - [x] Admin verification checkmark badges
  - [x] Endorsement counts with Users icon
  - [x] Project usage tracking ("Used in X projects, last used...")
  - [x] Notes display per skill
  - [x] Portfolio examples as clickable links
  - [x] Grouped by category with collapsible cards
  - [x] Level labels (Beginner, Junior, Intermediate, Advanced, Master)

**Settings Page (`/settings/developer`):**
- [x] Developer-only access (role check)
- [x] Stats overview cards:
  - [x] Level display with XP progress bar
  - [x] Skills count
  - [x] Projects completed
  - [x] Badges earned
- [x] Full skills matrix with all categories
- [x] Color-coded proficiency legend
- [x] Help section with tips
- [x] Navigation: Added "Developer Profile" link in dev sidebar

**Gamification Features:**
- [x] XP system (500 XP per level)
- [x] Leveling progression (displayed on profile)
- [x] Project skill tagging (auto-increment usage on tag)
- [x] Badge framework (ready for auto-awarding logic)
- [x] Peer endorsements (social proof)
- [x] Admin verification system

**Proficiency Scale (0-10):**
- 0: No experience
- 1-2: Beginner (aware, tutorial level)
- 3-4: Junior (basic tasks, simple projects)
- 5-6: Intermediate (comfortable, proficient)
- 7-8: Advanced (expert, can mentor)
- 9-10: Master (top tier, innovator)

**Integration Points:**
- Project skill tagging (ready for auto-tagging on project completion)
- Developer assignment matching (skill match scoring algorithm documented)
- Team skills dashboard (admin view - future phase)
- Badge auto-awarding (criteria defined - future phase)

**Future Enhancements (Documented):**
- [ ] Badge auto-awarding logic (n8n Wizard, Full-Stack Hero, etc.)
- [ ] Badge collection UI component
- [ ] Leaderboard component
- [ ] Team skills heatmap (admin dashboard)
- [ ] Skill coverage analysis
- [ ] Hiring recommendations
- [ ] Auto-tag skills when projects complete
- [ ] Skill-based project assignment recommendations

### Phase 5.5: Pulse — Personal Ops & Progress Tracking (REMOVED)

> **Status:** Removed in January 2026. The Pulse feature was retired and will return later with a new design. The `/pulse` route now shows a "Coming Soon" placeholder.

**What Was Removed:**
- 9 database tables (pulse_goals, pulse_targets, pulse_target_owners, pulse_actions, pulse_daily_tasks, pulse_events, pulse_settings, pulse_weekly_reviews, pulse_quarterly_reviews)
- All pulse-related components in `features/pulse/`
- Streak badge from sidebar
- Integration points with deliverables and requirements
- Time tracking integration with pulse tasks

**Migration:** `20260112000005_remove_pulse_system.sql`

### Phase 5.6: Conversations System (Complete)

Unified messaging system with bidirectional sync between inquiry comments and conversations.

**Database:**
- [x] `conversations` table (project, workspace, partner, direct, inquiry types)
- [x] `messages` table with sender, content, timestamps
- [x] `conversation_read_status` for unread tracking
- [x] `direct_conversation_participants` for DM conversations
- [x] Auto-create inquiry conversation via trigger when inquiry is created
- [x] Bidirectional sync columns (`synced_message_id`, `synced_inquiry_comment_id`)

**Conversation Types:**
- `project` - Everyone on project
- `workspace` - Admin, internal, dev only
- `partner` - Admin, internal, DFY only
- `direct` - Private DM between users
- `inquiry` - Discussion about an inquiry

**Bidirectional Sync (inquiry_comments ↔ messages):**
When a comment is created in inquiry detail:
→ Also creates a message in the linked inquiry conversation
→ Appears in Conversations > Inquiries tab

When a message is sent from Conversations for an inquiry:
→ Also creates an inquiry_comment
→ comment_type based on sender role (admin/internal → 'internal', dfy → 'dfy')
→ Appears in inquiry detail comments

**Sync Rules:**
- Inline anchor comments (document annotations) are NOT synced
- Threading not synced (messages table doesn't support parent_id)
- Each record stores ID of its synced counterpart to prevent infinite loops
- Backfill migration creates messages for all historical comments

**API Layer (`lib/api/conversations.ts`):**
- [x] `getDirectConversations()` - User's DM conversations
- [x] `getProjectConversationsOnly()` - Project/workspace/partner conversations
- [x] `getInquiryConversations()` - Inquiry conversations
- [x] `sendMessage()` - Send message (auto-syncs to inquiry_comments if inquiry conv)
- [x] `markConversationRead()` - Mark as read
- [x] `getTotalUnreadCount()` - Unread badge count

**UI Components:**
- [x] ConversationsView with Inbox/Projects/Inquiries tabs
- [x] Message thread display
- [x] Unread count badges
- [x] Real-time updates (planned)

### Phase 4.2: Gameplan Tab + Dev Logging System (Complete)

Rich text documents for project planning with daily dev check-ins and delay tracking.

**Note:** Time tracking was completely removed in January 2026. All time tracking components (GlobalTimeTracker, HeaderTimerIndicator, ActiveTimerWidget, TimeEntryForm, TaskSelector) and database tables (time_entries, active_timers) were removed. Migration: `20260112000006_remove_time_tracking.sql`

**Gameplan Tab:**
- [x] `project_documents` table with Plate.js content
- [x] `document_versions` table for version history
- [x] Auto-create "Gameplan" document on project creation (trigger)
- [x] Rich text editor with auto-save (1.5s debounce)
- [x] Version history panel with restore capability
- [x] Manual checkpoint creation
- [x] Multiple documents per project (horizontal tabs)
- [x] Dynamic @mentions for users and #deliverables
- [x] RLS: Admin, internal, dev only (not DFY/client)

**Dev Logging System:**
- [x] `dev_checkins` table (progress, no_work, delay types)
- [x] `checkin_notes` table (per-deliverable notes with position changes)
- [x] `checkin_snoozes` table for reminder snoozing
- [x] `CheckinPromptProvider` in dashboard layout
- [x] Auto-prompt modal when dev needs to check in (>24h since last log)
- [x] Quick position buttons (-5%, 0%, +5%, +10%, +15%)
- [x] Check-in history in Progress tab
- [x] 24-hour edit lock on check-ins

**Delay Tracking:**
- [x] `project_delays` table (client_delay, dev_delay types)
- [x] `project_extensions` table with DFY approval workflow
- [x] DelayMarkerDialog for marking delays
- [x] ExtensionRequestDialog for deadline extensions
- [x] ExtensionApprovalCard for DFY approval
- [x] DelaySummaryWidget showing delay totals
- [x] Client delays adjust expected progress calculation

**Enhanced Progress Calculation:**
- [x] `calculate_expected_progress()` SQL function
- [x] Accounts for client delays when calculating expected progress
- [x] At-risk flag when variance < -30%
- [x] `count_working_days()` excludes Sundays
- [x] `get_dev_logging_status()` for check-in prompts

**Files:**
- Migrations: `20260112000001-4_*.sql`
- API: `lib/api/project-documents.ts`, `dev-logging.ts`, `project-delays.ts`, `project-extensions.ts`, `project-progress.ts`, `mentionables.ts`
- Actions: `features/projects/actions/documentActions.ts`, `checkinActions.ts`, `delayActions.ts`, `extensionActions.ts`
- Components: `features/projects/components/gameplan/`, `features/dev-logging/components/`, `features/projects/components/delays/`

### Phase 6: External Access

- [ ] Dev portal (assigned projects)
- [ ] DFY portal (their deals)
- [ ] Client portal (if invited)
- [ ] Role-based visibility

### Phase 7: Payments (In Progress)

Stripe integration for invoice management and payment collection.

**Completed:**
- [x] Stripe SDK integration (`lib/stripe/server.ts`, `lib/stripe/client.ts`)
- [x] Invoice CRUD (`lib/api/invoices.ts`)
  - [x] Create draft invoices with line items
  - [x] Auto-generate invoice numbers (DB function)
  - [x] Send via Stripe (creates Stripe invoice, sends email)
  - [x] Void invoices
  - [x] Mark as paid (webhook or manual)
- [x] Stripe Checkout sessions for direct payment
- [x] Webhook handler (`app/api/webhooks/stripe/route.ts`)
  - [x] `checkout.session.completed` - marks invoice paid
  - [x] `invoice.paid` - marks invoice paid
- [x] Invoice API routes
  - [x] `POST /api/invoices` - create invoice
  - [x] `GET /api/invoices/[id]` - get invoice
  - [x] `POST /api/invoices/[id]/send` - send invoice
  - [x] `POST /api/invoices/[id]/void` - void invoice
  - [x] `POST /api/invoices/[id]/checkout` - create checkout session
- [x] Invoice types (`lib/types/invoices.ts`)

**Database:**
- [x] `invoices` table with Stripe integration fields
- [x] `generate_invoice_number()` function (HEX-0001 format)
- [x] Links to projects and payment_milestones

**Remaining:**
- [ ] Invoice management UI (admin)
- [ ] Payment milestones UI
- [ ] Client payment portal
- [ ] Payment status visibility per role

### Phase 7.5: Dev Payouts (Complete)

Developer payment request system with wire transfer support.

**Database (`20260109000010_payouts_dev_workflow.sql`, `20260109000012_payouts_payment_preferences.sql`):**
- [x] `payouts` table with full lifecycle tracking
- [x] Payment preference: `wire_transfer` or `emailed_invoice`
- [x] Wire transfer fields: recipient_name, swift_code, account_number, bank_name, bank_address, recipient_address, recipient_country
- [x] Invoice tracking: invoice_number, invoice_date, contractor_invoice_url
- [x] Status workflow: pending → approved → paid (or rejected)
- [x] Audit fields: submitted_by, submitted_at, approved_by, paid_by, rejected_by
- [x] `payout-invoices` storage bucket (private)

**Dev Payout Flow:**
```
Dev submits request → Chooses payment preference:
  - Wire Transfer: Enters bank details (SWIFT, IBAN, bank name, etc.)
  - Email Invoice: Instructions to email invoice to ayman@hexonasystems.com

Admin reviews → Approves or Rejects
  - If Wire: Copy bank details from expanded view, send via Mercury manually
  - Click "Mark as Sent" with transaction reference

Dev sees status updates in their dashboard
```

**API Layer (`/lib/api/payouts.ts`):**
- [x] `getPayouts()` - Admin: all payouts with filters
- [x] `getPayout()` - Single payout details
- [x] `getMyPayouts()` - Dev: own payouts only
- [x] `submitPayout()` - Dev submits request with wire/invoice preference
- [x] `approvePayout()` - Admin approves (notifies dev)
- [x] `rejectPayout()` - Admin rejects with reason (notifies dev)
- [x] `markPayoutPaid()` - Admin marks sent, creates expense record
- [x] `getPayoutMetrics()` - Dashboard stats

**Types (`/lib/api/payouts.shared.ts`):**
- [x] `PayoutStatus`: pending, approved, paid, rejected, + legacy statuses
- [x] `PaymentPreference`: wire_transfer, emailed_invoice
- [x] `PaymentMethod`: wire_transfer, bank_transfer, paypal, wise, crypto, other
- [x] `WireTransferDetails` interface
- [x] `PayoutWithDetails` with submitter/project relations

**Server Actions (`/features/finances/actions/payoutActions.ts`):**
- [x] `submitPayoutAction()` - Dev submit with file upload
- [x] `approvePayoutAction()` - Admin approve
- [x] `rejectPayoutAction()` - Admin reject with reason
- [x] `markPayoutPaidAction()` - Admin mark sent

**UI Components:**

*Dev Side (`/features/dev/components/payouts/`):**
- [x] `SubmitPayoutForm` - Two-option form (Wire Transfer / Email Invoice)
  - Wire fields: recipient name, SWIFT/BIC, IBAN, bank name, country, addresses
  - Invoice upload (optional)
  - Project selection (optional)
- [x] `PayoutHistory` - Dev's payout history with status badges

*Admin Side (`/features/finances/components/payouts/`):**
- [x] `PayoutManagement` - Full admin dashboard
  - Metrics cards (pending, approved, paid this month, total)
  - Tabbed filters (all, pending, approved, paid, rejected)
  - Expandable wire details with copy buttons
  - "Copy All" button for wire details
  - "Mark as Sent" button (opens payment dialog)
  - Approve/Reject via dropdown menu

**Copy Features (Wire Details):**
- [x] Individual field copy on hover (checkmark feedback)
- [x] "Copy All" button formats all details as text
- [x] Amount included in copy

**Payment Recording:**
- [x] Payment method selection (Wire Transfer (Mercury) default)
- [x] Transaction reference/ID field
- [x] Optional notes
- [x] Auto-creates expense record on payment

**Notifications:**
- [x] Dev notified on approval/rejection/payment
- [x] Admins notified on new payout submission

**Navigation:**
- [x] Dev sidebar: "Payouts" under dev section
- [x] Admin sidebar: "Payouts" under Finances section

### Phase 7: Scope Monitoring

- [ ] Scope baseline from deliverables
- [ ] Change detection triggers
- [ ] Change request flow
- [ ] Approval/denial workflow

### Phase 4.95: DFY Proposal Reminder System (Complete)

Automated follow-up system for stale proposals in 'sent' stage.

- [x] Database: Reminder tracking columns on inquiries
  - [x] reminder_snoozed_until, reminder_snooze_count (max 3)
  - [x] reminder_escalated_at (admin attention flag)
  - [x] admin_update_requested_at (manual admin trigger)
  - [x] dfy_first_viewed_at, lost_reason
- [x] API Layer (`/lib/api/proposal-reminders.ts`)
  - [x] getStaleProposalsForDfy() - Proposals >21 days old, not snoozed
  - [x] getAllStaleProposals() - Admin view
  - [x] snoozeReminder() - 2 week snooze, max 3 times
  - [x] markProposalLost() - Mark lost with optional reason
  - [x] escalateToAdmin() - Flag for admin attention
  - [x] requestProposalUpdates() - Bulk admin request
  - [x] bundleProposalsByDfy() - Group by DFY partner
- [x] Server Actions (`/features/inquiries/actions/reminderActions.ts`)
- [x] UI Components
  - [x] ProposalStatusDialog - 4 options: Won/Lost/Snooze/Escalate
  - [x] StaleProposalsBanner - DFY dashboard warning banner
  - [x] AdminProposalUpdatePanel - Bulk selection + request updates
- [x] Integration
  - [x] DFY Dashboard banner for stale proposals
  - [x] Admin Dashboard panel with bundled requests
- [ ] Email notifications (Phase 2 - requires Resend + Vercel Cron)

## Planned Features (Nuggets)

---

## Post-MVP (Future Quarters)

### Email Notifications
- Project status changes
- Payment reminders
- Scope change alerts
- Delivery notifications

### Reporting
- Pipeline metrics
- Revenue tracking
- Dev utilization
- Conversion rates

### Advanced Proposals
- Interactive proposal builder (client-facing)
- Dynamic pricing based on selections
- E-signature integration

### BaigWork Evolution
- Marketplace model
- Public dev profiles
- Bidding system
- 20% commission structure

### A2UI Integration
- Agent-generated dashboards
- Dynamic onboarding wizards
- Smart proposal UIs
- Scope change handlers

### UX Improvements (Complete - Jan 2026)

Comprehensive UX polish across the application.

**P0: Core UX ✅**
- [x] Skeleton loaders on list pages (projects, inquiries, blueprints)
- [x] Delete confirmation dialogs (AlertDialog with destructive action)
- [x] Breadcrumbs on detail pages
- [x] Result counts on lists ("Showing X results")

**P1: Command Palette ✅**
- [x] Global search via ⌘K (`/components/command-palette.tsx`)
- [x] Parallel queries (projects, inquiries, blueprints, conversations)
- [x] Recent searches persistence (localStorage)
- [x] Mobile responsive drawer (Sheet on mobile, Dialog on desktop)
- [x] Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)

**P1.1: Project Progress Bars ✅**
- [x] Phase-based progress (signoff 14% → closed 100%)
- [x] Deliverable-based progress when in development/delivery
- [x] Progress column in desktop table + mobile cards
- [x] Progress summary card on project detail page
- [x] Tooltip with deliverable counts (`/lib/utils/projectProgress.ts`)

**P1.2: Error Handling UI ✅**
- [x] Error types in `/lib/errors.ts` (parseError, isNotFoundError)
- [x] Dashboard error boundary (`/app/(dashboard)/error.tsx`)
- [x] Route-specific boundaries (projects, inquiries)
- [x] Toast notifications on form errors (sonner)
- [x] Proper 404 vs error boundary routing

**Bonus: Conversation Badges ✅**
- [x] Colored type badges (cyan=project, purple=workspace, orange=partner)
- [x] Quick filter buttons by type (`/features/conversations/components/`)

---

## Feature Flags

For gradual rollout:

```typescript
// src/lib/features.ts

export const features = {
  // MVP features
  formCopilot: true,
  scopeMonitoring: true,
  
  // Post-MVP (disabled)
  emailNotifications: false,
  interactiveProposals: false,
  a2uiDashboards: false,
}
```

## Page Structure

```
/                           # Landing / login redirect
/login                      # Auth
/dashboard                  # Role-based redirect
  /admin                    # Admin dashboard
  /dev                      # Dev dashboard
  /dfy                      # DFY dashboard
  /client                   # Client dashboard
/projects
  /                         # Project list (filtered by role)
  /[id]                     # Project detail
  /[id]/deliverables        # Deliverables management
  /[id]/files               # File management
  /new                      # Create project (admin/internal)
/inquiries
  /                         # Inquiry list
  /new                      # Submit inquiry (with form copilot)
  /[id]                     # Inquiry detail
/settings                   # Settings page (placeholder)
  /profile                  # User profile (coming soon)
  /team                     # Team management (admin only, placeholder)
/blueprints                 # Blueprint catalog (admin/internal/dfy)
  /                         # List with search, tags, filters
  /[id]                     # Detail view + edit mode
  /new                      # Create blueprint (admin only)
/case-studies               # Case studies catalog (admin/internal/dfy)
  /                         # List with search, tags, filters
  /[id]                     # Detail view + edit mode
  /new                      # Create case study (admin only)
```

## Component Hierarchy

```
app/
├── (auth)/
│   ├── login/
│   └── layout.tsx          # Centered layout + theme toggle
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + header
│   ├── dashboard/
│   │   ├── admin/
│   │   ├── dev/
│   │   ├── dfy/
│   │   └── client/
│   ├── projects/
│   ├── inquiries/
│   ├── blueprints/
│   └── settings/
└── api/
    ├── copilot/              # AI form assistant (OpenRouter)
    └── webhooks/
        └── stripe/

components/
├── theme-provider.tsx      # next-themes wrapper
├── theme-toggle.tsx        # Light/Dark/System dropdown
├── app-sidebar.tsx         # Main navigation + theme toggle
├── nav-user.tsx            # User menu in sidebar
└── ui/
    ├── editor.tsx          # Plate.js editor components
    ├── toolbar.tsx         # Editor toolbar
    ├── paragraph-node.tsx  # Paragraph element
    ├── heading-node.tsx    # H1-H3 elements
    ├── blockquote-node.tsx # Blockquote element
    ├── timeline.tsx        # Reusable timeline component
    └── sortable.tsx        # @dnd-kit Kanban + Sortable components

features/inquiries/components/
├── InquiryDocument.tsx     # Plate.js editor wrapper with auto-save
├── InquiryDocumentTab.tsx  # Document tab orchestrator
├── CommentsSidebar.tsx     # Comment threads UI
├── FullscreenDocument.tsx  # Fullscreen modal (70% doc + 30% comments)
├── InquiryListView.tsx     # View toggle wrapper (Table | Board) + toast notifications
├── InquiryTableView.tsx    # Grouped table with collapsible stages
├── InquiryBoardView.tsx    # Kanban board with drag-and-drop
├── StageBadge.tsx          # Proposal stage badge (color-coded)
├── PriorityBadge.tsx       # Priority badge (urgent/high/normal/low)
├── StageHistoryTimeline.tsx # Proposal progress timeline for DFY visibility
└── editor/plugins.ts       # Plate.js plugin configuration

features/blueprints/components/
├── BlueprintViewer.tsx        # Read-only Plate.js display
├── BlueprintEditor.tsx        # Editable Plate.js with fixed toolbar + auto-save
├── BlueprintForm.tsx          # Create/edit form (name, desc, icon, tiers, tags)
├── BlueprintCard.tsx          # Card for list view with DFY actions
├── BlueprintActions.tsx       # Admin dropdown (duplicate, delete)
├── BlueprintContentSection.tsx # Client wrapper for fullscreen state
├── FullscreenBlueprint.tsx    # Fullscreen modal for viewing/editing
├── IconPicker.tsx             # Frimousse emoji picker in popover
├── PricingTiersDisplay.tsx    # Tier cards display
├── PricingTiersEditor.tsx     # CRUD for pricing tiers
└── TagInput.tsx               # Tag chips input

features/case-studies/components/
├── CaseStudyViewer.tsx        # Read-only Plate.js display
├── CaseStudyEditor.tsx        # Editable Plate.js with fixed toolbar + auto-save
├── CaseStudyForm.tsx          # Create/edit form (name, desc, client, industry, etc.)
├── CaseStudyCard.tsx          # Card for list view with blueprint link
├── CaseStudyActions.tsx       # Admin dropdown (duplicate, delete)
├── CaseStudyContentSection.tsx # Client wrapper for fullscreen state
└── FullscreenCaseStudy.tsx    # Fullscreen modal for viewing/editing

components/ui/ (editor elements)
├── code-block-node.tsx     # Code block element
├── callout-node.tsx        # Callout element (info/warning/error/tip)
└── emoji-picker.tsx        # Frimousse emoji picker components
```

## Data Fetching Pattern

```typescript
// Server Components for initial load
// Client Components for mutations + real-time

// src/features/projects/api/getProjects.ts
export async function getProjects() {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('projects')
    .select('*, deliverables(*)')
    .order('created_at', { ascending: false })
  return data
}

// src/features/projects/hooks/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json())
  })
}
```

## Real-time Subscriptions

For live updates:

```typescript
// src/features/projects/hooks/useProjectSubscription.ts
export function useProjectSubscription(projectId: string) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`
      }, (payload) => {
        queryClient.invalidateQueries(['projects', projectId])
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [projectId])
}
```
