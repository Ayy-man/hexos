# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `ParentDeliverableCard.tsx`, `InquiryListView.tsx`)
- Hooks: camelCase with `use-` prefix and kebab-case filename (e.g., `use-debounce.ts`, `use-presence.ts`)
- API modules: kebab-case (e.g., `deliverables.ts`, `project-files.ts`, `activity-logs.ts`)
- Server actions: camelCase with `Actions` suffix (e.g., `inquiryActions.ts`, `hillChartActions.ts`)
- Types: kebab-case (e.g., `activity-logs.ts` in `lib/types/`)
- Utilities: kebab-case (e.g., `projectFinancials.ts`, `pulseCalculations.ts`)

**Functions:**
- Regular functions: camelCase (e.g., `getDeliverables`, `parseError`, `formatLastSeen`)
- Server actions: camelCase with `Action` suffix (e.g., `archiveInquiryAction`, `updateStageAction`)
- React components: PascalCase (e.g., `AppSidebar`, `HillChartTab`)
- Event handlers: `handle` prefix (e.g., `handleStageChange`, `handleItemUpdate`, `handleQuickUpdate`)

**Variables:**
- Regular variables: camelCase (e.g., `currentItems`, `parentItems`, `testingInfo`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `HEARTBEAT_INTERVAL`, `PRESENCE_CHANNEL`, `ERROR_MESSAGES`)
- Boolean flags: `is`/`has`/`can`/`should` prefix (e.g., `isPending`, `isAdmin`, `canEdit`, `showHillChart`)

**Types:**
- Interfaces: PascalCase (e.g., `Profile`, `Deliverable`, `AppError`)
- Type aliases: PascalCase (e.g., `UserRole`, `ProjectStatus`, `ErrorCode`)
- Input types: PascalCase with `Input` suffix (e.g., `CreateDeliverableInput`, `UpdateProjectInput`)
- Props interfaces: PascalCase with `Props` suffix (e.g., `HillChartTabProps`, `AppSidebarProps`)

## Code Style

**Formatting:**
- No dedicated formatter config (Prettier not configured)
- ESLint with Next.js config: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config location: `eslint.config.mjs`
- 2-space indentation observed
- Single quotes for imports
- No semicolons (optional semicolons style)

**Linting:**
- ESLint 9+ with flat config
- TypeScript strict mode enabled (`strict: true` in `tsconfig.json`)
- Key TypeScript settings:
  - `noEmit: true` (type checking only)
  - `moduleResolution: "bundler"`
  - `isolatedModules: true`

## Import Organization

**Order:**
1. React and Next.js imports (`'use client'` directive first if present)
2. Third-party library imports (e.g., `lucide-react`, `sonner`, `framer-motion`)
3. Internal absolute imports using `@/` alias
4. Relative imports (components, hooks, types from same feature)

**Path Aliases:**
- `@/*` maps to project root (defined in `tsconfig.json`)
- Example: `@/lib/utils`, `@/components/ui/button`, `@/features/projects/actions`

**Pattern Examples:**
```typescript
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Zap } from 'lucide-react'
import { toast } from 'sonner'

import { HillChart } from './HillChart'
import type { HillChartItem } from './types'
```

## Error Handling

