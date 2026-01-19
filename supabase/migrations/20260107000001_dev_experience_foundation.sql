-- hexOS Developer Experience Foundation
-- Adds time tracking, blockers, deliverable notes, task queue, and notifications

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE blocker_status AS ENUM (
  'reported',
  'acknowledged',
  'in_progress',
  'resolved',
  'closed'
);

CREATE TYPE blocker_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TYPE notification_type AS ENUM (
  'project_assigned',
  'blocker_acknowledged',
  'blocker_resolved',
  'blocker_comment',
  'admin_comment',
  'mention',
  'deadline_reminder',
  'status_change'
);

CREATE TYPE note_visibility AS ENUM (
  'team',      -- Dev + Admin can see
  'admin_only' -- Only admin can see
);

-- ============================================================================
-- TIME TRACKING TABLES
-- ============================================================================

-- Time entries - logged time per deliverable
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Time data
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Timer vs manual
  started_at TIMESTAMPTZ,  -- Set if from timer
  ended_at TIMESTAMPTZ,    -- Set if from timer
  is_manual BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active timers - one per user max
CREATE TABLE public.active_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BLOCKERS TABLES
-- ============================================================================

-- Blockers - issues that block work
CREATE TABLE public.blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  priority blocker_priority DEFAULT 'medium',
  status blocker_status DEFAULT 'reported',

  -- Resolution
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),

  -- Audit
  reported_by UUID NOT NULL REFERENCES profiles(id),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocker comments - discussion on blockers
CREATE TABLE public.blocker_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES blockers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DELIVERABLE NOTES TABLE
-- ============================================================================

-- Deliverable notes - work notes/progress updates
CREATE TABLE public.deliverable_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  visibility note_visibility DEFAULT 'team',

  -- Optional status change tracking
  from_status TEXT,
  to_status TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DEV TASK QUEUE TABLE
-- ============================================================================

-- Dev task queue - personal priority ordering
CREATE TABLE public.dev_task_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,

  -- Queue management
  position INT NOT NULL DEFAULT 0,
  is_starred BOOLEAN DEFAULT FALSE,
  is_working_on BOOLEAN DEFAULT FALSE,

  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, deliverable_id)
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

-- Notifications - in-app notifications for devs
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,

  -- References
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
  blocker_id UUID REFERENCES blockers(id) ON DELETE CASCADE,

  -- Actor (who triggered the notification)
  actor_id UUID REFERENCES profiles(id),

  -- Read status
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Time entries
CREATE INDEX idx_time_entries_deliverable ON time_entries(deliverable_id);
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_date ON time_entries(entry_date);
CREATE INDEX idx_time_entries_user_date ON time_entries(user_id, entry_date);

-- Active timers
CREATE INDEX idx_active_timers_deliverable ON active_timers(deliverable_id);

-- Blockers
CREATE INDEX idx_blockers_project ON blockers(project_id);
CREATE INDEX idx_blockers_deliverable ON blockers(deliverable_id);
CREATE INDEX idx_blockers_status ON blockers(status);
CREATE INDEX idx_blockers_reported_by ON blockers(reported_by);

-- Blocker comments
CREATE INDEX idx_blocker_comments_blocker ON blocker_comments(blocker_id);

-- Deliverable notes
CREATE INDEX idx_deliverable_notes_deliverable ON deliverable_notes(deliverable_id);
CREATE INDEX idx_deliverable_notes_user ON deliverable_notes(user_id);

-- Dev task queue
CREATE INDEX idx_dev_task_queue_user ON dev_task_queue(user_id);
CREATE INDEX idx_dev_task_queue_user_position ON dev_task_queue(user_id, position);
CREATE INDEX idx_dev_task_queue_working ON dev_task_queue(user_id, is_working_on) WHERE is_working_on = TRUE;

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_project ON notifications(project_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get project_id for a deliverable (for RLS)
CREATE OR REPLACE FUNCTION get_deliverable_project_id(p_deliverable_id UUID)
RETURNS UUID AS $$
  SELECT project_id FROM deliverables WHERE id = p_deliverable_id
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get project_id for a blocker (for RLS)
CREATE OR REPLACE FUNCTION get_blocker_project_id(p_blocker_id UUID)
RETURNS UUID AS $$
  SELECT project_id FROM blockers WHERE id = p_blocker_id
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocker_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_task_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- TIME_ENTRIES POLICIES
CREATE POLICY "time_entries_admin_all" ON time_entries
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "time_entries_own_select" ON time_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "time_entries_own_insert" ON time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    can_access_project(get_deliverable_project_id(deliverable_id))
  );

