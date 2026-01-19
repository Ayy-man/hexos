# External Integrations

**Analysis Date:** 2026-01-19

## APIs & External Services

**Supabase (Primary Backend):**
- Purpose: Database, authentication, real-time subscriptions, file storage
- SDK: `@supabase/supabase-js` 2.89.0, `@supabase/ssr` 0.8.0
- Auth: Email/password authentication via Supabase Auth
- Client implementations:
  - Browser: `lib/supabase/client.ts` - `createBrowserClient()`
  - Server: `lib/supabase/server.ts` - `createServerClient()` with cookie handling
  - Admin: `lib/supabase/admin.ts` - Service role client bypassing RLS
  - Middleware: `lib/supabase/middleware.ts` - Session refresh in Next.js middleware

**Stripe (Payments):**
- Purpose: Payment processing, invoicing, checkout sessions
- SDK: `stripe` 20.1.1 (server), `@stripe/stripe-js` 8.6.1 (client)
- Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Server client: `lib/stripe/server.ts`
  - Invoice creation and management
  - Checkout session creation
  - Webhook signature verification
- Client: `lib/stripe/client.ts`
  - Stripe.js loading
  - Checkout redirect

**OpenRouter (AI):**
- Purpose: AI-powered form copilot
- Model: `anthropic/claude-3.5-haiku`
- Auth: `OPENROUTER_API_KEY`
- Implementation: `app/api/copilot/route.ts`
- Features: Function calling for form field extraction

**Vercel:**
- Purpose: Hosting and analytics
- SDK: `@vercel/analytics` 1.6.1
- MCP integration configured in `.mcp.json`

## Data Storage

**Database:**
- Provider: Supabase (PostgreSQL)
- Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Admin access: `SUPABASE_SERVICE_ROLE_KEY`
- Schema: 100+ migration files in `supabase/migrations/`
- Key tables:
  - `profiles` - User profiles extending auth.users
  - `projects` - Project management core
  - `deliverables` - Project deliverables/tasks
  - `invoices` - Payment/billing
  - `conversations`, `messages` - Messaging system
  - `notifications` - User notifications
  - `push_subscriptions` - PWA push notification subscriptions
  - `activity_logs` - Audit logging

**File Storage:**
- Provider: Supabase Storage
- Configured in `next.config.ts` for remote images
- Pattern: `*.supabase.co/storage/v1/object/public/**`

**Offline Storage (Client-side):**
- Library: `idb` (IndexedDB wrapper)
- Implementation: `lib/db/offline-storage.ts`
- Database name: `hexos-offline`
- Stores:
  - Cached projects
  - Cached conversations/messages
  - Cached pulse data
  - Cached notifications
  - Pending mutations (offline queue)
  - Cached files

**Caching:**
- Client-side: IndexedDB for offline PWA support
- Server-side: None detected (relies on Supabase)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
- Implementation:
  - `lib/auth/actions.ts` - Server actions for sign in/out/up
  - `lib/auth/guards.ts` - Auth guards and role checks
  - `lib/auth/types.ts` - Role definitions
- Auth methods: Email/password
- Session: Cookie-based via `@supabase/ssr`
- Middleware: `middleware.ts` - Session refresh on all routes

**User Roles:**
```typescript
type UserRole = 'admin' | 'internal' | 'dev' | 'dfy' | 'client'
```

**Role-based access:**
- `requireAuth()` - Any authenticated user
- `requireRole(['admin', 'internal'])` - Specific roles
- `requireAdmin()` - Admin only
- RLS policies in Supabase enforce database-level access

## Monitoring & Observability

**Error Tracking:**
- Custom client-side: `lib/error-reporter.ts`
- API endpoint: `app/api/log-error/route.ts`
- Global handler: `components/global-error-handler.tsx`

**Activity Logging:**
- Implementation: `lib/logging/activity-logger.ts`
- Storage: `activity_logs` table in Supabase
- Categories: auth, ai, data, system
- Tracks: user actions, AI queries, CRUD operations
- Fire-and-forget pattern (non-blocking)

**Analytics:**
- Vercel Analytics via `@vercel/analytics`
- Integrated in root layout

**Logs:**
- Console logging for development
- Activity logs persisted to database

## CI/CD & Deployment

**Hosting:**
- Vercel (configured via `.mcp.json`)
- Project: `hexos` under `aymans-projects-eef8e702`

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, etc.)
- Likely using Vercel's automatic deployments

**Database Migrations:**
- Supabase CLI: `supabase db push`
- Migration files: `supabase/migrations/*.sql`

## Environment Configuration

**Required env vars:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Public anon key
SUPABASE_SERVICE_ROLE_KEY         # Admin service role key

# Stripe
STRIPE_SECRET_KEY                 # Server-side secret
STRIPE_WEBHOOK_SECRET             # Webhook signature verification
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY # Client-side publishable key

# OpenRouter (AI)
OPENROUTER_API_KEY                # AI API access

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY      # Web Push public key
VAPID_PRIVATE_KEY                 # Web Push private key

# App
NEXT_PUBLIC_APP_URL               # Base URL (e.g., https://hexos.app)
```

**Secrets location:**
- Local: `.env` file (gitignored)
- Production: Vercel environment variables

## Webhooks & Callbacks

**Incoming:**
- Stripe webhook: `app/api/webhooks/stripe/route.ts`
  - `checkout.session.completed` - Payment via Checkout
  - `invoice.paid` - Stripe hosted invoice paid
  - `invoice.payment_failed` - Payment failed
  - `payment_intent.succeeded` - Direct payment success

**Outgoing:**
- Push notifications: `lib/push/send-notification.ts`
  - Uses `web-push` library
  - VAPID authentication
  - Targets stored push subscriptions

## API Routes

**Public APIs:**
- `POST /api/push/subscribe` - Subscribe to push notifications
- `DELETE /api/push/subscribe` - Unsubscribe

**Internal APIs:**
- `POST /api/copilot` - AI form assistant
- `POST /api/log-error` - Error reporting
- `POST /api/parse-deliverables` - Parse deliverables from text

**Project APIs:**
- `GET/POST /api/projects/[id]/documents`
- `GET/POST /api/projects/[id]/expenses`
- `GET/POST /api/projects/[id]/invoices`
- `GET /api/projects/[id]/mentionables`
- `GET/POST /api/projects/[id]/milestones`

**Invoice APIs:**
- `GET/POST /api/invoices`
- `GET/PATCH /api/invoices/[id]`
- `POST /api/invoices/[id]/checkout` - Create Stripe checkout session
- `POST /api/invoices/[id]/send` - Send invoice
- `POST /api/invoices/[id]/void` - Void invoice

**Activity APIs:**
- `GET /api/activity-logs`
- `GET /api/activity-logs/export`

**Webhook Endpoints:**
- `POST /api/webhooks/stripe`

## Email

**Status:** Planned but not implemented
- File: `lib/api/email.ts`
- Planned provider: Resend
- Currently: Console logging only (stub implementation)
- Templates planned: invitation, application-received, application-approved, application-rejected

## Real-time Features

**Supabase Realtime:**
- Used for live updates on conversations, notifications
- Subscriptions managed through Supabase client

**Push Notifications:**
- Web Push API via `web-push` library
- Service worker: `public/sw-custom.js`
- Client manager: `lib/push/notifications.ts`
- Server sender: `lib/push/send-notification.ts`

---

*Integration audit: 2026-01-19*