**Patterns:**
- Centralized error parsing via `parseError()` in `lib/errors.ts`
- Structured `AppError` type with `code`, `message`, `userMessage`, and `originalError`
- Error codes for classification: `NETWORK_ERROR`, `AUTH_ERROR`, `PERMISSION_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `RLS_ERROR`, `CONFLICT_ERROR`, `UNKNOWN_ERROR`
- Supabase PostgreSQL error codes mapped to application error codes

**API Functions:**
```typescript
// Pattern: throw on error, let caller handle
const { data, error } = await supabase.from('table').select('*')
if (error) throw error
return data
```

**Server Actions:**
```typescript
// Pattern: try/catch with toast feedback
startTransition(async () => {
  try {
    await someAction(id)
    toast.success('Success message')
  } catch (error) {
    toast.error('Failed to perform action')
    console.error('[Context] FAILED:', error)
  }
})
```

**Error Reporting:**
- Client-side error reporter at `lib/error-reporter.ts`
- Reports to `/api/log-error` endpoint
- Captures browser info, page context, and stack traces
- Fire-and-forget pattern (silently fails if reporting fails)

## Logging

**Framework:** `console.log` / `console.error` (no external logging service)

**Patterns:**
- Debug logging with context prefix: `console.log('[handleItemUpdate] Called:', { id, newX })`
- Error logging with context: `console.error('[Context] FAILED:', error)`
- Activity logging stored in database via `lib/logging/activity-logger.ts`
- Request context tracking in `lib/logging/request-context.ts`

## Comments

**When to Comment:**
- JSDoc blocks for exported functions in `lib/` modules
- Inline comments for complex business logic
- Section headers using `// ============` dividers for long files
- TODO/FIXME comments for incomplete features (primarily email sending)

**JSDoc Usage:**
```typescript
/**
 * Parse any error into a structured AppError
 */
export function parseError(error: unknown): AppError {
  // Implementation
}
```

## Function Design

**Size:**
- Functions generally 10-50 lines
- Complex components may be 200-400 lines with helper functions

**Parameters:**
- Use object destructuring for multiple params
- Props interfaces for React components
- Input types for API mutation functions

**Return Values:**
- API functions return typed data or throw errors
- Hooks return objects: `{ onlineUsers }`, `{ deliverables, optimisticUpdate }`
- Server actions return `Promise<void>` or typed results

## Module Design

**Exports:**
- Named exports preferred over default exports
- API modules export functions and types together
- Re-exports via index files for related modules

**Barrel Files:**
- `lib/api/index.ts` re-exports common API modules
- Feature modules may have local index files

## Component Patterns

**Client vs Server Components:**
- `'use client'` directive at top of file for interactive components
- Server components as default (no directive)
- Server actions in separate `actions/` files with `'use server'`

**State Management:**
- React `useState` and `useTransition` for local state
- Custom hooks for realtime data (e.g., `useHillChartRealtime`, `useInquiriesRealtime`)
- Optimistic updates pattern with server sync

**UI Components:**
- shadcn/ui based components in `components/ui/`
- `class-variance-authority` (cva) for variant styling
- `cn()` utility for conditional class merging (tailwind-merge + clsx)

**Example Component Structure:**
```typescript
'use client'

interface ComponentNameProps {
  prop1: Type1
  prop2: Type2
}

export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  const [state, setState] = useState<Type>(initial)
  const [isPending, startTransition] = useTransition()

  const handleAction = () => {
    startTransition(async () => {
      try {
        await serverAction()
        toast.success('Done')
      } catch (error) {
        toast.error('Failed')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Component JSX */}
    </div>
  )
}
```

## Styling Conventions

**Tailwind CSS:**
- Tailwind v4 with CSS-first configuration
- Custom theme colors defined in `globals.css` using CSS variables
- Dark mode via `.dark` class variant
- Responsive classes: `md:`, `lg:`, `sm:`

**Class Organization:**
- Layout classes first (flex, grid, gap)
- Sizing (h-, w-, size-)
- Spacing (p-, m-)
- Typography (text-, font-)
- Colors and backgrounds
- Interactive states (hover:, focus:, aria-)

**Color System:**
- Semantic colors: `primary`, `secondary`, `muted`, `accent`, `destructive`
- Status colors: `success`, `warning`, `error`, `info`
- Chart colors: `chart-1` through `chart-5`
- Light/dark mode support via oklch colors

## Data Fetching Patterns

**Server Components:**
```typescript
export default async function Page() {
  await requireRole(['admin'])  // Auth guard
  const data = await fetchData()  // Direct API call
  return <Component data={data} />
}
```

**Client Components:**
- Receive initial data as props from server components
- Use realtime hooks for live updates
- Optimistic updates with server action calls

---

*Convention analysis: 2026-01-19*
