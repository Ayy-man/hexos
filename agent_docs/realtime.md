# Realtime & Notifications

Supabase Realtime is a **first-class feature** in hexOS. Enable it from day 1 for all applicable features.

---

## Supabase Realtime Setup

### Enable on Project Creation

```sql
-- In Supabase Dashboard: Database → Replication
-- Enable realtime for these tables:

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE deliverables;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE dev_checkins;
```

### Client Setup

```typescript
// src/lib/supabase/realtime.ts
import { createClient } from '@supabase/supabase-js'

export function subscribeToChannel<T>(
  table: string,
  filter: string,
  callback: (payload: T) => void
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return supabase
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => callback(payload.new as T)
    )
    .subscribe()
}
```

---

## Where to Use Realtime

| Feature | Table | Event | Who Sees |
|---------|-------|-------|----------|
| Chat messages | `messages` | INSERT | Conversation participants |
| Deliverable updates | `deliverables` | UPDATE | Project members |
| Project status changes | `projects` | UPDATE | All project stakeholders |
| New suggestions | `suggestions` | INSERT | INT only |
| Portal sync | `portal_syncs` | INSERT | DFY, CLIENT |
| Dev check-in alerts | `dev_checkins` | INSERT/missing | INT |
| Notifications | `notifications` | INSERT | Target user |

---

## Notification System

### Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL, -- see types below
  title TEXT NOT NULL,
  body TEXT,
  data JSONB, -- context: {project_id, deliverable_id, etc}
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, read) 
  WHERE read = false;
```

### Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `portal_sync` | INT syncs item to Portal | DFY, CLIENT on project |
| `message_new` | New message in conversation | Conversation participants |
| `deliverable_complete` | Deliverable marked done | Project stakeholders |
| `dev_checkin_missing` | Dev missed 24h check-in | INT (warning) |
| `dev_checkin_escalation` | Dev missed 48h check-in | INT (urgent) |
| `suggestion_new` | New suggestion submitted | INT |
| `payment_received` | Stripe webhook | INT, CLIENT |
| `project_status_change` | Project moves to new status | All project stakeholders |

### Real-time Notification Hook

```typescript
// src/hooks/useNotifications.ts
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Initial fetch
    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)
          // Optional: Show toast
          showToast(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { notifications, unreadCount, markAsRead }
}
```

---

## Portal Sync System

### Sync is Granular (Git-like)

Individual items can be synced from Workspace → Portal. INT controls what's visible externally.

### Schema

```sql
-- Track what's synced to portal
CREATE TABLE portal_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  
  -- What was synced
  entity_type TEXT NOT NULL, -- 'deliverable', 'file', 'update'
  entity_id UUID NOT NULL,
  
  -- Sync metadata
  synced_by UUID REFERENCES profiles(id) NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional note for the sync
  sync_note TEXT,
  
  UNIQUE(project_id, entity_type, entity_id)
);

-- Add sync status to deliverables
ALTER TABLE deliverables ADD COLUMN portal_synced BOOLEAN DEFAULT false;
ALTER TABLE deliverables ADD COLUMN portal_synced_at TIMESTAMPTZ;
```

### Sync Flow

```
┌─────────────────┐     ┌─────────────────┐
│    WORKSPACE    │     │     PORTAL      │
│  (INT + DEV)    │     │  (DFY + CLIENT) │
├─────────────────┤     ├─────────────────┤
│ Deliverable A ✓ │──┬──│ Deliverable A ✓ │
│ Deliverable B   │  │  │                 │
│ Deliverable C ✓ │──┘  │ Deliverable C ✓ │
│ Deliverable D   │     │                 │
└─────────────────┘     └─────────────────┘
         │                      ▲
         │    [Sync Selected]   │
         └──────────────────────┘
```

### Sync Action

```typescript
// src/features/projects/actions/sync-to-portal.ts
'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'

export async function syncToPortal(
  projectId: string,
  entityType: 'deliverable' | 'file' | 'update',
  entityIds: string[],
  syncNote?: string
) {
  const supabase = createServerActionClient({ cookies })
  
  // Verify user is INT
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .single()
  
  if (profile?.role !== 'INT') {
    throw new Error('Only internal team can sync to portal')
  }

  // Create sync records
  const syncs = entityIds.map(entityId => ({
    project_id: projectId,
    entity_type: entityType,
    entity_id: entityId,
    synced_by: (await supabase.auth.getUser()).data.user?.id,
    sync_note: syncNote
  }))

  await supabase.from('portal_syncs').upsert(syncs)

  // Update entity sync status
  if (entityType === 'deliverable') {
    await supabase
      .from('deliverables')
      .update({ 
        portal_synced: true, 
        portal_synced_at: new Date().toISOString() 
      })
      .in('id', entityIds)
  }

  // Notify DFY + CLIENT
  await notifyPortalUpdate(projectId, entityType, entityIds)
}
```

### Sync Notification

When items are synced to Portal, DFY and CLIENT get notified:

```typescript
async function notifyPortalUpdate(
  projectId: string,
  entityType: string,
  entityIds: string[]
) {
  // Get DFY and CLIENT users on this project
  const { data: stakeholders } = await supabase
    .from('project_assignments')
    .select('user_id, profiles(role)')
    .eq('project_id', projectId)
    .in('profiles.role', ['DFY', 'CLIENT'])

  const notifications = stakeholders?.map(s => ({
    user_id: s.user_id,
    type: 'portal_sync',
    title: 'Project Update Available',
    body: `${entityIds.length} ${entityType}(s) have been shared`,
    data: { project_id: projectId, entity_type: entityType }
  }))

  await supabase.from('notifications').insert(notifications)
}
```

---

## Developer Check-in System

### Daily Ping Requirement

Developers must update their assigned projects daily. System tracks check-ins and escalates.

### Schema

```sql
CREATE TABLE dev_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) NOT NULL,
  dev_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- What they updated
  update_type TEXT, -- 'status', 'deliverable', 'note', 'blocker'
  update_note TEXT,
  
  -- Auto-tracked
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- For daily uniqueness
  checkin_date DATE DEFAULT CURRENT_DATE,
  
  UNIQUE(project_id, dev_id, checkin_date)
);

