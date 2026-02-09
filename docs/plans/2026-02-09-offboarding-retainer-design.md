# Offboarding & Retainer System Design

**Date:** 2026-02-09
**Status:** Approved
**Phase:** 14

---

## Overview

When a project completes delivery, it follows one of two paths: full completion or transition to retainer mode. All projects (active, retainer, completed) gain a Future Improvements backlog for larger ideas that get batched into future work.

---

## Project Lifecycle Changes

### New status flow after `accepted`

```
accepted → "Close Project" modal:
            ├── Complete → completion ceremony → Completed tab
            └── Move to Retainer → retainer setup → Retainer tab
```

`retainer` is a new project status. It's not closed, but no longer in active development.

### Projects page tabs

The Projects page gains horizontal tabs:

**Active** (default, current behavior) / **Retainer** / **Completed**

---

## Completion Ceremony

When admin selects "Complete":

1. **Auto-generated summary snapshot** saved to the project:
   - Total deliverables count (completed)
   - Project timeline (start date to completion date)
   - Team members who worked on it
   - Number of scope changes
   - Number of revisions

2. **Artifacts archived** — hill chart, testing tab, deliverables detail hidden from the default view. An expandable "Archived" section lets anyone view them if they go looking.

3. **Notification sent** to all parties (admin, DFY, dev) — "Project X has been completed"

4. **Project moves to Completed tab** with card showing:
   - Project name + DFY partner
   - Completion date
   - Summary stats (deliverables, timeline)
   - Actions: "Convert to Retainer", "Create Task"

### Standalone tasks on completed projects

"Create Task" covers one-off fixes and bug fixes for clients who come back. Creates a standalone task linked to the completed project without reopening the whole project.

---

## Retainer Mode

### Setup

When admin selects "Move to Retainer", they configure:

- **Check-in cadence** — weekly / biweekly / monthly
- **Check-in assignees** — checkboxes for which roles get pinged (admin, DFY, dev). Editable anytime.
- **Team members** — which devs are assigned. Editable anytime.

### What changes in retainer mode

- Project leaves the Active tab, appears in Retainer tab
- Development artifacts hidden (hill chart, testing, deliverables detail)
- Chat and Files remain accessible
- New retainer-specific UI replaces development tabs

### Retainer page — two tabs

**Check-ins tab:**
- Timeline of past check-ins (health dot + notes + author + date)
- "Log Check-in" button (health picker + notes field)
- Next due date shown prominently
- Anyone can log check-ins anytime (hybrid: scheduled reminders + ad-hoc)

**Tasks tab:**
- Simple list grouped by status: todo / in progress / done
- "Add Task" button — form: title, description, priority, assignee
- Task card: title, priority badge, assignee avatar
- Task detail: full description, comments thread
- Filter/sort by priority, assignee, status
- Tasks are lightweight: title, description, status (todo/in_progress/done), priority (low/medium/high), created by, assignee (optional)

### Check-in record

- Health rating: green / yellow / red
- Notes (free-form text)
- Submitted by + timestamp
- Visible to all assigned team members

### Check-in notifications

- Recurring reminders go only to the roles admin selected
- Task assignments notify the assignee
- Health rating changes (e.g., green to red) notify admin always

### Team management

- Admin can add/remove devs at any time
- Removed dev loses all visibility of the retainer immediately (silent, no notification)
- Removed dev's task assignments get unassigned
- Who can create tasks: admin, DFY, dev

### Retainer dashboard (list view)

Card per retainer showing:
- Project name + DFY partner
- Health indicator (colored dot from last check-in)
- Last check-in date + who
- Next check-in due (overdue highlighting)
- Open task count
- Assigned team avatars

---

## Future Improvements (All Projects)

Available on every project regardless of status (active, retainer, completed).

### Purpose

A backlog of bigger ideas that are too large for retainer tasks or current scope. They accumulate over time and eventually get bundled into a new project (e.g., a "v2").

### Data model

Each improvement:
- Title
- Description
- Added by (admin/DFY/dev)
- Date added
- Priority: nice-to-have / important / critical
- Status: open / converted
- Linked project (when converted)

### Actions

- Admin, DFY, and dev can add improvements
- "Create Project from Selected" — admin picks multiple improvements, kicks off a new inquiry/project scoped around those items
- Converted improvements are marked with a link to the new project

---

## Transitions

### Retainer to Completed
- Admin can "Complete Retainer" at any time
- Triggers the same completion ceremony (summary, notifications, archive)
- Open retainer tasks: admin prompted to resolve or bulk-close them
- Project moves from Retainer tab to Completed tab

### Completed to Retainer
- "Convert to Retainer" action on any completed project
- Admin configures check-in cadence, assignees, team
- Project moves from Completed tab to Retainer tab
- No time limit — can convert months later

---

## Role visibility

| View | Admin | DFY | Dev |
|------|-------|-----|-----|
| All retainers | Yes | Own only | Assigned only |
| All completed | Yes | Own only | Assigned only |
| Future improvements | Yes | Own projects | Assigned projects |
| Create retainer tasks | Yes | Yes | Yes |
| Add future improvements | Yes | Yes | Yes |
| Configure retainer settings | Yes | No | No |
| Remove dev from retainer | Yes | No | No |
| Create project from improvements | Yes | No | No |
| Complete/close retainer | Yes | No | No |
