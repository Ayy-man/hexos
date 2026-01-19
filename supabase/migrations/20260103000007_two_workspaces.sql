-- hexOS: Two Workspaces Files System
-- Implements internal/client workspace separation with share/move capabilities

-- ============================================
-- Step 0: Drop the old constraint FIRST (before any data changes)
-- ============================================

-- Drop old visibility constraint to allow new values
ALTER TABLE project_files DROP CONSTRAINT IF EXISTS project_files_visibility_check;

-- ============================================
-- Step 1: Add new columns
-- ============================================

-- Add shared_to column for cross-workspace sharing
ALTER TABLE project_files ADD COLUMN IF NOT EXISTS shared_to TEXT CHECK (shared_to IN ('internal', 'client') OR shared_to IS NULL);

-- Add main whiteboard column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS main_whiteboard JSONB DEFAULT '{"elements": [], "appState": {}, "files": {}}'::jsonb;

-- Create index for shared_to queries
CREATE INDEX IF NOT EXISTS idx_project_files_shared_to ON project_files(shared_to) WHERE shared_to IS NOT NULL;

-- ============================================
-- Step 2: Migrate visibility values
-- ============================================

-- Update existing visibility values: workspace -> internal, portal -> client
UPDATE project_files SET visibility = 'internal' WHERE visibility = 'workspace';
UPDATE project_files SET visibility = 'client' WHERE visibility = 'portal';

-- ============================================
-- Step 3: Add new visibility constraint (after data migration)
-- ============================================

-- Add new constraint that only allows internal/client
ALTER TABLE project_files ADD CONSTRAINT project_files_visibility_check CHECK (visibility IN ('internal', 'client'));

-- ============================================
-- Step 4: Rename default folders
-- ============================================

UPDATE project_files SET file_name = 'Client Files' WHERE file_name = 'Shared with Client' AND content_type = 'folder' AND parent_id IS NULL;

-- ============================================
-- Step 5: Update default folders trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.create_project_default_folders() RETURNS TRIGGER AS $$
BEGIN
  -- Create Internal Files folder
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position)
  VALUES (NEW.id, 'Internal Files', '', 'folder', 'internal', 0);

  -- Create Client Files folder
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position)
  VALUES (NEW.id, 'Client Files', '', 'folder', 'client', 0);

  -- Main whiteboard is now in projects.main_whiteboard, not in files
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 6: Backfill main whiteboard from existing project whiteboards
-- ============================================

DO $$
DECLARE
  v_project RECORD;
BEGIN
  FOR v_project IN
    SELECT DISTINCT pf.project_id, pf.content, pf.id, pf.file_name
    FROM project_files pf
    WHERE pf.content_type = 'whiteboard'
    AND pf.parent_id IN (
      SELECT id FROM project_files
      WHERE content_type = 'folder'
      AND (file_name = 'Shared with Client' OR file_name = 'Client Files')
      AND parent_id IS NULL
    )
    AND pf.file_name LIKE '% Whiteboard'
  LOOP
    -- Move whiteboard content to main_whiteboard
    UPDATE projects
    SET main_whiteboard = COALESCE(v_project.content, '{"elements": [], "appState": {}, "files": {}}'::jsonb)
    WHERE id = v_project.project_id
    AND (main_whiteboard IS NULL OR main_whiteboard = '{"elements": [], "appState": {}, "files": {}}'::jsonb);

    -- Delete the old whiteboard file entry
    DELETE FROM project_files WHERE id = v_project.id;
  END LOOP;
END;
$$;

-- ============================================
-- Step 7: Update RLS helper function
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_project_id UUID;
  v_visibility TEXT;
  v_shared_to TEXT;
BEGIN
  v_user_role := public.get_user_role();

  SELECT project_id, visibility, shared_to
  INTO v_project_id, v_visibility, v_shared_to
  FROM project_files WHERE id = p_file_id;

  IF v_project_id IS NULL THEN RETURN FALSE; END IF;
  IF NOT public.can_access_project(v_project_id) THEN RETURN FALSE; END IF;

  -- Admin and Internal see everything
  IF v_user_role IN ('admin', 'internal') THEN RETURN TRUE; END IF;

  -- Dev sees internal view and items shared_to internal
  IF v_user_role = 'dev' THEN
    RETURN v_visibility = 'internal' OR v_shared_to = 'internal';
  END IF;

  -- DFY and Client see client view and items shared_to client
  IF v_user_role IN ('dfy', 'client') THEN
    RETURN v_visibility = 'client' OR v_shared_to = 'client';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- Step 8: Update RLS policies
-- ============================================

-- Drop and recreate SELECT policy with new logic
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file(id));

-- UPDATE policy for admin/internal
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- UPDATE policy for dev (their assigned projects)
DROP POLICY IF EXISTS "project_files_dev_update" ON project_files;
CREATE POLICY "project_files_dev_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- UPDATE policy for own files
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- DELETE policy for admin/internal
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

-- DELETE policy for dev (their assigned projects)
DROP POLICY IF EXISTS "project_files_dev_delete" ON project_files;
CREATE POLICY "project_files_dev_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

-- DELETE policy for own files
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;
CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- INSERT policy: Anyone who can access the project can create files
-- Visibility is handled at the application layer (inherited from parent folder)
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND can_access_project(project_id)
  );
