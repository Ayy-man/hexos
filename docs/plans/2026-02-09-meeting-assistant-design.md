# Meeting Assistant — Design Document

> Hexos-integrated meeting notetaker. Cloud bot joins meetings, records, transcribes, and delivers structured notes with AI-powered summaries and action items.

## Overview

A meeting assistant built into Hexos that works like Fathom/Fireflies — a bot joins your Zoom, Google Meet, or Teams calls, records and transcribes them, then uses Claude to extract summaries, action items, and key decisions. Meetings can be linked to any number of projects, inquiries, or conversations in Hexos.

**Cost:** ~$0.70/meeting ($0.50 recording + $0.15 transcription + ~$0.05 AI). At 250 meetings/year = ~$175/year.

## Architecture

```
User pastes meeting link in Hexos
        |
        v
POST /api/meetings — creates meeting record, dispatches Recall.ai bot
        |
        v
Recall.ai bot joins meeting (custom name: "Hexos Notetaker", custom avatar)
        |
        v
Bot records audio + transcribes with speaker diarization
        |
        v
Meeting ends — Recall.ai sends webhook to POST /api/webhooks/recall
        |
        v
Hexos receives transcript, calls Claude via OpenRouter:
  - Meeting summary (3-5 bullets)
  - Action items (who, what, deadline)
  - Key decisions
  - Suggested project/inquiry links (matched from transcript)
        |
        v
Structured data saved to Supabase
        |
        v
Push notification: "Meeting notes ready for [title]"
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Bot infrastructure | Recall.ai | Pay-as-you-go, $0.50/hr recording |
| Transcription | Recall.ai built-in | $0.15/hr, includes speaker diarization |
| AI processing | Claude via OpenRouter | Existing Hexos integration |
| Database | Supabase PostgreSQL | New tables, existing RLS patterns |
| Frontend | Next.js + shadcn/ui | New feature module, consistent with Hexos |
| Notifications | Existing push notification system | Reuse current infra |

## Data Model

### meetings

Primary table for all meeting records.

```sql
create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_url text not null,
  platform text not null check (platform in ('zoom', 'google_meet', 'teams', 'other')),

  -- Recall.ai integration
  recall_bot_id text,
  recall_recording_url text,

  -- Timing
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,

  -- AI-processed content
  transcript jsonb,           -- diarized segments: [{speaker, text, start, end}]
  summary text,               -- 3-5 bullet markdown summary
  key_decisions jsonb,        -- [{decision, context}]

  -- Status
  status text not null default 'pending'
    check (status in ('pending', 'joining', 'recording', 'processing', 'ready', 'failed')),
  error_message text,

  -- Ownership
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_meetings_created_by on meetings(created_by);
create index idx_meetings_status on meetings(status);
create index idx_meetings_created_at on meetings(created_at desc);
```

### meeting_links

Many-to-many polymorphic join table. A meeting can be linked to multiple projects, inquiries, etc. A project can have multiple meetings.

```sql
create table meeting_links (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  linkable_type text not null check (linkable_type in ('project', 'inquiry', 'conversation')),
  linkable_id uuid not null,
  created_at timestamptz not null default now(),

  unique(meeting_id, linkable_type, linkable_id)
);

create index idx_meeting_links_meeting on meeting_links(meeting_id);
create index idx_meeting_links_target on meeting_links(linkable_type, linkable_id);
```

### meeting_participants

Tracks who was in the meeting, matched to Hexos profiles where possible.

```sql
create table meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  display_name text not null,
  email text,
  profile_id uuid references profiles(id),  -- null if external participant
  speaker_label text,                         -- from diarization (Speaker 1, etc.)
  created_at timestamptz not null default now(),

  unique(meeting_id, email)
);

