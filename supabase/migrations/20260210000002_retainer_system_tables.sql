-- Retainer System Migration - Part 2
-- Creates tables, indexes, triggers, and RLS policies for retainer workflow
-- Phase 14, Plan 01 (split from 20260210000001 because new enum values
-- must be committed before they can be referenced in policies)

-- ============================================================================
-- ADD RETAINER CONFIG COLUMNS TO PROJECTS TABLE
-- ============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS check_in_cadence TEXT CHECK (check_in_cadence IN ('weekly', 'biweekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS check_in_assignees TEXT[],
  ADD COLUMN IF NOT EXISTS retainer_dev_ids UUID[],
  ADD COLUMN IF NOT EXISTS completion_summary JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retainer_started_at TIMESTAMPTZ;

-- ============================================================================
-- CREATE RETAINER_CHECK_INS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS retainer_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  health TEXT NOT NULL CHECK (health IN ('green', 'yellow', 'red')),
  notes TEXT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CREATE RETAINER_TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS retainer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assignee_id UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- CREATE PROJECT_IMPROVEMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS project_improvements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'nice_to_have' CHECK (priority IN ('nice_to_have', 'important', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'converted')),
  converted_project_id UUID REFERENCES projects(id),
  added_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_retainer_check_ins_project_created
  ON retainer_check_ins(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_retainer_tasks_project_status
  ON retainer_tasks(project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_improvements_project_status
  ON project_improvements(project_id, status);

-- ============================================================================
-- UPDATED_AT TRIGGER FOR RETAINER_TASKS
-- ============================================================================

CREATE TRIGGER retainer_tasks_updated_at
  BEFORE UPDATE ON retainer_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES - RETAINER_CHECK_INS
-- ============================================================================

ALTER TABLE retainer_check_ins ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin sees all, DFY sees own projects, Dev sees assigned retainer projects
CREATE POLICY retainer_check_ins_select_policy ON retainer_check_ins
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_check_ins.project_id
        AND (
          -- DFY sees own projects
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          -- Dev sees if they're assigned to retainer
          OR (public.get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
        )
    )
  );

-- INSERT: Same as SELECT but also require project status = 'retainer'
CREATE POLICY retainer_check_ins_insert_policy ON retainer_check_ins
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_check_ins.project_id
        AND projects.status = 'retainer'
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
        )
    )
  );

-- ============================================================================
-- RLS POLICIES - RETAINER_TASKS
-- ============================================================================

ALTER TABLE retainer_tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin sees all, DFY sees own projects, Dev sees assigned retainer projects
CREATE POLICY retainer_tasks_select_policy ON retainer_tasks
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_tasks.project_id
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
        )
    )
  );

-- INSERT: Same as SELECT + project must be in retainer or completed status
CREATE POLICY retainer_tasks_insert_policy ON retainer_tasks
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_tasks.project_id
        AND projects.status IN ('retainer', 'completed')
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
        )
    )
  );

-- UPDATE: Same as INSERT
CREATE POLICY retainer_tasks_update_policy ON retainer_tasks
  FOR UPDATE
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = retainer_tasks.project_id
        AND projects.status IN ('retainer', 'completed')
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND auth.uid() = ANY(projects.retainer_dev_ids))
        )
    )
  );

-- DELETE: Admin only
CREATE POLICY retainer_tasks_delete_policy ON retainer_tasks
  FOR DELETE
  USING (public.get_user_role() = 'admin');

-- ============================================================================
-- RLS POLICIES - PROJECT_IMPROVEMENTS
-- ============================================================================

ALTER TABLE project_improvements ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin sees all, DFY sees own projects, Dev sees assigned projects
CREATE POLICY project_improvements_select_policy ON project_improvements
  FOR SELECT
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_improvements.project_id
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND (
            projects.assigned_dev_id = auth.uid()
            OR auth.uid() = ANY(projects.retainer_dev_ids)
          ))
        )
    )
  );

-- INSERT: Same as SELECT (anyone on team can add)
CREATE POLICY project_improvements_insert_policy ON project_improvements
  FOR INSERT
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_improvements.project_id
        AND (
          (public.get_user_role() = 'dfy' AND projects.dfy_partner_id = auth.uid())
          OR (public.get_user_role() = 'dev' AND (
            projects.assigned_dev_id = auth.uid()
            OR auth.uid() = ANY(projects.retainer_dev_ids)
          ))
        )
    )
  );

-- UPDATE: Admin only (for status changes to 'converted')
CREATE POLICY project_improvements_update_policy ON project_improvements
  FOR UPDATE
  USING (public.get_user_role() = 'admin');

-- DELETE: Admin only
CREATE POLICY project_improvements_delete_policy ON project_improvements
  FOR DELETE
  USING (public.get_user_role() = 'admin');
