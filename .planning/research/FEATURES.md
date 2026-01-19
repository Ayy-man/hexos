# Features Research: PM Tool Capabilities

**Domain:** Project Management Portal (Notifications, Email, Gantt, Scope Monitoring)
**Researched:** 2026-01-19
**Confidence:** HIGH (verified against ClickUp, Asana, Monday.com, Linear documentation)

---

## Notifications - In-App

### Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Bell icon notification center | Universal PM convention, single place to check updates | Low | All tools have this - users will look for it |
| Unread count badge | Visual indicator of pending items | Low | Red dot or number on bell icon |
| Task assignment notifications | Must know when work is assigned to you | Low | Core workflow requirement |
| @mention notifications | Standard collaboration pattern | Low | Users expect to be able to tag others |
| Comment notifications | Collaboration requires knowing when responses arrive | Low | On tasks user created, is assigned to, or watching |
| Due date reminders | Deadline awareness prevents missed dates | Medium | Configurable lead time (1 day, same day) |
| Status change notifications | Know when work moves forward | Low | Especially for blocking dependencies |
| Mark as read/unread | Inbox management capability | Low | Individual and bulk actions |
| Clear all/mark all read | Batch inbox management | Low | Quality of life feature |
| Notification filtering | Find specific notification types | Low | By type, by project, by person |

### Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Notification presets (Focused, Mentions-only) | One-click noise reduction | Medium | ClickUp offers this - reduces setup burden |
| Snooze notifications | Temporarily hide, resurface later | Medium | Linear feature - prevents losing important items |
| Smart grouping | Combine similar notifications | Medium | "5 comments on Task X" vs 5 separate items |
| Notification scheduling | Pause during off-hours | Medium | Respect work-life boundaries |
| Quick actions from notification | Mark complete, reply without opening | Medium | Reduces context switching |
| Auto-watch controls | Configure what auto-subscribes you | Low | ClickUp - "only when I comment" vs "all I create" |
| Project/board mute | Visibility without notifications | Low | Monday.com feature - watch without noise |
| Critical path alerts | Notify when blocking tasks slip | High | Proactive project health warnings |
| SLA breach notifications | Alert when commitments at risk | High | Linear has this for urgent items |

### Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Notify on everything by default | Users drown in notifications, disable entirely | Start with focused defaults, let users add more |
| No notification preferences | One-size-fits-all fails everyone | Per-channel, per-type configuration minimum |
| Real-time only | Some updates don't need immediate attention | Offer digest/batching options |
| Desktop popups without consent | Disruptive, leads to disabling all notifications | Ask permission, provide value before requesting |
| Notification-only approach | Users miss context when they check later | Deep link to relevant content |

---

## Notifications - Email

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Email notification toggle | Control email separately from in-app | Low | Users want in-app but not email, or vice versa |
| Assignment emails | Critical - how users know they have work | Low | Include task details, due date, link |
| @mention emails | Standard collaboration expectation | Low | Include comment context |
| Due date reminder emails | Not everyone lives in the app | Low | Configurable timing |
| Unsubscribe link | Legal requirement, user respect | Low | Required by CAN-SPAM, GDPR |
| Email preferences page | Central place to configure all email settings | Medium | Per-type toggles at minimum |
| Daily/weekly digest option | Alternative to individual emails | Medium | Aggregate updates into one email |
| "Don't email if already read" | Prevent redundant emails | Medium | Linear does this - huge noise reduction |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-project email frequency | Different projects have different urgency | Medium | Instant for active project, weekly for background |
| Urgency-based timing | Critical items immediate, others batched | Medium | Linear: urgent issues email immediately |
| Work hours email scheduling | Low priority emails wait until morning | Medium | Linear delays low-priority outside 8am-6pm |
| Rich email actions | Reply-by-email to add comments | High | Reduces friction to respond |
| Email threading | Related updates in same thread | Medium | Gmail/Outlook threading support |
| Customizable digest content | Choose what appears in summary emails | Medium | Filter by project, type, importance |
| Smart summary (AI) | Natural language email summaries | High | "3 tasks completed, 2 need attention" |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Email on every change | Inbox flood leads to ignoring all emails | Sensible defaults, batching options |
| 30+ minute delay always | Time-sensitive updates arrive too late | Configurable delay with immediate option for critical |
| No way to disable | Users unsubscribe at email provider level, lose everything | Global email off switch |
| Marketing mixed with transactional | Users unsubscribe from all | Separate email types, separate preferences |
| No context in email | "Task updated" without what/how | Include relevant details inline |

---

