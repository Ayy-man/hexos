# Research Summary

**Project:** hexOS Feature Expansion
**Domain:** Project Management SaaS (Notifications, Email, Gantt, Scope Monitoring)
**Researched:** 2026-01-19
**Confidence:** HIGH

## Executive Summary

hexOS is expanding four capabilities: email delivery, in-app notification UI, Gantt chart visualization, and scope monitoring. The key finding is that this is **additive work, not greenfield**. The codebase already has substantial infrastructure in place: a `notifications` table with Supabase Realtime enabled, a `lib/api/email.ts` module with Resend placeholder code, a fully-built scope monitoring system with baseline capture and approval workflows, and a deliverables data model that maps directly to Gantt requirements.

The recommended approach is to complete and integrate what exists rather than rebuild. Email needs Resend activation and React Email templates. Notifications need frontend UI components (bell icon, notification panel) and email channel integration. Gantt is a new visualization layer on existing deliverable data using SVAR React Gantt (MIT licensed). Scope monitoring needs UI polish and integration with the Gantt baseline overlay.

The primary risks are **notification fatigue** (users ignoring critical alerts if volume is too high), **email deliverability failures** (missing SPF/DKIM/DMARC causing spam classification), and **Gantt performance collapse** (rendering issues with 100+ tasks). Mitigation requires implementing priority tiers and preferences from day one, establishing email authentication before any production sends, and using virtualization in the Gantt implementation.

---

## Recommended Stack

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Resend + React Email** | Email delivery | Already planned in codebase (`lib/api/email.ts`), React-native templates, free tier sufficient |
| **Sonner (shadcn/ui)** | Toast notifications | Standard shadcn/ui integration, ephemeral feedback for user actions |
| **Supabase Realtime** | Persistent notifications | Already enabled for `notifications` table, no new infrastructure needed |
| **SVAR React Gantt** | Timeline visualization | MIT license, TypeScript support, React 19 compatible, ~50KB bundle |

**Installation summary:**
```bash
npm install resend @react-email/components @svar-ui/react-gantt
npx shadcn@latest add sonner
```

**What NOT to add:**
- No third-party notification services (Knock, MagicBell, Novu) - Supabase Realtime is sufficient
- No enterprise Gantt libraries (Bryntum, DHTMLX, Syncfusion) - overkill for MVP
- No Nodemailer/SMTP - use Resend for delivery tracking and reliability

---

## Feature Priorities

### Table Stakes (Must Have)

**Notifications:**
- Bell icon notification center with unread count badge
- Task assignment, @mention, comment, status change notifications
- Mark as read/unread, clear all functionality
- Basic notification filtering

**Email:**
- Email notification toggle (per-type preferences)
- Assignment and @mention emails with context
- Unsubscribe link (legal requirement)
- Daily/weekly digest option

**Gantt:**
- Timeline visualization with horizontal task bars
- Drag-and-drop date adjustment
- Zoom levels (day/week/month)
- Today line and milestone markers

**Scope Monitoring:**
- Activity log per deliverable with attribution
- Baseline capture at project sign-off
- Change tracking with pending/approved/rejected status

### Differentiators (Nice to Have)

- Notification presets (Focused, Mentions-only)
- Snooze notifications for later
- Smart grouping ("5 comments on Task X")
- Baseline vs current overlay in Gantt
- Critical path highlighting
- Auto-reschedule dependents when dates change
- Scope change impact estimates (timeline/budget)

### Anti-Features (Don't Build)

- **Don't notify on everything by default** - leads to users disabling all notifications
- **Don't mix transactional and marketing email** - use separate infrastructure
- **Don't render all Gantt tasks without virtualization** - causes performance collapse
- **Don't require approval for every change** - kills adoption; tier by change size

---

## Architecture Highlights

The architecture extends existing patterns rather than introducing new paradigms. The notification pipeline already flows from event triggers through `createNotification()` to Supabase Realtime to the UI. The enhancement adds an email channel that checks user preferences and queues emails to an `email_queue` table, processed by a Supabase Edge Function calling Resend.

**Major components:**

1. **Notification Pipeline** - `createNotification()` dispatches to in-app (Realtime), push, and email channels based on user preferences
2. **Email Queue** - `email_queue` table with Edge Function processing (reliable delivery with retry logic)
3. **Gantt View** - SVAR React Gantt wrapper transforming deliverables to Gantt tasks
4. **Scope Monitoring** - Already built: `scope_baselines`, `scope_changes`, `scope_change_comments` tables with RPC functions

**Data flow integration:**
- Deliverables table is central - feeds Gantt view, Hill Chart, and scope monitoring
- Scope changes trigger notifications which can trigger emails
- Gantt can show baseline overlay from `scope_baselines` table

---

## Critical Pitfalls to Avoid

1. **Notification Fatigue** - Users drown in alerts, then ignore critical ones. **Prevention:** Implement priority tiers (critical/high/normal/low) from day one, batch non-urgent notifications into digests, make every notification actionable.

2. **Email Deliverability Failures** - Missing authentication causes emails to land in spam. **Prevention:** Set up SPF, DKIM, DMARC before any production email sends. Use subdomain (mail.hexos.com) to isolate reputation. Monitor deliverability metrics.

3. **Gantt Performance Collapse** - Rendering 100+ tasks blocks UI. **Prevention:** Implement row and column virtualization from day one. Set performance budget (<1s load for 500 tasks). Use Web Workers for dependency calculations.

