-- hexOS Files Tab: Nested Folders Migration
-- Adds parent_id for folder hierarchy, content_type for item types,
-- content JSONB for documents/whiteboards, and position for ordering.
-- Auto-creates default folder structure on project creation.

-- ============================================================================
-- SCHEMA CHANGES: project_files table
-- ============================================================================

-- Add parent_id for self-referential hierarchy (NULL = root level)
ALTER TABLE project_files
ADD COLUMN parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE;

-- Add content_type to distinguish item types
ALTER TABLE project_files
ADD COLUMN content_type TEXT NOT NULL DEFAULT 'file'
CHECK (content_type IN ('file', 'folder', 'document', 'whiteboard'));

-- Add content for document/whiteboard storage (Plate.js or Excalidraw JSON)
ALTER TABLE project_files
ADD COLUMN content JSONB;

-- Add position for ordering within parent
ALTER TABLE project_files
ADD COLUMN position INT DEFAULT 0;

-- ============================================================================
-- SCHEMA CHANGES: inquiries table (proposal whiteboard)
-- ============================================================================

ALTER TABLE inquiries
ADD COLUMN proposal_whiteboard JSONB;

COMMENT ON COLUMN inquiries.proposal_whiteboard IS
  'Excalidraw whiteboard state for visual proposal collaboration';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for hierarchical queries (find children of a folder)
CREATE INDEX idx_project_files_parent_id ON project_files(parent_id);

-- Index for ordering within project/folder
CREATE INDEX idx_project_files_position ON project_files(project_id, parent_id, position);

-- Index for content_type filtering
CREATE INDEX idx_project_files_content_type ON project_files(content_type);

-- ============================================================================
-- HELPER FUNCTION: Get effective visibility (inherit from parent folder)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_effective_file_visibility(p_file_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_visibility TEXT;
  v_parent_id UUID;
BEGIN
  -- Get current file's visibility and parent
  SELECT visibility, parent_id INTO v_visibility, v_parent_id
  FROM project_files WHERE id = p_file_id;

  -- If file has explicit visibility set, use it
  IF v_visibility IS NOT NULL THEN
    RETURN v_visibility;
  END IF;

  -- Otherwise, inherit from parent (recursively)
  IF v_parent_id IS NOT NULL THEN
    RETURN get_effective_file_visibility(v_parent_id);
  END IF;

  -- Default to workspace if no visibility found
  RETURN 'workspace';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_effective_file_visibility IS
  'Returns effective visibility for a file, inheriting from parent folder if not set';

-- ============================================================================
-- HELPER FUNCTION: Check if user can access file (respects hierarchy)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role user_role;
  v_project_id UUID;
  v_effective_visibility TEXT;
BEGIN
  v_user_role := public.get_user_role();

  -- Get file's project_id
  SELECT project_id INTO v_project_id
  FROM project_files WHERE id = p_file_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check project access first
  IF NOT public.can_access_project(v_project_id) THEN
    RETURN FALSE;
  END IF;

  -- Admin/Internal/Dev can see all files in accessible projects
  IF v_user_role IN ('admin', 'internal', 'dev') THEN
    RETURN TRUE;
  END IF;

  -- DFY/Client only see portal-visible files
  v_effective_visibility := get_effective_file_visibility(p_file_id);
  RETURN v_effective_visibility = 'portal';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.can_access_file IS
  'Check if current user can access a file based on project access and effective visibility';

-- ============================================================================
-- DROP OLD RLS POLICIES (from 20260103000003_project_files_visibility.sql)
-- ============================================================================

DROP POLICY IF EXISTS "project_files_admin_internal_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dfy_client_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;

-- ============================================================================
-- NEW RLS POLICIES (using can_access_file helper)
-- ============================================================================

-- SELECT: Use helper function that respects hierarchy
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT USING (can_access_file(id));

-- INSERT: Anyone with project access can create files/folders
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND can_access_project(project_id)
  );

-- UPDATE: Admin/Internal can update anything, Dev can update on assigned projects, others only their own
CREATE POLICY "project_files_admin_internal_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_dev_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_own_update" ON project_files
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- DELETE: Admin/Internal can delete anything, Dev can delete on assigned projects, others only their own
CREATE POLICY "project_files_admin_internal_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() IN ('admin', 'internal')
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_dev_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND get_user_role() = 'dev'
    AND can_access_project(project_id)
  );