## Gantt/Timeline Views

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Timeline visualization | Core purpose of Gantt view | Medium | Tasks as horizontal bars on timeline |
| Drag-and-drop date adjustment | Direct manipulation expectation | Medium | Move bar = change dates |
| Resize to change duration | Intuitive duration editing | Medium | Drag edge = extend/shorten |
| Zoom levels (day/week/month) | View appropriate time horizon | Medium | At minimum: week, month, quarter |
| Task dependencies (lines) | Show task relationships | High | Visual arrows between dependent tasks |
| Dependency creation via drag | Quick dependency setup | Medium | Drag from one task to another |
| Milestone markers | Visualize key dates | Low | Diamond or other distinct shape |
| Today line | Orientation in timeline | Low | Vertical line showing current date |
| Scroll/pan navigation | Navigate large timelines | Medium | Horizontal scroll, click-drag pan |
| Task names visible | Know what each bar represents | Low | Label on or near bar |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Baseline snapshots | Compare planned vs actual | High | Monday.com feature - captures original plan |
| Critical path highlighting | See what affects end date | High | ClickUp feature - identifies schedule risk |
| Slack time visualization | See who has capacity | High | ClickUp feature - identifies available time |
| Auto-reschedule dependents | Cascading date updates | High | Move parent = children follow |
| Progress bars on tasks | Visual completion indicator | Medium | Percentage complete overlay |
| Resource/assignee grouping | See workload by person | Medium | Group rows by assignee |
| Multiple dependency types | Finish-to-start, start-to-start, etc. | High | Most tools only support finish-to-start |
| Lag/lead time on dependencies | Gap or overlap between tasks | High | Monday.com supports this |
| Timeline + other view sync | Same data, different views | Medium | Changes in Gantt reflect in list/board |
| Print/export timeline | Share with stakeholders | Medium | PDF export for reports |
| Portfolio/multi-project view | See across projects | High | Cross-project timeline |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Read-only timeline | Users expect to edit directly | Enable drag/drop editing |
| Over-complicated UI | Gantt already complex enough | Progressive disclosure, hide advanced features |
| No task detail access | Can't see full task from timeline | Click to open task detail |
| Mandatory date entry | Not all tasks have dates | Allow tasks without dates, just don't show on Gantt |
| Auto-assign everything | Timeline doesn't need every task | Let users choose what appears |
| Gantt as only view | Some work doesn't need timeline | Offer board/list alternatives |

---

## Scope Monitoring

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Activity log per task | See what changed and when | Medium | All PM tools have this |
| Change attribution | Know WHO made changes | Low | Username + timestamp |
| Task history | Timeline of task modifications | Medium | Status changes, date changes, assignee changes |
| Comment thread on tasks | Document decisions and discussions | Low | Context for why changes happened |
| Deliverable/task count tracking | See scope by numbers | Low | X tasks created, Y completed |
| Basic filtering by date | See what changed in time period | Low | This week's changes, this month |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Workspace/project audit log | Security and compliance visibility | High | Enterprise feature in most tools |
| Change request workflow | Formal approval before scope changes | High | Submit request -> review -> approve/deny |
| Scope change alerts | Proactive notification of new work | Medium | "5 new tasks added to project" |
| Baseline comparison | Planned vs current scope delta | High | What was added/removed since baseline |
| Impact analysis | Understand change consequences | High | "Adding this will extend project by 2 weeks" |
| Version snapshots | Point-in-time project state | High | Restore or compare to previous versions |
| Change categorization | Classify changes (bug, enhancement, etc.) | Medium | Understand WHY scope is changing |
| Client-visible change log | Transparency with stakeholders | Medium | Filtered view for external users |
| Approval workflows | Require sign-off before proceeding | High | Multi-step approval with notifications |
| Cost/time impact tracking | Quantify scope changes | High | "$X added, Y hours added" |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| No history at all | Can't understand how project evolved | Minimum: activity log per task |
| Over-bureaucratic change process | Slows down legitimate work | Right-size approval for project type |
| History that can be edited | Undermines audit integrity | Append-only activity logs |
| Surveillance feeling | Tracking every keystroke | Focus on meaningful changes, not minutiae |
| Scope lock (no changes allowed) | Projects need to evolve | Track changes, don't prevent them |
| Complex approval for all changes | Not every edit needs approval | Approval only for defined scope changes |

---

## Cross-Cutting Recommendations for hexOS

### Priority Order for Implementation

Based on PM tool patterns and hexOS context (DFY business with clients, partners, internal team):

**Phase 1 - Notification Foundation:**
1. Bell icon with unread count
2. Core triggers: assignment, @mention, comment, status change
3. Mark read/unread, clear all
4. Basic email notifications with toggle