CREATE POLICY "time_entries_own_update" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "time_entries_own_delete" ON time_entries
  FOR DELETE USING (user_id = auth.uid());

-- ACTIVE_TIMERS POLICIES
CREATE POLICY "active_timers_admin_all" ON active_timers
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "active_timers_own_all" ON active_timers
  FOR ALL USING (user_id = auth.uid());

-- BLOCKERS POLICIES
CREATE POLICY "blockers_admin_all" ON blockers
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "blockers_project_select" ON blockers
  FOR SELECT USING (can_access_project(project_id));

CREATE POLICY "blockers_dev_insert" ON blockers
  FOR INSERT WITH CHECK (
    get_user_role() IN ('dev', 'internal') AND
    can_access_project(project_id) AND
    reported_by = auth.uid()
  );

CREATE POLICY "blockers_reporter_update" ON blockers
  FOR UPDATE USING (
    reported_by = auth.uid() OR
    get_user_role() IN ('admin', 'internal')
  );

-- BLOCKER_COMMENTS POLICIES
CREATE POLICY "blocker_comments_admin_all" ON blocker_comments
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "blocker_comments_project_select" ON blocker_comments
  FOR SELECT USING (
    can_access_project(get_blocker_project_id(blocker_id))
  );

CREATE POLICY "blocker_comments_project_insert" ON blocker_comments
  FOR INSERT WITH CHECK (
    can_access_project(get_blocker_project_id(blocker_id)) AND
    user_id = auth.uid()
  );

CREATE POLICY "blocker_comments_own_update" ON blocker_comments
  FOR UPDATE USING (user_id = auth.uid());

-- DELIVERABLE_NOTES POLICIES
CREATE POLICY "deliverable_notes_admin_all" ON deliverable_notes
  FOR ALL USING (get_user_role() = 'admin');

CREATE POLICY "deliverable_notes_team_select" ON deliverable_notes
  FOR SELECT USING (
    can_access_project(get_deliverable_project_id(deliverable_id)) AND
    (visibility = 'team' OR get_user_role() = 'admin')
  );

CREATE POLICY "deliverable_notes_project_insert" ON deliverable_notes
  FOR INSERT WITH CHECK (
    can_access_project(get_deliverable_project_id(deliverable_id)) AND
    user_id = auth.uid()
  );

CREATE POLICY "deliverable_notes_own_update" ON deliverable_notes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "deliverable_notes_own_delete" ON deliverable_notes
  FOR DELETE USING (user_id = auth.uid());

-- DEV_TASK_QUEUE POLICIES
CREATE POLICY "dev_task_queue_admin_select" ON dev_task_queue
  FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "dev_task_queue_own_all" ON dev_task_queue
  FOR ALL USING (user_id = auth.uid());

-- NOTIFICATIONS POLICIES
CREATE POLICY "notifications_own_select" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_own_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_system_insert" ON notifications
  FOR INSERT WITH CHECK (TRUE); -- System can insert for any user

CREATE POLICY "notifications_own_delete" ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS: AUTO-SYNC TASK QUEUE
-- ============================================================================

