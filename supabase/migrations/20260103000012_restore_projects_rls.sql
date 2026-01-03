-- Restore RLS policies for projects table
-- These were accidentally dropped during emergency RLS fix (20260103000011)
-- and never recreated.
--
-- CRITICAL: Do NOT use can_access_project() here! That function queries
-- the projects table, which would create infinite recursion when used
-- in the projects table's own RLS policy. Use inline checks instead.

-- Admin: Full access to all projects
CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

-- Internal: Can view all projects
CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

-- Internal: Can insert/update projects
CREATE POLICY "projects_internal_write" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

CREATE POLICY "projects_internal_update" ON projects
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'internal'
  );

-- Dev: Can only see projects assigned to them
CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

-- DFY: Can only see projects they referred
CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

-- Client: Can only see their own project
CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'client' AND client_id = auth.uid()
  );
