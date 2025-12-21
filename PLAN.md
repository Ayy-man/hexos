# Frontend Implementation Plan

## Goal
Build the hexOS dashboard layout and 4 role-based dashboards using shadcn/ui sidebar + 21st.dev components.

## Phase 1: Setup & Layout (Do First)

### 1.1 Install Required shadcn Components
```bash
npx shadcn@latest add sidebar breadcrumb separator dropdown-menu avatar badge card table tabs
```

### 1.2 Create App Sidebar Component
Location: `components/app-sidebar.tsx`

Navigation structure by role:
| Role | Nav Items |
|------|-----------|
| Admin | Dashboard, Projects, Inquiries, Blueprints, Team, Settings |
| Internal | Dashboard, Projects, Inquiries, Settings |
| Dev | Dashboard, My Projects, Settings |
| DFY | Dashboard, My Deals, Submit Inquiry, Settings |
| Client | My Project, Settings |

### 1.3 Update Dashboard Layout
- Replace current header-only layout with sidebar layout
- Use `SidebarProvider` + `SidebarInset` pattern
- Add breadcrumbs
- Add user menu in sidebar footer

### 1.4 Create Hooks
- `use-mobile.ts` - Detect mobile viewport
- Navigation config by role

## Phase 2: Role Dashboards

### 2.1 Admin Dashboard
- Stats cards: Total Projects, Active, Inquiries, Revenue
- Recent projects table
- Pipeline chart (inquiry → completed)
- Quick actions: New Project, View All

### 2.2 Dev Dashboard
- Assigned projects list with deliverables count
- My deliverables (pending/in-progress)
- Quick status updates

### 2.3 DFY Dashboard
- My deals with status
- Commission overview (if visible)
- Submit inquiry CTA
- Deal pipeline

### 2.4 Client Dashboard
- Single project view
- Progress indicator
- Deliverables checklist
- Next milestone

## Phase 3: Projects Section

### 3.1 Projects List (`/projects`)
- Table view with sorting
- Filter by status
- Search
- Quick actions

### 3.2 Project Detail (`/projects/[id]`)
- Project info card
- Status badge with change dropdown
- Deliverables list with status toggles
- Files section (placeholder)
- Activity log (placeholder)

## Execution Order

1. Install shadcn components
2. Create sidebar component with role-based nav
3. Update dashboard layout to use sidebar
4. Build Admin dashboard with real data
5. Build Dev dashboard with assigned projects
6. Build DFY dashboard with deals
7. Build Client dashboard with project view
8. Add project table improvements
9. Typecheck + Build + Push

## Files to Create/Modify

### New Files
- `components/app-sidebar.tsx`
- `components/nav-user.tsx`
- `hooks/use-mobile.ts`
- `lib/navigation.ts`

### Modified Files
- `app/(dashboard)/layout.tsx` - Sidebar layout
- `app/(dashboard)/dashboard/admin/page.tsx` - Real stats
- `app/(dashboard)/dashboard/dev/page.tsx` - Assigned work
- `app/(dashboard)/dashboard/dfy/page.tsx` - My deals
- `app/(dashboard)/dashboard/client/page.tsx` - My project

## Component Dependencies

```
sidebar → dropdown-menu, separator, tooltip, sheet, skeleton
breadcrumb → (standalone)
card → (standalone)
table → (standalone)
badge → (standalone)
avatar → (standalone)
```
