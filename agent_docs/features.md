# Features

## Custom Components Available

These components are ready to integrate (ask user for code):

| Component | Use In |
|-----------|--------|
| Action Searchbar | Global ⌘K command palette, project search |
| File Tree | Deliverables hierarchy, project structure |
| Kanban Board | Pipeline view, deliverables board, dev tasks |
| Location Tag | User profiles, client timezone display |

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
- [ ] Deliverables CRUD
- [ ] Status management
- [ ] Activity logging

### Phase 3: Dashboards

- [x] Admin dashboard (all projects, financials)
- [x] Dev dashboard (assigned projects, deliverables)
- [x] DFY dashboard (deals, commissions)
- [x] Client dashboard (project progress)
- [x] Sidebar layout with role-based navigation
- [ ] Project detail view improvements
- [ ] Deliverables list + Gantt view
- [ ] Status transitions

### Phase 4: Inquiry Flow (Complete)

See `inquiry-form.md` for full specification.

- [x] Database: inquiries table + RLS policies
- [x] Blueprints seed data (12 solutions in 2 categories)
- [x] Multi-step form with conditional branching
  - [x] Branch A: Closed deals (A1, A2, A3)
  - [x] Branch B: Proposal requests (B1, B2, B3)
- [x] AI Copilot sidebar (toggleable)
  - [x] Chat interface with Claude 3 Haiku via OpenRouter
  - [x] Tool calling for form field population (set_form_field)
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
  - [x] proposal_stage enum: unopened → admin_reviewed → in_queue → working → on_hold → final_review → ready
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

**P1 Features (Planned):**
- [ ] Public proposal link (client view at /p/[token])
- [ ] PDF export
- [ ] Email notifications on stage change

**P2 Features (Planned):**
- [ ] Blueprint → template auto-fill
- [ ] Inquiry attachments
- [ ] AI proposal writer extensions

### Phase 5: External Access

- [ ] Dev portal (assigned projects)
- [ ] DFY portal (their deals)
- [ ] Client portal (if invited)
- [ ] Role-based visibility

### Phase 6: Payments

- [ ] Stripe integration
- [ ] Payment milestones
- [ ] Manual payment marking
- [ ] Payment status visibility per role

### Phase 7: Scope Monitoring

- [ ] Scope baseline from deliverables
- [ ] Change detection triggers
- [ ] Change request flow
- [ ] Approval/denial workflow

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
