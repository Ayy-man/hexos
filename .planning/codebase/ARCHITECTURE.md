# Architecture

**Analysis Date:** 2026-01-19

## Pattern Overview

**Overall:** Next.js App Router with Feature-Based Organization

**Key Characteristics:**
- Server-first rendering with React Server Components (RSC)
- Vertical feature slices containing components, actions, and domain logic
- Supabase as backend-as-a-service (auth, database, storage, realtime)
- Role-based access control (RBAC) with 5 user roles: admin, internal, dev, dfy, client
- Progressive Web App (PWA) with offline support

## Layers

**Presentation Layer (`app/`, `components/`):**
- Purpose: UI rendering, routing, page composition
- Location: `app/` for routes, `components/` for shared UI
- Contains: Pages (RSC), layouts, UI components, error boundaries
- Depends on: Features, lib/api, lib/auth
- Used by: End users via browser

**Feature Layer (`features/`):**
- Purpose: Domain-specific business logic and UI components
- Location: `features/{domain}/`
- Contains: Feature components, server actions, domain types
- Depends on: lib/api, lib/auth, components/ui
- Used by: app/ pages

**Data Access Layer (`lib/api/`):**
- Purpose: Database operations via Supabase client
- Location: `lib/api/`
- Contains: CRUD functions, complex queries, type definitions
- Depends on: lib/supabase, lib/types
- Used by: Features, API routes, pages

**Infrastructure Layer (`lib/`):**
- Purpose: Cross-cutting concerns, external integrations
- Location: `lib/supabase/`, `lib/stripe/`, `lib/auth/`, `lib/logging/`
- Contains: Supabase clients, Stripe integration, auth guards, error handling
- Depends on: External SDKs, environment variables
- Used by: All layers

**API Layer (`app/api/`):**
- Purpose: REST endpoints for external integrations, webhooks
- Location: `app/api/`
- Contains: Route handlers for Stripe webhooks, file operations, AI copilot
- Depends on: lib/api, lib/stripe, lib/supabase
- Used by: External services (Stripe), client-side fetches

## Data Flow

**Server Component Page Load:**

1. Request hits middleware (`middleware.ts`) - refreshes Supabase session
2. Layout (`app/(dashboard)/layout.tsx`) authenticates user, fetches profile
3. Page component fetches data via `lib/api/` functions
4. Data passed to client components via props
5. Client components render with hydration

**Server Action Mutation:**

1. Client component calls server action (`'use server'` function)
2. Action authenticates via `createClient()` from `lib/supabase/server`
3. Action performs database operation via `lib/api/` or direct Supabase call
4. Action calls `revalidatePath()` to invalidate cache
5. Optional: Creates notification, logs activity

**State Management:**
- Server state: Managed by RSC + Next.js cache
- Client state: React hooks (useState, useEffect)
- Realtime updates: Custom hooks in `hooks/` using Supabase subscriptions
- No global state library (Redux, Zustand) - props drilling + context

## Key Abstractions

**Supabase Client Factory:**
- Purpose: Create authenticated Supabase clients for different contexts
- Examples: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/admin.ts`
- Pattern: Factory function returning configured SupabaseClient

**Server Actions:**
- Purpose: Type-safe RPC from client to server
- Examples: `features/projects/actions/projectActions.ts`, `features/projects/actions/deliverableActions.ts`
- Pattern: `'use server'` annotated async functions with revalidation

**API Functions:**
- Purpose: Reusable database operations
- Examples: `lib/api/projects.ts`, `lib/api/invoices.ts`
- Pattern: Exported async functions accepting typed inputs, returning typed outputs

**Auth Guards:**
- Purpose: Protect routes and actions by authentication/role
- Examples: `lib/auth/guards.ts` - `requireAuth()`, `requireRole()`, `requireAdmin()`
- Pattern: Async functions that redirect on failure, return user/profile on success

**Activity Logging:**
- Purpose: Audit trail for compliance and debugging
- Examples: `lib/logging/activity-logger.ts`
- Pattern: Fire-and-forget logging via `activityLogger.{category}.{action}()`

## Entry Points

**Root Layout (`app/layout.tsx`):**
- Location: `app/layout.tsx`
- Triggers: All page loads
- Responsibilities: Global providers (theme, error boundary), PWA setup, analytics

**Dashboard Layout (`app/(dashboard)/layout.tsx`):**
- Location: `app/(dashboard)/layout.tsx`
- Triggers: All authenticated page loads
- Responsibilities: Auth check, profile fetch, navigation, sidebar, notifications

**Middleware (`middleware.ts`):**
- Location: `middleware.ts`
- Triggers: All non-static requests
- Responsibilities: Supabase session refresh

**API Routes (`app/api/**/route.ts`):**
- Location: `app/api/` directory
- Triggers: HTTP requests to `/api/*` paths
- Responsibilities: External integrations, webhooks, file operations

## Error Handling

**Strategy:** Centralized error parsing with user-friendly messages

**Patterns:**
- `lib/errors.ts` - `parseError()` converts any error to structured `AppError`
- Error codes: `NETWORK_ERROR`, `AUTH_ERROR`, `PERMISSION_ERROR`, `NOT_FOUND`, `VALIDATION_ERROR`, `RLS_ERROR`
- Pages use `isNotFoundError()` to show 404, let error boundary handle others
- API routes return JSON with appropriate HTTP status codes
- Client components use `toast.error()` from Sonner for user feedback

**Error Boundaries:**
- `components/error-boundary.tsx` - React error boundary for client errors
- `app/error.tsx` - Next.js error page for unhandled errors
- `components/global-error-handler.tsx` - Window error listener for uncaught exceptions

## Cross-Cutting Concerns

**Logging:**
- `lib/logging/activity-logger.ts` - Structured activity logging to `activity_logs` table
- `lib/error-reporter.ts` - Client-side error reporting to `/api/log-error`
- Categories: auth, crud, status, ai, file, payment, conversation, error

**Validation:**
- Zod schemas for runtime type validation
- TypeScript types derived from Supabase schema
- Server-side validation in actions and API routes

**Authentication:**
- Supabase Auth with email/password
- Session managed via cookies (SSR-compatible)
- Middleware refreshes session on each request
- Profile fetched from `profiles` table after auth

**Authorization:**
- Row Level Security (RLS) in Supabase database
- Role checks in `lib/auth/guards.ts` before sensitive operations
- UI conditionally renders based on `userRole` prop

---

*Architecture analysis: 2026-01-19*
