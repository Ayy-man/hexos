# Conventions

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectCard.tsx` |
| Hooks | camelCase, use prefix | `useProjects.ts` |
| Utils | camelCase | `formatDate.ts` |
| API files | camelCase | `projects.ts` |
| Types | PascalCase | `Project.ts` |
| Pages | lowercase with dashes | `project-detail/page.tsx` |

## Directory Structure

```
src/
├── app/                    # Next.js App Router
├── components/
│   └── ui/                 # shadcn/ui components (don't edit)
├── features/               # Feature modules
│   └── [feature]/
│       ├── components/     # Feature-specific components
│       ├── hooks/          # Feature-specific hooks
│       ├── api/            # Server actions / API calls
│       ├── utils/          # Feature-specific utils
│       └── types.ts        # Feature-specific types
├── lib/
│   ├── supabase/           # Supabase setup
│   ├── api/                # Shared API abstraction
│   └── utils/              # Shared utilities
└── types/                  # Global types
```

## Component Patterns

### Server Components (Default)

```tsx
// src/features/projects/components/ProjectList.tsx

import { getProjects } from '../api/getProjects'

export async function ProjectList() {
  const projects = await getProjects()
  
  return (
    <div>
      {projects.map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  )
}
```

### Client Components (When Needed)

```tsx
// src/features/projects/components/ProjectStatusSelect.tsx
'use client'

import { useState } from 'react'
import { useUpdateProject } from '../hooks/useUpdateProject'

export function ProjectStatusSelect({ project }) {
  const updateProject = useUpdateProject()
  // ...
}
```

### Use Client Only When:
- User interactions (onClick, onChange)
- Hooks (useState, useEffect)
- Browser APIs
- Real-time subscriptions

### Disabling Cache for Dynamic Data (IMPORTANT)

**Next.js aggressively caches server component data in production.** Pages that fetch frequently-changing data will show stale data unless you disable caching.

```tsx
// app/(dashboard)/admin/team/page.tsx

// Add this export to force fresh data on every request
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const invitations = await getInvitations() // Always fresh
  // ...
}
```

**When to use `force-dynamic`:**
- Admin pages showing pending invitations, applications
- Pages with data that changes frequently (not just via the current user)
- Any page where stale data causes user confusion

**Symptoms of caching issues:**
- Data exists in database (verified via SQL or API route) but UI shows empty/old data
- Changes don't appear until redeployment
- Different results between local dev and production
- Data appears after hard refresh but not on navigation

## API Abstraction

**Never call Supabase from components directly.**

```typescript
// ❌ Bad
function ProjectCard({ id }) {
  const { data } = await supabase.from('projects').select().eq('id', id)
}

// ✅ Good
// src/lib/api/projects.ts
export const projectsApi = {
  async get(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
}

// src/features/projects/api/getProject.ts
import { projectsApi } from '@/lib/api/projects'

export async function getProject(id: string) {
  return projectsApi.get(id)
}
```

## Type Generation

Types come from database, never manually written:

```bash
pnpm supabase:types
```

```typescript
// src/lib/supabase/types.ts (GENERATED)
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: { ... }
        Insert: { ... }
        Update: { ... }
      }
    }
  }
}

// Usage
import type { Database } from '@/lib/supabase/types'
type Project = Database['public']['Tables']['projects']['Row']
```

## Error Handling

```typescript
// API layer throws, components catch

// src/lib/api/projects.ts
export const projectsApi = {
  async create(project: ProjectInsert) {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return data
  }
}

// Component
try {
  await projectsApi.create(newProject)
  toast.success('Project created')
} catch (e) {
  toast.error(e.message)
}
```

## Form Handling

Use React Hook Form + Zod:

```typescript
// src/features/projects/components/ProjectForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema } from '../validators'

export function ProjectForm() {
  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: { ... }
  })

  // ...
}
```

### Long Form Pattern (Card Sections)

For forms with many fields (like CustomProposal), use card-based sections:

```tsx
// Use FormSection wrapper with icon
<FormSection icon={Building2} title="Prospect Info" description="Basic details">
  {/* fields */}
</FormSection>

// Use OptionCard for important single-select
<OptionCard
  value="quick_win"
  currentValue={watch('build_preference')}
  onSelect={(v) => setValue('build_preference', v)}
  icon={Zap}
  title="Quick Win"
  description="24-48 hour proposal"
  fieldName="build_preference"  // Required for AI Copilot
/>

