-- Migration: Fix time tracking RLS policies for pulse tasks
-- The pulse task time tracking migration (20260109000020) didn't drop the
-- original policies from the foundation migration (20260107000001).
-- This causes inserts with pulse_task_id (and deliverable_id = NULL) to fail.

-- ============================================================================
-- 1. Drop conflicting time_entries policies
-- ============================================================================

-- The original "time_entries_own_insert" policy assumes deliverable_id is NOT NULL
-- and calls get_deliverable_project_id(deliverable_id) which fails for pulse tasks
DROP POLICY IF EXISTS "time_entries_own_insert" ON time_entries;

-- Also drop and recreate these to ensure consistency
DROP POLICY IF EXISTS "time_entries_own_update" ON time_entries;
DROP POLICY IF EXISTS "time_entries_own_delete" ON time_entries;

-- Recreate update policy without deliverable assumption
CREATE POLICY "time_entries_own_update" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());

-- Recreate delete policy without deliverable assumption
CREATE POLICY "time_entries_own_delete" ON time_entries
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- 2. Drop conflicting active_timers policies
-- ============================================================================

-- The original "active_timers_own_all" policy doesn't have proper WITH CHECK
-- for the new constraint requiring exactly one of deliverable_id or pulse_task_id
DROP POLICY IF EXISTS "active_timers_own_all" ON active_timers;

-- Ensure the pulse task policy exists (it may have been created by previous migration)
-- Drop and recreate to ensure it's correct
DROP POLICY IF EXISTS "active_timers_own" ON active_timers;

CREATE POLICY "active_timers_own" ON active_timers
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    (
      -- For deliverables: must have access to the project
      (deliverable_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM deliverables d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = deliverable_id
        AND (p.assigned_dev_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'internal')
        ))
      )) OR
      -- For pulse tasks: must own the task
      (pulse_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM pulse_daily_tasks
        WHERE id = pulse_task_id AND user_id = auth.uid()
      ))
    )
  );

-- ============================================================================
-- 3. Ensure time_entries INSERT policy is correct
-- ============================================================================

-- Recreate the dev insert policy to be sure it's correct
DROP POLICY IF EXISTS "time_entries_dev_insert" ON time_entries;

CREATE POLICY "time_entries_dev_insert" ON time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    (
      -- For deliverables: must have access to the project
      (deliverable_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM deliverables d
        JOIN projects p ON d.project_id = p.id
        WHERE d.id = deliverable_id
        AND (p.assigned_dev_id = auth.uid() OR EXISTS (
          SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )) OR
      -- For pulse tasks: must own the task
      (pulse_task_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM pulse_daily_tasks
        WHERE id = pulse_task_id AND user_id = auth.uid()
      ))
    )
  );

-- ============================================================================
-- 4. Ensure SELECT policy is correct
-- ============================================================================

DROP POLICY IF EXISTS "time_entries_select" ON time_entries;

CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT USING (
    -- Users can see their own entries
    user_id = auth.uid() OR
    -- Admins can see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
