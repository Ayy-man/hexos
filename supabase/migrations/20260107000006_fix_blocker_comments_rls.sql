-- Fix blocker_comments RLS policies
-- The existing policies use nested function calls that may fail silently

-- Drop existing policies
DROP POLICY IF EXISTS "blocker_comments_admin_all" ON blocker_comments;
DROP POLICY IF EXISTS "blocker_comments_project_select" ON blocker_comments;
DROP POLICY IF EXISTS "blocker_comments_project_insert" ON blocker_comments;
DROP POLICY IF EXISTS "blocker_comments_own_update" ON blocker_comments;

-- Recreate with simpler, more reliable policies

-- Admin can do everything
CREATE POLICY "blocker_comments_admin_all" ON blocker_comments
  FOR ALL USING (get_user_role() = 'admin');

-- Anyone can SELECT comments on blockers in projects they can access
CREATE POLICY "blocker_comments_select" ON blocker_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM blockers b
      WHERE b.id = blocker_comments.blocker_id
      AND (
        get_user_role() = 'admin'
        OR b.reported_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_assignments pa
          WHERE pa.project_id = b.project_id
          AND pa.user_id = auth.uid()
        )
      )
    )
  );

-- Users can INSERT comments on blockers they can access
CREATE POLICY "blocker_comments_insert" ON blocker_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM blockers b
      WHERE b.id = blocker_comments.blocker_id
      AND (
        get_user_role() = 'admin'
        OR b.reported_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_assignments pa
          WHERE pa.project_id = b.project_id
          AND pa.user_id = auth.uid()
        )
      )
    )
  );

-- Users can UPDATE their own comments
CREATE POLICY "blocker_comments_update" ON blocker_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Users can DELETE their own comments
CREATE POLICY "blocker_comments_delete" ON blocker_comments
  FOR DELETE USING (user_id = auth.uid());

-- Ensure GRANT is in place
GRANT SELECT, INSERT, UPDATE, DELETE ON blocker_comments TO authenticated;