-- View for missed check-ins
CREATE VIEW dev_checkin_status AS
SELECT 
  pa.project_id,
  pa.user_id as dev_id,
  p.display_name as dev_name,
  proj.name as project_name,
  MAX(dc.checked_in_at) as last_checkin,
  EXTRACT(EPOCH FROM (NOW() - MAX(dc.checked_in_at))) / 3600 as hours_since_checkin,
  CASE 
    WHEN MAX(dc.checked_in_at) IS NULL THEN 'never'
    WHEN NOW() - MAX(dc.checked_in_at) > INTERVAL '48 hours' THEN 'escalation'
    WHEN NOW() - MAX(dc.checked_in_at) > INTERVAL '24 hours' THEN 'warning'
    ELSE 'ok'
  END as status
FROM project_assignments pa
JOIN profiles p ON pa.user_id = p.id
JOIN projects proj ON pa.project_id = proj.id
LEFT JOIN dev_checkins dc ON dc.project_id = pa.project_id AND dc.dev_id = pa.user_id
WHERE p.role = 'DEV'
AND proj.status IN ('in_progress', 'review')
GROUP BY pa.project_id, pa.user_id, p.display_name, proj.name;
```

### Automated Cron Job (n8n or Supabase Edge Function)

```typescript
// supabase/functions/dev-checkin-monitor/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get all devs with check-in issues
  const { data: issues } = await supabase
    .from('dev_checkin_status')
    .select('*')
    .in('status', ['warning', 'escalation'])

  const notifications = []
  
  // Get INT users to notify
  const { data: intUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'INT')

  for (const issue of issues || []) {
    // Notify the dev (warning)
    if (issue.status === 'warning') {
      notifications.push({
        user_id: issue.dev_id,
        type: 'dev_checkin_reminder',
        title: 'Daily Update Required',
        body: `Please update ${issue.project_name}. Last check-in: ${Math.round(issue.hours_since_checkin)}h ago.`,
        data: { project_id: issue.project_id }
      })
    }
    
    // Notify INT (escalation after 48h)
    if (issue.status === 'escalation') {
      for (const intUser of intUsers || []) {
        notifications.push({
          user_id: intUser.id,
          type: 'dev_checkin_escalation',
          title: `⚠️ Dev Unresponsive: ${issue.dev_name}`,
          body: `No update on ${issue.project_name} for ${Math.round(issue.hours_since_checkin)}h`,
          data: { 
            project_id: issue.project_id, 
            dev_id: issue.dev_id,
            hours_missing: issue.hours_since_checkin 
          }
        })
      }
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications)
  }

  return new Response(JSON.stringify({ 
    processed: issues?.length || 0,
    notifications_sent: notifications.length 
  }))
})
```

### Cron Schedule

```sql
-- Run every hour to check for missing check-ins
-- Setup in Supabase Dashboard: Edge Functions → Schedules
-- Or n8n workflow triggered hourly
```

### Dev Dashboard Widget

Shows check-in status prominently:

```
┌─────────────────────────────────────┐
│ 📋 Daily Updates                    │
├─────────────────────────────────────┤
│ Project A        ✅ Updated 2h ago  │
│ Project B        ⚠️ Update needed   │
│ Project C        ✅ Updated today   │
│                                     │
│ [Update All Projects]               │
└─────────────────────────────────────┘
```

### Quick Check-in Modal

Dev can quickly submit an update:

```
┌─────────────────────────────────────┐
│ Update: Project B                   │
├─────────────────────────────────────┤
│ What did you work on?               │
│ ○ Completed deliverables            │
│ ○ Made progress                     │
│ ○ Blocked - need help               │
│ ○ No progress today                 │
│                                     │
│ Note (optional):                    │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Submit Update]                     │
└─────────────────────────────────────┘
```

---

## Escalation Timeline

```
Hour 0      Dev assigned to active project
   │
   ├─ Dev should update daily
   │
Hour 24     ⚠️ WARNING: Ping dev "Please update"
   │
   ├─ Still no update
   │
Hour 48     🚨 ESCALATION: Ping INT "Dev unresponsive"
   │
   ├─ INT takes action (message dev, reassign, etc.)
   │
```

---

## Presence (Optional V2)

Track who's online for real-time collaboration:

```typescript
// Using Supabase Presence
const channel = supabase.channel('online-users')

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    // Update online indicators
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString()
      })
    }
  })
```

Consider for V2 to show "who's viewing this project" indicators.
