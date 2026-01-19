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

### Real-time Notification Hook (Implemented)

```typescript
// hooks/use-notifications-realtime.ts
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/lib/api/notifications-utils'

export function useNotificationsRealtime({
  userId,
  initialNotifications,
  initialUnreadCount,
  onNewNotification,
}: UseNotificationsRealtimeOptions) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [toastQueue, setToastQueue] = useState<Notification[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play notification sound
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.wav')
    audioRef.current.volume = 0.5
  }, [])

  // Subscribe to realtime notifications
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          // Play sound
          audioRef.current?.play()

          // Fetch full notification with relations
          const { data } = await supabase
            .from('notifications')
            .select(`*, actor:profiles!actor_id(id, name), project:projects(id, project_name)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setNotifications(prev => [data, ...prev])
            setUnreadCount(prev => prev + 1)
            // Add to toast queue (max 5)
            setToastQueue(prev => [...prev, data].slice(-5))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Show initial unread as toasts on first load
  useEffect(() => {
    const unread = initialNotifications.filter(n => !n.read_at).slice(0, 5)
    if (unread.length > 0) {
      setToastQueue(unread)
      audioRef.current?.play()
    }
  }, [])

  const dismissToast = (id: string) => {
    setToastQueue(prev => prev.filter(n => n.id !== id))
  }

  return { notifications, unreadCount, toastQueue, dismissToast, markAsRead, markAllAsRead }
}
```

### Toast Notifications (macOS Style)

Toast notifications slide in from the right with:
- **Staggered timing**: 5s, 6s, 7s, 8s, 9s (based on position in queue)
- **Swipe-to-dismiss**: Drag right to dismiss (80px threshold or fast flick)
- **Spring animations**: Framer Motion with elastic drag
- **Progress bar**: Gradient countdown bar
- **Rich UI**: Avatar, action text, message preview, unread indicator

```tsx
// components/notifications/NotificationToast.tsx
<motion.div
  layout
  initial={{ opacity: 0, x: 100, scale: 0.95 }}
  animate={isExiting ? { opacity: 0, x: 300 } : { opacity: 1, x: 0, scale: 1 }}
  exit={{ opacity: 0, x: 300, scale: 0.95 }}
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={{ left: 0.3, right: 0.8 }}
  onDragEnd={handleDragEnd}
  whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
>
  {/* Avatar with icon badge, action text, message preview, progress bar */}
</motion.div>
```

### Notification Popover

Rich notification panel with:
- **Header**: "Your notifications" + mark all read + settings icons
- **Tabs**: All / Unread with badge counts
- **List**: Grouped by time (Today, Yesterday, Earlier)
- **Items**: Avatar, action text, timestamp, message preview, type indicator
- **Footer**: "View all notifications" link
- **Styling**: Glass-morphism, backdrop blur, dashed dividers

```tsx
// components/notifications/NotificationPopover.tsx
<PopoverContent className="w-[420px] rounded-xl bg-background/95 backdrop-blur-xl">
  <Tabs value={tab} onValueChange={setTab}>
    <TabsList>
      <TabsTrigger value="all">View all <Badge>{count}</Badge></TabsTrigger>
      <TabsTrigger value="unread">Unread <Badge>{unreadCount}</Badge></TabsTrigger>
    </TabsList>
  </Tabs>
  <ScrollArea>
    <NotificationList notifications={filteredNotifications} />
  </ScrollArea>
</PopoverContent>

{/* Toast stack with AnimatePresence */}
<AnimatePresence mode="popLayout">
  {toastQueue.map((notification, index) => (
    <NotificationToast key={notification.id} notification={notification} index={index} />
  ))}
</AnimatePresence>
```

### Files

| File | Purpose |
|------|---------|
| `hooks/use-notifications-realtime.ts` | Realtime subscription + toast queue |
| `components/notifications/NotificationToast.tsx` | Toast component with swipe |
| `components/notifications/NotificationPopover.tsx` | Bell icon + popover |
| `components/notifications/NotificationItem.tsx` | Rich list item |
| `components/notifications/NotificationList.tsx` | Grouped list |
| `lib/api/notifications.ts` | CRUD + createNotification |
| `lib/api/notifications-utils.ts` | Types, helpers, URL routing |
| `public/sounds/notification.wav` | Notification sound |
| `app/globals.css` | Animations (slide-in-right, shrink-width) |

### Trigger Points

Notifications are created via `createNotification()` in:
- `features/projects/actions/projectActions.ts` - Status changes, dev assignment
- `features/dev/actions/blockerActions.ts` - Blocker acknowledged/resolved

### Test via Supabase

```sql
INSERT INTO public.notifications (user_id, type, title, message, actor_id)
VALUES (
  'user-uuid-here',
  'mention',
  'You were mentioned',
  'Can you review the latest designs?',
  'actor-uuid-here'
);
```
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
