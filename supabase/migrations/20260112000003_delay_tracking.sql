-- hexOS Phase 4.2: Delay Tracking & Project Extensions
-- Track client and dev delays, enable timeline extensions with DFY approval

-- ============================================
-- 1. Create delay_type enum
-- ============================================
DO $$ BEGIN
  CREATE TYPE delay_type AS ENUM ('client_delay', 'dev_delay');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Create project_delays table
-- ============================================
CREATE TABLE project_delays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  delay_type delay_type NOT NULL,
  delay_date DATE NOT NULL,
  days_count INT DEFAULT 1 CHECK (days_count >= 1),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  blocker_id UUID REFERENCES blockers(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Retroactive limit: 3 days
  CONSTRAINT valid_delay_date CHECK (delay_date >= CURRENT_DATE - INTERVAL '3 days')
);

COMMENT ON TABLE project_delays IS 'Tracks delays on projects (client-caused vs dev-caused)';
COMMENT ON COLUMN project_delays.delay_type IS 'client_delay adjusts expected progress, dev_delay is for accountability';
COMMENT ON COLUMN project_delays.days_count IS 'Number of consecutive delay days (usually 1)';

-- ============================================
-- 3. Create extension_status enum
-- ============================================
DO $$ BEGIN
  CREATE TYPE extension_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 4. Create project_extensions table
-- ============================================
CREATE TABLE project_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status extension_status DEFAULT 'pending',
  original_deadline DATE NOT NULL,
  requested_deadline DATE NOT NULL,
  client_delay_days INT DEFAULT 0,
  additional_days INT DEFAULT 0,
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

COMMENT ON TABLE project_extensions IS 'Deadline extension requests requiring DFY approval';
COMMENT ON COLUMN project_extensions.client_delay_days IS 'Auto-calculated sum of client delays';
COMMENT ON COLUMN project_extensions.additional_days IS 'Extra days requested beyond client delays';

-- ============================================
-- 5. Add original_target_date to projects
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS original_target_date DATE;

COMMENT ON COLUMN projects.original_target_date IS 'Original delivery date before any extensions';

-- Backfill: Set original_target_date from current target_delivery_date
UPDATE projects
SET original_target_date = target_delivery_date
WHERE original_target_date IS NULL AND target_delivery_date IS NOT NULL;

-- ============================================
-- 6. Indexes
-- ============================================
CREATE INDEX idx_project_delays_project ON project_delays(project_id);
CREATE INDEX idx_project_delays_date ON project_delays(delay_date DESC);
CREATE INDEX idx_project_delays_type ON project_delays(project_id, delay_type);
CREATE INDEX idx_project_extensions_project ON project_extensions(project_id);
CREATE INDEX idx_project_extensions_status ON project_extensions(status);

-- ============================================
-- 7. Enable RLS
-- ============================================
ALTER TABLE project_delays ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_extensions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS Policies for project_delays
-- ============================================

-- Select: Anyone who can access the project
CREATE POLICY "project_delays_select" ON project_delays
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.can_access_project(project_id)
  );

-- Insert: Admin/internal can mark both types, dev can only mark client_delay
CREATE POLICY "project_delays_insert_admin" ON project_delays
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal')
    AND public.can_access_project(project_id)
  );

CREATE POLICY "project_delays_insert_dev" ON project_delays
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'dev'
    AND delay_type = 'client_delay'
    AND public.can_access_project(project_id)
  );

-- Update: Admin only
CREATE POLICY "project_delays_update" ON project_delays
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'admin'
  );

-- Delete: Admin only
CREATE POLICY "project_delays_delete" ON project_delays
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'admin'
  );

-- ============================================
-- 9. RLS Policies for project_extensions
-- ============================================

-- Select: Anyone who can access the project (DFY needs to see to approve)
CREATE POLICY "project_extensions_select" ON project_extensions
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.can_access_project(project_id)
  );

-- Insert: Admin/internal only (they create the extension requests)
CREATE POLICY "project_extensions_insert" ON project_extensions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal')
    AND public.can_access_project(project_id)
  );

-- Update: Admin can update any, DFY can only update status/reviewed fields
CREATE POLICY "project_extensions_update_admin" ON project_extensions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal')
    AND public.can_access_project(project_id)
  );

CREATE POLICY "project_extensions_update_dfy" ON project_extensions
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'dfy'
    AND public.can_access_project(project_id)
  );

-- Delete: Admin only
CREATE POLICY "project_extensions_delete" ON project_extensions
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() = 'admin'
  );

-- ============================================
-- 10. Function: Calculate client delay days for a project
-- ============================================
CREATE OR REPLACE FUNCTION public.get_client_delay_days(p_project_id UUID)
RETURNS INT AS $$
DECLARE
  v_total_days INT;
BEGIN
  SELECT COALESCE(SUM(days_count), 0)
  INTO v_total_days
  FROM project_delays
  WHERE project_id = p_project_id
    AND delay_type = 'client_delay';

  RETURN v_total_days;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_client_delay_days IS 'Returns total client delay days for a project';

-- ============================================
-- 11. Trigger: Auto-update target_delivery_date on extension approval
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_extension_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update the project's target delivery date
    UPDATE projects
    SET target_delivery_date = NEW.requested_deadline
    WHERE id = NEW.project_id;

    -- Set the reviewed timestamp
    NEW.reviewed_at := NOW();
    NEW.reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER project_extensions_apply_approval
  BEFORE UPDATE ON project_extensions
  FOR EACH ROW EXECUTE FUNCTION apply_extension_approval();

-- ============================================
-- 12. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON project_delays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_extensions TO authenticated;
