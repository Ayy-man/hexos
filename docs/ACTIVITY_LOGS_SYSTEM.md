# Activity Logs System

Comprehensive audit trail and error tracking for hexOS.

## Overview

The activity logs system provides:
- **Audit Trail**: Track all user actions across the system
- **Error Tracking**: Capture client-side and server-side errors
- **AI Usage Monitoring**: Log copilot queries with token usage and latency
- **Admin Dashboard**: View, filter, search, and export logs

## Access

- **URL**: `/admin/activity-log`
- **Navigation**: Settings → Administration → Activity Log
- **Permissions**: Admin and Internal users only

## Database Schema

### Table: `activity_logs`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| timestamp | TIMESTAMPTZ | When the event occurred |
| user_id | UUID | Reference to profiles |
| user_email | TEXT | User's email |
| user_role | TEXT | User's role at time of action |
| session_id | TEXT | Browser session identifier |
| action | TEXT | Action name (e.g., `auth.login`) |
| category | ENUM | Category of action |
| entity_type | TEXT | Type of entity (project, invoice, etc.) |
| entity_id | UUID | ID of the affected entity |
| entity_name | TEXT | Human-readable entity name |
| metadata | JSONB | Additional context |
| changes | JSONB | Before/after values for updates |
| ai_model | TEXT | AI model used |
| ai_prompt | TEXT | User's prompt |
| ai_response | TEXT | AI's response |
| ai_tokens_used | INTEGER | Token count |
| ai_latency_ms | INTEGER | Response time |
| ip_address | INET | Client IP |
| user_agent | TEXT | Browser user agent |
| request_path | TEXT | API endpoint |
| request_method | TEXT | HTTP method |
| duration_ms | INTEGER | Operation duration |
| error_stack | TEXT | Error stack trace |
| error_component | TEXT | React component that errored |
| browser | TEXT | Detected browser |
| os | TEXT | Detected OS |
| screen_size | TEXT | Client screen dimensions |

### Categories

- `crud` - Data operations (create, update, delete)
- `auth` - Authentication events (login, logout, invite)
- `ai` - Copilot queries and suggestions
- `payment` - Invoice and payout events
- `conversation` - Messages and threads
- `status` - Status changes
- `file` - File uploads/downloads
- `error` - Client and server errors

## Usage

### Server-Side Logging

```typescript
import { activityLogger } from '@/lib/logging/activity-logger'

// Auth events
activityLogger.auth.login(userId, email, role)
activityLogger.auth.logout(userId, email)

// CRUD operations
activityLogger.crud.create(userId, email, role, 'project', projectId, projectName)
activityLogger.crud.update(userId, email, role, 'invoice', invoiceId, invoiceNumber, {
  status: { old: 'draft', new: 'sent' }
})

// Payment events
activityLogger.payment.invoiceCreated(userId, email, invoiceId, invoiceNumber, amount, clientName)
activityLogger.payment.payoutApproved(userId, email, payoutId, amount, recipientEmail)

// AI events
activityLogger.ai.query(userId, email, prompt, response, model, tokens, latencyMs)

// Status changes
activityLogger.status.change(userId, email, role, 'project', projectId, projectName, 'active', 'completed')
```

### Client-Side Error Reporting

```typescript
import { reportError, reportComponentError } from '@/lib/error-reporter'

// General errors
reportError(error, 'user_action', { context: 'details' })

// React error boundaries
reportComponentError(error, errorInfo, 'ComponentName')
```

### Global Error Handling

The app automatically captures:
- Unhandled promise rejections
- Runtime JavaScript errors
- React component errors (via ErrorBoundary)

These are configured in `app/layout.tsx`:
```tsx
<GlobalErrorHandler />
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

## API Endpoints

### GET `/api/activity-logs`

Fetch logs with filtering and pagination.

**Query Parameters:**
- `entity_type` - Filter by entity type
- `entity_id` - Filter by entity ID
- `category` - Filter by category
- `user_id` - Filter by user (admin only for other users)
- `search` - Full-text search
- `from_date` - Start date (ISO string)
- `to_date` - End date (ISO string)
- `limit` - Results per page (max 200)
- `offset` - Pagination offset

### GET `/api/activity-logs/export`

Export logs as CSV, JSON, or JSONL.

**Query Parameters:**
- `format` - `csv`, `json`, or `jsonl`
- `from` - Start date
- `to` - End date

### POST `/api/log-error`

Log client-side errors.

**Body:**
```json
{
  "message": "Error message",
  "stack": "Stack trace",
  "action": "user_action",
  "component": "ComponentName",
  "context": {}
}
```

## Admin Dashboard Features

- **Stats Cards**: Total logs, today's count, AI queries, errors
- **Filters**: Search, category, user, entity type
- **Expandable Rows**: View full details including:
  - AI prompts and responses
  - Change diffs (old → new values)
  - Error stack traces
  - Request metadata
- **Export**: Download logs in CSV, JSON, or JSONL format

## Database Functions

### `get_activity_log_stats()`

Returns dashboard statistics:
- Total log count
- Today's log count
- Logs by category
- Top 10 users by activity

### `archive_old_activity_logs(days_to_keep)`

Delete logs older than specified days (default 90).

## RLS Policies

- **Admin/Internal**: Full access to all logs
- **Regular Users**: Can view own activity and activity for accessible projects
- **Service Role**: Can insert logs (for server-side logging)

## Files

```
lib/
├── logging/
│   ├── activity-logger.ts    # Server-side logging utilities
│   └── request-context.ts    # Request context extraction
├── api/
│   └── activity-logs.ts      # Data fetching functions
├── types/
│   └── activity-logs.ts      # TypeScript types
└── error-reporter.ts         # Client-side error reporting

app/
├── api/
│   ├── activity-logs/
│   │   ├── route.ts          # GET logs endpoint
│   │   └── export/route.ts   # Export endpoint
│   └── log-error/route.ts    # Error logging endpoint
└── (dashboard)/
    └── admin/
        └── activity-log/page.tsx

components/
├── error-boundary.tsx        # React error boundary
├── global-error-handler.tsx  # Global JS error handler
└── shared/
    └── EntityActivityTab.tsx # Reusable activity timeline

features/
└── admin/
    └── activity-log/
        └── components/
            ├── ActivityLogContent.tsx
            └── ExportDialog.tsx

supabase/migrations/
└── 20260110000001_activity_logs_system.sql
```

## Required Grants

If logs aren't appearing, ensure these grants are applied:

```sql
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON activity_logs TO service_role;
GRANT SELECT ON profiles TO service_role;
```
