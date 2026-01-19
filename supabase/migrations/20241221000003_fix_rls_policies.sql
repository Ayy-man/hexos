-- Fix RLS policies to check auth.uid() IS NOT NULL before calling get_user_role()
-- This prevents errors when querying without authentication

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'admin'
  );

-- Drop and recreate projects policies
DROP POLICY IF EXISTS "projects_admin_all" ON projects;
DROP POLICY IF EXISTS "projects_internal_select" ON projects;
DROP POLICY IF EXISTS "projects_dev_select" ON projects;
DROP POLICY IF EXISTS "projects_dfy_select" ON projects;
DROP POLICY IF EXISTS "projects_client_select" ON projects;

CREATE POLICY "projects_admin_all" ON projects
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

CREATE POLICY "projects_internal_select" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "projects_dev_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND assigned_dev_id = auth.uid()
  );

CREATE POLICY "projects_dfy_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND dfy_partner_id = auth.uid()
  );

CREATE POLICY "projects_client_select" ON projects
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'client' AND client_id = auth.uid()
  );

-- Fix deliverables policies
DROP POLICY IF EXISTS "deliverables_access_via_project" ON deliverables;
DROP POLICY IF EXISTS "deliverables_admin_all" ON deliverables;
DROP POLICY IF EXISTS "deliverables_internal_insert_update" ON deliverables;
DROP POLICY IF EXISTS "deliverables_internal_update" ON deliverables;
DROP POLICY IF EXISTS "deliverables_dev_update_status" ON deliverables;

CREATE POLICY "deliverables_access_via_project" ON deliverables
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

CREATE POLICY "deliverables_admin_all" ON deliverables
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

CREATE POLICY "deliverables_internal_insert" ON deliverables
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "deliverables_internal_update" ON deliverables
  FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'internal');

CREATE POLICY "deliverables_dev_update_status" ON deliverables
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id)
  );

-- Fix other table policies
DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;

CREATE POLICY "project_files_access_via_project" ON project_files
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

CREATE POLICY "project_files_admin_all" ON project_files
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

CREATE POLICY "project_files_insert_authenticated" ON project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- Fix payment_milestones policies
DROP POLICY IF EXISTS "payment_milestones_admin_all" ON payment_milestones;
DROP POLICY IF EXISTS "payment_milestones_dfy_select" ON payment_milestones;

CREATE POLICY "payment_milestones_admin_all" ON payment_milestones
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

CREATE POLICY "payment_milestones_dfy_select" ON payment_milestones
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND get_user_role() = 'dfy' AND can_access_project(project_id)
  );

-- Fix scope_changes policies
DROP POLICY IF EXISTS "scope_changes_access_via_project" ON scope_changes;
DROP POLICY IF EXISTS "scope_changes_admin_all" ON scope_changes;

CREATE POLICY "scope_changes_access_via_project" ON scope_changes
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

CREATE POLICY "scope_changes_admin_all" ON scope_changes
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

-- Fix activity_log policies
DROP POLICY IF EXISTS "activity_log_access_via_project" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON activity_log;
DROP POLICY IF EXISTS "activity_log_admin_all" ON activity_log;

CREATE POLICY "activity_log_access_via_project" ON activity_log
  FOR SELECT USING (auth.uid() IS NOT NULL AND can_access_project(project_id));

CREATE POLICY "activity_log_insert_authenticated" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));

CREATE POLICY "activity_log_admin_all" ON activity_log
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');

-- Fix blueprints policies
DROP POLICY IF EXISTS "blueprints_select_all" ON blueprints;
DROP POLICY IF EXISTS "blueprints_admin_all" ON blueprints;

CREATE POLICY "blueprints_select_all" ON blueprints
  FOR SELECT USING (true);

CREATE POLICY "blueprints_admin_all" ON blueprints
  FOR ALL USING (auth.uid() IS NOT NULL AND get_user_role() = 'admin');
