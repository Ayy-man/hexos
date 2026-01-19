# Stack Research: hexOS Feature Expansion

**Domain:** Project management SaaS feature additions
**Researched:** 2026-01-19
**Mode:** Ecosystem (Stack dimension)
**Overall confidence:** HIGH

---

## Executive Summary

This research covers the technology stack for adding four capabilities to hexOS: email delivery, in-app notifications UI, Gantt chart visualization, and scope monitoring. The existing codebase already has significant infrastructure in place (notifications table with Realtime, scope_changes table with baselines), so recommendations focus on completing these features with the right frontend libraries and email provider.

**Key finding:** The project already has `lib/api/email.ts` with Resend placeholder code and a fully-structured notifications table with Supabase Realtime enabled. This is additive work, not greenfield.

---

## 1. Email Delivery

### Recommendation: Resend + React Email

| Package | Version | Purpose |
|---------|---------|---------|
| `resend` | ^4.x | Email delivery API |
| `@react-email/components` | ^0.0.25+ | React-based email templates |

**Why Resend:**

1. **Already planned** - The codebase has `lib/api/email.ts` with Resend placeholder code and TODO comments
2. **React Email integration** - Build templates as React components, not HTML tables
3. **Modern DX** - First-class Next.js support with App Router
4. **Pricing** - Free tier: 100 emails/day (3,000/month), sufficient for SaaS invitation flows
5. **React Email 5.0** (November 2025) - Full React 19 + Next.js 16 compatibility

**Installation:**

```bash
npm install resend @react-email/components
```

**Integration notes for hexOS:**

- The existing `lib/api/email.ts` already defines the interface (`sendEmail`, `sendInvitationEmail`, etc.)
- Create email templates in `components/emails/` using React Email components
- Use Server Actions or API routes to send (both supported)
- Domain verification required in Resend dashboard before production

### Alternatives Considered

| Provider | Why Not |
|----------|---------|
| SendGrid | More complex setup, less React-native DX |
| Mailgun | Good option, but Resend already planned in codebase |
| Amazon SES | Too low-level for this use case, requires more infrastructure |
| Nodemailer | No delivery tracking, reliability concerns |

### React Email Template Components

React Email 4.0+ provides these components for building templates:

- `<Html>`, `<Head>`, `<Body>`, `<Container>` - Structure
- `<Text>`, `<Heading>`, `<Link>` - Content
- `<Button>` - CTAs
- `<Img>` - Images
- `<Section>`, `<Row>`, `<Column>` - Layout
- `<Preview>` - Email preview text

**Confidence:** HIGH - Official docs verified, existing codebase alignment confirmed

---

## 2. In-App Notifications

### Recommendation: Sonner (via shadcn/ui) + Supabase Realtime

The existing infrastructure is substantial:

- `notifications` table already exists with user targeting, type enum, and read tracking
- Supabase Realtime already enabled (`ALTER PUBLICATION supabase_realtime ADD TABLE notifications`)
- RLS policies in place for user-scoped access

**What's needed:** Frontend UI components only.

| Package | Version | Purpose |
|---------|---------|---------|
| `sonner` | ^1.7+ | Toast notifications (ephemeral) |
| shadcn/ui components | latest | Notification panel UI |

### Architecture: Two-Tier Notification System

**Tier 1: Toast Notifications (Sonner)**
- Immediate feedback for user actions
- Ephemeral (auto-dismiss)
- "Task created", "Changes saved", etc.

**Tier 2: Persistent Notifications (Custom UI + Supabase Realtime)**
- Bell icon with unread count
- Notification panel/drawer
- Reads from `notifications` table
- Real-time updates via Supabase subscription

### Sonner Installation (shadcn/ui)

```bash
npx shadcn@latest add sonner
```

**Setup in `app/layout.tsx`:**

```tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Usage:**

```tsx
import { toast } from "sonner"

// Basic
toast("Event created")

// With type
toast.success("Deliverable completed")
toast.error("Failed to save")
toast.warning("Approaching deadline")

// Promise (for async operations)
toast.promise(saveDeliverable(), {
  loading: "Saving...",
  success: "Saved successfully",
  error: "Failed to save"
})
```

### Supabase Realtime Subscription Pattern

```tsx
useEffect(() => {
  const channel = supabase
    .channel('user:notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        // Show toast for new notification
        toast(payload.new.title)
        // Update notification count
        refetchNotifications()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [userId])
```

### What NOT to Use

| Library | Why Avoid |
|---------|-----------|
| react-toastify | Heavier, shadcn/ui already integrates Sonner |
| notistack | Material-UI focused, not aligned with shadcn/ui |
| Third-party notification services (Knock, MagicBell, Novu) | Overkill - existing Supabase infrastructure is sufficient |

**Confidence:** HIGH - Existing table structure verified, Sonner is shadcn/ui standard

---

## 3. Gantt Charts

### Recommendation: SVAR React Gantt (Open Source Edition)

| Package | Version | Purpose |
|---------|---------|---------|
| `@svar-ui/react-gantt` | ^2.4+ | Gantt chart visualization |

**Why SVAR React Gantt:**

1. **MIT License** - Free for commercial use, no licensing complexity
2. **React 18/19 compatible** - Works with hexOS stack
3. **TypeScript support** - Full type definitions (since v2.3)
4. **Core features included free:**
   - Interactive timeline with drag-and-drop
   - Task dependencies (finish-to-start, etc.)
   - Customizable grid columns
   - Task editing via double-click
5. **Matches existing data model** - `deliverables` table has `start_date`, `due_date`, `status`, `sort_order`

**Installation:**

```bash
npm install @svar-ui/react-gantt
```

**Basic usage:**

```tsx
import { Gantt } from "@svar-ui/react-gantt"
import "@svar-ui/react-gantt/all.css"

// Map deliverables to Gantt tasks
const tasks = deliverables.map(d => ({
  id: d.id,
  text: d.title,
  start: new Date(d.start_date),
  end: new Date(d.due_date),
  progress: d.status === 'done' ? 100 : d.status === 'in_progress' ? 50 : 0,
}))

<Gantt tasks={tasks} />
```

### Data Model Alignment

Existing `deliverables` table fields map directly:

| Gantt Concept | hexOS Field |
|---------------|-------------|
| Task ID | `deliverables.id` |
| Task name | `deliverables.title` |
| Start date | `deliverables.start_date` |
| End date | `deliverables.due_date` |
| Progress | Derived from `deliverables.status` |
| Dependencies | Need new `deliverable_dependencies` table |

### Missing: Dependencies Table

To enable dependency arrows in Gantt, add a junction table:

```sql
CREATE TABLE deliverable_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'finish_to_start', -- finish_to_start, start_to_start, etc.
  UNIQUE(deliverable_id, depends_on_id)
);
```

### Alternatives Considered

| Library | Pros | Cons | Verdict |
|---------|------|------|---------|
| SVAR React Gantt | MIT, React-native, TypeScript | PRO features require license | **Recommended** |
| Frappe Gantt | Very lightweight, MIT | Thin React wrapper, less maintained | Good for simple cases |
| Bryntum Gantt | Enterprise features, excellent | $699+/dev/year | Overkill for MVP |
| DHTMLX Gantt | Feature-rich, mature | $599+/dev, complex API | Enterprise only |
| Syncfusion | Comprehensive | $995+/year, heavy bundle | Enterprise only |

### PRO Edition (Future Consideration)

SVAR PRO ($299/year) adds:
- Auto-scheduling (respects dependencies)
- Critical path calculation
- Baselines (compare planned vs actual)
- Working days calendar

Consider upgrading if users request these features.

**Confidence:** HIGH - Official docs verified, data model compatibility confirmed

---

## 4. Scope Monitoring

### Recommendation: Use Existing Infrastructure + Add UI

The scope monitoring system is already built in the database:

**Existing tables (from migration `20260110000010_scope_monitoring_system.sql`):**

- `scope_baselines` - Captures deliverable snapshot at sign-off
- `scope_changes` - Tracks individual changes (hours_delta, cost_delta, etc.)
- `scope_change_comments` - Discussion threads on changes

**Existing functions:**
- `capture_scope_baseline(project_id, user_id)` - Creates baseline
- `get_active_baseline(project_id)` - Retrieves baseline
- `get_scope_metrics(project_id)` - Returns change counts and deltas
- `has_scope_baseline(project_id)` - Boolean check

### What's Needed: Frontend Components Only

No new packages required. Build UI components that:

1. **Capture baseline** - Call `capture_scope_baseline` when project enters "signed_off" status
2. **Display baseline comparison** - Show deliverables_snapshot vs current deliverables
3. **Change request workflow** - UI for creating/reviewing scope_changes
4. **Dashboard metrics** - Display `get_scope_metrics` results

### Recommended UI Components

```tsx
// Scope Health Indicator
<ScopeHealthBadge projectId={id} />
// Shows: "Baseline set" or "X pending changes" or "Scope healthy"

// Scope Change List
<ScopeChangeList projectId={id} />
// Shows pending/approved/rejected changes with delta info

// Baseline Diff View
<BaselineDiff projectId={id} />
// Side-by-side comparison of baseline vs current deliverables

// Scope Metrics Summary
<ScopeMetricsSummary projectId={id} />
// Cards showing: total changes, hours delta, cost delta
```

### Change Detection Patterns

The existing `scope_change_trigger` enum includes:
- `hours_increased`
- `deliverable_added`
- `deliverable_removed`

Trigger detection via:
1. **Database triggers** - Auto-create scope_change on deliverable UPDATE/INSERT/DELETE after baseline
2. **Application logic** - Compare against baseline on save, prompt for change request

**Recommended approach:** Application logic for user-facing changes (they can add context/justification), database triggers for audit trail.

**Confidence:** HIGH - Existing schema verified, functions tested

---

## 5. Integration Notes

### Package Installation Summary

```bash
# Email
npm install resend @react-email/components

# Notifications (Sonner via shadcn)
npx shadcn@latest add sonner

# Gantt
npm install @svar-ui/react-gantt
```

### Environment Variables

Add to `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxx
```

### File Structure Recommendations

```
components/
  emails/                    # React Email templates
    invitation.tsx
    application-approved.tsx
    notification-digest.tsx
  notifications/             # Notification UI
    notification-bell.tsx
    notification-panel.tsx
    notification-item.tsx
  gantt/                     # Gantt chart components
    project-gantt.tsx
    gantt-toolbar.tsx
  scope/                     # Scope monitoring UI
    scope-health-badge.tsx
    baseline-diff.tsx
    scope-change-list.tsx
    scope-metrics-summary.tsx
```

### Supabase Realtime Considerations

Already enabled for `notifications` table. Consider also enabling for:

```sql
-- Real-time scope changes (for multi-user visibility)
ALTER PUBLICATION supabase_realtime ADD TABLE scope_changes;
```

### Performance Notes

1. **Gantt with large datasets** - SVAR handles thousands of tasks, but consider pagination for projects with 100+ deliverables
2. **Notification queries** - Index on `(user_id, read_at)` already exists for unread queries
3. **Scope baseline snapshots** - JSONB storage is efficient but consider archival for very old baselines

---

## Stack Summary Table

| Capability | Technology | Status | Confidence |
|------------|------------|--------|------------|
| Email Delivery | Resend + React Email | New install | HIGH |
| Toast Notifications | Sonner (shadcn/ui) | New install | HIGH |
| Persistent Notifications | Supabase Realtime + Custom UI | Infra exists, need UI | HIGH |
| Gantt Charts | SVAR React Gantt | New install | HIGH |
| Scope Monitoring | Custom UI | Infra exists, need UI | HIGH |

---

## What NOT to Add

| Category | Don't Use | Why |
|----------|-----------|-----|
| Email | Nodemailer + SMTP | No delivery tracking, reliability issues |
| Email | Third-party templates (MJML) | React Email is simpler, React-native |
| Notifications | Knock/MagicBell/Novu | Overkill when Supabase Realtime exists |
| Notifications | react-toastify | Not aligned with shadcn/ui |
| Gantt | Bryntum/DHTMLX/Syncfusion | Enterprise pricing, too complex |
| Gantt | frappe-gantt | Less maintained React wrappers |
| Scope | External audit services | Existing Supabase infrastructure is sufficient |

---

## Sources

### Email Delivery
- [Resend Next.js Documentation](https://resend.com/docs/send-with-nextjs)
- [React Email Components](https://www.npmjs.com/package/@react-email/components)
- [Top Transactional Email Services 2026 - Knock](https://knock.app/blog/the-top-transactional-email-services-for-developers)

### In-App Notifications
- [Sonner - shadcn/ui](https://ui.shadcn.com/docs/components/sonner)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Top React Notification Libraries 2026 - Knock](https://knock.app/blog/the-top-notification-libraries-for-react)

### Gantt Charts
- [SVAR React Gantt Documentation](https://docs.svar.dev/react/gantt/getting_started/)
- [SVAR React Gantt GitHub](https://github.com/svar-widgets/react-gantt)
- [Top React Gantt Chart Libraries Compared 2026](https://svar.dev/blog/top-react-gantt-charts/)
- [Best JavaScript Gantt Chart Libraries 2025-2026](https://www.anychart.com/blog/2025/11/05/best-javascript-gantt-chart-libraries/)

### Scope Monitoring
- [Supabase Audit Extension (supa_audit)](https://supabase.com/blog/postgres-audit)
- [Project Scope Management Best Practices](https://www.ppm.express/blog/scope-creep)
- Internal: `supabase/migrations/20260110000010_scope_monitoring_system.sql`

---

*Research completed: 2026-01-19*
