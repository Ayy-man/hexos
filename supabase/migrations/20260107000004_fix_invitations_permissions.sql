-- Fix table permissions for dev experience + project invitations system
-- These tables were created without GRANT statements, causing
-- "permission denied for table" errors

-- ============================================================================
-- GRANT TABLE PERMISSIONS - DEV EXPERIENCE (migration 20260107000001)
-- ============================================================================

-- Time tracking tables
GRANT SELECT, INSERT, UPDATE, DELETE ON time_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_timers TO authenticated;

-- Blockers tables
GRANT SELECT, INSERT, UPDATE, DELETE ON blockers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON blocker_comments TO authenticated;

-- Notes and queue tables
GRANT SELECT, INSERT, UPDATE, DELETE ON deliverable_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dev_task_queue TO authenticated;

-- Notifications table
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

-- ============================================================================
-- GRANT TABLE PERMISSIONS - PROJECT INVITATIONS (migration 20260107000002)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON project_opportunities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dev_skills TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON dev_availability TO authenticated;

-- Grant read-only to anon for public opportunities (RLS handles row filtering)
GRANT SELECT ON project_opportunities TO anon;
GRANT SELECT ON dev_availability TO anon;

-- ============================================================================
-- GRANT ENUM TYPE USAGE - DEV EXPERIENCE
-- ============================================================================

GRANT USAGE ON TYPE blocker_status TO authenticated;
GRANT USAGE ON TYPE blocker_priority TO authenticated;
GRANT USAGE ON TYPE notification_type TO authenticated;
GRANT USAGE ON TYPE note_visibility TO authenticated;

-- ============================================================================
-- GRANT ENUM TYPE USAGE - PROJECT INVITATIONS
-- ============================================================================

GRANT USAGE ON TYPE invitation_status TO authenticated;
GRANT USAGE ON TYPE opportunity_status TO authenticated;
GRANT USAGE ON TYPE application_status TO authenticated;
GRANT USAGE ON TYPE project_complexity TO authenticated;

-- Also grant to anon for public-facing features
GRANT USAGE ON TYPE opportunity_status TO anon;
GRANT USAGE ON TYPE project_complexity TO anon;

-- ============================================================================
-- SIMPLIFY DEV_SELECT POLICY (optional but safer)
-- ============================================================================

-- Drop the problematic function-based policy
DROP POLICY IF EXISTS "opportunities_dev_select" ON project_opportunities;

-- Recreate with inline subquery (PostgreSQL handles this better)
CREATE POLICY "opportunities_dev_select" ON project_opportunities
  FOR SELECT USING (
    get_user_role() = 'dev' AND (
      is_public = TRUE
      OR id IN (SELECT opportunity_id FROM project_invitations WHERE dev_id = auth.uid())
    )
  );