// Use InlineRadioGroup (pills) for simple choices
<InlineRadioGroup
  value={watch('urgency')}
  onValueChange={(v) => setValue('urgency', v)}
  fieldName="urgency"  // Required for AI Copilot
  options={[
    { value: 'asap', label: '< 7 days' },
    { value: 'thirty_days', label: '< 30 days' },
  ]}
/>

// Use pill toggles for multi-select
<div data-field="departments_involved">  {/* Required for AI Copilot */}
  {options.map((opt) => (
    <button
      onClick={() => toggleArrayValue('departments_involved', opt, current)}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm',
        selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}
    >
      {opt}
    </button>
  ))}
</div>
```

**Key rules:**
1. Always add `data-field` or `fieldName` prop for AI Copilot flash animation
2. Use grid layouts for related questions (2-3 columns)
3. Group sections logically with Card + icon headers
4. Use OptionCards for choices with descriptions, pills for simple yes/no

## Mobile Responsive Patterns

### Grid Layouts

Always include mobile breakpoint for grids:

```tsx
// ❌ Bad - breaks on mobile
<div className="grid grid-cols-3 gap-4">

// ✅ Good - stacks on mobile
<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

// ✅ Good - 4-column with intermediate breakpoint
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
```

### Row Layouts (Cards, List Items)

Use flex-col → flex-row pattern for rows with multiple sections:

```tsx
// ❌ Bad - doesn't stack on mobile
<div className="flex items-center justify-between p-4">
  <div>Left content</div>
  <div>Right content</div>
</div>

// ✅ Good - stacks on mobile, horizontal on sm+
<div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-3 sm:gap-4">
    <Icon className="shrink-0" />
    <div className="min-w-0">
      <p className="font-medium truncate">Title</p>
      <p className="text-sm text-muted-foreground truncate">Description</p>
    </div>
  </div>
  <div className="flex items-center justify-between gap-2 sm:gap-4">
    <div className="sm:text-right">Amount</div>
    <Badge className="shrink-0">Status</Badge>
  </div>
</div>
```

### Key Mobile Classes

| Pattern | Use Case |
|---------|----------|
| `min-w-0` + `truncate` | Prevent text overflow in flex containers |
| `shrink-0` | Keep icons/badges from shrinking |
| `hidden sm:block` | Hide secondary info on mobile |
| `gap-2 sm:gap-4` | Tighter spacing on mobile |
| `text-[10px] md:text-xs` | Smaller text on mobile |
| `w-full lg:w-[40%]` | Full width on mobile, sidebar on desktop |

### Tabs with Many Items

Use scrollable container with shortened labels:

```tsx
<div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
  <TabsList className="w-max min-w-full md:w-auto">
    <TabsTrigger className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 md:min-w-[100px]">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Full Label</span>
      <span className="sm:hidden">Short</span>
    </TabsTrigger>
  </TabsList>
</div>
```

### Sidebar Layouts

Stack vertically on mobile:

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  <div className="flex-1 lg:max-w-[60%]">Main content</div>
  <div className="w-full lg:w-[40%] lg:min-w-[350px]">Sidebar</div>
</div>
```

### Timeline/Progress Components

Use horizontal scroll with padding instead of fixed min-width:

```tsx
<div className="overflow-x-auto scrollbar-hide">
  <div className="min-w-max md:min-w-[600px] px-4 md:px-0">
    {/* Timeline nodes */}
  </div>
</div>
```

## Imports

```typescript
// Order: external → internal → relative
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { projectsApi } from '@/lib/api/projects'
import { ProjectCard } from './ProjectCard'
```

## Comments

```typescript
// Explain WHY, not WHAT
// Bad: // Loop through projects
// Good: // Filter to only show projects where user is assigned dev

// TODO format
// TODO: Implement scope change detection
// FIXME: RLS policy not working for DFY role
```

## Git Commits

```
feat: add project status transitions
fix: RLS policy for dev role
refactor: extract project API to lib/api
docs: update workflows documentation
chore: upgrade shadcn components
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=         # Safe to expose
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Safe to expose (RLS protected)
SUPABASE_SERVICE_ROLE_KEY=        # NEVER expose (server only)
STRIPE_SECRET_KEY=                # Server only
STRIPE_WEBHOOK_SECRET=            # Server only
```

## Testing Roles

Dev-only role switcher:

```typescript
// Only renders in development
export function RoleSwitcher() {
  if (process.env.NODE_ENV !== 'development') return null
  // ...
}
```
