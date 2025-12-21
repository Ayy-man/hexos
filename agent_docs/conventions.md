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
