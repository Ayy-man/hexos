-- Add visibility and description columns to project_files
-- Visibility controls who can see files: workspace (internal only) or portal (shared with DFY/Client)

-- Add columns
ALTER TABLE project_files
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'workspace'
CHECK (visibility IN ('workspace', 'portal'));

ALTER TABLE project_files
ADD COLUMN description TEXT;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "project_files_access_via_project" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_all" ON project_files;
DROP POLICY IF EXISTS "project_files_insert_authenticated" ON project_files;

-- Admin/Internal see all files on accessible projects
CREATE POLICY "project_files_admin_internal_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- Dev sees all files on assigned projects
CREATE POLICY "project_files_dev_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- DFY/Client only see portal files
CREATE POLICY "project_files_dfy_client_select" ON project_files
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('dfy', 'client')
    AND can_access_project(project_id)
    AND visibility = 'portal'
  );

-- Insert: Anyone with project access can upload
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND can_access_project(project_id)
  );

-- Update: Admin/Internal can change any file, others can only update their own
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_project(project_id)
  );

-- Delete: Own files OR admin/internal
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_project(project_id)
  );
