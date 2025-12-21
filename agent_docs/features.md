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

### Phase 1: Foundation (In Progress)

- [x] Project setup (Next.js 16 + shadcn/ui Vega preset)
- [x] Supabase project created + client configured
- [x] Vercel deployment connected
- [x] MCP integrations (Supabase + Vercel)
- [ ] Initial database migration
- [ ] Auth flow (login/logout)
- [ ] Basic route structure
- [ ] Admin seed accounts

### Phase 2: Core Data

- [ ] Projects CRUD
- [ ] Deliverables CRUD
- [ ] Status management
- [ ] Activity logging

### Phase 3: Dashboards

- [ ] Admin dashboard (all projects, financials)
- [ ] Project detail view
- [ ] Deliverables list + Gantt view
- [ ] Status transitions

### Phase 4: Inquiry Flow

- [ ] Inquiry form
- [ ] AI blueprint matching
- [ ] Form copilot (AI-assisted filling)
- [ ] Inquiry → Project conversion

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
/settings
  /profile                  # User profile
  /team                     # User management (admin only)
/blueprints                 # Blueprint catalog (admin only)
```

## Component Hierarchy

```
app/
├── (auth)/
│   ├── login/
│   └── layout.tsx          # No sidebar
├── (dashboard)/
│   ├── layout.tsx          # Sidebar + header
│   ├── dashboard/
│   │   ├── admin/
│   │   ├── dev/
│   │   ├── dfy/
│   │   └── client/
│   ├── projects/
│   ├── inquiries/
│   └── settings/
└── api/
    └── webhooks/
        └── stripe/
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
