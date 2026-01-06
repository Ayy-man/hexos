-- hexOS Pulse Productivity System
-- Personal ops & progress tracking for admin/internal users
-- Tracks daily tasks, quarterly targets, yearly goals, and pulse points

-- ============================================================================
-- TABLES
-- ============================================================================

-- Shared yearly goal (one per year, company-wide)
CREATE TABLE pulse_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  target_value NUMERIC,
  current_value NUMERIC,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Quarterly targets
CREATE TABLE pulse_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES pulse_goals(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Target owners (many-to-many)
CREATE TABLE pulse_target_owners (
  target_id UUID REFERENCES pulse_targets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (target_id, user_id)
);

-- Actions for targets
CREATE TABLE pulse_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id UUID REFERENCES pulse_targets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily tasks
CREATE TABLE pulse_daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  rolled_from UUID REFERENCES pulse_daily_tasks(id),
  linked_action_id UUID REFERENCES pulse_actions(id) ON DELETE SET NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pulse events log
CREATE TABLE pulse_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User pulse settings
CREATE TABLE pulse_settings (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  min_daily_pulse INT DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_pulse_goals_year ON pulse_goals(year);
CREATE INDEX idx_pulse_targets_goal ON pulse_targets(goal_id);
CREATE INDEX idx_pulse_targets_quarter ON pulse_targets(goal_id, quarter);
CREATE INDEX idx_pulse_actions_target ON pulse_actions(target_id);
CREATE INDEX idx_pulse_actions_owner ON pulse_actions(owner_id);
CREATE INDEX idx_pulse_daily_tasks_user_date ON pulse_daily_tasks(user_id, date);
CREATE INDEX idx_pulse_events_user_date ON pulse_events(user_id, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE pulse_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_target_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_settings ENABLE ROW LEVEL SECURITY;

-- Goals: Admin/Internal read all, Admin write
CREATE POLICY "pulse_goals_read" ON pulse_goals
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "pulse_goals_insert" ON pulse_goals
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "pulse_goals_update" ON pulse_goals
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "pulse_goals_delete" ON pulse_goals
  FOR DELETE USING (get_user_role() = 'admin');

-- Targets: Admin/Internal read all, Admin write
CREATE POLICY "pulse_targets_read" ON pulse_targets
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "pulse_targets_insert" ON pulse_targets
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "pulse_targets_update" ON pulse_targets
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "pulse_targets_delete" ON pulse_targets
  FOR DELETE USING (get_user_role() = 'admin');

-- Target owners: Admin/Internal read/write
CREATE POLICY "pulse_target_owners_read" ON pulse_target_owners
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "pulse_target_owners_insert" ON pulse_target_owners
  FOR INSERT WITH CHECK (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "pulse_target_owners_delete" ON pulse_target_owners
  FOR DELETE USING (get_user_role() IN ('admin', 'internal'));

-- Actions: Admin/Internal read, Admin full access, owner can update
CREATE POLICY "pulse_actions_read" ON pulse_actions
  FOR SELECT USING (get_user_role() IN ('admin', 'internal'));

CREATE POLICY "pulse_actions_admin_insert" ON pulse_actions
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "pulse_actions_admin_update" ON pulse_actions
  FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "pulse_actions_owner_update" ON pulse_actions
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "pulse_actions_admin_delete" ON pulse_actions
  FOR DELETE USING (get_user_role() = 'admin');

-- Daily tasks: Own only
CREATE POLICY "pulse_daily_tasks_select" ON pulse_daily_tasks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "pulse_daily_tasks_insert" ON pulse_daily_tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "pulse_daily_tasks_update" ON pulse_daily_tasks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "pulse_daily_tasks_delete" ON pulse_daily_tasks
  FOR DELETE USING (user_id = auth.uid());

-- Pulse events: Own only for read, insert allowed for self
CREATE POLICY "pulse_events_select" ON pulse_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "pulse_events_insert" ON pulse_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Settings: Own read/write, Admin can manage anyone's
CREATE POLICY "pulse_settings_own" ON pulse_settings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "pulse_settings_admin" ON pulse_settings
  FOR ALL USING (get_user_role() = 'admin');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER pulse_goals_updated_at
  BEFORE UPDATE ON pulse_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER pulse_targets_updated_at
  BEFORE UPDATE ON pulse_targets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER pulse_settings_updated_at
  BEFORE UPDATE ON pulse_settings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pulse_goals IS 'Shared yearly company goals for Pulse system';
COMMENT ON TABLE pulse_targets IS 'Quarterly targets that contribute to yearly goals';
COMMENT ON TABLE pulse_target_owners IS 'Many-to-many relationship for target ownership';
COMMENT ON TABLE pulse_actions IS 'Specific actions/steps to complete a target';
COMMENT ON TABLE pulse_daily_tasks IS 'Personal daily tasks with rollover support';
COMMENT ON TABLE pulse_events IS 'Log of all pulse point earning events';
COMMENT ON TABLE pulse_settings IS 'User-specific pulse configuration';

COMMENT ON COLUMN pulse_daily_tasks.rolled_from IS 'Reference to original task if this was rolled over from a previous day';
COMMENT ON COLUMN pulse_daily_tasks.linked_action_id IS 'Optional link to a target action - completing task completes action';
COMMENT ON COLUMN pulse_events.source_type IS 'Type of source: task, action, target, deliverable, requirement';
COMMENT ON COLUMN pulse_events.source_id IS 'ID of the source record that earned these points';