create index idx_meeting_participants_meeting on meeting_participants(meeting_id);
create index idx_meeting_participants_profile on meeting_participants(profile_id);
```

### meeting_tasks

First-class tasks extracted from meetings. These are real, trackable tasks — not just a JSONB blob. Can be assigned, have due dates, marked complete, linked to deliverables, and imported/exported via CSV.

```sql
create table meeting_tasks (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete set null,  -- nullable: tasks can exist independently (imported)
  title text not null,
  description text,
  assigned_to_name text,                    -- raw name from transcript or import
  assigned_to_profile uuid references profiles(id),  -- matched Hexos user (nullable)
  due_date date,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done', 'cancelled')),

  -- Links to other Hexos entities
  project_id uuid,                          -- linked project (nullable)
  inquiry_id uuid,                          -- linked inquiry (nullable)
  deliverable_id uuid,                      -- converted to deliverable (nullable)

  -- Metadata
  source text not null default 'ai_extracted'
    check (source in ('ai_extracted', 'manual', 'imported')),
  created_by uuid not null references profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meeting_tasks_meeting on meeting_tasks(meeting_id);
create index idx_meeting_tasks_assigned on meeting_tasks(assigned_to_profile);
create index idx_meeting_tasks_status on meeting_tasks(status);
create index idx_meeting_tasks_project on meeting_tasks(project_id);
create index idx_meeting_tasks_due_date on meeting_tasks(due_date);
```

### RLS Policies

Admin only for V1. Simple.

```sql
alter table meetings enable row level security;
alter table meeting_links enable row level security;
alter table meeting_participants enable row level security;

-- Admin can do everything
create policy "admin_full_access" on meetings
  for all using (get_user_role() = 'admin');

create policy "admin_full_access" on meeting_links
  for all using (get_user_role() = 'admin');

create policy "admin_full_access" on meeting_participants
  for all using (get_user_role() = 'admin');

create policy "admin_full_access" on meeting_tasks
  for all using (get_user_role() = 'admin');
```

## API Routes

### POST /api/meetings

Create a meeting and dispatch the Recall.ai bot.

```ts
// Request
{
  title: string
  meeting_url: string          // zoom/meet/teams link
  links?: {                    // optional — link to projects/inquiries
    type: 'project' | 'inquiry' | 'conversation'
    id: string
  }[]
}

// Response
{
  id: string
  status: 'joining'
  recall_bot_id: string
}
```

**Logic:**
1. Validate meeting URL (detect platform from URL pattern)
2. Create `meetings` row with status `pending`
3. Call Recall.ai API to create bot (custom name + avatar)
4. Update status to `joining`, store `recall_bot_id`
5. Insert `meeting_links` if provided

### POST /api/webhooks/recall

Webhook receiver for Recall.ai events.

**Events handled:**
- `bot.joining` — Update status to `joining`
- `bot.in_waiting_room` — Update status (optional: notify user)
- `bot.recording` — Update status to `recording`, set `started_at`
- `bot.done` — Bot left meeting, set `ended_at`, trigger processing
- `bot.fatal_error` — Set status to `failed`, store error

**On `bot.done`:**
1. Fetch transcript from Recall.ai API
2. Fetch recording URL
3. Update meeting with transcript, recording URL
4. Set status to `processing`
5. Call Claude via OpenRouter for AI extraction
6. Save summary, key_decisions to meeting record
7. Create `meeting_tasks` rows from extracted tasks (source: 'ai_extracted')
8. Match participant names/emails to Hexos profiles
9. Match task assigned_to names to Hexos profiles
8. Set status to `ready`
9. Send push notification to meeting creator

### GET /api/meetings

List meetings. Supports filtering.

```
?status=ready
?project_id=xxx        (filter by linked project)
?inquiry_id=xxx        (filter by linked inquiry)
?from=2026-01-01       (date range)
&to=2026-02-01
```

### GET /api/meetings/[id]

Full meeting detail — transcript, summary, action items, participants, links.

### PATCH /api/meetings/[id]

Update meeting title, manage links (add/remove projects/inquiries).

### DELETE /api/meetings/[id]

Delete meeting and all associated data (cascade).

### POST /api/meetings/[id]/links

Add a link to a project/inquiry/conversation.

### DELETE /api/meetings/[id]/links/[linkId]

Remove a link.

### Task Routes

#### GET /api/meeting-tasks

List tasks with filtering.

```
?meeting_id=xxx           (tasks from a specific meeting)
?project_id=xxx           (tasks linked to a project)
?status=pending           (filter by status)
?assigned_to=xxx          (filter by assigned profile)
?due_before=2026-03-01    (overdue/upcoming)
?source=ai_extracted      (filter by source)
```

#### POST /api/meeting-tasks

Create a task manually (not from AI extraction).

```ts
{
  title: string
  description?: string
  assigned_to_profile?: string   // profile UUID
  due_date?: string              // ISO date
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  meeting_id?: string            // link to meeting
  project_id?: string            // link to project
  inquiry_id?: string            // link to inquiry
}
```

#### PATCH /api/meeting-tasks/[id]

Update task status, assignment, due date, priority, or link to a deliverable.

#### DELETE /api/meeting-tasks/[id]

Delete a task.

#### POST /api/meeting-tasks/[id]/convert-to-deliverable

Convert a meeting task into a project deliverable. Creates a new row in `deliverables` table, links it back via `deliverable_id`.

```ts
// Request
{
  project_id: string    // which project to add the deliverable to
}

// Response
{
  deliverable_id: string
  task_id: string       // updated with deliverable_id link
}
```

### Task Import/Export

#### GET /api/meeting-tasks/export

Export tasks as CSV. Supports the same filters as the list endpoint.

```
GET /api/meeting-tasks/export?status=pending&project_id=xxx
```

**CSV columns:**
```csv
title,description,assigned_to,due_date,priority,status,source,meeting_title,meeting_date,project_name,inquiry_name,created_at
```

Returns `Content-Type: text/csv` with `Content-Disposition: attachment; filename="meeting-tasks-2026-02-09.csv"`.

#### POST /api/meeting-tasks/import

Import tasks from CSV. Creates tasks with `source: 'imported'`.

```ts
// Request: multipart/form-data with CSV file
// Optional query params:
?meeting_id=xxx     // link all imported tasks to a meeting
&project_id=xxx     // link all imported tasks to a project

// CSV expected columns (flexible — matches by header name):
// Required: title
// Optional: description, assigned_to, due_date, priority, status
```

**Import logic:**
1. Parse CSV, validate headers (must have `title` at minimum)
2. For each row:
   - Create `meeting_tasks` row with `source: 'imported'`
   - Match `assigned_to` against Hexos profile names/emails if possible
   - Apply `meeting_id` and `project_id` from query params if provided
3. Return summary: `{imported: number, skipped: number, errors: string[]}`

## AI Processing Prompt

When Recall.ai delivers the transcript, send to Claude:

```
You are analyzing a meeting transcript for a project management tool.

## Transcript
{diarized_transcript}

## Linked Projects
{project_names_and_descriptions_if_linked}

## Instructions
Extract the following as JSON:

1. "summary": Array of 3-5 bullet points (strings) capturing the key topics discussed
2. "tasks": Array of {title (string), description (string or null), assigned_to (name or null), due_date (ISO date string or null), priority ("low"|"normal"|"high"|"urgent")} — every action item, follow-up, commitment, or task mentioned in the meeting
3. "key_decisions": Array of {decision (string), context (string)}
4. "suggested_links": Array of {type: "project"|"inquiry", name (string), reason (string)} — suggest any Hexos projects/inquiries that seem relevant based on names, clients, or topics mentioned

Return valid JSON only.
```

## Frontend

### New Feature Module: `features/meetings/`

```
features/meetings/
├── components/
│   ├── meeting-list.tsx           -- Table/card list of meetings
│   ├── meeting-detail.tsx         -- Full meeting view
│   ├── meeting-transcript.tsx     -- Diarized transcript viewer
│   ├── meeting-summary.tsx        -- Summary + tasks + decisions
│   ├── meeting-link-picker.tsx    -- Modal to link projects/inquiries
│   ├── new-meeting-dialog.tsx     -- Paste link + add title dialog
│   ├── meeting-status-badge.tsx   -- Status indicator (joining/recording/ready)
│   ├── task-list.tsx              -- Task table with inline editing
│   ├── task-row.tsx               -- Single task row (status toggle, assign, due date)
│   ├── task-import-dialog.tsx     -- CSV upload dialog
│   ├── task-export-button.tsx     -- Export filtered tasks as CSV
│   └── convert-to-deliverable.tsx -- One-click task → deliverable conversion
├── hooks/
│   ├── use-meetings-realtime.ts   -- Supabase realtime subscription
│   └── use-tasks-realtime.ts      -- Task status updates in realtime
└── lib/
    ├── meetings-api.ts            -- Meeting API helper functions
    ├── tasks-api.ts               -- Task CRUD + import/export helpers
    └── csv-utils.ts               -- CSV parse/generate utilities
```

### Pages

**`/meetings`** — Main meetings page
- List of all meetings, sorted by date (most recent first)
- Filter by: status, linked project, date range
- Each row shows: title, date, duration, platform icon, status badge, linked projects/inquiries as tags
- "New Meeting" button opens dialog

**`/meetings/[id]`** — Meeting detail page
- Header: title, date, duration, platform, status, linked entities as clickable chips
- Tabs:
  - **Summary** — AI-generated summary bullets, key decisions
  - **Tasks** — Full task list with inline status toggling, assignment, due dates, priority badges. Bulk actions (mark done, export selected). "Add task" for manual entries. "Import CSV" and "Export CSV" buttons. Each task has a "Convert to deliverable" action.
  - **Transcript** — Full diarized transcript with speaker labels, timestamps, search
  - **Recording** — Audio/video playback (Recall.ai hosted URL)
  - **Participants** — List with profile matches

**`/meetings/tasks`** — Global tasks view (optional standalone page)
- All meeting tasks across all meetings
- Filter by: status, assigned to, project, meeting, due date, priority, source
- Bulk export/import
- Useful for reviewing all outstanding action items in one place

### Project/Inquiry Integration

**Project detail page** — Add a "Meetings" tab (9th tab) showing all meetings linked to that project.

**Inquiry detail page** — Show linked meetings in the inquiry view.

**Linking UX:**
- On the meeting detail page: "Link to..." button opens a search modal for projects/inquiries
- On the project page: "Add meeting" button in the Meetings tab
- AI suggestions: After processing, if Claude suggests relevant projects, show them as "Suggested links" that can be one-click confirmed

### Sidebar

Add "Meetings" to the app sidebar navigation, admin-only visibility.

## Recall.ai Configuration

```ts
// lib/recall.ts
const RECALL_API_BASE = 'https://us-west-2.recall.ai/api/v1'

const recallConfig = {
  bot_name: 'Hexos Notetaker',
  bot_image: 'https://your-domain.com/hexos-bot-avatar.png',
  recording_mode: 'speaker_view',
  transcription_options: {
    provider: 'default',        // Recall's built-in
    language: 'en',
  },
  webhook_url: 'https://your-domain.com/api/webhooks/recall',
}
```

## V2: Calendar Sync (Future)

- Connect Google Calendar via OAuth
- Auto-detect meetings with video call links
- Option to auto-record all meetings or ask before each
- Pre-populate meeting title from calendar event
- Auto-link to projects if calendar event mentions project name
- Settings page to configure: auto-record, default visibility, calendar selection

## V2: Role-Based Visibility (Future)

When opening up beyond admin:
- Internal users see all meetings
- Devs/DFY see meetings linked to their assigned projects
- Clients see meeting summaries (not raw transcripts) for their projects
- Per-meeting visibility override

## Environment Variables

```
RECALL_API_KEY=           # Recall.ai API key
RECALL_WEBHOOK_SECRET=    # Webhook signature verification
```

## Migration Checklist

1. Create Supabase migration with tables (`meetings`, `meeting_links`, `meeting_participants`, `meeting_tasks`) + RLS policies
2. Add Recall.ai API key to environment
3. Build API routes (meetings CRUD + webhook)
4. Build task API routes (CRUD + import/export)
5. Build AI processing pipeline (Claude extraction → task creation)
6. Build CSV import/export utilities
7. Build frontend feature module (meetings + tasks)
8. Add meetings tab to project detail page
9. Add sidebar navigation entry
10. Add realtime subscription hooks (meetings + tasks)
11. Test end-to-end: paste link → bot joins → transcript → AI → tasks created → export CSV
12. Deploy
