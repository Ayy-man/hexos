-- hexOS Phase 4.2: Project Documents (Gameplan Tab)
-- Rich text documents for project planning with version history

-- Create project_documents table
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content JSONB DEFAULT '[{"type":"p","children":[{"text":""}]}]'::jsonb,
  discussions JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, slug)
);

-- Create document_versions table for version history
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  content JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  is_checkpoint BOOLEAN DEFAULT FALSE,
  UNIQUE(document_id, version_number)
);

-- Indexes
CREATE INDEX idx_project_documents_project ON project_documents(project_id);
CREATE INDEX idx_project_documents_slug ON project_documents(project_id, slug);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_checkpoint ON document_versions(document_id, is_checkpoint) WHERE is_checkpoint = TRUE;

-- Enable RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_documents: Admin, Internal, Dev (assigned) only - NOT DFY/Client
CREATE POLICY "project_documents_select" ON project_documents
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal', 'dev')
    AND public.can_access_project(project_id)
  );

CREATE POLICY "project_documents_insert" ON project_documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal', 'dev')
    AND public.can_access_project(project_id)
  );

CREATE POLICY "project_documents_update" ON project_documents
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal', 'dev')
    AND public.can_access_project(project_id)
  );

CREATE POLICY "project_documents_delete" ON project_documents
  FOR DELETE USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal')
    AND public.can_access_project(project_id)
  );

-- RLS Policies for document_versions (same as parent document)
CREATE POLICY "document_versions_select" ON document_versions
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal', 'dev')
    AND EXISTS (
      SELECT 1 FROM project_documents pd
      WHERE pd.id = document_versions.document_id
      AND public.can_access_project(pd.project_id)
    )
  );

CREATE POLICY "document_versions_insert" ON document_versions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND public.get_user_role() IN ('admin', 'internal', 'dev')
    AND EXISTS (
      SELECT 1 FROM project_documents pd
      WHERE pd.id = document_versions.document_id
      AND public.can_access_project(pd.project_id)
    )
  );

-- Trigger: Auto-update updated_at on project_documents
CREATE OR REPLACE FUNCTION public.update_project_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_documents_updated_at
  BEFORE UPDATE ON project_documents
  FOR EACH ROW EXECUTE FUNCTION update_project_document_timestamp();

-- Trigger: Auto-create Gameplan document for new projects
CREATE OR REPLACE FUNCTION public.create_project_default_documents()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_documents (project_id, title, slug, position, created_by)
  VALUES (NEW.id, 'Gameplan', 'gameplan', 0, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS projects_create_default_documents ON projects;
CREATE TRIGGER projects_create_default_documents
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION create_project_default_documents();

-- Backfill: Create Gameplan document for existing projects
DO $$
DECLARE
  v_project RECORD;
BEGIN
  FOR v_project IN
    SELECT p.id FROM projects p
    WHERE NOT EXISTS (
      SELECT 1 FROM project_documents pd
      WHERE pd.project_id = p.id AND pd.slug = 'gameplan'
    )
  LOOP
    INSERT INTO project_documents (project_id, title, slug, position, created_by)
    VALUES (v_project.id, 'Gameplan', 'gameplan', 0, NULL);
  END LOOP;
END;
$$;