4. **Role-Based Notification Leakage** - Users receive notifications for events they shouldn't see. **Prevention:** Every notification carries tenant_id and user_id. Check permissions at delivery time, not just creation. Use same RLS patterns as data queries (given prior RLS crisis).

5. **Scope Monitoring False Positives** - System flags legitimate changes as "creep," causing teams to ignore all alerts. **Prevention:** Build change request workflow before monitoring. Distinguish approved changes from unauthorized additions. Allow per-project sensitivity settings.

---

## Build Order Recommendation

### Phase 1: Email Infrastructure
**Rationale:** Email is foundational - notification emails, invitation emails, and digests all depend on it. Currently a TODO stub.
**Delivers:** Working Resend integration, React Email templates, email queue with retry logic
**Uses:** Resend, React Email, Supabase Edge Function
**Avoids:** Deliverability failures by setting up authentication before any sends

### Phase 2: Notification Email Channel
**Rationale:** Builds on Phase 1, completes the notification pipeline with email delivery.
**Delivers:** Notification-to-email flow, user preferences for email vs in-app, digest functionality
**Implements:** `shouldSendEmail()` check in `createNotification()`, preference UI enhancements

### Phase 3: Gantt Visualization
**Rationale:** Independent of email work, can parallelize with Phase 2. Data model already exists.
**Delivers:** GanttTab component with timeline view, drag-to-edit, zoom controls
**Uses:** SVAR React Gantt, existing deliverables data
**Avoids:** Performance collapse through virtualization from day one

### Phase 4: Scope Monitoring Polish
**Rationale:** Depends on Phase 3 for Gantt baseline overlay. Scope infrastructure already exists, needs UI completion.
**Delivers:** Polished ScopeTab, baseline vs current comparison view, Gantt baseline overlay
**Avoids:** False positives by ensuring change request workflow is in place

### Phase Dependencies

```
Phase 1 (Email)
    |
    v
Phase 2 (Notification Email)
    |
    +-----> Phase 3 (Gantt) [can parallelize]
    |              |
    v              v
         Phase 4 (Scope Polish)
```

---

## Key Insights

1. **This is completion work, not new architecture.** The codebase has scaffolding for all four features. The work is activation, integration, and UI completion.

2. **Role-aware design is non-negotiable.** Given the prior RLS crisis, every feature must carry tenant and role context through all operations. Don't bypass RLS for "performance."

3. **Email authentication before production sends.** SPF/DKIM/DMARC must be configured before any emails go out. This is a prerequisite, not an afterthought.

4. **Gantt virtualization from day one.** Projects with many deliverables will hit performance issues quickly. Design for 500+ task performance, not 50.

5. **Scope monitoring needs the change request workflow.** Monitoring without formal change process creates false positives and alert fatigue. The change request workflow is already built - ensure it's integrated.

6. **Prefer existing infrastructure.** Supabase Realtime over third-party notification services. Existing scope tables over new audit systems. Resend (already planned) over alternative email providers.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified, existing codebase alignment confirmed |
| Features | HIGH | Verified against ClickUp, Asana, Monday.com, Linear documentation |
| Architecture | HIGH | Existing patterns well-understood, extension path clear |
| Pitfalls | HIGH | Multiple sources per pitfall, hexOS-specific concerns documented |

**Overall confidence:** HIGH

### Gaps to Address

- **Gantt library validation:** SVAR chosen based on web research; validate with actual implementation that it meets needs
- **Email deliverability monitoring:** Need to set up monitoring dashboard (Resend provides this, just needs configuration)
- **Notification volume testing:** Load test real-time notifications before launch to verify scaling strategy

---

## Sources

### Stack Research
- [Resend Next.js Documentation](https://resend.com/docs/send-with-nextjs)
- [React Email Components](https://www.npmjs.com/package/@react-email/components)
- [Sonner - shadcn/ui](https://ui.shadcn.com/docs/components/sonner)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [SVAR React Gantt Documentation](https://docs.svar.dev/react/gantt/getting_started/)
- [SVAR React Gantt GitHub](https://github.com/svar-widgets/react-gantt)

### Features Research
- [ClickUp Notification Settings](https://help.clickup.com/hc/en-us/articles/6325918957335-Notification-settings)
- [Asana Notification Settings](https://help.asana.com/s/article/notification-settings?language=en_US)
- [Monday.com Notifications](https://support.monday.com/hc/en-us/articles/360001292545-Notifications-explained)
- [Linear Notifications](https://linear.app/docs/notifications)
- [ClickUp Gantt Chart View](https://clickup.com/features/gantt-chart-view)
- [Asana Gantt View](https://help.asana.com/s/article/gantt-view?language=en_US)

### Pitfalls Research
- [SuprSend: Understanding Alert Fatigue](https://www.suprsend.com/post/alert-fatigue)
- [Security Boulevard: Google Email Deliverability](https://securityboulevard.com/2025/11/google-email-deliverability-how-to-avoid-spam-folders/)
- [Syncfusion: Gantt Chart Virtualization](https://blazor.syncfusion.com/documentation/gantt-chart/virtualization)
- [Asana: What is Scope Creep](https://asana.com/resources/what-is-scope-creep)

---

*Synthesized: 2026-01-19*
*Ready for roadmap: yes*
