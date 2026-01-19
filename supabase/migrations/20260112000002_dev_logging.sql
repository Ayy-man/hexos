-- hexOS Phase 4.2: Dev Logging System
-- Daily check-ins with progress tracking and snooze functionality

-- ============================================
-- 1. Add day_ends_at to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS day_ends_at TIME DEFAULT '18:00';

COMMENT ON COLUMN profiles.day_ends_at IS 'Time when dev workday ends, used for check-in reminders';

-- ============================================
-- 2. Create dev_checkins table
-- ============================================
CREATE TABLE dev_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  checkin_type TEXT NOT NULL CHECK (checkin_type IN ('progress', 'no_work', 'delay')),
  summary TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, checkin_date)
);

COMMENT ON TABLE dev_checkins IS 'Daily check-ins from devs for each project they are assigned to';
COMMENT ON COLUMN dev_checkins.checkin_type IS 'progress = worked on project, no_work = did not work, delay = blocked by client/external';
COMMENT ON COLUMN dev_checkins.locked_at IS 'Timestamp after which this check-in cannot be edited (created_at + 24h)';

-- ============================================
-- 3. Create checkin_notes table (per-deliverable)
-- ============================================
CREATE TABLE checkin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES dev_checkins(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  note TEXT,
  position_before INT CHECK (position_before >= 0 AND position_before <= 100),
  position_after INT CHECK (position_after >= 0 AND position_after <= 100),
  position_delta INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checkin_id, deliverable_id)
);

COMMENT ON TABLE checkin_notes IS 'Per-deliverable notes within a check-in, tracking position changes';
COMMENT ON COLUMN checkin_notes.position_delta IS 'Change in hill position: -5, 0, +5, +10, etc.';

-- ============================================
-- 4. Create checkin_snoozes table
-- ============================================
CREATE TABLE checkin_snoozes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snoozed_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

COMMENT ON TABLE checkin_snoozes IS 'Tracks when a dev has snoozed their check-in reminder';

-- ============================================
-- 5. Link position history to check-ins
-- ============================================
ALTER TABLE deliverable_position_history
ADD COLUMN IF NOT EXISTS checkin_id UUID REFERENCES dev_checkins(id) ON DELETE SET NULL;

COMMENT ON COLUMN deliverable_position_history.checkin_id IS 'Links position update to the check-in that triggered it';

-- ============================================
-- 6. Indexes
-- ============================================
CREATE INDEX idx_dev_checkins_user ON dev_checkins(user_id);
CREATE INDEX idx_dev_checkins_project ON dev_checkins(project_id);
CREATE INDEX idx_dev_checkins_date ON dev_checkins(checkin_date DESC);
CREATE INDEX idx_dev_checkins_user_date ON dev_checkins(user_id, checkin_date DESC);
CREATE INDEX idx_checkin_notes_checkin ON checkin_notes(checkin_id);
CREATE INDEX idx_checkin_notes_deliverable ON checkin_notes(deliverable_id);
CREATE INDEX idx_checkin_snoozes_user ON checkin_snoozes(user_id);
CREATE INDEX idx_del_position_history_checkin ON deliverable_position_history(checkin_id);

-- ============================================
-- 7. Enable RLS
-- ============================================
ALTER TABLE dev_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_snoozes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS Policies for dev_checkins
-- ============================================

-- Select: Admin/internal can see all, dev can see own check-ins for assigned projects
CREATE POLICY "dev_checkins_select" ON dev_checkins
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (
      public.get_user_role() IN ('admin', 'internal')
      OR (public.get_user_role() = 'dev' AND user_id = auth.uid())
    )
    AND public.can_access_project(project_id)
  );

-- Insert: Dev can create check-ins for their assigned projects
CREATE POLICY "dev_checkins_insert" ON dev_checkins
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND public.get_user_role() = 'dev'
    AND public.can_access_project(project_id)
  );

-- Update: Dev can update own check-ins if not locked, admin can always update
CREATE POLICY "dev_checkins_update" ON dev_checkins
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND (
      (user_id = auth.uid() AND (locked_at IS NULL OR locked_at > NOW()))
      OR public.get_user_role() = 'admin'
    )
    AND public.can_access_project(project_id)
  );

-- Delete: Admin only
CREATE POLICY "dev_checkins_delete" ON dev_checkins
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'admin'
  );

-- ============================================
-- 9. RLS Policies for checkin_notes
-- ============================================

-- Select: Same as parent check-in
CREATE POLICY "checkin_notes_select" ON checkin_notes
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dev_checkins dc
      WHERE dc.id = checkin_notes.checkin_id
      AND (
        public.get_user_role() IN ('admin', 'internal')
        OR (public.get_user_role() = 'dev' AND dc.user_id = auth.uid())
      )
    )
  );

-- Insert: Dev can add notes to own check-ins
CREATE POLICY "checkin_notes_insert" ON checkin_notes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dev_checkins dc
      WHERE dc.id = checkin_notes.checkin_id
      AND dc.user_id = auth.uid()
      AND (dc.locked_at IS NULL OR dc.locked_at > NOW())
    )
  );

-- Update: Dev can update own notes if check-in not locked
CREATE POLICY "checkin_notes_update" ON checkin_notes
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM dev_checkins dc
      WHERE dc.id = checkin_notes.checkin_id
      AND dc.user_id = auth.uid()
      AND (dc.locked_at IS NULL OR dc.locked_at > NOW())
    )
  );

-- Delete: Admin only
CREATE POLICY "checkin_notes_delete" ON checkin_notes
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'admin'
  );

-- ============================================
-- 10. RLS Policies for checkin_snoozes
-- ============================================

-- Users can only see/modify their own snooze
CREATE POLICY "checkin_snoozes_select" ON checkin_snoozes
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "checkin_snoozes_insert" ON checkin_snoozes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "checkin_snoozes_update" ON checkin_snoozes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "checkin_snoozes_delete" ON checkin_snoozes
  FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 11. Trigger: Auto-set locked_at on insert
-- ============================================
CREATE OR REPLACE FUNCTION public.set_checkin_locked_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Lock the check-in 24 hours after creation
  NEW.locked_at := NEW.created_at + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dev_checkins_set_locked_at
  BEFORE INSERT ON dev_checkins
  FOR EACH ROW EXECUTE FUNCTION set_checkin_locked_at();

-- ============================================
-- 12. Trigger: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_checkin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dev_checkins_updated_at
  BEFORE UPDATE ON dev_checkins
  FOR EACH ROW EXECUTE FUNCTION update_checkin_timestamp();

-- ============================================
-- 13. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON dev_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON checkin_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON checkin_snoozes TO authenticated;
