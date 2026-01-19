-- ============================================================================
-- SCOPE MONITORING SYSTEM
-- Tracks scope changes after client sign-off with baseline comparison
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Request type for scope changes
CREATE TYPE scope_change_request_type AS ENUM (
  'clarification',
  'new_scope',
  'reduction',
  'timeline_change'
);

-- Extend the existing scope_change_trigger enum with new values
ALTER TYPE scope_change_trigger ADD VALUE IF NOT EXISTS 'hours_increased';
ALTER TYPE scope_change_trigger ADD VALUE IF NOT EXISTS 'deliverable_added';
ALTER TYPE scope_change_trigger ADD VALUE IF NOT EXISTS 'deliverable_removed';

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Scope Baselines - Snapshot captured at sign-off
CREATE TABLE scope_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Capture metadata
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by UUID NOT NULL REFERENCES profiles(id),

  -- Snapshot data
  deliverables_snapshot JSONB NOT NULL DEFAULT '[]',
  total_estimated_hours DECIMAL(8,2),
  deliverable_count INTEGER NOT NULL DEFAULT 0,

  -- Project state at capture
  project_timeline_start DATE,
  project_timeline_end DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one baseline per project (can be updated on re-sign-off)
  CONSTRAINT unique_project_baseline UNIQUE (project_id)
);

-- Scope Change Comments - Discussion threads on scope changes
CREATE TABLE scope_change_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_change_id UUID NOT NULL REFERENCES scope_changes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  content TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ENHANCE EXISTING scope_changes TABLE
-- ============================================================================

-- Add new columns to scope_changes
ALTER TABLE scope_changes
  ADD COLUMN IF NOT EXISTS request_type scope_change_request_type,
  ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS affected_deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS change_delta JSONB,
  ADD COLUMN IF NOT EXISTS hours_delta DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS cost_delta DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS timeline_delta_days INTEGER,
  ADD COLUMN IF NOT EXISTS baseline_id UUID REFERENCES scope_baselines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS baseline_deliverable_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing status values to match new system
-- detected -> pending_review, denied -> rejected
COMMENT ON COLUMN scope_changes.status IS 'pending_review, approved, rejected';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_scope_baselines_project ON scope_baselines(project_id);
CREATE INDEX idx_scope_baselines_captured_at ON scope_baselines(captured_at DESC);

CREATE INDEX idx_scope_change_comments_change ON scope_change_comments(scope_change_id);
CREATE INDEX idx_scope_change_comments_user ON scope_change_comments(user_id);

CREATE INDEX idx_scope_changes_status ON scope_changes(status);
CREATE INDEX idx_scope_changes_baseline ON scope_changes(baseline_id);
CREATE INDEX idx_scope_changes_requested_by ON scope_changes(requested_by);
CREATE INDEX idx_scope_changes_affected_deliverable ON scope_changes(affected_deliverable_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Capture scope baseline for a project
CREATE OR REPLACE FUNCTION capture_scope_baseline(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_baseline_id UUID;
  v_deliverables JSONB;
  v_total_hours DECIMAL(8,2);
  v_count INTEGER;
  v_timeline_start DATE;
  v_timeline_end DATE;
BEGIN
  -- Get deliverables snapshot
  SELECT
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'title', d.title,
        'description', d.description,
        'status', d.status,
        'estimated_hours', d.estimated_hours,
        'start_date', d.start_date,
        'due_date', d.due_date,
        'sort_order', d.sort_order
      ) ORDER BY d.sort_order
    ), '[]'::JSONB),
    COALESCE(SUM(d.estimated_hours), 0),
    COUNT(*),
    MIN(d.start_date),
    MAX(d.due_date)
  INTO v_deliverables, v_total_hours, v_count, v_timeline_start, v_timeline_end
  FROM deliverables d
  WHERE d.project_id = p_project_id;

  -- Insert or update baseline (upsert)
  INSERT INTO scope_baselines (
    project_id,
    captured_by,
    deliverables_snapshot,
    total_estimated_hours,
    deliverable_count,
    project_timeline_start,
    project_timeline_end
  ) VALUES (
    p_project_id,
    p_user_id,
    v_deliverables,
    v_total_hours,
    v_count,
    v_timeline_start,
    v_timeline_end
  )
  ON CONFLICT (project_id) DO UPDATE SET
    captured_at = NOW(),
    captured_by = p_user_id,
    deliverables_snapshot = v_deliverables,
    total_estimated_hours = v_total_hours,
    deliverable_count = v_count,
    project_timeline_start = v_timeline_start,
    project_timeline_end = v_timeline_end
  RETURNING id INTO v_baseline_id;

  RETURN v_baseline_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active baseline for a project
