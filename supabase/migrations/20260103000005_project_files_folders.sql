-- hexOS Files Tab: Nested Folders Migration
-- Adds parent_id, content_type, content, position columns and auto-creates default folders

-- Schema changes
ALTER TABLE project_files ADD COLUMN parent_id UUID REFERENCES project_files(id) ON DELETE CASCADE;
ALTER TABLE project_files ADD COLUMN content_type TEXT NOT NULL DEFAULT 'file' CHECK (content_type IN ('file', 'folder', 'document', 'whiteboard'));
ALTER TABLE project_files ADD COLUMN content JSONB;
ALTER TABLE project_files ADD COLUMN position INT DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN proposal_whiteboard JSONB;

-- Indexes
CREATE INDEX idx_project_files_parent_id ON project_files(parent_id);
CREATE INDEX idx_project_files_position ON project_files(project_id, parent_id, position);
CREATE INDEX idx_project_files_content_type ON project_files(content_type);

-- Helper function: Get effective visibility
CREATE OR REPLACE FUNCTION public.get_effective_file_visibility(p_file_id UUID) RETURNS TEXT AS $$
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

-- Helper function: Check file access
CREATE OR REPLACE FUNCTION public.can_access_file(p_file_id UUID) RETURNS BOOLEAN AS $$
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

-- Drop old RLS policies
DROP POLICY IF EXISTS "project_files_admin_internal_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dev_select" ON project_files;
DROP POLICY IF EXISTS "project_files_dfy_client_select" ON project_files;
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_update" ON project_files;
DROP POLICY IF EXISTS "project_files_own_update" ON project_files;
DROP POLICY IF EXISTS "project_files_admin_internal_delete" ON project_files;
DROP POLICY IF EXISTS "project_files_own_delete" ON project_files;

-- New RLS policies
CREATE POLICY "project_files_select" ON project_files FOR SELECT USING (can_access_file(id));
CREATE POLICY "project_files_insert" ON project_files FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND can_access_project(project_id));
CREATE POLICY "project_files_admin_internal_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));
CREATE POLICY "project_files_dev_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));
CREATE POLICY "project_files_own_update" ON project_files FOR UPDATE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));
CREATE POLICY "project_files_admin_internal_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() IN ('admin', 'internal') AND can_access_project(project_id));
CREATE POLICY "project_files_dev_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND get_user_role() = 'dev' AND can_access_project(project_id));
CREATE POLICY "project_files_own_delete" ON project_files FOR DELETE USING (auth.uid() IS NOT NULL AND uploaded_by = auth.uid() AND can_access_file(id));

-- Trigger: Auto-create default folders for new projects
CREATE OR REPLACE FUNCTION public.create_project_default_folders() RETURNS TRIGGER AS $$
DECLARE
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (NEW.id, 'Internal Files', '', 'folder', 'workspace', 0) RETURNING id INTO v_internal_folder_id;
  INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (NEW.id, 'Shared with Client', '', 'folder', 'portal', 1) RETURNING id INTO v_shared_folder_id;
  INSERT INTO project_files (project_id, parent_id, file_name, file_path, content_type, visibility, content, position) VALUES (NEW.id, v_shared_folder_id, NEW.project_name || ' Whiteboard', '', 'whiteboard', 'portal', '{"elements": [], "appState": {}, "files": {}}'::jsonb, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS projects_create_default_folders ON projects;
CREATE TRIGGER projects_create_default_folders AFTER INSERT ON projects FOR EACH ROW EXECUTE FUNCTION create_project_default_folders();

-- Backfill: Create default folders for existing projects
DO $$
DECLARE
  v_project RECORD;
  v_internal_folder_id UUID;
  v_shared_folder_id UUID;
BEGIN
  FOR v_project IN SELECT p.id, p.project_name FROM projects p WHERE NOT EXISTS (SELECT 1 FROM project_files pf WHERE pf.project_id = p.id AND pf.content_type = 'folder') LOOP
    INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (v_project.id, 'Internal Files', '', 'folder', 'workspace', 0) RETURNING id INTO v_internal_folder_id;
    INSERT INTO project_files (project_id, file_name, file_path, content_type, visibility, position) VALUES (v_project.id, 'Shared with Client', '', 'folder', 'portal', 1) RETURNING id INTO v_shared_folder_id;
    INSERT INTO project_files (project_id, parent_id, file_name, file_path, content_type, visibility, content, position) VALUES (v_project.id, v_shared_folder_id, v_project.project_name || ' Whiteboard', '', 'whiteboard', 'portal', '{"elements": [], "appState": {}, "files": {}}'::jsonb, 0);
    UPDATE project_files SET parent_id = CASE WHEN visibility = 'portal' THEN v_shared_folder_id ELSE v_internal_folder_id END WHERE project_id = v_project.id AND content_type = 'file' AND parent_id IS NULL;
  END LOOP;
END;
$$;