CREATE POLICY "project_files_own_delete" ON project_files
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND can_access_file(id)
  );

-- ============================================================================
-- TRIGGER: Auto-create default folders when project is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_project_default_folders()
RETURNS TRIGGER AS $$
DECLARE
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  -- Create "Internal Files" folder (workspace visibility)
  -- Note: uploaded_by is NULL for system-created folders
  INSERT INTO project_files (
    project_id,
    file_name,
    file_path,
    content_type,
    visibility,
    position
  ) VALUES (
    NEW.id,
    'Internal Files',
    '',
    'folder',
    'workspace',
    0
  ) RETURNING id INTO v_internal_folder_id;

  -- Create "Shared with Client" folder (portal visibility)
  INSERT INTO project_files (
    project_id,
    file_name,
    file_path,
    content_type,
    visibility,
    position
  ) VALUES (
    NEW.id,
    'Shared with Client',
    '',
    'folder',
    'portal',
    1
  ) RETURNING id INTO v_shared_folder_id;

  -- Create "Project Whiteboard" inside Shared folder
  INSERT INTO project_files (
    project_id,
    parent_id,
    file_name,
    file_path,
    content_type,
    visibility,
    content,
    position
  ) VALUES (
    NEW.id,
    v_shared_folder_id,
    'Project Whiteboard',
    '',
    'whiteboard',
    'portal',
    '{"elements": [], "appState": {}, "files": {}}'::jsonb,
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER projects_create_default_folders
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_default_folders();

COMMENT ON TRIGGER projects_create_default_folders ON projects IS
  'Automatically create default folder structure (Internal Files, Shared with Client, Project Whiteboard) when a project is created';

-- ============================================================================
-- BACKFILL: Create default folders for existing projects
-- ============================================================================

DO $$
DECLARE
  v_project RECORD;
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  FOR v_project IN
    SELECT p.id
    FROM projects p
    WHERE NOT EXISTS (
      SELECT 1 FROM project_files pf
      WHERE pf.project_id = p.id
      AND pf.content_type = 'folder'
    )
  LOOP
    -- Create "Internal Files" folder
    INSERT INTO project_files (
      project_id,
      file_name,
      file_path,
      content_type,
      visibility,
      position
    ) VALUES (
      v_project.id,
      'Internal Files',
      '',
      'folder',
      'workspace',
      0
    ) RETURNING id INTO v_internal_folder_id;

    -- Create "Shared with Client" folder
    INSERT INTO project_files (
      project_id,
      file_name,
      file_path,
      content_type,
      visibility,
      position
    ) VALUES (
      v_project.id,
      'Shared with Client',
      '',
      'folder',
      'portal',
      1
    ) RETURNING id INTO v_shared_folder_id;

    -- Create "Project Whiteboard" inside Shared folder
    INSERT INTO project_files (
      project_id,
      parent_id,
      file_name,
      file_path,
      content_type,
      visibility,
      content,
      position
    ) VALUES (
      v_project.id,
      v_shared_folder_id,
      'Project Whiteboard',
      '',
      'whiteboard',
      'portal',
      '{"elements": [], "appState": {}, "files": {}}'::jsonb,
      0
    );

    -- Move existing files to appropriate folder based on visibility
    UPDATE project_files
    SET parent_id = CASE
      WHEN visibility = 'portal' THEN v_shared_folder_id
      ELSE v_internal_folder_id
    END
    WHERE project_id = v_project.id
    AND content_type = 'file'
    AND parent_id IS NULL;
  END LOOP;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN project_files.parent_id IS
  'Parent folder ID for nested hierarchy. NULL means root level.';
COMMENT ON COLUMN project_files.content_type IS
  'Type of item: file (uploaded), folder, document (Plate.js), or whiteboard (Excalidraw)';
COMMENT ON COLUMN project_files.content IS
  'JSONB content for documents (Plate.js state) and whiteboards (Excalidraw state)';
COMMENT ON COLUMN project_files.position IS
  'Sort order within parent folder';
