-- Restore RLS policies for projects table
-- These were accidentally dropped during emergency RLS fix (20260103000011)
-- and never recreated.

-- SELECT: Use can_access_project() for role-based access
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (can_access_project(id));

-- INSERT: Only admin/internal can create projects
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal')
  );

-- UPDATE: Admin can update any, others via can_access_project
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (can_access_project(id));

-- DELETE: Only admin can delete
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );
