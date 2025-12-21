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
- [x] Comments/annotations system
  - [x] inquiry_comments table with RLS
  - [x] Thread support (replies)
  - [x] Resolve/unresolve comments
  - [x] Role-based access (admin/internal can edit, dfy can view own)

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
/blueprints                 # Blueprint catalog (admin/internal)
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
    └── blockquote-node.tsx # Blockquote element

features/inquiries/components/
├── InquiryDocument.tsx     # Plate.js editor wrapper with auto-save
├── InquiryDocumentTab.tsx  # Document tab orchestrator
├── CommentsSidebar.tsx     # Comment threads UI
└── editor/plugins.ts       # Plate.js plugin configuration
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