CREATE OR REPLACE FUNCTION get_active_baseline(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  captured_at TIMESTAMPTZ,
  captured_by UUID,
  deliverables_snapshot JSONB,
  total_estimated_hours DECIMAL(8,2),
  deliverable_count INTEGER,
  project_timeline_start DATE,
  project_timeline_end DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sb.id,
    sb.project_id,
    sb.captured_at,
    sb.captured_by,
    sb.deliverables_snapshot,
    sb.total_estimated_hours,
    sb.deliverable_count,
    sb.project_timeline_start,
    sb.project_timeline_end
  FROM scope_baselines sb
  WHERE sb.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if project has baseline
CREATE OR REPLACE FUNCTION has_scope_baseline(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM scope_baselines WHERE project_id = p_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get scope change metrics for a project
CREATE OR REPLACE FUNCTION get_scope_metrics(p_project_id UUID)
RETURNS TABLE (
  total_changes BIGINT,
  pending_changes BIGINT,
  approved_changes BIGINT,
  rejected_changes BIGINT,
  net_hours_delta DECIMAL(8,2),
  net_cost_delta DECIMAL(10,2),
  has_baseline BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_changes,
    COUNT(*) FILTER (WHERE sc.status = 'pending_review')::BIGINT AS pending_changes,
    COUNT(*) FILTER (WHERE sc.status = 'approved')::BIGINT AS approved_changes,
    COUNT(*) FILTER (WHERE sc.status IN ('rejected', 'denied'))::BIGINT AS rejected_changes,
    COALESCE(SUM(sc.hours_delta) FILTER (WHERE sc.status = 'approved'), 0)::DECIMAL(8,2) AS net_hours_delta,
    COALESCE(SUM(sc.cost_delta) FILTER (WHERE sc.status = 'approved'), 0)::DECIMAL(10,2) AS net_cost_delta,
    EXISTS (SELECT 1 FROM scope_baselines WHERE scope_baselines.project_id = p_project_id) AS has_baseline
  FROM scope_changes sc
  WHERE sc.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE scope_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_change_comments ENABLE ROW LEVEL SECURITY;

-- scope_baselines: Anyone who can access the project can view
CREATE POLICY "View baselines via project access"
  ON scope_baselines FOR SELECT
  TO authenticated
  USING (can_access_project(project_id));

-- Admin/internal can manage baselines
CREATE POLICY "Admin manage baselines"
  ON scope_baselines FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- scope_change_comments: View if can access project
CREATE POLICY "View comments via scope change project access"
  ON scope_change_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scope_changes sc
      WHERE sc.id = scope_change_comments.scope_change_id
      AND can_access_project(sc.project_id)
    )
  );

-- Anyone can add comments on scope changes they can access
CREATE POLICY "Add comments on accessible scope changes"
  ON scope_change_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM scope_changes sc
      WHERE sc.id = scope_change_comments.scope_change_id
      AND can_access_project(sc.project_id)
    )
    AND user_id = auth.uid()
  );

-- Users can update/delete their own comments
CREATE POLICY "Manage own comments"
  ON scope_change_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own comments"
  ON scope_change_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Update scope_changes policies to allow anyone to INSERT (flag)
DROP POLICY IF EXISTS "scope_changes_access_via_project" ON scope_changes;
DROP POLICY IF EXISTS "scope_changes_admin_all" ON scope_changes;

-- View scope changes via project access
CREATE POLICY "View scope changes via project"
  ON scope_changes FOR SELECT
  TO authenticated
  USING (can_access_project(project_id));

-- Anyone who can access project can flag scope changes
CREATE POLICY "Flag scope changes via project access"
  ON scope_changes FOR INSERT
  TO authenticated
  WITH CHECK (can_access_project(project_id));

-- Admin/internal can update (approve/reject)
CREATE POLICY "Admin update scope changes"
  ON scope_changes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- Admin can delete scope changes
CREATE POLICY "Admin delete scope changes"
  ON scope_changes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'internal')
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT USAGE ON TYPE scope_change_request_type TO authenticated;
GRANT USAGE ON TYPE scope_change_request_type TO service_role;

GRANT EXECUTE ON FUNCTION capture_scope_baseline(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION capture_scope_baseline(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_active_baseline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_baseline(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION has_scope_baseline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_scope_baseline(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_scope_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scope_metrics(UUID) TO service_role;
