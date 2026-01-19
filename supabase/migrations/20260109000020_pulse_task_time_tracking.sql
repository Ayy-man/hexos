-- Migration: Add time tracking support for Pulse tasks
-- This extends the existing time tracking system (deliverables) to also support pulse daily tasks

-- ============================================================================
-- 1. Add time tracking fields to pulse_daily_tasks
-- ============================================================================

ALTER TABLE pulse_daily_tasks
ADD COLUMN IF NOT EXISTS time_logged_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_required BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN pulse_daily_tasks.time_logged_minutes IS 'Denormalized sum of all time_entries for this task';
COMMENT ON COLUMN pulse_daily_tasks.time_required IS 'If true, task cannot be completed without logging time';

-- ============================================================================
-- 2. Extend time_entries to support pulse tasks
-- ============================================================================

-- Make deliverable_id nullable (was NOT NULL before)
ALTER TABLE time_entries
ALTER COLUMN deliverable_id DROP NOT NULL;

-- Add pulse_task_id column
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS pulse_task_id UUID REFERENCES pulse_daily_tasks(id) ON DELETE CASCADE;

-- Add constraint: exactly one target must be set (deliverable OR pulse_task, not both, not neither)
ALTER TABLE time_entries
DROP CONSTRAINT IF EXISTS time_entries_single_target;

ALTER TABLE time_entries
ADD CONSTRAINT time_entries_single_target CHECK (
  (deliverable_id IS NOT NULL AND pulse_task_id IS NULL) OR
  (deliverable_id IS NULL AND pulse_task_id IS NOT NULL)
);

-- Index for efficient pulse task lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_pulse_task ON time_entries(pulse_task_id);

-- ============================================================================
-- 3. Extend active_timers to support pulse tasks
-- ============================================================================

-- Make deliverable_id nullable
ALTER TABLE active_timers
ALTER COLUMN deliverable_id DROP NOT NULL;

-- Add pulse_task_id column
ALTER TABLE active_timers
ADD COLUMN IF NOT EXISTS pulse_task_id UUID REFERENCES pulse_daily_tasks(id) ON DELETE CASCADE;

-- Add constraint: exactly one target must be set
ALTER TABLE active_timers
DROP CONSTRAINT IF EXISTS active_timers_single_target;

ALTER TABLE active_timers
ADD CONSTRAINT active_timers_single_target CHECK (
  (deliverable_id IS NOT NULL AND pulse_task_id IS NULL) OR
  (deliverable_id IS NULL AND pulse_task_id IS NOT NULL)
);

-- ============================================================================
-- 4. Trigger to auto-sync time_logged_minutes on pulse_daily_tasks
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_pulse_task_time_logged()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT or UPDATE, recalculate for new pulse_task_id
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.pulse_task_id IS NOT NULL THEN
    UPDATE pulse_daily_tasks
    SET time_logged_minutes = (
      SELECT COALESCE(SUM(duration_minutes), 0)
      FROM time_entries
      WHERE pulse_task_id = NEW.pulse_task_id
    )
    WHERE id = NEW.pulse_task_id;
  END IF;

  -- On DELETE or UPDATE (old value), recalculate for old pulse_task_id
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') AND OLD.pulse_task_id IS NOT NULL THEN
    UPDATE pulse_daily_tasks
    SET time_logged_minutes = (
      SELECT COALESCE(SUM(duration_minutes), 0)
      FROM time_entries
      WHERE pulse_task_id = OLD.pulse_task_id
    )
    WHERE id = OLD.pulse_task_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS time_entries_pulse_sync ON time_entries;

-- Create trigger for INSERT, UPDATE, DELETE
CREATE TRIGGER time_entries_pulse_sync
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION sync_pulse_task_time_logged();

-- ============================================================================
-- 5. Update RLS policies for time_entries to handle pulse tasks
-- ============================================================================

-- Drop existing dev insert policy and recreate with pulse task support
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

-- Update select policy to include pulse tasks
DROP POLICY IF EXISTS "time_entries_select" ON time_entries;

CREATE POLICY "time_entries_select" ON time_entries
  FOR SELECT USING (
    -- Users can see their own entries
    user_id = auth.uid() OR
    -- Admins can see all
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 6. Update RLS policies for active_timers to handle pulse tasks
-- ============================================================================

-- Ensure users can only manage their own timers (existing behavior, just verify)
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