-- When a dev is assigned to a project, add existing deliverables to their queue
CREATE OR REPLACE FUNCTION sync_task_queue_on_project_assign()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when assigned_dev_id changes to a non-null value
  IF NEW.assigned_dev_id IS NOT NULL AND
     (OLD.assigned_dev_id IS NULL OR OLD.assigned_dev_id != NEW.assigned_dev_id) THEN

    -- Add all existing deliverables to the new dev's queue
    INSERT INTO dev_task_queue (user_id, deliverable_id, position)
    SELECT
      NEW.assigned_dev_id,
      d.id,
      ROW_NUMBER() OVER (ORDER BY d.sort_order, d.created_at) - 1
    FROM deliverables d
    WHERE d.project_id = NEW.id
    ON CONFLICT (user_id, deliverable_id) DO NOTHING;

    -- Create notification for the dev
    INSERT INTO notifications (user_id, type, title, message, project_id, actor_id)
    VALUES (
      NEW.assigned_dev_id,
      'project_assigned',
      'New project assigned',
      'You have been assigned to project: ' || NEW.project_name,
      NEW.id,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER project_dev_assign_sync
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_queue_on_project_assign();

-- When a deliverable is created, add to assigned dev's queue
CREATE OR REPLACE FUNCTION sync_task_queue_on_deliverable_create()
RETURNS TRIGGER AS $$
DECLARE
  v_dev_id UUID;
  v_max_position INT;
BEGIN
  -- Get the assigned dev for this project
  SELECT assigned_dev_id INTO v_dev_id
  FROM projects
  WHERE id = NEW.project_id;

  IF v_dev_id IS NOT NULL THEN
    -- Get max position for this user
    SELECT COALESCE(MAX(position), -1) INTO v_max_position
    FROM dev_task_queue
    WHERE user_id = v_dev_id;

    -- Add to queue
    INSERT INTO dev_task_queue (user_id, deliverable_id, position)
    VALUES (v_dev_id, NEW.id, v_max_position + 1)
    ON CONFLICT (user_id, deliverable_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER deliverable_create_queue_sync
  AFTER INSERT ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_queue_on_deliverable_create();

-- ============================================================================
-- TRIGGERS: AUTO-NOTIFY ON BLOCKER STATUS CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_blocker_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_title TEXT;
  v_message TEXT;
  v_type notification_type;
  v_project_name TEXT;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get project name
  SELECT project_name INTO v_project_name
  FROM projects
  WHERE id = NEW.project_id;

  -- Set notification details based on new status
  CASE NEW.status
    WHEN 'acknowledged' THEN
      v_type := 'blocker_acknowledged';
      v_title := 'Blocker acknowledged';
      v_message := 'Your blocker "' || NEW.title || '" has been acknowledged';
    WHEN 'resolved' THEN
      v_type := 'blocker_resolved';
      v_title := 'Blocker resolved';
      v_message := 'Blocker "' || NEW.title || '" has been resolved';
    ELSE
      v_type := 'status_change';
      v_title := 'Blocker status updated';
      v_message := 'Blocker "' || NEW.title || '" is now ' || NEW.status;
  END CASE;

  -- Notify the reporter (if not the one making the change)
  IF NEW.reported_by != auth.uid() THEN
    INSERT INTO notifications (user_id, type, title, message, project_id, blocker_id, actor_id)
    VALUES (NEW.reported_by, v_type, v_title, v_message, NEW.project_id, NEW.id, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER blocker_status_notify
  AFTER UPDATE ON blockers
  FOR EACH ROW
  EXECUTE FUNCTION notify_blocker_status_change();

-- ============================================================================
-- TRIGGERS: NOTIFY ON BLOCKER COMMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_blocker_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_blocker RECORD;
  v_recipient_id UUID;
BEGIN
  -- Get blocker details
  SELECT b.*, p.project_name
  INTO v_blocker
  FROM blockers b
  JOIN projects p ON p.id = b.project_id
  WHERE b.id = NEW.blocker_id;

  -- Notify the reporter if commenter is different
  IF v_blocker.reported_by != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, title, message, project_id, blocker_id, actor_id)
    VALUES (
      v_blocker.reported_by,
      'blocker_comment',
      'New comment on blocker',
      'Someone commented on your blocker "' || v_blocker.title || '"',
      v_blocker.project_id,
      NEW.blocker_id,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER blocker_comment_notify
  AFTER INSERT ON blocker_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_blocker_comment();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER blockers_updated_at
  BEFORE UPDATE ON blockers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER blocker_comments_updated_at
  BEFORE UPDATE ON blocker_comments
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER deliverable_notes_updated_at
  BEFORE UPDATE ON deliverable_notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE time_entries IS 'Time logged per deliverable (timer or manual entry)';
COMMENT ON TABLE active_timers IS 'Currently running timer per user (max one)';
COMMENT ON TABLE blockers IS 'Issues/blockers reported on deliverables or projects';
COMMENT ON TABLE blocker_comments IS 'Discussion thread on blockers';
COMMENT ON TABLE deliverable_notes IS 'Work notes and progress updates on deliverables';
COMMENT ON TABLE dev_task_queue IS 'Personal priority ordering of deliverables for devs';
COMMENT ON TABLE notifications IS 'In-app notifications for users';

COMMENT ON COLUMN time_entries.is_manual IS 'TRUE if manually entered, FALSE if from timer';
COMMENT ON COLUMN blockers.priority IS 'Blocker urgency: low, medium, high, critical';
COMMENT ON COLUMN deliverable_notes.visibility IS 'Who can see: team (dev+admin) or admin_only';
COMMENT ON COLUMN dev_task_queue.is_working_on IS 'Currently active task indicator';
