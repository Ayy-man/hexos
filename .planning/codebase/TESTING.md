# Testing Patterns

**Analysis Date:** 2026-01-19

## Test Framework

**Runner:**
- No automated testing framework configured
- No Jest, Vitest, or other test runner found in `package.json`
- No test configuration files detected (`jest.config.*`, `vitest.config.*`)

**Current State:**
- Manual testing approach documented in `test-suite-testing-system.md`
- No `*.test.*` or `*.spec.*` files in the codebase
- TypeScript type checking serves as primary automated validation (`pnpm typecheck`)

**Run Commands:**
```bash
pnpm lint              # ESLint checks
pnpm typecheck         # TypeScript type validation (tsc --noEmit)
pnpm build             # Build-time validation
```

## Manual Testing Documentation

**Location:** `test-suite-testing-system.md` (root directory)

**Purpose:** Documents manual test procedures for the Deliverable Testing System feature.

**Structure:**
- 20 test cases covering the testing workflow
- Each test includes: Goal, Steps, Expected Results
- Database verification queries included
- Chrome browser automation commands for reference

**Example Test Case:**
```markdown
## Test 2: Move Deliverable to 90% - Auto-Create Test Record

**Goal:** Verify moving a deliverable to 90% automatically creates a `deliverable_tests` record.

### Steps
1. Navigate to the **Hill Chart** tab
2. Find a deliverable with position < 90%
3. Click the **+10%** button OR drag the deliverable dot to 90%

### Expected Results
- Deliverable position updates to 90%
- Deliverable shows a **lock indicator** (ring around the dot)
- A new `deliverable_tests` record is created in the database
```

## Testing Philosophy

**Current Approach:**
- Feature-specific manual test suites
- Database queries for verification
- Browser automation commands (for potential future automation)
- TypeScript strict mode as compile-time testing

**Type Safety as Testing:**
- `strict: true` in TypeScript config
- Explicit type annotations on API functions
- Input/Output type definitions for all data operations

## Test-Related Patterns in Code

**Error Boundary Testing:**
- `components/error-boundary.tsx` catches React errors
- `components/global-error-handler.tsx` captures unhandled errors
- Errors reported to `/api/log-error` endpoint

**Validation Patterns:**
- Zod schemas used for runtime validation (zod v4.2.1 in dependencies)
- React Hook Form with `@hookform/resolvers` for form validation
- Type guards and error classification in `lib/errors.ts`

**Optimistic Update Testing:**
```typescript
// Pattern used in hill chart and other realtime features
// 1. Optimistic update for instant UI feedback
optimisticUpdate(id, newX)

// 2. Server action call
startTransition(async () => {
  try {
    await updatePositionAction(id, project.id, newX)
    toast.success('Saved')
  } catch (error) {
    // Rollback handled by realtime sync
    toast.error('Failed to save')
  }
})
```

## Database Verification

**Sample Queries from Test Suite:**
```sql
-- Check deliverables at 90%+ without test records
SELECT d.id, d.title, d.hill_position
FROM deliverables d
LEFT JOIN deliverable_tests dt ON d.id = dt.deliverable_id
WHERE d.hill_position >= 90
  AND dt.id IS NULL;

-- Count test records by stage
SELECT stage, status, COUNT(*) as count
FROM deliverable_tests
GROUP BY stage, status
ORDER BY stage, status;
```

## Recommended Testing Setup

**If adding automated tests, use:**

**Framework:** Vitest (recommended for Next.js App Router)
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

**Test File Organization:**
- Co-located pattern: `ComponentName.test.tsx` next to `ComponentName.tsx`
- Or `__tests__/` directories within features

**Suggested Structure:**
```
features/
  projects/
    components/
      HillChartTab.tsx
      HillChartTab.test.tsx   # Unit/integration tests
    actions/
      hillChartActions.ts
      hillChartActions.test.ts # Server action tests
```

**Priority Test Coverage:**
1. Server actions (critical business logic)
2. API functions in `lib/api/`
3. Utility functions in `lib/utils/`
4. Complex components with state management

## Testing Categories

**Unit Testing Targets:**
- `lib/errors.ts` - Error parsing and classification
- `lib/utils.ts` - Utility functions
- `lib/utils/projectProgress.ts` - Progress calculations
- `lib/utils/projectPhases.ts` - Phase determination logic

**Integration Testing Targets:**
- API modules in `lib/api/` - Supabase query builders
- Server actions - Full request/response cycle
- Realtime hooks - Supabase channel subscriptions

**E2E Testing Candidates:**
- Authentication flow
- Project creation and management
- Deliverable progress tracking
- Testing workflow (as documented in test-suite)

## Code Quality Gates

**Current Gates:**
```json
{
  "scripts": {
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "build": "next build"
  }
}
```

**Recommended Additional Gates:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Mocking Guidance

**When tests are added, mock:**
- Supabase client (`@/lib/supabase/server`, `@/lib/supabase/client`)
- External APIs (Stripe, email services)
- `next/navigation` hooks (`useRouter`, `redirect`)
- `next/cache` functions (`revalidatePath`)

**Do NOT mock:**
- Utility functions (test actual logic)
- Type transformations
- Pure calculation functions

## Test Data Patterns

**Fixtures would live in:**
- `__fixtures__/` directories
- `test/fixtures/` for shared fixtures
- Factory functions for generating test entities

**Example Factory Pattern:**
```typescript
// Recommended pattern when tests are added
export function createMockDeliverable(overrides?: Partial<Deliverable>): Deliverable {
  return {
    id: 'del-123',
    project_id: 'proj-456',
    parent_id: null,
    title: 'Test Deliverable',
    description: null,
    status: 'in_progress',
    estimated_hours: 10,
    start_date: null,
    due_date: null,
    completed_at: null,
    sort_order: 0,
    hill_position: 50,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}
```

## Coverage Recommendations

**High Priority (critical paths):**
- Authentication guards (`lib/auth/guards.ts`)
- Error parsing (`lib/errors.ts`)
- Project status/phase logic (`lib/utils/projectPhases.ts`)
- Financial calculations (`lib/utils/projectFinancials.ts`)

**Medium Priority:**
- API data transformations
- Hook state management
- Form validation schemas

**Lower Priority:**
- Static UI components
- Layout components
- Styling variations

---

*Testing analysis: 2026-01-19*