**Phase 2 - Notification Refinement:**
1. Per-channel preferences (in-app vs email)
2. Notification filtering
3. "Don't email if already read"
4. Daily digest option

**Phase 3 - Timeline/Gantt:**
1. Timeline visualization with drag-drop
2. Dependencies with visual lines
3. Milestones
4. Zoom levels

**Phase 4 - Scope Monitoring:**
1. Activity log per deliverable
2. Change attribution
3. Client-visible change log (filtered)
4. Scope change alerts

### Role-Based Considerations

| Role | Primary Notification Needs | Gantt Access | Scope Monitoring |
|------|---------------------------|--------------|------------------|
| Admin | All project activity, approval requests | Full access | Full audit log |
| Internal | Assigned work, @mentions | View + edit own | Project activity |
| Dev | Task assignments, blockers | View timeline | Task history |
| DFY Partner | Their project updates | View timeline | Limited to their work |
| Client | Key milestones, deliverable status | View only | Deliverable history |

### Anti-Patterns Specific to hexOS Context

1. **Don't expose internal discussions to clients** - Filter activity logs by role
2. **Don't overwhelm clients with dev-level detail** - Summary notifications only
3. **Don't require approval for internal adjustments** - Reserve approval for scope changes visible to client
4. **Don't show all projects to all users** - Role-based project visibility

---

## Sources

### Notification Systems
- [ClickUp Notification Settings](https://help.clickup.com/hc/en-us/articles/6325918957335-Notification-settings) - HIGH confidence
- [ClickUp Smart Notifications](https://clickup.com/manage-your-notifications) - HIGH confidence
- [Asana Notification Settings](https://help.asana.com/s/article/notification-settings?language=en_US) - HIGH confidence
- [Asana Email Notifications](https://asana.com/guide/help/email/email-from-asana) - HIGH confidence
- [Monday.com Notifications Explained](https://support.monday.com/hc/en-us/articles/360001292545-Notifications-explained) - HIGH confidence
- [Monday.com Email Notifications](https://support.monday.com/hc/en-us/articles/115005319529-Email-notifications) - HIGH confidence
- [Linear Notifications](https://linear.app/docs/notifications) - HIGH confidence
- [Linear Project Notifications](https://linear.app/docs/project-notifications) - HIGH confidence
- [Linear Inbox](https://linear.app/docs/inbox) - HIGH confidence

### Gantt/Timeline Views
- [ClickUp Gantt Chart View](https://clickup.com/features/gantt-chart-view) - HIGH confidence
- [ClickUp Create Gantt View](https://help.clickup.com/hc/en-us/articles/6310249474967-Create-and-share-a-Gantt-view) - HIGH confidence
- [Asana Gantt View](https://help.asana.com/s/article/gantt-view?language=en_US) - HIGH confidence
- [Asana Project Views](https://asana.com/features/project-management/project-views) - HIGH confidence
- [Monday.com Gantt Chart](https://support.monday.com/hc/en-us/articles/360015643840-The-Gantt-Chart-View-and-Widget) - HIGH confidence
- [Monday.com Dependencies](https://support.monday.com/hc/en-us/articles/360007402599-Dependencies-on-monday-com) - HIGH confidence
- [Linear Roadmap Timeline](https://linear.app/changelog/2021-05-27-linear-preview-roadmap-timeline) - HIGH confidence
- [Linear Plan](https://linear.app/plan) - HIGH confidence

### Scope/Change Management
- [ClickUp Scope Management Tools](https://clickup.com/blog/scope-management-tools/) - MEDIUM confidence
- [Asana Change Log Template](https://asana.com/templates/change-log) - HIGH confidence
- [Asana Change Control Process](https://asana.com/resources/change-control-process) - HIGH confidence
- [Monday.com Activity Log](https://support.monday.com/hc/en-us/articles/115005310745-The-Activity-Log) - HIGH confidence
- [Monday.com Audit Log](https://support.monday.com/hc/en-us/articles/360001259429-The-Audit-Log) - HIGH confidence
- [Linear Audit Log](https://linear.app/docs/audit-log) - HIGH confidence
- [Linear Issue History](https://linear.app/changelog/2025-04-03-collapsed-issue-history) - HIGH confidence

### Email Digest Patterns
- [NotificationAPI Batch & Digest](https://www.notificationapi.com/docs/features/digest) - MEDIUM confidence
- [Jira Email Digest](https://reliex.com/blog/whats-new-in-email-notification-digest-for-jira) - MEDIUM confidence

---

*Research completed: 2026-01-19*
