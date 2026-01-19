-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-- OBSOLETE: This migration is superseded by 20260103000011_emergency_rls_fix.sql
-- DO NOT RUN - This file contains the RECURSIVE get_effective_file_visibility
-- function that caused database crashes!
-- !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
--
-- hexOS: Fix project_files RLS policies
-- Run this in Supabase SQL Editor if you get "row violates row-level security policy" errors

-- Step 1: Ensure helper functions exist

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Can access project function
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_role := public.get_user_role();

  RETURN CASE v_user_role
    WHEN 'admin' THEN TRUE
    WHEN 'internal' THEN TRUE
    WHEN 'dev' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND assigned_dev_id = v_user_id
    )
    WHEN 'dfy' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND dfy_partner_id = v_user_id
    )
    WHEN 'client' THEN EXISTS (
      SELECT 1 FROM projects WHERE id = p_project_id AND client_id = v_user_id
    )
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get effective file visibility (for nested folder inheritance)
CREATE OR REPLACE FUNCTION public.get_effective_file_visibility(p_file_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_visibility TEXT;
  v_parent_id UUID;
BEGIN
  SELECT visibility, parent_id INTO v_visibility, v_parent_id FROM project_files WHERE id = p_file_id;
  IF v_visibility IS NOT NULL THEN RETURN v_visibility; END IF;
  IF v_parent_id IS NOT NULL THEN RETURN get_effective_file_visibility(v_parent_id); END IF;
  RETURN 'workspace';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Can access file function
CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_project_id UUID;
  v_effective_visibility TEXT;
BEGIN
  v_user_role := public.get_user_role();
  SELECT project_id INTO v_project_id FROM project_files WHERE id = p_file_id;
  IF v_project_id IS NULL THEN RETURN FALSE; END IF;
  IF NOT public.can_access_project(v_project_id) THEN RETURN FALSE; END IF;
  IF v_user_role IN ('admin', 'internal', 'dev') THEN RETURN TRUE; END IF;
  v_effective_visibility := get_effective_file_visibility(p_file_id);
  RETURN v_effective_visibility = 'portal';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Step 2: Drop ALL existing project_files policies to start fresh
DROP POLICY IF EXISTS "project_files_admin_internal_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dfy_client_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_update" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_delete" ON project_files;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON project_files;
DROP POLICY IF EXISTS "Allow read access to project members" ON project_files;
DROP POLICY IF EXISTS "Allow delete for file owners" ON project_files;

-- Step 3: Ensure RLS is enabled
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Step 4: Create the correct RLS policies

-- SELECT: Use can_access_file for visibility-aware access
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file(id));

-- INSERT: Anyone who can access the project can add files
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));

-- UPDATE: Admin/internal can update any file in accessible projects
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));

-- UPDATE: Dev can update any file in their assigned projects
CREATE POLICY "project_files_dev_update" ON project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));

-- UPDATE: Users can update their own files
CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));

-- DELETE: Admin/internal can delete any file in accessible projects
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));

-- DELETE: Dev can delete any file in their assigned projects
CREATE POLICY "project_files_dev_delete" ON project_files
  FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));

-- DELETE: Users can delete their own files
CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));

-- Step 5: Verify columns exist (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_files' AND column_name = 'parent_id') THEN
    ALTER TABLE project_files ADD COLUMN parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_files' AND column_name = 'content_type') THEN
    ALTER TABLE project_files ADD COLUMN content_type TEXT NOT NULL DEFAULT 'file' CHECK (content_type IN ('file', 'folder', 'document', 'whiteboard'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_files' AND column_name = 'content') THEN
    ALTER TABLE project_files ADD COLUMN content JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_files' AND column_name = 'position') THEN
    ALTER TABLE project_files ADD COLUMN position INT DEFAULT 0;
  END IF;
END;
$$;

-- Step 6: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_project_files_parent_id ON project_files(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_files_position ON project_files(project_id, parent_id, position);
CREATE INDEX IF NOT EXISTS idx_project_files_content_type ON project_files(content_type);
